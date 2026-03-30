export interface UserAnswers {
    identity: string;
    purpose: string;
    values: string;
    location: string;
    home: string;
    morning: string;
    work: string;
    people: string;
    emotions: string;
    joy: string;
    challenges: string;
    evening: string;
    reflection: string;
    dreams: string;
    categories?: string[];
    abundance?: string;
    health?: string;
    spirit?: string;
    community?: string;
    travel?: string;
    obstacle1?: string;
    proof1?: string;
    obstacle2?: string;
    proof2?: string;
    obstacle3?: string;
    proof3?: string;
    goals?: string;
    actionsAfter?: string;
    timeframe?: string;
    futureVision?: string;
    givingBack?: string;
}
export function normalizeGoals(raw: any): UserAnswers {
    if (!raw) return {} as UserAnswers;

    const normalized: any = {};
    const mapping: Record<string, keyof UserAnswers> = {
        'Identity': 'identity',
        'Who are you?': 'identity',
        'Purpose': 'purpose',
        'Why': 'purpose',
        'Mission': 'purpose',
        'Values': 'values',
        'Location': 'location',
        'Where': 'location',
        'Home': 'home',
        'Morning': 'morning',
        'Work': 'work',
        'Career': 'work',
        'Relationships': 'people',
        'People': 'people',
        'Family': 'people',
        'Feelings': 'emotions',
        'Emotions': 'emotions',
        'Core Feeling': 'emotions',
        'Abundance': 'abundance',
        'Money': 'abundance',
        'Wealth': 'abundance',
        'Health': 'health',
        'Body': 'health',
        'Fitness': 'health',
        'Spirit': 'spirit',
        'Spiritual': 'spirit',
        'Joy': 'joy',
        'Fun': 'joy',
        'Community': 'community',
        'Travel': 'travel',
        'Challenges': 'challenges',
        'Obstacles': 'challenges',
        'Evening': 'evening',
        'Reflection': 'reflection',
        'Dreams': 'dreams',
        'Obstacle': 'obstacle1',
        'Proof': 'proof1',
        'Obstacle 1': 'obstacle1',
        'Proof 1': 'proof1',
        'Obstacle 2': 'obstacle2',
        'Proof 2': 'proof2',
        'Obstacle 3': 'obstacle3',
        'Proof 3': 'proof3',
        'Goals': 'goals',
        'Actions After': 'actionsAfter',
        'ActionsAfter': 'actionsAfter',
        'Timeframe': 'timeframe',
        'Future Vision': 'futureVision',
        'Giving Back': 'givingBack',
        // Pass-through for already-normalized keys from DB re-normalization
        'goals': 'goals',
        'actionsAfter': 'actionsAfter',
        'timeframe': 'timeframe',
        'identity': 'identity',
        'purpose': 'purpose',
        'values': 'values',
        'location': 'location',
        'home': 'home',
        'morning': 'morning',
        'work': 'work',
        'people': 'people',
        'emotions': 'emotions',
        'health': 'health',
        'spirit': 'spirit',
        'community': 'community',
        'travel': 'travel',
        'challenges': 'challenges',
        'evening': 'evening',
        'reflection': 'reflection',
        'dreams': 'dreams',
        'abundance': 'abundance',
        'joy': 'joy',
        'obstacle1': 'obstacle1',
        'obstacle2': 'obstacle2',
        'obstacle3': 'obstacle3',
        'proof1': 'proof1',
        'proof2': 'proof2',
        'proof3': 'proof3',
        'futureVision': 'futureVision',
        'givingBack': 'givingBack'
    };

    const mainKeys = ['identity', 'purpose', 'location', 'emotions'];
    const auxiliaryCategories: string[] = [];

    Object.keys(raw).forEach(key => {
        const val = raw[key];
        // Use key.trim() (not toLowerCase) so already-normalized camelCase keys from DB survive re-normalization
        const normalizedKey = mapping[key] || mapping[key.trim()] || key.trim();
        normalized[normalizedKey] = val;

        // Collect auxiliary goals into categories for sidebar display
        if (!mainKeys.includes(normalizedKey) && val && typeof val === 'string' && val.length > 0) {
            // Add the display name (original key) to categories
            if (!auxiliaryCategories.includes(key)) {
                auxiliaryCategories.push(key);
            }
        }

        // Also handle explicit 'Categories' or 'Focus Areas' tags
        if (key.toLowerCase().includes('category') || key.toLowerCase().includes('focus area')) {
            if (typeof val === 'string') {
                val.split(',').forEach(s => {
                    const trimmed = s.trim();
                    if (trimmed && !auxiliaryCategories.includes(trimmed)) auxiliaryCategories.push(trimmed);
                });
            } else if (Array.isArray(val)) {
                val.forEach(v => {
                    if (v && !auxiliaryCategories.includes(v)) auxiliaryCategories.push(v);
                });
            }
        }
    });

    // Default critical fields to empty strings to avoid 'undefined' in prompt
    const criticalFields: (keyof UserAnswers)[] = [
        'identity', 'purpose', 'location', 'emotions', 'values',
        'home', 'morning', 'work', 'people', 'joy', 'evening',
        'dreams', 'challenges', 'reflection'
    ];

    criticalFields.forEach(f => {
        if (normalized[f] === undefined) normalized[f] = '';
    });

    normalized.categories = auxiliaryCategories;

    return normalized as UserAnswers;
}

export type StoryLength = 'short' | 'long';

// ── Variation anchors — each story gets a unique creative brief ──────────────

const NARRATIVE_STRUCTURES = [
    'A perfect day told through luminous, unhurried moments — sunrise to golden hour.',
    'A milestone morning when you realise, with quiet certainty, how far you have truly come.',
    'A pivotal scene — a conversation, a decision, an arrival — that crystallises everything your life has become.',
    'A purposeful stretch of time: you fully in your element, doing the work you were born to do, surrounded by the life you built.',
    'An evening of reflection — counting what your life has become, one vivid, real detail at a time.',
    'A series of five luminous snapshots from a single extraordinary ordinary day — each one a proof that it is all real.',
    'A moment of deep connection — with another person, your work, or yourself — set against the backdrop of your achieved life.',
    'A morning ritual that could only belong to the person you have chosen to become.',
    'A quiet midday pause — the world moving around you while you sit inside the life that is fully, completely yours.',
    'A celebration scene — not a party, but a private inner celebration: the moment you know, without doubt, that you made it.',
];

const EMOTIONAL_ARCS = [
    'Open with quiet wonder → build through confident, purposeful action → arrive at deep, unshakeable gratitude.',
    'Open with physical aliveness and energy → move through connection and meaning → settle into peaceful certainty.',
    'Open with calm, grounded certainty → rise through joy and creative momentum → close with triumphant stillness.',
    'Open with rich sensory presence → build through purpose and real-world impact → end with the feeling: I am exactly where I belong.',
    'Open with a moment of private pride → expand outward into a world that reflects your growth → close with full-hearted arrival.',
    'Open with ease and lightness → deepen through purpose-driven action → land in a wave of sincere gratitude and self-recognition.',
    'Open with the body — feel it first → move into the mind and its clarity → close with the soul: its peace, its knowing, its joy.',
];

const TONAL_MODES = [
    'WARMLY COACHING: Write as a voice that reminds this person what they are capable of — steady, encouraging, deeply personal. Every paragraph should leave the reader feeling more capable and certain than before.',
    'QUIETLY TRIUMPHANT: The feeling after a long climb, standing at the top, seeing everything with clarity. The tone is earned, settled pride — not loud, just wholly and solidly real.',
    'VIBRANTLY ALIVE: The story has momentum and energy. The person is in full flow — moving, creating, choosing, thriving. The reader feels the aliveness in their chest as they listen.',
    'DEEPLY NOURISHING: Like a long, slow exhale. Every sentence holds the reader, sees them, and confirms they are safe in their own life. This is the tone of someone who has done the work and arrived.',
    'RADIANTLY CONFIDENT: The person in this story knows exactly who they are. They make choices with ease and grace. They walk through their world with the quiet certainty of someone who has done the inner work and won.',
    'ENERGISING AND UPLIFTING: The story pulses with forward motion and optimism. It makes the reader want to get up, take action, and believe — with fire — in what they are becoming.',
    'TENDERLY CELEBRATORY: Like a warm hand on the shoulder. The story honours how hard this person worked and celebrates, gently but powerfully, where they have arrived.',
];

const SEASONAL_CONTEXTS = [
    'It is spring — the air carries new beginnings, everything is opening up, and possibility feels tangible.',
    'It is a warm sunny day — abundance is visible, felt in the body, present in every detail of the scene.',
    'It is autumn — the world is rich with harvest, depth, and the deep satisfaction of things that have matured.',
    'It is a clear, still winter morning — a season of inner warmth, quiet power, and settled clarity.',
    'It is an early summer evening — long golden light, a sense of fullness, the day winding down perfectly.',
    'It is a crisp bright morning — cold air, sharp focus, the world fresh and full of clean purposeful energy.',
];

const OPENING_STYLES = [
    'Begin with a single, precise sensory detail — a sound, a smell, a texture — that anchors the reader in the body immediately.',
    'Begin with an action already in motion — the person doing something, moving through their world with ease.',
    'Begin with an inner state — a feeling, a knowing, a quiet recognition of something true.',
    'Begin with the environment — describe the world around them with such specificity it feels like a memory.',
    'Begin with a breath — a single exhale of relief, contentment, or joy that sets the emotional temperature for every scene that follows.',
];

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function buildStoryPrompt(answers: UserAnswers, length: StoryLength = 'long'): string {
    let obstacleSection = '';
    const obstacles = [];
    if (answers.obstacle1) obstacles.push({ struggle: answers.obstacle1, proof: answers.proof1 || '' });
    if (answers.obstacle2) obstacles.push({ struggle: answers.obstacle2, proof: answers.proof2 || '' });
    if (answers.obstacle3) obstacles.push({ struggle: answers.obstacle3, proof: answers.proof3 || '' });

    if (obstacles.length > 0) {
        obstacleSection = `\n\n━━━ THE OBSTACLE PROOF PRINCIPLE — CRITICAL ━━━\nEach struggle below has already been overcome. Show its absence through a vivid proof moment — a scene that could ONLY exist if this struggle is completely, permanently behind them. Never name the obstacle. Never say "I used to..." Just dramatise its resolution through ease, freedom, and natural confident action.\n`;
        obstacles.forEach(o => {
            obstacleSection += `- Struggle (now resolved): "${o.struggle}"${o.proof ? ` → Proof scene: "${o.proof}"` : ''}\n`;
        });
        obstacleSection += `\nFor each proof scene: make it physical, specific, and undeniable.\n`;
    }

    const wordCountInstruction = length === 'short'
        ? '[SHORT: Target approximately 400–500 words. Zero filler. Centre entirely on the 1–2 most important goals and their proof actions.]'
        : '[LONG: Target approximately 900–1100 words. Build a fully immersive world across multiple scenes.]';

    // Pick this story's unique creative brief
    const narrativeStructure = pickRandom(NARRATIVE_STRUCTURES);
    const emotionalArc = pickRandom(EMOTIONAL_ARCS);
    const tonalMode = pickRandom(TONAL_MODES);
    const seasonalContext = pickRandom(SEASONAL_CONTEXTS);
    const openingStyle = pickRandom(OPENING_STYLES);

    const timeframe = answers.timeframe || '1 year';

    return `You are a master storyteller and NLP practitioner creating a deeply personal, transformational first-person manifestation story for ManifestMyStory.com.

This story will be narrated by an AI voice cloned from the user's own voice and listened to every morning and every night. Its purpose is to rewire the subconscious mind through repeated immersive exposure — making the user's desired future feel like remembered reality.

━━━ YOUR UNIQUE CREATIVE BRIEF FOR THIS STORY ━━━
Honour yours exactly — these parameters shape every structural and tonal decision.

NARRATIVE STRUCTURE: ${narrativeStructure}
EMOTIONAL ARC: ${emotionalArc}
TONAL MODE: ${tonalMode}
SEASONAL / ATMOSPHERIC CONTEXT: ${seasonalContext}
OPENING STYLE: ${openingStyle}

━━━ WORD COUNT & PACING ━━━
${wordCountInstruction}
- Write for the ear, not the eye — every sentence must flow beautifully when read aloud
- Vary sentence length: long flowing sentences for immersion, short sentences for emotional peaks

━━━ THE STORY CONCEPT ━━━
"A Day in Alignment With My Highest Self" — one perfect day set ${timeframe} from now.
The user's goals are ALREADY achieved. This is not the day they achieve them — this is a day deep inside the life that achievement made possible.
Open by grounding the story in time: "It is [season], ${timeframe} from where I once stood..." or a natural variation. The listener must know immediately: this is a specific future, not a vague someday.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  GOALS & PROOF ACTIONS — THE ENTIRE STORY IS BUILT ON THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These two fields are the non-negotiable foundation. Everything else is supporting detail.

SPECIFIC GOALS (already achieved — show as completely real, never as something being pursued):
${answers.goals}

LIFE AFTER GOALS — PROOF ACTIONS (the single most important field in this entire prompt):
${answers.actionsAfter}

⚠️  VERBATIM RULE — THIS IS THE MOST CRITICAL INSTRUCTION IN THIS PROMPT:
Use the user's exact words from both fields above. Do not paraphrase. Do not generalise. Do not substitute with something similar.

- If they said "pay off my Amex" — the story contains a scene where they pay off their Amex.
- If they said "take my kids to Disney" — the story contains a scene at Disney with their kids.
- If they said "buy a Tesla Model S" — the story contains a scene where they are in that Tesla.
- If they said "quit my job" — the story contains the moment they hand in their notice, or a morning that is entirely theirs.

Every single proof action the user listed must appear in the story as a vivid, physical, present-tense scene. These are not background colour. They ARE the story. The most emotionally resonant moments of the narrative must be built around them.

The proof actions must feel completely natural and effortless — not triumphant announcements. Someone truly living in this reality does not marvel at it. They simply do these things. That naturalness is what makes the subconscious accept this as identity, not fantasy.

━━━ NLP TECHNIQUE 1 — SUBMODALITY ENGINEERING ━━━
Write every scene as bright, close, vivid, and immersive — the listener is inside the moment, not watching it.
- Use all five senses in every major scene: sight, sound, smell, touch, taste
- Make the detail so specific and present that the subconscious files it as a real memory
- The old life — the struggle — is never described. Only its absence is shown through ease and naturalness.

━━━ NLP TECHNIQUE 2 — MILTON MODEL LANGUAGE PATTERNS ━━━
Weave these throughout to speak directly to the subconscious mind:

EMBEDDED COMMANDS (hide directives inside descriptive sentences):
- "...and as I notice myself moving with complete ease through the morning..."
- "...I find myself feeling deeply certain about where my life is going..."
- "...and I continue to grow into the person I always knew I was becoming..."

PRESUPPOSITIONS (assume the desired state is already true):
- "As I continue to build on everything I've created..." (presupposes creation has happened)
- "Each morning I wake into this life..." (presupposes this is the ongoing reality)

UNIVERSAL QUANTIFIERS (signal permanence to the subconscious):
- "Every morning..." / "Always..." / "Each time..." / "Whenever I..."

━━━ NLP TECHNIQUE 3 — IDENTITY-LEVEL STATEMENTS ━━━
Include 2–3 moments where the character quietly recognises who they ARE — not what they have.
These feel like private recognitions, not declarations:
- "This is simply who I am now."
- "I am someone who shows up for the life I built."
- "I have always known, somewhere, that I was capable of this."

━━━ NLP TECHNIQUE 4 — FUTURE PACING ━━━
Include one moment where the character makes a decision — effortlessly — that could ONLY be made by someone whose life has changed. A small, natural choice with enormous weight in its ease:
- They say yes to something they used to be unable to afford
- They give generously what they used to hold tightly
- They decline something they used to feel obligated to accept

${buildDynamicVision(answers)}${obstacleSection}

━━━ PERSONALIZATION IMPERATIVE ━━━
This story must be unmistakably about THIS person:
- Use their exact words, phrases, and specific details from their inputs
- Ground every scene in their specific location, home, and daily rhythms
- Never invent details not present in their inputs — if a dimension is sparse, keep it abstract

━━━ RE-LISTABILITY ━━━
This story will be listened to dozens of times:
- Include at least one moment of unexpected beauty or emotional truth
- Closing lines must be so resonant the listener carries them through their day
- Create at least one scene so specific it becomes a personal touchstone

━━━ WHAT TO AVOID ━━━
- Never use "I manifest," "I am attracting," "I am aligned," or any law-of-attraction language
- Never reference the original struggle ("I used to worry..." — never)
- No headings, bullets, or section breaks — pure flowing prose only
- Do NOT use the literal phrase "I wake up" in the opening
- Do NOT write a generic motivational speech — this must feel like a real, lived, intimate memory

Write the story now. Format your response exactly as:
[Short evocative title that reflects the heart of THIS person's specific vision]
---
[Full story text]

Begin now.`;
}

function buildDynamicVision(answers: UserAnswers): string {
    let result = '';
    const addLine = (label: string, val: string | undefined | null) => {
        if (val && val.trim().length > 0 && val.toLowerCase() !== 'not specified') {
            result += `${label}: ${val.trim()}\n`;
        }
    };

    // ── TIER 1: Goals & Proof Actions — non-negotiable story core ───────────────
    result += `\n╔══ TIER 1: GOALS & PROOF ACTIONS — NON-NEGOTIABLE STORY CORE ══╗\n`;
    result += `CRITICAL: Every item in this tier MUST appear in the story as a vivid, physical, present-tense scene built around the user's exact words. Use their exact language. Do not paraphrase.\n\n`;
    addLine('GOALS — show each as already completely real. Not pursued. Not achieved in this moment. Simply lived', answers.goals);
    addLine('LIFE AFTER GOALS / PROOF ACTIONS — the most important field. These are the specific things the user will DO because their goals are real. Build the story\'s most vivid scenes around these. Use their exact words', answers.actionsAfter);
    addLine('TIMEFRAME — open the story grounded in this specific future moment', answers.timeframe);
    addLine('GIVING BACK — show this as a natural, joyful part of their current life', answers.givingBack);
    addLine('BIGGER FUTURE VISION — the expanded horizon already visible from where they stand', answers.futureVision);
    result += `╚══ END TIER 1 ══╝\n\n`;

    // ── TIER 2: Who this person is ──────────────────────────────────────────────
    result += `╔══ TIER 2: WHO THIS PERSON IS ══╗\n`;
    result += `Use only if provided — ground the story's voice and choices in these.\n`;
    addLine('Identity', answers.identity);
    addLine('Purpose', answers.purpose);
    addLine('Values', answers.values);
    result += `╚══ END TIER 2 ══╝\n\n`;

    // ── TIER 3: Their world — sensory setting ───────────────────────────────────
    result += `╔══ TIER 3: THEIR WORLD — SENSORY SETTING ══╗\n`;
    result += `Use only what was provided — never invent details not present in the user's inputs.\n`;
    addLine('Where they live', answers.location);
    addLine('Their home', answers.home);
    addLine('Morning routine', answers.morning);
    addLine('Work / creative life', answers.work);
    addLine('Key relationships and people', answers.people);
    addLine('Emotional tone of the day', answers.emotions);
    addLine('Health & body', answers.health);
    addLine('Community & contribution', answers.community);
    addLine('Spirituality & inner life (quiet undertone, never a lecture)', answers.spirit);
    addLine('Travel and recreation', answers.travel);
    addLine('Dreams and deeper intentions', answers.dreams);
    addLine('Financial ease', answers.abundance);
    addLine('Joyful micro-moments', answers.joy);
    result += `╚══ END TIER 3 ══╝\n`;

    if (!answers.goals && !answers.actionsAfter) {
        return 'No specific vision details were provided. Focus entirely on this person\'s inner emotional landscape — their capability, clarity, peace, and the quiet certainty of someone who has arrived where they always knew they belonged.';
    }

    return result;
}
