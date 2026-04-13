import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

// Point fluent-ffmpeg to the installed binary
ffmpeg.setFfmpegPath(ffmpegPath.path);

interface MixOptions {
  /** Buffer of the primary voice / narration MP3 */
  voiceBuffer: Buffer;
  /** Buffer of the background soundscape MP3 (optional — skip if not selected) */
  backgroundBuffer?: Buffer | null;
  /** 0 – 1, how loud the background should be relative to voice (default 0.15) */
  backgroundVolume?: number;
  /** Whether to layer binaural theta beats (4–8 Hz) under the audio */
  binauralEnabled?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get the exact duration of an audio file in seconds using ffprobe.
 * Much more reliable than byte-size estimation.
 */
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(new Error(`ffprobe failed for ${filePath}: ${err.message}`));
      const duration = metadata?.format?.duration;
      if (!duration || duration <= 0) {
        return reject(new Error(`Could not determine duration for ${filePath}`));
      }
      resolve(duration);
    });
  });
}

/**
 * Generate a stereo WAV file with binaural theta beats.
 * Left ear: 200 Hz, Right ear: 206 Hz → 6 Hz theta difference.
 * Volume is kept very low (amplitude 0.03) so it sits under the narration.
 */
function generateBinauralWav(filePath: string, durationSecs: number): void {
  const sampleRate = 44100;
  const numSamples = Math.ceil(sampleRate * durationSecs);
  const amplitude = 0.03; // very quiet

  // 16-bit stereo PCM WAV
  const dataSize = numSamples * 2 * 2; // 2 channels × 2 bytes per sample
  const headerSize = 44;
  const buf = Buffer.alloc(headerSize + dataSize);

  // WAV header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);            // chunk size
  buf.writeUInt16LE(1, 20);             // PCM
  buf.writeUInt16LE(2, 22);             // stereo
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28); // byte rate
  buf.writeUInt16LE(4, 32);             // block align
  buf.writeUInt16LE(16, 34);            // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  const freqL = 200; // Left ear
  const freqR = 206; // Right ear → 6 Hz theta

  let offset = headerSize;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const left  = Math.round(amplitude * Math.sin(2 * Math.PI * freqL * t) * 32767);
    const right = Math.round(amplitude * Math.sin(2 * Math.PI * freqR * t) * 32767);
    buf.writeInt16LE(left,  offset);
    buf.writeInt16LE(right, offset + 2);
    offset += 4;
  }

  fs.writeFileSync(filePath, buf);
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Mix a voice track with optional looping background soundscape and optional
 * binaural theta beats using FFmpeg.
 *
 * Timeline (when background is present):
 *
 *   t=0 ──────────────────────────────────────────────────────────────────
 *   │  [BG only, 5 s pre-roll]
 *   t=5
 *   │  [Voice + BG + optional binaural]
 *   t=5+voiceDuration
 *   │  [BG only, 15 s tail]
 *   t=5+voiceDuration+15
 *   │  (last 8 s of tail is a fade-out)
 *   ── end ────────────────────────────────────────────────────────────────
 *
 * Total BG duration = 5 + voiceDuration + 15
 *
 * Volume design (normalize=0 keeps levels absolute):
 *   - Voice:      1.0  (full level — prominent and clear)
 *   - Background: backgroundVolume (default 0.15 — clearly dimmed)
 *   - Binaural:   baked-in at 0.03 amplitude (barely perceptible)
 *
 * Returns the mixed result as an MP3 Buffer.
 */
export async function mixAudio(opts: MixOptions): Promise<Buffer> {
  const {
    voiceBuffer,
    backgroundBuffer,
    backgroundVolume = 0.15,
    binauralEnabled = false,
  } = opts;

  const hasBackground = !!(backgroundBuffer && backgroundBuffer.length > 0);

  const BG_LEAD_SECS     = 10;  // background plays solo for 10 s before voice
  const BG_TAIL_SECS     = 15;  // background continues 15 s after voice
  const BG_FADE_OUT_SECS = 8;   // fade-out duration at the end of the tail

  // ── Write inputs to temp files ──────────────────────────────────────────
  const tmpDir = path.join(os.tmpdir(), `mix-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const voicePath = path.join(tmpDir, 'voice.mp3');
  fs.writeFileSync(voicePath, voiceBuffer);

  let bgPath: string | null = null;
  if (hasBackground) {
    bgPath = path.join(tmpDir, 'bg.mp3');
    fs.writeFileSync(bgPath, backgroundBuffer!);
  }

  // ── Get EXACT voice duration via ffprobe ────────────────────────────────
  //    This is the critical fix: byte-size estimation was unreliable for VBR
  //    files and long narrations, causing the background to cut too early or
  //    to extend far beyond the intended tail.
  const voiceDuration = await getAudioDuration(voicePath);
  console.log(`[mixer] Voice duration (ffprobe): ${voiceDuration.toFixed(2)}s`);

  // ── Build binaural WAV sized to the full output duration ────────────────
  let binauralPath: string | null = null;
  if (binauralEnabled) {
    binauralPath = path.join(tmpDir, 'binaural.wav');
    // Full output length = pre-roll + voice + tail (only when background present)
    const fullDuration = hasBackground
      ? BG_LEAD_SECS + voiceDuration + BG_TAIL_SECS
      : voiceDuration;
    generateBinauralWav(binauralPath, fullDuration + 1); // +1 s safety margin
  }

  // ── Build FFmpeg command ────────────────────────────────────────────────
  return new Promise<Buffer>((resolve, reject) => {
    const outPath = path.join(tmpDir, 'mixed.mp3');
    const cmd = ffmpeg().input(voicePath); // [0] = voice

    let nextInput = 1;
    let bgIdx      = -1;
    let binIdx     = -1;

    if (bgPath) {
      cmd.input(bgPath);
      bgIdx = nextInput++;
    }
    if (binauralPath) {
      cmd.input(binauralPath);
      binIdx = nextInput++;
    }

    // ── Complex filter ────────────────────────────────────────────────────
    //
    // Key design decisions:
    //
    //  1. normalize=0  — disables amix's automatic loudness normalization so
    //                    every stream's volume stays exactly as set. This is
    //                    the main reason the old code needed the `volume=2.0`
    //                    hack, which we no longer need.
    //
    //  2. Voice delay  — adelay shifts the voice by BG_LEAD_SECS (5 s) so
    //                    the background gets its solo intro.
    //
    //  3. BG trim      — atrim cuts the background loop at exactly
    //                    (BG_LEAD + voiceDuration + BG_TAIL) seconds, so
    //                    there is never excess silence or premature cutoff.
    //
    //  4. duration=longest — amix runs until the longest input ends.
    //                        Because the background is the longest, this
    //                        ensures the full tail plays out.
    //
    const filters: string[] = [];
    const mixLabels: string[] = [];
    let mixCount = 0;

    // Voice — delayed by 10 s pre-roll (or passthrough if no background)
    if (hasBackground) {
      const delayMs = BG_LEAD_SECS * 1000;
      filters.push(
        `[0:a]adelay=${delayMs}|${delayMs}[voice_delayed]`
      );
      mixLabels.push('[voice_delayed]');
    } else {
      filters.push(`[0:a]aresample=44100[voice_out]`);
      mixLabels.push('[voice_out]');
    }
    mixCount++;

    // Background — loop → trim → fade-in over pre-roll → fade-out in tail → dim volume
    if (bgIdx >= 0) {
      const totalBgDuration = BG_LEAD_SECS + voiceDuration + BG_TAIL_SECS;
      const fadeOutStart    = totalBgDuration - BG_FADE_OUT_SECS;

      // Clamp fade-out start so it never goes negative (short narrations)
      const safeFadeStart = Math.max(0, fadeOutStart);

      filters.push(
        // aloop=-1: loop indefinitely until atrim cuts it
        // afade in: subtle 1 s fade-in at the very beginning (avoids hard start)
        // afade out: BG_FADE_OUT_SECS fade at the end of the tail
        // volume: dim the background relative to the voice
        `[${bgIdx}:a]` +
        `aloop=loop=-1:size=2e+09,` +
        `atrim=0:${totalBgDuration},` +
        `afade=t=in:st=0:d=1,` +
        `afade=t=out:st=${safeFadeStart}:d=${BG_FADE_OUT_SECS},` +
        `volume=${backgroundVolume}` +
        `[bg]`
      );
      mixLabels.push('[bg]');
      mixCount++;
    }

    // Binaural — loop → trim to full output duration
    if (binIdx >= 0) {
      const binDuration = hasBackground
        ? BG_LEAD_SECS + voiceDuration + BG_TAIL_SECS
        : voiceDuration;

      filters.push(
        `[${binIdx}:a]` +
        `aloop=loop=-1:size=2e+09,` +
        `atrim=0:${binDuration}` +
        `[binaural]`
      );
      mixLabels.push('[binaural]');
      mixCount++;
    }

    // Final mix
    //   normalize=0  → preserve absolute volumes (no auto-levelling)
    //   duration=longest → run until the background tail finishes
    //   dropout_transition=0 → don't ramp down a stream when it ends early
    const durationMode = hasBackground ? 'longest' : 'first';
    filters.push(
      `${mixLabels.join('')}` +
      `amix=inputs=${mixCount}:duration=${durationMode}:normalize=0:dropout_transition=0` +
      `[out]`
    );

    cmd
      .complexFilter(filters)
      .outputOptions([
        '-map', '[out]',
        '-ac',  '2',          // stereo
        '-ar',  '44100',      // sample rate
        '-b:a', '128k',       // bitrate
      ])
      .output(outPath)
      .on('start', (cmdLine) => {
        console.log('[mixer] FFmpeg command:', cmdLine);
      })
      .on('end', () => {
        try {
          const result = fs.readFileSync(outPath);
          fs.rmSync(tmpDir, { recursive: true, force: true });
          resolve(result);
        } catch (e) {
          reject(e);
        }
      })
      .on('error', (err) => {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        reject(err);
      })
      .run();
  });
}