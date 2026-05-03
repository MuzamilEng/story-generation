import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';

ffmpeg.setFfmpegPath(ffmpegPath.path);

// Generate test WAV directly (48kHz stereo)
execSync(`${ffmpegPath.path} -f lavfi -i "sine=frequency=440:duration=5" -f wav -acodec pcm_s16le -ar 48000 -ac 2 /tmp/test_clean.wav -y 2>/dev/null`);

// Log the command fluent-ffmpeg generates
const cmd = ffmpeg()
  .input('/tmp/test_clean.wav')
  .audioFilters([
    'highpass=f=55',
    'apulsator=mode=sine:hz=0.042:amount=0.94:offset_l=0:offset_r=0.5',
    'adelay=0|10',
    'extrastereo=m=1.2',
    'aecho=0.65:0.35:20|38|56:0.06|0.035|0.02',
    'alimiter=limit=0.88:level=disabled',
  ])
  .outputOptions(['-codec:a', 'libmp3lame', '-b:a', '320k', '-ac', '2', '-ar', '48000'])
  .output('/tmp/test_debug_out.mp3');

// Get the generated command
const args = (cmd as any)._getArguments();
console.log('FFmpeg args:', args.join(' '));
console.log('\nFilter string:', args.find((a: string) => a.includes('apulsator')));
