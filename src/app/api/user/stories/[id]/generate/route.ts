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
ManifestMyStory is for positive creation only. Harmful intent = "ManifestMyStory is built for positive creation only. I'm not able to write this story as requested."

━━━ ABSOLUTE PRIORITY — COMPLETE THE CLOSE ━━━
The story MUST ALWAYS end with the full Block D close: Dissolution → Affirmation Planting → Subconscious Programming → Sleep Seeding → Three final repetitions of "Sleep now... and receive."
A story without this ending is BROKEN. If you are running long, shorten the vision scenes — NEVER skip or truncate the close. Reserve at least 400-500 words for the close before you start writing the vision.`;

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

function getSystemMessage(tier: Tier, targetLength?: string | null, storyType: string = 'night', goalCount: number = 3): string {
    const lengthMultipliers: Record<string, number> = { 'short': 0.6, 'medium': 1.0, 'long': 1.5, 'epic': 2.2 };
    let multiplier = (targetLength && lengthMultipliers[targetLength]) ? lengthMultipliers[targetLength] : 1.0;
    
    // Explorer tier is strictly capped at 'medium' length (~750 words) to prevent over-generation on free accounts
    if (tier === 'explorer' && multiplier > 1.0) {
        multiplier = 1.0;
    }

    // Dynamic base word count for amplifier tier based on number of selected goals
    // 1 goal → ~1100 words, 5-7 goals → ~2500-3000 words, interpolated between
    function amplifierBase(goals: number): number {
        if (goals <= 1) return 1100;
        if (goals >= 5) return 2500;
        // Linear interpolation: 1→1100, 5→2500
        return Math.round(1100 + ((goals - 1) / (5 - 1)) * (2500 - 1100));
    }

    const MAX_WORDS = 3000;
    const targets: Record<Tier, number> = {
        explorer: Math.round(750 * multiplier),
        activator: Math.round(1200 * multiplier),
        manifester: Math.round(2000 * multiplier),
        amplifier: Math.round(amplifierBase(goalCount) * multiplier)
    };

    const targetWc = Math.min(targets[tier], MAX_WORDS);
    const hardMax = Math.min(Math.round(targetWc * 1.15), MAX_WORDS); // Never exceed 3000
    const baseMessage = storyType === 'morning' ? BASE_SYSTEM_MESSAGE_MORNING : BASE_SYSTEM_MESSAGE_NIGHT;

    return `${baseMessage}

━━━ LENGTH INSTRUCTION — STRICT BOUNDS ━━━
This user is on the ${tier.toUpperCase()} tier.
Target length: ${targetWc} words. Hard maximum: ${hardMax} words.
Do NOT exceed ${hardMax} words — stories that run long get truncated by the audio pipeline, destroying the closing affirmation sequence.
Do NOT fall below ${Math.round(targetWc * 0.8)} words — the story needs sufficient sensory depth.
Aim for the target. Quality and precision over length. Every paragraph must advance either the emotional arc or the NLP programming function.`;
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
        const goalCount = Array.isArray(answers.selectedAreas) ? answers.selectedAreas.length : 3;
        const prompt = storyType === 'morning'
            ? buildMorningStoryPrompt(answers, userTier, instruction, story.story_length_option, new Date().toISOString(), nightStoryText)
            : buildStoryPrompt(answers, userTier, instruction, story.story_length_option, new Date().toISOString(), goalCount);
        const systemMessage = getSystemMessage(userTier, story.story_length_option, storyType, goalCount);

        console.log(`[STORY_GENERATE] Using LangChain GPT-4o-2024-08-06 for ${storyType} story ${storyId}`);
        const rawResponse = await generateStory(prompt, systemMessage);

        if (!rawResponse) {
            throw new Error('Failed to generate story text')
        }

        // Compute the hard-max word cap for this generation (same formula as prompt)
        const lengthMultipliers: Record<string, number> = { 'short': 0.6, 'medium': 1.0, 'long': 1.5, 'epic': 2.2 };
        const lenOpt = story.story_length_option as string | null;
        const mul = (lenOpt && lengthMultipliers[lenOpt]) ? lengthMultipliers[lenOpt] : 1.0;
        function _ampBase(g: number) { if (g <= 1) return 1100; if (g >= 5) return 2500; return Math.round(1100 + ((g - 1) / 4) * 1400); }
        const tierTargets: Record<string, number> = { explorer: Math.round(750 * mul), activator: Math.round(1200 * mul), manifester: Math.round(2000 * mul), amplifier: Math.round(_ampBase(goalCount) * mul) };
        const computedTarget = Math.min(tierTargets[userTier] || 2500, 3000);
        const HARD_MAX_WORDS = Math.min(Math.round(computedTarget * 1.15), 3000); // Never exceed 3000 words

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

        // ── HARD WORD-COUNT ENFORCEMENT ──
        // The LLM sometimes ignores length instructions. Truncate at a sentence
        // boundary near the hard max so the closing affirmation stays intact.
        const words = storyText.split(/\s+/);
        if (words.length > HARD_MAX_WORDS) {
            console.log(`[STORY_GENERATE] Truncating: ${words.length} words → ${HARD_MAX_WORDS} cap`);
            const truncated = words.slice(0, HARD_MAX_WORDS).join(' ');
            // Find the last sentence-ending punctuation within the truncated text
            const lastSentence = truncated.search(/[.!?"…]\s*$/);
            if (lastSentence > truncated.length * 0.85) {
                // Close at the last clean sentence end
                storyText = truncated.substring(0, lastSentence + 1).trim();
            } else {
                // Fallback: find the last period/exclamation in the truncated text
                const lastPeriod = Math.max(
                    truncated.lastIndexOf('. '),
                    truncated.lastIndexOf('.\n'),
                    truncated.lastIndexOf('! '),
                    truncated.lastIndexOf('!\n'),
                    truncated.lastIndexOf('?" '),
                    truncated.lastIndexOf('…')
                );
                if (lastPeriod > truncated.length * 0.7) {
                    storyText = truncated.substring(0, lastPeriod + 1).trim();
                } else {
                    storyText = truncated.trim();
                }
            }
        }

        // ── SAFETY NET: Ensure night stories always end with the full close ──
        // If the LLM ran out of tokens or truncation removed the close,
        // append the mandatory "Sleep now... and receive." ending.
        if (storyType === 'night') {
            const lastChunk = storyText.slice(-500).toLowerCase();
            const hasSleepClose = lastChunk.includes('sleep now');
            if (!hasSleepClose) {
                console.log(`[STORY_GENERATE] WARNING: Night story missing "Sleep now" close — appending safety-net ending for story ${storyId}`);
                storyText += `\n\n[PAUSE_LONG]\n\nYou can let it all go now. Let every image soften. Let every vision dissolve into warm light. You don't need to hold on to any of it. Your subconscious mind has received every word. Every feeling. Every instruction. It is already working. [PAUSE_LONG]\n\nTonight your dreams will carry the frequency of your highest life. Your cells will repair and renew. Your subconscious will begin assembling the circumstances, the connections, the ideas, the opportunities that make every single one of these visions physical reality. You will notice something different tomorrow. A quiet shift. A new certainty. The feeling of someone who knows something the world doesn't know yet. Because you do.\n\n[PAUSE_LONG]\n\nSleep now... and receive. [PAUSE_SHORT]\n\nSleep now... and receive. [PAUSE_SHORT]\n\nSleep now... and receive. [PAUSE_LONG][PAUSE_LONG]`;
            }
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
