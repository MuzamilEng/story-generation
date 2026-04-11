import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import { downloadFromR2, uploadToR2, deleteFromR2 } from './r2';
import { mixAudio } from './mixer';

const app = express();
const PORT = process.env.MIXING_PORT || 4000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Simple shared-secret auth to prevent unauthorized calls
const API_SECRET = process.env.MIXING_API_SECRET || '';

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = req.headers['x-api-secret'] as string | undefined;
  if (!API_SECRET || token !== API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
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
      audio_url: audioUrl,
    });
  } catch (err: any) {
    console.error('[mix] Error:', err);
    res.status(500).json({ error: err.message || 'Mixing failed' });
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
  console.log(`🎛️  Mixing server running on http://localhost:${PORT}`);
});
