import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { model } from '@/lib/langchain'
import { normalizeGoals } from '@/lib/story-utils'
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: storyId } = await params;
        const { questions, answers } = await req.json();

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

        if (!story || !story.story_text_draft) {
            return NextResponse.json({ error: 'Story or draft not found' }, { status: 404 })
        }

        const goals = normalizeGoals(story.goal_intake_json)

        const refinementPrompt = `
You are a master manifestation story writer.
You are helping the user refine a personalized manifestion story based on new, specific details they've just provided.

ORIGINAL GOALS:
${JSON.stringify(goals)}

CURRENT STORY DRAFT:
"""
${story.story_text_draft}
"""
NEW REFLECTIVE DETAILS (Answers from the user to specific personalized questions):
${questions.map((q: string, i: number) => `Q: ${q}\nA: ${answers[i] || 'N/A'}`).join('\n\n')}

GOAL: Regenerate the story to be around 10% more specific, immersive, and sensory.
Interweave these new reflective details naturally into the narrative.
Ensure the story is still in first person, present tense, and emotionally potent.

Keep the length around the same as before (${story.word_count || 1000} words), but improve the depth.
No chapter headings, section labels, preamble, or title.
Return ONLY the story text.
`;

        const response = await model.invoke([
            new SystemMessage('You are a gifted manifestation and memoir story writer.'),
            new HumanMessage(refinementPrompt)
        ]);

        const refinedStoryText = response.content as string;

        if (!refinedStoryText) {
            throw new Error('LangChain failed to refine story text')
        }

        // Update story and create a version
        const updatedStory = await prisma.story.update({
            where: { id: storyId },
            data: {
                story_text_draft: refinedStoryText,
                word_count: refinedStoryText.trim().split(/\s+/).length,
                version: {
                    increment: 1,
                },
                versions: {
                    create: {
                        version: story.version + 1,
                        title: story.title,
                        body: refinedStoryText,
                        word_count: refinedStoryText.trim().split(/\s+/).length,
                        source: 'regenerated',
                    },
                },
            },
        })

        return NextResponse.json({
            storyId: updatedStory.id,
            storyText: updatedStory.story_text_draft,
        })

    } catch (error) {
        console.error('[AI_EDIT_REFINE]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
