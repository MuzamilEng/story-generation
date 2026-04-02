import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

/**
 * POST /api/user/audio/generate
 *
 * Legacy single-segment generator kept for direct integrations.
 * The voice-recording flow now calls:
 *   1. POST /api/user/audio/clone-voice  (clone only, no TTS)
 *   2. POST /api/user/audio/assemble     (full pipeline, single ElevenLabs call)
 *
 * This endpoint is still valid for simple/admin use: it optionally re-clones
 * the voice if a new audio blob is provided, then generates TTS for the story
 * as a standalone file (no induction / guide-close segments).
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const audioFile = formData.get('audio') as Blob | null;
        let storyId = formData.get('storyId') as string | null;

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Plan Gating
        const { checkPlanGating } = await import('@/lib/plan-gating');
        const gating = await checkPlanGating(user.id, 'generate_audio');
        if (!gating.allowed) {
            return NextResponse.json({ error: gating.message }, { status: 403 });
        }

        // Resolve story
        if (!storyId) {
            const recentStory = await prisma.story.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
            });
            if (!recentStory) return NextResponse.json({ error: 'No story found for user' }, { status: 400 });
            storyId = recentStory.id;
        }

        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story || story.userId !== user.id) {
            return NextResponse.json({ error: 'Story not found or unauthorized' }, { status: 404 });
        }

        const textToRead = story.story_text_approved || story.story_text_draft;
        if (!textToRead) return NextResponse.json({ error: 'Story text is empty' }, { status: 400 });

        const elevenLabsApi = process.env.ELEVEN_LABS_API;
        if (!elevenLabsApi) return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });

        let voiceId = user.voice_model_id;

        // ── Optional re-clone if a new audio file is provided ────────────────
        if (audioFile) {
            const elFormData = new FormData();
            elFormData.append('name', `${user.name || 'User'} - Clone ${Date.now()}`);
            elFormData.append('files', audioFile, 'sample.webm');
            elFormData.append('description', 'Instant Voice Clone');

            const cloneRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
                method: 'POST',
                headers: { 'xi-api-key': elevenLabsApi },
                body: elFormData,
            });

            if (cloneRes.ok) {
                const cloneJson = await cloneRes.json();
                const newVoiceId = cloneJson.voice_id;

                if (voiceId && voiceId !== newVoiceId) {
                    try {
                        await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
                            method: 'DELETE',
                            headers: { 'xi-api-key': elevenLabsApi },
                        });
                    } catch (_) { }
                }

                voiceId = newVoiceId;
                await prisma.user.update({ where: { id: user.id }, data: { voice_model_id: voiceId } });
            } else {
                const errText = await cloneRes.text();
                console.error('ElevenLabs Voice Add Error:', errText);

                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.detail?.status === 'voice_limit_reached') {
                        return NextResponse.json({
                            error: 'Voice capacity reached. Please contact support.',
                            code: 'VOICE_LIMIT_REACHED',
                        }, { status: 403 });
                    }
                } catch (_) { }

                if (!voiceId) {
                    return NextResponse.json({ error: 'Failed to clone voice and no existing voice found.' }, { status: 500 });
                }
            }
        }

        if (!voiceId) {
            return NextResponse.json({ error: 'No voice model. Please record your voice first.' }, { status: 400 });
        }

        // ── Single TTS call for story text ───────────────────────────────────
        const ttsRes = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'xi-api-key': elevenLabsApi },
                body: JSON.stringify({
                    text: textToRead,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                }),
            },
        );

        if (!ttsRes.ok) {
            const errText = await ttsRes.text();
            console.error('ElevenLabs TTS Error:', errText);
            return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
        }

        const audioBuffer = await ttsRes.arrayBuffer();
        const historyId = ttsRes.headers.get('request-id');
        const durationSecs = Math.round(audioBuffer.byteLength / 16000);

        // ── Upload to R2 ─────────────────────────────────────────────────────
        const bucketName = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';
        const fileKey = `user_${user.id}/story_${story.id}_${Date.now()}.mp3`;

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            Body: Buffer.from(audioBuffer),
            ContentType: 'audio/mpeg',
        }));

        const streamUrl = `/api/user/audio/stream?key=${encodeURIComponent(fileKey)}`;

        await prisma.story.update({
            where: { id: story.id },
            data: {
                status: 'audio_ready',
                audio_r2_key: fileKey,
                audio_url: streamUrl,
                audio_file_size_bytes: audioBuffer.byteLength,
                audio_duration_secs: durationSecs,
                elevenlabs_history_id: historyId,
                audio_generated_at: new Date(),
            },
        });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                audio_mins_this_month: { increment: durationSecs / 60 },
                total_audio_plays: { increment: 1 },
            },
        });

        return NextResponse.json({ success: true, audioUrl: streamUrl, storyId: story.id, duration: durationSecs });

    } catch (e: any) {
        console.error('API /api/user/audio/generate error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
