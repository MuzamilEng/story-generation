import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { execFile } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

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

// GET - list all soundscape assets
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const assets = await (prisma as any).soundscapeAsset.findMany({ 
        orderBy: { uploaded_at: 'desc' } 
    });
    return NextResponse.json(assets);
}

// POST - upload a soundscape (form fields: title, audio, image)
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const form = await req.formData();
        const title = form.get('title') as string;
        const audioFile = form.get('audio') as Blob | null;
        const imageFile = form.get('image') as Blob | null;

        if (!title || !audioFile) {
            return NextResponse.json({ error: 'Title and audio are required' }, { status: 400 });
        }

        const timestamp = Date.now();
        let audioBuf = Buffer.from(await audioFile.arrayBuffer());
        const audioKey = `system/soundscapes/${title.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.mp3`;

        // Trim audio to max 25 minutes using ffmpeg
        const MAX_DURATION_SECS = 25 * 60; // 25 minutes
        const estimatedDuration = Math.round(audioBuf.byteLength / 16000);

        if (estimatedDuration > MAX_DURATION_SECS) {
            const tmpDir = join(tmpdir(), `trim-${randomUUID()}`);
            mkdirSync(tmpDir, { recursive: true });
            const inputPath = join(tmpDir, 'input.mp3');
            const outputPath = join(tmpDir, 'trimmed.mp3');
            writeFileSync(inputPath, audioBuf);

            await new Promise<void>((resolve, reject) => {
                execFile('ffmpeg', [
                    '-i', inputPath,
                    '-t', String(MAX_DURATION_SECS),
                    '-c:a', 'libmp3lame',
                    '-b:a', '128k',
                    '-y', outputPath,
                ], (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            audioBuf = readFileSync(outputPath);
            rmSync(tmpDir, { recursive: true, force: true });
        }

        const durationSecs = Math.min(Math.round(audioBuf.byteLength / 16000), MAX_DURATION_SECS);

        // Upload audio to R2
        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: audioKey,
                Body: audioBuf,
                ContentType: 'audio/mpeg',
            })
        );

        let imageUrl = null;
        if (imageFile) {
            const imageBuf = Buffer.from(await imageFile.arrayBuffer());
            const imageKey = `system/soundscapes/images/${title.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;
            await s3.send(
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: imageKey,
                    Body: imageBuf,
                    ContentType: imageFile.type || 'image/jpeg',
                })
            );
            imageUrl = `/api/user/audio/stream?key=${encodeURIComponent(imageKey)}`;
        }

        const asset = await (prisma as any).soundscapeAsset.create({
            data: {
                title,
                r2_key: audioKey,
                image_url: imageUrl,
                duration_s: durationSecs,
                isActive: true,
            },
        });

        return NextResponse.json({ success: true, asset });
    } catch (error: any) {
        console.error('[soundscapes_post] error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
