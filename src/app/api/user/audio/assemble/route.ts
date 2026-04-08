import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanGating } from '@/lib/plan-gating';
import { betaTypeToPlan } from '@/lib/beta-utils';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Resolve the ffmpeg binary path: prefer ffmpeg-static, fall back to system ffmpeg
let ffmpegPath = 'ffmpeg';
try {
    const staticPath = require('ffmpeg-static') as string;
    if (staticPath && existsSync(staticPath)) {
        ffmpegPath = staticPath;
        console.log('[assemble] Using ffmpeg-static at:', staticPath);
    } else {
        console.warn('[assemble] ffmpeg-static path not found on disk:', staticPath);
    }
} catch (e) {
    console.warn('[assemble] ffmpeg-static not available, falling back to system ffmpeg:', e);
}

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
const SOUNDSCAPE_PLANS = new Set(['manifester', 'amplifier']);
const BINAURAL_PLANS = new Set(['amplifier']);

/**
 * ElevenLabs Pro plan supports up to 100,000 characters per request.
 * We use generous 5,000-character chunks to keep individual requests reliable
 * while avoiding the aggressive 800-char Fish Audio limit that compressed audio.
 */
const CHUNK_CHARS = 5000;

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

// ── FFmpeg Wrapper ───────────────────────────────────────────────────────────
function ffRun(args: string[]): void {
    const result = spawnSync(ffmpegPath, args, { 
        maxBuffer: 200 * 1024 * 1024,
        env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` }
    });
    if (result.error) {
        throw new Error(`FFmpeg failed to start (${ffmpegPath}): ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(`FFmpeg exited ${result.status}: ${result.stderr?.toString().slice(-300)}`);
    }
}

// ── Free TTS Fallback (when Fish Audio has no balance) ───────────────────────
async function generateFreeTTS(text: string, outPath: string): Promise<void> {
    console.log('[assemble] Using free TTS fallback (no Fish Audio credits)');
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
            if (buf) { writeFileSync(outPath, buf); return; }
        } catch {}
    }
    ffRun(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=5', '-acodec', 'libmp3lame', outPath, '-y']);
}

// ── ElevenLabs TTS (Primary — Pro plan) ───────────────────────────────────────
async function generateElevenLabsTTS(voiceId: string, text: string, outPath: string): Promise<boolean> {
    const key = process.env.ELEVEN_LABS_API;
    if (!key) return false;
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
        if (!res.ok) {
            console.error(`[assemble] ElevenLabs TTS error ${res.status}:`, await res.text().catch(() => ''));
            return false;
        }
        writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
        return true;
    } catch (e) {
        console.error('[assemble] ElevenLabs TTS exception:', e);
        return false;
    }
}

// ── Fish Audio TTS (Fallback) ─────────────────────────────────────────────────
async function generateFishAudioTTS(voiceId: string, text: string, outPath: string): Promise<boolean> {
    const key = process.env.FISH_AUDIO_API;
    if (!key) return false;
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
        if (!res.ok) return false;
        writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
        return true;
    } catch { return false; }
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
                const sentences = p.match(/[^.!?]+[.!?]+\s*/g) || [p];
                let sentChunk = '';
                for (const s of sentences) {
                    if (sentChunk.length + s.length <= maxChars) {
                        sentChunk += s;
                    } else {
                        if (sentChunk) chunks.push(sentChunk.trim());
                        sentChunk = s;
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
    const dir = tmpdir();
    const voiceFiles: string[] = [];
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
        
        // ── Assets Fetch ──────────────────────────────────────────────────────
        const [induction, close, soundscape, binaural] = await Promise.all([
            ADMIN_AUDIO_PLANS.has(effectivePlan) ? fetchAdminAudio('induction') : Promise.resolve(null),
            ADMIN_AUDIO_PLANS.has(effectivePlan) ? fetchAdminAudio('guide_close') : Promise.resolve(null),
            SOUNDSCAPE_PLANS.has(effectivePlan) && user.soundscape !== 'none'
                ? (async () => {
                    const asset = await (prisma as any).soundscapeAsset.findFirst({ where: { title: { equals: user.soundscape, mode: 'insensitive' } } });
                    return asset ? fetchR2Buffer(asset.r2_key) : fetchR2Buffer(`system/soundscapes/${user.soundscape.toLowerCase()}.mp3`);
                })()
                : Promise.resolve(null),
            BINAURAL_PLANS.has(effectivePlan) && user.binaural_enabled ? fetchR2Buffer('system/binaural/theta.mp3') : Promise.resolve(null),
        ]);

        // ── Voice Parts ───────────────────────────────────────────────────────
        // ElevenLabs voice IDs and Fish Audio voice IDs are different formats.
        // The user's voice_model_id may be either depending on which clone-voice flow was used.
        const voiceId = user.voice_model_id || '';
        const elevenLabsVoiceId = user.elevenlabs_voice_id || '';
        const rawText = (story as any).story_text_approved || (story as any).story_text_draft || '';
        const aff = (story as any).affirmations_json as any;
        const textParts = [];
        if (aff?.opening) textParts.push(aff.opening.join('\n\n'));
        textParts.push(rawText);
        if (aff?.closing) textParts.push(aff.closing.join('\n\n'));
        
        const fullText = textParts.join('\n\n');
        const chunks = splitTextIntoChunks(fullText);
        const chunkPaths: string[] = [];

        // Determine which voice ID to use for ElevenLabs
        const elVoiceId = elevenLabsVoiceId || voiceId;
        const useElevenLabs = !!process.env.ELEVEN_LABS_API && !!elVoiceId;

        console.log(`[assemble] Story text: ${rawText.length} chars, ${rawText.split(/\s+/).length} words`);
        console.log(`[assemble] Full text with affirmations: ${fullText.length} chars`);
        console.log(`[assemble] Generating ${chunks.length} chunks (TTS: ${useElevenLabs ? 'ElevenLabs' : 'Fish Audio'})...`);
        
        for (let i = 0; i < chunks.length; i++) {
            const fp = join(dir, `v_${i}_${ts}.mp3`);
            let generated = false;
            
            // Priority 1: ElevenLabs (Pro plan — handles long text, natural pacing)
            if (useElevenLabs) {
                generated = await generateElevenLabsTTS(elVoiceId, chunks[i], fp);
            }
            
            // Priority 2: Fish Audio fallback
            if (!generated && voiceId) {
                generated = await generateFishAudioTTS(voiceId, chunks[i], fp);
            }
            
            // Priority 3: Free TTS fallback
            if (!generated) {
                await generateFreeTTS(chunks[i], fp);
            }
            
            chunkPaths.push(fp);
            voiceFiles.push(fp);
        }

        // ── Final Assembly ───────────────────────────────────────────────────
        const assemblyPaths: string[] = [];
        if (induction) {
            const fp = join(dir, `ind_${ts}.mp3`);
            writeFileSync(fp, induction);
            assemblyPaths.push(fp);
            voiceFiles.push(fp);
        }
        assemblyPaths.push(...chunkPaths);
        if (close) {
            const fp = join(dir, `close_${ts}.mp3`);
            writeFileSync(fp, close);
            assemblyPaths.push(fp);
            voiceFiles.push(fp);
        }

        const listContent = assemblyPaths.map(fp => `file '${fp.replace(/'/g, "'\\''")}'`).join('\n');
        const listPath = join(dir, `list_${ts}.txt`);
        writeFileSync(listPath, listContent);

        const rawVoice = join(dir, `raw_${ts}.mp3`);
        const voiceOnly = join(dir, `norm_${ts}.mp3`);
        const mixed = join(dir, `mixed_${ts}.mp3`);
        
        ffRun(['-f', 'concat', '-safe', '0', '-i', listPath, '-acodec', 'libmp3lame', '-b:a', '192k', rawVoice, '-y']);
        try {
            ffRun(['-i', rawVoice, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-acodec', 'libmp3lame', '-b:a', '192k', voiceOnly, '-y']);
        } catch { writeFileSync(voiceOnly, readFileSync(rawVoice)); }

        if (soundscape || binaural) {
            const scPath = join(dir, `sc_${ts}.mp3`);
            const binPath = join(dir, `bin_${ts}.mp3`);
            if (soundscape) writeFileSync(scPath, soundscape);
            if (binaural) writeFileSync(binPath, binaural);

            const mixInputs = ['-i', voiceOnly];
            const filters = ['[0:a]volume=1.0[v]'];
            const labels = ['[v]'];
            if (soundscape) { mixInputs.push('-stream_loop', '-1', '-i', scPath); filters.push(`[${mixInputs.filter(x => x === '-i').length - 1}:a]volume=0.09[sc]`); labels.push('[sc]'); }
            if (binaural) { mixInputs.push('-stream_loop', '-1', '-i', binPath); filters.push(`[${mixInputs.filter(x => x === '-i').length - 1}:a]volume=0.06[bin]`); labels.push('[bin]'); }
            const filter = `${filters.join(';')};${labels.join('')}amix=inputs=${labels.length}:duration=first[out]`;
            ffRun([...mixInputs, '-filter_complex', filter, '-map', '[out]', '-acodec', 'libmp3lame', '-b:a', '192k', mixed, '-y']);
            voiceFiles.push(scPath, binPath);
        }

        const primaryPath = existsSync(mixed) ? mixed : voiceOnly;
        const primaryAudio = readFileSync(primaryPath);

        // Duration
        let duration = 0;
        try {
            const probe = spawnSync(ffmpegPath, ['-i', primaryPath], { env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` } });
            const match = probe.stderr.toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
            if (match) duration = Math.round(parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]));
        } catch { duration = Math.round(primaryAudio.byteLength / (192_000 / 8)); }

        // Upload
        const finalKey = `user_${user.id}/story_${story.id}_final_${ts}.mp3`;
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: finalKey, Body: primaryAudio, ContentType: 'audio/mpeg' }));

        const finalUrl = `/api/user/audio/stream?key=${encodeURIComponent(finalKey)}`;
        await prisma.story.update({ where: { id: story.id }, data: { status: 'audio_ready', audio_url: finalUrl, audio_r2_key: finalKey, audio_duration_secs: duration } });

        // Cleanup
        [listPath, rawVoice, voiceOnly, mixed, ...voiceFiles].forEach(f => { try { if (existsSync(f)) unlinkSync(f); } catch {} });

        return NextResponse.json({ success: true, storyId, audioUrl: finalUrl, durationSecs: duration });

    } catch (e: any) {
        console.error('[assemble] Fatal:', e.message);
        return NextResponse.json({ error: e.message || 'Error occurred' }, { status: 500 });
    }
}