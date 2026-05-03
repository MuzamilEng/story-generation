import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegPath.path);

// Generate test WAV directly (48kHz stereo)
execSync(`${ffmpegPath.path} -f lavfi -i "sine=frequency=440:duration=5" -f wav -acodec pcm_s16le -ar 48000 -ac 2 /tmp/test_clean.wav -y 2>/dev/null`);

// Test with single-quoted escaping for pipe in filter values
async function test(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input('/tmp/test_clean.wav')
      .audioFilters([
        'highpass=f=55',
        'apulsator=mode=sine:hz=0.042:amount=0.94:offset_l=0:offset_r=0.5',
        "adelay=0'|'10",
        'extrastereo=m=1.2',
        "aecho=0.65:0.35:20'|'38'|'56:0.06'|'0.035'|'0.02",
        'alimiter=limit=0.88:level=disabled',
      ])
      .outputOptions(['-codec:a', 'libmp3lame', '-b:a', '320k', '-ac', '2', '-ar', '48000'])
      .output('/tmp/test_escaped.mp3')
      .on('end', () => { console.log('✅ Single-quote escaping works!'); resolve(); })
      .on('error', (err) => { console.log('❌ Single-quote failed:', err.message); reject(err); })
      .run();
  });
}

test().catch(() => process.exit(1));
