import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

// Audio streaming route for R2 assets

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const key = searchParams.get('key');
        const download = searchParams.get('download') === 'true';

        if (!key) {
            return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        // Security: Ensure the key belongs to the user OR is a system/soundscape asset
        const isUserAsset = key.startsWith(`user_${session.user.id}/`);
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

        const params: any = {
            Bucket: bucketName,
            Key: key,
        };

        if (rangeHeader) {
            params.Range = rangeHeader;
        }

        const command = new GetObjectCommand(params);
        const response = await s3Client.send(command);

        if (!response.Body) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Accept-Ranges', 'bytes');
        
        if (response.ContentLength) {
            headers.set('Content-Length', response.ContentLength.toString());
        }

        if (response.ContentRange) {
            headers.set('Content-Range', response.ContentRange);
        }

        // Allow browser to cache stable audio assets for smoother playback
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        if (download) {
            const fileName = key.split('/').pop() || 'story.mp3';
            headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        // Return a standard Response with the S3 stream directly
        // Safari handles this much better than buffered ArrayBuffers for 206 responses
        return new Response(response.Body as any, {
            status: rangeHeader ? 206 : 200,
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
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }

}
