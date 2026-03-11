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
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const key = searchParams.get('key');

        if (!key) {
            return new NextResponse('Missing key', { status: 400 });
        }

        // Security check: ensure the key belongs to the current user
        // The key format is "user_[userId]/..."
        if (!key.startsWith(`user_${session.user.id}/`)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'manifestmystory-audio',
            Key: key,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
            return new NextResponse('Not found', { status: 404 });
        }

        // Return the stream directly
        return new NextResponse(response.Body as any, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': response.ContentLength?.toString() || '',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('[AUDIO_STREAM]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
