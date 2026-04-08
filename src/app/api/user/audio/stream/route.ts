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

/**
 * Neutralise ALL VBR/Xing/VBRI headers in an MP3 buffer by overwriting the
 * 4-byte tag identifier with null bytes.
 *
 * The admin intro MP3 can place its Xing tag after an ID3v2 header, which
 * may be several KB deep.  We scan the first 512 KB to be safe.
 */
function neutralizeVBRHeader(buf: Buffer): void {
    const searchLen = Math.min(buf.length, 524288); // 512 KB
    let found = 0;
    for (let i = 0; i + 4 <= searchLen; i++) {
        const c = buf[i];
        if (c !== 0x58 && c !== 0x49 && c !== 0x56) continue;
        const tag = buf.toString('ascii', i, i + 4);
        if (tag === 'Xing' || tag === 'Info' || tag === 'VBRI') {
            buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0;
            console.log(`[stream] Neutralised VBR tag '${tag}' at offset ${i}`);
            found++;
        }
    }
    if (found === 0) {
        const hexDump = buf.subarray(0, Math.min(200, buf.length)).toString('hex').match(/.{1,2}/g)?.join(' ');
        console.log(`[stream] No VBR tag found in first ${searchLen} bytes. First 200 bytes: ${hexDump}`);
    } else {
        console.log(`[stream] Neutralised ${found} VBR tag(s)`);
    }
}

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

        // Get the total file size so the browser knows the full duration and
        // can build proper Content-Range headers for seeking.
        let totalSize: number | undefined;
        try {
            const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
            totalSize = head.ContentLength;
        } catch {}

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
        
        // Content-Length: use the response value, or fall back to head object size
        const contentLength = response.ContentLength ?? totalSize;
        if (contentLength) {
            headers.set('Content-Length', contentLength.toString());
        }

        if (response.ContentRange) {
            headers.set('Content-Range', response.ContentRange);
        } else if (rangeHeader && contentLength && response.ContentLength) {
            // Build Content-Range if S3 didn't provide it
            const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            if (rangeMatch) {
                const start = parseInt(rangeMatch[1]);
                const end = start + response.ContentLength - 1;
                headers.set('Content-Range', `bytes ${start}-${end}/${totalSize ?? contentLength}`);
            }
        }

        // No-cache: previously cached responses may have a stale VBR header
        // that told the browser the audio was only 3 seconds long.  Force
        // revalidation so every request goes through our neutraliseVBR logic.
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

        if (download) {
            const fileName = key.split('/').pop() || 'story.mp3';
            headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        // Detect whether this is a "from the start" request:
        //   • No Range header at all (direct download / full fetch)
        //   • Range: bytes=0-  or  Range: bytes=0-N  (Chrome/Firefox first audio load)
        // In both cases we buffer the full response, strip any Xing/VBR header,
        // and return with an accurate Content-Length so the browser computes
        // the correct duration.  Mid-file seeking (bytes=X- where X>0) is
        // streamed as-is since the VBR frame is already past.
        const rangeStart = rangeHeader
            ? parseInt(rangeHeader.match(/bytes=(\d+)/)?.[1] ?? '1')
            : 0;

        if (rangeStart === 0) {
            const fileChunks: Uint8Array[] = [];
            for await (const chunk of response.Body as any) fileChunks.push(chunk);
            const fileBuffer = Buffer.concat(fileChunks);
            neutralizeVBRHeader(fileBuffer); // in-place
            headers.set('Content-Length', fileBuffer.length.toString());
            // Slice the underlying ArrayBuffer to the exact bounds of this Buffer.
            // Using .buffer directly can include pool padding on small allocations.
            const ab = fileBuffer.buffer.slice(
                fileBuffer.byteOffset,
                fileBuffer.byteOffset + fileBuffer.byteLength,
            );
            if (rangeHeader) {
                headers.set('Content-Range', `bytes 0-${fileBuffer.length - 1}/${fileBuffer.length}`);
                return new NextResponse(ab, { status: 206, headers });
            }
            return new NextResponse(ab, { status: 200, headers });
        }

        // Mid-file seeking — stream the chunk directly
        return new NextResponse(response.Body.transformToWebStream() as any, {
            status: 206,
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
