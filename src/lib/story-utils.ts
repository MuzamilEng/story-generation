export interface UserAnswers {
    // Phase 0/Tier 2
    orientation: 'spiritual' | 'scientific' | 'both' | 'grounded';
    tone: string;
    selectedAreas: string[];

    // Tier 1 (Core)
    goals: string;
    actionsAfter: string;
    identityStatements: string[];
    timeframe: string;
    coreFeeling: string;

    // Phase 4/Tier 2
    namedPersons: string[]; // Array — ["Tiz", "Ryder", "Beckett"]
    location: string;
    home: string;

    // Tier 3 (Sensory/Context)
    work: string;
    relationships: string;
    health: string;
    spirit: string;
    community: string;
    dreams: string;

    // Legacy / Others
    identity?: string;
    purpose?: string;
    values?: string;
    morning?: string;
    people?: string;
    emotions?: string;
    joy?: string;
    challenges?: string;
    evening?: string;
    reflection?: string;
    categories?: string[];
    abundance?: string;
    travel?: string;
    obstacle1?: string;
    proof1?: string;
    obstacle2?: string;
    proof2?: string;
    obstacle3?: string;
    proof3?: string;
    futureVision?: string;
    givingBack?: string;
    customAffirmations?: {
        opening: string[];
        closing: string[];
    };
}

export function normalizeGoals(raw: any): UserAnswers {
    if (!raw) return {} as UserAnswers;

    const normalized: any = {};
    const mapping: Record<string, keyof UserAnswers> = {
        'orientation': 'orientation',
        'tone': 'tone',
        'selectedAreas': 'selectedAreas',
        'goals': 'goals',
        'goals (wealth)': 'goals',
        'goals (health)': 'goals',
        'goals (love)': 'goals',
        'goals (family)': 'goals',
        'goals (purpose)': 'goals',
        'goals (spirituality)': 'goals',
        'goals (spirit)': 'goals',
        'actionsAfter': 'actionsAfter',
        'identityStatements': 'identityStatements',
        'timeframe': 'timeframe',
        'coreFeeling': 'coreFeeling',
        'namedPersons': 'namedPersons',
        'location': 'location',
        'home': 'home',
        'work': 'work',
        'relationships': 'relationships',
        'health': 'health',
        'spirit': 'spirit',
        'community': 'community',
        'dreams': 'dreams',
        'emotions': 'coreFeeling',

        // Legacy / Alternative Mapping
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
        'Relationships': 'relationships',
        'People': 'relationships',
        'Family': 'relationships',
        'Feelings': 'coreFeeling',
        'Emotions': 'coreFeeling',
        'Core Feeling': 'coreFeeling',
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
    };

    const mainKeys = ['identity', 'purpose', 'location', 'coreFeeling', 'goals', 'actionsAfter', 'identityStatements'];
    const textFieldsToAppend = ['goals', 'actionsAfter', 'purpose', 'futureVision'];
    const auxiliaryCategories: string[] = [];

    Object.keys(raw).forEach(key => {
        const val = raw[key];
        if (val === undefined || val === null) return;

        const normalizedKey = mapping[key] || mapping[key.trim()] || key.trim();

        if (textFieldsToAppend.includes(normalizedKey as string)) {
            const existing = normalized[normalizedKey] || '';
            const newVal = Array.isArray(val) ? val.join(', ') : String(val);
            if (existing && !existing.includes(newVal)) {
                normalized[normalizedKey] = `${existing}\n\n${newVal}`;
            } else if (!existing) {
                normalized[normalizedKey] = newVal;
            }
        } else if (Array.isArray(normalized[normalizedKey]) && Array.isArray(val)) {
            const merged = Array.from(new Set([...normalized[normalizedKey], ...val]));
            normalized[normalizedKey] = merged;
        } else {
            normalized[normalizedKey] = val;
        }

        // Handle auxiliary goals into categories for sidebar/legacy compatibility
        if (!mainKeys.includes(normalizedKey) && typeof val === 'string' && val.length > 0) {
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

    // Default critical fields to empty strings or arrays to avoid 'undefined' in prompt
    const criticalFields: (keyof UserAnswers)[] = [
        'goals', 'actionsAfter', 'timeframe', 'coreFeeling', 'location', 'home',
        'work', 'relationships', 'health', 'spirit', 'community', 'dreams'
    ];

    criticalFields.forEach(f => {
        if (normalized[f] === undefined) normalized[f] = '';
    });

    // Ensure selectedAreas is always an array
    if (!Array.isArray(normalized.selectedAreas)) {
        if (typeof normalized.selectedAreas === 'string' && normalized.selectedAreas.length > 0) {
            normalized.selectedAreas = normalized.selectedAreas.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
            normalized.selectedAreas = [];
        }
    }

    // Ensure identityStatements is always an array
    if (!Array.isArray(normalized.identityStatements)) {
        if (typeof normalized.identityStatements === 'string' && normalized.identityStatements.length > 0) {
            normalized.identityStatements = [normalized.identityStatements];
        } else {
            normalized.identityStatements = [];
        }
    }

    if (!normalized.orientation) normalized.orientation = 'grounded';
    if (!normalized.tone) normalized.tone = 'warm';

    // Ensure namedPersons is always an array
    if (!Array.isArray(normalized.namedPersons)) {
        if (typeof normalized.namedPersons === 'string' && normalized.namedPersons.length > 0) {
            normalized.namedPersons = [normalized.namedPersons];
        } else if (normalized.namedPerson && typeof normalized.namedPerson === 'string') {
            normalized.namedPersons = [normalized.namedPerson];
        } else {
            normalized.namedPersons = [];
        }
    }

    normalized.categories = auxiliaryCategories;

    return normalized as UserAnswers;
}

export type StoryLength = 'short' | 'long';

export type Tier = 'explorer' | 'activator' | 'manifester' | 'amplifier';

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
    'LUMINOUS & TRANSCENDENT: Higher-state consciousness. The language is poetic, floating, almost ethereal. It focuses on the vibration of the new life and the sacred alignment of everything. Best for spiritual-leaning users.',
    'GROUNDED & POWERFUL: Maximum tangible reality. Heavy on textures, weight, physical movement, and concrete results. The power of this story comes from its undeniable, physical factuality.',
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

export function buildStoryPrompt(answers: UserAnswers, userTier: Tier = 'explorer', instruction?: string, targetLength?: string | null): string {
    const narrativeStructure = pickRandom(NARRATIVE_STRUCTURES);
    const emotionalArc = pickRandom(EMOTIONAL_ARCS);
    const tonalMode = pickRandom(TONAL_MODES);
    const seasonalContext = pickRandom(SEASONAL_CONTEXTS);
    const openingStyle = pickRandom(OPENING_STYLES);

    let prompt = `You are writing a deeply personal, transformational first-person night story for ManifestMyStory.com.

This story will be narrated by an AI voice cloned from the user's own voice and listened to every night as they drift toward sleep. Its purpose is to rewire the subconscious mind through repeated immersive exposure — making the user's desired future feel like remembered reality.

━━━ YOUR CREATIVE PARAMETERS FOR THIS STORY ━━━
Honour these exactly — they shape every structural and tonal decision.

NARRATIVE STRUCTURE: ${narrativeStructure}
EMOTIONAL ARC: ${emotionalArc}
TONAL MODE: ${tonalMode}
SEASONAL / ATMOSPHERIC CONTEXT: ${seasonalContext}
OPENING STYLE: ${openingStyle}
ORIENTATION: ${answers.orientation}
STORY TONE: ${answers.tone}
CORE FEELING: ${answers.coreFeeling}

${instruction ? `━━━ REGENERATION INSTRUCTION — HIGH PRIORITY ━━━
The user has requested these specific changes to their previous version. You MUST prioritise this instruction while still following all core manifesto and safety rules:
"${instruction}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` : ''}
USER PLAN: ${userTier.toUpperCase()}
Target Experience: Full Deep-Immigration Night Story
Story Status: Achieved Life Final Version
The core feeling must be present as an emotional undertone in EVERY scene — not just the close. The listener should feel it growing from the opening to the final word.\n\n` ;

    // BLOCK A — HYPNOTIC INDUCTION (Activator+)
    if (['activator', 'manifester', 'amplifier'].includes(userTier)) {
        const targetWords = userTier === 'activator' ? '250-300' : (userTier === 'manifester' ? '300-350' : '350-400');
        prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCK A — HYPNOTIC INDUCTION
TARGET WORD COUNT: ${targetWords} words
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPENING VOICE MODE: GUIDED (2nd person "you").
The induction is written in second person — "you" — as if the listener's own cloned voice is gently guiding them into sleep. This is not a contradiction of the first-person vision that follows — it is the bridge INTO it. The same voice that says "close your eyes" is the same voice that later says "I am here." This creates a profound identity loop that standard first-person cannot achieve.

Once the vision begins (Block B), switch fully and permanently to first person — "I" and "my" — for the rest of the story.

THE INDUCTION MUST FOLLOW THIS PRECISE SEQUENCE:
1. BREATH AWARENESS: Invite the listener to simply notice they are already breathing. Effortless. Natural. Already happening. "The breath is already happening. You don't have to do a single thing."
2. BODY GROUNDING: Weight of the body against the surface beneath. Sinking deeper. Jaw softens. Shoulders release.
3. ONE LONG BREATH: A single long breath in — hold gently at the top — and as they breathe out, every muscle from crown to sole... simply lets go.
4. DEEPENING THROUGH LANGUAGE — calibrated to orientation:
   • Spiritual → golden light, divine presence, the subconscious opening like a golden door
   • Scientific → brainwave descent, the conscious mind stepping aside, theta state arriving
   • Both → "the science and the sacred meet here — the mind and something larger"
   • Grounded → pure physical sensation — weight, warmth, gravity — no framework language
5. COUNTDOWN STAIRCASE DEEPENER (MANDATORY for all orientations):
   Describe a grand staircase descending into warm, golden light. Count down from TEN to ONE. Each number goes deeper:
   "Ten... the first step down... warmth rising to meet you."
   "Nine... deeper now... your mind growing quieter and more still."
   "Eight... every thought dissolving like mist..."
   "Seven... six... halfway down, the golden light closer, warmer, more real."
   "Five... four... your body completely at rest... your mind completely open..."
   "Three... two... almost there..."
   "One. You step into the light."
   Adapt this rhythm to the user's orientation — spiritual users experience divine light; scientific users experience a theta-state threshold; grounded users experience pure physical ease.
6. THRESHOLD MOMENT: The listener has arrived somewhere completely open and receptive. Something extraordinary is already beginning in the deep, intelligent, all-knowing part of their mind. That part is listening. And it is ready.

NLP LANGUAGE THROUGHOUT THE INDUCTION:
Embedded commands (2nd person for induction): "...and as you notice yourself sinking deeper..." / "...you find your mind growing quieter and more open..."
Universal quantifiers: "With every breath..." / "With every sound you hear..." / "With every word that lands..."
Presuppositions: "Something extraordinary is already beginning in the deep, intelligent part of your mind..." / "That part of you is listening now. And it is ready."

INDUCTION LANGUAGE RULES:
- 2nd person ("you") ONLY in Block A. Switch to 1st person ("I") from Block B onwards — permanently.
- NEVER use "you wake up" or "I wake up" anywhere in the story
- Write as if the listener is already drifting — invited, not commanded
- Do NOT reference the word "story" — the listener IS living this from the first word
- Tone: the voice of quiet authority — slow, warm, certain, unhurried — every sentence gives permission to go deeper
- Write in short, breath-sized sentences during the countdown. Short sentences = slower pace = deeper state.

STRUCTURAL GUIDELINE (Dynamically adapt — DO NOT copy verbatim):
Breath → body weight → jaw/shoulders release → one long breath out → deepening language calibrated to orientation → countdown staircase 10→1 → golden/threshold arrival → "That part of you is listening. And it is ready."\n\n`;
    }

    // BLOCK B — THE VISION: all tiers
    // Map of length options to multipliers/modifications
    const lengthMultipliers: Record<string, number> = {
        'short': 0.6,
        'medium': 1.0,
        'long': 1.5,
        'epic': 2.2,
    };

    let multiplier = (targetLength && lengthMultipliers[targetLength]) ? lengthMultipliers[targetLength] : 1.0;
    
    // Explorer tier is strictly capped at 'medium' length (~750 words) to prevent over-generation on free accounts
    if (userTier === 'explorer' && multiplier > 1.0) {
        multiplier = 1.0;
    }

    const visionWordCounts: Record<Tier, string> = {
        explorer: `${Math.round(550 * multiplier)}-${Math.round(650 * multiplier)} words (1 life area, proof actions)`,
        activator: `${Math.round(700 * multiplier)}-${Math.round(850 * multiplier)} words (up to 3 areas, proof actions)`,
        manifester: `${Math.round(900 * multiplier)}-${Math.round(1100 * multiplier)} words (all selected areas, proof actions)`,
        amplifier: `${Math.round(1300 * multiplier)}-${Math.round(1600 * multiplier)} words (all areas, 2+ scenes per area)`
    };

    const currentVisionTarget = visionWordCounts[userTier];

    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCK B — THE VISION (THE ACHIEVED LIFE)
TARGET WORD COUNT: ${currentVisionTarget}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPENING TIME ANCHOR (required for all tiers):
Open by grounding the story in a specific future moment:
"It is [season], ${answers.timeframe} from where I once stood..."
Or a natural variation that communicates the same: this is a specific future, not a vague someday.
The listener must know immediately: I am inside a real moment, not a fantasy.

The user's goals are ALREADY achieved. This is not the day they achieve them — this is a day deep inside the life that achievement made possible. The struggle is over. Only its absence is shown through ease and freedom.

━━━ STORY QUALITY: CINEMATIC SENSORY DEPTH ━━━
Do not just list sights and sounds. Layer them to create a "Nested Sensory Loop":
- Mention a texture (the cold glaze of a coffee mug)
- That reminds the character of a feeling (the cooling ease of their financial life)
- Which anchors a sound (the quiet whisper of the bay outside)
Every paragraph must feel like a scene from a high-end film. Focus on the "spaces between" actions — the quiet pauses where the new reality really sinks in.

ACT BREAKS:
Use centered dot leaders between major life area scenes:
· · ·
These signal a transition between acts — the listener's nervous system learns the rhythm and associates each separator with going deeper.

${buildDynamicVision(answers)}

━━━ THE VERBATIM RULE — MOST CRITICAL INSTRUCTION ━━━
Use the user's exact words from goals and proof actions. Do not paraphrase. Do not generalise. Do not substitute.
- "pay off my Amex" → scene where they pay off their Amex
- "take my kids to Disney" → scene at Disney with their kids
- "Ziman development team bonuses" → scene of giving those specific bonuses
- "safari trip to Tanzania" → scene in Tanzania with specific sensory detail
- "my surf city Bayfront home" → scene at that specific home
Every proof action must appear as a vivid, physical, present-tense scene. Not background. Not summary. These ARE the story.

⚠️ COMPLETENESS CHECK — EVERY SINGLE ITEM MUST APPEAR:
Before you finish writing, mentally check: does every specific goal, milestone, business detail, trip, purchase, relationship detail, and proof action from the user appear as a scene in the story? If ANY item from the intake is missing, you MUST add it. Nothing shared during intake should be left out. This includes:
- All business/financial milestones with exact numbers
- All named trips, purchases, and experiences
- All named people with specific relational depth
- All proof actions as full sensory scenes
If the user mentioned 8 goals, all 8 must appear. If they mentioned 3 trips, all 3 must appear as scenes.

━━━ NUMERIC SPECIFICITY RULE — EQUALLY CRITICAL ━━━
If the user provided any numbers, figures, or metrics in their goals — revenue targets, net worth, multiples, portfolio values, income numbers — you MUST use those exact figures. Do not round them. Do not generalise them.
- "fifty million dollars" → say "fifty million dollars" — not "substantial revenue" or "financial freedom"
- "one hundred times return" → say "a hundred times over" — not "significant investment gains"
- "one billion net worth" → say "one billion" — not "extraordinary wealth"
The specific number IS the subconscious anchor. Vague language destroys the reprogramming. Be exact. Be specific. The listener must hear the number they wrote down and feel it settle into their body as already real.

━━━ EMBODIED REALITY RULE ━━━
When the vision describes any major achievement — financial, physical, relational — do not just show the scene. For 2-3 key moments, pause the narrative and direct the listener to FEEL it in the body. Not the idea of it. The actual cellular, physical feeling. Use language like:
"And now feel what it feels like to know that. Not to hope it — to know it. The way you know your own name. Solid. Unmovable. Real."
This is the difference between a pleasant story and a genuine subconscious reprogramming experience.

━━━ NAMED PERSONS ━━━
${answers.namedPersons && answers.namedPersons.length > 0
            ? `The user named these people as part of their vision: ${answers.namedPersons.join(", ")}. Use each name naturally and with warmth — never announce them, let each name land with intimacy and emotional weight.`
            : `No specific people were named. Reference loved ones warmly but without invented names.`}

━━━ NLP TECHNIQUE 1 — SUBMODALITY ENGINEERING ━━━
Every major scene must be bright, close, vivid, immersive. The listener is inside the moment — not watching it from outside.

REQUIRED: Use all five senses in every major scene:
- SIGHT: colors, light quality, visual details
- SOUND: ambient sounds, voices, music, silence
- SMELL: specific scents tied to the scene
- TOUCH: textures, temperature, physical sensations
- TASTE: where relevant — food, drink, air quality

The current story was mostly visual. This is insufficient. Every scene must be multi-sensory.

The old life and its struggles are NEVER described or referenced. Only its absence is shown — through effortless ease, natural confidence, and the quiet joy of someone who has arrived.

━━━ NLP TECHNIQUE 2 — MILTON MODEL LANGUAGE PATTERNS ━━━
These must be woven throughout EVERY PARAGRAPH — not just occasional moments.

EMBEDDED COMMANDS (hide directives inside descriptive sentences):
The conscious mind hears description. The subconscious receives instruction.
Integrate commands within your descriptions — for example, describing a state of moving with ease, feeling certain about the future, or allowing a "knowing" to settle with each breath. Phrase these so they are received as natural parts of the story, not as direct orders.

PRESUPPOSITIONS (assume the desired state is already permanently true):
Assumptive language should appear in every scene — referencing the version of you who lives here, the way abundance continues to grow, or how you wake into this life each morning. Ensure the language assumes the goal is already a long-standing reality.

UNIVERSAL QUANTIFIERS (signal permanence to the subconscious):
Use words like "Every morning," "Always," "Each time," or "Whenever I" to signal the permanence of the new reality.

━━━ NLP TECHNIQUE 3 — IDENTITY-LEVEL STATEMENTS ━━━
Include 2-3 moments mid-story where the narrator quietly recognises who they ARE — not what they have. These feel like private knowings, not declarations. They arise naturally from the story's flow — never announced:
- "This is simply who I am now."
- "I have always known, somewhere, that I was capable of this."
- "I am someone who shows up fully for the life I built."
NOTE: These are subtle narrative moments only. The explicit affirmations (identity statements and per-area affirmations) are planted ONLY in the close AFTER dissolution — never during the vision scenes.

━━━ NLP TECHNIQUE 4 — FUTURE PACING ━━━
Include one moment where the narrator makes a decision — effortlessly — that could only be made by someone whose life has genuinely changed:
- They say yes to something they once couldn't afford
- They give generously what they once held tightly
- They decline something they once felt obligated to accept
This moment should feel small and natural — its weight comes from its effortlessness.

━━━ OBSTACLE PROOF PRINCIPLE ━━━
Each struggle is already resolved. Show its resolution through a vivid proof moment — a scene that could ONLY exist if this challenge is completely behind them. NEVER name the obstacle. NEVER say "I used to." Dramatise its absence through ease, freedom, and natural confident action.

━━━ ORIENTATION-SPECIFIC LANGUAGE ━━━
${answers.orientation === 'spiritual'
            ? 'Weave spiritual language naturally throughout — divine alignment, Source, co-creation, being guided, God\'s hand, universal intelligence. Never preachy. Always intimate, like a private knowing.'
            : ''}
${answers.orientation === 'scientific'
            ? 'Frame through neurological and performance language — rewired subconscious, peak state, aligned decision-making, biological certainty. No spiritual language unless user introduced it.'
            : ''}
${answers.orientation === 'both'
            ? 'Blend science and spirituality freely — they coexist naturally in this story. Use whichever serves the emotional moment.'
            : ''}
${answers.orientation === 'grounded'
            ? 'No framework language at all. Pure sensory and emotional immersion only. The story earns its power through specificity and feeling, not framing.'
            : ''}

━━━ FORMATTING & STRUCTURE ━━━
This story is pure flowing prose. There are NO section headers. NO timestamps. NO labels like "INDUCTION" or "THE VISION". The story flows as one seamless, unbroken piece of writing — exactly like a great piece of literary fiction read aloud.

The internal structure (induction → vision → anchor → close) exists in the writing itself — through tone, pacing, and language — not through visible headers. The listener should never be aware they are moving between sections.

Separation: Use one blank line between paragraphs. Use three centered dots · · · on their own line to separate major scene or life-area transitions within the vision. These are the ONLY structural markers allowed.

Pure flowing prose. No bullets anywhere in the story body. No headers. No timestamps. No labels.

━━━ RE-LISTABILITY ━━━
This story will be listened to dozens or hundreds of times. Build for that:
- At least one moment of unexpected beauty or emotional truth that catches the listener off guard
- Create at least one scene so specific it becomes a personal touchstone — a scene the listener can return to by memory
- Closing lines must be so resonant the listener carries them into sleep
- NEVER use "I manifest," "I am attracting," "I am aligned," or law-of-attraction language.
- AVOID generic adjectives like "wonderful," "great," or "successful." Use specific, evocative ones: "unshakeable," "luminous," "symphonic," "anchored."
- Each scene must have an internal "emotional shift" where the character recognizes a proof of their growth.
- DO NOT use markdown symbols (*, **, #, _, etc.) for emphasis or headers. 
- Use plain text only. The UI will handle the styling.
- Avoid any "bold" or "italic" formatting patterns.\n\n`;

    // BLOCK C — KINESTHETIC ANCHOR INSTALLATION (Manifester+)
    if (['manifester', 'amplifier'].includes(userTier)) {
        const targetWords = userTier === 'manifester' ? '100-120' : '120-150';
        prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCK C — KINESTHETIC ANCHOR INSTALLATION
TARGET WORD COUNT: ${targetWords} words
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
At the single most emotionally charged moment of the story — the absolute peak of the most vivid proof action scene — install a kinesthetic anchor.

This anchor will be activated every morning in the morning story (Amplifier tier). Over repeated nightly listening, pressing these fingers together before any important moment retrieves this full emotional state instantly.

THE ANCHOR MUST:
- Arrive at genuine emotional peak — not before, not after
- Feel completely natural — never announced as a technique
- Build the gesture into the scene as if the narrator is following a deep instinct

STRUCTURAL GUIDELINE (Dynamically adapt this logic to the user's tone – DO NOT copy verbatim):
The anchor installation should occur at the absolute emotional peak of a scene. The narrator follows a deep instinct to bring their thumb and first finger together, anchoring the specific high-frequency feelings of that moment into this physical gesture. It concludes with a reinforcement that this state is now retrievable any time those fingers meet.

DO NOT USE TEMPLATES OR EXAMPLES ABOVE VERBATIM. Generation must be 100% unique to this user.\n\n`;
    }

    // BLOCK D — THE CLOSE (RESIDENT LANDING)
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCK D — THE CLOSE (RESIDENT LANDING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The close is written in 2nd person again — returning to the guided voice of the induction. The same voice that opened the experience now gently closes it, like a hand placed softly over the heart. This symmetry signals to the subconscious: the loop is complete. The new reality is sealed.

IMPORTANT: Affirmations are delivered as SEPARATE audio segments before and after the story. Do NOT plant affirmations in the story text. The close should handle dissolution, subconscious programming, and sleep seeding ONLY.

STEP 1 — DISSOLUTION:
The scene slowly dissolves, not into nothingness, but into the deep subconscious. The feeling remains even as the details fade. Use transitional language that invites release: "You can let it all go now. Let every image soften. Let every vision dissolve into warm light. You don't need to hold on to any of it. Your subconscious mind has received every word. Every feeling. Every instruction. It is already working."

STEP 2 — SUBCONSCIOUS PROGRAMMING:
After dissolution, include the programming close:
"Tonight your dreams will carry the frequency of your highest life. Your cells will repair and renew. Your subconscious will begin assembling the circumstances, the connections, the ideas, the opportunities that make every single one of these visions physical reality. You will notice something different tomorrow. A quiet shift. A new certainty. The feeling of someone who knows something the world doesn't know yet. Because you do."

STEP 3 — SLEEP SEEDING:
The narrator seeds the subconscious for sleep.
- Invoke the specific feeling of safety, provision, and love
- Explicitly affirm the subconscious continues its work through the night
- Use present tense: "it is already working. Right now. As you drift. As you sleep. As you dream."

STEP 4 — THREE SLOW REPETITIONS (MANDATORY — 8-12 words each, one breath apart):
Three final lines — the last sounds before sleep. Each one is a breath. Each one lands in the subconscious like a stone dropped into still water. They should vary slightly, not be identical:
"Sleep now... and receive."
"Sleep now... and receive."
"Sleep now... and receive."
Adapt the closing word to the user's orientation: spiritual → "receive" or "rest in the knowing"; scientific → "integrate" or "consolidate"; grounded → "rest" or "trust". The exact repetition signals: this is the end. It is sealed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORD COUNT TARGET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This story is for building a future. Do not rush. Write every word with intention.
Maximum Output Tokens: 5,000

${userTier === 'explorer' ? `EXPLORER (free tier)
Total target: ${Math.round(700 * multiplier)}-${Math.round(800 * multiplier)} words
  Induction: not included
  Vision (1 life area, proof actions): ${Math.round(600 * multiplier)}-${Math.round(700 * multiplier)} words
  Resonant close: 100-150 words` : ''}${userTier === 'activator' ? `ACTIVATOR
Total target: ${Math.round(1100 * multiplier)}-${Math.round(1350 * multiplier)} words
  Hypnotic induction: 250-300 words
  Vision (up to 3 areas, proof actions): ${Math.round(700 * multiplier)}-${Math.round(850 * multiplier)} words
  Dissolution + close: 150-250 words` : ''}${userTier === 'manifester' ? `MANIFESTER
Total target: ${Math.round(1800 * multiplier)}-${Math.round(2200 * multiplier)} words
  Hypnotic induction: 300-350 words
  Vision (all selected areas, proof actions): ${Math.round(1100 * multiplier)}-${Math.round(1300 * multiplier)} words
  Future pacing moment: 60-80 words
  Anchor installation at emotional peak: 100-120 words
  Dissolution + Seeded Close: 200-350 words` : ''}${userTier === 'amplifier' ? `AMPLIFIER
Total target: ${Math.round(3000 * multiplier)}-${Math.round(3500 * multiplier)} words
  Hypnotic induction: 350-400 words
  Vision (all areas, 2+ scenes per area): ${Math.round(2000 * multiplier)}-${Math.round(2500 * multiplier)} words
  Future pacing moments: 100-120 words
  Anchor installation: 120-150 words
  Dissolution + Lush Seeded Close: 300-450 words` : ''}

━━━ STRICT LENGTH & DEPTH ENFORCEMENT ━━━
You are writing for a ${userTier.toUpperCase()} user. A short story is a failure and will be rejected. You MUST meet the large word count targets above.
If the provided inputs are brief, do NOT summarize. Instead:
1. Improvise cinematic surroundings — textures, smells, the quality of light.
2. Narrate the character's internal thoughts and emotional shifts in great detail.
3. Slow down every scene. Describe the unhurried ease of the achieved life.
4. Expand every "proof action" into a significant sensory scene.
The listener is here for an unhurried, deeply immersive experience. Write a literary masterpiece. NEVER summarize anything. Short outputs will be ignored.

${userTier === 'amplifier' ? `━━━ AMPLIFIER SPECIAL DIRECTIVE ━━━
You are writing for our most premium user. A 200-word story is unacceptable and will be rejected. 
You MUST reach the target length of ~3,000 words. Describe everything with extreme sensory depth. 
Describe the architecture, textures, and sensory landscape of their home in cinematic detail. 
Expand on each "proof action" into a long, lush, unhurried memory.` : ''}\n\n`;

    prompt += `━━━ OUTPUT FORMAT — CRITICAL ━━━
Write the story now. Format your response EXACTLY as follows — no deviations:

TITLE: [Write a short evocative title — no brackets, no asterisks, plain text only]

---
[The full story begins here as pure, unbroken flowing prose.]
${['activator', 'manifester', 'amplifier'].includes(userTier) ? `
SECTION SEPARATION — MANDATORY:
After you finish the induction (Block A) and BEFORE you begin the vision (Block B), you MUST insert this exact marker on its own line:

[INTRO_END]

This marker separates the intro/induction from the main story. Do NOT skip it. The audio system uses it to insert opening affirmations between the intro and the story.
` : ''}
RULES FOR THE STORY BODY:
- NO section headers of any kind (no "INDUCTION", no "THE VISION", no "BLOCK A", nothing)
- NO timestamps or time ranges anywhere (no "0-5 min", no "5-22 min", nothing)
- NO labels, NO dividers except · · · between major scene transitions${['activator', 'manifester', 'amplifier'].includes(userTier) ? ' and the mandatory [INTRO_END] marker after the induction' : ''}
- The story flows as one continuous piece — like the reference story provided
- Begin immediately with the first word of the induction (for Activator+) or the first word of the vision (for Explorer)
- Use · · · on its own line between major life area transitions in the vision
- End the story with the three sleep repetitions, then nothing more

The output must look exactly like a beautifully written piece of literary prose — pure text, no structure visible to the reader (except the required [INTRO_END] marker for the audio system).

Begin now. Write the full story with no preamble, no explanation. Start directly with the story itself.\n`;

    return prompt;
}

export function buildDynamicVision(answers: UserAnswers): string {
    let result = '';

    result += `╔══ TIER 1: GOALS, PROOF ACTIONS & IDENTITY — NON-NEGOTIABLE STORY CORE ══╗
Every item in this tier MUST appear in the story. Goals and proof actions as vivid present-tense scenes. Identity statements verbatim in the affirmation close.

GOALS — show each as already completely real. Not pursued. Simply lived:
${answers.goals}

PROOF ACTIONS — the single most important field. Build every major scene around these. Use exact words — no paraphrasing:
${answers.actionsAfter}

IDENTITY STATEMENTS — user's own claimed identity. Use VERBATIM in affirmation close after dissolution. Do not rewrite:
${Array.isArray(answers.identityStatements) ? answers.identityStatements.join(", ") : answers.identityStatements}

PER-AREA AFFIRMATIONS — plant these by area AFTER dissolution, before identity statements:
${Object.entries(answers).filter(([k]) => k.startsWith('areaAffirmations_')).map(([k, v]) => `${k.replace('areaAffirmations_', '').toUpperCase()}: ${Array.isArray(v) ? v.join('; ') : v}`).join('\n') || 'None captured — derive 2-3 BEING-level affirmations per area from the user goals above'}

TIMEFRAME — open the story in this specific future moment:
${answers.timeframe}

CORE FEELING — present as undertone in EVERY scene throughout the entire story:
${answers.coreFeeling}
╚══ END TIER 1 ══╝\n\n`;

    // ── TIER 2: IDENTITY CONTEXT & VOICE ──────────────────────────────────────────────
    result += `╔══ TIER 2: IDENTITY CONTEXT & VOICE ══╗\n`;
    result += `Calibrates language, framing, and intimate moments.\n\n`;
    if (answers.namedPersons && answers.namedPersons.length > 0) result += `Named persons — use naturally, never announced, each landing with warmth:\n${answers.namedPersons.join(", ")}\n\n`;
    result += `Orientation — drives induction language, framing, close variation:\n${answers.orientation}\n\n`;
    result += `Story tone — drives emotional temperature of every scene:\n${answers.tone}\n`;
    result += `╚══ END TIER 2 ══╝\n\n`;

    // ── TIER 3: THEIR WORLD — SENSORY SETTING ───────────────────────────────────
    result += `╔══ TIER 3: THEIR WORLD — SENSORY SETTING ══╗\n`;
    result += `Use ONLY what was provided. Never invent. If empty, keep that dimension abstract.\n`;
    if (answers.location) result += `Where they live / setting: ${answers.location}\n`;
    if (answers.home) result += `Their home: ${answers.home}\n`;
    if (answers.work) result += `Work / creative life / purpose: ${answers.work}\n`;
    if (answers.relationships) result += `Key relationships and people: ${answers.relationships}\n`;
    if (answers.health) result += `Health & body (use their exact language): ${answers.health}\n`;
    if (answers.spirit) result += `Spirituality & inner life: ${answers.spirit}\n`;
    if (answers.community) result += `Community & contribution: ${answers.community}\n`;
    if (answers.dreams) result += `Dreams and deeper intentions: ${answers.dreams}\n`;
    if (answers.futureVision) result += `Overall Future Vision: ${answers.futureVision}\n`;
    result += `╚══ END TIER 3 ══╝\n`;

    if (!answers.goals && !answers.actionsAfter) {
        return 'Minimal details were provided beyond goals and proof actions. Build every scene entirely around the Tier 1 inputs — use the user\'s exact words as the story\'s foundation. For the inner landscape, let the core feeling be the emotional spine. Keep all other dimensions abstract and beautifully unspecific.';
    }

    return result;
}

// ── Delimiter used to separate induction (intro) from story body ──────────────
export const INTRO_END_MARKER = '[INTRO_END]';

/**
 * Split a story text into intro (induction) and story body using the [INTRO_END] marker.
 * Returns { intro, storyBody }. If no marker is found, intro is empty and storyBody is the full text.
 */
export function splitIntroFromStory(fullText: string): { intro: string; storyBody: string } {
    const idx = fullText.indexOf(INTRO_END_MARKER);
    if (idx === -1) {
        return { intro: '', storyBody: fullText.trim() };
    }
    return {
        intro: fullText.slice(0, idx).trim(),
        storyBody: fullText.slice(idx + INTRO_END_MARKER.length).trim(),
    };
}
