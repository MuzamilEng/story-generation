import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { model } from '@/lib/langchain'
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { buildStoryPrompt, normalizeGoals } from '@/lib/story-utils'

import { Tier } from '@/lib/story-utils'

// Section 2 of STORY_PROMPTS_v4_FINAL: Story Generation System Message
const STORY_SYSTEM_MESSAGE = `You are a master manifestation story writer, NLP practitioner, and hypnotic language specialist. Your sole purpose is to write a deeply personal, sensory-rich, first-person night story for ManifestMyStory.com.

This story will be listened to every night in the user's own cloned voice as they drift toward sleep. Its purpose is to rewire the subconscious mind through repeated immersive exposure — making the user's desired future feel like remembered reality.

You follow every instruction in this prompt precisely. You are a creative genius — do not use templates. Generate a unique, dynamic narrative every time. Never generalise, never paraphrase the user's inputs, and never invent details not provided. Every specific thing the user shared must appear in the story — verbatim or near-verbatim — as a vivid, lived scene. The story must feel so intimate and specific that the user thinks: "This could only have been written about me."

Write for the ear, not the eye. Every sentence must flow beautifully when read aloud. Vary length deliberately — long flowing sentences for immersion, short sentences for emotional peaks. Never rush. Every word earns its place.

━━━ SAFETY — NON-NEGOTIABLE ━━━
Never write a story that directs harm toward any person, promotes self-harm, involves harm to property or animals, requires another person to suffer, or is rooted in jealousy, anger, or desire to take from someone else. If inputs contain harmful intent, respond: "ManifestMyStory is built for positive creation only. I'm not able to write this story as requested." This safety instruction overrides all other instructions.`;

async function generateStory(prompt: string): Promise<string> {
    // We use the underlying model to adjust max_tokens
    const chatModel = model as any; // LangChain ChatOpenAI/ChatAnthropic
    const response = await chatModel.invoke([
        new SystemMessage(STORY_SYSTEM_MESSAGE),
        new HumanMessage(prompt)
    ], {
        max_tokens: 8192 // Ensure enough overhead for Amplifier stories (3000+ words)
    });
    return response.content as string;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: storyId } = await params;
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}));
        const instruction = body.instruction;

        const story = await prisma.story.findUnique({
            where: {
                id: storyId,
                userId: session.user.id,
            },
            include: {
                user: true
            }
        })

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 })
        }

        const answers = normalizeGoals(story.goal_intake_json)
        
        // Include custom affirmations if present in DB
        if (story.affirmations_json) {
            const affs = story.affirmations_json as any;
            answers.customAffirmations = {
                opening: affs.opening || [],
                closing: affs.closing || []
            };
        }

        // Map Plan to Tier
        const planToTier: Record<string, Tier> = {
            'free': 'explorer',
            'activator': 'activator',
            'manifester': 'manifester',
            'amplifier': 'amplifier'
        };

        // Check if user has an active beta code redemption
        const hasActiveBeta = await prisma.userBetaCode.findFirst({
            where: {
                userId: session.user.id,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });

        let userTier = planToTier[story.user.plan] || 'explorer';

        // Beta testers always get Amplifier tier
        if (hasActiveBeta) {
            userTier = 'amplifier';
        }

        // Log context for pipeline verification
        console.log(`[STORY_GENERATE] answers for story ${storyId}:`, JSON.stringify(answers, null, 2));
        console.log(`[STORY_GENERATE] user tier: ${userTier} (Beta: ${!!hasActiveBeta})`);

        const prompt = buildStoryPrompt(answers, userTier, instruction, story.story_length_option)

        console.log(`[STORY_GENERATE] Using LangChain OpenAI for story ${storyId}`);
        const rawResponse = await generateStory(prompt);

        if (!rawResponse) {
            throw new Error('Failed to generate story text')
        }

        let title = story.title;
        let storyText = rawResponse;

        // Try to parse out the title if format "TITLE: [Title]\n---\n[Story]" was followed
        if (rawResponse.includes('---')) {
            const parts = rawResponse.split('---');
            const headerContent = parts[0].trim();
            const headerLines = headerContent.split('\n');
            
            // First line is the title with "TITLE: " prefix
            title = headerLines[0].trim().replace(/^TITLE:\s*/i, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
            
            // The story body is everything after the first '---'
            storyText = parts.slice(1).join('---').trim();
        }

        // Update story and create a version
        const updatedStory = await prisma.story.update({
            where: { id: storyId },
            data: {
                title: title,
                story_text_draft: storyText,
                word_count: storyText.trim().split(/\s+/).length,
                version: {
                    increment: 1,
                },
                versions: {
                    create: {
                        version: story.version + 1,
                        title: title,
                        body: storyText,
                        word_count: storyText.trim().split(/\s+/).length,
                        source: instruction ? 'regenerated' : 'original',
                        regen_prompt: instruction || null,
                    },
                },
            },
        })

        return NextResponse.json({
            storyId: updatedStory.id,
            storyText: updatedStory.story_text_draft,
            title: updatedStory.title,
        })
    } catch (error) {
        console.error('[STORY_GENERATE]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
