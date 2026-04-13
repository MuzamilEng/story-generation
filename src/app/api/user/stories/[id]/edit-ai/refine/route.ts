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
        const { questions, answers, refinementNotes } = await req.json();

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

        let userFeedbackText = '';

        if (refinementNotes) {
            userFeedbackText = `REFINEMENT NOTES:\n${refinementNotes}`;
        } else if (questions && answers) {
            const qaPairs = questions.map((q: string, i: number) => ({
                question: q,
                answer: answers[i]?.trim() || ''
            }));

            // Separate the three types of feedback
            const corrections = qaPairs[0]?.answer ? `CORRECTIONS / INACCURACIES TO FIX:\nQ: ${qaPairs[0].question}\nA: ${qaPairs[0].answer}` : '';
            const enhancements = qaPairs[1]?.answer ? `ADDITIONS / ENHANCEMENTS REQUESTED:\nQ: ${qaPairs[1].question}\nA: ${qaPairs[1].answer}` : '';
            const gapAndExtra = qaPairs.slice(2).filter((p: { question: string, answer: string }) => p.answer).map((p: { question: string, answer: string }) => `Q: ${p.question}\nA: ${p.answer}`).join('\n\n');
            
            userFeedbackText = [corrections, enhancements, gapAndExtra].filter(Boolean).join('\n\n');
        }

        const refinementPrompt = `
You are a master manifestation story writer revising an existing personal story.
Your task is to produce a refined version of the story below, incorporating the user's feedback.

ORIGINAL GOALS:
${JSON.stringify(goals)}

CURRENT STORY DRAFT:
"""
${story.story_text_draft}
"""

━━━ USER FEEDBACK ━━━

${userFeedbackText}

INSTRUCTION: Carefully integrate all feedback into the narrative. Correct any inaccuracies, add requested details, and ensure the tone remains consistent with the user's vision.

━━━ WRITING RULES ━━━
- First person, present tense throughout.
- Flowing prose only — no headings, bullets, or section labels.
- Keep the story approximately ${Math.min(story.word_count || 1000, 3000)} words. Do not significantly shorten or pad it.
- HARD LIMIT: The story must NEVER exceed 3000 words.
- Every response must include a Title on the first line, followed by '---' on a new line, followed by the Story Text.
- Every change must serve the user's vision. Do not introduce new details that were not provided or implied.

Return the result in exactly this format:
[Short Dynamic Title]
---
[Full Story Text]
`;

        const response = await model.invoke([
            new SystemMessage('You are a gifted manifestation and memoir story writer.'),
            new HumanMessage(refinementPrompt)
        ]);

        const rawResponse = response.content as string;

        if (!rawResponse) {
            throw new Error('LangChain failed to refine story text')
        }

        let title = story.title;
        let storyText = rawResponse;

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
                        source: 'regenerated',
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
        console.error('[AI_EDIT_REFINE]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
