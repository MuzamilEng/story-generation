import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanGating } from '@/lib/plan-gating';
import { betaTypeToPlan } from '@/lib/beta-utils';
import { splitIntroFromStory } from '@/lib/story-utils';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

// ── Chunk target size ────────────────────────────────────────────────────────
// 1400 chars = fewer API calls while still keeping chunks short enough
// to preserve stable prosody and timbre.
// We never split mid-sentence regardless of this limit.
// 1200 chars ≈ 3–5 sentences. Slightly smaller chunks give S2-Pro more room
// to apply emotion cues per segment while keeping prosody stable.
const CHUNK_CHARS = 1200;

// Bounded parallelism — 3 workers significantly reduce total TTS time for
// long-form content without overwhelming provider rate limits.
// The buffers array preserves ordering regardless of completion order.
const MAX_TTS_CONCURRENCY = 3;

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

async function fetchAdminAudio(segmentKey: 'induction' | 'guide_close'): Promise<Buffer | null> {
    try {
        const asset = await (prisma as any).systemAudio.findUnique({ where: { key: segmentKey } });
        if (!asset?.r2_key) return null;
        const raw = await fetchR2Buffer(asset.r2_key);
        if (!raw) return null;
        console.log(`[assemble] Fetched admin audio '${segmentKey}' (${raw.length} bytes)`);
        return raw;
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
        } catch { }
    }
    return null;
}

// ── Fish Audio TTS ────────────────────────────────────────────────────────────
//
// Quality settings tuned for audiobook-grade narration using S2-Pro model.
//
// Key differences vs previous implementation:
//   - model: s2-pro (latest, best naturalness and emotion control)
//   - temperature: 0.7 (controls expressiveness — higher = more varied)
//   - top_p: 0.8 (nucleus sampling for natural prosody variation)
//   - chunk_length: 250 (optimal for narration stability per Fish docs)
//   - mp3_bitrate: 192 (maximum quality for narration source material)
//   - repetition_penalty: 1.2 (prevents audio looping / stuck patterns)
//   - condition_on_previous_chunks: true (maintains voice consistency)
//   - prosody speed: 0.9 (natural narration pacing)
//   - normalize_loudness: true (consistent volume across chunks)
//
async function generateFishAudioTTS(voiceId: string, text: string): Promise<Buffer | null> {
    const key = process.env.FISH_AUDIO_API;
    if (!key || !voiceId) return null;

    try {
        const res = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
                model: 's2-pro',
            },
            body: JSON.stringify({
                text,
                reference_id: voiceId.startsWith('mock_')
                    ? '7ef4660e505a41d9966d58546de54201'
                    : voiceId,

                // MP3 at 192kbps for high-quality narration source.
                // The mixing server will re-encode to a smaller bitrate.
                format: 'mp3',
                mp3_bitrate: 192,

                // Text normalisation — handles numbers, dates, URLs.
                normalize: true,

                // 'normal' = best quality. 'balanced' trades quality for speed.
                latency: 'normal',

                // Expressiveness controls (S2-Pro).
                // 0.7 = sweet spot for narration: varied enough to sound human,
                // stable enough not to produce artefacts.
                temperature: 0.7,
                top_p: 0.8,

                // Chunk processing — 250 chars hits the stability sweet-spot
                // per Fish Audio docs (range: 100–300).
                chunk_length: 250,
                min_chunk_length: 50,

                // Prevents the model from looping on repeated audio patterns.
                repetition_penalty: 1.2,
                max_new_tokens: 2048,

                // Uses the previous chunk's audio as context for the next,
                // keeping voice timbre and emotion consistent across a long
                // narration.
                condition_on_previous_chunks: true,

                // Prosody — 0.9 is a natural storytelling pace. 0.88 was
                // slightly slow and could drag on long-form content.
                // normalize_loudness ensures consistent volume across chunks.
                prosody: {
                    speed: 0.9,
                    volume: 0,
                    normalize_loudness: true,
                },
            }),
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            console.error(`[TTS] Fish Audio ${res.status}: ${errBody}`);
            return null;
        }

        return Buffer.from(await res.arrayBuffer());
    } catch (e) {
        console.error('[TTS] generateFishAudioTTS threw:', e);
        return null;
    }
}

// ── Narration text preparation ────────────────────────────────────────────────
/**
 * Prepares raw story text for high-quality narration TTS on Fish Audio S2-Pro.
 *
 * WHY THIS MATTERS:
 * Fish Audio S2-Pro uses punctuation as prosody signals AND supports
 * natural-language [bracket] emotion cues placed at the start of sentences.
 * A comma = short breath. A period = full breath. An ellipsis = dramatic
 * pause. Emotion cues like [soft] or [calm] control warmth and expression.
 *
 * RULES:
 * - Scene breaks  → "[pause] ..." so S2-Pro holds a dramatic pause
 * - Paragraph gap → ". " so S2-Pro takes a full breath between sections
 * - Decorative dividers → stripped cleanly, no ghost padding
 * - Commas/periods get correct spacing so the model breathes on them
 * - Dialogue em-dashes preserved — they signal a speaker change pause
 * - Emotion cues injected at natural points for warm, expressive narration
 */
function prepareNarrationText(text: string): string {
    let prepared = text
        .replace(/\r\n/g, '\n')

        // Scene breaks → pause cue + ellipsis for dramatic pause
        .replace(/·\s*·\s*·/g, '[pause] ...')
        .replace(/\*\s*\*\s*\*/g, '[pause] ...')
        .replace(/[-–—]{3,}/g, '[pause] ...')

        // Decorative divider lines → just remove (no ghost pauses)
        .replace(/^[·•\-–—*_~#=\s]{3,}$/gm, '')

        // Ellipsis normalisation
        .replace(/\.{4,}/g, '...')
        .replace(/\u2026/g, '...')

        // Paragraph breaks (2+ newlines) → period + space so S2-Pro
        // knows to take a full breath between sections
        .replace(/\n{2,}/g, '. ')

        // Single newlines within a paragraph → space
        .replace(/\n/g, ' ')

        // Ensure comma always has a space after it (breathing cue)
        .replace(/,([^\s\d])/g, ', $1')

        // Ensure period has a space after it unless followed by a digit
        // (avoid breaking "3.14" or "e.g.")
        .replace(/([.!?])([A-Z])/g, '$1 $2')

        // Collapse any double periods we may have introduced
        .replace(/\.\s*\./g, '.')

        // Final whitespace cleanup
        .replace(/\s{2,}/g, ' ')
        .trim();

    // ── Inject S2-Pro emotion cues for storytelling narration ──────────────
    // S2-Pro uses [bracket] syntax with natural language descriptions.
    // We add a [soft, warm narration] cue at the very start so the model
    // adopts a storytelling tone from the first chunk.
    // Additional cues are added at scene breaks for emotional variation.
    prepared = '[soft, warm narration] ' + prepared;

    // Enhance scene-break pauses with a gentle emotional reset
    prepared = prepared.replace(
        /\[pause\] \.\.\./g,
        '[pause] ... [gentle, reflective] '
    );

    return prepared;
}

// ── Sentence-aware chunker ────────────────────────────────────────────────────
/**
 * Splits prepared narration text into chunks.
 *
 * THE CORE QUALITY RULE: never split mid-sentence.
 *
 * The old character-count chunker could split:
 *   "She walked to the door, her heart [CHUNK BREAK] pounding as she turned
 *    the handle."
 *
 * Fish Audio S2-Pro starts each chunk with a fresh prosody prediction, so the
 * second chunk "pounding as she turned the handle." sounds flat and robotic
 * because the model has no emotional context from the first half.
 *
 * This chunker accumulates complete sentences until it would exceed maxChars,
 * then flushes. A single oversized sentence is kept whole — a seam inside a
 * sentence is always worse than a slightly long chunk.
 *
 * EMOTION CONTINUITY:
 * For chunks after the first, we prepend a [soft narration] cue so S2-Pro
 * maintains the storytelling tone even though it starts a fresh prosody
 * prediction per chunk. This prevents the "goes flat after chunk 1" problem.
 */
function splitIntoNarrationChunks(preparedText: string, maxChars: number = CHUNK_CHARS): string[] {
    if (!preparedText) return [];
    if (preparedText.length <= maxChars) return [preparedText];

    // Match complete sentences: text ending in . ! ? or ...
    const sentenceRegex = /[^.!?]+(?:[.!?]+(?:\s|$)|\.\.\.\s*)+/g;
    const sentences: string[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(preparedText)) !== null) {
        sentences.push(match[0]);
        lastIndex = match.index + match[0].length;
    }

    // Any tail that didn't end with punctuation
    const tail = preparedText.slice(lastIndex).trim();
    if (tail) sentences.push(tail);

    // If no sentences found, fall back to word-boundary split
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

    // Greedy pack: accumulate sentences until adding the next would exceed limit
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
        const s = sentence.trim();
        const candidate = current ? current + ' ' + s : s;

        if (candidate.length <= maxChars) {
            current = candidate;
        } else {
            if (current) chunks.push(current.trim());
            // Keep oversized single sentence whole — mid-sentence split is worse
            current = s;
        }
    }

    if (current.trim()) chunks.push(current.trim());
    return ensureEmotionContinuity(chunks);
}

/**
 * Ensures each chunk after the first carries a S2-Pro emotion cue so the
 * model doesn't revert to a neutral/flat tone between chunks.
 * Only adds a cue if the chunk doesn't already start with a [bracket] tag.
 */
function ensureEmotionContinuity(chunks: string[]): string[] {
    return chunks.map((chunk, i) => {
        if (i === 0) return chunk; // First chunk already has [soft, warm narration]
        if (chunk.startsWith('[')) return chunk; // Already has an emotion cue
        return '[soft narration] ' + chunk;
    });
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

        // ── Fetch user + story ─────────────────────────────────────────────────
        const [userRaw, story] = await Promise.all([
            prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    id: true,
                    name: true,
                    plan: true,
                    voice_model_id: true,
                    voice_sample_url: true,
                    soundscape: true,
                    binaural_enabled: true,
                },
            }),
            prisma.story.findUnique({ where: { id: storyId } }),
        ]);

        const user = userRaw as NonNullable<typeof userRaw>;
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
            : ((user as any).plan || 'free').toLowerCase();

        // ── Determine TTS provider ─────────────────────────────────────────────
        const fishAudioVoiceId = (user.voice_model_id ?? '') as string;

        console.log(`[assemble] 🎤 Voice ID: "${fishAudioVoiceId || 'EMPTY'}"`);

        let selectedVoiceId: string | null = null;
        let ttsProvider: 'fishaudio' | 'free' = 'free';

        if (process.env.FISH_AUDIO_API && fishAudioVoiceId) {
            selectedVoiceId = fishAudioVoiceId;
            ttsProvider = 'fishaudio';
            console.log(`[assemble] ✅ Using cloned voice — ${selectedVoiceId}`);
        }

        const userHasClonedVoice = ttsProvider !== 'free' && !!selectedVoiceId;

        if (!userHasClonedVoice) {
            console.warn(`[assemble] ⚠️ No cloned voice for user ${user.id}. Falling back to free TTS.`);
        }

        // ── Fetch admin audio (night stories only) ─────────────────────────────
        const storyType = (story as any).story_type || 'night';
        let induction: Buffer | null = null;
        let close: Buffer | null = null;

        if (storyType === 'night' && !userHasClonedVoice) {
            induction = await fetchAdminAudio('induction');
            close = await fetchAdminAudio('guide_close');
        }

        console.log(`[assemble] Admin induction: ${induction ? `${induction.length} bytes` : 'not available'}`);

        // ── Core TTS generator ────────────────────────────────────────────────
        async function generateTTSForText(text: string, label: string): Promise<Buffer[]> {
            const prepared = prepareNarrationText(text);
            const chunks = splitIntoNarrationChunks(prepared);

            console.log(`[assemble] ${label}: ${prepared.length} chars → ${chunks.length} sentence-aware chunks`);

            const buffers: Buffer[] = new Array(chunks.length);
            const workerCount = Math.min(MAX_TTS_CONCURRENCY, chunks.length);
            let nextIndex = 0;

            async function worker(workerId: number): Promise<void> {
                while (true) {
                    const idx = nextIndex;
                    nextIndex += 1;
                    if (idx >= chunks.length) return;

                    const chunk = chunks[idx];
                    let buf: Buffer | null = null;

                    console.log(
                        `[assemble] ${label} chunk ${idx + 1}/${chunks.length} ` +
                        `(worker ${workerId}, ${chunk.length} chars): "${chunk.substring(0, 60)}..."`
                    );

                    if (ttsProvider === 'fishaudio') {
                        buf = await generateFishAudioTTS(selectedVoiceId!, chunk);
                        if (!buf) {
                            throw new Error(
                                `Voice generation failed on ${label} chunk ${idx + 1}/${chunks.length}. Please try again.`
                            );
                        }
                    } else {
                        buf = await generateFreeTTS(chunk);
                        if (!buf) {
                            throw new Error(
                                `Free TTS failed on ${label} chunk ${idx + 1}/${chunks.length}. Please try again.`
                            );
                        }
                    }

                    buffers[idx] = buf;
                    console.log(
                        `[assemble] ✓ chunk ${idx + 1}/${chunks.length} — ${chunk.length} chars → ${buf.length} bytes`
                    );
                }
            }

            await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i + 1)));
            return buffers;
        }

        // ── Text segmentation ─────────────────────────────────────────────────
        // Generate audio for the FULL story text — no truncation.
        // The sentence-aware chunker + bounded concurrency ensures stable
        // quality and manageable API load even for long-form narration.
        const rawText = (story as any).story_text_approved || (story as any).story_text_draft || '';
        const fullText = String(rawText);
        const { intro: introText, storyBody: storyBodyText } = splitIntroFromStory(fullText);

        console.log(
            `[assemble] Full text: ${fullText.length} chars | Intro: ${introText.length} chars | Body: ${storyBodyText.length} chars`
        );

        // ── 1. Intro TTS ───────────────────────────────────────────────────────
        let introBuffers: Buffer[] = [];
        if (introText && introText.trim().length > 0) {
            if (!induction) {
                introBuffers = await generateTTSForText(introText, 'intro');
                console.log(`[assemble] ✅ Intro TTS — ${introBuffers.length} chunks`);
            } else {
                console.log(`[assemble] Admin induction exists — skipping intro TTS`);
            }
        }

        // ── 2. Story body TTS ─────────────────────────────────────────────────
        const storyBuffers = await generateTTSForText(storyBodyText, 'story');

        if (storyBuffers.length === 0) {
            return NextResponse.json({ error: 'Failed to generate any audio' }, { status: 500 });
        }

        // ── Assembly ──────────────────────────────────────────────────────────
        const parts: Buffer[] = [];
        const segmentLog: string[] = [];

        if (induction) {
            parts.push(induction);
            segmentLog.push(`Admin Intro (${Math.round(induction.length / 1024)}KB)`);
        } else if (introBuffers.length > 0) {
            parts.push(...introBuffers);
            segmentLog.push(`TTS Intro (${introBuffers.length} chunks)`);
        }

        parts.push(...storyBuffers);
        segmentLog.push(userHasClonedVoice ? 'User Cloned Voice' : 'Free TTS');

        console.log(`[assemble] 🎬 ${segmentLog.join(' → ')}`);

        const finalAudio = Buffer.concat(parts);
        console.log(`[assemble] ✅ Assembled — ${finalAudio.byteLength} bytes`);

        // Approx for narration MP3 at ~128kbps.
        const bytesPerSecond = 16000;
        const duration = Math.round(finalAudio.byteLength / bytesPerSecond);

        // ── Upload to R2 ──────────────────────────────────────────────────────
        let finalKey = `user_${user.id}/story_${story.id}_final_${ts}.mp3`;
        let voiceOnlyKey = finalKey;

        await s3.send(
            new PutObjectCommand({ Bucket: BUCKET, Key: finalKey, Body: finalAudio, ContentType: 'audio/mpeg' }),
        );

        console.log(`[assemble] ✅ Uploaded — ${finalKey}`);

        let finalUrl = `/api/user/audio/stream?key=${encodeURIComponent(finalKey)}`;

        // ── Professional narration enhancement (Fish cloned voice only) ────
        if (userHasClonedVoice) {
            try {
                const MIXING_SERVER = process.env.MIXING_SERVER_URL || 'http://localhost:4000';
                const enhanceRes = await fetch(`${MIXING_SERVER}/enhance-voice`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-secret': process.env.MIXING_API_SECRET || '',
                    },
                    body: JSON.stringify({
                        storyId: story.id,
                        voiceKey: finalKey,
                    }),
                });

                if (enhanceRes.ok) {
                    const enhanceData = await enhanceRes.json();
                    if (enhanceData?.enhanced_key) {
                        finalKey = enhanceData.enhanced_key;
                        voiceOnlyKey = enhanceData.enhanced_key;
                        finalUrl = enhanceData.audio_url || `/api/user/audio/stream?key=${encodeURIComponent(finalKey)}`;
                        console.log(`[assemble] ✅ Voice enhanced — ${finalKey}`);
                    }
                } else {
                    const errBody = await enhanceRes.text().catch(() => '');
                    console.error(`[assemble] ⚠️ Enhance server ${enhanceRes.status}: ${errBody}`);
                }
            } catch (enhanceErr: any) {
                console.error(`[assemble] ⚠️ Enhancement failed (non-fatal):`, enhanceErr.message);
            }
        }

        await prisma.story.update({
            where: { id: story.id },
            data: {
                status: 'audio_ready',
                audio_url: finalUrl,
                audio_r2_key: finalKey,
                audio_duration_secs: duration,
                voice_only_r2_key: voiceOnlyKey,
            },
        });

        // ── Auto-mix ──────────────────────────────────────────────────────────
        const userSoundscape = user.soundscape;
        const userBinaural = !!(user as any).binaural_enabled;
        const hasSoundscapeSelected = userSoundscape && userSoundscape !== 'none';
        let mixedWithSoundscape = false;

        if (hasSoundscapeSelected || userBinaural) {
            try {
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

                const MIXING_SERVER = process.env.MIXING_SERVER_URL || 'http://localhost:4000';
                const mixRes = await fetch(`${MIXING_SERVER}/mix`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-secret': process.env.MIXING_API_SECRET || '',
                    },
                    body: JSON.stringify({
                        storyId: story.id,
                        soundscapeId: soundscapeAsset?.id || null,
                        backgroundVolume: 0.15,
                        binauralEnabled: userBinaural,
                    }),
                });

                if (mixRes.ok) {
                    const mixData = await mixRes.json();
                    finalUrl = mixData.audio_url || finalUrl;
                    mixedWithSoundscape = true;
                    console.log(`[assemble] ✅ Mix complete — ${mixData.combined_audio_key}`);
                } else {
                    console.error(`[assemble] ⚠️ Mix server ${mixRes.status}`);
                }
            } catch (mixErr: any) {
                console.error(`[assemble] ⚠️ Mix failed (non-fatal):`, mixErr.message);
            }
        }

        return NextResponse.json({
            success: true,
            storyId,
            audioUrl: finalUrl,
            durationSecs: duration,
            composition: {
                hasAdminIntro: !!induction,
                hasTTSIntro: introBuffers.length > 0,
                hasUserVoice: userHasClonedVoice,
                introSource: induction ? 'admin' : (introBuffers.length > 0 ? 'tts' : 'none'),
                storySource: userHasClonedVoice ? 'cloned' : 'tts',
                mixedWithSoundscape,
            }
        });

    } catch (e: any) {
        console.error('[assemble] Fatal:', e.message);
        return NextResponse.json({ error: e.message || 'Error occurred' }, { status: 500 });
    }
}