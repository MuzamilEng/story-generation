import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

    const buf = Buffer.from(await file.arrayBuffer());

    // Validate the file is actually MP3 (ID3v2 header or MPEG sync word)
    const isMP3 = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
                  (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0);
    if (!isMP3) {
        return NextResponse.json(
            { error: 'Invalid file format. Please upload an MP3 file. WebM, WAV, and other formats are not supported.' },
            { status: 400 },
        );
    }

    const r2Key = `system/${key}_${Date.now()}.mp3`;
    const durationSecs = Math.round(buf.byteLength / 16000); // ~estimate at 128kbps

    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: r2Key,
            Body: buf,
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
