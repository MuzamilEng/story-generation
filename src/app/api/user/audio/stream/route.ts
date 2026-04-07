import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

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

        // Security: Ensure the key belongs to the user OR is a system asset
        const isUserAsset = key.startsWith(`user_${session.user.id}/`);
        const isSystemAsset = key.startsWith('system/');

        if (!isUserAsset && !isSystemAsset) {
            return NextResponse.json({ error: 'Unauthorized key access' }, { status: 403 });
        }

        const bucketName = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';
        const rangeHeader = req.headers.get('range');

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
        headers.set('Content-Type', response.ContentType || 'audio/mpeg');
        headers.set('Accept-Ranges', 'bytes');
        
        // When a range is requested, S3 returns 206 and the specific Content-Length of the chunk.
        // We must pass these along exactly for the browser to support seeking.
        if (response.ContentLength) {
            headers.set('Content-Length', response.ContentLength.toString());
        }

        if (response.ContentRange) {
            headers.set('Content-Range', response.ContentRange);
        }

        // Add Cache-Control to prevent some browsers from being confused by partial content
        headers.set('Cache-Control', 'public, max-age=3600');

        if (download) {
            const fileName = key.split('/').pop() || 'story.mp3';
            headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        // Return a 206 for range requests, or 200 for full file
        return new NextResponse(response.Body.transformToWebStream() as any, {
            status: rangeHeader ? 206 : 200,
            headers,
        });

    } catch (e: any) {
        if (e.name === 'NoSuchKey') {
             return NextResponse.json({ error: 'File not found in R2 storage' }, { status: 404 });
        }
        if (e.name === 'InvalidRange') {
             return NextResponse.json({ error: 'Range not satisfiable (empty file)' }, { status: 416 });
        }
        console.error('API /api/user/audio/stream error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }

}
