import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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
// Multipart upload threshold: 5 MB (files above this use parallel multipart upload)
const MULTIPART_THRESHOLD = 5 * 1024 * 1024;
// Part size for multipart upload: 5 MB
const MULTIPART_PART_SIZE = 5 * 1024 * 1024;
// Retry settings for uploads
const UPLOAD_MAX_RETRIES = 3;
const UPLOAD_BASE_DELAY_MS = 2000;

function uploadRetryDelay(attempt: number): number {
  // Exponential backoff with jitter: 2s, 4s, 8s + up to 1s jitter
  return Math.min(UPLOAD_BASE_DELAY_MS * Math.pow(2, attempt), 30000) + Math.random() * 1000;
}

/** Download a file from R2 and return it as a Buffer */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Upload a Buffer to R2 — uses multipart upload for files > 5MB for faster transfer.
 *  Retries up to 3 times with exponential backoff on transient failures. */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType = 'audio/mpeg'
): Promise<void> {
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt <= UPLOAD_MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = uploadRetryDelay(attempt - 1);
        console.log(`[r2] Upload retry ${attempt}/${UPLOAD_MAX_RETRIES} for ${key} in ${(delay / 1000).toFixed(1)}s...`);
        await new Promise(r => setTimeout(r, delay));
      }

      await uploadToR2Inner(key, body, contentType);
      return; // success
    } catch (err: any) {
      lastErr = err;
      console.error(`[r2] Upload attempt ${attempt + 1}/${UPLOAD_MAX_RETRIES + 1} failed for ${key}:`, err.message);
      // Don't retry on client errors (4xx) except 408 (timeout) and 429 (rate limit)
      const status = err.$metadata?.httpStatusCode;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw err;
      }
    }
  }

  throw lastErr || new Error(`Upload failed after ${UPLOAD_MAX_RETRIES + 1} attempts`);
}

async function uploadToR2Inner(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (body.length <= MULTIPART_THRESHOLD) {
    // Small file: single PUT
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return;
  }

  // Large file: parallel multipart upload
  const { UploadId } = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    })
  );

  if (!UploadId) throw new Error('Failed to initiate multipart upload');

  const numParts = Math.ceil(body.length / MULTIPART_PART_SIZE);
  const uploadPromises: Promise<{ ETag: string; PartNumber: number }>[] = [];

  for (let i = 0; i < numParts; i++) {
    const start = i * MULTIPART_PART_SIZE;
    const end = Math.min(start + MULTIPART_PART_SIZE, body.length);
    const partNumber = i + 1;

    uploadPromises.push(
      s3.send(
        new UploadPartCommand({
          Bucket: BUCKET,
          Key: key,
          UploadId,
          PartNumber: partNumber,
          Body: body.subarray(start, end),
        })
      ).then(res => ({ ETag: res.ETag || '', PartNumber: partNumber }))
    );
  }

  try {
    const parts = await Promise.all(uploadPromises);
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId,
        MultipartUpload: {
          Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
        },
      })
    );
  } catch (err) {
    // Abort multipart upload on failure to avoid dangling parts
    await s3.send(
      new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId })
    ).catch(() => {});
    throw err;
  }
}

/** Delete a file from R2 (safe – ignores "not found" errors) */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
    );
  } catch {
    // Ignore – file may already be gone
  }
}
