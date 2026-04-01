import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: 'us-east-1', // R2 requires this or a region, but uses its own endpoint
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const audioFile = formData.get('audio') as Blob | null;
        let storyId = formData.get('storyId') as string | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Plan Gating Check
        const { checkPlanGating } = await import('@/lib/plan-gating');
        const gating = await checkPlanGating(user.id, 'generate_audio');
        if (!gating.allowed) {
            return NextResponse.json({ error: gating.message }, { status: 403 });
        }

        // If no storyId passed, find the most recent draft/approved story
        if (!storyId) {
            const recentStory = await prisma.story.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' }
            });
            if (recentStory) {
                storyId = recentStory.id;
            } else {
                return NextResponse.json({ error: 'No story found for user' }, { status: 400 });
            }
        }

        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story || story.userId !== user.id) {
            return NextResponse.json({ error: 'Story not found or unauthorized' }, { status: 404 });
        }

        const textToRead = story.story_text_approved || story.story_text_draft;
        if (!textToRead) {
            return NextResponse.json({ error: 'Story text is empty' }, { status: 400 });
        }

        const elevenLabsApi = process.env.ELEVEN_LABS_API;
        if (!elevenLabsApi) {
            return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
        }
        let voiceId = user.voice_model_id;

        // 1. Voice Cloning if not existing
        if (!voiceId) {
            const elFormData = new FormData();
            elFormData.append('name', `${user.name || 'User'} - Clone Voice`);
            elFormData.append('files', audioFile, 'sample.m4a');
            elFormData.append('description', 'Instant Voice Clone for user story');

            const cloneRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
                method: 'POST',
                headers: {
                    'xi-api-key': elevenLabsApi
                },
                body: elFormData
            });

            if (!cloneRes.ok) {
                const errText = await cloneRes.text();
                console.error("ElevenLabs Voice Add Error:", errText);

                // Detect ThirteenLabs limit reached specifically
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.detail?.status === 'voice_limit_reached') {
                        return NextResponse.json({
                            error: 'Voice capacity reached (30/30). Please upgrade your ElevenLabs plan or delete unused voices.',
                            code: 'VOICE_LIMIT_REACHED'
                        }, { status: 403 });
                    }
                } catch (e) { }

                return NextResponse.json({ error: 'Failed to clone voice' }, { status: 500 });
            }

            const cloneJson = await cloneRes.json();
            voiceId = cloneJson.voice_id;

            // Save the clone to the user
            await prisma.user.update({
                where: { id: user.id },
                data: { voice_model_id: voiceId }
            });
        }

        // 2. Generate Story Audio
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApi
            },
            body: JSON.stringify({
                text: textToRead,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                }
            })
        });

        if (!ttsRes.ok) {
            const errText = await ttsRes.text();
            console.error("ElevenLabs TTS Error:", errText);
            return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
        }

        const audioBuffer = await ttsRes.arrayBuffer();
        const historyId = ttsRes.headers.get('request-id'); // ElevenLabs request-id

        // Store rough duration (128kbps = 16KB/s)
        const durationSecs = Math.round(audioBuffer.byteLength / 16000);

        // 3. Upload to Cloudflare R2
        const bucketName = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';
        const fileKey = `user_${user.id}/story_${story.id}_${Date.now()}.mp3`;

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            Body: Buffer.from(audioBuffer),
            ContentType: 'audio/mpeg',
        }));

        const streamUrl = `/api/user/audio/stream?key=${encodeURIComponent(fileKey)}`;

        await prisma.story.update({
            where: { id: story.id },
            data: {
                status: 'audio_ready',
                audio_r2_key: fileKey,
                audio_url: streamUrl,
                audio_file_size_bytes: audioBuffer.byteLength,
                audio_duration_secs: durationSecs,
                elevenlabs_history_id: historyId,
                audio_generated_at: new Date()
            }
        });

        // Update User Usage Metrics
        await prisma.user.update({
            where: { id: user.id },
            data: {
                audio_mins_this_month: { increment: durationSecs / 60 },
                total_audio_plays: { increment: 1 } // Counting first generation as a play/intent
            }
        });

        return NextResponse.json({
            success: true,
            audioUrl: streamUrl,
            storyId: story.id,
            duration: durationSecs
        });

    } catch (e: any) {
        console.error('API /api/user/audio/generate error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
