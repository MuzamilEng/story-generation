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
export const runtime = 'nodejs'; // Ensure Node.js runtime
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

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────
async function generateElevenLabsTTS(voiceId: string, text: string): Promise<Buffer | null> {
    const key = process.env.ELEVEN_LABS_API;
    if (!key || !voiceId) return null;

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // ⚠️ IMPORTANT: Do NOT include `voice_settings` here.
            // ElevenLabs overrides the per-voice saved settings whenever voice_settings
            // is sent in the request body. The clone-voice route already PATCHed the voice
            // with professional narration settings (stability:0.75, similarity_boost:0.90).
            // Omitting voice_settings forces ElevenLabs to use those saved values, which
            // gives the highest fidelity to the user's recorded voice.
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s per chunk
            const res = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
                {
                    method: 'POST',
                    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        model_id: 'eleven_multilingual_v2',
                        // No voice_settings — use per-voice saved settings for max clone fidelity
                    }),
                    signal: controller.signal,
                },
            );
            clearTimeout(timeoutId);

            // Log ElevenLabs diagnostic headers
            const warning = res.headers.get('warning');
            const historyItemId = res.headers.get('history-item-id');
            if (warning) {
                console.warn(`[assemble] ⚠️ ElevenLabs Warning: ${warning}`);
            }
            console.log(
                `[assemble] ElevenLabs response — status: ${res.status} | ` +
                `voice: ${voiceId} | history-item-id: ${historyItemId ?? 'none'} | ` +
                `attempt: ${attempt}/${MAX_RETRIES}`
            );

            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                console.log(`[assemble] ✅ ElevenLabs TTS success — ${buf.length} bytes for voice ${voiceId}`);
                return buf;
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
        return buf;
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
        // ── Fetch user + story ─────────────────────────────────────────────────
        // NOTE: Use explicit `select` to guarantee voice fields are included in
        // the Prisma result even if the generated client type lags behind the schema.
        const [userRaw, story] = await Promise.all([
            prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    id: true,
                    name: true,
                    plan: true,
                    voice_model_id: true,
                    elevenlabs_voice_id: true,
                    voice_sample_url: true,
                },
            }),
            prisma.story.findUnique({ where: { id: storyId } }),
        ]);
        // Keep a fully-typed alias for non-voice fields
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
        // Read both voice ID fields directly (explicit select guarantees they are present)
        const elevenLabsVoiceId = (user.elevenlabs_voice_id ?? '') as string;
        const fishAudioVoiceId  = (user.voice_model_id ?? '') as string;

        console.log(`[assemble] 🎤 Voice IDs from DB — elevenlabs_voice_id: "${elevenLabsVoiceId || 'EMPTY'}" | voice_model_id: "${fishAudioVoiceId || 'EMPTY'}"`); 

        let selectedVoiceId: string | null = null;
        let ttsProvider: 'elevenlabs' | 'fishaudio' | 'free' = 'free';

        // ── Priority 1: ElevenLabs with the dedicated elevenlabs_voice_id field ──
        if (process.env.ELEVEN_LABS_API && elevenLabsVoiceId.length > 5) {
            selectedVoiceId = elevenLabsVoiceId;
            ttsProvider = 'elevenlabs';
            console.log(`[assemble] ✅ Using cloned voice — elevenlabs_voice_id: ${selectedVoiceId}`);
        }
        // ── Priority 2: EL fallback — voice_model_id looks like an ElevenLabs ID ─
        //    EL IDs are alphanumeric, 15-40 chars, no UUID-style hyphens
        else if (
            process.env.ELEVEN_LABS_API &&
            fishAudioVoiceId.length >= 15 &&
            fishAudioVoiceId.length <= 40 &&
            !fishAudioVoiceId.includes('-')
        ) {
            selectedVoiceId = fishAudioVoiceId;
            ttsProvider = 'elevenlabs';
            console.log(`[assemble] ✅ Using cloned voice (EL) from voice_model_id fallback: ${selectedVoiceId}`);
        }
        // ── Priority 3: Fish Audio ────────────────────────────────────────────────
        else if (process.env.FISH_AUDIO_API && fishAudioVoiceId) {
            selectedVoiceId = fishAudioVoiceId;
            ttsProvider = 'fishaudio';
            console.log(`[assemble] ✅ Using cloned voice — Fish Audio voice_model_id: ${selectedVoiceId}`);
        }

        const userHasClonedVoice = ttsProvider !== 'free' && !!selectedVoiceId;

        if (!userHasClonedVoice) {
            console.warn(
                `[assemble] ⚠️ No cloned voice found for user ${user.id}. ` +
                `elevenlabs_voice_id=${elevenLabsVoiceId || 'null'}, voice_model_id=${fishAudioVoiceId || 'null'}. ` +
                `Falling back to free TTS. User must record a voice sample first.`
            );
        }

        console.log(`[assemble] Selection Finalized — Provider: ${ttsProvider}, Voice ID: ${selectedVoiceId ?? 'none'}`);

        // ── Fetch admin audio (always for intro) ───────────────────────────────
        let induction: Buffer | null = null;
        let close: Buffer | null = null;

        // Always fetch induction for intro
        induction = await fetchAdminAudio('induction');

        // Only fetch guide close for users without cloned voice
        if (!userHasClonedVoice) {
            close = await fetchAdminAudio('guide_close');
        }

        console.log(`[assemble] Admin induction: ${induction ? `${induction.length} bytes` : 'not available'}`);

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

                if (ttsProvider === 'elevenlabs') {
                    buf = await generateElevenLabsTTS(selectedVoiceId!, chunks[i]);
                    if (!buf) {
                        console.error(`[assemble] ✗ ElevenLabs chunk ${i + 1}/${chunks.length} failed`);
                        throw new Error(
                            `Voice generation failed on ${label} chunk ${i + 1}/${chunks.length}. ` +
                            `Please try again.`
                        );
                    }
                } else if (ttsProvider === 'fishaudio') {
                    buf = await generateFishAudioTTS(selectedVoiceId!, chunks[i]);
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


        // ── Text segmentation ─────────────────────────────────────────────────
        const rawText =
            (story as any).story_text_approved || (story as any).story_text_draft || '';
        let { intro: introText, storyBody: storyBodyText } = splitIntroFromStory(rawText);

        console.log(
            `[assemble] Final Text — Intro: ${introText.length} chars | Story body: ${storyBodyText.length} chars`,
        );

        // ── 1. Story body TTS (user cloned voice) ─────────────────────────────
        console.log(`[assemble] Generating story body — Content: "${storyBodyText.substring(0, 50)}..."`);

        const storyBuffers = await generateTTSForText(storyBodyText, 'story');
        console.log(`[assemble] 🎙️ Narration using ${ttsProvider} Voice (ID: ${selectedVoiceId ?? 'none'})`);

        if (storyBuffers.length === 0) {
            return NextResponse.json({ error: 'Failed to generate any audio' }, { status: 500 });
        }

        // ── Final assembly ─────────────────────────────────────────────────────
        // Order: [Admin Intro Clip (if uploaded by admin)] → [User Cloned Voice Story]
        const parts: Buffer[] = [];
        const segmentLog: string[] = [];

        // 1. Admin intro clip — prepend if admin has uploaded one in SystemAudio
        if (induction) {
            parts.push(induction);
            segmentLog.push(`Admin Intro (${Math.round(induction.length / 1024)}KB)`);
            console.log(`[assemble] ✅ Admin intro clip included — ${induction.length} bytes`);
        } else {
            console.log(`[assemble] ⚠️ No admin intro uploaded — starting directly with story narration`);
        }

        // 2. User cloned voice story narration
        parts.push(...storyBuffers);
        segmentLog.push(userHasClonedVoice ? `User Cloned Voice Story` : `Free TTS Story`);

        console.log(`[assemble] 🎬 Assembly order: ${segmentLog.join(' → ')}`);

        // ── Concatenate buffers directly (No FFmpeg) ──────────────────────────
        const finalAudio = Buffer.concat(parts);
        console.log(`[assemble] ✅ Buffer concatenation complete — ${finalAudio.byteLength} bytes`);

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