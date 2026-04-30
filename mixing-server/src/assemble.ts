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
// 8D tuning controls (defaults target stronger travel + reduced ear fatigue)
const EIGHT_D_PRIMARY_HZ = Math.max(0.015, Number(process.env.EIGHT_D_PRIMARY_HZ ?? 0.042) || 0.042);
const EIGHT_D_SECONDARY_HZ = Math.max(0.03, Number(process.env.EIGHT_D_SECONDARY_HZ ?? 0.095) || 0.095);
const EIGHT_D_PRIMARY_DEPTH = Math.min(0.99, Math.max(0.2, Number(process.env.EIGHT_D_PRIMARY_DEPTH ?? 0.94) || 0.94));
const EIGHT_D_SECONDARY_DEPTH = Math.min(0.8, Math.max(0.05, Number(process.env.EIGHT_D_SECONDARY_DEPTH ?? 0.22) || 0.22));
const EIGHT_D_FADE_IN_SECS = Math.max(0, Number(process.env.EIGHT_D_FADE_IN_SECS ?? 4) || 4);
const INTRO_8D_PRIMARY_HZ = Math.max(0.01, Number(process.env.INTRO_8D_PRIMARY_HZ ?? 0.03) || 0.03);
const INTRO_8D_PRIMARY_DEPTH = Math.min(0.85, Math.max(0.1, Number(process.env.INTRO_8D_PRIMARY_DEPTH ?? 0.5) || 0.5));

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

// Apply premium 8D binaural effect — deep immersive spatial audio
// Maximum quality: 320kbps stereo, rich multi-layer spatial processing
async function apply8DAudio(inputBuffer: Buffer, profile: 'intro' | 'story' = 'story'): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `fish-8d-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const inPath = path.join(tmpDir, 'in.mp3');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(inPath, inputBuffer);

  const isIntro = profile === 'intro';
  const primaryHz = isIntro ? INTRO_8D_PRIMARY_HZ : EIGHT_D_PRIMARY_HZ;
  const primaryDepth = isIntro ? INTRO_8D_PRIMARY_DEPTH : EIGHT_D_PRIMARY_DEPTH;
  const secondaryDepth = isIntro ? Math.min(0.12, EIGHT_D_SECONDARY_DEPTH) : EIGHT_D_SECONDARY_DEPTH;
  const stereoWidth = isIntro ? 1.05 : 1.2;
  const echoFilter = isIntro ? 'aecho=0.7:0.35:26|44:0.05|0.03' : 'aecho=0.75:0.4:28|52:0.08|0.04';
  const loudnormFilter = isIntro ? 'loudnorm=I=-18:TP=-2.0:LRA=8' : 'loudnorm=I=-18:TP=-2.0:LRA=9';

  return new Promise<Buffer>((resolve) => {
    ffmpeg()
      .input(inPath)
      .audioFilters([
        // Convert to stereo at full sample rate
        'aformat=channel_layouts=stereo:sample_rates=48000',
        // Voice-friendly prep: remove rumble and tame harsh sibilance first
        'highpass=f=55',
        'deesser=i=0.35:m=0.6:f=0.5:s=o',
        // Add body so narration feels warm/full instead of thin/bright
        'equalizer=f=105:t=h:w=90:g=3.8',
        'equalizer=f=230:t=h:w=170:g=2.4',
        // Reduce fatiguing upper mids/highs
        'equalizer=f=3200:t=h:w=1200:g=-2.3',
        'equalizer=f=7600:t=h:w=3200:g=-4.8',
        // Primary left-right orbit with stronger depth for audible travel
        `apulsator=mode=sine:hz=${primaryHz}:amount=${primaryDepth}:offset_l=0:offset_r=0.5`,
        // Secondary slower drift adds immersion without metallic shimmer
        `apulsator=mode=sine:hz=${EIGHT_D_SECONDARY_HZ}:amount=${secondaryDepth}:offset_l=0.2:offset_r=0.7`,
        // Subtle inter-aural time difference; kept modest to avoid comb harshness
        'adelay=0|10',
        // Keep width controlled so movement remains natural and not phasey
        `extrastereo=m=${stereoWidth}`,
        // Light room cue for depth without splashy reverb tails
        echoFilter,
        // Gentle compression and limiter for a softer, less piercing delivery
        'acompressor=threshold=-23dB:ratio=2.2:attack=80:release=300:knee=4:makeup=1.2',
        'alimiter=limit=0.88:level=disabled',
        // Slightly quieter target than before to reduce ear fatigue
        loudnormFilter,
      ])
      .outputOptions([
        '-codec:a', 'libmp3lame',
        '-b:a', '320k',   // High-quality stereo master
        '-ac', '2',       // Stereo
        '-ar', '48000',   // Preserve spatial detail
      ])
      .output(outPath)
      .on('end', () => {
        try {
          const result = fs.readFileSync(outPath);
          fs.rmSync(tmpDir, { recursive: true, force: true });
          console.log(`[8D] Applied ${profile} 8D (${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB → ${(result.length / 1024 / 1024).toFixed(1)}MB, 320kbps/48kHz)`);
          resolve(result);
        } catch (e) { resolve(inputBuffer); }
      })
      .on('error', (err) => {
        console.error('[8D] FFmpeg error, returning original audio:', err.message);
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
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

  // Detect channel count to preserve stereo (8D) or mono
  const channels = await new Promise<number>((resolve) => {
    ffmpeg.ffprobe(inPath, (err, metadata) => {
      if (err) return resolve(1);
      resolve(metadata?.streams?.[0]?.channels ?? 1);
    });
  });

  return new Promise<Buffer>((resolve, reject) => {
    ffmpeg()
      .input(inPath)
      .audioFilters([`afade=t=out:st=${(duration - fadeSecs).toFixed(2)}:d=${fadeSecs}`])
      .outputOptions(['-codec:a', 'libmp3lame', '-q:a', '2', '-ac', String(channels), '-ar', '44100'])
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

// ── Bus-based text splitting ──────────────────────────────────────────────
// Split full text into intro (induction + affirmations) and story body at [INTRO_END]
function splitIntoBuses(fullText: string): { introText: string; storyText: string } {
  const idx = fullText.indexOf(INTRO_END_MARKER);
  if (idx === -1) {
    // No marker — treat everything as story
    return { introText: '', storyText: fullText.trim() };
  }
  return {
    introText: fullText.slice(0, idx).trim(),
    storyText: fullText.slice(idx + INTRO_END_MARKER.length).trim(),
  };
}

// Generate silence buffer of given duration (seconds)
async function generateSilence(durationSecs: number, channels: 1 | 2 = 1): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `fish-silence-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const outPath = path.join(tmpDir, 'silence.mp3');

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input('anullsrc=r=48000:cl=' + (channels === 2 ? 'stereo' : 'mono'))
      .inputOptions(['-f', 'lavfi'])
      .outputOptions([
        '-t', String(durationSecs),
        '-codec:a', 'libmp3lame',
        '-b:a', '128k',
        '-ac', String(channels),
        '-ar', '48000',
      ])
      .output(outPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  const buf = fs.readFileSync(outPath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return buf;
}

// Apply 8D fade-in: gradually ramp up 8D wet mix over first N seconds
// Achieved by crossfading from dry (centered) to full 8D
async function apply8DFadeIn(dryBuffer: Buffer, wetBuffer: Buffer, fadeSecs = 12): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `fish-8dfade-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const dryPath = path.join(tmpDir, 'dry.mp3');
  const wetPath = path.join(tmpDir, 'wet.mp3');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(dryPath, dryBuffer);
  fs.writeFileSync(wetPath, wetBuffer);

  // Get duration
  const duration = await new Promise<number>((resolve) => {
    ffmpeg.ffprobe(wetPath, (err, meta) => {
      resolve(Number(meta?.format?.duration ?? 0));
    });
  });
  if (!duration || duration <= fadeSecs) return wetBuffer;

  return new Promise<Buffer>((resolve) => {
    ffmpeg()
      .input(dryPath)
      .input(wetPath)
      .complexFilter([
        // Force both streams to stereo to avoid channel-layout negotiation collapsing to mono.
        `[0:a]aformat=channel_layouts=stereo,aresample=48000,afade=t=out:st=0:d=${fadeSecs}[dry]`,
        `[1:a]aformat=channel_layouts=stereo,aresample=48000,afade=t=in:st=0:d=${fadeSecs}[wet]`,
        // Fade out the dry (centered) version over fadeSecs
        // Fade in the wet (8D) version over fadeSecs, then continue at full
        // Normalize mix to avoid loudness spikes during the overlap window
        `[dry][wet]amix=inputs=2:weights='1 1':normalize=1:duration=longest:dropout_transition=0[out]`,
      ])
      .outputOptions([
        '-map', '[out]',
        '-codec:a', 'libmp3lame',
        '-b:a', '320k',
        '-ac', '2',
        '-ar', '48000',
      ])
      .output(outPath)
      .on('end', () => {
        try {
          const result = fs.readFileSync(outPath);
          fs.rmSync(tmpDir, { recursive: true, force: true });
          console.log(`[8D] Crossfade applied: ${fadeSecs}s dry→wet transition`);
          resolve(result);
        } catch (e) { resolve(wetBuffer); }
      })
      .on('error', (err) => {
        console.error('[8D] Crossfade error, using full wet:', err.message);
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        resolve(wetBuffer);
      })
      .run();
  });
}

// Concatenate multiple audio buffers in sequence (preserving channel count)
async function concatAudioBuses(parts: { buffer: Buffer; label: string }[]): Promise<Buffer> {
  const valid = parts.filter(p => p.buffer.length > 0);
  if (valid.length === 0) return Buffer.alloc(0);
  if (valid.length === 1) return valid[0].buffer;

  const tmpDir = path.join(os.tmpdir(), `fish-buscat-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Detect max channels across all parts
    let maxChannels = 1;
    const partPaths: string[] = [];

    for (let i = 0; i < valid.length; i++) {
      const p = path.join(tmpDir, `bus-${i}.mp3`);
      fs.writeFileSync(p, valid[i].buffer);
      partPaths.push(p);

      const ch = await new Promise<number>((resolve) => {
        ffmpeg.ffprobe(p, (err, meta) => resolve(meta?.streams?.[0]?.channels ?? 1));
      });
      if (ch > maxChannels) maxChannels = ch;
    }

    // Normalize all parts to same channel count and sample rate, then concat
    const normalizedPaths: string[] = [];
    for (let i = 0; i < partPaths.length; i++) {
      const normPath = path.join(tmpDir, `norm-${i}.mp3`);
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(partPaths[i])
          .outputOptions([
            '-codec:a', 'libmp3lame',
            '-b:a', '320k',
            '-ac', String(maxChannels),
            '-ar', '48000',
          ])
          .output(normPath)
          .on('end', () => resolve())
          .on('error', reject)
          .run();
      });
      normalizedPaths.push(normPath);
    }

    // Build concat list
    const listPath = path.join(tmpDir, 'list.txt');
    const lines = normalizedPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`);
    fs.writeFileSync(listPath, lines.join('\n') + '\n');

    const outPath = path.join(tmpDir, 'final.mp3');
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-codec:a', 'libmp3lame', '-b:a', '320k', '-ac', String(maxChannels), '-ar', '48000'])
        .output(outPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    console.log(`[assemble] Concatenated buses: ${valid.map(p => p.label).join(' → ')}`);
    return fs.readFileSync(outPath);
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
          max_new_tokens: 4096,
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
      console.log(`[assemble] chunk ${i + 1}/${chunks.length} (${chunk.length} chars): "${chunk.slice(0, 60)}..."`);
      const buf = await generateFishAudioTTS(voiceId, chunk);
      if (!buf || buf.length < 1000) {
        console.error(`[assemble] chunk ${i + 1} returned ${buf?.length ?? 0} bytes — too small, likely truncated`);
        throw new Error(`Fish audio failed for chunk ${i + 1} (${buf?.length ?? 0} bytes)`);
      }
      console.log(`[assemble] chunk ${i + 1} done: ${buf.length} bytes`);
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
  console.log(`[assemble] Text source: ${usedField} (${fullText.length} chars), hasIntroMarker=${hasIntroMarker}`);

  // ── BUS ARCHITECTURE ────────────────────────────────────────────────────
  // Split text into intro (induction/affirmations) and story body
  // 8D spatial audio is applied ONLY to the story bus; intro stays centered/mono
  const { introText, storyText } = splitIntoBuses(fullText);
  const introSanitized = introText ? sanitizeForTTS(introText) : '';
  const storySanitized = sanitizeForTTS(storyText);

  if (!storySanitized && !introSanitized) throw new Error('Story text is empty');

  console.log(`[assemble] Bus split — intro: ${introSanitized.length} chars, story: ${storySanitized.length} chars`);
  if (introSanitized) console.log(`[assemble] Intro preview: "${introSanitized.slice(0, 120).replace(/\n/g, ' ')}"`);
  console.log(`[assemble] Story preview: "${storySanitized.slice(0, 120).replace(/\n/g, ' ')}"`);

  // ── GENERATE TTS FOR EACH BUS ──────────────────────────────────────────
  let introBusBuffer: Buffer = Buffer.alloc(0) as Buffer;
  let storyBusBuffer: Buffer = Buffer.alloc(0) as Buffer;

  if (introSanitized) {
    console.log(`[assemble] Generating INTRO bus audio (${introSanitized.length} chars)...`);
    introBusBuffer = await generateParallel(selectedVoiceId, introSanitized);
    if (!introBusBuffer || introBusBuffer.length === 0) throw new Error('Failed to generate intro audio');
    console.log(`[assemble] Intro bus raw: ${introBusBuffer.length} bytes`);
  }

  if (storySanitized) {
    console.log(`[assemble] Generating STORY bus audio (${storySanitized.length} chars)...`);
    storyBusBuffer = await generateParallel(selectedVoiceId, storySanitized);
    if (!storyBusBuffer || storyBusBuffer.length === 0) throw new Error('Failed to generate story audio');
    console.log(`[assemble] Story bus raw: ${storyBusBuffer.length} bytes`);
  }

  // ── POST-PROCESS EACH BUS ─────────────────────────────────────────────
  // Intro: warm narration, mono/centered (no 8D)
  if (introBusBuffer.length > 0) {
    console.log(`[assemble] Post-processing INTRO bus (centered, no 8D)...`);
    introBusBuffer = await postProcessNarration(introBusBuffer);
    if (user.binaural_enabled) {
      console.log('[assemble] Applying gentle 8D to INTRO bus for early left-right motion...');
      introBusBuffer = await apply8DAudio(introBusBuffer, 'intro');
    }
  }

  // Story: warm narration + 8D spatial if enabled
  if (storyBusBuffer.length > 0) {
    console.log(`[assemble] Post-processing STORY bus...`);
    const storyPostProcessed = await postProcessNarration(storyBusBuffer);

    if (user.binaural_enabled) {
      console.log(`[assemble] Applying stronger 8D binaural to STORY bus...`);
      const story8D = await apply8DAudio(storyPostProcessed, 'story');

      // Smooth transition: crossfade from dry (centered) to wet (8D)
      console.log(`[assemble] Applying 8D fade-in crossfade (${EIGHT_D_FADE_IN_SECS}s)...`);
      // Create a centered stereo version of the dry signal for crossfade
      storyBusBuffer = await apply8DFadeIn(storyPostProcessed, story8D, EIGHT_D_FADE_IN_SECS);
    } else {
      storyBusBuffer = storyPostProcessed;
    }
  }

  // ── CONCATENATE BUSES ─────────────────────────────────────────────────
  // Order: intro → 2s silence gap → story (with 8D fade-in)
  const parts: { buffer: Buffer; label: string }[] = [];

  if (introBusBuffer.length > 0) {
    parts.push({ buffer: introBusBuffer, label: 'intro' });
    // Add a brief silence gap between intro and story for smooth transition
    const silenceChannels = user.binaural_enabled ? 2 as const : 1 as const;
    const silenceGap = await generateSilence(2, silenceChannels);
    parts.push({ buffer: silenceGap, label: 'silence-gap' });
  }

  if (storyBusBuffer.length > 0) {
    parts.push({ buffer: storyBusBuffer, label: 'story' });
  }

  console.log(`[assemble] Concatenating ${parts.length} bus parts: ${parts.map(p => p.label).join(' → ')}`);
  let finalBuffer = await concatAudioBuses(parts);

  // Apply final fade-out
  finalBuffer = await applyFadeOut(finalBuffer);
  console.log(`[assemble] Final audio: ${finalBuffer.length} bytes, 8D=${!!user.binaural_enabled}`);

  const duration = await getAudioDurationSecs(finalBuffer, 'mp3');
  const rawAudioKey = `user_${user.id}/stories/${story.id}/fish_raw_${Date.now()}.mp3`;
  const finalAudioUrl = `/api/user/audio/stream?key=${encodeURIComponent(rawAudioKey)}`;

  console.log(`[assemble] Uploading final MP3 to R2...`);
  await uploadToR2(rawAudioKey, finalBuffer, 'audio/mpeg');
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

  console.log(`[assemble] Completed story=${story.id} key=${rawAudioKey} duration=${duration}s`);

  return {
    success: true,
    storyId,
    audioUrl: finalAudioUrl,
    durationSecs: duration,
    composition: {
      hasAdminIntro: false,
      hasTTSIntro: !!introSanitized,
      hasUserVoice: userHasClonedVoice,
      introSource: introSanitized ? 'tts' : 'none',
      storySource: 'cloned',
      mixedWithSoundscape: false,
    },
  };
}
