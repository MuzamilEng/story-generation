import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// ── R2 client ────────────────────────────────────────────────────────────────
const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const BUCKET = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';

/**
 * Plans that are allowed to use voice cloning.
 * Currently all plans including free, matching the assemble route.
 */
const VOICE_CLONE_PLANS = new Set(['free', 'activator', 'manifester', 'amplifier']);

/**
 * Professional narration voice settings applied to every cloned voice.
 *
 * These are stored on the ElevenLabs voice itself (PATCH call) so they act
 * as sensible defaults in the dashboard and any other integration.
 *
 * stability 0.80        → rock-steady pitch; prevents drift over long stories
 * similarity_boost 0.75 → faithful timbre without artefact amplification
 * style 0               → neutral; zero stylistic exaggeration
 * use_speaker_boost true → +2 dB presence/clarity for cloned voices
 */
const PROFESSIONAL_NARRATION_SETTINGS = {
    stability: 0.80,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true,
} as const;

/**
 * Maps a MIME type string to a safe file extension.
 * ElevenLabs accepts webm, mp4/m4a, aac, wav, mp3, ogg.
 */
function mimeToExt(mime: string): string {
    if (!mime) return 'webm';
    if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
    return 'webm';
}

/**
 * POST /api/user/audio/clone-voice
 *
 * Workflow:
 *   1. Parse audio from multipart body (or fall back to existing R2 sample).
 *   2. Gate on plan.
 *   3. Clone voice on ElevenLabs using Instant Voice Cloning (IVC).
 *   4. PATCH the new voice with professional narration settings.
 *   5. Delete the previous cloned voice to preserve quota.
 *   6. Upload raw audio sample to R2 so "Play Sample" works in settings.
 *   7. Persist voice_model_id + voice_sample_url to the User record.
 *
 * Body: multipart/form-data
 *   audio – the recorded audio blob (webm / m4a / aac / wav / mp3)
 */
export async function POST(req: NextRequest) {
    try {
        // ── Auth ───────────────────────────────────────────────────────────────
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const fishAudioApi = process.env.FISH_AUDIO_API;
        const elevenLabsConfigured = !!process.env.ELEVEN_LABS_API;
        if (!fishAudioApi && !elevenLabsConfigured) {
            return NextResponse.json({ error: 'No TTS API key configured (ElevenLabs or Fish Audio)' }, { status: 500 });
        }

        // ── Parse audio from request ───────────────────────────────────────────
        let audioFile: Blob | null = null;
        let mimeType = '';

        try {
            const formData = await req.formData();
            const raw = formData.get('audio');
            if (raw instanceof Blob && raw.size > 0) {
                audioFile = raw;
                mimeType = raw.type || '';
            }
        } catch (e) {
            console.warn('[clone-voice] Failed to parse multipart form data:', e);
        }

        // ── Fall back to existing sample in R2 if no new audio provided ────────
        if (!audioFile && user.voice_sample_url) {
            console.log(`[clone-voice] No new audio; fetching existing sample for user ${user.id}`);
            try {
                const url = new URL(user.voice_sample_url, 'http://localhost');
                const key = url.searchParams.get('key');
                if (key) {
                    const getRes = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
                    if (getRes.Body) {
                        const buffer = await (getRes.Body as any).transformToByteArray();
                        mimeType = getRes.ContentType ?? 'audio/webm';
                        audioFile = new Blob([buffer], { type: mimeType });
                        console.log(`[clone-voice] ✓ Loaded existing sample (${buffer.length} bytes) from ${key}`);
                    }
                }
            } catch (e) {
                console.warn('[clone-voice] Failed to fetch existing R2 sample:', e);
            }
        }

        if (!audioFile) {
            return NextResponse.json(
                { error: 'Audio file is required — please record or upload a voice sample.' },
                { status: 400 },
            );
        }

        const ext = mimeToExt(mimeType);
        let newVoiceId: string = '';
        let elevenLabsVoiceId: string = '';

        // ── Clone voice on ElevenLabs (Primary — Pro plan) ────────────────────
        const elevenLabsApi = process.env.ELEVEN_LABS_API;
        if (elevenLabsApi) {
            console.log(`[clone-voice] Attempting ElevenLabs Instant Voice Clone…`);
            const elForm = new FormData();
            elForm.append('name', `${(user.name ?? 'User').slice(0, 40)} Voice ${Date.now()}`);
            elForm.append('files', audioFile, `sample.${ext}`);
            elForm.append('description', 'ManifestMyStory Voice Clone');

            const elCloneRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
                method: 'POST',
                headers: { 'xi-api-key': elevenLabsApi },
                body: elForm,
            });

            if (elCloneRes.ok) {
                const elCloneJson = await elCloneRes.json();
                elevenLabsVoiceId = elCloneJson.voice_id;
                newVoiceId = elevenLabsVoiceId;
                console.log(`[clone-voice] ✓ ElevenLabs voice cloned — voiceId: ${elevenLabsVoiceId}`);

                // Delete previous ElevenLabs voice to preserve quota
                const oldElVoiceId = (user as any).elevenlabs_voice_id;
                if (oldElVoiceId && oldElVoiceId !== elevenLabsVoiceId) {
                    try {
                        await fetch(`https://api.elevenlabs.io/v1/voices/${oldElVoiceId}`, {
                            method: 'DELETE',
                            headers: { 'xi-api-key': elevenLabsApi },
                        });
                        console.log(`[clone-voice] Deleted old ElevenLabs voice: ${oldElVoiceId}`);
                    } catch (_) {}
                }
            } else {
                const errText = await elCloneRes.text();
                console.warn('[clone-voice] ElevenLabs clone failed, falling back to Fish Audio:', errText);

                // Check for voice limit error
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.detail?.status === 'voice_limit_reached') {
                        return NextResponse.json({
                            error: 'Voice capacity reached on ElevenLabs. Please contact support.',
                            code: 'VOICE_LIMIT_REACHED',
                        }, { status: 403 });
                    }
                } catch (_) {}
            }
        }

        // ── Clone voice on Fish Audio (Fallback) ──────────────────────────────
        if (!newVoiceId) {
            const fishAudioApi = process.env.FISH_AUDIO_API;
            if (!fishAudioApi) {
                return NextResponse.json({ error: 'No TTS API key configured (ElevenLabs or Fish Audio)' }, { status: 500 });
            }

            const fishForm = new FormData();
            fishForm.append('title', `${(user.name ?? 'User').slice(0, 40)} Voice ${Date.now()}`);
            fishForm.append('file', audioFile, `sample.${ext}`);
            fishForm.append('visibility', 'private');
            fishForm.append('type', 'tts');

            console.log(`[clone-voice] Submitting model-part request to Fish Audio…`);
            const cloneRes = await fetch('https://api.fish.audio/v1/model-part', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${fishAudioApi}` },
                body: fishForm,
            });

            if (!cloneRes.ok) {
                const errText = await cloneRes.text();
                console.error('[clone-voice] Fish Audio clone error:', errText);
                return NextResponse.json(
                    { error: `Failed to clone voice (Fish Audio ${cloneRes.status}): ${errText}` },
                    { status: 500 },
                );
            }

            const cloneJson = await cloneRes.json();
            newVoiceId = cloneJson.id;
            console.log(`[clone-voice] ✓ Fish Audio voice complete — new modelPartId: ${newVoiceId}`);
        }

        // ── Upload raw audio sample to R2 ─────────────────────────────────────
        // Used by the "Play Sample" feature in account settings.
        let voiceSampleUrl: string | null = null;
        try {
            const sampleKey = `user_${user.id}/voice_sample_${Date.now()}.${ext}`;
            const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
            await s3.send(new PutObjectCommand({
                Bucket: BUCKET,
                Key: sampleKey,
                Body: audioBuffer,
                ContentType: audioFile.type || 'audio/webm',
            }));
            voiceSampleUrl = `/api/user/audio/stream?key=${encodeURIComponent(sampleKey)}`;
            console.log(`[clone-voice] ✓ Voice sample uploaded to R2: ${sampleKey}`);
        } catch (e) {
            console.warn('[clone-voice] Voice sample R2 upload failed (non-fatal):', e);
        }

        // ── Persist to DB ──────────────────────────────────────────────────────
        await prisma.user.update({
            where: { id: user.id },
            data: {
                voice_model_id: newVoiceId,
                ...(elevenLabsVoiceId ? { elevenlabs_voice_id: elevenLabsVoiceId } : {}),
                ...(voiceSampleUrl ? { voice_sample_url: voiceSampleUrl } : {}),
            },
        });

        console.log(`[clone-voice] ✅ Done — user ${user.id} voice_model_id=${newVoiceId}${elevenLabsVoiceId ? ` elevenlabs_voice_id=${elevenLabsVoiceId}` : ''}`);
        return NextResponse.json({
            success: true,
            voiceId: newVoiceId,
            sampleUrl: voiceSampleUrl,
        });

    } catch (e: any) {
        console.error('[clone-voice] Unhandled error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}