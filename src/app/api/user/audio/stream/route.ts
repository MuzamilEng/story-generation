import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/lib/roles';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { getStoryFilename } from '@/lib/story-utils';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { appLog } from '@/lib/app-logger';

ffmpeg.setFfmpegPath(ffmpegPath.path);

const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

async function streamBodyToBuffer(body: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

async function convertBufferToM4a(inputBuffer: Buffer, inputExt: string): Promise<Buffer> {
    const id = randomUUID();
    const safeExt = inputExt.replace(/[^a-z0-9]/gi, '') || 'webm';
    const inPath = join(tmpdir(), `stream-in-${id}.${safeExt}`);
    const outPath = join(tmpdir(), `stream-out-${id}.m4a`);

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

// Audio streaming route for R2 assets

export async function GET(req: NextRequest) {
    let sessionUserId: string | undefined;
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        sessionUserId = session.user.id;

        const { searchParams } = new URL(req.url);
        const key = searchParams.get('key');
        const download = searchParams.get('download') === 'true';
        const compat = searchParams.get('compat') === '1';

        if (!key) {
            return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        // Security: Ensure the key belongs to the user OR is a system/soundscape asset
        const isAdmin = session.user.role === UserRole.ADMIN;
        const isUserOwnedAsset = key.startsWith(`user_${session.user.id}/`);
        const isAnyUserAssetForAdmin = isAdmin && key.startsWith('user_');
        const isUserAsset = isUserOwnedAsset || isAnyUserAssetForAdmin;
        const isSystemAsset = key.startsWith('system/');
        const isSoundscapeAsset = key.startsWith('soundscapes/');

        if (!isUserAsset && !isSystemAsset && !isSoundscapeAsset) {
            return NextResponse.json({ error: 'Unauthorized key access' }, { status: 403 });
        }

        const bucketName = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';
        const rangeHeader = req.headers.get('range');

        // Robust Content-Type detection
        let contentType = 'audio/mpeg';
        if (key.endsWith('.mp3')) contentType = 'audio/mpeg';
        else if (key.endsWith('.wav')) contentType = 'audio/wav';
        else if (key.endsWith('.m4a') || key.endsWith('.mp4') || key.endsWith('.aac')) contentType = 'audio/mp4';
        else if (key.endsWith('.webm')) contentType = 'audio/webm';
        else if (key.endsWith('.ogg')) contentType = 'audio/ogg';

        // Compatibility mode: transcode unsupported webm/ogg samples to m4a for Safari.
        if (compat && (key.endsWith('.webm') || key.endsWith('.ogg'))) {
            const source = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
            if (!source.Body) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }

            const originalBuffer = await streamBodyToBuffer(source.Body);
            const inputExt = key.split('.').pop() || 'webm';
            const converted = await convertBufferToM4a(originalBuffer, inputExt);

            const headers = new Headers();
            headers.set('Content-Type', 'audio/mp4');
            headers.set('Content-Length', converted.byteLength.toString());
            headers.set('Accept-Ranges', 'bytes');
            headers.set('Cache-Control', 'private, max-age=300');

            return new Response(new Uint8Array(converted), { status: 200, headers });
        }

        // Always fetch total file size first via HEAD so we can return
        // correct Content-Length / Content-Range headers. Without this the
        // browser cannot determine audio duration from the response alone.
        const headCommand = new HeadObjectCommand({ Bucket: bucketName, Key: key });
        const headResponse = await s3Client.send(headCommand);
        const totalSize = headResponse.ContentLength ?? 0;

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Accept-Ranges', 'bytes');
        // Allow browser to cache stable audio assets for smoother playback
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        if (download) {
            // Derive proper filename from story data
            let fileName = key.split('/').pop() || 'story.mp3';
            try {
                // Extract storyId from key pattern: user_XXX/story_YYY_final_ZZZ.mp3
                const storyKeyMatch = key.match(/story_([^_]+)_/);
                if (storyKeyMatch) {
                    const story = await prisma.story.findUnique({
                        where: { id: storyKeyMatch[1] },
                        select: { story_type: true, story_number: true },
                    });
                    if (story) {
                        fileName = getStoryFilename(
                            ((story as any).story_type || 'night') as 'night' | 'morning',
                            (story as any).story_number || 1
                        );
                    }
                }
            } catch {
                // Fallback to default filename
            }
            headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        if (rangeHeader) {
            // Parse range header: "bytes=START-END"
            const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            const start = match ? parseInt(match[1], 10) : 0;
            const end = match && match[2] ? parseInt(match[2], 10) : totalSize - 1;
            const chunkSize = end - start + 1;

            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
                Range: `bytes=${start}-${end}`,
            });
            const response = await s3Client.send(command);

            if (!response.Body) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }

            headers.set('Content-Length', chunkSize.toString());
            headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);

            return new Response(response.Body as any, {
                status: 206,
                headers,
            });
        }

        // Full file request (no Range header)
        const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
        const response = await s3Client.send(command);

        if (!response.Body) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        headers.set('Content-Length', totalSize.toString());

        return new Response(response.Body as any, {
            status: 200,
            headers,
        });

    } catch (e: any) {
        if (e.name === 'NoSuchKey') {
             return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
        }
        if (e.name === 'InvalidRange') {
             return NextResponse.json({ error: 'Range not satisfiable' }, { status: 416 });
        }
        console.error('API /api/user/audio/stream error:', e);
        appLog({ level: "error", source: "api/user/audio/stream", message: `Audio stream error: ${e.message || e}`, userId: sessionUserId });
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }

}
