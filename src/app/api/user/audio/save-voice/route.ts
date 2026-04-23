import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath.path);

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

function mimeToExt(mime: string): string {
    if (!mime) return 'webm';
    if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
    return 'webm';
}

const MAX_SAVED_VOICES = 5;

function isSafariFriendlyMime(mime: string): boolean {
    const lower = (mime || '').toLowerCase();
    return (
        lower.includes('mp4') ||
        lower.includes('m4a') ||
        lower.includes('aac') ||
        lower.includes('mpeg') ||
        lower.includes('mp3') ||
        lower.includes('wav')
    );
}

async function convertToM4a(inputBuffer: Buffer): Promise<Buffer> {
    const id = randomUUID();
    const inPath = join(tmpdir(), `voice-in-${id}.webm`);
    const outPath = join(tmpdir(), `voice-out-${id}.m4a`);

    await fs.writeFile(inPath, inputBuffer);

    try {
        await new Promise<void>((resolve, reject) => {
            ffmpeg(inPath)
                .audioCodec('aac')
                .audioBitrate('128k')
                .outputOptions(['-movflags +faststart'])
                .toFormat('ipod')
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outPath);
        });

        return await fs.readFile(outPath);
    } finally {
        await fs.unlink(inPath).catch(() => { });
        await fs.unlink(outPath).catch(() => { });
    }
}

/**
 * POST /api/user/audio/save-voice
 * Saves a voice sample to R2 and creates a VoiceSample record.
 * Body: multipart/form-data with "audio" blob and optional "label" string.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Check limit
        const existingCount = await prisma.voiceSample.count({ where: { userId: user.id } });
        if (existingCount >= MAX_SAVED_VOICES) {
            return NextResponse.json(
                { error: `You can save up to ${MAX_SAVED_VOICES} voice samples. Please delete one first.` },
                { status: 400 },
            );
        }

        const formData = await req.formData();
        const raw = formData.get('audio');
        if (!(raw instanceof Blob) || raw.size === 0) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
        }

        const label = (formData.get('label') as string)?.trim() || `Voice ${existingCount + 1}`;
        const durationStr = formData.get('duration') as string;
        const duration = durationStr ? parseInt(durationStr, 10) : null;

        const mimeType = raw.type || '';
        let finalBuffer = Buffer.from(await raw.arrayBuffer());
        let finalMimeType = mimeType || 'audio/webm';
        let ext = mimeToExt(finalMimeType);

        // Safari does not reliably play WebM/Ogg voice recordings.
        // Normalize those uploads to AAC/M4A at save-time.
        if (!isSafariFriendlyMime(finalMimeType)) {
            try {
                finalBuffer = await convertToM4a(finalBuffer);
                finalMimeType = 'audio/mp4';
                ext = 'm4a';
            } catch (conversionError) {
                console.error('[save-voice] Conversion to m4a failed:', conversionError);
                return NextResponse.json(
                    { error: 'This recording format is not supported for playback. Please re-record and try again.' },
                    { status: 400 }
                );
            }
        }

        // Upload to R2
        const sampleKey = `user_${user.id}/voice_sample_${Date.now()}.${ext}`;
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: sampleKey,
            Body: finalBuffer,
            ContentType: finalMimeType,
        }));

        const sampleUrl = `/api/user/audio/stream?key=${encodeURIComponent(sampleKey)}`;

        // If this is the first sample, make it default
        const isFirst = existingCount === 0;

        const voiceSample = await prisma.voiceSample.create({
            data: {
                userId: user.id,
                label,
                r2_key: sampleKey,
                sample_url: sampleUrl,
                duration_s: duration,
                is_default: isFirst,
            },
        });

        return NextResponse.json({ success: true, voice: voiceSample });
    } catch (e: any) {
        console.error('[save-voice] Error:', e);

        // Handle transient DNS / network errors to R2
        if (e?.code === 'ENOTFOUND' || e?.errno === -3008 || e?.syscall === 'getaddrinfo') {
            return NextResponse.json(
                { error: 'Our storage service is temporarily unreachable. Please try again in a moment.' },
                { status: 503 }
            );
        }

        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * GET /api/user/audio/save-voice
 * Returns all saved voice samples for the current user.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const voices = await prisma.voiceSample.findMany({
            where: { userId: session.user.id },
            orderBy: { created_at: 'desc' },
        });

        return NextResponse.json({ voices });
    } catch (e: any) {
        console.error('[save-voice] GET error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/user/audio/save-voice
 * Deletes a specific voice sample by id.
 * Body: { id: string }
 */
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ error: 'Voice sample id is required' }, { status: 400 });
        }

        const voice = await prisma.voiceSample.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!voice) {
            return NextResponse.json({ error: 'Voice sample not found' }, { status: 404 });
        }

        // Delete from R2
        try {
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: voice.r2_key }));
        } catch (_) { /* non-fatal */ }

        await prisma.voiceSample.delete({ where: { id: voice.id } });

        // If the deleted voice was the default, promote the most recent remaining one
        if (voice.is_default) {
            const nextVoice = await prisma.voiceSample.findFirst({
                where: { userId: session.user.id },
                orderBy: { created_at: 'desc' },
            });
            if (nextVoice) {
                await prisma.voiceSample.update({
                    where: { id: nextVoice.id },
                    data: { is_default: true },
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('[save-voice] DELETE error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/user/audio/save-voice
 * Set a voice sample as the default, or update its label.
 * Body: { id: string, label?: string, setDefault?: boolean }
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, label, setDefault } = await req.json();
        if (!id) {
            return NextResponse.json({ error: 'Voice sample id is required' }, { status: 400 });
        }

        const voice = await prisma.voiceSample.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!voice) {
            return NextResponse.json({ error: 'Voice sample not found' }, { status: 404 });
        }

        const updateData: any = {};
        if (label !== undefined) updateData.label = label.trim();

        if (setDefault) {
            // Unset all others
            await prisma.voiceSample.updateMany({
                where: { userId: session.user.id },
                data: { is_default: false },
            });
            updateData.is_default = true;
        }

        const updated = await prisma.voiceSample.update({
            where: { id: voice.id },
            data: updateData,
        });

        // Also update the user's voice_sample_url so clone-voice can find it
        if (setDefault) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { voice_sample_url: voice.sample_url },
            });
        }

        return NextResponse.json({ success: true, voice: updated });
    } catch (e: any) {
        console.error('[save-voice] PATCH error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
