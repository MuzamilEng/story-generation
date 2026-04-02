import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * GET /api/user/audio/soundscape/[key]
 *
 * Streams a soundscape or binaural track from R2.
 * Requires auth + plan check embedded in the [key] pattern —
 * caller must be authenticated; the key is validated to only allow
 * paths under system/soundscapes/ or system/binaural/.
 *
 * The audio player fetches this URL to layer under the narration
 * at −18 dB via the Web Audio API.
 */

const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const BUCKET = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ key: string }> },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { key } = await params;
        const rawKey = decodeURIComponent(key);

        // Only allow serving system soundscape / binaural tracks
        const allowed =
            rawKey.startsWith('system/soundscapes/') ||
            rawKey.startsWith('system/binaural/');

        if (!allowed) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: rawKey });
        const res = await s3.send(cmd);

        const chunks: Uint8Array[] = [];
        for await (const chunk of res.Body as any) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': String(buffer.byteLength),
                'Cache-Control': 'public, max-age=86400', // cache 24h — these files change rarely
            },
        });
    } catch (e: any) {
        console.error('[soundscape stream]', e);
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}
