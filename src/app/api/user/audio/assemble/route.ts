import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanGating } from '@/lib/plan-gating';
import { betaTypeToPlan } from '@/lib/beta-utils';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Allow up to 300s for audio assembly (TTS generation)
export const maxDuration = 300;

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

// ── Plan capability sets ──────────────────────────────────────────────────────
const VOICE_CLONE_PLANS = new Set(['free', 'activator', 'manifester', 'amplifier']);
const ADMIN_AUDIO_PLANS = new Set(['activator', 'manifester', 'amplifier']);

/**
 * ElevenLabs can technically accept very long text per request, but the
 * eleven_multilingual_v2 model frequently truncates / drops the tail of long
 * chunks.  2 500 characters gives reliable end-to-end coverage while still
 * keeping the number of API calls low.
 */
const CHUNK_CHARS = 2500;

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
        return await fetchR2Buffer(asset.r2_key);
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
                            stability: 0.80,
                            similarity_boost: 0.75,
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
                await new Promise(r => setTimeout(r, 2000 * attempt));
                continue;
            }
        } catch (e) {
            console.error(`[assemble] ElevenLabs TTS exception (attempt ${attempt}/${MAX_RETRIES}):`, e);
        }
        // Brief pause between retries for non-429 errors too
        if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000));
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

// ── Text Chunker  ─────────────────────────────────────────────────────────────
function splitTextIntoChunks(text: string, maxChars: number = CHUNK_CHARS): string[] {
    if (!text?.trim()) return [];
    // For ElevenLabs Pro, try to send the entire text as one chunk if under limit
    if (text.length <= maxChars) return [text.trim()];
    
    const paras = text.split(/\n\n+/);
    const chunks: string[] = [];
    let current = '';
    for (const p of paras) {
        if (current.length + p.length + 2 <= maxChars) {
            current += (current ? '\n\n' : '') + p;
        } else {
            if (current) chunks.push(current.trim());
            // If a single paragraph exceeds maxChars, split on sentence boundaries
            if (p.length > maxChars) {
                const sentenceMatches = p.match(/[^.!?]+[.!?]+\s*/g) || [];
                // Capture any trailing text the regex missed (no ending punctuation)
                const matchedLen = sentenceMatches.reduce((n, s) => n + s.length, 0);
                const remainder = p.slice(matchedLen);
                const sentences = remainder.trim()
                    ? [...sentenceMatches, remainder]
                    : sentenceMatches.length ? sentenceMatches : [p];
                let sentChunk = '';
                for (const s of sentences) {
                    if (sentChunk.length + s.length <= maxChars) {
                        sentChunk += s;
                    } else {
                        if (sentChunk) chunks.push(sentChunk.trim());
                        // If a single sentence still exceeds maxChars, push it anyway
                        // so no text is silently dropped
                        if (s.length > maxChars) {
                            chunks.push(s.trim());
                            sentChunk = '';
                        } else {
                            sentChunk = s;
                        }
                    }
                }
                current = sentChunk;
            } else {
                current = p;
            }
        }
    }
    if (current) chunks.push(current.trim());
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
        
        // ── Assets Fetch (induction / close — pre/appended as MP3) ────────────
        const [induction, close] = await Promise.all([
            ADMIN_AUDIO_PLANS.has(effectivePlan) ? fetchAdminAudio('induction') : Promise.resolve(null),
            ADMIN_AUDIO_PLANS.has(effectivePlan) ? fetchAdminAudio('guide_close') : Promise.resolve(null),
        ]);

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
        const aff = (story as any).affirmations_json as any;
        const textParts: string[] = [];
        if (aff?.opening && Array.isArray(aff.opening)) textParts.push(aff.opening.join('\n\n'));
        textParts.push(rawText);
        if (aff?.closing && Array.isArray(aff.closing)) textParts.push(aff.closing.join('\n\n'));
        
        const fullText = textParts.join('\n\n');
        const fullWordCount = fullText.split(/\s+/).filter(Boolean).length;
        const chunks = splitTextIntoChunks(fullText);

        // Verify text integrity — total words in chunks must match original
        const totalChunkChars = chunks.reduce((n, c) => n + c.length, 0);
        const totalChunkWords = chunks.reduce((n, c) => n + c.split(/\s+/).filter(Boolean).length, 0);

        console.log(`[assemble] Story text: ${rawText.length} chars, ${rawText.split(/\s+/).filter(Boolean).length} words`);
        console.log(`[assemble] Full text with affirmations: ${fullText.length} chars, ${fullWordCount} words`);
        console.log(`[assemble] Split into ${chunks.length} chunks: ${totalChunkChars} chars, ${totalChunkWords} words`);
        if (totalChunkWords < fullWordCount * 0.95) {
            console.error(`[assemble] ⚠ TEXT LOSS DETECTED: original ${fullWordCount} words → chunks ${totalChunkWords} words (${fullWordCount - totalChunkWords} words lost!)`);
        }

        // Log each chunk size for debugging
        chunks.forEach((c, i) => console.log(`[assemble]   Chunk ${i + 1}: ${c.length} chars, ${c.split(/\s+/).filter(Boolean).length} words`));
        
        // Generate all TTS chunks as in-memory buffers
        const chunkBuffers: Buffer[] = [];
        for (let i = 0; i < chunks.length; i++) {
            let buf: Buffer | null = null;
            
            // Priority 1: ElevenLabs (only if we have a real ElevenLabs voice ID)
            if (useElevenLabs) {
                buf = await generateElevenLabsTTS(elevenLabsVoiceId, chunks[i]);
            }
            
            // Priority 2: Fish Audio fallback (use voice_model_id which may be Fish Audio ID)
            if (!buf && useFishAudio) {
                buf = await generateFishAudioTTS(voiceModelId, chunks[i]);
            }
            
            // Priority 3: Free TTS fallback
            if (!buf) {
                buf = await generateFreeTTS(chunks[i]);
            }
            
            if (buf) {
                chunkBuffers.push(buf);
                console.log(`[assemble] ✓ Chunk ${i + 1}/${chunks.length} — ${buf.length} bytes`);
            } else {
                // Do NOT silently skip — the audio would be incomplete
                console.error(`[assemble] ✗ Chunk ${i + 1}/${chunks.length} FAILED — aborting to prevent incomplete audio`);
                return NextResponse.json(
                    { error: `Voice generation failed on chunk ${i + 1} of ${chunks.length}. Please try again.` },
                    { status: 500 },
                );
            }
        }

        if (chunkBuffers.length === 0) {
            return NextResponse.json({ error: 'Failed to generate any audio' }, { status: 500 });
        }

        // ── Final Assembly (simple MP3 concatenation in memory) ───────────────
        const parts: Buffer[] = [];
        if (induction) parts.push(induction);
        parts.push(...chunkBuffers);
        if (close) parts.push(close);

        const finalAudio = Buffer.concat(parts);

        // Estimate duration from MP3 byte size (128 kbps = 16000 bytes/sec)
        const duration = Math.round(finalAudio.byteLength / 16000);

        // Upload
        const finalKey = `user_${user.id}/story_${story.id}_final_${ts}.mp3`;
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: finalKey, Body: finalAudio, ContentType: 'audio/mpeg' }));

        const finalUrl = `/api/user/audio/stream?key=${encodeURIComponent(finalKey)}`;
        await prisma.story.update({ where: { id: story.id }, data: { status: 'audio_ready', audio_url: finalUrl, audio_r2_key: finalKey, audio_duration_secs: duration } });

        console.log(`[assemble] ✅ Done — ${finalAudio.byteLength} bytes, ~${duration}s`);
        return NextResponse.json({ success: true, storyId, audioUrl: finalUrl, durationSecs: duration });

    } catch (e: any) {
        console.error('[assemble] Fatal:', e.message);
        return NextResponse.json({ error: e.message || 'Error occurred' }, { status: 500 });
    }
}