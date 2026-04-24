import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { invokeWithFallback } from '@/lib/langchain';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildMorningStoryPrompt, normalizeGoals, getStoryTitle, Tier } from '@/lib/story-utils';
import { betaTypeToPlan } from '@/lib/beta-utils';
import { appLog } from '@/lib/app-logger';

const MORNING_SYSTEM_MESSAGE = `You are a master manifestation story writer, NLP practitioner, and morning activation specialist. Your sole purpose is to write a deeply personal, sensory-rich, first-person MORNING story for ManifestMyStory.com.

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

function getMorningSystemMessage(tier: Tier, targetLength?: string | null): string {
    const lengthMultipliers: Record<string, number> = { 'short': 0.6, 'medium': 1.0, 'long': 1.5, 'epic': 2.2 };
    let multiplier = (targetLength && lengthMultipliers[targetLength]) ? lengthMultipliers[targetLength] : 1.0;
    if (tier === 'explorer' && multiplier > 1.0) multiplier = 1.0;

    const MAX_WORDS = 3000;
    const targets: Record<Tier, number> = {
        explorer: Math.round(750 * multiplier),
        activator: Math.round(1200 * multiplier),
        manifester: Math.round(2000 * multiplier),
        amplifier: Math.round(3500 * multiplier),
    };
    const targetWc = Math.min(targets[tier], MAX_WORDS);

    return `${MORNING_SYSTEM_MESSAGE}

━━━ CRITICAL LENGTH INSTRUCTION — HIGH PRIORITY ━━━
This user is on the ${tier.toUpperCase()} tier.
You MUST provide a full, unhurried, and deeply detailed morning activation experience.
Target length: ${targetWc} words.
Do NOT summarize. Do NOT rush.
Short outputs (fewer than ${Math.round(targetWc * 0.9)} words) are considered a failure.`;
}

/**
 * POST /api/user/stories/morning
 * 
 * Generate a morning story from the user's saved intake data.
 * No new intake required — uses the IntakeSnapshot saved from night story approval.
 */
export async function POST(req: NextRequest) {
    let sessionUserId: string | undefined;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        sessionUserId = session.user.id;

        const userId = session.user.id;

        // 1. Load saved intake snapshot — or fall back to most recent night story's intake data
        let snapshot = await (prisma as any).intakeSnapshot.findUnique({
            where: { userId },
        });

        if (!snapshot?.answers_json) {
            // Fallback: grab intake data from the user's most recent night story
            const latestNightStory = await prisma.story.findFirst({
                where: { userId, story_type: 'night' },
                orderBy: { createdAt: 'desc' },
                select: { goal_intake_json: true },
            });

            if (!latestNightStory?.goal_intake_json) {
                return NextResponse.json(
                    { error: 'No intake data found. Please complete a Night Story first.' },
                    { status: 400 }
                );
            }

            // Save the snapshot for future use
            snapshot = await (prisma as any).intakeSnapshot.upsert({
                where: { userId },
                update: { answers_json: latestNightStory.goal_intake_json },
                create: { userId, answers_json: latestNightStory.goal_intake_json },
            });
        }

        // 2. Determine user tier
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, plan: true },
        });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const planToTier: Record<string, Tier> = {
            free: 'explorer',
            activator: 'activator',
            manifester: 'manifester',
            manifestor: 'manifester',
            amplifier: 'amplifier',
        };

        const hasActiveBeta = await prisma.userBetaCode.findFirst({
            where: {
                userId,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            include: { betaCode: { select: { type: true } } },
        });

        const rawPlan = String(user.plan || 'free').toLowerCase();
        let userTier = planToTier[rawPlan] || 'explorer';
        if (hasActiveBeta) {
            const betaPlan = betaTypeToPlan((hasActiveBeta as any).betaCode?.type || 'amplifier_2_months');
            userTier = planToTier[betaPlan] || 'amplifier';
        }

        // 3. Plan gating
        const { checkPlanGating } = await import('@/lib/plan-gating');
        const gating = await checkPlanGating(userId, 'create_story');
        if (!gating.allowed) {
            return NextResponse.json({ error: gating.message }, { status: 403 });
        }

        // 4. Compute next morning story number
        const morningCount = await prisma.story.count({
            where: { userId, story_type: 'morning' },
        });
        const storyNumber = morningCount + 1;
        const title = getStoryTitle('morning', storyNumber);

        // 5. Create the story record
        const story = await prisma.story.create({
            data: {
                userId,
                title,
                story_type: 'morning',
                story_number: storyNumber,
                status: 'draft',
                goal_intake_json: snapshot.answers_json,
                story_length_option: 'medium',
            },
        } as any);

        // Increment counts
        await prisma.user.update({
            where: { id: userId },
            data: {
                total_stories_ever: { increment: 1 },
                stories_this_month: { increment: 1 },
            },
        });

        // 6. Fetch the latest night story text so we can avoid repeating it
        const latestNight = await prisma.story.findFirst({
            where: { userId, story_type: 'night', story_text_draft: { not: null } },
            orderBy: { createdAt: 'desc' },
            select: { story_text_draft: true },
        });
        const nightStoryText = (latestNight?.story_text_draft as string) || undefined;

        // 7. Generate the morning story
        const answers = normalizeGoals(snapshot.answers_json);
        const prompt = buildMorningStoryPrompt(answers, userTier, undefined, 'medium', new Date().toISOString(), nightStoryText);
        const systemMessage = getMorningSystemMessage(userTier, 'medium');

        console.log(`[MORNING_STORY] Generating morning story ${story.id} for user ${userId}, tier ${userTier}`);

        const response = await invokeWithFallback(
            [new SystemMessage(systemMessage), new HumanMessage(prompt)],
            { primaryRetries: 3 }
        );
        const rawText = response.content as string;

        if (!rawText) {
            throw new Error('Failed to generate morning story text');
        }

        // Strip any leading title/separator artifact
        let storyText = rawText;
        if (storyText.includes('---')) {
            const parts = storyText.split('---');
            const headerContent = parts[0].trim();
            if (headerContent.split('\n').length <= 2 && headerContent.length < 200) {
                storyText = parts.slice(1).join('---').trim();
            }
        }

        storyText = storyText
            .replace(/^(?:STORY|INTRO|CONCLUSION|MANIFESTATION STORY|SECTION \d+)\s*\n+/gi, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .trim();

        // 7. Save text to story
        await prisma.story.update({
            where: { id: story.id },
            data: {
                story_text_draft: storyText,
                word_count: storyText.trim().split(/\s+/).length,
                version: 1,
                versions: {
                    create: {
                        version: 1,
                        title,
                        body: storyText,
                        word_count: storyText.trim().split(/\s+/).length,
                        source: 'original',
                    },
                },
            },
        });

        appLog({ level: "info", source: "api/user/stories/morning", message: `Morning story generated (${storyText.trim().split(/\s+/).length} words)`, userId: sessionUserId, meta: { storyId: story.id, wordCount: storyText.trim().split(/\s+/).length, tier: userTier } });

        return NextResponse.json({
            storyId: story.id,
            storyText,
            title,
            storyType: 'morning',
            storyNumber,
        });
    } catch (error: any) {
        console.error('[MORNING_STORY]', error);
        appLog({ level: "error", source: "api/user/stories/morning", message: `Morning story generation failed: ${error.message || error}`, userId: sessionUserId, meta: { stack: error.stack } });
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
