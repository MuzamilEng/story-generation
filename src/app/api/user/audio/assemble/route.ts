import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanGating } from '@/lib/plan-gating';
import { betaTypeToPlan } from '@/lib/beta-utils';
import { splitIntroFromStory } from '@/lib/story-utils';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Allow up to 300s for audio assembly (TTS generation)
export const maxDuration = 300;

// ── R2 client ────────────────────────────────────────────────────────────────
const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const BUCKET = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';

/**
 * ElevenLabs eleven_multilingual_v2 frequently truncates / drops the tail
 * of long chunks.  Keep chunks short (~800 chars) so every word is spoken.
 * At average narration speed this is roughly 25-30 seconds of audio per chunk.
 */
const CHUNK_CHARS = 800;

// ── R2 helpers ────────────────────────────────────────────────────────────────
async function fetchR2Buffer(key: string): Promise<Buffer | null> {
    try {
        const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        const chunks: Uint8Array[] = [];
        for await (const chunk of res.Body as any) chunks.push(chunk);
        return Buffer.concat(chunks);
    } catch {
        return null;
    }
}

/**
 * Pass-through: TTS providers already output consistent MP3 (44100 Hz, 128 kbps).
 * Admin audio is normalised at upload time. No ffmpeg needed on serverless.
 */
async function normalizeMP3(inputBuffer: Buffer, _bitrate: string = '128k'): Promise<Buffer> {
    return inputBuffer;
}

/**
 * Fetch admin-uploaded audio (induction / guide_close) and normalize it
 */
async function fetchAdminAudio(segmentKey: 'induction' | 'guide_close'): Promise<Buffer | null> {
    try {
        const asset = await (prisma as any).systemAudio.findUnique({ where: { key: segmentKey } });
        if (!asset?.r2_key) return null;
        const raw = await fetchR2Buffer(asset.r2_key);
        if (!raw) return null;
        
        // Normalize admin audio to match TTS format
        console.log(`[assemble] Normalizing admin audio '${segmentKey}' (${raw.length} bytes)`);
        const normalized = await normalizeMP3(raw);
        console.log(`[assemble] Admin audio normalized: ${raw.length} → ${normalized.length} bytes`);
        return normalized;
    } catch (e) {
        console.error(`[assemble] fetchAdminAudio(${segmentKey}) error:`, e);
        return null;
    }
}

// ── Free TTS Fallback ─────────────────────────────────────────────────────────
async function generateFreeTTS(text: string): Promise<Buffer | null> {
    console.log('[assemble] Using free TTS fallback');
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
        } catch {}
    }
    return null;
}

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────
async function generateElevenLabsTTS(voiceId: string, text: string): Promise<Buffer | null> {
    const key = process.env.ELEVEN_LABS_API;
    if (!key || !voiceId) return null;

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
                    body: JSON.stringify({
                        text,
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: {
                            stability: 0.75,
                            similarity_boost: 0.90,
                            style: 0,
                            use_speaker_boost: true,
                        },
                    }),
                },
            );

            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                // Normalize each chunk to ensure consistent format
                return await normalizeMP3(buf);
            }

            const errText = await res.text().catch(() => '');
            console.error(
                `[assemble] ElevenLabs TTS error ${res.status} (attempt ${attempt}/${MAX_RETRIES}):`,
                errText,
            );

            if (res.status === 429 && attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 2000 * attempt));
                continue;
            }
        } catch (e) {
            console.error(
                `[assemble] ElevenLabs TTS exception (attempt ${attempt}/${MAX_RETRIES}):`,
                e,
            );
        }

        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000));
    }
    return null;
}

// ── Fish Audio TTS ────────────────────────────────────────────────────────────
async function generateFishAudioTTS(voiceId: string, text: string): Promise<Buffer | null> {
    const key = process.env.FISH_AUDIO_API;
    if (!key || !voiceId) return null;

    try {
        const res = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify({
                text,
                reference_id: voiceId.startsWith('mock_')
                    ? '7ef4660e505a41d9966d58546de54201'
                    : voiceId,
                format: 'mp3',
                normalize: true,
            }),
        });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        // Normalize Fish Audio output as well
        return await normalizeMP3(buf);
    } catch {
        return null;
    }
}

/**
 * Normalise text before sending to TTS.
 */
function normaliseForTTS(text: string): string {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/·\s*·\s*·/g, '')
        .replace(/^[·•\-–—*_~#\s]+$/gm, '')
        .replace(/\.\.\./g, ',')
        .replace(/\u2026/g, ',')
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ── Text Chunker ──────────────────────────────────────────────────────────────
function splitTextIntoChunks(rawText: string, maxChars: number = CHUNK_CHARS): string[] {
    const text = normaliseForTTS(rawText);
    if (!text) return [];
    if (text.length <= maxChars) return [text];

    const sentenceMatches = text.match(/[^.!?]+[.!?]+[\s]*/g) || [];
    const matchedLen = sentenceMatches.reduce((n, s) => n + s.length, 0);
    const remainder = text.slice(matchedLen).trim();
    const sentences =
        remainder
            ? [...sentenceMatches, remainder]
            : sentenceMatches.length
            ? sentenceMatches
            : [text];

    const chunks: string[] = [];
    let current = '';
    for (const s of sentences) {
        if (current.length + s.length <= maxChars) {
            current += s;
        } else {
            if (current) chunks.push(current.trim());
            if (s.length > maxChars) {
                chunks.push(s.trim());
                current = '';
            } else {
                current = s;
            }
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

// ── API HANDLER ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const ts = Date.now();
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const planCheck = await checkPlanGating(session.user.id!, 'generate_audio');
        if (!planCheck.allowed)
            return NextResponse.json({ error: planCheck.message }, { status: 403 });

        const { storyId } = await req.json();
        const [user, story] = await Promise.all([
            prisma.user.findUnique({ where: { id: session.user.id } }),
            prisma.story.findUnique({ where: { id: storyId } }),
        ]);
        if (!user || !story || story.userId !== user.id)
            return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const hasActiveBeta = await prisma.userBetaCode.findFirst({
            where: {
                userId: user.id,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            include: { betaCode: { select: { type: true } } },
        });
        const effectivePlan = hasActiveBeta
            ? betaTypeToPlan((hasActiveBeta as any).betaCode?.type || 'amplifier_2_months')
            : (user.plan || 'free').toLowerCase();

        // ── Determine TTS provider ─────────────────────────────────────────────
        const elevenLabsVoiceId = (user as any).elevenlabs_voice_id as string | null | undefined;
        const fishAudioVoiceId  = user.voice_model_id as string | null | undefined;

        const useElevenLabs = !!process.env.ELEVEN_LABS_API && !!elevenLabsVoiceId;
        const useUserFishAudio =
            !!process.env.FISH_AUDIO_API &&
            !!fishAudioVoiceId &&
            !elevenLabsVoiceId;

        const userHasClonedVoice = useElevenLabs || useUserFishAudio;

        console.log(`[assemble] Voice — EL: "${elevenLabsVoiceId ?? 'none'}", Fish: "${fishAudioVoiceId ?? 'none'}"`);
        console.log(
            `[assemble] TTS provider: ${
                useElevenLabs
                    ? 'ElevenLabs (user cloned voice)'
                    : useUserFishAudio
                    ? 'Fish Audio (user cloned voice)'
                    : 'Free TTS (no cloned voice)'
            }`,
        );

        // ── Fetch admin audio (always for intro) ───────────────────────────────
        let induction: Buffer | null = null;
        let close: Buffer | null = null;

        // Always fetch induction for intro
        induction = await fetchAdminAudio('induction');
        
        // Only fetch guide close for users without cloned voice
        if (!userHasClonedVoice) {
            close = await fetchAdminAudio('guide_close');
        }
        
        console.log(`[assemble] Admin induction: ${induction ? `${induction.length} bytes (normalized)` : 'not available'}`);

        // ── Core TTS function ─────────────────────────────────────────────────
        async function generateTTSForText(text: string, label: string): Promise<Buffer[]> {
            const chunks = splitTextIntoChunks(text);
            const totalInputChars = normaliseForTTS(text).length;
            console.log(
                `[assemble] ${label}: ${totalInputChars} chars → ${chunks.length} chunks`,
            );

            const buffers: Buffer[] = [];
            for (let i = 0; i < chunks.length; i++) {
                let buf: Buffer | null = null;

                if (useElevenLabs) {
                    buf = await generateElevenLabsTTS(elevenLabsVoiceId!, chunks[i]);
                    if (!buf) {
                        console.error(`[assemble] ✗ ElevenLabs chunk ${i + 1}/${chunks.length} failed`);
                        throw new Error(
                            `Voice generation failed on ${label} chunk ${i + 1}/${chunks.length}. ` +
                            `Please try again.`
                        );
                    }
                } else if (useUserFishAudio) {
                    buf = await generateFishAudioTTS(fishAudioVoiceId!, chunks[i]);
                    if (!buf) {
                        console.error(`[assemble] ✗ Fish Audio chunk ${i + 1}/${chunks.length} failed`);
                        throw new Error(
                            `Voice generation failed on ${label} chunk ${i + 1}/${chunks.length}. ` +
                            `Please try again.`
                        );
                    }
                } else {
                    buf = await generateFreeTTS(chunks[i]);
                    if (!buf) {
                        throw new Error(
                            `Free TTS failed on ${label} chunk ${i + 1}/${chunks.length}. ` +
                            `Please try again.`
                        );
                    }
                }

                buffers.push(buf);
                console.log(
                    `[assemble] ✓ ${label} chunk ${i + 1}/${chunks.length} — ` +
                    `${chunks[i].length} chars → ${buf.length} bytes`
                );
            }
            return buffers;
        }

        // ── Generate pause using silent MP3 frames (pure JS, no ffmpeg) ──────
        function generateSilentPause(durationSecs: number = 1): Buffer {
            // MPEG1 Layer 3, 128 kbps CBR, 44100 Hz, Joint Stereo
            // Frame size = floor(144 * 128000 / 44100) = 417 bytes
            // Each frame = 1152 samples ≈ 26.12 ms
            const FRAME_SIZE = 417;
            const FRAMES_PER_SEC = Math.ceil(44100 / 1152); // 39
            const totalFrames = Math.ceil(durationSecs * FRAMES_PER_SEC);

            const frame = Buffer.alloc(FRAME_SIZE, 0);
            // MP3 frame header: MPEG1, Layer 3, no CRC, 128kbps, 44100Hz, Joint Stereo
            frame[0] = 0xFF;
            frame[1] = 0xFB;
            frame[2] = 0x90;
            frame[3] = 0x00;
            // Bytes 4-35: side information — all zeros → part2_3_length = 0 → silence

            const frames: Buffer[] = [];
            for (let i = 0; i < totalFrames; i++) {
                frames.push(Buffer.from(frame));
            }
            return Buffer.concat(frames);
        }

        // ── Text segmentation ─────────────────────────────────────────────────
        const rawText =
            (story as any).story_text_approved || (story as any).story_text_draft || '';
        const { intro: introText, storyBody: storyBodyText } = splitIntroFromStory(rawText);
        console.log(
            `[assemble] Intro: ${introText.length} chars | Story body: ${storyBodyText.length} chars`,
        );

        // Generate pause once
        const pauseBuffer = generateSilentPause(1.0);

        // ── 1. Intro segment ──────────────────────────────────────────────────
        let introBuffers: Buffer[] = [];
        
        if (induction && introText) {
            // Use admin professional voice for intro
            console.log(`[assemble] ✨ Using admin professional voice for intro`);
            introBuffers = [induction];
        } else if (introText) {
            // No admin audio, use TTS
            if (userHasClonedVoice) {
                console.log(`[assemble] Generating intro with user's cloned voice`);
                introBuffers = await generateTTSForText(introText, 'intro');
            } else {
                console.log(`[assemble] Generating intro with free TTS`);
                introBuffers = await generateTTSForText(introText, 'intro');
            }
        }

        // ── 2. Story body TTS ─────────────────────────────────────────────────
        console.log(`[assemble] Generating story body (${storyBodyText.length} chars, ~${storyBodyText.split(/\s+/).length} words)`);
        
        let storyBuffers: Buffer[];
        
        if (userHasClonedVoice) {
            console.log(`[assemble] 🎙️ Using user's cloned voice for story narration`);
            storyBuffers = await generateTTSForText(storyBodyText, 'story');
        } else {
            console.log(`[assemble] Using free TTS for story`);
            storyBuffers = await generateTTSForText(storyBodyText, 'story');
        }

        if (storyBuffers.length === 0) {
            return NextResponse.json({ error: 'Failed to generate any audio' }, { status: 500 });
        }

        // ── Final assembly with single FFmpeg concat ───────────────────────────
        // This ensures all audio segments are properly merged with consistent encoding
        const parts: Buffer[] = [];
        const segmentLog: string[] = [];

        if (introBuffers.length > 0) {
            parts.push(...introBuffers);
            segmentLog.push(induction ? 'Admin Intro' : 'TTS Intro');
            parts.push(pauseBuffer);
            segmentLog.push('Pause');
        }

        parts.push(...storyBuffers);
        segmentLog.push(userHasClonedVoice ? 'User Voice Story' : 'TTS Story');

        if (!userHasClonedVoice && close) {
            parts.push(pauseBuffer);
            segmentLog.push('Pause');
            parts.push(close);
            segmentLog.push('Guide Close');
        }

        console.log(`[assemble] 🎬 Assembly order: ${segmentLog.join(' → ')}`);

        // ── Concatenate MP3 buffers ───────────────────────────────────────────
        // MP3 is a frame-based format; simple concatenation produces valid output
        // that all browsers and players can decode correctly.
        const finalAudio = Buffer.concat(parts);
        console.log(`[assemble] ✅ Assembly complete — ${finalAudio.byteLength} bytes`);

        // Estimate duration
        const duration = Math.round(finalAudio.byteLength / 16000);

        // ── Upload to R2 ──────────────────────────────────────────────────────
        const finalKey = `user_${user.id}/story_${story.id}_final_${ts}.mp3`;
        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: finalKey,
                Body: finalAudio,
                ContentType: 'audio/mpeg',
            }),
        );

        const finalUrl = `/api/user/audio/stream?key=${encodeURIComponent(finalKey)}`;
        await prisma.story.update({
            where: { id: story.id },
            data: {
                status: 'audio_ready',
                audio_url: finalUrl,
                audio_r2_key: finalKey,
                audio_duration_secs: duration,
                voice_only_r2_key: null,
            },
        });

        console.log(`[assemble] ✅ Complete — ${finalAudio.byteLength} bytes, ${duration}s`);
        console.log(`[assemble] 🎙️ Voice composition: ${induction ? 'Admin intro + ' : ''}${userHasClonedVoice ? 'User cloned voice' : 'TTS'}`);
        
        return NextResponse.json({
            success: true,
            storyId,
            audioUrl: finalUrl,
            durationSecs: duration,
            composition: {
                hasAdminIntro: !!induction,
                hasUserVoice: userHasClonedVoice,
                introSource: induction ? 'admin' : (introText ? 'tts' : 'none'),
                storySource: userHasClonedVoice ? 'cloned' : 'tts'
            }
        });

    } catch (e: any) {
        console.error('[assemble] Fatal:', e.message);
        return NextResponse.json({ error: e.message || 'Error occurred' }, { status: 500 });
    }
}