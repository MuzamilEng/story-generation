import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

// Point fluent-ffmpeg to the installed binary
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Speech-focused encoding settings to keep narration files compact.
// Formula: fileSizeBytes ≈ durationSeconds * (bitrateKbps / 8) * 1024.
const MIX_MP3_BITRATE = '96k';
const ENHANCE_MP3_BITRATE = '56k';

interface MixOptions {
  /** Buffer of the primary voice / narration MP3 */
  voiceBuffer: Buffer;
  /** Buffer of the background soundscape MP3 (optional — skip if not selected) */
  backgroundBuffer?: Buffer | null;
  /** 0 – 1, background volume multiplier (ignored — spec dB levels are used) */
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
  const amplitude = 1.0; // Full scale — volume is controlled by FFmpeg filter

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
 *   │  (last 5 s of tail is a fade-out)
 *   ── end ────────────────────────────────────────────────────────────────
 *
 * Total BG duration = 5 + voiceDuration + 15
 *
 * Volume design (dB levels from spec):
 *   - Voice:              -3 dB  (0.708 linear — clean and present)
 *   - Background (under):  -18 dB (0.126 linear — subtle, ambient)
 *   - Background (solo):   -12 dB (0.25 linear — slightly louder, no voice)
 *   - Background (fade):   -12 dB → -60 dB over last 5 s of outro
 *   - Binaural:            -22 dB (0.079 linear — felt more than heard)
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

  const BG_LEAD_SECS     = 5;   // background plays solo for 5 s before voice
  const BG_TAIL_SECS     = 15;  // background continues 15 s after voice
  const BG_FADE_OUT_SECS = 5;   // fade-out duration at the end of the tail

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
      // Use -stream_loop instead of aloop filter to loop the background.
      // aloop with size=2e+09 buffers ~8GB in RAM and causes OOM on small instances.
      // -stream_loop re-reads the file from disk with negligible memory overhead.
      cmd.input(bgPath).inputOptions(['-stream_loop', '-1']);
      bgIdx = nextInput++;
    }
    if (binauralPath) {
      cmd.input(binauralPath).inputOptions(['-stream_loop', '-1']);
      binIdx = nextInput++;
    }

    // ── Complex filter ────────────────────────────────────────────────────
    //
    // Volume levels from the developer brief (dB → linear):
    //   Voice:                -3 dB  → 0.708
    //   BG under narration:  -18 dB  → 0.126
    //   BG solo (intro/outro):-12 dB → 0.251
    //   BG fade-out:         -12 dB → -60 dB over last 5 s
    //   Binaural:            -22 dB  → 0.079
    //
    // amix divides each input by N, so we pre-boost by N to keep absolute levels.
    //
    const filters: string[] = [];
    const mixLabels: string[] = [];
    let mixCount = 0;

    const totalInputs = 1 + (bgIdx >= 0 ? 1 : 0) + (binIdx >= 0 ? 1 : 0);

    // dB-to-linear conversion targets (pre-compensated for amix N-division)
    const VOICE_LINEAR      = 0.708 * totalInputs;  // -3 dB
    const BG_SOLO_LINEAR    = 0.251 * totalInputs;   // -12 dB (intro & outro)
    const BG_UNDER_LINEAR   = 0.126 * totalInputs;   // -18 dB (under narration)
    const BINAURAL_LINEAR   = 0.079 * totalInputs;   // -22 dB

    // Voice — delayed by 5 s pre-roll (or passthrough if no background)
    if (hasBackground) {
      const delayMs = BG_LEAD_SECS * 1000;
      filters.push(
        `[0:a]adelay=${delayMs}|${delayMs},volume=${VOICE_LINEAR}[voice_delayed]`
      );
      mixLabels.push('[voice_delayed]');
    } else {
      filters.push(`[0:a]aresample=44100,volume=${VOICE_LINEAR}[voice_out]`);
      mixLabels.push('[voice_out]');
    }
    mixCount++;

    // Background — loop → trim → volume automation → fade-out
    //
    // Volume automation approach:
    //   Use FFmpeg's volume filter with a time-based expression to switch
    //   between solo level (-12 dB) during intro/outro and ducked level
    //   (-18 dB) while narration plays. The fade-out is handled by afade.
    //
    //   Expression: if(lt(t, LEAD), SOLO, if(lt(t, LEAD+voice), UNDER, SOLO))
    //
    if (bgIdx >= 0) {
      const totalBgDuration = BG_LEAD_SECS + voiceDuration + BG_TAIL_SECS;
      const fadeOutStart    = totalBgDuration - BG_FADE_OUT_SECS;
      const safeFadeStart   = Math.max(0, fadeOutStart);
      const narrationEnd    = BG_LEAD_SECS + voiceDuration;

      // Volume expression: solo level during intro (0 to LEAD) and outro (LEAD+voice to end),
      // ducked level during narration (LEAD to LEAD+voice)
      const volExpr = `if(lt(t\\,${BG_LEAD_SECS})\\,${BG_SOLO_LINEAR}\\,if(lt(t\\,${narrationEnd})\\,${BG_UNDER_LINEAR}\\,${BG_SOLO_LINEAR}))`;

      filters.push(
        `[${bgIdx}:a]` +
        `atrim=0:${totalBgDuration},` +
        `afade=t=in:st=0:d=1,` +
        `afade=t=out:st=${safeFadeStart}:d=${BG_FADE_OUT_SECS},` +
        `volume='${volExpr}':eval=frame` +
        `[bg]`
      );
      mixLabels.push('[bg]');
      mixCount++;
    }

    // Binaural — loop → trim → volume at -22 dB
    if (binIdx >= 0) {
      const binDuration = hasBackground
        ? BG_LEAD_SECS + voiceDuration + BG_TAIL_SECS
        : voiceDuration;

      filters.push(
        `[${binIdx}:a]` +
        `atrim=0:${binDuration},` +
        `volume=${BINAURAL_LINEAR}` +
        `[binaural]`
      );
      mixLabels.push('[binaural]');
      mixCount++;
    }

    // Final mix
    //   duration=longest → run until the background tail finishes
    //   dropout_transition=0 → don't ramp down a stream when it ends early
    //   Note: amix normalizes by dividing each input by N — we compensate
    //   by pre-boosting volumes above instead of using normalize=0 (FFmpeg 5.1+)
    const durationMode = hasBackground ? 'longest' : 'first';
    filters.push(
      `${mixLabels.join('')}` +
      `amix=inputs=${mixCount}:duration=${durationMode}:dropout_transition=0` +
      `[out]`
    );

    cmd
      .complexFilter(filters)
      .outputOptions([
        '-map', '[out]',
        '-ac',  '2',          // stereo
        '-ar',  '32000',      // lower sample rate is enough for ambient + speech
        '-b:a', MIX_MP3_BITRATE,
        '-codec:a', 'libmp3lame',
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

/**
 * Enhance a narration track for a more polished, professional spoken-voice sound.
 *
 * Processing chain:
 * - highpass/lowpass: remove rumble + overly harsh top-end
 * - afftdn: light broadband denoise
 * - acompressor: smooth dynamics for stable narration level
 * - loudnorm: podcast-style integrated loudness target
 * - alimiter: protect peaks and prevent clipping
 */
export async function enhanceNarrationVoice(voiceBuffer: Buffer): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `enhance-${randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const inPath = path.join(tmpDir, 'voice-in.mp3');
  const outPath = path.join(tmpDir, 'voice-enhanced.mp3');
  fs.writeFileSync(inPath, voiceBuffer);

  return new Promise<Buffer>((resolve, reject) => {
    const inputBytes = voiceBuffer.length;
    ffmpeg()
      .input(inPath)
      .audioFilters([
        'highpass=f=70',
        'lowpass=f=14500',
        'afftdn=nf=-24',
        'acompressor=threshold=-18dB:ratio=2.8:attack=20:release=220:makeup=3',
        'loudnorm=I=-16:LRA=8:TP=-1.5',
        'alimiter=limit=0.95',
      ])
      .outputOptions([
        '-ac', '1',
        '-ar', '24000',
        '-b:a', ENHANCE_MP3_BITRATE,
        '-codec:a', 'libmp3lame',
      ])
      .output(outPath)
      .on('start', (cmdLine) => {
        console.log('[enhance] FFmpeg command:', cmdLine);
      })
      .on('end', () => {
        try {
          const result = fs.readFileSync(outPath);
          const ratio = inputBytes > 0 ? (result.length / inputBytes) : 0;
          console.log(
            `[enhance] Compression: ${Math.round(inputBytes / 1024)}KB -> ` +
            `${Math.round(result.length / 1024)}KB (${(ratio * 100).toFixed(1)}%)`
          );
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