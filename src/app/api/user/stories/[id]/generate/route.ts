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
        const prompt = buildStoryPrompt(goals)

        console.log(`[STORY_GENERATE] Prompt for story ${storyId}:`, prompt);

        const response = await model.invoke([
            new SystemMessage('You are a gifted memoir and manifestation story writer.'),
            new HumanMessage(prompt)
        ]);

        const storyText = response.content as string;

        if (!storyText) {
            throw new Error('LangChain failed to generate story text')
        }

        // Update story and create a version
        const updatedStory = await prisma.story.update({
            where: { id: storyId },
            data: {
                story_text_draft: storyText,
                word_count: storyText.trim().split(/\s+/).length,
                version: {
                    increment: 1,
                },
                versions: {
                    create: {
                        version: story.version + 1,
                        title: story.title,
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
        })
    } catch (error) {
        console.error('[STORY_GENERATE_LANGCHAIN]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
