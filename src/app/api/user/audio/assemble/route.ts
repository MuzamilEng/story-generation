import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

// ── Plan definitions ─────────────────────────────────────────────────────────
const SOUNDSCAPE_PLANS = new Set(['manifester', 'amplifier']);
const BINAURAL_PLANS = new Set(['amplifier']);

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
 * ONE single ElevenLabs TTS call for everything in the USER's voice.
 */
async function generateUserNarration(
    voiceId: string,
    apiKey: string,
    openingAffirmations: string[],
    storyText: string,
    closingAffirmations: string[],
): Promise<{ buffer: Buffer; historyId: string | null }> {
    const parts: string[] = [];
    if (openingAffirmations.length > 0) parts.push(openingAffirmations.join('\n\n'));
    parts.push(storyText);
    if (closingAffirmations.length > 0) parts.push(closingAffirmations.join('\n\n'));

    const fullText = parts.join('\n\n');

    const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
            body: JSON.stringify({
                text: fullText,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
        },
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`ElevenLabs TTS failed: ${err.slice(0, 200)}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const historyId = res.headers.get('request-id');
    return { buffer, historyId };
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
    narration: Buffer,
    guideClose: Buffer | null,
    soundscapeBuffer: Buffer | null,
    binauralBuffer: Buffer | null,
): Promise<{ voiceOnly: Buffer; mixed: Buffer | null }> {
    const workDir = tmpdir();
    const ts = Date.now() + Math.random().toString(36).substring(7);
    const paths = {
        induction: join(workDir, `ind_${ts}.mp3`),
        narration: join(workDir, `narr_${ts}.mp3`),
        guideClose: join(workDir, `close_${ts}.mp3`),
        soundscape: join(workDir, `bg_${ts}.mp3`),
        binaural: join(workDir, `bin_${ts}.mp3`),
        voiceOnly: join(workDir, `voice_${ts}.mp3`),
        output: join(workDir, `out_${ts}.mp3`),
    };

    try {
        if (induction) writeFileSync(paths.induction, induction);
        writeFileSync(paths.narration, narration);
        if (guideClose) writeFileSync(paths.guideClose, guideClose);
        if (soundscapeBuffer) writeFileSync(paths.soundscape, soundscapeBuffer);
        if (binauralBuffer) writeFileSync(paths.binaural, binauralBuffer);

        try {
            execSync('ffmpeg -version', { stdio: 'ignore' });
        } catch {
            console.warn('[assemble] FFmpeg missing — falling back.');
            return { voiceOnly: narration, mixed: null };
        }

        // ── Step 1: Concat + resample voice segments ─────────────────────────
        const vInputs: string[] = [];
        if (induction) vInputs.push(paths.induction);
        vInputs.push(paths.narration);
        if (guideClose) vInputs.push(paths.guideClose);

        console.log(`[assemble] Concat ${vInputs.length} segment(s) at 44.1 kHz…`);

        let voiceCmd: string;
        if (vInputs.length > 1) {
            // Force 44.1 kHz + stereo for every segment to prevent speed glitches
            const filterParts = vInputs.map((_, i) =>
                `[${i}:a]aresample=44100:async=1,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`,
            );
            const concatFilter =
                `${filterParts.join(';')};` +
                `${vInputs.map((_, i) => `[a${i}]`).join('')}concat=n=${vInputs.length}:v=0:a=1[out]`;
            // Force 192k CBR, 44.1 kHz, and strip metadata for best browser compatibility
            voiceCmd =
                `ffmpeg ${vInputs.map(p => `-i "${p}"`).join(' ')} ` +
                `-filter_complex "${concatFilter}" -map "[out]" ` +
                `-acodec libmp3lame -b:a 192k -minrate 192k -maxrate 192k -bufsize 384k -ar 44100 -map_metadata -1 "${paths.voiceOnly}" -y`;
        } else {
            voiceCmd =
                `ffmpeg -i "${paths.narration}" ` +
                `-acodec libmp3lame -b:a 192k -minrate 192k -maxrate 192k -bufsize 384k -ar 44100 -map_metadata -1 "${paths.voiceOnly}" -y`;
        }
        execSync(voiceCmd, { stdio: 'pipe' });


        const voiceOnlyBuf = readFileSync(paths.voiceOnly);

        // ── Step 2: Mix background audio (optional) ───────────────────────────
        if (!soundscapeBuffer && !binauralBuffer) {
            return { voiceOnly: voiceOnlyBuf, mixed: null };
        }

        const mixInputs = [`-i "${paths.voiceOnly}"`];
        // volume=2.2 + acompressor keeps voice loud and punchy over the BG tracks
        let filterStr =
            '[0:a]volume=2.2,acompressor=threshold=-20dB:ratio=4:attack=5:release=50:makeup=2,' +
            'aresample=44100:async=1,aformat=sample_fmts=fltp:channel_layouts=stereo[main];';
        const mixIndices = ['[main]'];

        if (soundscapeBuffer) {
            mixInputs.push(`-stream_loop -1 -i "${paths.soundscape}"`);
            const idx = mixInputs.length - 1;
            filterStr +=
                `[${idx}:a]volume=0.14,aresample=44100:async=1,` +
                `aformat=sample_fmts=fltp:channel_layouts=stereo[bg${idx}];`;
            mixIndices.push(`[bg${idx}]`);
        }

        if (binauralBuffer) {
            mixInputs.push(`-stream_loop -1 -i "${paths.binaural}"`);
            const idx = mixInputs.length - 1;
            filterStr +=
                `[${idx}:a]volume=0.10,aresample=44100:async=1,` +
                `aformat=sample_fmts=fltp:channel_layouts=stereo[bg${idx}];`;
            mixIndices.push(`[bg${idx}]`);
        }

        // normalize=0 keeps the voice at 2.2× regardless of the number of BG inputs
        filterStr +=
            `${mixIndices.join('')}amix=inputs=${mixIndices.length}:duration=first:dropout_transition=0:normalize=0[out]`;

        // Strict 192k CBR, 44.1 kHz, and strip metadata for perfect browser seeking
        const mixCmd =
            `ffmpeg ${mixInputs.join(' ')} -filter_complex "${filterStr}" -map "[out]" ` +
            `-acodec libmp3lame -b:a 192k -minrate 192k -maxrate 192k -bufsize 384k -ar 44100 ` +
            `-id3v2_version 3 -write_id3v1 1 -map_metadata -1 "${paths.output}" -y`;
        
        console.log('[assemble] Running strict CBR hifi-mix…');
        execSync(mixCmd, { stdio: 'pipe' });


        return { voiceOnly: voiceOnlyBuf, mixed: readFileSync(paths.output) };

    } catch (err: any) {
        console.error('[assemble] FFmpeg Error:', err.message);
        return { voiceOnly: narration, mixed: null };
    } finally {
        Object.values(paths).forEach(p => {
            try { if (existsSync(p)) unlinkSync(p); } catch { /* ignore */ }
        });
    }
}

// ── POST /api/user/audio/assemble ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { storyId } = await req.json();
        const user = await (prisma.user as any).findUnique({ where: { id: session.user.id } }) as any;
        const story = await (prisma.story as any).findUnique({ where: { id: storyId } }) as any;

        if (!story || story.userId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 404 });

        const elevenLabsApi = process.env.ELEVEN_LABS_API;

        // High-quality fallback voice (Adam — Dominant) if the user hasn't cloned yet
        const FALLBACK_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
        const voiceId = user.voice_model_id || FALLBACK_VOICE_ID;

        if (!user.voice_model_id) {
            console.warn(`[assemble] User ${user.id} has no voice_model_id. Using fallback: ${FALLBACK_VOICE_ID}`);
        } else {
            console.log(`[assemble] User ${user.id} using cloned voice: ${voiceId}`);
        }

        const storyText = (story.story_text_approved || story.story_text_draft || '') as string;
        const affirmations = story.affirmations_json as any;
        const opening = affirmations?.opening ?? [];
        const closing = affirmations?.closing ?? [];

        // 1 & 2. Parallelize admin segments + soundscapes/binaural fetches
        console.log('[assemble] Fetching segments and background tracks in parallel…');

        const userPlanStr = String(user.plan).toLowerCase();
        const userSoundscapeStr = String(user.soundscape || 'none').toLowerCase();
        const canUseSoundscape = SOUNDSCAPE_PLANS.has(userPlanStr);
        const canUseBinaural   = BINAURAL_PLANS.has(userPlanStr);

        const [inductionBuf, guideCloseBuf, soundscapeResult, binauralBuf] = await Promise.all([
            fetchAdminAudio('induction'),
            fetchAdminAudio('guide_close'),
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
            (canUseBinaural && user.binaural_enabled)
                ? fetchR2Buffer('system/binaural/theta.mp3')
                : Promise.resolve(null)
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

        // 3. Build narration text — inline fallback script when admin audio is missing
        const narrParts: string[] = [];
        if (!inductionBuf) {
            console.log('[assemble] Induction script inlined (no admin audio file found)');
            narrParts.push(
                'Take a deep breath and allow yourself to settle. As you listen to these words, ' +
                'your mind begins to relax, moving into a state of deep receptivity. This is your time. ' +
                'A time to step into the reality you are choosing. Everything you are about to hear is ' +
                'already true. Let\'s begin.',
            );
        }

        if (opening.length > 0) narrParts.push(opening.join('\n\n'));
        narrParts.push(storyText);
        if (closing.length > 0) narrParts.push(closing.join('\n\n'));

        if (!guideCloseBuf) {
            console.log('[assemble] Guide-close script inlined (no admin audio file found)');
            narrParts.push(
                'Now, take this feeling of completion and certainty with you. It is who you are. ' +
                'Carry this version of yourself into the rest of your day, knowing that every step ' +
                'you take is aligned with your highest vision. It is done. And so it is.',
            );
        }

        // 4. Generate user narration — ONE ElevenLabs call
        console.log(`[assemble] Generating user narration (${narrParts.length} parts)…`);
        const { buffer: narrationBuf, historyId } = await generateUserNarration(
            voiceId,
            elevenLabsApi!,
            [],                         // already joined above
            narrParts.join('\n\n'),
            [],
        );

        // 6. Assemble + Mix
        const { voiceOnly, mixed } = await assembleAndMixWithFFmpeg(
            inductionBuf,
            narrationBuf,
            guideCloseBuf,
            soundscapeBuf,
            binauralBuf,
        );

        // Primary playback = mixed when BG audio is present; otherwise voice-only
        const primaryAudio = mixed ?? voiceOnly;
        const durationSecs = Math.round(primaryAudio.byteLength / 16000);
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
