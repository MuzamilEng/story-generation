import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { model } from '@/lib/langchain'
import { buildStoryPrompt, UserAnswers, normalizeGoals } from '@/lib/story-utils'
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

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

        const goals = normalizeGoals(story.goal_intake_json)
        const prompt = buildStoryPrompt(goals, (story?.story_length_option as any) || 'long')

        console.log(`[STORY_GENERATE] Prompt for story ${storyId}:`, prompt);

        const response = await model.invoke([
            new SystemMessage('You are a gifted memoir and manifestation story writer.'),
            new HumanMessage(prompt)
        ]);

        const rawResponse = response.content as string;

        if (!rawResponse) {
            throw new Error('LangChain failed to generate story text')
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
        console.error('[STORY_GENERATE_LANGCHAIN]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
