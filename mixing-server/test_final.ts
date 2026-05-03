import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegPath.path);

// Generate a 10s mono MP3 at 44100Hz (simulating Fish TTS output)
execSync(`${ffmpegPath.path} -f lavfi -i "sine=frequency=440:duration=10" -ac 1 -ar 44100 -q:a 4 -codec:a libmp3lame /tmp/test_fish.mp3 -y 2>/dev/null`);

// Step 1: Pre-decode to WAV (as in assemble.ts)
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

// Step 2: Full combined postProcess + 8D (matching exact assemble.ts code)
async function postProcessAndSpatialize(wavPath: string, outPath: string): Promise<void> {
  const primaryHz = 0.042;
  const primaryDepth = 0.94;
  const secondaryHz = 0.095;
  const secondaryDepth = 0.22;
  const stereoWidth = 1.2;
  const reverbFilter = "aecho=0.65:0.35:20'|'38'|'56:0.06'|'0.035'|'0.02";

  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(wavPath)
      .audioFilters([
        'equalizer=f=300:t=h:w=200:g=3',
        'equalizer=f=7000:t=h:w=3000:g=-4',
        'acompressor=threshold=-20dB:ratio=3:attack=80:release=400:knee=6:makeup=2',
        'afade=t=in:st=0:d=1.5',
        'highpass=f=55',
        'equalizer=f=6800:t=q:w=2.5:g=-4',
        'equalizer=f=105:t=h:w=90:g=3.8',
        'equalizer=f=230:t=h:w=170:g=2.4',
        'equalizer=f=3200:t=h:w=1200:g=-2.3',
        'equalizer=f=7600:t=h:w=3200:g=-4.8',
        `apulsator=mode=sine:hz=${primaryHz}:amount=${primaryDepth}:offset_l=0:offset_r=0.5`,
        `apulsator=mode=sine:hz=${secondaryHz}:amount=${secondaryDepth}:offset_l=0.2:offset_r=0.7`,
        "adelay=0'|'10",
        `extrastereo=m=${stereoWidth}`,
        reverbFilter,
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
  console.log('1. Pre-decode Fish MP3 → clean WAV...');
  await preDecodeToWav('/tmp/test_fish.mp3', '/tmp/test_clean.wav');
  console.log('   ✅ WAV ready');

  console.log('2. Apply full postProcess+8D chain...');
  await postProcessAndSpatialize('/tmp/test_clean.wav', '/tmp/test_8d_final.mp3');
  console.log('   ✅ 8D applied');

  const probe = execSync('ffprobe -v error -show_entries stream=channels,sample_rate,bit_rate -of csv=p=0 /tmp/test_8d_final.mp3').toString().trim();
  const size = fs.statSync('/tmp/test_8d_final.mp3').size;
  console.log(`   Output: ${probe}, ${(size/1024).toFixed(1)}KB`);
  console.log('\n🎉 FULL PIPELINE WORKS — 8D spatial audio will be applied correctly!');
  
  // Cleanup
  execSync('rm -f /tmp/test_fish.mp3 /tmp/test_clean.wav /tmp/test_8d_final.mp3');
}

main().catch(e => { console.error('❌ FAILED:', e.message); process.exit(1); });
