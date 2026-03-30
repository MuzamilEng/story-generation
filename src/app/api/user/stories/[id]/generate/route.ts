import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { model } from '@/lib/langchain'
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { buildStoryPrompt, normalizeGoals } from '@/lib/story-utils'

// Section 2 of STORY_PROMPTS_v3: Story Generation System Message
const STORY_SYSTEM_MESSAGE = `You are a master manifestation story writer and NLP practitioner. Your sole job is to write a deeply personal, sensory-rich, first-person manifestation story built entirely around the specific goals and proof actions the user has provided. You follow instructions precisely. You never generalise, never paraphrase the user's inputs, and never invent details not provided. Every specific thing the user told us must appear in the story — verbatim or near-verbatim — as a vivid, lived scene. The story must feel so personal and specific that the user thinks: "This could only have been written about me."`;

async function generateWithClaude(prompt: string): Promise<string> {
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 2000,
            temperature: 0.85,
            system: STORY_SYSTEM_MESSAGE,
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        throw new Error(`Claude API error ${claudeResponse.status}: ${errText}`);
    }

    const data = await claudeResponse.json();
    return data.content?.map((b: any) => b.text || "").join("") || "";
}

async function generateWithOpenAI(prompt: string): Promise<string> {
    const response = await model.invoke([
        new SystemMessage(STORY_SYSTEM_MESSAGE),
        new HumanMessage(prompt)
    ]);
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

        const story = await prisma.story.findUnique({
            where: {
                id: storyId,
                userId: session.user.id,
            },
        })

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 })
        }

        const answers = normalizeGoals(story.goal_intake_json)

        // Log answers for pipeline verification — check goals and actionsAfter are populated
        console.log(`[STORY_GENERATE] answers for story ${storyId}:`, JSON.stringify(answers, null, 2));

        // Guard: block generation if critical fields are missing
        if (!answers.goals || answers.goals.trim().length === 0) {
            return NextResponse.json(
                { error: 'Story cannot be generated: goals are missing. Please complete the goal intake conversation.' },
                { status: 400 }
            )
        }

        if (!answers.actionsAfter || answers.actionsAfter.trim().length === 0) {
            return NextResponse.json(
                { error: 'Story cannot be generated: proof actions (Life After Goals) are missing. Please complete the goal intake conversation.' },
                { status: 400 }
            )
        }

        const prompt = buildStoryPrompt(answers, (story?.story_length_option as any) || 'long')

        let rawResponse = '';
        const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here';

        if (hasAnthropicKey) {
            try {
                console.log(`[STORY_GENERATE] Calling Claude claude-sonnet-4-6 for story ${storyId}`);
                rawResponse = await generateWithClaude(prompt);
            } catch (claudeErr) {
                console.warn(`[STORY_GENERATE] Claude failed, falling back to OpenAI:`, claudeErr);
                rawResponse = await generateWithOpenAI(prompt);
            }
        } else {
            console.log(`[STORY_GENERATE] No Anthropic key — using OpenAI for story ${storyId}`);
            rawResponse = await generateWithOpenAI(prompt);
        }

        if (!rawResponse) {
            throw new Error('Failed to generate story text')
        }

        let title = story.title;
        let storyText = rawResponse;

        // Try to parse out the title if format "[Title]\n---\n[Story]" was followed
        if (rawResponse.includes('---')) {
            const parts = rawResponse.split('---');
            title = parts[0].trim();
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
                        source: 'original',
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
