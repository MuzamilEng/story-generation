import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { appLog } from '@/lib/app-logger';
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

// GET - list all system audio assets
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const assets = await (prisma as any).systemAudio.findMany({ orderBy: { uploaded_at: 'desc' } });
    return NextResponse.json(assets);
}

// POST - upload a system audio file  (form fields: key, label, audio)
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await req.formData();
    const key = form.get('key') as string;       // e.g. "induction" | "guide_close"
    const label = form.get('label') as string;   // human label
    const file = form.get('audio') as Blob | null;

    if (!key || !label || !file) {
        return NextResponse.json({ error: 'key, label and audio are required' }, { status: 400 });
    }

    const incomingBuf = Buffer.from(await file.arrayBuffer());

    // Check if it's already a valid MP3
    const isMP3 = (incomingBuf[0] === 0x49 && incomingBuf[1] === 0x44 && incomingBuf[2] === 0x33) ||
                  (incomingBuf[0] === 0xFF && (incomingBuf[1] & 0xE0) === 0xE0);

    let finalBuf: Buffer;

    if (isMP3) {
        finalBuf = incomingBuf;
    } else {
        // Convert non-MP3 audio (e.g. WebM from browser recording) to MP3 via ffmpeg
        const id = randomUUID();
        const tmpInput = join(tmpdir(), `sys-audio-in-${id}`);
        const tmpOutput = join(tmpdir(), `sys-audio-out-${id}.mp3`);

        await fs.writeFile(tmpInput, incomingBuf);

        try {
            await new Promise<void>((resolve, reject) => {
                ffmpeg(tmpInput)
                    .toFormat('mp3')
                    .audioBitrate(128)
                    .on('error', reject)
                    .on('end', () => resolve())
                    .save(tmpOutput);
            });
            finalBuf = await fs.readFile(tmpOutput);
        } catch (err) {
            console.error('[system-audio] ffmpeg conversion failed:', err);
            appLog({ level: "error", source: "api/admin/system-audio", message: `ffmpeg audio conversion failed: ${err instanceof Error ? err.message : err}` });
            return NextResponse.json(
                { error: 'Audio conversion failed. Please try uploading an MP3 file directly.' },
                { status: 400 },
            );
        } finally {
            await fs.unlink(tmpInput).catch(() => {});
            await fs.unlink(tmpOutput).catch(() => {});
        }
    }

    // Estimate duration from 128kbps CBR file (16000 bytes/sec)
    const durationSecs = Math.round(finalBuf.byteLength / 16000);
    console.log(`[system-audio] Accepted MP3 upload. Size: ${finalBuf.byteLength} bytes, Duration: ~${durationSecs}s`);

    const r2Key = `system/${key}_${Date.now()}.mp3`;

    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: r2Key,
            Body: finalBuf,
            ContentType: 'audio/mpeg',
        })
    );

    const asset = await (prisma as any).systemAudio.upsert({
        where: { key },
        create: { key, r2_key: r2Key, label, duration_s: durationSecs },
        update: { r2_key: r2Key, label, duration_s: durationSecs },
    });

    return NextResponse.json({ success: true, asset });
}
