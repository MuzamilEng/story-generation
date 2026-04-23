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

const app = express();
const PORT = process.env.MIXING_PORT || 4000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "https://staging-manifest.vercel.app" || 'http://localhost:3000' }));
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
    const voiceBuffer = await downloadFromR2(voiceKey);
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
    res.status(500).json({ error: err.message || 'Mixing failed' });
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

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  initAssembleWorker();
  console.log(`🎛️  Mixing server running on http://localhost:${PORT}`);
});
