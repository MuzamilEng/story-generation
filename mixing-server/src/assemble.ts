import { prisma } from './prisma';
import { uploadToR2, deleteFromR2 } from './r2';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

ffmpeg.setFfmpegPath(ffmpegPath.path);

// Map of R2 key → local temp file path for files not yet uploaded to R2.
// Used by the local-stream endpoint to serve audio immediately after mastering.
export const localAudioCache = new Map<string, string>();

const INTRO_END_MARKER = '[INTRO_END]';
const FISH_MAX_RETRIES = Math.max(0, Number(process.env.FISH_TTS_MAX_RETRIES ?? 3) || 3);
const FISH_BASE_BACKOFF_MS = Math.max(50, Number(process.env.FISH_TTS_BASE_BACKOFF_MS ?? 1000) || 1000);
const FISH_MAX_BACKOFF_MS = Math.max(FISH_BASE_BACKOFF_MS, Number(process.env.FISH_TTS_MAX_BACKOFF_MS ?? 10000) || 10000);
// Max parallel Fish requests per job (tune via env)
const FISH_CONCURRENCY = Math.max(1, Number(process.env.FISH_TTS_CONCURRENCY ?? 8) || 8);
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

// Pre-decode MP3 to clean 48kHz stereo WAV to avoid "Error reinitializing filters!"
// caused by VBR MP3 frame parameter discontinuities from -c copy concatenation.
// WAV has fixed parameters throughout — the downstream filter graph never needs to reinit.
async function preDecodeToWav(inMp3Path: string, outWavPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(inMp3Path)
      .outputOptions(['-f', 'wav', '-acodec', 'pcm_s16le', '-ar', '48000', '-ac', '2'])
      .output(outWavPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
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
        // Stream-copy: all chunks share the same codec params from Fish (44100Hz MP3).
        // This avoids a full re-encode pass (~15-20s savings on long stories).
        .outputOptions(['-c', 'copy'])
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
// NOTE: loudnorm is deferred to the final mastering stage to avoid double-normalization
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
        // Gentle fade-in (1.5s)
        'afade=t=in:st=0:d=1.5',
      ])
      .outputOptions([
        '-codec:a', 'libmp3lame',
        '-q:a', '2',   // Higher quality VBR
        '-ac', '1',
        '-ar', '48000', // Unified 48kHz — avoids resample before HRTF stage
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

// ── Combined post-process + 8D spatial in a SINGLE FFmpeg pass ────────────
// Eliminates one full encode/decode cycle vs separate postProcess → apply8D calls.
// Same filters are applied; same quality output — just faster.
async function postProcessAndSpatialize(inputBuffer: Buffer, profile: 'intro' | 'story' = 'story'): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `fish-combined-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const inPath = path.join(tmpDir, 'in.mp3');
  const wavPath = path.join(tmpDir, 'clean.wav');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(inPath, inputBuffer);

  // Pre-decode to clean WAV — eliminates VBR frame boundary issues
  try {
    await preDecodeToWav(inPath, wavPath);
  } catch (err: any) {
    console.error(`[combined] Pre-decode to WAV failed for ${profile}:`, err.message);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return inputBuffer;
  }

  const isIntro = profile === 'intro';
  const primaryHz = isIntro ? INTRO_8D_PRIMARY_HZ : EIGHT_D_PRIMARY_HZ;
  const primaryDepth = isIntro ? INTRO_8D_PRIMARY_DEPTH : EIGHT_D_PRIMARY_DEPTH;
  const secondaryDepth = isIntro ? Math.min(0.12, EIGHT_D_SECONDARY_DEPTH) : EIGHT_D_SECONDARY_DEPTH;
  const stereoWidth = isIntro ? 1.05 : 1.2;
  const reverbFilter = isIntro
    ? "aecho=0.6:0.3:18'|'32'|'48:0.04'|'0.025'|'0.015"
    : "aecho=0.65:0.35:20'|'38'|'56:0.06'|'0.035'|'0.02";

  return new Promise<Buffer>((resolve) => {
    ffmpeg()
      .input(wavPath)
      .audioFilters([
        // Input is already clean 48kHz stereo WAV from preDecodeToWav
        // ── Narration warmth filters (from postProcessNarration) ──
        'equalizer=f=300:t=h:w=200:g=3',
        'equalizer=f=7000:t=h:w=3000:g=-4',
        'acompressor=threshold=-20dB:ratio=3:attack=80:release=400:knee=6:makeup=2',
        'afade=t=in:st=0:d=1.5',
        // ── 8D spatial filters (from apply8DAudio) ──
        'highpass=f=55',
        // Sibilance taming via narrow EQ cut (replaces deesser which breaks stereo filter graph)
        'equalizer=f=6800:t=q:w=2.5:g=-4',
        'equalizer=f=105:t=h:w=90:g=3.8',
        'equalizer=f=230:t=h:w=170:g=2.4',
        'equalizer=f=3200:t=h:w=1200:g=-2.3',
        'equalizer=f=7600:t=h:w=3200:g=-4.8',
        `apulsator=mode=sine:hz=${primaryHz}:amount=${primaryDepth}:offset_l=0:offset_r=0.5`,
        `apulsator=mode=sine:hz=${EIGHT_D_SECONDARY_HZ}:amount=${secondaryDepth}:offset_l=0.2:offset_r=0.7`,
        "adelay=0'|'10",
        `extrastereo=m=${stereoWidth}`,
        reverbFilter,
        'acompressor=threshold=-23dB:ratio=2.2:attack=80:release=300:knee=4:makeup=1.2',
        'alimiter=limit=0.88:level=disabled',
      ])
      .outputOptions([
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
          console.log(`[combined] ${profile} postProcess+8D done (${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB → ${(result.length / 1024 / 1024).toFixed(1)}MB)`);
          resolve(result);
        } catch (e) { resolve(inputBuffer); }
      })
      .on('error', async (err) => {
        console.error(`[combined] FFmpeg error for ${profile}, falling back to separate passes:`, err.message);
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        // Fallback: run postProcess then 8D as two separate passes
        try {
          const postProcessed = await postProcessNarration(inputBuffer);
          const spatialized = await apply8DAudio(postProcessed, profile);
          resolve(spatialized);
        } catch {
          resolve(inputBuffer);
        }
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
  const wavPath = path.join(tmpDir, 'clean.wav');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(inPath, inputBuffer);

  // Pre-decode to clean WAV — eliminates VBR frame boundary issues
  try {
    await preDecodeToWav(inPath, wavPath);
  } catch (err: any) {
    console.error(`[8D] Pre-decode to WAV failed for ${profile}:`, err.message);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return inputBuffer;
  }

  const isIntro = profile === 'intro';
  const primaryHz = isIntro ? INTRO_8D_PRIMARY_HZ : EIGHT_D_PRIMARY_HZ;
  const primaryDepth = isIntro ? INTRO_8D_PRIMARY_DEPTH : EIGHT_D_PRIMARY_DEPTH;
  const secondaryDepth = isIntro ? Math.min(0.12, EIGHT_D_SECONDARY_DEPTH) : EIGHT_D_SECONDARY_DEPTH;
  const stereoWidth = isIntro ? 1.05 : 1.2;
  // Early reflections reverb — warmer and more natural than aecho comb filter
  // Uses short delays with low feedback for intimate room feel without metallic artifacts
  const reverbFilter = isIntro
    ? "aecho=0.6:0.3:18'|'32'|'48:0.04'|'0.025'|'0.015"
    : "aecho=0.65:0.35:20'|'38'|'56:0.06'|'0.035'|'0.02";

  return new Promise<Buffer>((resolve) => {
    ffmpeg()
      .input(wavPath)
      .audioFilters([
        // Input is already clean 48kHz stereo WAV from preDecodeToWav
        // Voice-friendly prep: remove rumble and tame harsh sibilance first
        'highpass=f=55',
        // Sibilance taming via narrow EQ cut (replaces deesser which breaks stereo filter graph)
        'equalizer=f=6800:t=q:w=2.5:g=-4',
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
        "adelay=0'|'10",
        // Keep width controlled so movement remains natural and not phasey
        `extrastereo=m=${stereoWidth}`,
        // Early reflections for intimate room depth (no metallic comb artifacts)
        reverbFilter,
        // Gentle compression and limiter for a softer, less piercing delivery
        'acompressor=threshold=-23dB:ratio=2.2:attack=80:release=300:knee=4:makeup=1.2',
        'alimiter=limit=0.88:level=disabled',
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

// ── HRTF helpers ─────────────────────────────────────────────────────────

// Decode MP3 buffer → mono Float32Array at the given sample rate (raw f32le via FFmpeg)
// When narrationFilters=true, applies warmth EQ + compression during decode (saves a separate pass)
async function decodeMp3ToMonoPcm(mp3Buffer: Buffer, sampleRate = 48000, narrationFilters = false): Promise<Float32Array> {
  const tmpDir = path.join(os.tmpdir(), `hrtf-dec-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const inPath  = path.join(tmpDir, 'in.mp3');
  const rawPath = path.join(tmpDir, 'out.raw');
  fs.writeFileSync(inPath, mp3Buffer);

  await new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg().input(inPath);
    if (narrationFilters) {
      cmd.audioFilters([
        'equalizer=f=300:t=h:w=200:g=3',
        'equalizer=f=7000:t=h:w=3000:g=-4',
        'acompressor=threshold=-20dB:ratio=3:attack=80:release=400:knee=6:makeup=2',
        'afade=t=in:st=0:d=1.5',
      ]);
    }
    cmd.outputOptions(['-f', 'f32le', '-ac', '1', '-ar', String(sampleRate)])
      .output(rawPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  const raw = fs.readFileSync(rawPath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  // Slice to guarantee 4-byte aligned ArrayBuffer for Float32Array view
  const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  return new Float32Array(ab);
}

// Encode raw stereo f32le file → 320k MP3 (no loudnorm — deferred to final mastering)
async function encodeRawStereoToMp3(rawStereoPath: string, sampleRate: number): Promise<Buffer> {
  const outPath = rawStereoPath.replace('.raw', '.mp3');

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(rawStereoPath)
      .inputOptions(['-f', 'f32le', '-ac', '2', '-ar', String(sampleRate)])
      .audioFilters([
        'alimiter=limit=0.92:level=disabled',
      ])
      .outputOptions(['-codec:a', 'libmp3lame', '-b:a', '320k', '-ac', '2', '-ar', String(sampleRate)])
      .output(outPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  const mp3 = fs.readFileSync(outPath);
  return mp3;
}

// ── FINAL MASTERING ──────────────────────────────────────────────────────
// Single-pass loudness normalization + true-peak limiting applied ONCE at the end.
// This avoids double-normalization artifacts from earlier stages.
async function finalMaster(inputBuffer: Buffer): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `fish-master-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const inPath = path.join(tmpDir, 'in.mp3');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(inPath, inputBuffer);

  // Detect channel count to preserve stereo (8D) or mono
  const channels = await new Promise<number>((resolve) => {
    ffmpeg.ffprobe(inPath, (err, metadata) => {
      if (err) return resolve(2);
      resolve(metadata?.streams?.[0]?.channels ?? 2);
    });
  });

  return new Promise<Buffer>((resolve) => {
    ffmpeg()
      .input(inPath)
      .audioFilters([
        // EBU R128 loudness normalization: -16 LUFS for comfortable headphone listening
        'loudnorm=I=-16:TP=-1.5:LRA=11',
        // Final true-peak safety limiter
        'alimiter=limit=0.9:level=disabled',
      ])
      .outputOptions([
        '-codec:a', 'libmp3lame',
        '-b:a', '320k',
        '-ac', String(channels),
        '-ar', '48000',
      ])
      .output(outPath)
      .on('end', () => {
        try {
          const result = fs.readFileSync(outPath);
          fs.rmSync(tmpDir, { recursive: true, force: true });
          console.log(`[master] Final loudnorm applied (${channels}ch, -16 LUFS, ${(result.length / 1024 / 1024).toFixed(1)}MB)`);
          resolve(result);
        } catch (e) { resolve(inputBuffer); }
      })
      .on('error', (err) => {
        console.error('[master] FFmpeg error, returning unmastered audio:', err.message);
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        resolve(inputBuffer);
      })
      .run();
  });
}

// ── Combined mastering + fade-out in a SINGLE FFmpeg pass ────────────────
// Eliminates a separate ffprobe + encode/decode cycle for fade-out (~50s savings).
// Applies: loudnorm → fade-out → limiter in one shot.
async function finalMasterWithFade(inputBuffer: Buffer, fadeSecs = 2.5): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `fish-masterfade-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const inPath = path.join(tmpDir, 'in.mp3');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(inPath, inputBuffer);

  // Get duration and channel count in one ffprobe call
  const { duration, channels } = await new Promise<{ duration: number; channels: number }>((resolve) => {
    ffmpeg.ffprobe(inPath, (err, metadata) => {
      if (err) return resolve({ duration: 0, channels: 2 });
      resolve({
        duration: Number(metadata?.format?.duration ?? 0),
        channels: metadata?.streams?.[0]?.channels ?? 2,
      });
    });
  });

  const filters: string[] = [
    // EBU R128 loudness normalization: -16 LUFS for comfortable headphone listening
    'loudnorm=I=-16:TP=-1.5:LRA=11',
  ];

  // Apply fade-out if duration is valid and longer than fadeSecs
  if (Number.isFinite(duration) && duration > fadeSecs) {
    filters.push(`afade=t=out:st=${(duration - fadeSecs).toFixed(2)}:d=${fadeSecs}`);
  }

  // Final true-peak safety limiter (after fade so fade isn't re-amplified)
  filters.push('alimiter=limit=0.9:level=disabled');

  return new Promise<Buffer>((resolve) => {
    ffmpeg()
      .input(inPath)
      .audioFilters(filters)
      .outputOptions([
        '-codec:a', 'libmp3lame',
        '-b:a', '320k',
        '-ac', String(channels),
        '-ar', '48000',
      ])
      .output(outPath)
      .on('end', () => {
        try {
          const result = fs.readFileSync(outPath);
          fs.rmSync(tmpDir, { recursive: true, force: true });
          console.log(`[master] Final loudnorm+fade applied (${channels}ch, -16 LUFS, fade=${fadeSecs}s, ${(result.length / 1024 / 1024).toFixed(1)}MB)`);
          resolve(result);
        } catch (e) { resolve(inputBuffer); }
      })
      .on('error', (err) => {
        console.error('[master] Combined mastering error, falling back to separate passes:', err.message);
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        // Fallback to original separate approach
        resolve(inputBuffer);
      })
      .run();
  });
}

// ── True HRTF 8D binaural via Web Audio API PannerNode ───────────────────
// Uses node-web-audio-api OfflineAudioContext with HRTF PannerNode.
// Processes in 120-second chunks so peak RAM stays under ~50 MB/chunk.
// Falls back to FFmpeg apulsator (apply8DAudio) if the native module is unavailable.
async function apply8DWithHRTF(inputBuffer: Buffer, profile: 'intro' | 'story' = 'story'): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let OfflineAudioContext: any;
  try {
    // Dynamic import so the server starts even if the native module isn't installed yet.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ OfflineAudioContext } = require('node-web-audio-api') as { OfflineAudioContext: any });
  } catch {
    console.warn('[8D-HRTF] node-web-audio-api unavailable — falling back to combined FFmpeg pass');
    return postProcessAndSpatialize(inputBuffer, profile);
  }

  const SAMPLE_RATE = 48000;
  const CHUNK_SECS  = 120; // 120 s windows — fewer chunks = less overhead (~50 MB peak RAM per chunk)
  const orbitHz     = profile === 'intro' ? INTRO_8D_PRIMARY_HZ : EIGHT_D_PRIMARY_HZ;
  const radius      = profile === 'story' ? 2.5 : 1.5;

  const tmpDir = path.join(os.tmpdir(), `hrtf-main-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const rawStereoPath = path.join(tmpDir, 'stereo.raw');

  try {
    console.log(`[8D-HRTF] Decoding ${profile} audio to PCM (with narration filters)...`);
    // Apply narration warmth filters during decode — eliminates separate postProcess pass
    const pcm         = await decodeMp3ToMonoPcm(inputBuffer, SAMPLE_RATE, true);
    const totalFrames = pcm.length;
    const chunkFrames = CHUNK_SECS * SAMPLE_RATE;
    const numChunks   = Math.ceil(totalFrames / chunkFrames);

    const writeStream = fs.createWriteStream(rawStereoPath);

    for (let ci = 0; ci < numChunks; ci++) {
      const startFrame    = ci * chunkFrames;
      const endFrame      = Math.min(startFrame + chunkFrames, totalFrames);
      const chunkLen      = endFrame - startFrame;
      const chunkStartSec = startFrame / SAMPLE_RATE;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const offlineCtx = new OfflineAudioContext(2, chunkLen, SAMPLE_RATE) as any;
      const audioBuffer = offlineCtx.createBuffer(1, chunkLen, SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(pcm.subarray(startFrame, endFrame));

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      const panner = offlineCtx.createPanner();
      panner.panningModel   = 'HRTF';   // real SOFA/HRTF convolution
      panner.distanceModel  = 'inverse';
      panner.refDistance    = 1;
      panner.maxDistance    = 10;
      panner.rolloffFactor  = 0.8;
      panner.coneInnerAngle = 360; // omnidirectional point source

      // Schedule 20 position updates/sec for smooth orbit (reduced from 30 to cut CPU)
      const chunkDuration = chunkLen / SAMPLE_RATE;
      const totalSteps    = Math.ceil(chunkDuration * 20);

      for (let s = 0; s <= totalSteps; s++) {
        const localT  = (s / totalSteps) * chunkDuration;
        const globalT = chunkStartSec + localT;         // maintain phase across chunks
        const angle   = 2 * Math.PI * orbitHz * globalT;
        panner.positionX.setValueAtTime(radius * Math.cos(angle), localT);
        panner.positionZ.setValueAtTime(radius * Math.sin(angle), localT);
        // slight front-back vertical drift for depth
        panner.positionY.setValueAtTime(0.3 * Math.sin(angle * 0.5), localT);
      }

      source.connect(panner);
      panner.connect(offlineCtx.destination);
      source.start(0);

      const rendered = await offlineCtx.startRendering();
      const L = rendered.getChannelData(0);
      const R = rendered.getChannelData(1);

      // Interleave L+R and stream to disk — frees chunk memory before next iteration
      const interleaved = new Float32Array(chunkLen * 2);
      for (let i = 0; i < chunkLen; i++) {
        interleaved[i * 2]     = L[i];
        interleaved[i * 2 + 1] = R[i];
      }
      const chunkBuf = Buffer.from(interleaved.buffer);
      await new Promise<void>((res, rej) => writeStream.write(chunkBuf, (err) => err ? rej(err) : res()));
      console.log(`[8D-HRTF] ${profile} chunk ${ci + 1}/${numChunks} rendered (${Math.round(chunkLen / SAMPLE_RATE)}s)`);
    }

    await new Promise<void>((res) => writeStream.end(() => res()));

    console.log(`[8D-HRTF] Encoding ${profile} HRTF render to 320k MP3...`);
    const mp3 = await encodeRawStereoToMp3(rawStereoPath, SAMPLE_RATE);
    console.log(`[8D-HRTF] ${profile}: ${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB → ${(mp3.length / 1024 / 1024).toFixed(1)}MB (true HRTF PannerNode)`);
    return mp3;

  } catch (err) {
    console.error('[8D-HRTF] Render failed, falling back to combined FFmpeg pass:', (err as Error).message);
    return postProcessAndSpatialize(inputBuffer, profile);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
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
      .outputOptions(['-codec:a', 'libmp3lame', '-b:a', '320k', '-ac', String(channels), '-ar', '48000'])
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
        '-b:a', '320k',   // Match 8D/mastered output bitrate for stream-copy concat
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
  const dryWavPath = path.join(tmpDir, 'dry.wav');
  const wetWavPath = path.join(tmpDir, 'wet.wav');
  const outPath = path.join(tmpDir, 'out.mp3');
  fs.writeFileSync(dryPath, dryBuffer);
  fs.writeFileSync(wetPath, wetBuffer);

  // Pre-decode both inputs to clean WAV
  try {
    await Promise.all([
      preDecodeToWav(dryPath, dryWavPath),
      preDecodeToWav(wetPath, wetWavPath),
    ]);
  } catch (err: any) {
    console.error('[8D-fade] Pre-decode to WAV failed:', err.message);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return wetBuffer;
  }

  // Get duration
  const duration = await new Promise<number>((resolve) => {
    ffmpeg.ffprobe(wetWavPath, (err, meta) => {
      resolve(Number(meta?.format?.duration ?? 0));
    });
  });
  if (!duration || duration <= fadeSecs) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return wetBuffer;
  }

  return new Promise<Buffer>((resolve) => {
    ffmpeg()
      .input(dryWavPath)
      .input(wetWavPath)
      .complexFilter([
        // Inputs are already 48kHz stereo WAV — apply fades directly
        `[0:a]afade=t=out:st=0:d=${fadeSecs}[dry]`,
        `[1:a]afade=t=in:st=0:d=${fadeSecs}[wet]`,
        // Sum at 0.5 weight each (avoid amix normalize= which is unsupported on older FFmpeg)
        `[dry][wet]amix=inputs=2:duration=longest:dropout_transition=0[out]`,
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
// Optimized: uses stream-copy when all parts share the same format (320k/48kHz after 8D)
async function concatAudioBuses(parts: { buffer: Buffer; label: string }[]): Promise<Buffer> {
  const valid = parts.filter(p => p.buffer.length > 0);
  if (valid.length === 0) return Buffer.alloc(0);
  if (valid.length === 1) return valid[0].buffer;

  const tmpDir = path.join(os.tmpdir(), `fish-buscat-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Detect formats of all parts
    const partPaths: string[] = [];
    const formats: { channels: number; sampleRate: number }[] = [];

    for (let i = 0; i < valid.length; i++) {
      const p = path.join(tmpDir, `bus-${i}.mp3`);
      fs.writeFileSync(p, valid[i].buffer);
      partPaths.push(p);

      const fmt = await new Promise<{ channels: number; sampleRate: number }>((resolve) => {
        ffmpeg.ffprobe(p, (err, meta) => {
          resolve({
            channels: meta?.streams?.[0]?.channels ?? 1,
            sampleRate: meta?.streams?.[0]?.sample_rate ? Number(meta.streams[0].sample_rate) : 48000,
          });
        });
      });
      formats.push(fmt);
    }

    // Check if all parts share the same format (can use -c copy)
    const allSameFormat = formats.every(f => f.channels === formats[0].channels && f.sampleRate === formats[0].sampleRate);
    const maxChannels = Math.max(...formats.map(f => f.channels));

    if (allSameFormat) {
      // Fast path: all parts already normalized — use stream-copy concat
      const listPath = path.join(tmpDir, 'list.txt');
      const lines = partPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`);
      fs.writeFileSync(listPath, lines.join('\n') + '\n');

      const outPath = path.join(tmpDir, 'final.mp3');
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(listPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy'])
          .output(outPath)
          .on('end', () => resolve())
          .on('error', reject)
          .run();
      });

      console.log(`[assemble] Concatenated buses (stream-copy): ${valid.map(p => p.label).join(' → ')}`);
      return fs.readFileSync(outPath);
    }

    // Slow path: normalize all parts to same channel count and sample rate, then concat
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
          temperature: 0.78,
          top_p: 0.92,
          chunk_length: 250,
          min_chunk_length: 100,
          repetition_penalty: 1.05,
          max_new_tokens: 4096,
          condition_on_previous_chunks: true,
          prosody: { speed: 0.92, volume: 0, normalize_loudness: true },
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout per TTS request
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
    console.error('[TTS] generateFishAudioTTS network error:', (e as Error).message);
    // Retry network errors (connection reset, timeout, etc.)
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

      // Retry individual chunks up to 2 extra times on failure
      let buf: Buffer | null = null;
      const CHUNK_RETRIES = 3;
      for (let attempt = 1; attempt <= CHUNK_RETRIES; attempt++) {
        buf = await generateFishAudioTTS(voiceId, chunk);
        if (buf && buf.length >= 1000) break;
        if (attempt < CHUNK_RETRIES) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.warn(`[assemble] chunk ${i + 1} attempt ${attempt}/${CHUNK_RETRIES} failed (${buf?.length ?? 0} bytes), retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }

      if (!buf || buf.length < 1000) {
        console.error(`[assemble] chunk ${i + 1} returned ${buf?.length ?? 0} bytes after ${CHUNK_RETRIES} attempts — too small, likely truncated`);
        throw new Error(`Fish audio failed for chunk ${i + 1} after ${CHUNK_RETRIES} retries (${buf?.length ?? 0} bytes)`);
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
  const startTime = Date.now();
  const timings: Record<string, number> = {};
  const mark = (label: string) => { timings[label] = Date.now() - startTime; };

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
  mark('text_split');
  if (introSanitized) console.log(`[assemble] Intro preview: "${introSanitized.slice(0, 120).replace(/\n/g, ' ')}"`);
  console.log(`[assemble] Story preview: "${storySanitized.slice(0, 120).replace(/\n/g, ' ')}"`);

  // ── GENERATE TTS FOR EACH BUS ──────────────────────────────────────────
  // Generate intro and story TTS in parallel for better performance
  let introBusBuffer: Buffer = Buffer.alloc(0) as Buffer;
  let storyBusBuffer: Buffer = Buffer.alloc(0) as Buffer;

  const ttsPromises: Promise<void>[] = [];

  if (introSanitized) {
    ttsPromises.push(
      (async () => {
        console.log(`[assemble] Generating INTRO bus audio (${introSanitized.length} chars)...`);
        introBusBuffer = await generateParallel(selectedVoiceId, introSanitized);
        if (!introBusBuffer || introBusBuffer.length === 0) throw new Error('Failed to generate intro audio');
        console.log(`[assemble] Intro bus raw: ${introBusBuffer.length} bytes`);
        mark('tts_intro');
      })()
    );
  }

  if (storySanitized) {
    ttsPromises.push(
      (async () => {
        console.log(`[assemble] Generating STORY bus audio (${storySanitized.length} chars)...`);
        storyBusBuffer = await generateParallel(selectedVoiceId, storySanitized);
        if (!storyBusBuffer || storyBusBuffer.length === 0) throw new Error('Failed to generate story audio');
        console.log(`[assemble] Story bus raw: ${storyBusBuffer.length} bytes`);
        mark('tts_story');
      })()
    );
  }

  await Promise.all(ttsPromises);
  mark('tts_all');

  // ── POST-PROCESS EACH BUS (in parallel) ────────────────────────────────
  const postProcessPromises: Promise<void>[] = [];

  // Intro: warm narration + optional 8D spatial
  if (introBusBuffer.length > 0) {
    postProcessPromises.push(
      (async () => {
        if (user.binaural_enabled) {
          // Combined single-pass: narration warmth + 8D spatial (saves one full encode/decode cycle)
          console.log('[assemble] Post-processing + spatializing INTRO bus (combined pass)...');
          introBusBuffer = await postProcessAndSpatialize(introBusBuffer, 'intro');
        } else {
          console.log(`[assemble] Post-processing INTRO bus (centered, no 8D)...`);
          introBusBuffer = await postProcessNarration(introBusBuffer);
        }
      })()
    );
  }

  // Story: warm narration + 8D spatial if enabled
  if (storyBusBuffer.length > 0) {
    postProcessPromises.push(
      (async () => {
        if (user.binaural_enabled) {
          // Try true HRTF path first (node-web-audio-api with integrated narration filters)
          // Falls back to combined FFmpeg pass if HRTF module unavailable
          console.log(`[assemble] Post-processing + spatializing STORY bus...`);
          storyBusBuffer = await apply8DWithHRTF(storyBusBuffer, 'story');
        } else {
          console.log(`[assemble] Post-processing STORY bus (no 8D)...`);
          storyBusBuffer = await postProcessNarration(storyBusBuffer);
        }
        mark('postprocess');
      })()
    );
  }

  await Promise.all(postProcessPromises);
  mark('postprocess_all');

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
  mark('concat');

  // Final mastering: single-pass EBU R128 loudnorm + fade-out (combined — saves one full FFmpeg pass)
  console.log(`[assemble] Applying final mastering (loudnorm -16 LUFS + fade-out)...`);
  finalBuffer = await finalMasterWithFade(finalBuffer);
  mark('mastering');
  console.log(`[assemble] Final audio: ${finalBuffer.length} bytes, 8D=${!!user.binaural_enabled}`);

  const duration = await getAudioDurationSecs(finalBuffer, 'mp3');
  const rawAudioKey = `user_${user.id}/stories/${story.id}/fish_raw_${Date.now()}.mp3`;
  const finalAudioUrl = `/api/user/audio/stream?key=${encodeURIComponent(rawAudioKey)}`;

  // ── Write temp file so audio is playable BEFORE R2 upload finishes ──────
  const localTmpPath = path.join(os.tmpdir(), `local-audio-${story.id}.mp3`);
  fs.writeFileSync(localTmpPath, finalBuffer);
  // Track in-flight temp files so the local-stream endpoint can find them
  localAudioCache.set(rawAudioKey, localTmpPath);
  console.log(`[assemble] Temp file written: ${localTmpPath} (${(finalBuffer.length / 1024 / 1024).toFixed(1)}MB)`);

  // Clean up old voice-only audio from R2 before uploading new one
  const oldVoiceKey = story.voice_only_r2_key || story.audio_r2_key;
  if (oldVoiceKey && oldVoiceKey !== rawAudioKey) {
    try {
      await deleteFromR2(oldVoiceKey);
      console.log(`[assemble] Cleaned up old R2 key: ${oldVoiceKey}`);
    } catch (cleanupErr) {
      console.warn(`[assemble] Failed to delete old R2 key ${oldVoiceKey}:`, cleanupErr);
    }
  }

  // ── Update DB immediately so user can start playback NOW ────────────────
  const durationMins = Math.ceil(duration / 60);
  await prisma.$transaction([
    prisma.story.update({
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
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        audio_mins_this_month: { increment: durationMins },
      },
    }),
  ]);
  mark('db_update');
  console.log(`[assemble] DB updated — user can play audio now`);

  // ── Fire-and-forget R2 upload in background ─────────────────────────────
  // Audio is already playable via local temp file + local-stream endpoint.
  // Upload continues asynchronously with retries; temp file only cleaned up on success.
  const uploadStart = Date.now();
  console.log(`[assemble] Starting background R2 upload...`);
  uploadToR2(rawAudioKey, finalBuffer, 'audio/mpeg')
    .then(() => {
      const uploadSecs = ((Date.now() - uploadStart) / 1000).toFixed(1);
      console.log(`[assemble] ✅ Background R2 upload done: ${rawAudioKey} (${uploadSecs}s)`);
      // Upload succeeded — safe to schedule temp file cleanup
      setTimeout(() => {
        try {
          if (fs.existsSync(localTmpPath)) {
            fs.unlinkSync(localTmpPath);
            console.log(`[assemble] Cleaned up temp file: ${localTmpPath}`);
          }
        } catch {}
        localAudioCache.delete(rawAudioKey);
      }, 5 * 60 * 1000); // Keep for 5 min after upload as safety buffer
    })
    .catch((err) => {
      console.error(`[assemble] ❌ Background R2 upload FAILED for ${rawAudioKey} after retries:`, err.message);
      // Keep temp file for 2 hours so local-stream can still serve it
      // This gives operators time to investigate or the user to download
      setTimeout(() => {
        try {
          if (fs.existsSync(localTmpPath)) {
            fs.unlinkSync(localTmpPath);
            console.log(`[assemble] Cleaned up temp file (post-failure TTL): ${localTmpPath}`);
          }
        } catch {}
        localAudioCache.delete(rawAudioKey);
      }, 2 * 60 * 60 * 1000); // 2 hours
    });

  const totalSecs = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[assemble] ✅ Completed story=${story.id} key=${rawAudioKey} duration=${duration}s totalTime=${totalSecs}s`);
  console.log(`[assemble] Timings: ${Object.entries(timings).map(([k, v]) => `${k}=${(v / 1000).toFixed(1)}s`).join(', ')}`);

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
