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

        // Basic security: Ensure the key belongs to the user
        if (!key.startsWith(`user_${session.user.id}/`)) {
            return NextResponse.json({ error: 'Unauthorized key access' }, { status: 403 });
        }

        const bucketName = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';
        const range = req.headers.get('range');

        const params: any = {
            Bucket: bucketName,
            Key: key,
        };

        if (range) {
            params.Range = range;
        }

        const command = new GetObjectCommand(params);
        const response = await s3Client.send(command);

        if (!response.Body) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const headers = new Headers();
        headers.set('Content-Type', response.ContentType || 'audio/mpeg');
        headers.set('Accept-Ranges', 'bytes');

        if (response.ContentLength) {
            headers.set('Content-Length', response.ContentLength.toString());
        }

        if (response.ContentRange) {
            headers.set('Content-Range', response.ContentRange);
        }

        if (download) {
            const fileName = key.split('/').pop() || 'story.mp3';
            headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        // Stream directly using transformToWebStream() for efficiency
        return new NextResponse(response.Body.transformToWebStream() as any, {
            status: range ? 206 : 200,
            headers,
        });

    } catch (e: any) {
        console.error('API /api/user/audio/stream error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
