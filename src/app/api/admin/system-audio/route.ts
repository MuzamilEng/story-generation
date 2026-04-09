import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

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
    let durationSecs: number;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'system-audio-'));
    try {
        const inputPath = path.join(tempDir, `input_${Date.now()}`);
        await fs.writeFile(inputPath, incomingBuf);

        const outputPath = path.join(tempDir, `output_${Date.now()}.mp3`);

        // We use ffmpeg to normalize the audio to a standard MP3 format
        // -i: input
        // -c:a libmp3lame: use MP3 encoder
        // -b:a 128k: constant bitrate for predictable duration/streaming
        // -ar 44100: standard sample rate
        // -write_xing 0: disable VBR headers for browser compatibility
        // -y: overwrite output
        await execAsync(`ffmpeg -i "${inputPath}" -c:a libmp3lame -b:a 128k -ar 44100 -write_xing 0 -y "${outputPath}"`);

        finalBuf = await fs.readFile(outputPath);
        // Estimate duration from 128kbps CBR file (16000 bytes/sec)
        durationSecs = Math.round(finalBuf.byteLength / 16000);

        console.log(`[system-audio] Converted ${file.type || 'unknown'} to standard MP3. Size: ${finalBuf.byteLength} bytes, Duration: ${durationSecs}s`);
    } catch (e: any) {
        console.error('[system-audio] FFmpeg conversion failed:', e.message);
        // Fallback only if it was already MP3
        if (isMP3) {
            console.log('[system-audio] Conversion failed but source is MP3, using raw buffer.');
            finalBuf = incomingBuf;
            durationSecs = Math.round(finalBuf.byteLength / 16000);
        } else {
            return NextResponse.json(
                { error: 'Failed to process audio format. Please ensure it is a valid audio file.' },
                { status: 400 },
            );
        }
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }

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
