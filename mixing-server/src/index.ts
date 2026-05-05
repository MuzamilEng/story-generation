import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import { downloadFromR2, uploadToR2, deleteFromR2 } from './r2';
import { mixAudio, enhanceNarrationVoice } from './mixer';
import {
  enqueueAssembleJob,
  getAssembleStoryStatus,
  initAssembleWorker,
  waitForAssembleResult,
} from './assemble-queue';
import { localAudioCache, apply8DAudio } from './assemble';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.MIXING_PORT || 4000;

// ── Middleware ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://staging-manifest.vercel.app',
  'https://d327gwmirs7t7j.cloudfront.net',
  'http://localhost:3000',
].filter(Boolean) as string[];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Simple shared-secret auth to prevent unauthorized calls
const API_SECRET = process.env.MIXING_API_SECRET || '';

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // If no secret is configured, skip auth (dev mode)
  if (!API_SECRET) {
    next();
    return;
  }
  const token = req.headers['x-api-secret'] as string | undefined;
  if (token !== API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── GET /local-stream?key=... ─────────────────────────────────────────────
// Serves audio from a local temp file while R2 upload is still in progress.
// Called by the Next.js streaming route as a fallback when R2 returns 404.
// Supports byte-range requests for proper seeking/duration detection.
app.get('/local-stream', requireAuth, (req, res) => {
  const key = String(req.query.key || '');
  if (!key) {
    res.status(400).json({ error: 'key is required' });
    return;
  }

  const localPath = localAudioCache.get(key);
  if (!localPath || !fs.existsSync(localPath)) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const stat = fs.statSync(localPath);
  const totalSize = stat.size;
  const rangeHeader = req.headers.range;

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-cache');

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    const start = match ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? parseInt(match[2], 10) : totalSize - 1;
    const chunkSize = end - start + 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    res.setHeader('Content-Length', chunkSize);
    fs.createReadStream(localPath, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', totalSize);
    fs.createReadStream(localPath).pipe(res);
  }
});

// ── POST /assemble ──────────────────────────────────────────────────────────
// Body: { storyId, userId }
//
// Enqueues a BullMQ job for full audio assembly. This endpoint returns quickly
// while assembly runs in the queue worker.
app.post('/assemble', requireAuth, async (req, res) => {
  const { storyId, userId } = req.body;

  if (!storyId || !userId) {
    res.status(400).json({ error: 'storyId and userId are required' });
    return;
  }

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, userId: true },
    });

    if (!story || story.userId !== userId) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    const { job, alreadyQueued } = await enqueueAssembleJob({ storyId, userId });

    // Fast-path: if worker finishes almost instantly, include completion payload.
    const maybeResult = await waitForAssembleResult(job, 1200);
    if (maybeResult) {
      res.json({
        success: true,
        queued: false,
        completed: true,
        jobId: job.id,
        result: maybeResult,
      });
      return;
    }

    res.status(202).json({
      success: true,
      queued: true,
      alreadyQueued,
      jobId: job.id,
      message: alreadyQueued
        ? 'Audio assembly already in queue'
        : 'Audio assembly job queued',
    });
  } catch (err: any) {
    console.error('[assemble] Queue enqueue error:', err);
    res.status(500).json({ error: err.message || 'Failed to queue audio assembly' });
  }
});

// ── GET /assemble/status?storyId=... ────────────────────────────────────────
app.get('/assemble/status', requireAuth, async (req, res) => {
  const storyId = String(req.query.storyId || '');

  if (!storyId) {
    res.status(400).json({ error: 'storyId is required' });
    return;
  }

  try {
    const status = await getAssembleStoryStatus(storyId);
    res.json(status);
  } catch (err: any) {
    console.error('[assemble] Status error:', err);
    res.status(500).json({ error: err.message || 'Failed to get queue status' });
  }
});

// ── POST /mix ──────────────────────────────────────────────────────────────
// Body: { storyId, soundscapeId?, backgroundVolume?, binauralEnabled? }
//
// Flow:
//   1. Look up Story → get voice_only_r2_key (the clean narration)
//   2. Look up SoundscapeAsset → get its r2_key (if soundscapeId provided)
//   3. Download voice (and optionally background) from R2
//   4. Mix with FFmpeg (background + binaural as configured)
//   5. Upload mixed result to R2
//   6. Delete the old combined_audio_key if it exists
//   7. Update Story record with new combined_audio_key + audio_url
//   8. Return the new audio URL / key
app.post('/mix', requireAuth, async (req, res) => {
  const { storyId, soundscapeId, backgroundVolume, binauralEnabled } = req.body;

  if (!storyId) {
    res.status(400).json({ error: 'storyId is required' });
    return;
  }

  // At least one feature must be requested
  if (!soundscapeId && !binauralEnabled) {
    res.status(400).json({ error: 'soundscapeId or binauralEnabled is required' });
    return;
  }

  try {
    // 1. Fetch story
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    const voiceKey = story.voice_only_r2_key || story.audio_r2_key;
    if (!voiceKey) {
      res.status(400).json({ error: 'Story has no voice audio to mix' });
      return;
    }

    // 2. Fetch soundscape asset (optional)
    let soundscape: any = null;
    let bgBuffer: Buffer | null = null;

    if (soundscapeId) {
      soundscape = await prisma.soundscapeAsset.findUnique({
        where: { id: soundscapeId },
      });
      if (!soundscape) {
        res.status(404).json({ error: 'Soundscape not found' });
        return;
      }
    }

    // Cache check: if the story is already mixed with the same soundscape,
    // return the existing URL immediately — no need to re-mix.
    if (
      story.combined_audio_key &&
      soundscape &&
      story.soundscape_audio_key === soundscape.r2_key
    ) {
      console.log(`[mix] Cache hit — story=${storyId} already mixed with ${soundscape.r2_key}`);
      res.json({
        success: true,
        combined_audio_key: story.combined_audio_key,
        soundscape_audio_key: story.soundscape_audio_key,
        audio_url: story.audio_url,
        cached: true,
      });
      return;
    }

    console.log(
      `[mix] Starting: story=${storyId} voice=${voiceKey} bg=${soundscape?.r2_key ?? 'none'} binaural=${!!binauralEnabled}`
    );

    // 3. Download voice (and background if selected) from R2
    //    The voice file may still be uploading to R2 (fire-and-forget from assemble).
    //    Fall back to the local temp cache if R2 returns NoSuchKey / 404.
    let voiceBuffer: Buffer;
    try {
      voiceBuffer = await downloadFromR2(voiceKey);
    } catch (dlErr: any) {
      const errMsg = dlErr?.message || '';
      const httpStatus = dlErr?.$metadata?.httpStatusCode;
      const isNotFound =
        httpStatus === 404 ||
        errMsg.includes('NoSuchKey') ||
        errMsg.includes('specified key does not exist');

      if (isNotFound) {
        // Try local cache — assemble writes here before R2 upload starts
        const localPath = localAudioCache.get(voiceKey);
        if (localPath && fs.existsSync(localPath)) {
          console.log(`[mix] R2 not ready for ${voiceKey}, using local cache: ${localPath}`);
          voiceBuffer = fs.readFileSync(localPath);
        } else {
          console.error(`[mix] Voice file not found in R2 or local cache: ${voiceKey}`);
          res.status(409).json({
            error: 'Your voice audio is still being uploaded. Please wait a few seconds and try again.',
            code: 'AUDIO_NOT_READY',
            retryable: true,
          });
          return;
        }
      } else {
        throw dlErr;
      }
    }

    if (soundscape) {
      bgBuffer = await downloadFromR2(soundscape.r2_key);
    }

    console.log(
      `[mix] Downloaded voice=${voiceBuffer.length}B${bgBuffer ? ` bg=${bgBuffer.length}B` : ''}`
    );

    // 4. Mix with FFmpeg
    const mixedBuffer = await mixAudio({
      voiceBuffer,
      backgroundBuffer: bgBuffer,
      backgroundVolume: backgroundVolume ?? 0.15,
      binauralEnabled: !!binauralEnabled,
    });

    console.log(`[mix] Mixed result: ${mixedBuffer.length}B`);

    // 5. Build the new R2 key
    const newCombinedKey = `user_${story.userId}/stories/${storyId}/combined_${Date.now()}.mp3`;

    // 6. Upload mixed file to R2
    await uploadToR2(newCombinedKey, mixedBuffer);

    // 7. Delete old combined key from R2 if it exists
    const oldCombinedKey = story.combined_audio_key;
    if (oldCombinedKey && oldCombinedKey !== newCombinedKey) {
      await deleteFromR2(oldCombinedKey);
      console.log(`[mix] Deleted old combined key: ${oldCombinedKey}`);
    }

    // 8. Update story in DB
    const audioUrl = `/api/user/audio/stream?key=${encodeURIComponent(newCombinedKey)}`;

    await prisma.story.update({
      where: { id: storyId },
      data: {
        combined_audio_key: newCombinedKey,
        soundscape_audio_key: soundscape?.r2_key ?? null,
        audio_url: audioUrl,
      },
    });

    console.log(`[mix] Done — new key: ${newCombinedKey}`);

    res.json({
      success: true,
      combined_audio_key: newCombinedKey,
      soundscape_audio_key: soundscape?.r2_key ?? null,
      audio_url: audioUrl,
    });
  } catch (err: any) {
    console.error('[mix] Error:', err);
    const errMsg = err?.message || '';
    if (errMsg.includes('specified key does not exist') || errMsg.includes('NoSuchKey')) {
      res.status(409).json({
        error: 'Your audio is still being uploaded. Please wait a few seconds and try again.',
        code: 'AUDIO_NOT_READY',
        retryable: true,
      });
    } else {
      res.status(500).json({
        error: 'Something went wrong while mixing your audio. Please try again.',
        code: 'MIX_FAILED',
        retryable: true,
      });
    }
  }
});

// ── POST /enhance-voice ───────────────────────────────────────────────────
// Apply narration mastering to voice-only audio.
// Body: { storyId, voiceKey? }
app.post('/enhance-voice', requireAuth, async (req, res) => {
  const { storyId, voiceKey } = req.body;

  if (!storyId) {
    res.status(400).json({ error: 'storyId is required' });
    return;
  }

  try {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    const sourceKey = voiceKey || story.voice_only_r2_key || story.audio_r2_key;
    if (!sourceKey) {
      res.status(400).json({ error: 'No source voice audio key found' });
      return;
    }

    console.log(`[enhance] Starting: story=${storyId} source=${sourceKey}`);

    const sourceBuffer = await downloadFromR2(sourceKey);
    console.log(`[enhance] Downloaded source=${sourceBuffer.length}B`);

    const enhancedBuffer = await enhanceNarrationVoice(sourceBuffer);
    console.log(`[enhance] Enhanced result=${enhancedBuffer.length}B`);

    const enhancedKey = `user_${story.userId}/stories/${storyId}/voice_enhanced_${Date.now()}.mp3`;
    await uploadToR2(enhancedKey, enhancedBuffer, 'audio/mpeg');

    const audioUrl = `/api/user/audio/stream?key=${encodeURIComponent(enhancedKey)}`;

    res.json({
      success: true,
      source_key: sourceKey,
      enhanced_key: enhancedKey,
      audio_url: audioUrl,
      bytes_in: sourceBuffer.length,
      bytes_out: enhancedBuffer.length,
    });
  } catch (err: any) {
    console.error('[enhance] Error:', err);
    res.status(500).json({ error: err.message || 'Voice enhancement failed' });
  }
});

// ── POST /unmix ────────────────────────────────────────────────────────────
// Revert to voice-only: remove combined audio, restore voice_only as primary
// Body: { storyId }
app.post('/unmix', requireAuth, async (req, res) => {
  const { storyId } = req.body;

  if (!storyId) {
    res.status(400).json({ error: 'storyId is required' });
    return;
  }

  try {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    // Delete combined file from R2
    if (story.combined_audio_key) {
      await deleteFromR2(story.combined_audio_key);
      console.log(`[unmix] Deleted combined: ${story.combined_audio_key}`);
    }

    // Restore voice-only as the primary audio
    const voiceKey = story.voice_only_r2_key || story.audio_r2_key;
    const audioUrl = voiceKey
      ? `/api/user/audio/stream?key=${encodeURIComponent(voiceKey)}`
      : story.audio_url;

    await prisma.story.update({
      where: { id: storyId },
      data: {
        combined_audio_key: null,
        soundscape_audio_key: null,
        audio_url: audioUrl,
      },
    });

    res.json({ success: true, audio_url: audioUrl });
  } catch (err: any) {
    console.error('[unmix] Error:', err);
    res.status(500).json({ error: err.message || 'Unmix failed' });
  }
});

// ── POST /enhance-8d ──────────────────────────────────────────────────────
// Apply 8D spatial audio to a story's voice audio.
// Body: { storyId }
//
// Flow:
//   1. Look up Story → get voice audio key (voice_only_r2_key or audio_r2_key)
//   2. Download voice from R2
//   3. Apply 8D audio processing via FFmpeg
//   4. Upload 8D version to R2 with binaural_8d prefix
//   5. Delete old audio_r2_key from R2 (the non-8D version)
//   6. Update Story record with new audio_r2_key + audio_url
//   7. Return the new audio URL / key
app.post('/enhance-8d', requireAuth, async (req, res) => {
  const { storyId } = req.body;

  if (!storyId) {
    res.status(400).json({ error: 'storyId is required' });
    return;
  }

  try {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    // Use the current audio key (prefer voice_only_r2_key for clean source)
    const sourceKey = story.audio_r2_key || story.voice_only_r2_key;
    if (!sourceKey) {
      res.status(400).json({ error: 'Story has no audio to enhance' });
      return;
    }

    // Check if already 8D enhanced
    if (/binaural_8d/i.test(sourceKey)) {
      res.status(400).json({ error: 'Audio is already 8D enhanced' });
      return;
    }

    console.log(`[enhance-8d] Starting: story=${storyId} source=${sourceKey}`);

    // Download voice from R2
    let voiceBuffer: Buffer;
    try {
      voiceBuffer = await downloadFromR2(sourceKey);
    } catch (dlErr: any) {
      const localPath = localAudioCache.get(sourceKey);
      if (localPath && fs.existsSync(localPath)) {
        voiceBuffer = fs.readFileSync(localPath);
      } else {
        res.status(409).json({
          error: 'Audio file not yet available. Please wait a moment and try again.',
          code: 'AUDIO_NOT_READY',
          retryable: true,
        });
        return;
      }
    }

    console.log(`[enhance-8d] Downloaded source=${voiceBuffer.length}B`);

    // Apply 8D spatial audio
    const enhanced8DBuffer = await apply8DAudio(voiceBuffer, 'story');
    console.log(`[enhance-8d] 8D applied: ${voiceBuffer.length}B → ${enhanced8DBuffer.length}B`);

    // Build the new R2 key with binaural_8d identifier
    const new8DKey = `user_${story.userId}/stories/${storyId}/binaural_8d_${Date.now()}.mp3`;

    // Upload 8D version to R2
    await uploadToR2(new8DKey, enhanced8DBuffer, 'audio/mpeg');
    console.log(`[enhance-8d] Uploaded to R2: ${new8DKey}`);

    // Delete the old non-8D audio from R2
    if (sourceKey && sourceKey !== story.voice_only_r2_key) {
      await deleteFromR2(sourceKey);
      console.log(`[enhance-8d] Deleted old key: ${sourceKey}`);
    }

    // Update the audio URL
    const audioUrl = `/api/user/audio/stream?key=${encodeURIComponent(new8DKey)}`;

    await prisma.story.update({
      where: { id: storyId },
      data: {
        audio_r2_key: new8DKey,
        audio_url: audioUrl,
      },
    });

    console.log(`[enhance-8d] Done — story=${storyId} new key=${new8DKey}`);

    res.json({
      success: true,
      audio_r2_key: new8DKey,
      audio_url: audioUrl,
    });
  } catch (err: any) {
    console.error('[enhance-8d] Error:', err);
    res.status(500).json({
      error: 'Failed to apply 8D enhancement. Please try again.',
      code: 'ENHANCE_FAILED',
    });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  initAssembleWorker();
  console.log(`🎛️  Mixing server running on http://localhost:${PORT}`);
});
