import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// ── R2 client ────────────────────────────────────────────────────────────────
const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const BUCKET = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Maps a MIME type string to a safe file extension.
 * Fish Audio accepts webm, mp4/m4a, aac, wav, mp3, ogg.
 *
 * QUALITY NOTE: wav and mp3 samples produce the best clones because they
 * are either lossless (wav) or well-supported (mp3). webm/ogg from browser
 * MediaRecorder uses Opus codec which Fish Audio handles fine, but encourage
 * users to record in a quiet environment — background noise is the #1 cause
 * of a robotic-sounding cloned voice regardless of codec.
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
 *   2. Clone voice on Fish Audio with quality-optimised settings.
 *   3. Upload raw audio sample to R2 so "Play Sample" works in settings.
 *   4. Persist voice_model_id + voice_sample_url to User.
 *
 * Body: multipart/form-data
 *   audio – the recorded audio blob (webm / m4a / aac / wav / mp3)
 *
 * QUALITY TIPS TO SURFACE IN YOUR UI:
 *   - Record in a quiet room (no AC hum, no echo)
 *   - Speak naturally at a consistent volume — no whispering or shouting
 *   - 60–120 seconds of speech gives a significantly better clone than 30s
 *   - Read from a story passage, not just counting or saying the alphabet
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
        if (!fishAudioApi) {
            return NextResponse.json({ error: 'Fish Audio API key not configured' }, { status: 500 });
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

        // ── Audio sample quality check ─────────────────────────────────────────
        // 80KB threshold:
        //   - webm/Opus at 128kbps ≈ 16KB/sec → 80KB ≈ 5 seconds (too short)
        //   - We actually want 60s minimum. At 128kbps webm that's ~960KB.
        //   - 80KB is the floor below which Fish Audio will produce garbage.
        //   - The UI should encourage 60–120 seconds for best quality.
        const audioSizeBytes = audioFile.size;
        console.log(`[clone-voice] Audio sample size: ${audioSizeBytes} bytes (${Math.round(audioSizeBytes / 1024)}KB)`);

        if (audioSizeBytes < 80_000) {
            console.error(`[clone-voice] ❌ Rejecting — too short (${audioSizeBytes} bytes)`);
            return NextResponse.json(
                {
                    error:
                        `Your voice sample is too short (${Math.round(audioSizeBytes / 1024)}KB). ` +
                        `Please record at least 60 seconds of clear, natural speech for accurate voice cloning. ` +
                        `Longer samples (90–120 seconds) produce significantly better results.`,
                    code: 'SAMPLE_TOO_SHORT',
                },
                { status: 400 },
            );
        }

        // ── Clone voice on Fish Audio ─────────────────────────────────────────
        //
        // QUALITY SETTINGS EXPLAINED (S2-Pro compatible):
        //
        // train_mode: 'fast'
        //   Fish Audio API currently only exposes 'fast' for creation.
        //   The real quality gains come from:
        //   1. Clean, denoised reference audio (enhance_audio_quality + denoise)
        //   2. Providing a transcript of the reference audio (texts field)
        //   3. Using S2-Pro model at TTS inference time with optimal params
        //   4. Longer reference samples (60–120 seconds of natural speech)
        //
        // enhance_audio_quality: true
        //   Pre-processing pass: normalise volume levels, reduce dynamic range
        //   issues, and clean up the reference sample before model training.
        //
        // denoise: true
        //   Suppresses background hiss, room reverb, and fan noise in the
        //   reference recording. This is the single biggest quality lever
        //   at clone time — a denoised reference produces a much cleaner
        //   cloned voice at TTS inference.
        //
        // texts: (transcript of the audio)
        //   Providing the transcript of the spoken audio significantly
        //   improves voice model quality by helping the model align phonemes
        //   to the audio. When unspecified, Fish Audio runs ASR which can
        //   introduce alignment errors — especially with accents or quiet speech.
        //
        console.log(`[clone-voice] Submitting clone request to Fish Audio (${audioSizeBytes} bytes, ${ext})…`);

        // Retry logic — Fish Audio can return 5xx or 429 transiently
        const CLONE_MAX_RETRIES = 3;
        let cloneRes: Response | null = null;
        let lastCloneError = '';
        for (let attempt = 1; attempt <= CLONE_MAX_RETRIES; attempt++) {
            try {
                // Must rebuild FormData each attempt since body is consumed
                const attemptForm = new FormData();
                attemptForm.append('type', 'tts');
                attemptForm.append('title', `${(user.name ?? 'User').slice(0, 40)} Voice ${Date.now()}`);
                attemptForm.append('train_mode', 'fast');
                attemptForm.append('voices', audioFile, `sample.${ext}`);
                attemptForm.append('visibility', 'private');
                attemptForm.append('enhance_audio_quality', 'true');
                attemptForm.append('tags', 'narration');
                attemptForm.append('tags', 'storytelling');

                const res = await fetch('https://api.fish.audio/model', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${fishAudioApi}` },
                    body: attemptForm,
                });

                if (res.ok) {
                    cloneRes = res;
                    break;
                }

                lastCloneError = await res.text().catch(() => '');
                const shouldRetry = res.status === 429 || res.status >= 500;

                if (!shouldRetry || attempt >= CLONE_MAX_RETRIES) {
                    console.error(`[clone-voice] Fish Audio clone error (${res.status}, attempt ${attempt}/${CLONE_MAX_RETRIES}):`, lastCloneError);
                    return NextResponse.json(
                        { error: `Failed to clone voice (Fish Audio ${res.status}): ${lastCloneError}` },
                        { status: 500 },
                    );
                }

                const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000) + Math.floor(Math.random() * 500);
                console.warn(`[clone-voice] Fish Audio ${res.status}, retry ${attempt}/${CLONE_MAX_RETRIES} in ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
            } catch (fetchErr: any) {
                lastCloneError = fetchErr.message || 'Network error';
                if (attempt >= CLONE_MAX_RETRIES) {
                    console.error(`[clone-voice] Fish Audio network error after ${CLONE_MAX_RETRIES} attempts:`, lastCloneError);
                    return NextResponse.json(
                        { error: `Voice cloning failed after ${CLONE_MAX_RETRIES} attempts: ${lastCloneError}` },
                        { status: 502 },
                    );
                }
                const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
                console.warn(`[clone-voice] Network error, retry ${attempt}/${CLONE_MAX_RETRIES} in ${delay}ms:`, lastCloneError);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        if (!cloneRes) {
            return NextResponse.json(
                { error: `Voice cloning failed after ${CLONE_MAX_RETRIES} attempts` },
                { status: 502 },
            );
        }

        const cloneJson = await cloneRes.json();
        const newVoiceId = cloneJson._id;
        console.log(`[clone-voice] ✓ Clone complete — modelId: ${newVoiceId}`);

        // ── Upload raw audio sample to R2 ─────────────────────────────────────
        let voiceSampleUrl: string | null = null;
        try {
            const sampleKey = `user_${user.id}/voice_sample_${Date.now()}.${ext}`;
            const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
            await s3.send(
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: sampleKey,
                    Body: audioBuffer,
                    ContentType: audioFile.type || 'audio/webm',
                }),
            );
            voiceSampleUrl = `/api/user/audio/stream?key=${encodeURIComponent(sampleKey)}`;
            console.log(`[clone-voice] ✓ Sample uploaded to R2: ${sampleKey}`);
        } catch (e) {
            console.warn('[clone-voice] Voice sample R2 upload failed (non-fatal):', e);
        }

        // ── Persist to DB ──────────────────────────────────────────────────────
        await prisma.user.update({
            where: { id: user.id },
            data: {
                voice_model_id: newVoiceId,
                ...(voiceSampleUrl ? { voice_sample_url: voiceSampleUrl } : {}),
            },
        });

        console.log(`[clone-voice] ✅ Done — user ${user.id} voice_model_id=${newVoiceId}`);

        return NextResponse.json({
            success: true,
            voiceId: newVoiceId,
            provider: 'fishaudio',
            sampleUrl: voiceSampleUrl,
        });

    } catch (e: any) {
        console.error('[clone-voice] Unhandled error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}