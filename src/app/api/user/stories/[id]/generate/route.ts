import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invokeWithFallback } from '@/lib/langchain'
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { buildStoryPrompt, buildMorningStoryPrompt, normalizeGoals, getStoryTitle } from '@/lib/story-utils'
import { betaTypeToPlan } from '@/lib/beta-utils'

import { Tier } from '@/lib/story-utils'

// Section 2 of STORY_PROMPTS_v4_FINAL: Story Generation System Message
const BASE_SYSTEM_MESSAGE_NIGHT = `You are a master manifestation story writer, NLP practitioner, and hypnotic language specialist. Your sole purpose is to write a deeply personal, sensory-rich, first-person night story for ManifestMyStory.com.

This story will be narrated in the user's own voice. Its goal is to rewrite the subconscious mind by making the desired future feel already present.

━━━ CORE QUALITY RULES ━━━
1. CINEMATIC SENSORY DEPTH: Use all five senses in every scene.
2. VERBATIM RULE: Use the user's exact words for goals and proof actions.
3. NLP PATTERNS: Weave in embedded commands, presuppositions, and identity statements.
4. FLOW: Write for the ear. No bullets. No headers. Pure, unhurried literary prose.
5. NO TITLE: Do not generate a title. The system names stories automatically.

━━━ SAFETY ━━━
ManifestMyStory is for positive creation only. Harmful intent = "ManifestMyStory is built for positive creation only. I'm not able to write this story as requested."`;

const BASE_SYSTEM_MESSAGE_MORNING = `You are a master manifestation story writer, NLP practitioner, and morning activation specialist. Your sole purpose is to write a deeply personal, sensory-rich, first-person MORNING story for ManifestMyStory.com.

This story will be narrated in the user's own voice and listened to upon waking. Its goal is to prime the subconscious mind for the day — making the desired future feel like the life they are stepping into right now.

THIS IS A MORNING STORY. No sleep language. No hypnotic induction. No theta / staircase / descent. Energy is rising and activating.

━━━ CORE QUALITY RULES ━━━
1. CINEMATIC SENSORY DEPTH: Use all five senses in every scene.
2. VERBATIM RULE: Use the user's exact words for goals and proof actions.
3. NLP PATTERNS: Weave in embedded commands, presuppositions, and identity statements.
4. FLOW: Write for the ear. No bullets. No headers. Pure, unhurried literary prose.
5. NO TITLE: Do not generate a title. The system names stories automatically.

━━━ SAFETY ━━━
ManifestMyStory is for positive creation only. Harmful intent = "ManifestMyStory is built for positive creation only. I'm not able to write this story as requested."`;

function getSystemMessage(tier: Tier, targetLength?: string | null, storyType: string = 'night'): string {
    const lengthMultipliers: Record<string, number> = { 'short': 0.6, 'medium': 1.0, 'long': 1.5, 'epic': 2.2 };
    let multiplier = (targetLength && lengthMultipliers[targetLength]) ? lengthMultipliers[targetLength] : 1.0;
    
    // Explorer tier is strictly capped at 'medium' length (~750 words) to prevent over-generation on free accounts
    if (tier === 'explorer' && multiplier > 1.0) {
        multiplier = 1.0;
    }

    const MAX_WORDS = 3000;
    const targets: Record<Tier, number> = {
        explorer: Math.round(750 * multiplier),
        activator: Math.round(1200 * multiplier),
        manifester: Math.round(2000 * multiplier),
        amplifier: Math.round(3500 * multiplier)
    };

    const targetWc = Math.min(targets[tier], MAX_WORDS);
    const baseMessage = storyType === 'morning' ? BASE_SYSTEM_MESSAGE_MORNING : BASE_SYSTEM_MESSAGE_NIGHT;

    return `${baseMessage}

━━━ CRITICAL LENGTH INSTRUCTION — HIGH PRIORITY ━━━
This user is on the ${tier.toUpperCase()} tier. 
You MUST provide a full, unhurried, and deeply detailed experience that matches this premium tier.
The target length is exactly ${targetWc} words. 
Do NOT summarize. Do NOT rush the ending.
Your quality is measured by your ability to reach this word count through cinematic expansion and sensory depth. 
Short outputs (fewer than ${Math.round(targetWc * 0.9)} words) are considered a failure of the manifestation experience. 
Luxuriate in the scenes. Expand the textures, the scents, and the unhurried internal dialogue of the achieved life.`;
}

async function generateStory(prompt: string, systemMessage: string): Promise<string> {
    const response = await invokeWithFallback([
        new SystemMessage(systemMessage),
        new HumanMessage(prompt)
    ], { primaryRetries: 3 });
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
            'manifestor': 'manifester', // handles common typo
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
            },
            include: { betaCode: { select: { type: true } } }
        });

        const rawPlan = String(story.user.plan || 'free').toLowerCase();
        let userTier = planToTier[rawPlan] || 'explorer';

        // Beta testers get tier from their beta code type
        if (hasActiveBeta) {
            const betaPlan = betaTypeToPlan((hasActiveBeta as any).betaCode?.type || 'amplifier_2_months');
            userTier = planToTier[betaPlan] || 'amplifier';
        }

        // Log context for pipeline verification
        console.log(`[STORY_GENERATE] answers for story ${storyId}:`, JSON.stringify(answers, null, 2));
        console.log(`[STORY_GENERATE] user tier: ${userTier} (Beta: ${!!hasActiveBeta})`);

        // Determine story type and use appropriate prompt builder
        const storyType = (story as any).story_type || 'night';
        let nightStoryText: string | undefined;
        if (storyType === 'morning') {
            const latestNight = await prisma.story.findFirst({
                where: { userId, story_type: 'night', story_text_draft: { not: null } },
                orderBy: { createdAt: 'desc' },
                select: { story_text_draft: true },
            });
            nightStoryText = (latestNight?.story_text_draft as string) || undefined;
        }
        const prompt = storyType === 'morning'
            ? buildMorningStoryPrompt(answers, userTier, instruction, story.story_length_option, new Date().toISOString(), nightStoryText)
            : buildStoryPrompt(answers, userTier, instruction, story.story_length_option, new Date().toISOString());
        const systemMessage = getSystemMessage(userTier, story.story_length_option, storyType);

        console.log(`[STORY_GENERATE] Using LangChain GPT-4o-2024-08-06 for ${storyType} story ${storyId}`);
        const rawResponse = await generateStory(prompt, systemMessage);

        if (!rawResponse) {
            throw new Error('Failed to generate story text')
        }

        // System-generated title — no AI title parsing
        const title = story.title;
        let storyText = rawResponse;

        // Strip the --- separator if the model still outputs one
        if (rawResponse.includes('---')) {
            const parts = rawResponse.split('---');
            const headerContent = parts[0].trim();
            // If what's before --- looks like a title line (short, single line), skip it
            if (headerContent.split('\n').length <= 2 && headerContent.length < 200) {
                storyText = parts.slice(1).join('---').trim();
            }
        }

        // Strip any technical or artifact headings that the model may output
        storyText = storyText
            .replace(/^(?:STORY|INTRO|CONCLUSION|MANIFESTATION STORY|OUR PERSONAL MANIFESTATION STORY|SECTION \d+)\s*\n+/gi, '')
            .replace(/\n+(?:STORY|INTRO|CONCLUSION|MANIFESTATION STORY|OUR PERSONAL MANIFESTATION STORY|SECTION \d+)\s*\n+/gi, '\n\n· · ·\n\n')
            .replace(/\*\*(.*?)\*\*/g, '$1') // Strip bold
            .replace(/\*(.*?)\*/g, '$1')   // Strip italic
            .trim();

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
