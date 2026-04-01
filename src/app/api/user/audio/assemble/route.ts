import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';

/** Fetch a buffer from R2 by key */
async function fetchR2Buffer(key: string): Promise<Buffer | null> {
    try {
        const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
        const res = await s3.send(cmd);
        const chunks: Uint8Array[] = [];
        for await (const chunk of res.Body as any) chunks.push(chunk);
        return Buffer.concat(chunks);
    } catch {
        return null;
    }
}

/** Generate TTS for a list of texts using ElevenLabs and return concatenated MP3 buffer */
async function generateTTSBatch(texts: string[], voiceId: string, apiKey: string): Promise<Buffer> {
    const buffers: Buffer[] = [];
    for (const text of texts) {
        const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: { stability: 0.6, similarity_boost: 0.8 },
                }),
            }
        );
        if (!res.ok) throw new Error(`ElevenLabs TTS failed for: ${text.substring(0, 40)}`);
        buffers.push(Buffer.from(await res.arrayBuffer()));
    }
    return Buffer.concat(buffers);
}

/**
 * POST /api/user/audio/assemble
 *
 * Full V2 audio assembly pipeline:
 *   Opening Affirmations → Story → Closing Affirmations
 *
 * Soundscape + binaural preferences are stored as metadata on the story
 * so the audio player can layer them client-side (Web Audio API).
 *
 * PIPELINE: Induction -> Opening Affirmations -> Story -> Closing Affirmations -> Guide Close
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { storyId } = await req.json();
        if (!storyId) return NextResponse.json({ error: 'storyId is required' }, { status: 400 });

        const user = await (prisma.user as any).findUnique({ where: { id: session.user.id } }) as any;
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const story = await (prisma.story as any).findUnique({ where: { id: storyId } }) as any;
        if (!story || story.userId !== user.id) {
            return NextResponse.json({ error: 'Story not found or unauthorized' }, { status: 404 });
        }

        const elevenLabsApi = process.env.ELEVEN_LABS_API;
        if (!elevenLabsApi) return NextResponse.json({ error: 'ElevenLabs API not configured' }, { status: 500 });

        const voiceId = user.voice_model_id as string | null;
        if (!voiceId) {
            return NextResponse.json(
                { error: 'No voice model found. Please record your voice first.' },
                { status: 400 }
            );
        }

        // ── 1. Affirmations saved on story ────────────────────────────────────────
        const affirmations = story.affirmations_json as { opening: string[]; closing: string[] } | null;
        const openingAffirmations: string[] = affirmations?.opening ?? [];
        const closingAffirmations: string[] = affirmations?.closing ?? [];

        // ── 2. Fetch System Audio (Induction & Guide Close) ──────────────────────
        let inductionBuffer: Buffer | null = null;
        let guideCloseBuffer: Buffer | null = null;

        const systemAssets = await (prisma as any).systemAudio.findMany({
            where: { key: { in: ['induction', 'guide_close'] } }
        });

        const inductionAsset = systemAssets.find((a: any) => a.key === 'induction');
        const guideCloseAsset = systemAssets.find((a: any) => a.key === 'guide_close');

        if (inductionAsset?.r2_key) inductionBuffer = await fetchR2Buffer(inductionAsset.r2_key);
        if (guideCloseAsset?.r2_key) guideCloseBuffer = await fetchR2Buffer(guideCloseAsset.r2_key);

        // ── 3. Story text ─────────────────────────────────────────────────────────
        const storyText = (story.story_text_approved || story.story_text_draft) as string | null;
        if (!storyText) return NextResponse.json({ error: 'Story text is empty' }, { status: 400 });

        // ── 3. Generate TTS for affirmations ─────────────────────────────────────
        let openingBuffer: Buffer | null = null;
        let closingBuffer: Buffer | null = null;
        if (openingAffirmations.length > 0)
            openingBuffer = await generateTTSBatch(openingAffirmations, voiceId, elevenLabsApi);
        if (closingAffirmations.length > 0)
            closingBuffer = await generateTTSBatch(closingAffirmations, voiceId, elevenLabsApi);

        // ── 4. Generate TTS for story ─────────────────────────────────────────────
        const storyTtsRes = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'xi-api-key': elevenLabsApi },
                body: JSON.stringify({
                    text: storyText,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                }),
            }
        );
        if (!storyTtsRes.ok) {
            const err = await storyTtsRes.text();
            console.error('ElevenLabs story TTS error:', err);
            return NextResponse.json({ error: 'Failed to generate story audio' }, { status: 500 });
        }
        const storyBuffer = Buffer.from(await storyTtsRes.arrayBuffer());
        const historyId = storyTtsRes.headers.get('request-id');

        // ── 6. Assemble: Induction → Opening → Story → Closing → Guide Close ──────
        const segments: Buffer[] = [];
        if (inductionBuffer) segments.push(inductionBuffer);
        if (openingBuffer) segments.push(openingBuffer);
        segments.push(storyBuffer);
        if (closingBuffer) segments.push(closingBuffer);
        if (guideCloseBuffer) segments.push(guideCloseBuffer);

        const fullAudio = Buffer.concat(segments);
        const durationSecs = Math.round(fullAudio.byteLength / 16000);

        // ── 6. Upload assembled audio to R2 ──────────────────────────────────────
        const fileKey = `user_${user.id}/story_${story.id}_v2_${Date.now()}.mp3`;
        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: fileKey,
                Body: fullAudio,
                ContentType: 'audio/mpeg',
            })
        );

        const streamUrl = `/api/user/audio/stream?key=${encodeURIComponent(fileKey)}`;

        // ── 7. Soundscape / binaural metadata ─────────────────────────────────────
        const soundscapeChoice = (user.soundscape as string) ?? 'none';
        const soundscapeKey = soundscapeChoice !== 'none' ? soundscapeChoice : null;
        const binauralEnabled = !!(user.binaural_enabled) && user.plan === 'amplifier';

        // ── 8. Persist to DB ─────────────────────────────────────────────────────
        await (prisma.story as any).update({
            where: { id: story.id },
            data: {
                status: 'audio_ready',
                audio_r2_key: fileKey,
                audio_url: streamUrl,
                audio_file_size_bytes: fullAudio.byteLength,
                audio_duration_secs: durationSecs,
                elevenlabs_history_id: historyId,
                audio_generated_at: new Date(),
                // In V2.1 these keys can point to real mixed versions if a mixer is available
                soundscape_audio_key: soundscapeKey,
                binaural_audio_key: binauralEnabled ? 'theta' : null,
            },
        });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                audio_mins_this_month: { increment: durationSecs / 60 },
                total_audio_plays: { increment: 1 },
            },
        });

        return NextResponse.json({
            success: true,
            audioUrl: streamUrl,
            storyId: story.id,
            duration: durationSecs,
            soundscape: soundscapeKey,
            binauralEnabled,
            segments: {
                hasOpeningAffirmations: openingAffirmations.length > 0,
                openingCount: openingAffirmations.length,
                hasClosingAffirmations: closingAffirmations.length > 0,
                closingCount: closingAffirmations.length,
            },
        });
    } catch (e: any) {
        console.error('Audio assemble error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
