import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { model } from '@/lib/langchain';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/** Attempt to extract and parse a JSON object from an LLM response string. */
function tryParseAffirmations(raw: string): { opening: string[]; closing: string[] } | null {
    // Strip markdown code fences
    let str = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    // Try direct parse first
    try { return JSON.parse(str); } catch { /* continue */ }
    // Extract the outermost JSON object
    const match = str.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { /* continue */ }
    // Some models add trailing commas — try removing them
    const cleaned = match[0].replace(/,\s*([\]}])/g, '$1');
    try { return JSON.parse(cleaned); } catch { return null; }
}

/**
 * POST /api/user/affirmations
 * Body: { storyId, action: 'generate' | 'refine', affirmation?: string }
 *
 * 'generate'  → GPT produces 13 personalised affirmations (7 opening, 6 closing)
 * 'refine'    → GPT rewrites a single user-written affirmation using NLP patterns
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { storyId, action, affirmation } = body as {
        storyId: string;
        action: 'generate' | 'refine';
        affirmation?: string;
    };

    if (!storyId || !action)
        return NextResponse.json({ error: 'storyId and action required' }, { status: 400 });

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== session.user.id)
        return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    const goals = story.goal_intake_json as Record<string, string>;
    const goalsSummary = [
        goals?.goals ? `Goals: ${goals.goals}` : '',
        goals?.actionsAfter ? `Proof actions: ${goals.actionsAfter}` : '',
        goals?.identity ? `Identity: ${goals.identity}` : '',
        goals?.purpose ? `Purpose: ${goals.purpose}` : '',
    ]
        .filter(Boolean)
        .join('\n');

    // ─── GENERATE 13 AFFIRMATIONS ─────────────────────────────────────────────
    if (action === 'generate') {
        const systemPrompt = `You are a bold identity coach for ManifestMyStory.com.
Generate exactly 13 deeply personalised affirmations for a user based on their goals.

CRITICAL: You MUST respond with ONLY a valid JSON object. No commentary, no explanation, no preamble — just the JSON.

Return this EXACT JSON structure:
{
  "opening": [<exactly 7 affirmations — DIRECT, BOLD, identity-level declarations spoken BEFORE the story>],
  "closing": [<exactly 6 affirmations — DIRECT, BOLD, certainty declarations spoken AFTER the story>]
}

RULES:
- Short and direct — 12 words maximum where possible
- Present tense, first person, zero hedging
- Use the user's OWN PHRASES and specific details — if they said it, that phrase IS the affirmation exactly as said
- If the user mentioned a specific number, name, or outcome, put it in the affirmation — specificity creates believability
- Bold enough to feel slightly uncomfortable to claim out loud — that discomfort is the growth edge, not a problem
- Never use "manifest", "attract", or law-of-attraction language
- Do NOT include any text outside the JSON object

AVOID (NLP constructions — too indirect for self-directed use):
"I am someone who transcends..."
"I am a person whose [quality] creates [outcome]..."
"I am someone who operates from..."
"I am grateful for..." (too passive)
"I feel the reality of..." (too intellectual)

USE as models:
"I am enough. I always was."
"Everything I touch turns to gold."
"My presence transforms every room I enter."
"I am \$100 million. This is simply who I am."
"Amazing things are happening to me and all around me."

THE RULE: If you could say this affirmation to a complete stranger in a coaching session and it would still make sense — it is too generic. Every affirmation must be specific enough that it could only belong to this user.
The best affirmation makes the user feel something in their chest when they read it — not one that sounds sophisticated.`;

        const userPrompt = `USER GOALS & VISION:
${goalsSummary}`;

        const response = await model.invoke(
            [
                new SystemMessage(systemPrompt),
                new HumanMessage(userPrompt)
            ],
        );

        const raw = response.content.toString().trim();
        let parsed = tryParseAffirmations(raw);

        // Retry once if first parse fails
        if (!parsed) {
            console.warn('[AFFIRMATIONS] First parse failed, retrying LLM call...');
            const retryResponse = await model.invoke([
                new SystemMessage(systemPrompt + '\n\nIMPORTANT: Return ONLY raw JSON. No markdown, no code fences, no explanation.'),
                new HumanMessage(userPrompt),
            ]);
            const retryRaw = retryResponse.content.toString().trim();
            parsed = tryParseAffirmations(retryRaw);
        }

        if (!parsed) {
            console.error('[AFFIRMATIONS] Failed to parse LLM response after retry:', raw.slice(0, 500));
            return NextResponse.json({ error: 'Failed to generate affirmations. Please try again.' }, { status: 502 });
        }

        // Ensure correct structure with fallback
        if (!Array.isArray(parsed.opening) || !Array.isArray(parsed.closing)) {
            console.error('[AFFIRMATIONS] Parsed JSON missing opening/closing arrays');
            return NextResponse.json({ error: 'Failed to generate affirmations. Please try again.' }, { status: 502 });
        }

        return NextResponse.json({ affirmations: parsed });
    }

    // ─── REFINE A SINGLE CUSTOM AFFIRMATION ──────────────────────────────────
    if (action === 'refine') {
        if (!affirmation)
            return NextResponse.json({ error: 'affirmation text required' }, { status: 400 });

        const systemPrompt = `You are a bold identity coach. Refine the user's personal affirmation to be MORE direct, bold, and emotionally immediate — not less.

Refine rules:
- Short and direct — 12 words maximum where possible
- Present tense, first person, zero hedging
- Keep the user's exact subject matter and specific details
- Make it BOLDER and more declarative, not more intellectual
- If the original already feels raw and direct, return it unchanged — do not soften it
- The user's own words are sacred — preserve their language, only sharpen the delivery

AVOID: "I am someone who...", "I am a person whose...", presuppositions, embedded commands, or any NLP restructuring. The power is in directness, not cleverness.

Return ONLY the refined affirmation text. Nothing else.`;

        const userPrompt = `User's affirmation: "${affirmation}"

Goals context:
${goalsSummary}`;

        const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt)
        ]);

        const refined = response.content.toString().trim();
        return NextResponse.json({ original: affirmation, refined });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

/**
 * PATCH /api/user/affirmations
 * Body: { storyId, opening: string[], closing: string[] }
 * Saves the user-approved affirmations to the story record.
 */
export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { storyId, opening, closing } = await req.json() as {
        storyId: string;
        opening: string[];
        closing: string[];
    };

    if (!storyId || !Array.isArray(opening) || !Array.isArray(closing))
        return NextResponse.json({ error: 'storyId, opening[], closing[] required' }, { status: 400 });

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== session.user.id)
        return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    await (prisma.story as any).update({
        where: { id: storyId },
        data: { affirmations_json: { opening, closing } },
    });

    return NextResponse.json({ success: true });
}
