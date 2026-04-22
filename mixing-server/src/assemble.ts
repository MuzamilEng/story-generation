import { prisma } from './prisma';
import { downloadFromR2, uploadToR2, deleteFromR2 } from './r2';
import { mixAudio, enhanceNarrationVoice } from './mixer';

const CHUNK_CHARS = 1200;
const MAX_TTS_CONCURRENCY = Math.max(1, Number(process.env.TTS_CHUNK_CONCURRENCY ?? 2) || 2);
const CROSSFADE_MS = 30;
const INTRO_END_MARKER = '[INTRO_END]';
const FISH_MAX_RETRIES = Math.max(0, Number(process.env.FISH_TTS_MAX_RETRIES ?? 4) || 4);
const FISH_BASE_BACKOFF_MS = Math.max(50, Number(process.env.FISH_TTS_BASE_BACKOFF_MS ?? 700) || 700);
const FISH_MAX_BACKOFF_MS = Math.max(FISH_BASE_BACKOFF_MS, Number(process.env.FISH_TTS_MAX_BACKOFF_MS ?? 12000) || 12000);
const FISH_MIN_INTERVAL_MS = Math.max(0, Number(process.env.FISH_TTS_MIN_INTERVAL_MS ?? 350) || 350);

let fishRequestGate: Promise<void> = Promise.resolve();
let fishNextAllowedAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(retryAfterHeader: string | null): number | null {
  if (!retryAfterHeader) return null;

  const seconds = Number(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const retryAt = Date.parse(retryAfterHeader);
  if (!Number.isNaN(retryAt)) {
    return Math.max(0, retryAt - Date.now());
  }

  return null;
}

async function waitForFishSlot(): Promise<void> {
  const reservation = fishRequestGate.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, fishNextAllowedAt - now);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    fishNextAllowedAt = Date.now() + FISH_MIN_INTERVAL_MS;
  });

  fishRequestGate = reservation.catch(() => undefined);
  await reservation;
}

function splitIntroFromStory(fullText: string): { intro: string; storyBody: string } {
  const idx = fullText.indexOf(INTRO_END_MARKER);
  if (idx === -1) {
    return { intro: '', storyBody: fullText.trim() };
  }
  return {
    intro: fullText.slice(0, idx).trim(),
    storyBody: fullText.slice(idx + INTRO_END_MARKER.length).trim(),
  };
}

function parseWav(buf: Buffer): { sampleRate: number; channels: number; bitsPerSample: number; pcm: Buffer } | null {
  if (buf.length < 44) return null;
  const riff = buf.toString('ascii', 0, 4);
  const wave = buf.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || wave !== 'WAVE') return null;

  let offset = 12;
  let sampleRate = 44100;
  let channels = 1;
  let bitsPerSample = 16;
  let pcmStart = 0;
  let pcmLength = 0;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      channels = buf.readUInt16LE(offset + 10);
      sampleRate = buf.readUInt32LE(offset + 12);
      bitsPerSample = buf.readUInt16LE(offset + 22);
    } else if (chunkId === 'data') {
      pcmStart = offset + 8;
      pcmLength = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }

  if (pcmStart === 0) return null;
  const pcm = buf.subarray(pcmStart, pcmStart + pcmLength);
  return { sampleRate, channels, bitsPerSample, pcm };
}

function buildWav(pcm: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

function joinWavChunksWithCrossfade(chunks: Buffer[]): Buffer {
  if (chunks.length === 0) return Buffer.alloc(0);
  if (chunks.length === 1) return chunks[0];

  const first = parseWav(chunks[0]);
  if (!first) return Buffer.concat(chunks);

  const { sampleRate, channels, bitsPerSample } = first;
  const bytesPerSample = bitsPerSample / 8;
  const bytesPerFrame = channels * bytesPerSample;
  const crossfadeFrames = Math.floor((CROSSFADE_MS / 1000) * sampleRate);
  const crossfadeBytes = crossfadeFrames * bytesPerFrame;

  const pcmChunks: Buffer[] = [];
  for (const chunk of chunks) {
    const parsed = parseWav(chunk);
    if (parsed) pcmChunks.push(parsed.pcm);
  }

  if (pcmChunks.length === 0) return Buffer.concat(chunks);
  if (pcmChunks.length === 1) return buildWav(pcmChunks[0], sampleRate, channels, bitsPerSample);

  let totalBytes = pcmChunks[0].length;
  for (let i = 1; i < pcmChunks.length; i++) {
    const overlap = Math.min(crossfadeBytes, pcmChunks[i - 1].length, pcmChunks[i].length);
    totalBytes += pcmChunks[i].length - overlap;
  }

  const output = Buffer.alloc(totalBytes);
  let writeOffset = 0;

  pcmChunks[0].copy(output, 0);
  writeOffset = pcmChunks[0].length;

  for (let i = 1; i < pcmChunks.length; i++) {
    const prev = pcmChunks[i - 1];
    const curr = pcmChunks[i];
    const overlap = Math.min(crossfadeBytes, prev.length, curr.length);
    const overlapFrames = Math.floor(overlap / bytesPerFrame);

    writeOffset -= overlap;

    for (let f = 0; f < overlapFrames; f++) {
      const fadeOut = 1 - (f / overlapFrames);
      const fadeIn = f / overlapFrames;
      const prevOffset = prev.length - overlap + f * bytesPerFrame;
      const currOffset = f * bytesPerFrame;
      const outOffset = writeOffset + f * bytesPerFrame;

      for (let c = 0; c < channels; c++) {
        const sampleOffset = c * bytesPerSample;
        const prevSample = prev.readInt16LE(prevOffset + sampleOffset);
        const currSample = curr.readInt16LE(currOffset + sampleOffset);
        const mixed = Math.round(prevSample * fadeOut + currSample * fadeIn);
        const clamped = Math.max(-32768, Math.min(32767, mixed));
        output.writeInt16LE(clamped, outOffset + sampleOffset);
      }
    }

    const remaining = curr.subarray(overlap);
    writeOffset += overlap;
    remaining.copy(output, writeOffset);
    writeOffset += remaining.length;
  }

  const finalPcm = output.subarray(0, writeOffset);
  return buildWav(finalPcm, sampleRate, channels, bitsPerSample);
}

async function fetchAdminAudio(segmentKey: 'induction' | 'guide_close'): Promise<Buffer | null> {
  try {
    const asset = await (prisma as any).systemAudio.findUnique({ where: { key: segmentKey } });
    if (!asset?.r2_key) return null;
    return await downloadFromR2(asset.r2_key);
  } catch (e) {
    console.error(`[assemble] fetchAdminAudio(${segmentKey}) error:`, e);
    return null;
  }
}

async function generateFreeTTS(text: string): Promise<Buffer | null> {
  const providers = [
    async () => {
      const url = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 500 ? buf : null;
    },
    async () => {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 500 ? buf : null;
    },
  ];

  for (const fetchAudio of providers) {
    try {
      const buf = await fetchAudio();
      if (buf) return buf;
    } catch {
      // try next provider
    }
  }
  return null;
}

async function generateFishAudioTTS(voiceId: string, text: string): Promise<Buffer | null> {
  const key = process.env.FISH_AUDIO_API;
  if (!key || !voiceId) return null;

  try {
    const maxAttempts = FISH_MAX_RETRIES + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await waitForFishSlot();

      const res = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          model: 's2-pro',
        },
        body: JSON.stringify({
          text,
          reference_id: voiceId.startsWith('mock_') ? '7ef4660e505a41d9966d58546de54201' : voiceId,
          format: 'wav',
          sample_rate: 44100,
          normalize: true,
          latency: 'normal',
          temperature: 0.8,
          top_p: 0.8,
          chunk_length: 300,
          min_chunk_length: 80,
          repetition_penalty: 1.2,
          max_new_tokens: 2048,
          condition_on_previous_chunks: true,
          early_stop_threshold: 1.0,
          prosody: {
            speed: 0.9,
            volume: 0,
            normalize_loudness: true,
          },
        }),
      });

      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }

      const errBody = await res.text().catch(() => '');
      const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
      const shouldRetry = res.status === 429 || res.status >= 500;

      if (!shouldRetry || attempt >= maxAttempts) {
        console.error(`[TTS] Fish Audio ${res.status}: ${errBody}`);
        return null;
      }

      const expBackoff = Math.min(
        FISH_MAX_BACKOFF_MS,
        FISH_BASE_BACKOFF_MS * Math.pow(2, attempt - 1)
      );
      const jitter = Math.floor(Math.random() * 250);
      const delayMs = Math.max(retryAfterMs ?? 0, expBackoff + jitter);

      console.warn(
        `[TTS] Fish Audio ${res.status} retry ${attempt}/${maxAttempts - 1} after ${delayMs}ms`
      );
      await sleep(delayMs);
    }

    return null;
  } catch (e) {
    console.error('[TTS] generateFishAudioTTS threw:', e);
    return null;
  }
}

function prepareNarrationText(text: string): string {
  let prepared = text
    .replace(/\r\n/g, '\n')
    .replace(/·\s*·\s*·/g, '[pause] ...')
    .replace(/\*\s*\*\s*\*/g, '[pause] ...')
    .replace(/[-–—]{3,}/g, '[pause] ...')
    .replace(/^[·•\-–—*_~#=\s]{3,}$/gm, '')
    .replace(/\.{4,}/g, '...')
    .replace(/\u2026/g, '...')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/,([^\s\d])/g, ', $1')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();

  prepared = '[soft, warm narration] ' + prepared;
  prepared = prepared.replace(/\[pause\] \.\.\./g, '[pause] ... [gentle, reflective] ');
  return prepared;
}

function ensureEmotionContinuity(chunks: string[]): string[] {
  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    if (chunk.startsWith('[')) return chunk;
    return '[soft narration] ' + chunk;
  });
}

function splitIntoNarrationChunks(preparedText: string, maxChars: number = CHUNK_CHARS): string[] {
  if (!preparedText) return [];
  if (preparedText.length <= maxChars) return [preparedText];

  const sentenceRegex = /[^.!?]+(?:[.!?]+(?:\s|$)|\.\.\.\s*)+/g;
  const sentences: string[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = sentenceRegex.exec(preparedText)) !== null) {
    sentences.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  const tail = preparedText.slice(lastIndex).trim();
  if (tail) sentences.push(tail);

  if (sentences.length === 0) {
    const words = preparedText.split(' ');
    const chunks: string[] = [];
    let cur = '';
    for (const word of words) {
      if ((cur + ' ' + word).trim().length > maxChars) {
        if (cur) chunks.push(cur.trim());
        cur = word;
      } else {
        cur = cur ? cur + ' ' + word : word;
      }
    }
    if (cur.trim()) chunks.push(cur.trim());
    return ensureEmotionContinuity(chunks);
  }

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const s = sentence.trim();
    const candidate = current ? current + ' ' + s : s;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) chunks.push(current.trim());
      current = s;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return ensureEmotionContinuity(chunks);
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
  const ts = Date.now();

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
  let selectedVoiceId: string | null = null;
  let ttsProvider: 'fishaudio' | 'free' = 'free';

  if (process.env.FISH_AUDIO_API && fishAudioVoiceId) {
    selectedVoiceId = fishAudioVoiceId;
    ttsProvider = 'fishaudio';
  }

  const userHasClonedVoice = ttsProvider !== 'free' && !!selectedVoiceId;

  const storyType = (story as any).story_type || 'night';
  let induction: Buffer | null = null;

  if (storyType === 'night' && !userHasClonedVoice) {
    induction = await fetchAdminAudio('induction');
  }

  async function generateTTSForText(text: string, label: string): Promise<Buffer[]> {
    const prepared = prepareNarrationText(text);
    const chunks = splitIntoNarrationChunks(prepared);

    console.log(`[assemble] ${label}: ${prepared.length} chars -> ${chunks.length} chunks`);

    const buffers: Buffer[] = new Array(chunks.length);
    const workerCount = Math.min(MAX_TTS_CONCURRENCY, chunks.length);
    let nextIndex = 0;

    async function workerTTS(workerId: number): Promise<void> {
      while (true) {
        const idx = nextIndex;
        nextIndex += 1;
        if (idx >= chunks.length) return;

        const chunk = chunks[idx];
        let buf: Buffer | null = null;

        console.log(`[assemble] ${label} chunk ${idx + 1}/${chunks.length} worker=${workerId}`);

        if (ttsProvider === 'fishaudio') {
          buf = await generateFishAudioTTS(selectedVoiceId!, chunk);
          if (!buf) throw new Error(`Voice generation failed on ${label} chunk ${idx + 1}`);
        } else {
          buf = await generateFreeTTS(chunk);
          if (!buf) throw new Error(`Free TTS failed on ${label} chunk ${idx + 1}`);
        }

        buffers[idx] = buf;
      }
    }

    await Promise.all(Array.from({ length: workerCount }, (_, i) => workerTTS(i + 1)));
    return buffers;
  }

  const rawText = (story as any).story_text_approved || (story as any).story_text_draft || '';
  const fullText = String(rawText);
  const { intro: introText, storyBody: storyBodyText } = splitIntroFromStory(fullText);

  let introBuffers: Buffer[] = [];
  if (introText && introText.trim().length > 0) {
    if (!induction) {
      introBuffers = await generateTTSForText(introText, 'intro');
    }
  }

  const storyBuffers = await generateTTSForText(storyBodyText, 'story');
  if (storyBuffers.length === 0) throw new Error('Failed to generate any audio');

  const parts: Buffer[] = [];
  if (induction) parts.push(induction);
  else if (introBuffers.length > 0) parts.push(...introBuffers);
  parts.push(...storyBuffers);

  const assembled = ttsProvider === 'fishaudio' ? joinWavChunksWithCrossfade(parts) : Buffer.concat(parts);

  const bytesPerSecond = ttsProvider === 'fishaudio' ? 88200 : 16000;
  const duration = Math.round(assembled.byteLength / bytesPerSecond);

  const assembledExt = ttsProvider === 'fishaudio' ? 'wav' : 'mp3';
  const assembledMime = ttsProvider === 'fishaudio' ? 'audio/wav' : 'audio/mpeg';

  const rawKey = `user_${user.id}/story_${story.id}_final_${ts}.${assembledExt}`;
  await uploadToR2(rawKey, assembled, assembledMime);

  let voiceOnlyKey = rawKey;
  let voiceOnlyBuffer = assembled;
  let audioMime = assembledMime;

  if (userHasClonedVoice) {
    const enhancedBuffer = await enhanceNarrationVoice(assembled);
    const enhancedKey = `user_${user.id}/stories/${story.id}/voice_enhanced_${Date.now()}.mp3`;
    await uploadToR2(enhancedKey, enhancedBuffer, 'audio/mpeg');
    voiceOnlyKey = enhancedKey;
    voiceOnlyBuffer = enhancedBuffer;
    audioMime = 'audio/mpeg';
  }

  // Best-effort cleanup of intermediate raw key when enhancement created a replacement.
  if (voiceOnlyKey !== rawKey) {
    await deleteFromR2(rawKey);
  }

  let finalAudioKey = voiceOnlyKey;
  let finalAudioUrl = `/api/user/audio/stream?key=${encodeURIComponent(finalAudioKey)}`;
  let mixedWithSoundscape = false;

  const userSoundscape = user.soundscape;
  const userBinaural = !!(user as any).binaural_enabled;
  const hasSoundscapeSelected = userSoundscape && userSoundscape !== 'none';

  if (hasSoundscapeSelected || userBinaural) {
    let soundscapeAsset: any = null;

    if (hasSoundscapeSelected) {
      soundscapeAsset = await prisma.soundscapeAsset.findFirst({
        where: { isActive: true, title: { contains: userSoundscape, mode: 'insensitive' } },
      });
      if (!soundscapeAsset) {
        soundscapeAsset = await prisma.soundscapeAsset.findFirst({
          where: { isActive: true, id: userSoundscape },
        });
      }
    }

    let bgBuffer: Buffer | null = null;
    if (soundscapeAsset?.r2_key) {
      bgBuffer = await downloadFromR2(soundscapeAsset.r2_key);
    }

    const mixedBuffer = await mixAudio({
      voiceBuffer: voiceOnlyBuffer,
      backgroundBuffer: bgBuffer,
      backgroundVolume: 0.15,
      binauralEnabled: userBinaural,
    });

    const mixedKey = `user_${story.userId}/stories/${story.id}/combined_${Date.now()}.mp3`;
    await uploadToR2(mixedKey, mixedBuffer, 'audio/mpeg');

    if (story.combined_audio_key && story.combined_audio_key !== mixedKey) {
      await deleteFromR2(story.combined_audio_key);
    }

    finalAudioKey = mixedKey;
    finalAudioUrl = `/api/user/audio/stream?key=${encodeURIComponent(mixedKey)}`;
    mixedWithSoundscape = true;

    await prisma.story.update({
      where: { id: story.id },
      data: {
        combined_audio_key: mixedKey,
        soundscape_audio_key: soundscapeAsset?.r2_key ?? null,
      },
    });
  }

  await prisma.story.update({
    where: { id: story.id },
    data: {
      status: 'audio_ready',
      audio_url: finalAudioUrl,
      audio_r2_key: finalAudioKey,
      audio_duration_secs: duration,
      voice_only_r2_key: voiceOnlyKey,
      audio_generated_at: new Date(),
    },
  });

  console.log(`[assemble] Completed story=${story.id} key=${finalAudioKey} mime=${audioMime}`);

  return {
    success: true,
    storyId,
    audioUrl: finalAudioUrl,
    durationSecs: duration,
    composition: {
      hasAdminIntro: !!induction,
      hasTTSIntro: introBuffers.length > 0,
      hasUserVoice: userHasClonedVoice,
      introSource: induction ? 'admin' : (introBuffers.length > 0 ? 'tts' : 'none'),
      storySource: userHasClonedVoice ? 'cloned' : 'tts',
      mixedWithSoundscape,
    },
  };
}
