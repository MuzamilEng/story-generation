import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
 * POST /api/user/audio/clone-voice
 *
 * 1. Clones the user's voice on ElevenLabs (IVC).
 * 2. Uploads the raw audio sample to R2 so "Play Sample" works in settings.
 * 3. Persists voice_model_id + voice_sample_url to the User record.
 *
 * Body: multipart/form-data
 *   audio – the recorded audio blob (webm / m4a / aac)
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ── Safe body parsing to avoid Content-Type errors ──────────────────
        let audioFile: Blob | null = null;
        try {
            const contentType = req.headers.get('content-type') || '';
            if (contentType.includes('multipart/form-data')) {
                const formData = await req.formData();
                audioFile = formData.get('audio') as Blob | null;
            }
        } catch (e) {
            console.warn('[clone-voice] No form data found in request');
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // ── If no audio file provided, try to use existing sample from R2 ────
        let mimeType = '';
        if (!audioFile && user.voice_sample_url) {
            console.log(`[clone-voice] No audio provided, attempting to use existing sample for user ${user.id}`);
            try {
                // The URL is like /api/user/audio/stream?key=...
                const url = new URL(user.voice_sample_url, 'http://localhost');
                const key = url.searchParams.get('key');
                if (key) {
                    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
                    const getRes = await s3.send(new GetObjectCommand({
                        Bucket: BUCKET,
                        Key: key,
                    }));
                    if (getRes.Body) {
                        const buffer = await (getRes.Body as any).transformToByteArray();
                        mimeType = getRes.ContentType || 'audio/webm';
                        audioFile = new Blob([buffer], { type: mimeType });
                    }
                }
            } catch (e) {
                console.warn('[clone-voice] Failed to fetch existing sample:', e);
            }
        }

        if (!audioFile) {
            return NextResponse.json({ error: 'Audio file or existing sample is required' }, { status: 400 });
        }

        // ── Plan gate: voice cloning requires Activator+ (or active beta) ─────
        const VOICE_CLONE_PLANS = new Set(['free', 'activator', 'manifester', 'amplifier']);
        const hasActiveBeta = await prisma.userBetaCode.findFirst({
            where: {
                userId: user.id,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
        });
        const userPlan = String(user.plan || 'free').toLowerCase();
        if (!VOICE_CLONE_PLANS.has(userPlan) && !hasActiveBeta) {
            console.warn(`[clone-voice] Plan gate: user ${user.id} on plan "${userPlan}" attempted voice clone.`);
            return NextResponse.json({
                error: 'Voice cloning is available for Explorer and above tiers.',
                code: 'PLAN_UPGRADE_REQUIRED',
            }, { status: 403 });
        }

        console.log(`[clone-voice] User ${user.id} plan="${userPlan}" beta=${!!hasActiveBeta} — voice clone allowed.`);

        const elevenLabsApi = process.env.ELEVEN_LABS_API;
        if (!elevenLabsApi) {
            return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
        }

        // ── 1. Determine file extension ───────────────────────────────────────
        if (!mimeType) mimeType = audioFile.type || '';
        const ext = mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')
            ? 'm4a'
            : 'webm';

        // ── 2. Clone voice on ElevenLabs ──────────────────────────────────────
        const elForm = new FormData();
        elForm.append('name', `${user.name || 'User'} Voice ${Date.now()}`);
        elForm.append('files', audioFile, `sample.${ext}`);
        // Description hints at professional calm story narration — used by ElevenLabs to
        // calibrate the voice model for spoken-word long-form content.
        elForm.append(
            'description',
            'Professional calm story narrator. Long-form manifestation audio. ' +
            'Steady, warm, and authoritative delivery with minimal emotional fluctuation.',
        );
        // Labels let us identify this as a narrator voice in the ElevenLabs dashboard
        elForm.append('labels', JSON.stringify({ use_case: 'story_narration', style: 'calm' }));

        const cloneRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: { 'xi-api-key': elevenLabsApi },
            body: elForm,
        });

        if (!cloneRes.ok) {
            const errText = await cloneRes.text();
            console.error('[clone-voice] ElevenLabs error:', errText);

            try {
                const errJson = JSON.parse(errText);
                if (errJson.detail?.status === 'voice_limit_reached') {
                    return NextResponse.json({
                        error: 'Voice capacity reached on ElevenLabs. Please contact support.',
                        code: 'VOICE_LIMIT_REACHED',
                    }, { status: 403 });
                }
            } catch { /* not JSON */ }

            return NextResponse.json({ error: 'Failed to clone voice' }, { status: 500 });
        }

        const cloneJson = await cloneRes.json();
        const newVoiceId: string = cloneJson.voice_id;

        // ── 3. Apply professional narration settings to the new voice ─────────
        // PATCH the voice settings so ElevenLabs stores calm-narration defaults on the
        // voice itself. This ensures consistent output even when called from other tools.
        try {
            const patchRes = await fetch(
                `https://api.elevenlabs.io/v1/voices/${newVoiceId}/settings/edit`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'xi-api-key': elevenLabsApi },
                    body: JSON.stringify({
                        stability:         0.75,  // Very steady — no pitch wandering over long stories
                        similarity_boost:  0.65,  // Faithful clone timbre without artefact boost
                        style:             0,     // Neutral delivery — no stylistic exaggeration
                        use_speaker_boost: true,  // Enhances clarity and presence for cloned voices
                    }),
                },
            );
            if (patchRes.ok) {
                console.log(`[clone-voice] ✓ Narration voice settings applied to ${newVoiceId}`);
            } else {
                console.warn(`[clone-voice] Voice settings patch failed (non-fatal): ${await patchRes.text()}`);
            }
        } catch (e) {
            console.warn('[clone-voice] Voice settings patch error (non-fatal):', e);
        }

        // ── 4. Delete old ElevenLabs voice to preserve quota ──────────────────
        if (user.voice_model_id && user.voice_model_id !== newVoiceId) {
            try {
                await fetch(`https://api.elevenlabs.io/v1/voices/${user.voice_model_id}`, {
                    method: 'DELETE',
                    headers: { 'xi-api-key': elevenLabsApi },
                });
                console.log(`[clone-voice] Deleted old voice: ${user.voice_model_id}`);
            } catch {
                console.warn('[clone-voice] Failed to delete old voice:', user.voice_model_id);
            }
        }

        // ── 5. Upload raw audio sample to R2 for "Play Sample" in settings ────
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
            // Store as internal stream URL (served via the existing audio/stream route)
            voiceSampleUrl = `/api/user/audio/stream?key=${encodeURIComponent(sampleKey)}`;
            console.log(`[clone-voice] Voice sample uploaded: ${sampleKey}`);
        } catch (e) {
            // Non-fatal — cloning succeeded, sample upload just won't be available
            console.warn('[clone-voice] Voice sample upload failed:', e);
        }

        // ── 6. Persist voice_model_id + voice_sample_url ──────────────────────
        await prisma.user.update({
            where: { id: user.id },
            data: {
                voice_model_id: newVoiceId,
                ...(voiceSampleUrl ? { voice_sample_url: voiceSampleUrl } : {}),
            },
        });

        return NextResponse.json({
            success: true,
            voiceId: newVoiceId,
            sampleUrl: voiceSampleUrl,
        });

    } catch (e: any) {
        console.error('[clone-voice] error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
