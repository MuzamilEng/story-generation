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

        const qaPairs = questions.map((q: string, i: number) => ({
            question: q,
            answer: answers[i]?.trim() || ''
        }));

        // Separate the three types of feedback so the prompt can be explicit about each
        const corrections = qaPairs[0]?.answer ? `CORRECTIONS / INACCURACIES TO FIX:\nQ: ${qaPairs[0].question}\nA: ${qaPairs[0].answer}` : '';
        const enhancements = qaPairs[1]?.answer ? `ADDITIONS / ENHANCEMENTS REQUESTED:\nQ: ${qaPairs[1].question}\nA: ${qaPairs[1].answer}` : '';
        const gapAndExtra = qaPairs.slice(2).filter((p: {question: string, answer: string}) => p.answer).map((p: {question: string, answer: string}) => `Q: ${p.question}\nA: ${p.answer}`).join('\n\n');

        const refinementPrompt = `
You are a master manifestation story writer revising an existing personal story.
Your task is to produce a refined version of the story below, incorporating every piece of user feedback.

ORIGINAL GOALS:
${JSON.stringify(goals)}

CURRENT STORY DRAFT (your starting point — improve this, do not discard it):
"""
${story.story_text_draft}
"""

━━━ USER FEEDBACK ━━━

${corrections ? `${corrections}\n\nINSTRUCTION: Any detail the user says feels untrue, inaccurate, or wrong MUST be corrected or removed. Do not soften or keep anything flagged as inaccurate.\n` : ''}
${enhancements ? `${enhancements}\n\nINSTRUCTION: Weave every requested addition naturally into the narrative. These additions should feel seamless — not bolted on.\n` : ''}
${gapAndExtra ? `ADDITIONAL DETAILS & GAP-FILLING:\n${gapAndExtra}\n\nINSTRUCTION: Integrate these details to add sensory richness and personal nuance. Use the user's own words and imagery where possible.\n` : ''}

━━━ WRITING RULES ━━━
- First person, present tense throughout.
- Flowing prose only — no headings, bullets, or section labels.
- Keep the story approximately ${story.word_count || 1000} words. Do not significantly shorten or pad it.
- Start directly with the first line of the story — no title, no preamble.
- Every change must serve the user's vision. Do not introduce new details that were not provided or implied.

Return ONLY the revised story text.
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
