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
// Target chars per chunk — larger chunks preserve prosody context for natural speech
const CHUNK_CHARS = Math.max(200, Number(process.env.FISH_CHUNK_CHARS ?? 1200) || 1200);

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

// Post-process TTS audio for warm, calm bedtime narration quality
async function postProcessNarration(inputBuffer: Buffer): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `fish-post-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const inPath = path.join(tmpDir, 'in.mp3');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(inPath, inputBuffer);

  return new Promise<Buffer>((resolve, reject) => {
    ffmpeg()
      .input(inPath)
      .audioFilters([
        // Warmth EQ: boost low-mids (200-400Hz), soften harsh highs above 6kHz
        'equalizer=f=300:t=h:w=200:g=3',
        'equalizer=f=7000:t=h:w=3000:g=-4',
        // Gentle compressor: smooth volume spikes for calm narration
        'acompressor=threshold=-20dB:ratio=3:attack=80:release=400:knee=6:makeup=2',
        // Loudness normalization to -16 LUFS (comfortable night listening)
        'loudnorm=I=-16:TP=-1.5:LRA=11',
        // Gentle fade-in (1.5s) and fade-out (2.5s)
        'afade=t=in:st=0:d=1.5',
      ])
      .outputOptions([
        '-codec:a', 'libmp3lame',
        '-q:a', '2',   // Higher quality VBR
        '-ac', '1',
        '-ar', '44100',
      ])
      .output(outPath)
      .on('end', () => {
        try {
          const result = fs.readFileSync(outPath);
          fs.rmSync(tmpDir, { recursive: true, force: true });
          resolve(result);
        } catch (e) { reject(e); }
      })
      .on('error', (err) => {
        console.error('[postProcess] FFmpeg error, returning original audio:', err.message);
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        // Fallback: return unprocessed audio rather than failing the whole job
        resolve(inputBuffer);
      })
      .run();
  });
}

// Apply fade-out to the last N seconds (must run as separate pass after loudnorm)
async function applyFadeOut(inputBuffer: Buffer, fadeSecs = 2.5): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `fish-fade-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const inPath = path.join(tmpDir, 'in.mp3');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(inPath, inputBuffer);

  // Get duration first
  const duration = await new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(inPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(Number(metadata?.format?.duration ?? 0));
    });
  });

  if (!Number.isFinite(duration) || duration <= fadeSecs) return inputBuffer;

  return new Promise<Buffer>((resolve, reject) => {
    ffmpeg()
      .input(inPath)
      .audioFilters([`afade=t=out:st=${(duration - fadeSecs).toFixed(2)}:d=${fadeSecs}`])
      .outputOptions(['-codec:a', 'libmp3lame', '-q:a', '2', '-ac', '1', '-ar', '44100'])
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
        resolve(inputBuffer);
      })
      .run();
  });
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

// Strip the [INTRO_END] marker but keep both intro and story text
function stripMarkers(fullText: string): string {
  return fullText.replace(INTRO_END_MARKER, ' ').trim();
}

// Remove all story markers and breath/sigh cues that TTS would vocalize literally;
// replace with natural pauses (ellipses) or remove entirely.
function sanitizeForTTS(text: string): string {
  return text
    // Remove all [PAUSE_SHORT] markers → short pause
    .replace(/\[\s*PAUSE_SHORT\s*\]/gi, '... ')
    // Remove all [PAUSE_LONG] markers → longer pause
    .replace(/\[\s*PAUSE_LONG\s*\]/gi, '...... ')
    // Remove all [PACE: ...] markers entirely
    .replace(/\[\s*PACE\s*:\s*\w+\s*\]/gi, '')
    // Remove bracketed stage directions: [inhale], [exhale], [deep breath], [sigh], etc.
    .replace(/\[\s*(?:inhale|exhale|deep\s*breath|breath|sigh|pause|long\s*pause)\s*\]/gi, '...')
    // Remove parenthesized variants: (deep breath), (sigh), etc.
    .replace(/\(\s*(?:inhale|exhale|deep\s*breath|breath|sigh|pause|long\s*pause)\s*\)/gi, '...')
    // Remove standalone cues on their own line: "deep breath", "sigh...", "*sigh*"
    .replace(/^\s*\*?(?:deep\s*breath|sigh|inhale|exhale)\*?[.…]*\s*$/gim, '...')
    // Remove section dividers: · · · or variations
    .replace(/[·•]\s*[·•]\s*[·•]/g, '...')
    // Catch any remaining unknown [UPPERCASE_MARKER] tags
    .replace(/\[[A-Z_]+(?:\s*:\s*[A-Z_]+)?\]/g, '')
    // Collapse multiple consecutive ellipses/whitespace into a single pause
    .replace(/(?:\.{3,}|…)(?:\s*(?:\.{3,}|…))*/g, '...')
    // Collapse multiple blank lines into one
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
          temperature: 0.65,
          top_p: 0.85,
          chunk_length: 250,
          min_chunk_length: 100,
          repetition_penalty: 1.05,
          max_new_tokens: 0,
          condition_on_previous_chunks: true,
          prosody: { speed: 0.78, volume: 0, normalize_loudness: true },
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

  // Debug: log which field was used and whether intro marker exists
  const usedField = (story as any).story_text_approved ? 'story_text_approved' : 'story_text_draft';
  const hasIntroMarker = fullText.includes('[INTRO_END]');
  const introPreview = fullText.slice(0, 200).replace(/\n/g, ' ');
  console.log(`[assemble] Text source: ${usedField} (${fullText.length} chars), hasIntroMarker=${hasIntroMarker}`);
  console.log(`[assemble] First 200 chars: "${introPreview}"`);

  // Include the full text (intro + story) — only strip the [INTRO_END] marker
  const textForFish = sanitizeForTTS(stripMarkers(fullText));
  if (!textForFish) throw new Error('Story text is empty');

  // Verify intro text survived sanitization
  const fishPreview = textForFish.slice(0, 200).replace(/\n/g, ' ');
  console.log(`[assemble] After sanitize (${textForFish.length} chars): "${fishPreview}"`);


  console.log(`[assemble] Generating Fish audio (${textForFish.length} chars)`);
  const rawFishBuffer = await generateParallel(selectedVoiceId, textForFish);
  if (!rawFishBuffer || rawFishBuffer.length === 0) throw new Error('Failed to generate Fish audio');

  console.log(`[assemble] Post-processing audio for warm narration quality...`);
  const processedBuffer = await postProcessNarration(rawFishBuffer);
  const fishAudioBuffer = await applyFadeOut(processedBuffer);
  console.log(`[assemble] Post-processing done (${rawFishBuffer.length} → ${fishAudioBuffer.length} bytes)`);

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
