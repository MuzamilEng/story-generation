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

        const formData = await req.formData();
        const audioFile = formData.get('audio') as Blob | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // ── Plan gate: voice cloning requires Activator+ (or active beta) ─────
        const VOICE_CLONE_PLANS = new Set(['activator', 'manifester', 'amplifier']);
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
                error: 'Voice cloning is available on the Activator plan and above. Upgrade to use your own voice.',
                code: 'PLAN_UPGRADE_REQUIRED',
            }, { status: 403 });
        }

        console.log(`[clone-voice] User ${user.id} plan="${userPlan}" beta=${!!hasActiveBeta} — voice clone allowed.`);

        const elevenLabsApi = process.env.ELEVEN_LABS_API;
        if (!elevenLabsApi) {
            return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
        }

        // ── 1. Determine file extension ───────────────────────────────────────
        const mimeType = audioFile.type || '';
        const ext = mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')
            ? 'm4a'
            : 'webm';

        // ── 2. Clone voice on ElevenLabs ──────────────────────────────────────
        const elForm = new FormData();
        elForm.append('name', `${user.name || 'User'} Voice ${Date.now()}`);
        elForm.append('files', audioFile, `sample.${ext}`);
        elForm.append('description', 'Instant Voice Clone');

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

        // ── 3. Delete old ElevenLabs voice to preserve quota ──────────────────
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

        // ── 4. Upload raw audio sample to R2 for "Play Sample" in settings ────
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

        // ── 5. Persist voice_model_id + voice_sample_url ──────────────────────
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
