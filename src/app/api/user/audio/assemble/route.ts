import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanGating } from '@/lib/plan-gating';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import ffmpegStatic from 'ffmpeg-static';

// ── R2 client ────────────────────────────────────────────────────────────────
const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const BUCKET = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';

// ── Plan capability definitions ──────────────────────────────────────────────
// Centralised — all plan feature gates derive from these sets.
const VOICE_CLONE_PLANS = new Set(['activator', 'manifester', 'amplifier']);
const ADMIN_AUDIO_PLANS = new Set(['activator', 'manifester', 'amplifier']); // induction + guide-close segments
const SOUNDSCAPE_PLANS = new Set(['manifester', 'amplifier']);
const BINAURAL_PLANS = new Set(['amplifier']);

// Expected story word-count ranges by plan (mirrors story-utils.ts targets)
const PLAN_WORD_TARGETS: Record<string, string> = {
    free: '700–800 words  (~6 min)',
    activator: '1,100–1,350 words  (~10 min)',
    manifester: '1,600–2,000 words  (~14 min)',
    amplifier: '2,400–2,900 words  (~20 min)',
};

// Story length option → approximate target character count for validation
const LENGTH_OPTION_TARGETS: Record<string, { words: string; minChars: number }> = {
    short:  { words: '~700 words  (~6 min)',  minChars: 3_500 },
    medium: { words: '~1,200 words (~10 min)', minChars: 6_000 },
    long:   { words: '~1,700 words (~14 min)', minChars: 8_500 },
    epic:   { words: '~2,600 words (~20 min)', minChars: 13_000 },
};

/**
 * Professional narration voice settings for ElevenLabs.
 * Tuned for calm, authoritative story narration:
 *  - stability 0.75  → very steady, no pitch wandering (essential for long-form)
 *  - similarity_boost 0.65 → preserve clone timbre without over-boosting artefacts
 *  - style 0         → neutral delivery, no stylistic exaggeration
 *  - use_speaker_boost true → improves clarity and presence of cloned voices
 */
const NARRATION_VOICE_SETTINGS = {
    stability:         0.75,
    similarity_boost:  0.65,
    style:             0,
    use_speaker_boost: true,
} as const;

// ── R2 helper ─────────────────────────────────────────────────────────────────
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
 * Fetch admin-uploaded system audio from the DB + R2.
 */
async function fetchAdminAudio(segmentKey: 'induction' | 'guide_close'): Promise<Buffer | null> {
    try {
        const asset = await (prisma as any).systemAudio.findUnique({
            where: { key: segmentKey },
        });
        if (!asset?.r2_key) return null;
        return await fetchR2Buffer(asset.r2_key);
    } catch (e) {
        console.error(`[assemble] fetchAdminAudio(${segmentKey}) error:`, e);
        return null;
    }
}

/**
 * Splits text into chunks of maximum length, preferably at paragraph boundaries.
 * ElevenLabs has a 5000 character limit per request for many models.
 */
function splitTextIntoChunks(text: string, maxChars: number = 4800): string[] {
    if (!text) return [];
    if (text.length <= maxChars) return [text];

    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
        // If adding this paragraph would exceed the limit
        if ((currentChunk.length + paragraph.length + 2) > maxChars) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
            }

            // If a single paragraph is still too long, split it by sentences
            if (paragraph.length > maxChars) {
                const sentences = paragraph.match(/[^.!?]+[.!?]+|\s+$/g) || [paragraph];
                for (const sentence of sentences) {
                    if ((currentChunk.length + sentence.length) > maxChars) {
                        if (currentChunk) chunks.push(currentChunk.trim());
                        currentChunk = sentence;
                    } else {
                        currentChunk += (currentChunk ? " " : "") + sentence;
                    }
                }
            } else {
                currentChunk = paragraph;
            }
        } else {
            currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

/**
 * Generates TTS for the entire story, handling chunking for long texts.
 *
 * Uses professional narration voice settings optimised for:
 *  - Calm, steady delivery over long-form manifestation stories
 *  - Faithful reproduction of the user's cloned voice
 *  - Clear articulation without stylistic exaggeration
 *
 * @param voiceId         ElevenLabs voice ID (cloned or default fallback)
 * @param apiKey          ElevenLabs API key
 * @param fullNarration   Complete narration text already assembled by the caller
 * @param isClonedVoice   Whether this is a user cloned voice (affects model choice)
 * @param storyLengthOption Optional story_length_option from the DB for logging/validation
 */
async function generateUserNarration(
    voiceId: string,
    apiKey: string,
    openingAffirmations: string[],
    storyText: string,
    closingAffirmations: string[],
    isClonedVoice = false,
    storyLengthOption?: string | null,
): Promise<{ chunks: Buffer[]; historyId: string | null }> {
    const parts: string[] = [];
    if (openingAffirmations.length > 0) parts.push(openingAffirmations.join('\n\n'));
    parts.push(storyText);
    if (closingAffirmations.length > 0) parts.push(closingAffirmations.join('\n\n'));

    // Join sections with double newlines so ElevenLabs inserts natural pauses between
    const fullText = parts.join('\n\n');

    // Select model:
    //  - Cloned voices → eleven_turbo_v2_5 (better prosody for IVC, lower latency per chunk)
    //  - Fallback default voice → eleven_multilingual_v2 (highest quality for named voices)
    const modelId = isClonedVoice ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2';

    // Validate story length against expected range
    const lenTarget = storyLengthOption ? LENGTH_OPTION_TARGETS[storyLengthOption] : null;
    if (lenTarget) {
        const actualChars = fullText.length;
        const pct = Math.round((actualChars / lenTarget.minChars) * 100);
        console.log(
            `[generateUserNarration] story_length_option="${storyLengthOption}" ` +
            `target=${lenTarget.words}, actual=${actualChars} chars (${pct}% of min target)`,
        );
        if (actualChars < lenTarget.minChars * 0.7) {
            console.warn(
                `[generateUserNarration] ⚠️  Story text is significantly shorter than expected for ` +
                `"${storyLengthOption}" length. Consider regenerating the story.`,
            );
        }
    }

    // ElevenLabs character limit handling (4800 chars per request to stay safely under 5000)
    const chunks = splitTextIntoChunks(fullText, 4800);
    console.log(
        `[generateUserNarration] model=${modelId} isCloned=${isClonedVoice} ` +
        `totalChars=${fullText.length} chunks=${chunks.length}`,
    );

    const buffers: Buffer[] = [];
    let lastHistoryId: string | null = null;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[generateUserNarration] Chunk ${i + 1}/${chunks.length} → ${chunk.length} chars`);

        let res;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                res = await fetch(
                    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
                        body: JSON.stringify({
                            text: chunk,
                            model_id: modelId,
                            voice_settings: NARRATION_VOICE_SETTINGS,
                        }),
                    },
                );

                if (res.ok) break;

                const errText = await res.text();
                if (res.status >= 500 || res.status === 429) {
                    throw new Error(`Retriable error: ${res.status} - ${errText}`);
                } else {
                    throw new Error(`Fatal error: ${res.status} - ${errText}`);
                }
            } catch (e: any) {
                attempts++;
                console.warn(`[generateUserNarration] Attempt ${attempts} failed for chunk ${i + 1}:`, e.message);
                if (attempts === maxAttempts || e.message.includes('Fatal error')) throw e;
                // Exponential back-off: 2s, 4s
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
            }
        }

        if (!res || !res.ok) {
            throw new Error(`ElevenLabs TTS failed for chunk ${i + 1} after ${maxAttempts} attempts.`);
        }

        const chunkBuffer = Buffer.from(await res.arrayBuffer());
        buffers.push(chunkBuffer);

        // Track the last request-id provided by ElevenLabs for history linkage
        lastHistoryId = res.headers.get('request-id') || lastHistoryId;
    }

    return { chunks: buffers, historyId: lastHistoryId };
}

/**
 * FFmpeg helper to assemble segments AND mix background tracks.
 *
 * Returns:
 *   voiceOnly – induction + narration + outro, normalised, NO background.
 *   mixed     – voiceOnly + soundscape/binaural (null when no BG requested).
 *
 * Both are 192k CBR MP3 at 44.1 kHz for perfect browser seeking.
 */
async function assembleAndMixWithFFmpeg(
    induction: Buffer | null,
    narrationChunks: Buffer[],
    guideClose: Buffer | null,
    soundscapeBuffer: Buffer | null,
    binauralBuffer: Buffer | null,
): Promise<{ voiceOnly: Buffer; mixed: Buffer | null; durationSecs: number }> {
    const workDir = tmpdir();
    const ts = Date.now() + Math.random().toString(36).substring(7);
    const paths = {
        induction: join(workDir, `ind_${ts}.mp3`),
        guideClose: join(workDir, `close_${ts}.mp3`),
        soundscape: join(workDir, `bg_${ts}.mp3`),
        binaural: join(workDir, `bin_${ts}.mp3`),
        voiceOnly: join(workDir, `voice_${ts}.mp3`),
        output: join(workDir, `out_${ts}.mp3`),
    };

    const narrPaths: string[] = [];
    let voiceOnlyBuf: Buffer | null = null;

    try {
        if (induction) writeFileSync(paths.induction, induction);
        
        // Write all narration chunks to separate files
        for (let i = 0; i < narrationChunks.length; i++) {
            const p = join(workDir, `narr_chunk_${i}_${ts}.mp3`);
            writeFileSync(p, narrationChunks[i]);
            narrPaths.push(p);
        }
        
        if (guideClose) writeFileSync(paths.guideClose, guideClose);
        if (soundscapeBuffer) writeFileSync(paths.soundscape, soundscapeBuffer);
        if (binauralBuffer) writeFileSync(paths.binaural, binauralBuffer);


        try {
            if (!ffmpegStatic) throw new Error('ffmpeg-static path not found');
            execSync(`"${ffmpegStatic}" -version`, { stdio: 'ignore' });
        } catch {
            console.warn('[assemble] FFmpeg missing — falling back.');
            const fallback = (narrationChunks.length > 0 ? narrationChunks[0] : Buffer.alloc(0));
            return { voiceOnly: fallback, mixed: null, durationSecs: Math.round(fallback.byteLength / (128000 / 8)) };
        }

        // ── Step 1: Concat + resample voice segments ─────────────────────────
        const vInputs: string[] = [];
        if (induction) vInputs.push(paths.induction);
        vInputs.push(...narrPaths);
        if (guideClose) vInputs.push(paths.guideClose);

        console.log(`[assemble] Concat ${vInputs.length} segment(s) at 44.1 kHz…`);

        let voiceCmd: string;
        if (vInputs.length > 1) {
            // Force 44.1 kHz, stereo, and normalize volume for every segment to prevent inconsistencies
            const filterParts = vInputs.map((_, i) =>
                `[${i}:a]aresample=44100:async=1,loudnorm=I=-16:TP=-1.5:LRA=11,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`,
            );
            const concatFilter =
                `${filterParts.join(';')};` +
                `${vInputs.map((_, i) => `[a${i}]`).join('')}concat=n=${vInputs.length}:v=0:a=1[out]`;
            // Force 192k CBR, 44.1 kHz, and strip metadata for best browser compatibility
            voiceCmd =
                `"${ffmpegStatic}" ${vInputs.map(p => `-i "${p}"`).join(' ')} ` +
                `-filter_complex "${concatFilter}" -map "[out]" ` +
                `-acodec libmp3lame -b:a 192k -minrate 192k -maxrate 192k -bufsize 384k -ar 44100 -map_metadata -1 "${paths.voiceOnly}" -y`;
        } else {
            voiceCmd =
                `"${ffmpegStatic}" -i "${vInputs[0]}" ` +
                `-acodec libmp3lame -b:a 192k -minrate 192k -maxrate 192k -bufsize 384k -ar 44100 -map_metadata -1 "${paths.voiceOnly}" -y`;
        }
        execSync(voiceCmd, { stdio: 'pipe' });


        voiceOnlyBuf = readFileSync(paths.voiceOnly);

        // ── Duration Check (Voice Only) ──────────────────────────────────────
        let durationSecs = 0;
        try {
            const ffProbe = execSync(`"${ffmpegStatic}" -i "${paths.voiceOnly}" 2>&1`).toString();
            const durMatch = ffProbe.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
            if (durMatch) {
                durationSecs = Math.round(parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseFloat(durMatch[3]));
            }
        } catch (e) {
            console.warn('[assemble] Duration probe failed:', e);
        }

        // ── Step 2: Mix background audio (optional) ───────────────────────────
        if (!soundscapeBuffer && !binauralBuffer) {
            return { voiceOnly: voiceOnlyBuf, mixed: null, durationSecs };
        }

        const mixInputs = [`-i "${paths.voiceOnly}"`];
        // Ensure voice is forward and tight in the mix
        let filterStr =
            '[0:a]volume=1.4,acompressor=threshold=-16dB:ratio=3:attack=5:release=200:makeup=1.5,' +
            'aresample=44100:async=1,aformat=sample_fmts=fltp:channel_layouts=stereo[main];';
        const mixIndices = ['[main]'];

        if (soundscapeBuffer) {
            mixInputs.push(`-stream_loop -1 -i "${paths.soundscape}"`);
            const idx = mixInputs.length - 1;
            // Mixed softly at -22dB to -24dB relative to 0dB peak (approx 0.1)
            filterStr +=
                `[${idx}:a]volume=0.10,aresample=44100:async=1,` +
                `aformat=sample_fmts=fltp:channel_layouts=stereo[bg${idx}];`;
            mixIndices.push(`[bg${idx}]`);
        }

        if (binauralBuffer) {
            mixInputs.push(`-stream_loop -1 -i "${paths.binaural}"`);
            const idx = mixInputs.length - 1;
            // Mixed very softly for focus effect
            filterStr +=
                `[${idx}:a]volume=0.07,aresample=44100:async=1,` +
                `aformat=sample_fmts=fltp:channel_layouts=stereo[bg${idx}];`;
            mixIndices.push(`[bg${idx}]`);
        }

        // Normalize=0 sums them; with these volumes (1.8 peak voice, 0.25 bg), we stay near 0dB without clipping
        filterStr +=
            `${mixIndices.join('')}amix=inputs=${mixIndices.length}:duration=first:dropout_transition=0:normalize=0[out]`;

        // Strict 192k CBR, 44.1 kHz, and strip metadata for perfect browser seeking
        const mixCmd =
            `"${ffmpegStatic}" ${mixInputs.join(' ')} -filter_complex "${filterStr}" -map "[out]" ` +
            `-acodec libmp3lame -b:a 192k -minrate 192k -maxrate 192k -bufsize 384k -ar 44100 ` +
            `-id3v2_version 3 -write_id3v1 1 -map_metadata -1 "${paths.output}" -y`;

        console.log('[assemble] Running professional CBR hifi-mix…');
        execSync(mixCmd, { stdio: 'pipe' });

        return { voiceOnly: voiceOnlyBuf!, mixed: readFileSync(paths.output), durationSecs };

    } catch (err: any) {
        console.error('[assemble] FFmpeg Error:', err.message);
        if (err.stdout) console.error('stdout:', err.stdout.toString());
        if (err.stderr) console.error('stderr:', err.stderr.toString());

        const fallbackVoice = voiceOnlyBuf || (narrationChunks.length > 0 ? narrationChunks[0] : Buffer.alloc(0));
        return { voiceOnly: fallbackVoice, mixed: null, durationSecs: Math.round(fallbackVoice.byteLength / (192000 / 8)) };
    } finally {
        Object.values(paths).forEach(p => {
            try { if (existsSync(p)) unlinkSync(p); } catch { /* ignore */ }
        });
        // cleanup narration chunks
        narrPaths.forEach(p => {
            try { if (existsSync(p)) unlinkSync(p); } catch { /* ignore */ }
        });
    }
}

// ── POST /api/user/audio/assemble ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // ── Plan gate: free users cannot generate audio ───────────────────────
        const planCheck = await checkPlanGating(session.user.id!, 'generate_audio');
        if (!planCheck.allowed) {
            return NextResponse.json({ error: planCheck.message, code: 'PLAN_UPGRADE_REQUIRED' }, { status: 403 });
        }

        const { storyId } = await req.json();
        const user = await (prisma.user as any).findUnique({ where: { id: session.user.id } }) as any;
        const story = await (prisma.story as any).findUnique({ where: { id: storyId } }) as any;

        if (!story || story.userId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 404 });

        const elevenLabsApi = process.env.ELEVEN_LABS_API;

        // ── Resolve plan capabilities ─────────────────────────────────────────
        const hasActiveBeta = await prisma.userBetaCode.findFirst({
            where: {
                userId: session.user.id,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
        });

        const userPlanStr = String(user.plan || 'free').toLowerCase();
        const effectivePlan = hasActiveBeta ? 'amplifier' : userPlanStr;
        const userSoundscapeStr = String(user.soundscape || 'none').toLowerCase();

        const canUseClonedVoice = VOICE_CLONE_PLANS.has(effectivePlan);   // Explorer → fallback always
        const canUseAdminAudio = ADMIN_AUDIO_PLANS.has(effectivePlan);   // induction + guide-close segments
        const canUseSoundscape = SOUNDSCAPE_PLANS.has(effectivePlan);
        const canUseBinaural = BINAURAL_PLANS.has(effectivePlan);

        // ── Voice selection ───────────────────────────────────────────────────
        // Adam (pNInz6obpgDQGcFmaJgB) is used as the default calm narrator fallback.
        // Users on Activator+ with a cloned voice get their own recorded voice.
        const FALLBACK_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam — calm, narrative-focused
        const isClonedVoice = canUseClonedVoice && !!user.voice_model_id;
        const voiceId = isClonedVoice ? user.voice_model_id : FALLBACK_VOICE_ID;

        const storyText = (story.story_text_approved || story.story_text_draft || '') as string;
        const wordCount = storyText.trim().split(/\s+/).length;
        const storyLengthOption = (story.story_length_option as string | null) || null;
        const expectedWc = PLAN_WORD_TARGETS[effectivePlan] || PLAN_WORD_TARGETS['free'];
        const lenTarget = storyLengthOption ? LENGTH_OPTION_TARGETS[storyLengthOption] : null;

        console.log(
            `[assemble] plan=${userPlanStr} effective=${effectivePlan} beta=${!!hasActiveBeta}\n` +
            `           voice=${isClonedVoice ? 'CLONED ✓' : 'fallback'} (${voiceId})\n` +
            `           model=${isClonedVoice ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2'}\n` +
            `           narration_settings=stability:0.75 similarity:0.65 style:0 speaker_boost:true\n` +
            `           adminAudio=${canUseAdminAudio} soundscape=${canUseSoundscape} binaural=${canUseBinaural}\n` +
            `           storyWords=${wordCount} (plan expected: ${expectedWc})\n` +
            `           story_length_option=${storyLengthOption || 'not set'}` +
            (lenTarget ? ` → target ${lenTarget.words}` : '')
        );

        const affirmations = story.affirmations_json as any;
        const opening = affirmations?.opening ?? [];
        const closing = affirmations?.closing ?? [];

        // ── Fetch audio segments in parallel (gated by plan) ─────────────────
        console.log('[assemble] Fetching segments and background tracks in parallel…');
        const [inductionBuf, guideCloseBuf, soundscapeResult, binauralBuf] = await Promise.all([
            // Admin induction + guide-close only for Activator+
            canUseAdminAudio ? fetchAdminAudio('induction') : Promise.resolve(null),
            canUseAdminAudio ? fetchAdminAudio('guide_close') : Promise.resolve(null),
            // Soundscape — Manifester+
            (canUseSoundscape && userSoundscapeStr !== 'none')
                ? (async () => {
                    const asset = await (prisma as any).soundscapeAsset.findFirst({
                        where: { title: { equals: user.soundscape, mode: 'insensitive' }, isActive: true }
                    });
                    if (asset?.r2_key) {
                        const buf = await fetchR2Buffer(asset.r2_key);
                        return buf ? { buffer: buf, key: asset.r2_key } : null;
                    }
                    // Legacy fallback
                    const legacyKey = `system/soundscapes/${userSoundscapeStr}.mp3`;
                    const buf = await fetchR2Buffer(legacyKey);
                    return buf ? { buffer: buf, key: legacyKey } : null;
                })()
                : Promise.resolve(null),
            // Binaural — Amplifier only
            (canUseBinaural && user.binaural_enabled)
                ? fetchR2Buffer('system/binaural/theta.mp3')
                : Promise.resolve(null),
        ]);

        const soundscapeBuf = soundscapeResult?.buffer ?? null;
        const soundscapeKey = soundscapeResult?.key ?? null;

        if (soundscapeBuf) {
            console.log(`[assemble] ✓ Soundscape loaded (${soundscapeBuf.byteLength} bytes) from ${soundscapeKey}`);
        } else if (canUseSoundscape && userSoundscapeStr !== 'none') {
            console.warn(`[assemble] ⚠️ Soundscape missing for choice "${user.soundscape}"`);
        }

        if (binauralBuf) {
            console.log(`[assemble] ✓ Binaural loaded (${binauralBuf.byteLength} bytes)`);
        } else if (canUseBinaural && user.binaural_enabled) {
            console.warn('[assemble] ⚠️ Binaural missing in R2 for: system/binaural/theta.mp3');
        }

        // 3. Build narration text
        // If the story was generated dynamically, these affirmations are already woven in.
        // We detect this by checking if the first opening affirmation is present in the text.
        const isDynamicStory = opening.length > 0 && storyText.includes(opening[0].substring(0, 20));

        const narrParts: string[] = [];
        if (opening.length > 0 && !isDynamicStory) narrParts.push(opening.join('\n\n'));
        narrParts.push(storyText);
        if (closing.length > 0 && !isDynamicStory) narrParts.push(closing.join('\n\n'));

        // 4. Generate user narration — calls ElevenLabs in chunks as needed
        const narrationText = narrParts.join('\n\n');
        console.log(
            `[assemble] Generating narration: ${narrationText.length} chars, ` +
            `voice=${isClonedVoice ? 'cloned' : 'fallback'}, ` +
            `story_length_option=${storyLengthOption || 'n/a'}`,
        );
        const { chunks: narrationChunks, historyId } = await generateUserNarration(
            voiceId,
            elevenLabsApi!,
            [],                 // already joined into narrationText below
            narrationText,
            [],
            isClonedVoice,
            storyLengthOption,
        );

        // 6. Assemble + Mix
        const { voiceOnly, mixed, durationSecs } = await assembleAndMixWithFFmpeg(
            inductionBuf,
            narrationChunks,
            guideCloseBuf,
            soundscapeBuf,
            binauralBuf,
        );

        // Primary playback = mixed when BG audio is present; otherwise voice-only
        const primaryAudio = mixed ?? voiceOnly;
        const uploadTs = Date.now();

        // 7. Parallel upload voice-only and final version
        const voiceOnlyKey = `user_${user.id}/story_${story.id}_voice_${uploadTs}.mp3`;
        const finalKey = `user_${user.id}/story_${story.id}_final_${uploadTs}.mp3`;

        console.log('[assemble] Uploading final tracks in parallel…');
        await Promise.all([
            s3.send(new PutObjectCommand({
                Bucket: BUCKET,
                Key: voiceOnlyKey,
                Body: voiceOnly,
                ContentType: 'audio/mpeg',
            })),
            s3.send(new PutObjectCommand({
                Bucket: BUCKET,
                Key: finalKey,
                Body: primaryAudio,
                ContentType: 'audio/mpeg',
            }))
        ]);

        const streamUrl = `/api/user/audio/stream?key=${encodeURIComponent(finalKey)}`;
        const voiceOnlyUrl = `/api/user/audio/stream?key=${encodeURIComponent(voiceOnlyKey)}`;

        // 9. Persist to DB
        await (prisma.story as any).update({
            where: { id: story.id },
            data: {
                status: 'audio_ready',
                audio_r2_key: finalKey,
                audio_url: streamUrl,
                audio_file_size_bytes: primaryAudio.byteLength,
                audio_duration_secs: durationSecs,
                elevenlabs_history_id: historyId,
                audio_generated_at: new Date(),
                // Store combined key specifically if mixing happened
                combined_audio_key: mixed ? finalKey : null,
                // Clean voice-only track (no soundscape / binaural)
                voice_only_r2_key: voiceOnlyKey,
                // Metadata about which BG tracks were mixed in
                soundscape_audio_key: soundscapeKey,
                binaural_audio_key: binauralBuf ? 'system/binaural/theta.mp3' : null,
            },
        });


        return NextResponse.json({
            success: true,
            audioUrl: streamUrl,
            voiceOnlyUrl,
            storyId: story.id,
            duration: durationSecs,
            hasSoundscape: !!soundscapeBuf,
            hasBinaural: !!binauralBuf,
        });

    } catch (e: any) {
        console.error('[assemble] error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
