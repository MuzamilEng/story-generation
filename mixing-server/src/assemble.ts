import { prisma } from './prisma';
import { uploadToR2 } from './r2';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

ffmpeg.setFfmpegPath(ffmpegPath.path);

const INTRO_END_MARKER = '[INTRO_END]';
const FISH_MAX_RETRIES = Math.max(0, Number(process.env.FISH_TTS_MAX_RETRIES ?? 3) || 3);
const FISH_BASE_BACKOFF_MS = Math.max(50, Number(process.env.FISH_TTS_BASE_BACKOFF_MS ?? 1000) || 1000);
const FISH_MAX_BACKOFF_MS = Math.max(FISH_BASE_BACKOFF_MS, Number(process.env.FISH_TTS_MAX_BACKOFF_MS ?? 10000) || 10000);
// Max parallel Fish requests per job (tune via env)
const FISH_CONCURRENCY = Math.max(1, Number(process.env.FISH_TTS_CONCURRENCY ?? 5) || 5);
// Target chars per chunk — smaller = faster Fish response per request
const CHUNK_CHARS = Math.max(200, Number(process.env.FISH_CHUNK_CHARS ?? 700) || 700);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(retryAfterHeader: string | null): number | null {
  if (!retryAfterHeader) return null;
  const seconds = Number(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.max(0, Math.round(seconds * 1000));
  const retryAt = Date.parse(retryAfterHeader);
  if (!Number.isNaN(retryAt)) return Math.max(0, retryAt - Date.now());
  return null;
}

// Simple semaphore — allows N concurrent Fish requests without a global serial gate
function makeSemaphore(n: number) {
  let running = 0;
  const queue: (() => void)[] = [];
  return {
    async acquire() {
      if (running < n) { running++; return; }
      await new Promise<void>(resolve => queue.push(resolve));
      running++;
    },
    release() {
      running--;
      queue.shift()?.();
    },
  };
}

// Split story text into sentence-boundary chunks of ~CHUNK_CHARS each
function splitIntoChunks(text: string, maxChars = CHUNK_CHARS): string[] {
  if (text.length <= maxChars) return [text];

  const parts = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    const candidate = current ? current + ' ' + part : part;
    if (candidate.length > maxChars && current) {
      chunks.push(current.trim());
      current = part;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

// Convert a WAV buffer to MP3 using FFmpeg (fallback when Fish returns WAV)
async function wavBufferToMp3(wavBuffer: Buffer): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `fish-conv-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const inPath = path.join(tmpDir, 'in.wav');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(inPath, wavBuffer);

  return new Promise<Buffer>((resolve, reject) => {
    ffmpeg()
      .input(inPath)
      .outputOptions(['-q:a', '4', '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame'])
      .output(outPath)
      .on('end', () => {
        try {
          const result = fs.readFileSync(outPath);
          fs.rmSync(tmpDir, { recursive: true, force: true });
          resolve(result);
        } catch (e) { reject(e); }
      })
      .on('error', (err) => {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        reject(err);
      })
      .run();
  });
}

// Detect WAV by magic bytes — Fish sometimes returns WAV even when MP3 is requested
function isWav(buf: Buffer): boolean {
  return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE';
}

async function concatMp3Buffers(parts: Buffer[]): Promise<Buffer> {
  if (parts.length === 0) return Buffer.alloc(0);
  if (parts.length === 1) return parts[0];

  const tmpDir = path.join(os.tmpdir(), `fish-concat-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const listFilePath = path.join(tmpDir, 'list.txt');
    const listLines: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      const partPath = path.join(tmpDir, `part-${i}.mp3`);
      fs.writeFileSync(partPath, parts[i]);
      const safePath = partPath.replace(/'/g, "'\\''");
      listLines.push(`file '${safePath}'`);
    }

    fs.writeFileSync(listFilePath, listLines.join('\n') + '\n');
    const outPath = path.join(tmpDir, 'joined.mp3');

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listFilePath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        // Re-encode once to guarantee decoder compatibility across concatenated chunks.
        .outputOptions(['-codec:a', 'libmp3lame', '-q:a', '4', '-ac', '1', '-ar', '24000'])
        .output(outPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    return fs.readFileSync(outPath);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

async function getAudioDurationSecs(audioBuffer: Buffer, ext: 'mp3' | 'wav'): Promise<number> {
  const tmpDir = path.join(os.tmpdir(), `fish-duration-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const audioPath = path.join(tmpDir, `audio.${ext}`);
  fs.writeFileSync(audioPath, audioBuffer);

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) return reject(err);
        const seconds = Number(metadata?.format?.duration ?? 0);
        if (!Number.isFinite(seconds) || seconds <= 0) {
          return reject(new Error('Invalid audio duration'));
        }
        resolve(seconds);
      });
    });
    return Math.round(duration);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function splitIntroFromStory(fullText: string): { intro: string; storyBody: string } {
  const idx = fullText.indexOf(INTRO_END_MARKER);
  if (idx === -1) {
    return { intro: '', storyBody: fullText.trim() };
  }
  return {
    intro: fullText.slice(0, idx).trim(),
    storyBody: fullText.slice(idx + INTRO_END_MARKER.length).trim(),
  };
}



// Generate audio for a single chunk using Fish Audio.
// sem is acquired by the caller before this runs so concurrency is controlled outside.
async function generateFishAudioTTS(voiceId: string, text: string): Promise<Buffer | null> {
  const key = process.env.FISH_AUDIO_API;
  if (!key || !voiceId) return null;

  try {
    const maxAttempts = FISH_MAX_RETRIES + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          text,
          reference_id: voiceId.startsWith('mock_') ? '7ef4660e505a41d9966d58546de54201' : voiceId,
          model: 's2-pro',
          format: 'mp3',
          sample_rate: 44100,
          normalize: true,
          latency: 'normal',
          temperature: 0.8,
          top_p: 0.8,
          chunk_length: 300,
          min_chunk_length: 80,
          repetition_penalty: 1.2,
          max_new_tokens: 2048,
          condition_on_previous_chunks: true,
          early_stop_threshold: 1.0,
          prosody: { speed: 0.9, volume: 0, normalize_loudness: true },
        }),
      });

      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        // Fish can return WAV even when MP3 is requested — convert if needed
        if (isWav(buf)) {
          console.warn('[TTS] Fish returned WAV despite mp3 request — converting with FFmpeg');
          return await wavBufferToMp3(buf);
        }
        return buf;
      }

      const errBody = await res.text().catch(() => '');
      const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
      const shouldRetry = res.status === 429 || res.status >= 500;

      if (!shouldRetry || attempt >= maxAttempts) {
        console.error(`[TTS] Fish Audio ${res.status}: ${errBody}`);
        return null;
      }

      const expBackoff = Math.min(FISH_MAX_BACKOFF_MS, FISH_BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * 500);
      const delayMs = Math.max(retryAfterMs ?? 0, expBackoff + jitter);
      console.warn(`[TTS] Fish Audio ${res.status} retry ${attempt}/${maxAttempts - 1} after ${delayMs}ms`);
      await sleep(delayMs);
    }

    return null;
  } catch (e) {
    console.error('[TTS] generateFishAudioTTS threw:', e);
    return null;
  }
}

// Generate all chunks in parallel (up to FISH_CONCURRENCY at a time) and concat MP3 buffers
async function generateParallel(voiceId: string, text: string): Promise<Buffer> {
  const chunks = splitIntoChunks(text);
  console.log(`[assemble] Splitting into ${chunks.length} chunk(s) (~${CHUNK_CHARS} chars each), concurrency=${FISH_CONCURRENCY}`);

  const sem = makeSemaphore(FISH_CONCURRENCY);
  const buffers = new Array<Buffer>(chunks.length);

  await Promise.all(chunks.map(async (chunk, i) => {
    await sem.acquire();
    try {
      console.log(`[assemble] chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      const buf = await generateFishAudioTTS(voiceId, chunk);
      if (!buf) throw new Error(`Fish audio failed for chunk ${i + 1}`);
      buffers[i] = buf;
    } finally {
      sem.release();
    }
  }));

  return concatMp3Buffers(buffers);
}

export interface AssembleResult {
  success: true;
  storyId: string;
  audioUrl: string;
  durationSecs: number;
  composition: {
    hasAdminIntro: boolean;
    hasTTSIntro: boolean;
    hasUserVoice: boolean;
    introSource: 'admin' | 'tts' | 'none';
    storySource: 'cloned' | 'tts';
    mixedWithSoundscape: boolean;
  };
}

export async function assembleStoryAudio(storyId: string, userId: string): Promise<AssembleResult> {
  const [user, story] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        voice_model_id: true,
        soundscape: true,
        binaural_enabled: true,
      },
    }),
    prisma.story.findUnique({ where: { id: storyId } }),
  ]);

  if (!user || !story || story.userId !== user.id) {
    throw new Error('Story not found');
  }

  const fishAudioVoiceId = (user.voice_model_id ?? '') as string;
  const selectedVoiceId = (process.env.FISH_AUDIO_API && fishAudioVoiceId) ? fishAudioVoiceId : null;
  const userHasClonedVoice = !!selectedVoiceId;

  if (!selectedVoiceId) {
    throw new Error('Fish Audio API key or voice model not configured');
  }

  const rawText = (story as any).story_text_approved || (story as any).story_text_draft || '';
  const fullText = String(rawText);
    const { storyBody: storyBodyText } = splitIntroFromStory(fullText);
    const textForFish = storyBodyText.trim();
  if (!textForFish) throw new Error('Story text is empty');

  console.log(`[assemble] Generating Fish audio (${textForFish.length} chars)`);
  const fishAudioBuffer = await generateParallel(selectedVoiceId, textForFish);
  if (!fishAudioBuffer || fishAudioBuffer.length === 0) throw new Error('Failed to generate Fish audio');

  const duration = await getAudioDurationSecs(fishAudioBuffer, 'mp3');
  const rawAudioKey = `user_${user.id}/stories/${story.id}/fish_raw_${Date.now()}.mp3`;
  const finalAudioUrl = `/api/user/audio/stream?key=${encodeURIComponent(rawAudioKey)}`;

  console.log(`[assemble] Uploading raw Fish MP3 to R2...`);
  await uploadToR2(rawAudioKey, fishAudioBuffer, 'audio/mpeg');
  console.log(`[assemble] Upload done: ${rawAudioKey}`);

  await prisma.story.update({
    where: { id: story.id },
    data: {
      status: 'audio_ready',
      audio_url: finalAudioUrl,
      audio_r2_key: rawAudioKey,
      audio_duration_secs: duration,
      voice_only_r2_key: rawAudioKey,
      combined_audio_key: null,
      soundscape_audio_key: null,
      audio_generated_at: new Date(),
    },
  });

  console.log(`[assemble] Completed story=${story.id} key=${rawAudioKey} mime=audio/mpeg`);

  return {
    success: true,
    storyId,
    audioUrl: finalAudioUrl,
    durationSecs: duration,
    composition: {
      hasAdminIntro: false,
      hasTTSIntro: false,
      hasUserVoice: userHasClonedVoice,
      introSource: 'none',
      storySource: 'cloned',
      mixedWithSoundscape: false,
    },
  };
}
