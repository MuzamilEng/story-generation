import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';

ffmpeg.setFfmpegPath(ffmpegPath.path);
execSync(`${ffmpegPath.path} -f lavfi -i "sine=frequency=440:duration=5" -f wav -acodec pcm_s16le -ar 48000 -ac 2 /tmp/test_clean.wav -y 2>/dev/null`);

// Full chain with ALL filters including deesser
async function testFull(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input('/tmp/test_clean.wav')
      .audioFilters([
        'equalizer=f=300:t=h:w=200:g=3',
        'equalizer=f=7000:t=h:w=3000:g=-4',
        'acompressor=threshold=-20dB:ratio=3:attack=80:release=400:knee=6:makeup=2',
        'afade=t=in:st=0:d=1.5',
        'highpass=f=55',
        'deesser=i=0.35:m=0.6:f=0.5:s=o',
        'equalizer=f=105:t=h:w=90:g=3.8',
        'equalizer=f=230:t=h:w=170:g=2.4',
        'equalizer=f=3200:t=h:w=1200:g=-2.3',
        'equalizer=f=7600:t=h:w=3200:g=-4.8',
        'apulsator=mode=sine:hz=0.042:amount=0.94:offset_l=0:offset_r=0.5',
        'apulsator=mode=sine:hz=0.095:amount=0.22:offset_l=0.2:offset_r=0.7',
        "adelay=0'|'10",
        'extrastereo=m=1.2',
        "aecho=0.65:0.35:20'|'38'|'56:0.06'|'0.035'|'0.02",
        'acompressor=threshold=-23dB:ratio=2.2:attack=80:release=300:knee=4:makeup=1.2',
        'alimiter=limit=0.88:level=disabled',
      ])
      .outputOptions(['-codec:a', 'libmp3lame', '-b:a', '320k', '-ac', '2', '-ar', '48000'])
      .output('/tmp/test_full_8d.mp3')
      .on('end', () => {
        const probe = execSync('ffprobe -v error -show_entries stream=channels,sample_rate -of csv=p=0 /tmp/test_full_8d.mp3').toString().trim();
        console.log(`✅ Full 8D chain works! Output: ${probe}`);
        resolve();
      })
      .on('error', (err) => { console.log('❌ Full chain FAILED:', err.message); reject(err); })
      .run();
  });
}

testFull().catch(() => process.exit(1));
