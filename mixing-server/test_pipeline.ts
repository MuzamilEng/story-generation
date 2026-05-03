import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import { execSync } from 'child_process';

ffmpeg.setFfmpegPath(ffmpegPath.path);

// Generate a test mono MP3 (simulating Fish TTS output)
execSync(`${ffmpegPath.path} -f lavfi -i "sine=frequency=440:duration=5" -ac 1 -ar 44100 -q:a 4 -codec:a libmp3lame /tmp/test_input.mp3 -y 2>/dev/null`);

// Step 1: Pre-decode to WAV
async function preDecodeToWav(inPath: string, outPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(inPath)
      .outputOptions(['-f', 'wav', '-acodec', 'pcm_s16le', '-ar', '48000', '-ac', '2'])
      .output(outPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

// Step 2: Apply 8D effects
async function apply8D(wavPath: string, outPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(wavPath)
      .audioFilters([
        'highpass=f=55',
        'deesser=i=0.35:m=0.6:f=0.5:s=o',
        'equalizer=f=105:t=h:w=90:g=3.8',
        'equalizer=f=230:t=h:w=170:g=2.4',
        'equalizer=f=3200:t=h:w=1200:g=-2.3',
        'equalizer=f=7600:t=h:w=3200:g=-4.8',
        'apulsator=mode=sine:hz=0.042:amount=0.94:offset_l=0:offset_r=0.5',
        'apulsator=mode=sine:hz=0.095:amount=0.22:offset_l=0.2:offset_r=0.7',
        'adelay=0|10',
        'extrastereo=m=1.2',
        'aecho=0.65:0.35:20|38|56:0.06|0.035|0.02',
        'acompressor=threshold=-23dB:ratio=2.2:attack=80:release=300:knee=4:makeup=1.2',
        'alimiter=limit=0.88:level=disabled',
      ])
      .outputOptions(['-codec:a', 'libmp3lame', '-b:a', '320k', '-ac', '2', '-ar', '48000'])
      .output(outPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

async function main() {
  console.log('Step 1: Pre-decode to WAV...');
  await preDecodeToWav('/tmp/test_input.mp3', '/tmp/test_clean.wav');
  console.log('✅ WAV created');
  
  console.log('Step 2: Apply 8D filters...');
  await apply8D('/tmp/test_clean.wav', '/tmp/test_8d.mp3');
  console.log('✅ 8D applied');
  
  // Verify output
  const stat = fs.statSync('/tmp/test_8d.mp3');
  console.log(`Output: ${stat.size} bytes`);
  
  const probe = execSync(`ffprobe -v error -show_entries stream=channels,sample_rate -of csv=p=0 /tmp/test_8d.mp3`).toString().trim();
  console.log(`Format: ${probe}`);
  console.log('🎉 Pipeline works correctly with fluent-ffmpeg!');
}

main().catch(e => { console.error('❌ FAILED:', e.message); process.exit(1); });
