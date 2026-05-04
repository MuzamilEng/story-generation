import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invokeWithFallback } from '@/lib/langchain'
import { normalizeGoals } from '@/lib/story-utils'
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

        if (!story || !story.story_text_draft) {
            return NextResponse.json({ error: 'Story or draft not found' }, { status: 404 })
        }

        const goals = normalizeGoals(story.goal_intake_json)

        const analysisPrompt = `
You are an expert manifestation story editor.
Review the following goals and the manifestation story written from them.

USER'S ORIGINAL GOALS:
${JSON.stringify(goals, null, 2)}

CURRENT STORY DRAFT:
"""
${story.story_text_draft}
"""

GOAL: The user has already been asked whether anything feels inaccurate and whether anything can be added to make the story feel more realistic. Your job is to go deeper.
Identify 2-3 specific sensory, emotional, or situational gaps in the story — places where more vivid personal detail would make this feel like a fully lived-in memory.
Ask the user 2-3 targeted, warm, personal follow-up questions to fill those exact gaps.
Do NOT ask about accuracy or general additions — those are already covered.

Return ONLY a JSON array of 2-3 strings (the questions).
Do not include any preamble, analysis, or wrap-up. JSON format only.
Example: ["Question 1", "Question 2"]
`;

        const response = await invokeWithFallback([
            new SystemMessage('You are a professional story editor specializing in manifestation narratives.'),
            new HumanMessage(analysisPrompt)
        ]);

        const rawContent = response.content as string;
        // Clean markdown if AI included it
        const cleanContent = rawContent.replace(/```json|```/g, '').trim();

        try {
            const questions = JSON.parse(cleanContent);
            return NextResponse.json({ questions });
        } catch (e) {
            console.error('[AI_EDIT_QUESTIONS_PARSE]', e, cleanContent);
            return NextResponse.json({ error: 'Failed to parse AI questions' }, { status: 500 });
        }

    } catch (error) {
        console.error('[AI_EDIT_QUESTIONS]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
