import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanGating } from '@/lib/plan-gating';
import { betaTypeToPlan } from '@/lib/beta-utils';
import { splitIntroFromStory } from '@/lib/story-utils';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

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

// ── Plan capability sets ──────────────────────────────────────────────────────
const VOICE_CLONE_PLANS = new Set(['free', 'activator', 'manifester', 'amplifier']);
const ADMIN_AUDIO_PLANS = new Set(['activator', 'manifester', 'amplifier']);

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
 * Strip the VBR/Xing/Info/VBRI header frame from an MP3 buffer.
 *
 * When an admin-uploaded MP3 (which has its own VBR frame saying e.g. "3 s")
 * is concatenated with ElevenLabs output, the browser reads the VBR header
 * and believes the ENTIRE assembled file is only 3 seconds long.  It then
 * requests only the first ~48 KB via Range, plays just the intro, and stops.
 *
 * Removing the VBR header frame forces the browser to fall back to the
 * Content-Length / bitrate calculation, which gives the correct duration.
 */
function stripMP3VBRHeader(buf: Buffer): Buffer {
    if (buf.length < 10) return buf;
    let offset = 0;

    // Skip ID3v2 tag if present ('ID3')
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
        const tagSize = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) |
                        ((buf[8] & 0x7f) << 7)  |  (buf[9] & 0x7f);
        offset = 10 + tagSize;
        if (buf[5] & 0x10) offset += 10; // extended header
    }

    // Scan for the first MP3 sync word (0xFF 0xEx)
    while (offset + 4 < buf.length) {
        if (buf[offset] === 0xFF && (buf[offset + 1] & 0xE0) === 0xE0) break;
        offset++;
    }
    if (offset + 36 >= buf.length) return buf;

    const b1 = buf[offset + 1];
    const b2 = buf[offset + 2];
    const b3 = buf[offset + 3];

    const isMPEG1   = ((b1 >> 3) & 0x03) === 3;
    const isMono    = ((b3 >> 6) & 0x03) === 3;
    const sideLen   = isMPEG1 ? (isMono ? 17 : 32) : (isMono ? 9 : 17);
    const tagOffset = offset + 4 + sideLen;

    if (tagOffset + 4 > buf.length) return buf;
    const tag = buf.toString('ascii', tagOffset, tagOffset + 4);
    if (tag !== 'Xing' && tag !== 'Info' && tag !== 'VBRI') return buf;

    // Calculate this frame's byte length so we can skip exactly it
    const bitrateTable = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0];
    const srTable      = isMPEG1 ? [44100,48000,32000,0] : [22050,24000,16000,0];
    const birIdx = (b2 >> 4) & 0x0F;
    const srIdx  = (b2 >> 2) & 0x03;
    const pad    = (b2 >> 1) & 0x01;
    if (!bitrateTable[birIdx] || !srTable[srIdx]) return buf;

    const frameSize = Math.floor(144 * bitrateTable[birIdx] * 1000 / srTable[srIdx]) + pad;
    console.log(`[assemble] Stripped VBR header (${tag}) from admin audio — frame was ${frameSize} bytes`);
    return Buffer.concat([buf.subarray(0, offset), buf.subarray(offset + frameSize)]);
}

/**
 * Check whether a buffer looks like a valid MP3 file.
 * Accepts ID3v2 header (49 44 33) or raw MPEG sync word (FF Ex / FF Fx).
 */
function isMP3Buffer(buf: Buffer): boolean {
    if (!buf || buf.length < 4) return false;
    // ID3v2 tag
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
    // MPEG audio frame sync (11 set bits)
    if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
    return false;
}

async function fetchAdminAudio(segmentKey: 'induction' | 'guide_close'): Promise<Buffer | null> {
    try {
        const asset = await (prisma as any).systemAudio.findUnique({ where: { key: segmentKey } });
        if (!asset?.r2_key) return null;
        const raw = await fetchR2Buffer(asset.r2_key);
        if (!raw) return null;
        if (!isMP3Buffer(raw)) {
            console.warn(`[assemble] Admin audio '${segmentKey}' is NOT MP3 (first bytes: ${raw.subarray(0, 8).toString('hex')}). Skipping — will use TTS fallback.`);
            return null;
        }
        // Strip VBR header before concatenating so browser duration calc is correct
        return stripMP3VBRHeader(raw);
    } catch (e) {
        console.error(`[assemble] fetchAdminAudio(${segmentKey}) error:`, e);
        return null;
    }
}

// ── Free TTS Fallback ────────────────────────────────────────────────────────
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
        }
    ];

    for (const fetchAudio of providers) {
        try {
            const buf = await fetchAudio();
            if (buf) return buf;
        } catch {}
    }
    return null;
}

// ── ElevenLabs TTS (Primary — Pro plan) ───────────────────────────────────────
async function generateElevenLabsTTS(voiceId: string, text: string): Promise<Buffer | null> {
    const key = process.env.ELEVEN_LABS_API;
    if (!key) return null;
    const MAX_RETRIES = 5;
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
                            stability: 0.85,
                            similarity_boost: 0.95,
                            style: 0,
                            use_speaker_boost: true,
                        },
                    }),
                },
            );
            if (res.ok) {
                return Buffer.from(await res.arrayBuffer());
            }
            const errText = await res.text().catch(() => '');
            console.error(`[assemble] ElevenLabs TTS error ${res.status} (attempt ${attempt}/${MAX_RETRIES}):`, errText);
            // Rate-limited — wait before retry
            if (res.status === 429 && attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 3000 * attempt));
                continue;
            }
        } catch (e) {
            console.error(`[assemble] ElevenLabs TTS exception (attempt ${attempt}/${MAX_RETRIES}):`, e);
        }
        // Brief pause between retries for non-429 errors too
        if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }
    return null;
}

// ── Fish Audio TTS (Fallback) ─────────────────────────────────────────────────
async function generateFishAudioTTS(voiceId: string, text: string): Promise<Buffer | null> {
    const key = process.env.FISH_AUDIO_API;
    if (!key) return null;
    try {
        const res = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ 
                text, 
                reference_id: voiceId.startsWith('mock_') ? "7ef4660e505a41d9966d58546de54201" : voiceId, 
                format: 'mp3', 
                normalize: true 
            }),
        });
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
    } catch { return null; }
}

// ── Pause Generator ───────────────────────────────────────────────────────────
/**
 * Generate a short audible pause using the SAME TTS engine / voice as the
 * story.  A single period "." produces ~1 s of natural trailing silence
 * that is encoded identically to the rest of the audio, so the browser
 * decoder never chokes on mismatched MP3 frame parameters.
 *
 * Falls back to a hand-crafted silence only as a last resort.
 */
let _pauseBufferCache: Buffer | null = null;
async function generatePauseBuffer(
    elevenLabsVoiceId: string,
    voiceModelId: string,
    useElevenLabs: boolean,
    useFishAudio: boolean,
): Promise<Buffer> {
    if (_pauseBufferCache) return _pauseBufferCache;

    let buf: Buffer | null = null;
    // Use the same TTS provider that generates the story
    if (useElevenLabs) buf = await generateElevenLabsTTS(elevenLabsVoiceId, '.');
    if (!buf && useFishAudio) buf = await generateFishAudioTTS(voiceModelId, '.');
    if (buf && buf.length > 200) {
        _pauseBufferCache = buf;
        console.log(`[assemble] ✓ Pause buffer generated via TTS (${buf.length} bytes)`);
        return buf;
    }

    // Absolute fallback: minimal valid MPEG1 Layer 3 silence frame
    console.warn('[assemble] TTS pause failed — using raw silence fallback');
    const FRAME_SIZE = 417;
    const header = Buffer.alloc(FRAME_SIZE, 0);
    header[0] = 0xFF; header[1] = 0xFB; header[2] = 0x90; header[3] = 0x00;
    const frameDuration = 1152 / 44100;
    const frameCount = Math.ceil(1.0 / frameDuration);
    const frames: Buffer[] = [];
    for (let i = 0; i < frameCount; i++) frames.push(header);
    _pauseBufferCache = Buffer.concat(frames);
    return _pauseBufferCache;
}

/**
 * Normalise text before sending to ElevenLabs.
 * • Strips scene-transition markers (· · ·) and decorative punctuation.
 * • Collapses ALL newlines and paragraph breaks into a single space so
 *   ElevenLabs reads it as one continuous flowing narration — no dead-air
 *   gaps.  Natural pauses come from commas, periods, and sentence endings
 *   which ElevenLabs handles with proper prosody automatically.
 * • Strips ellipses (… / ...) that cause long unnatural pauses.
 */
function normaliseForTTS(text: string): string {
    return text
        .replace(/\r\n/g, '\n')                // normalise line endings
        .replace(/·\s*·\s*·/g, '')              // strip · · · scene markers
        .replace(/^[·•\-–—*_~#\s]+$/gm, '')    // strip decorative-only lines
        .replace(/\.\.\./g, ',')               // ellipsis → comma (gentle pause, not silence)
        .replace(/\u2026/g, ',')                // unicode ellipsis → comma
        .replace(/\n+/g, ' ')                   // ALL newlines → single space
        .replace(/\s{2,}/g, ' ')               // collapse multiple spaces
        .trim();
}

// ── Text Chunker  ─────────────────────────────────────────────────────────────
function splitTextIntoChunks(rawText: string, maxChars: number = CHUNK_CHARS): string[] {
    const text = normaliseForTTS(rawText);
    if (!text) return [];
    if (text.length <= maxChars) return [text];

    // Split on sentence boundaries — keeps punctuation with the sentence
    const sentenceMatches = text.match(/[^.!?]+[.!?]+[\s]*/g) || [];
    const matchedLen = sentenceMatches.reduce((n, s) => n + s.length, 0);
    const remainder = text.slice(matchedLen).trim();
    const sentences = remainder
        ? [...sentenceMatches, remainder]
        : sentenceMatches.length ? sentenceMatches : [text];

    const chunks: string[] = [];
    let current = '';
    for (const s of sentences) {
        if (current.length + s.length <= maxChars) {
            current += s;
        } else {
            if (current) chunks.push(current.trim());
            if (s.length > maxChars) {
                // Single sentence exceeds limit — push anyway, never drop text
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

// ── API HANDLER ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const ts = Date.now();
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const planCheck = await checkPlanGating(session.user.id!, 'generate_audio');
        if (!planCheck.allowed) return NextResponse.json({ error: planCheck.message }, { status: 403 });

        const { storyId } = await req.json();
        const [user, story] = await Promise.all([
            prisma.user.findUnique({ where: { id: session.user.id } }),
            prisma.story.findUnique({ where: { id: storyId } })
        ]);
        if (!user || !story || story.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const hasActiveBeta = await prisma.userBetaCode.findFirst({ where: { userId: user.id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, include: { betaCode: { select: { type: true } } } });
        const effectivePlan = hasActiveBeta ? betaTypeToPlan((hasActiveBeta as any).betaCode?.type || 'amplifier_2_months') : (user.plan || 'free').toLowerCase();
        
        // ── Assets Fetch (induction / close — admin-uploaded MP3s) ─────────
        // Always try to fetch the admin intro; if it doesn't exist that's fine.
        const [induction, close] = await Promise.all([
            fetchAdminAudio('induction'),
            fetchAdminAudio('guide_close'),
        ]);
        console.log(`[assemble] Admin audio — induction: ${induction ? `${induction.length} bytes` : 'not set'}, close: ${close ? `${close.length} bytes` : 'not set'}`);

        // ── Voice Parts ───────────────────────────────────────────────────────
        const voiceModelId = user.voice_model_id || '';
        const elevenLabsVoiceId = user.elevenlabs_voice_id || '';

        // Only use ElevenLabs if we have a confirmed ElevenLabs voice ID.
        // voice_model_id could be a Fish Audio ID — do NOT send it to ElevenLabs.
        const useElevenLabs = !!process.env.ELEVEN_LABS_API && !!elevenLabsVoiceId;
        const useFishAudio = !!process.env.FISH_AUDIO_API && !!voiceModelId;

        console.log(`[assemble] Voice IDs — elevenlabs: "${elevenLabsVoiceId}", voice_model_id: "${voiceModelId}"`);
        console.log(`[assemble] TTS provider: ${useElevenLabs ? 'ElevenLabs (cloned voice)' : useFishAudio ? 'Fish Audio' : 'Free TTS'}`);

        const rawText = (story as any).story_text_approved || (story as any).story_text_draft || '';

        // ── Determine if user has a cloned voice ──────────────────────────────
        // When the user has their own cloned voice, we ONLY use that voice.
        // No fallback to a different voice provider — that would mix voices
        // and produce inconsistent-sounding narration.
        const hasClonedVoice = useElevenLabs || useFishAudio;

        // ── TTS helper — uses user's own cloned voice exclusively ─────────────
        async function generateTTSForText(text: string, label: string): Promise<Buffer[]> {
            const chunks = splitTextIntoChunks(text);
            const totalInputChars = normaliseForTTS(text).length;
            const totalChunkChars = chunks.reduce((n, c) => n + c.length, 0);
            console.log(`[assemble] ${label}: ${totalInputChars} chars → ${chunks.length} chunks (${totalChunkChars} chars total)`);
            if (totalChunkChars < totalInputChars * 0.95) {
                console.warn(`[assemble] ⚠ ${label}: chunker may have dropped text! input=${totalInputChars} vs chunks=${totalChunkChars}`);
            }

            const buffers: Buffer[] = [];
            for (let i = 0; i < chunks.length; i++) {
                let buf: Buffer | null = null;

                if (hasClonedVoice) {
                    // ── User has a cloned voice — use ONLY that voice ──────────
                    // Never fall back to a different provider; that would mix
                    // the user's voice with a generic TTS voice.
                    if (useElevenLabs) {
                        buf = await generateElevenLabsTTS(elevenLabsVoiceId, chunks[i]);
                    } else if (useFishAudio) {
                        buf = await generateFishAudioTTS(voiceModelId, chunks[i]);
                    }
                } else {
                    // ── No cloned voice — fall through providers ───────────────
                    buf = await generateFreeTTS(chunks[i]);
                }

                if (buf) {
                    buffers.push(buf);
                    console.log(`[assemble] ✓ ${label} chunk ${i + 1}/${chunks.length} — ${chunks[i].length} chars → ${buf.length} bytes`);
                } else {
                    console.error(`[assemble] ✗ ${label} chunk ${i + 1}/${chunks.length} FAILED — aborting`);
                    throw new Error(`Voice generation failed on ${label} chunk ${i + 1}/${chunks.length}. Please try again.`);
                }
            }
            return buffers;
        }

        // ── Generate TTS for each segment separately ──────────────────────────
        // Sequence: Intro → pause → Opening Affirmation → pause → Story → pause → Closing Affirmation

        // Generate a TTS-based pause that uses the same encoder as the voice
        // so the browser decoder never encounters mismatched MP3 frames.
        _pauseBufferCache = null; // reset per-request
        const pauseBuffer = await generatePauseBuffer(
            elevenLabsVoiceId, voiceModelId, useElevenLabs, useFishAudio
        );

        // Split the generated text into intro (induction) and story body
        const { intro: introText, storyBody: storyBodyText } = splitIntroFromStory(rawText);
        console.log(`[assemble] Intro text: ${introText.length} chars | Story body: ${storyBodyText.length} chars`);

        // 1. Intro TTS (from generated text induction — used when no admin MP3)
        let introBuffers: Buffer[] = [];
        if (introText) {
            // If admin induction MP3 exists, use that instead of TTS-ing the text intro
            if (induction) {
                console.log(`[assemble] Using admin induction MP3 for Intro (skipping TTS of intro text)`);
                introBuffers = [induction];
            } else {
                console.log(`[assemble] Generating TTS for Intro (${introText.length} chars)`);
                introBuffers = await generateTTSForText(introText, 'intro');
            }
        } else if (induction) {
            // No intro text (explorer tier) but admin MP3 exists — use it
            introBuffers = [induction];
        }

        // 2. Main Story Body TTS (without intro — it was separated above)
        console.log(`[assemble] Generating TTS for story body (${storyBodyText.length} chars, ${storyBodyText.split(/\s+/).filter(Boolean).length} words)`);
        const storyBuffers = await generateTTSForText(storyBodyText, 'story');

        if (storyBuffers.length === 0) {
            return NextResponse.json({ error: 'Failed to generate any audio' }, { status: 500 });
        }

        // ── Final Assembly: Intro → pause → Story
        const parts: Buffer[] = [];
        const segmentLog: string[] = [];

        // Intro
        if (introBuffers.length > 0) {
            parts.push(...introBuffers);
            segmentLog.push('Intro');
            parts.push(pauseBuffer);
            segmentLog.push('pause');
            console.log(`[assemble] Final Parts check: Intro is ${introBuffers.length} buffers, ~${introBuffers.reduce((n, b) => n + b.byteLength, 0)} bytes`);
        }

        // Story Body
        parts.push(...storyBuffers);
        segmentLog.push('Story');
        console.log(`[assemble] Final Parts check: Story is ${storyBuffers.length} buffers, ~${storyBuffers.reduce((n, b) => n + b.byteLength, 0)} bytes`);

        // Guide Close (admin MP3)
        if (close) {
            parts.push(pauseBuffer);
            segmentLog.push('pause');
            parts.push(close);
            segmentLog.push('Guide Close');
        }

        console.log(`[assemble] Segment order: ${segmentLog.join(' → ')}`);

        // ── FFmpeg Assembly ──────────────────────────────────────────────────
        // Instead of raw Buffer concatenation (which can lead to mismatched
        // headers or VBR durations), we use system FFmpeg to remux everything
        // into a clean, single-stream MP3 at 128kbps constant bitrate.
        let finalAudio: Buffer;
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'assemble-'));
        try {
            const inputFiles: string[] = [];
            for (let i = 0; i < parts.length; i++) {
                const f = path.join(tempDir, `part_${i}.mp3`);
                await fs.writeFile(f, parts[i]);
                inputFiles.push(f);
            }

            const outputFile = path.join(tempDir, 'final.mp3');
            // Using the 'concat' demuxer for maximum reliability
            const listFile = path.join(tempDir, 'list.txt');
            const listContent = inputFiles.map(f => `file '${f}'`).join('\n');
            await fs.writeFile(listFile, listContent);

            // -c:a libmp3lame: ensure output is standard MP3
            // -b:a 128k: constant bitrate helps with duration calculation
            // -ar 44100: standard sample rate
            // -write_xing 0: EXPLICITLY disable Xing/VBR headers so browsers see true duration
            await execAsync(
                `ffmpeg -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -b:a 128k -ar 44100 -write_xing 0 -y "${outputFile}"`
            );
            
            finalAudio = await fs.readFile(outputFile);
            console.log(`[assemble] FFmpeg assembly complete — ${finalAudio.byteLength} bytes`);
        } catch (e: any) {
            console.error('[assemble] FFmpeg failure, falling back to raw Buffer concatenation:', e.message);
            finalAudio = Buffer.concat(parts);
        } finally {
            // Cleanup temp files
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }

        // Estimate duration from MP3 byte size (128 kbps = 16000 bytes/sec)
        const duration = Math.round(finalAudio.byteLength / 16000);

        // Upload
        const finalKey = `user_${user.id}/story_${story.id}_final_${ts}.mp3`;
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: finalKey, Body: finalAudio, ContentType: 'audio/mpeg' }));

        const finalUrl = `/api/user/audio/stream?key=${encodeURIComponent(finalKey)}`;
        await prisma.story.update({
            where: { id: story.id },
            data: {
                status: 'audio_ready',
                audio_url: finalUrl,
                audio_r2_key: finalKey,
                audio_duration_secs: duration,
                // Clear any legacy voice_only_r2_key so the download page
                // always uses audio_url (which contains the full assembly
                // including intro, affirmations, story and closing).
                voice_only_r2_key: null,
            },
        });

        console.log(`[assemble] ✅ Done — ${finalAudio.byteLength} bytes, ~${duration}s`);
        return NextResponse.json({ success: true, storyId, audioUrl: finalUrl, durationSecs: duration });

    } catch (e: any) {
        console.error('[assemble] Fatal:', e.message);
        return NextResponse.json({ error: e.message || 'Error occurred' }, { status: 500 });
    }
}   
