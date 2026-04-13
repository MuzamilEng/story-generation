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

/**
 * Generate a stereo WAV file with binaural theta beats.
 * Left ear: 200 Hz, Right ear: 206 Hz → 6 Hz theta difference.
 * Volume is kept very low (amplitude 0.03) so it sits under the narration.
 */
function generateBinauralWav(filePath: string, durationSecs: number): void {
  const sampleRate = 44100;
  const numSamples = sampleRate * durationSecs;
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
  buf.writeUInt32LE(16, 16);        // chunk size
  buf.writeUInt16LE(1, 20);         // PCM
  buf.writeUInt16LE(2, 22);         // stereo
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28); // byte rate
  buf.writeUInt16LE(4, 32);         // block align
  buf.writeUInt16LE(16, 34);        // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  const freqL = 200;  // Left ear
  const freqR = 206;  // Right ear → 6 Hz theta

  let offset = headerSize;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const left = Math.round(amplitude * Math.sin(2 * Math.PI * freqL * t) * 32767);
    const right = Math.round(amplitude * Math.sin(2 * Math.PI * freqR * t) * 32767);
    buf.writeInt16LE(left, offset);
    buf.writeInt16LE(right, offset + 2);
    offset += 4;
  }

  fs.writeFileSync(filePath, buf);
}

/**
 * Get approximate duration of an MP3 buffer in seconds.
 * Uses a rough CBR estimate (128kbps).
 */
function estimateMp3Duration(buf: Buffer): number {
  // 128kbps = 16000 bytes/sec
  return Math.ceil(buf.length / 16000) + 5; // +5s safety margin
}

/**
 * Mix a voice track with optional looping background soundscape and optional
 * binaural theta beats using FFmpeg.
 *
 * Layout (when background is present):
 *   [0–5s]   Background sound only (no voice) — 5s pre-roll
 *   [5s–…]   Voice narration mixed over background (+ binaural if enabled)
 *   [end–+15s] Background continues for 15s after voice ends, then fades out over the last 8s
 *
 * Layout (binaural only, no background):
 *   Voice narration with binaural theta beats layered underneath.
 *
 * Returns the mixed result as an MP3 Buffer.
 */
export function mixAudio(opts: MixOptions): Promise<Buffer> {
  const {
    voiceBuffer,
    backgroundBuffer,
    backgroundVolume = 0.15,
    binauralEnabled = false,
  } = opts;

  const hasBackground = backgroundBuffer && backgroundBuffer.length > 0;
  const BG_LEAD_SECS = hasBackground ? 5 : 0;
  const BG_TAIL_SECS = hasBackground ? 15 : 0;
  const BG_FADE_OUT_SECS = 8; // fade-out duration at the end of the tail

  const tmpDir = path.join(os.tmpdir(), `mix-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const voicePath = path.join(tmpDir, 'voice.mp3');
  const outPath = path.join(tmpDir, 'mixed.mp3');
  fs.writeFileSync(voicePath, voiceBuffer);

  let bgPath: string | null = null;
  if (hasBackground) {
    bgPath = path.join(tmpDir, 'bg.mp3');
    fs.writeFileSync(bgPath, backgroundBuffer!);
  }

  let binauralPath: string | null = null;
  if (binauralEnabled) {
    binauralPath = path.join(tmpDir, 'binaural.wav');
    const estDuration = estimateMp3Duration(voiceBuffer) + BG_LEAD_SECS + BG_TAIL_SECS;
    generateBinauralWav(binauralPath, estDuration);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const cmd = ffmpeg().input(voicePath); // input 0 = voice

    let nextInput = 1;
    let bgIdx = -1;
    let binIdx = -1;

    if (bgPath) {
      cmd.input(bgPath);
      bgIdx = nextInput++;
    }
    if (binauralPath) {
      cmd.input(binauralPath);
      binIdx = nextInput++;
    }

    // Build the complex filter
    const filters: string[] = [];
    const mixLabels: string[] = [];
    let mixCount = 1; // voice always present

    // Voice: delay if background lead-in, boost volume to compensate for amix normalization
    if (BG_LEAD_SECS > 0) {
      filters.push(`[0:a]adelay=${BG_LEAD_SECS * 1000}|${BG_LEAD_SECS * 1000},volume=2.0[delayed_voice]`);
      mixLabels.push('[delayed_voice]');
    } else {
      filters.push(`[0:a]aresample=44100,volume=2.0[voice_out]`);
      mixLabels.push('[voice_out]');
    }

    // Background: loop to cover full duration (voice + pre-roll + post-roll),
    // then fade out over the last BG_FADE_OUT_SECS seconds, volume kept low
    if (bgIdx >= 0) {
      const estVoiceDuration = estimateMp3Duration(voiceBuffer);
      const totalBgDuration = BG_LEAD_SECS + estVoiceDuration + BG_TAIL_SECS;
      const fadeStart = totalBgDuration - BG_FADE_OUT_SECS;
      filters.push(
        `[${bgIdx}:a]aloop=loop=-1:size=2e+09,atrim=0:${totalBgDuration},afade=t=in:st=0:d=${BG_LEAD_SECS},afade=t=out:st=${fadeStart}:d=${BG_FADE_OUT_SECS},volume=${backgroundVolume}[bg]`
      );
      mixLabels.push('[bg]');
      mixCount++;
    }

    // Binaural: loop and trim to match the total output duration
    if (binIdx >= 0) {
      const estVoiceDur = bgIdx >= 0 ? 0 : estimateMp3Duration(voiceBuffer); // already calculated above if bg present
      const binDuration = bgIdx >= 0
        ? BG_LEAD_SECS + estimateMp3Duration(voiceBuffer) + BG_TAIL_SECS
        : estVoiceDur + BG_LEAD_SECS;
      filters.push(
        `[${binIdx}:a]aloop=loop=-1:size=2e+09,atrim=0:${binDuration}[binaural]`
      );
      mixLabels.push('[binaural]');
      mixCount++;
    }

    // Use 'longest' when background has a post-roll tail, otherwise 'first' (voice duration)
    const durationMode = hasBackground ? 'longest' : 'first';
    filters.push(
      `${mixLabels.join('')}amix=inputs=${mixCount}:duration=${durationMode}:dropout_transition=3[out]`
    );

    cmd.complexFilter(filters)
      .outputOptions([
        '-map', '[out]',
        '-ac', '2',
        '-ar', '44100',
        '-b:a', '128k',
      ])
      .output(outPath)
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
