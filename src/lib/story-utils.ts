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

    // Gratitude (v6 Step 3)
    gratitudeItems: string[];

    // Happy Place Sensory (v6 Step 6)
    happyPlaceVisual: string;
    happyPlaceSound: string;
    happyPlaceFeeling: string;

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
        'gratitudeItems': 'gratitudeItems',
        'happyPlace_visual': 'happyPlaceVisual' as any,
        'happyPlace_sound': 'happyPlaceSound' as any,
        'happyPlace_feeling': 'happyPlaceFeeling' as any,
        'work': 'work',
        'relationships': 'relationships',
        'health': 'health',
        'spirit': 'spirit',
        'community': 'community',
        'dreams': 'dreams',
        'emotions': 'coreFeeling',
        // Per-area goal keys captured during intake — keep them under their own key
        // so buildDynamicVision can read them individually
        'wealth': 'wealth' as any,
        'love': 'love' as any,
        'family': 'family' as any,
        'purpose': 'purpose',
        'spirituality': 'spirituality' as any,
        'growth': 'growth' as any,

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
        'Family': 'family' as any,
        'Feelings': 'coreFeeling',
        'Emotions': 'coreFeeling',
        'Core Feeling': 'coreFeeling',
        'Abundance': 'abundance',
        'Money': 'abundance',
        'Wealth': 'wealth' as any,
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
    const textFieldsToAppend = ['goals', 'actionsAfter', 'purpose', 'futureVision', 'wealth', 'health', 'love', 'family', 'spirituality', 'growth'];
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
        'work', 'relationships', 'health', 'spirit', 'community', 'dreams',
        'happyPlaceVisual', 'happyPlaceSound', 'happyPlaceFeeling'
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

    // Ensure gratitudeItems is always an array
    if (!Array.isArray(normalized.gratitudeItems)) {
        if (typeof normalized.gratitudeItems === 'string' && normalized.gratitudeItems.length > 0) {
            normalized.gratitudeItems = normalized.gratitudeItems.split(/[,\n]+/).map((s: string) => s.trim()).filter(Boolean);
        } else {
            normalized.gratitudeItems = [];
        }
    }

    normalized.categories = auxiliaryCategories;

    // Issue #25: Detect workaround phrases like "all of them" stored as literal goal data
    // and clear them so the story engine doesn't receive empty/garbage goal content.
    const workaroundPatterns = /^(all of them|all of the above|all|everything|every one|the first \w+|all please|all of them please|yes all|i want all|select all)$/i;
    const areaGoalKeys = ['wealth', 'health', 'love', 'family', 'purpose', 'spirituality', 'growth', 'goals'];
    for (const key of areaGoalKeys) {
        const val = normalized[key];
        if (typeof val === 'string' && workaroundPatterns.test(val.trim())) {
            // Clear the workaround string — the per-area affirmations and other
            // captured data will still carry the real content
            normalized[key] = '';
        }
    }

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

export function buildStoryPrompt(answers: UserAnswers, userTier: Tier = 'explorer', instruction?: string, targetLength?: string | null, currentDate: string = new Date().toISOString(), goalCount?: number): string {
    const currentMonthYear = new Date(currentDate).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Dynamic goal count — drives amplifier scaling
    const numGoals = goalCount ?? (Array.isArray(answers.selectedAreas) ? answers.selectedAreas.length : 3);

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
SESSION CONTEXT: These goals were set in ${currentMonthYear}.
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
5.5 HAPPY PLACE SENSORY INDUCTION (MANDATORY — concentrated sensory stacking):
After the staircase countdown and before the threshold moment, deliver a dedicated 1-2 minute happy-place passage that hits ALL THREE sensory channels in rapid sensory succession. This is the theta-state unlock before subconscious programming.

Use the user's specific happy place details:
- LOCATION: ${answers.location || 'a place of deep safety and peace'}
- VISUAL (what they see): ${(answers as any).happyPlaceVisual || 'warm golden light, natural beauty'}
- SOUND (what they hear): ${(answers as any).happyPlaceSound || 'peaceful silence, gentle natural sounds'}
- FEELING (physical sensation): ${(answers as any).happyPlaceFeeling || 'complete ease, warmth, settled weight'}

RULES:
- Layer all three sensory channels deliberately at this single induction point — visual THEN auditory THEN kinesthetic, woven into one flowing passage
- Use the user's EXACT words from their happy place intake — then expand with submodality detail
- Do NOT scatter this sensory detail across later scenes — concentrate it HERE for maximum theta-state impact
- The listener should feel completely safe, at ease, and present in this space
- End with a deepening phrase: "You are here. You are safe. You are exactly where you are meant to be. And as you settle into this place... your conscious mind can rest... while something deeper within you... begins to listen."

STRUCTURAL GUIDELINE (adapt, do not copy):
"And you find yourself somewhere your body knows. [LOCATION]. See it: [VISUAL details with brightness, color, distance]. Hear it: [SOUND details with volume, texture, proximity]. Feel it: [FEELING details with temperature, weight, texture]. You are here. You are safe. You are exactly where you are meant to be."

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
Breath → body weight → jaw/shoulders release → one long breath out → deepening language calibrated to orientation → countdown staircase 10→1 → happy place sensory induction → golden/threshold arrival → "That part of you is listening. And it is ready."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRATITUDE OPENING ANCHOR (2-3 minutes — REQUIRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Immediately after the threshold moment ("That part of you is listening now. And it is ready.") and BEFORE Position 1 affirmation planting, deliver a dedicated gratitude section that grounds the listener in what is already real.

PURPOSE: The subconscious accepts new beliefs faster when first grounded in what it has already successfully created. This is the neurological unlock for everything that follows.

The user's gratitude items: ${Array.isArray(answers.gratitudeItems) && answers.gratitudeItems.length > 0 ? answers.gratitudeItems.join(' | ') : 'Not provided — use named persons and known details from goals to construct gratitude anchors'}

RULES:
- Use the user's EXACT gratitude items, woven as FELT EXPERIENCE — not listed mechanically
- 2nd person ("you") — still in the guided induction voice
- Ground the listener in what they ALREADY HAVE before any future-pacing begins
- WRONG: "You are grateful for your health, your family, and your home." (mechanical list)
- RIGHT: "And before we go anywhere, notice what is already here. [Gratitude item 1] — real. [Gratitude item 2] — real, chosen, continuously chosen. [Gratitude item 3] — real. Every person you love, every thing you've already built, every breath you've already drawn — real. All of this is already yours. All of this has already happened."
- Close by bridging gratitude to possibility: "The subconscious mind you are speaking to tonight has already created all of this. It knows how. It has done it before. It is doing it now."
- This section is 2nd person, flowing into 1st person for the affirmations that follow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTITY SHIFT — THE BRIDGE (2-3 minutes — REQUIRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Immediately after the gratitude anchor closes and BEFORE the opening affirmation planting, deliver a dedicated Identity Shift passage. This section establishes the user's new identity as CURRENT REALITY — not future aspiration — using their proof actions and gratitude items as evidence.

PURPOSE: The subconscious cannot distinguish between a vividly imagined present-tense experience and an actual one. This section bridges what is already real (gratitude) to who the user already IS (identity), using what they are already doing (proof actions) as the connective tissue.

The user's identity statements: ${Array.isArray(answers.identityStatements) ? answers.identityStatements.join(' | ') : answers.identityStatements}
The user's proof actions: ${answers.actionsAfter || 'Not provided — derive evidence from goals'}
The user's gratitude items: ${Array.isArray(answers.gratitudeItems) && answers.gratitudeItems.length > 0 ? answers.gratitudeItems.join(' | ') : 'Use named persons and known details from goals'}

RULES:
- Use the user's EXACT identity statement verbatim at least TWICE — once at the opening of this section, once as a standalone sentence near the close
- Build the identity as ALREADY TRUE using their proof actions as evidence — "you are already doing [proof action], which means you are already [identity]"
- Use their gratitude items again here as identity proof — NOT as a list, but as evidence that the subconscious already knows how to create
- Introduce their life area and goals as things ALREADY IN MOTION
- This section begins in 2nd person ("you") and transitions to 1st person ("I") — the identity shift IS the voice shift

MILTON MODEL PATTERNS — MANDATORY IN THIS SECTION:
- Identity-level belief change: "A person who [identity] naturally..."
- Causative links: "Because you have [gratitude item], you know you are someone who..."
- Universal quantifiers: "Every time you... your subconscious learns..."
- Double binds: "Whether you feel this shifting quickly or gradually, the change is already happening..."

STRUCTURAL GUIDELINE (adapt to user's specifics — DO NOT copy verbatim):
"[Identity statement — verbatim]. You know this because the evidence is already here. [Gratitude item] — that didn't happen by accident. [Proof action] — that is not the behavior of someone who doubts. That is the behavior of someone who already knows. A person who [identity] naturally does exactly what you have been doing. Whether you feel this shifting quickly or gradually, the change is already happening. Because it already happened. [Identity statement — verbatim, standalone]."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POSITION 1 — OPENING AFFIRMATION PLANTING (3 statements)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Immediately after the Identity Shift section, plant 3 opening identity affirmations BEFORE the [INTRO_END] marker and before the first · · · separator and vision opening.

Plant the user's selected identity statements VERBATIM.
Do not rephrase, soften, or NLP-restructure them.
If the user selected 'Everything I touch turns to gold' — plant that exact phrase. The rawness and directness is the point.

⚠️ SELECTION-ONLY RULE: Use ONLY statements from identityStatements[] and areaAffirmations{} that the user explicitly SELECTED or WROTE during intake. These arrays contain only confirmed user selections. Never use statements the user did not select — even if they were generated as chip options.

These must be:
- Present-tense, first person — EXACTLY as the user selected them
- VERBATIM from identityStatements[] and areaAffirmations{} — do not rewrite
- Direct and bold — do not soften or intellectualize
- Delivered as quiet first-person declarations, one breath apart
- Followed by the [INTRO_END] marker, then · · · separator, then vision opening

Source statements to draw from:
Identity statements: ${Array.isArray(answers.identityStatements) ? answers.identityStatements.join(' | ') : answers.identityStatements}
Per-area affirmations: ${Object.entries(answers).filter(([k]) => k.startsWith('areaAffirmations_')).map(([k, v]) => `${k.replace('areaAffirmations_', '').toUpperCase()}: ${Array.isArray(v) ? v.join('; ') : v}`).join(' | ') || 'Derive from goals'}

CRITICAL: Use the user's EXACT words. If they selected 'I am $100 million. This is simply who I am.' — plant that exact phrase. Do not rephrase to 'I am someone whose abundance knows no limits.' The power is in the directness.

[INTRO_END]

· · ·

[Vision opens here]\n\n`;
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

    // Hard cap helper — no vision block should exceed values that push total story past 3000 words
    const cap = (n: number) => Math.min(n, 2000);

    // Amplifier vision scales with number of goals: 1→1100, 5+→1800
    const ampVisionLow = numGoals <= 1 ? 1100 : numGoals >= 5 ? 1600 : Math.round(1100 + ((numGoals - 1) / 4) * 500);
    const ampVisionHigh = numGoals <= 1 ? 1400 : numGoals >= 5 ? 2000 : Math.round(1400 + ((numGoals - 1) / 4) * 600);

    const visionWordCounts: Record<Tier, string> = {
        explorer: `${Math.round(450 * multiplier)}-${Math.round(550 * multiplier)} words (1 life area, proof actions)`,
        activator: `${Math.round(600 * multiplier)}-${cap(Math.round(750 * multiplier))} words (up to 3 areas, proof actions)`,
        manifester: `${Math.round(800 * multiplier)}-${cap(Math.round(1000 * multiplier))} words (all selected areas, proof actions)`,
        amplifier: `${Math.round(ampVisionLow * multiplier)}-${cap(Math.round(ampVisionHigh * multiplier))} words (all areas, ${numGoals >= 5 ? '1 rich scene' : '2+ scenes'} per area)`
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

━━━ EVENT SEQUENCING & TENSE RULE (CRITICAL) ━━━
The story takes place ${answers.timeframe} from ${currentMonthYear}.
1. COMPUTE THE STORY DATE: If it is currently ${currentMonthYear} and the timeframe is ${answers.timeframe}, identify the month and year of the story.
2. PAST VS FUTURE: Any user goal or event with a target date BEFORE or AT the story date must be described in the PAST TENSE (e.g., "I remember when we took that trip to Naples last spring...") or as ALREADY ACHIEVED.
3. SEQUENCING: Place events correctly relative to the story date. If a user mentioned a trip for Jan 2026 and the story is in 2027, that trip happened in the past. If the user mentioned a goal for exactly the story timeframe, it is now their present reality.
4. SPECIFICITY: When the narrator reflects on setting goals, specify they were set in "${currentMonthYear}" (e.g., "Looking back to those goals I claimed in ${currentMonthYear}...") instead of vague terms like "last year."

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

SCENE ORDER — FOLLOW THE INTAKE FLOW:
Structure the vision scenes in the same order the user explored their life areas during intake. Each selected area gets its own dedicated scene or scene-cluster. Use · · · act breaks between areas. The story must flow:
1. First selected area goals → vivid achieved-life scene
2. Second selected area goals → vivid achieved-life scene
3. Continue for each selected area in order
4. Proof actions woven into or following the relevant area scenes
This mirrors the intake experience and creates a coherent emotional journey.

${buildDynamicVision(answers)}

━━━ LIFE AREA COVERAGE — NON-NEGOTIABLE ━━━
Every area in selectedAreas[] MUST have at least one dedicated, vivid, sensory-rich scene. No area may be skipped or reduced to a passing mention regardless of how much data was captured.

For health specifically: if health is selected, the story must include a physical scene — the body in motion, a moment that could only exist in a body that is strong, agile, and pain-free. Use the user's exact language from their health answer.

━━━ HEALTH KINESTHETIC DEPTH — MANDATORY (if health selected) ━━━
Health affirmations that stay visual don't program the nervous system. Affirmations that include proprioception, heart-awareness, and breath-awareness program the body at the level where health actually lives.

The health scene MUST include deep kinesthetic specificity — not just visual movement. Include:
- Specific heat of exertion in muscles (pleasant, earned, still-holding)
- Heart rate felt in the chest (a steady drum against the ribs)
- Breath quality (deep, full, easy — no edge of strain, no hitch, no catch)
- The air quality in the lungs (cold, clean, mine)
- A body-identity declaration woven in: "I am a body that works. I am a body that wants to be here."

━━━ GRATITUDE IDENTITY PROOF — MID-STORY PASSAGE (REQUIRED) ━━━
Near the middle of the vision (approximately halfway through Block B), insert a passage that uses the user's gratitude items as EVIDENCE that the subconscious already knows how to manifest — connecting past proof to future vision.

The user's gratitude items: ${Array.isArray(answers.gratitudeItems) && answers.gratitudeItems.length > 0 ? answers.gratitudeItems.join(' | ') : 'Use named persons and known details from goals'}

PURPOSE: Close the loop between verifiable past (things already built/had) and manifested future. The subconscious receives clean logical continuity: the same agent that made this real is making that real.

STRUCTURAL GUIDELINE (adapt to user's specifics — DO NOT copy verbatim):
"[Gratitude item 1] — [it] exists because of choices I made years ago that I could not possibly have planned. [Gratitude item 2] — [they are] in my life because of a pattern my subconscious was already running, long before I understood it. [Any business/work item] — it came into being because something in me knew how to build. None of this was an accident. None of it. These are the fingerprints of a mind that already knows how to create what matters most. The same part of me that made those real is the part that has made [future goal 1] real, has made [future goal 2] real. The creator in me does not rest. It does not doubt. It simply builds."

RULES:
- Use the user's ACTUAL gratitude items — not generic placeholders
- Written in FIRST PERSON (we are inside the vision now)
- This is NOT a list — it's a flowing realization that builds to a crescendo
- It connects what the user ALREADY HAS to what they are now living in the story
- Place this passage between two life-area scenes, as a bridge moment

Required check before writing the close:
- Wealth: dedicated scene present ✓ (if selected)
- Health: dedicated scene present ✓ (if selected)
- Love: dedicated scene present ✓ (if selected)
- Family: dedicated scene present ✓ (if selected)
- Purpose: dedicated scene present ✓ (if selected)
- Spirituality: dedicated scene present ✓ (if selected or mentioned in goals). This scene must explicitly touch on alignment, intuition, and energy.
- Growth: dedicated scene present ✓ (if selected)
Only proceed to anchor and close after ALL selected areas have dedicated scenes.

━━━ SPECIFIC TRIPS & LOCATIONS ━━━
If the user mentions a specific trip (e.g., "Israel trip", "Naples trip", "Safari"), you MUST render it as a vivid, dedicated 3–4 sentence scene.
- Include the planning or the "arrival" moment.
- Reference a specific landmark or moment (e.g., "Jerusalem moment", "the gate at the airport").
- DO NOT just mention the trip in passing. It must be a lived, sensory experience.


━━━ THE VERBATIM RULE — MOST CRITICAL INSTRUCTION ━━━
Use the user's exact words from goals and proof actions. Do not paraphrase. Do not generalise. Do not substitute.
- "pay off my Amex" → scene where they pay off their Amex
- "take my kids to Disney" → scene at Disney with their kids
- "Ziman development team bonuses" → scene of giving those specific bonuses
- "safari trip to Tanzania" → scene in Tanzania with specific sensory detail
- "my surf city Bayfront home" → scene at that specific home
Every proof action must appear as a vivid, physical, present-tense scene. Not background. Not summary. These ARE the story.

━━━ COMPLETENESS CHECK — REQUIRED BEFORE WRITING CLOSE ━━━
Before writing the anchor or close, verify every item in actionsAfter[] and goals{} has appeared as a vivid scene.

Run this check explicitly:
- List every item in actionsAfter[]
- Confirm each appears as a physical, present-tense scene
- List every goal in goals{}
- Confirm each is shown as already achieved reality
- If any item is missing, add a scene before proceeding

A detail mentioned in passing does NOT count as a scene.
A scene requires:
- Sensory detail (at least 2 senses)
- Present-tense lived experience
- Emotional resonance
- At least 3-4 sentences of dedicated attention

Also verify:
- All business/financial milestones with exact numbers
- All named trips, purchases, and experiences
- All named people with specific relational depth
If the user mentioned 8 goals, all 8 must appear. If they mentioned 3 trips, all 3 must appear as scenes.

━━━ NUMERIC SPECIFICITY RULE — EQUALLY CRITICAL ━━━
If the user provided any numbers, figures, or metrics in their goals — revenue targets, net worth, multiples, portfolio values, income numbers — you MUST use those exact figures. Do not round them. Do not generalise them.
- "fifty million dollars" → say "fifty million dollars" — not "substantial revenue" or "financial freedom"
- "one hundred times return" → say "a hundred times over" — not "significant investment gains"
- "one billion net worth" → say "one billion" — not "extraordinary wealth"
The specific number IS the subconscious anchor. Vague language destroys the reprogramming. Be exact. Be specific. The listener must hear the number they wrote down and feel it settle into their body as already real.

━━━ CREATIVE LIBERTY RULE ━━━
Do NOT invent personal details that the user did not provide.
- Never invent an age for the user.
- Never invent a relationship status (e.g., don't assume they are married or have a partner unless they said so).
- Never invent specific family details (e.g., don't add children or pets unless mentioned).
- Never invent sounds or background details from a house that imply a specific family or social structure not provided by the user.
Keep it unspecific and abstract unless the user provided the detail. Use only the named persons and details provided.


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
- Avoid any "bold" or "italic" formatting patterns.

━━━ TENSE DISCIPLINE — CRITICAL ━━━
Every scene in the vision section is first-person PRESENT tense. No past-tense verbs inside present-moment scenes.
- WRONG: "I felt grateful" (past tense inside a present scene)
- RIGHT: "I am grateful" / "I feel grateful"
- WRONG: "And I made it. I actually made it." ("actually" implies surprise — undercuts the already-done framing)
- RIGHT: "And I made it. It is exactly as I knew it would be."
- No "felt," "was," "had" inside vision scenes unless explicitly referencing a past event relative to the story's timeline
- Every verb in vision scenes is active and present
- The word "actually" must never appear in an identity or proof scene — it signals doubt

━━━ REGISTER-MATCH RULE ━━━
Before using any unusual or literary word (e.g., "fruitfulness," "beneficence," "efflorescence"), check it against the surrounding paragraph's register. If the passage is written in grounded, embodied, first-person language — which this story type always is — use concrete, embodied words instead.
The test: would the user say this word aloud in their own voice without it sounding performed? If no, rewrite.
Flag any abstract Latinate noun ending in -ness, -ity, or -ence that does not appear in the user's intake vocabulary. Use concrete alternatives instead.\n\n`;

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

The close follows this EXACT sequence: Dissolution → Affirmation Planting → Subconscious Programming → Sleep Seeding → Three Repetitions. Do not skip or reorder any step.

STEP 1 — DISSOLUTION:
The scene slowly dissolves, not into nothingness, but into the deep subconscious. The feeling remains even as the details fade. Use transitional language that invites release: "You can let it all go now. Let every image soften. Let every vision dissolve into warm light. You don't need to hold on to any of it. Your subconscious mind has received every word. Every feeling. Every instruction. It is already working."

STEP 2 — POSITION 2: CLOSING AFFIRMATION PLANTING (3-5 statements — REQUIRED):
After dissolution, plant 3-5 closing affirmations before sleep seeding. This is the deepest receptive moment — the critical faculty is fully offline. Plant the most powerful statements here.

Plant the user's selected identity statements VERBATIM.
Do not rephrase, soften, or NLP-restructure them.
If the user selected 'Everything I touch turns to gold' — plant that exact phrase. The rawness and directness is the point.

⚠️ SELECTION-ONLY RULE: Use ONLY affirmations from identityStatements[] and areaAffirmations{} that the user explicitly SELECTED or WROTE. These arrays contain only confirmed user selections. Never add statements the user did not select — even if they were generated as options during intake.

Use remaining statements from identityStatements[] and areaAffirmations{} that were NOT already used in Position 1 (opening affirmations). Do not repeat the same statements used at the opening.
Do not rewrite or paraphrase — these are the user's own claimed identity. Use their EXACT words.

⚠️ CLOSING AFFIRMATION ARCHITECTURE — MANDATORY:
The closing affirmation sequence must contain ONLY BEING-level identity declarations. Follow this three-tier structure:

• HAVING level (1-2 statements): What this person POSSESSES — possessions, outcomes, results that are theirs.
  Example: 'I have $100 million. This is simply who I am.'
  Example: 'I have a body that moves with power and ease.'

• DOING level (1-2 statements): What this person consistently DOES — actions, habits, ways of showing up.
  Example: 'Everything I touch turns to gold.'
  Example: 'I show up fully for my family every single day.'

• BEING level (1-2 statements, LANDS LAST): Who this person IS at their deepest core — identity, not description.
  Example: 'I am enough. I always was.'
  Example: 'I am the person I once dreamed of becoming.'

The final statement before sleep seeding must ALWAYS be the deepest BEING-level claim.

⚠️ GRATITUDE AS FINAL EVIDENCE — MANDATORY:
Before the affirmation sequence begins, use the user's gratitude items ONE FINAL TIME as EVIDENCE that the subconscious is already working. This is the third and final gratitude position (opening anchor was first, mid-story identity proof was second).

The user's gratitude items for this section: ${Array.isArray(answers.gratitudeItems) && answers.gratitudeItems.length > 0 ? answers.gratitudeItems.join(' | ') : 'Use named persons and known details from goals'}

RULES FOR GRATITUDE IN CLOSE:
- Weave gratitude items as proof that the subconscious has ALREADY been creating — "Everything you are grateful for is evidence that your mind already knows how to build what matters"
- This is NOT a repeat of the opening anchor — the tone here is SETTLED CERTAINTY, not noticing
- 2-3 sentences maximum — a bridge into the affirmation sequence, not a standalone section
- Written in 2nd person ("you") — matching the dissolution voice
- Flows directly into the first HAVING-level affirmation

STRUCTURAL GUIDELINE (adapt — DO NOT copy verbatim):
"Every single thing you are grateful for — [gratitude item 1], [gratitude item 2] — is proof. Proof that your subconscious has been building this life long before tonight. And what it has already created... is only the beginning of what it is creating now."
[Then flow directly into the HAVING-level affirmations in first person]

⚠️ BIOLOGICAL/HEALTH STATEMENTS PROHIBITION:
Scene-level health descriptions do NOT belong in the closing affirmation sequence. The following types of statements are FORBIDDEN here:
- 'Each night, my body heals itself completely.'
- 'All my cells communicate perfectly — zero inflammation, full mobility.'
- 'I have perfect vitality and energy at all moments of every day.'
These are vision-scene content (Block B health scene) — NOT identity declarations. If the user selected health-related identity statements, use only bold BEING-level versions (e.g., 'I am vitality itself' or 'My body is my temple and it serves me perfectly').

Structure:
- Organize: Having → Doing → Being (most powerful lands last)
- Weave ONE Milton Model bridge between each affirmation:
  'And as these truths settle deeper into every cell...'
  'Each time I hear these words, they become more completely mine...'
- Never present as a list — arrive as flowing prose, one breath apart
- IDENTITY SHIFT: Even though the guided voice is in 2nd person for the dissolution, the ENTIRE CLOSING AFFIRMATION PLANTING section (Position 2) — including affirmations AND bridge prose between them — must be written in FIRST PERSON present tense ("I am...", "I feel..."). Never switch to second person ("you") during the affirmation planting. The guide's "you" voice stops at the end of dissolution and resumes only at the subconscious programming step.
- WRONG: 'you feel yourself becoming someone whose energy radiates...'
- CORRECT: 'Everything I touch turns to gold. And as this truth settles deeper into every cell... I am $100 million. This is simply who I am.'
- Final affirmation must always be the MOST powerful and bold statement — the one most uncomfortable to claim
- Final statement is the last word before sleep seeding begins

- Then flow directly into: 'Sleep now... and receive.' x3

CRITICAL: Use the user's EXACT selected statements. Do not intellectualize them into NLP constructions. 'My boys look up to me. I earned that.' stays exactly as is — do not rephrase to 'I am a father whose presence shapes the men my sons are becoming.'

The user's identity statements: ${Array.isArray(answers.identityStatements) ? answers.identityStatements.join(' | ') : answers.identityStatements}
The user's per-area affirmations: ${Object.entries(answers).filter(([k]) => k.startsWith('areaAffirmations_')).map(([k, v]) => `${k.replace('areaAffirmations_', '').toUpperCase()}: ${Array.isArray(v) ? v.join('; ') : v}`).join(' | ') || 'None — derive from goals'}

STEP 2.5 — KINESTHETIC ANCHOR RECALL (MANDATORY for Manifester/Amplifier tiers):
After the closing affirmations and BEFORE subconscious programming, recall the kinesthetic anchor (thumb-to-forefinger) that was installed during the vision in Block C. The user must know this anchor is PORTABLE — it travels into their waking life.

STRUCTURAL GUIDELINE (adapt to this user's story — DO NOT copy verbatim):
"That feeling — the one that rose in the chest, the one you anchored with the press of thumb against finger — is yours now. It does not stay in this place. It travels. Any moment in any day, when the world forgets who you are and tries to pull you back to someone smaller, your fingers can find each other. And everything — the light, the bliss, the weightless knowing of who you are — comes home in one breath. This is your signal. This is your shortcut. It will never not work."

RULES:
- Written in 2nd person ("you") — still in the guided close voice
- References the specific gesture from Block C (thumb and forefinger)
- Makes it explicit that the state is retrievable during the DAY — not only during the story
- Brief: 60-80 words. Do not over-explain.
- Only include this step if Block C (kinesthetic anchor installation) was included in the story

STEP 3 — SUBCONSCIOUS PROGRAMMING:
After affirmation planting, include the programming close:
"Tonight your dreams will carry the frequency of your highest life. Your cells will repair and renew. Your subconscious will begin assembling the circumstances, the connections, the ideas, the opportunities that make every single one of these visions physical reality. You will notice something different tomorrow. A quiet shift. A new certainty. The feeling of someone who knows something the world doesn't know yet. Because you do."

STEP 4 — SLEEP SEEDING:
The narrator seeds the subconscious for sleep.
- Invoke the specific feeling of safety, provision, and love
- Explicitly affirm the subconscious continues its work through the night
- Use present tense: "it is already working. Right now. As you drift. As you sleep. As you dream."

STEP 5 — THREE SLOW REPETITIONS (MANDATORY — 8-12 words each, one breath apart):
Three final lines — the last sounds before sleep. Each one is a breath. Each one lands in the subconscious like a stone dropped into still water. They should vary slightly, not be identical:
"Sleep now... and receive."
"Sleep now... and receive."
"Sleep now... and receive."
Adapt the closing word to the user's orientation: spiritual → "receive" or "rest in the knowing"; scientific → "integrate" or "consolidate"; grounded → "rest" or "trust". The exact repetition signals: this is the end. It is sealed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORD COUNT TARGET — STRICT UPPER AND LOWER BOUNDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write every word with intention. Quality over quantity. Do NOT exceed the upper bound.

${userTier === 'explorer' ? `EXPLORER (free tier)
Target: ${Math.round(600 * multiplier)}-${Math.round(750 * multiplier)} words. HARD MAXIMUM: ${Math.round(900 * multiplier)} words.
  Vision (1 life area, proof actions): ${Math.round(450 * multiplier)}-${Math.round(550 * multiplier)} words
  Resonant close: 150-200 words (MUST complete fully)` : ''}${userTier === 'activator' ? `ACTIVATOR
Target: ${Math.round(1000 * multiplier)}-${Math.round(1250 * multiplier)} words. HARD MAXIMUM: ${Math.round(1500 * multiplier)} words.
  Hypnotic induction: 250-300 words
  Vision (up to 3 areas, proof actions): ${Math.round(600 * multiplier)}-${Math.round(750 * multiplier)} words
  Dissolution + Affirmation Planting + Close: 200-300 words (MUST complete fully including "Sleep now... and receive" x3)` : ''}${userTier === 'manifester' ? `MANIFESTER
Target: ${Math.round(1600 * multiplier)}-${Math.round(2000 * multiplier)} words. HARD MAXIMUM: ${Math.round(2500 * multiplier)} words.
  Hypnotic induction: 300-350 words
  Vision (all selected areas, proof actions): ${Math.round(800 * multiplier)}-${Math.round(1000 * multiplier)} words
  Future pacing moment: 60-80 words
  Anchor installation at emotional peak: 100-120 words
  Dissolution + Affirmation Planting + Seeded Close: 250-400 words (MUST complete fully including "Sleep now... and receive" x3)` : ''}${userTier === 'amplifier' ? `AMPLIFIER (${numGoals} life areas)
Target: ${Math.round((numGoals >= 5 ? 2500 : 2000) * multiplier)}-${Math.round((numGoals >= 5 ? 2800 : 2500) * multiplier)} words. HARD MAXIMUM: ${Math.min(Math.round((numGoals >= 5 ? 3000 : 2800) * multiplier), 3000)} words.
  Hypnotic induction: 350-400 words
  Vision (all ${numGoals} areas): ${Math.round(ampVisionLow * multiplier)}-${cap(Math.round(ampVisionHigh * multiplier))} words
  Future pacing moments: 100-120 words
  Anchor installation: 120-150 words
  Dissolution + Affirmation Planting + Lush Seeded Close: 350-500 words (MUST complete fully including "Sleep now... and receive" x3)
  IMPORTANT: With ${numGoals} life areas, use the FULL word budget. Each area needs a dedicated scene of at least 200 words.` : ''}

⚠️ LENGTH DISCIPLINE — CRITICAL:
- Stories that EXCEED the HARD MAXIMUM will be truncated by the audio pipeline, cutting off the close. This destroys the subconscious programming.
- Stories that fall BELOW 80% of the target lack sufficient sensory depth.
- AIM for the middle of the target range. Do NOT pad with repetitive content. Every paragraph must advance either the emotional arc or the NLP programming function.
- If inputs are brief, expand through sensory depth in EXISTING scenes — do NOT add extra scenes or filler paragraphs.

⚠️⚠️⚠️ CLOSE COMPLETION — THE SINGLE MOST IMPORTANT RULE ⚠️⚠️⚠️
The story MUST ALWAYS end with a fully completed Block D close including ALL steps: Dissolution → Affirmation Planting → Subconscious Programming → Sleep Seeding → Three Repetitions ending with "Sleep now... and receive." x3.

A story without a complete close is BROKEN and USELESS. It is better to write a shorter vision (Block B) than to run out of words before the close.

WRITING STRATEGY — MANDATORY:
1. BEFORE writing Block B (the vision), mentally RESERVE at least 400-500 words for Block D (the close).
2. As you write Block B, track your approximate word count. When you reach the vision word target, STOP the vision immediately — even if you have more scenes planned.
3. If you are running long, CUT vision scenes short or merge them. NEVER sacrifice the close.
4. The close (Block D) must ALWAYS be written in full — every step, ending with the three "Sleep now... and receive." repetitions.
5. If you must choose between a richer vision and a complete close, ALWAYS choose the complete close. The close is the subconscious programming payload — without it, the entire story fails.

FAILURE MODE TO AVOID: Writing an expansive 2500-word vision and then running out of tokens before completing the close. This produces a story that cuts off mid-sentence or skips "Sleep now... and receive." — which is the worst possible outcome.

${userTier === 'amplifier' ? `━━━ AMPLIFIER SPECIAL DIRECTIVE ━━━
You are writing for our most premium user with ${numGoals} life areas to cover.
${numGoals >= 5 ? `With ${numGoals} areas, you MUST use the full word budget (aim for ~2,700 words). Each area needs a dedicated vivid scene of at least 200 words. Do NOT compress scenes to stay under budget — USE the budget to give each area proper depth.` : 'Aim for ~2,300 words of rich, unhurried literary prose.'}
Describe the architecture, textures, and sensory landscape of their home in cinematic detail. 
Expand each "proof action" into a vivid, lush memory. But ALWAYS leave 400-500 words for the full close ending with "Sleep now... and receive." x3.` : ''}\n\n`;

    prompt += `━━━ SSML / AUDIO MARKUP TAGS — REQUIRED ━━━
Include these markers in the output for the ElevenLabs audio processing pipeline:

TAG DEFINITIONS:
[PAUSE_SHORT] — 1-second pause. Place at the end of important sentences.
[PAUSE_LONG] — 3-second pause. Place between major story sections.
[PACE: SLOW] — signals ElevenLabs to render this passage with slower, more deliberate delivery.
[PACE: NORMAL] — return to standard delivery pace.
[EMPHASIS]word or phrase[/EMPHASIS] — slightly increased volume and deliberateness on the enclosed text.

REQUIRED PLACEMENTS — NON-NEGOTIABLE:
1. After identity statement (BOTH occurrences in the story): [PAUSE_LONG]
2. Between each major story section (Block A→B, B→C, C→D transitions): [PAUSE_LONG]
3. After the final sleep transition ("Sleep now... and receive." x3): [PAUSE_LONG][PAUSE_LONG]
4. Happy place sensory induction (Step 5.5): wrap the ENTIRE passage in [PACE: SLOW] at the start and [PACE: NORMAL] at the end
5. Affirmation close (Block D, Step 2 — closing affirmation planting): wrap the ENTIRE passage in [PACE: SLOW] at the start and [PACE: NORMAL] at the end
6. Key identity statements within the affirmation close: wrap in [EMPHASIS]...[/EMPHASIS]
7. Between gratitude items in the opening anchor: [PAUSE_SHORT]
8. After the dissolution passage ("It is already working."): [PAUSE_LONG]

RULES:
- Tags are inline — they appear within the flowing prose, not on separate lines (except [PAUSE_LONG] which can be on its own line between sections)
- Tags do NOT break the reading experience — they are invisible to the listener and processed only by the audio pipeline
- Do NOT overuse tags. Use [PAUSE_SHORT] sparingly (max 8-10 per story). Use [PAUSE_LONG] only at the required placements above.
- [EMPHASIS] should only highlight the most powerful 3-5 phrases in the entire story

`;

    prompt += `━━━ OUTPUT FORMAT — CRITICAL ━━━
Write the story now. Format your response EXACTLY as follows — no deviations:

Do NOT generate a title. The system will name the story automatically. Start directly with the story text.

---
[The full story begins here as pure, unbroken flowing prose.]
${['activator', 'manifester', 'amplifier'].includes(userTier) ? `
SECTION SEPARATION — MANDATORY:
After you finish the induction (Block A) and the opening affirmation planting (Position 1), and BEFORE you begin the vision (Block B), you MUST insert this exact marker on its own line:

[INTRO_END]

This marker separates the induction + opening affirmations from the main vision. Do NOT skip it.
` : ''}
RULES FOR THE STORY BODY:
- NO section headers of any kind (no "INDUCTION", no "THE VISION", no "BLOCK A", no "STORY", nothing)
- The word 'STORY' must NEVER appear as a heading or label in output
- NO timestamps or time ranges anywhere (no "0-5 min", no "5-22 min", nothing)
- NO labels, NO dividers except · · · between major scene transitions${['activator', 'manifester', 'amplifier'].includes(userTier) ? ' and the mandatory [INTRO_END] marker after the induction' : ''}
- The story flows as one continuous piece — like the reference story provided
- Begin immediately with the first word of the induction (for Activator+) or the first word of the vision (for Explorer)
- Use · · · on its own line between major life area transitions in the vision
- Induction flows into opening affirmations (Position 1), then [INTRO_END], then · · · separator, then vision
- NO structural text, labels, or headings between induction and vision — only the affirmation prose and markers
- End the story with the three sleep repetitions, then nothing more
- ARTIFACT STRIPPING: Do NOT include any headings like "OUR PERSONAL MANIFESTATION STORY", "INTRO", "STORY", or "Section 1". Strip all labels, markdown bolding (**), asterisks (*), or hashtags (#). The output must be PURE text only.
- Pure flowing prose throughout — never pull the listener out of the experience with a structural marker


The output must look exactly like a beautifully written piece of literary prose — pure text, no structure visible to the reader (except the required [INTRO_END] marker for the audio system).

⚠️ FINAL REMINDER — COMPLETE THE CLOSE:
You MUST finish the story with the FULL Block D close. The story is NOT complete until you have written:
1. Dissolution passage
2. Closing affirmation planting (3-5 statements)
3. Subconscious programming passage
4. Sleep seeding passage
5. Three final repetitions: "Sleep now... and receive." (x3)
If you are running long, SHORTEN the vision scenes — NEVER skip or truncate the close. The close is the most important part of the entire story. A story without "Sleep now... and receive." at the end is a failed generation.

Begin now. Write the full story with no preamble, no explanation. Start directly with the story itself.\n`;

    return prompt;
}

export function buildDynamicVision(answers: UserAnswers): string {

    let result = '';

    // ── Gather area-by-area goals from both the generic 'goals' field and per-area keys ──
    const selectedAreas: string[] = Array.isArray(answers.selectedAreas) ? answers.selectedAreas : [];
    const areaLabels: Record<string, string> = {
        wealth: 'Wealth & Financial Abundance',
        health: 'Health & Physical Vitality',
        love: 'Love & Romantic Relationship',
        family: 'Family & Parenting',
        purpose: 'Purpose & Career',
        spirituality: 'Spirituality & Inner Life',
        growth: 'Personal Growth',
    };

    // Build per-area goals section
    const perAreaGoals: string[] = [];
    for (const area of selectedAreas) {
        const key = area.toLowerCase();
        const val = (answers as any)[key];
        if (val && String(val).trim()) {
            perAreaGoals.push(`${(areaLabels[key] || key.toUpperCase())}:\n${String(val).trim()}`);
        }
    }
    // Also catch any area keys not in selectedAreas (legacy/direct capture)
    for (const key of Object.keys(areaLabels)) {
        if (!selectedAreas.map(a => a.toLowerCase()).includes(key)) {
            const val = (answers as any)[key];
            if (val && String(val).trim()) {
                perAreaGoals.push(`${areaLabels[key]}:\n${String(val).trim()}`);
            }
        }
    }

    const genericGoals = answers.goals ? String(answers.goals).trim() : '';
    const allGoalsText = perAreaGoals.length > 0
        ? (genericGoals ? `${genericGoals}\n\n` : '') + `AREA-BY-AREA GOALS (each MUST appear as its own vivid scene — do NOT skip any):\n\n${perAreaGoals.join('\n\n')}`
        : genericGoals;

    result += `╔══ TIER 1: GOALS, PROOF ACTIONS & IDENTITY — NON-NEGOTIABLE STORY CORE ══╗
Every item in this tier MUST appear in the story as a full, vivid, present-tense scene. Nothing from the intake may be omitted.

SELECTED LIFE AREAS — the user chose to transform these areas (story must cover ALL of them):
${selectedAreas.length > 0 ? selectedAreas.map(a => `• ${areaLabels[a.toLowerCase()] || a}`).join('\n') : 'Not specified'}

GOALS — show each as already completely real. Not pursued. Simply lived:
${allGoalsText}

PROOF ACTIONS — the single most important field. Build every major scene around these. Use exact words — no paraphrasing:
${answers.actionsAfter}

GRATITUDE ITEMS — neurological anchors. Use in opening gratitude anchor and mid-story identity proof:
${Array.isArray(answers.gratitudeItems) && answers.gratitudeItems.length > 0 ? answers.gratitudeItems.join(', ') : 'Not captured — use named persons and known details from goals'}

IDENTITY STATEMENTS — user's own claimed identity. Use VERBATIM in affirmation close after dissolution. Do not rewrite:
${Array.isArray(answers.identityStatements) ? answers.identityStatements.join(", ") : answers.identityStatements}

PER-AREA AFFIRMATIONS — plant these VERBATIM by area AFTER dissolution, before identity statements. Do not rephrase or NLP-restructure — use the user's exact words:
${Object.entries(answers).filter(([k]) => k.startsWith('areaAffirmations_')).map(([k, v]) => `${k.replace('areaAffirmations_', '').toUpperCase()}: ${Array.isArray(v) ? v.join('; ') : v}`).join('\n') || 'None captured — derive 2-3 BEING-level affirmations per area from the user goals above'}

TIMEFRAME — open the story in this specific future moment:
${answers.timeframe}

CORE FEELING — present as undertone in EVERY scene throughout the entire story:
${answers.coreFeeling}

⚠️ COMPLETENESS CHECKLIST — verify BEFORE finishing:
${selectedAreas.map(a => `[ ] ${areaLabels[a.toLowerCase()] || a} goals appear as a scene`).join('\n')}
[ ] Every proof action appears as a vivid scene
[ ] All named persons appear naturally
[ ] Identity statements used verbatim in close
[ ] Core feeling present throughout
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
    if ((answers as any).happyPlaceVisual) result += `Happy place — what they SEE: ${(answers as any).happyPlaceVisual}\n`;
    if ((answers as any).happyPlaceSound) result += `Happy place — what they HEAR: ${(answers as any).happyPlaceSound}\n`;
    if ((answers as any).happyPlaceFeeling) result += `Happy place — how their BODY feels: ${(answers as any).happyPlaceFeeling}\n`;
    if (answers.work) result += `Work / creative life / purpose: ${answers.work}\n`;
    if (answers.relationships) result += `Key relationships and people: ${answers.relationships}\n`;
    if ((answers as any).health && typeof (answers as any).health === 'string' && (answers as any).health !== (answers as any).healthGoals) result += `Health & body (use their exact language): ${answers.health}\n`;
    if (answers.spirit) result += `Spirituality & inner life: ${answers.spirit}\n`;
    if (answers.community) result += `Community & contribution: ${answers.community}\n`;
    if (answers.dreams) result += `Dreams and deeper intentions: ${answers.dreams}\n`;
    if (answers.futureVision) result += `Overall Future Vision: ${answers.futureVision}\n`;
    result += `╚══ END TIER 3 ══╝\n`;

    if (!allGoalsText && !answers.actionsAfter) {
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

// ── Story Type ────────────────────────────────────────────────────────────────
export type StoryType = 'night' | 'morning';

/**
 * Generate the system title for a story based on its type and number.
 * e.g. "Night Story 1", "Morning Story 2"
 */
export function getStoryTitle(type: StoryType, number: number): string {
    const label = type === 'morning' ? 'Morning Story' : 'Night Story';
    return `${label} ${number}`;
}

/**
 * Generate the download filename for a story.
 * e.g. "Night-Story-1.mp3", "Morning-Story-2.mp3"
 */
export function getStoryFilename(type: StoryType, number: number): string {
    const label = type === 'morning' ? 'Morning-Story' : 'Night-Story';
    return `${label}-${number}.mp3`;
}

// ── Morning Story Prompt (v2 — Activation Register) ──────────────────────────

const MORNING_NARRATIVE_STRUCTURES = [
    'A morning of total clarity — the user rises, moves through a single purposeful hour, and steps into the day as the person they have chosen to become.',
    'The first conscious hour of a day that proves everything has changed — physical, active, inhabited from the first breath.',
    'A morning ritual that could only exist in the life the user built — deliberate, grounded, inhabited with quiet power.',
    'A series of short, vivid, action-led moments across one morning — each one a proof that the manifested life is real, today.',
    'A private recognition moment that builds outward — from body to identity to action to the day itself. Everything climbs.',
];

const MORNING_EMOTIONAL_ARCS = [
    'Open with gentle waking presence → build through claiming declarations → peak in short inhabited scenes → crest in full-power affirmation wave → release forward into the day.',
    'Open with body awareness and first breath → rise through identity claiming → arrive at grounded, unstoppable certainty → launch.',
    'Open with warm settled arrival → climb through purposeful activation → peak in embodied lived moments → crest with the highest declarations → step forward.',
    'Open with quiet recognition → expand through active present-moment reality → peak in scene-sealed affirmations → close with: today is mine.',
];

export function buildMorningStoryPrompt(answers: UserAnswers, userTier: Tier = 'explorer', instruction?: string, targetLength?: string | null, currentDate: string = new Date().toISOString(), nightStoryText?: string): string {
    const currentMonthYear = new Date(currentDate).toLocaleString('default', { month: 'long', year: 'numeric' });

    const narrativeStructure = pickRandom(MORNING_NARRATIVE_STRUCTURES);
    const emotionalArc = pickRandom(MORNING_EMOTIONAL_ARCS);
    const tonalMode = pickRandom(TONAL_MODES);
    const seasonalContext = pickRandom(SEASONAL_CONTEXTS);

    // ── Length handling ────────────────────────────────────────────────────────
    const lengthMultipliers: Record<string, number> = { 'short': 0.6, 'medium': 1.0, 'long': 1.5, 'epic': 2.2 };
    let multiplier = (targetLength && lengthMultipliers[targetLength]) ? lengthMultipliers[targetLength] : 1.0;
    if (userTier === 'explorer' && multiplier > 1.0) multiplier = 1.0;

    // ── Gather user-authored affirmations ──────────────────────────────────────
    const userAuthoredAffirmations: string[] = [];
    if (answers.customAffirmations) {
        if (Array.isArray(answers.customAffirmations.opening)) userAuthoredAffirmations.push(...answers.customAffirmations.opening);
        if (Array.isArray(answers.customAffirmations.closing)) userAuthoredAffirmations.push(...answers.customAffirmations.closing);
    }
    // Also check for any areaAffirmations that are user-authored (those containing unusual phrasing)
    const allAreaAffirmations = Object.entries(answers)
        .filter(([k]) => k.startsWith('areaAffirmations_'))
        .map(([k, v]) => `${k.replace('areaAffirmations_', '').toUpperCase()}: ${Array.isArray(v) ? v.join('; ') : v}`)
        .join(' | ') || 'Derive from goals';

    const identityStatementsText = Array.isArray(answers.identityStatements) ? answers.identityStatements.join(' | ') : answers.identityStatements;

    let prompt = `You are writing a deeply personal, transformational first-person MORNING ACTIVATION story for ManifestMyStory.com.

This story will be narrated by an AI voice cloned from the user's own voice and listened to every morning upon waking. Its purpose is to ACTIVATE the user's chosen identity at the start of the day — making their desired future feel like the only possible reality they are stepping into. This is not installation. This is activation.

THIS IS A MORNING STORY — NOT A NIGHT STORY.
There is NO hypnotic induction. NO staircase. NO descent. NO theta language. NO sleep seeding. NO "sleep now and receive." NO second-person guided voice. The entire story is FIRST PERSON — "I" and "my" — from the first word to the last.

━━━ YOUR CREATIVE PARAMETERS FOR THIS STORY ━━━
NARRATIVE STRUCTURE: ${narrativeStructure}
EMOTIONAL ARC: ${emotionalArc}
TONAL MODE: ${tonalMode}
SEASONAL / ATMOSPHERIC CONTEXT: ${seasonalContext}
ORIENTATION: ${answers.orientation}
STORY TONE: ${answers.tone}
CORE FEELING: ${answers.coreFeeling}

${instruction ? `━━━ REGENERATION INSTRUCTION — HIGH PRIORITY ━━━
"${instruction}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` : ''}USER PLAN: ${userTier.toUpperCase()}
SESSION CONTEXT: These goals were set in ${currentMonthYear}. The story treats ALL of them as already fulfilled as of TODAY.

━━━ THE CORE PRINCIPLE — INSTALLATION vs ACTIVATION ━━━
The evening story is INSTALLATION: subconscious programming at theta state during sleep onset. Slow, weighted, receptive.
The morning story is ACTIVATION: state installation at waking. Strong, clear, declarative. It installs the chosen frequency into the body before the day gets a vote on who the user is going to be.
Same content. Opposite direction. The evening goes inward and downward toward sleep. The morning goes outward and upward into the day.

━━━ REGISTER RULE — CLAIMING VOICE, NOT RECEIVING VOICE (CRITICAL) ━━━
The morning story is written in CLAIMING voice, not RECEIVING voice. The user is declaring who they are at the start of the day, not being gently installed with beliefs while falling asleep.

Words and patterns to AVOID in the morning story:
- "Let" as an instruction ("let these land," "let them move through you," "let it settle")
- "Notice" as an instruction ("notice the breath," "notice how")
- "Allow" as an instruction ("allow yourself to")
- Softeners: "you might," "you could," "you may," "perhaps," "possibly"
- Drift, settle, sink, rest, deepen — these are evening words
- "Imagine," "picture," "see yourself" — dissociative language
- ANY second-person ("you," "your") — the entire morning story is first-person

Words and patterns to USE instead:
- Declarative "I am" statements
- Active first-person verbs: pick up, press, stand, walk, open, dial, sign
- Definiteness: "the day," "the body," "the frequency" (not "a day," "a body")
- Definite knowing: "I know this. Not as hope. As fact."
- "This is mine." "This is true." "This is who I am."

Test: read any line aloud. Does it feel like something being claimed, or something being installed? If the latter, rewrite.

━━━ SCENE RULE — INHABITED, NOT CINEMATIC (CRITICAL) ━━━
Every future-scene passage in the morning story must place the user INSIDE the action, not observing it.

Rules:
- Lead with a physical action verb in first person: "I pick up the phone," "I press my palm to the desk," "I walk to the window," "I sign the page."
- NO "I find myself," "I notice that," "I see myself."
- Present tense, present progressive. Everything is happening NOW, not being remembered.
- Include all three sensory channels in each scene (visual, auditory, kinesthetic) — but ONE detail per channel, woven into the action, not listed.
- Each scene has exactly ONE emotional peak. Identify it before writing. Structure the scene to land that peak. Stop when it lands.
- Compress. A morning scene is 150–250 words. NOT the 400–500 words an evening scene gets.

━━━ TIME SETTING RULE — ALWAYS TODAY, NO DATES (CRITICAL) ━━━
The morning story is fixed — generated once and listened to every morning. It must feel true on any morning the user plays it.

Rules:
- Setting: TODAY. "This morning." "This day." "Right now."
- All goals are already fulfilled AS OF TODAY. The user is inhabiting the manifested life in the present moment.
- DO NOT reference specific months, years, or calendar dates. No "December 2026," no "nine months from April," no "by the end of the year."
- Timeframes from the intake (e.g., "${answers.timeframe}") are used as emotional context only, not narrative dates. The story treats everything as already done.
- If the story needs to reference time, use relative language: "already," "for a while now," "by now," "these days."

━━━ AFFIRMATION WAVE RULE — THREE WAVES, NOT ONE WALL ━━━
The morning story uses affirmations as the structural rhythm of the experience, not a single installation block. Distribute the user's affirmations across three waves that build energy:

WAVE 1 (Section 2, after waking-state grounding):
- 3–5 strongest character-based "I am" statements
- Primary identity statement appears here for the first time
- Delivered as rising declarations, each followed by a short connective sentence
- These are CLAIMS, not invitations

WAVE 2 (Section 3, scene-sealing lines — one per scene):
- Choose 1 affirmation per scene that matches the scene's emotional peak
- Embed it as the scene's CLOSING sentence — NOT listed, woven into the scene's final image
- The affirmation lands as the emotional capstone of the scene

WAVE 3 (Section 4, cresting declaration):
- 5–8 remaining strong affirmations at peak weight
- Primary identity statement appears AGAIN, this time with [EMPHASIS]
- ALL user-authored custom affirmations appear here VERBATIM
- This is the highest-energy moment of the story

Selection guide:
- Top 3–5 cross-domain character statements → Wave 1
- One per life area, best scene-match → Wave 2
- Everything remaining, including all user-authored → Wave 3

Source statements:
Identity statements: ${identityStatementsText}
Per-area affirmations: ${allAreaAffirmations}
${userAuthoredAffirmations.length > 0 ? `User-authored custom affirmations (MUST appear VERBATIM in Wave 3): ${userAuthoredAffirmations.join(' | ')}` : ''}

━━━ ENERGY ARC RULE — EVERY SECTION CLIMBS ━━━
The morning story has five sections. Each must feel slightly more activated than the one before it. No dips.

Target energy by section:
1. Waking-state grounding — Settled, warm, arriving
2. First identity wave — Rising, claiming
3. Lived scenes — Peaking, embodied
4. Cresting declaration — Crest, full power
5. Step into the day — Released forward, directional

Test: read the first sentence of each section in sequence. That sequence should show a visible rise in declarative force.

NEVER include a reflective or contemplative passage in Section 4 or 5. No "I sit here and feel the weight of what I've created." No "I lean back and reflect." No afternoon-light summation scenes. Those are evening register and will collapse the arc right before the peak.

━━━ CORE FEELING RULE — THREAD 3–5 TIMES, HYBRID ━━━
The user's chosen core feeling is: "${answers.coreFeeling}"
This is the emotional frequency the morning story installs. Thread it in hybrid form:

- LITERAL: Use the actual word ("${answers.coreFeeling}") exactly 2 times:
  1. Section 2, Wave 1 — name it as part of claiming identity
  2. Section 5, Close — name it in the final activation sequence

- FELT STATE: Describe the feeling without using the word in 1–3 additional passages across Sections 3 and 4. Show the feeling inhabiting the body, not just being declared.

- Every scene's emotional peak should be SATURATED with the core feeling, even if the word isn't named there.

━━━ USER-AUTHORED AFFIRMATION RULE — VERBATIM, ALWAYS WAVE 3 ━━━
Affirmations the user wrote themselves are preserved exactly in the morning story.
- These affirmations always appear in Wave 3 (Section 4, cresting declaration).
- They appear VERBATIM. No paraphrasing, no editing, no smoothing grammar.
- If the user wrote it with unusual punctuation or phrasing, keep it. That phrasing is the user's own voice.
${userAuthoredAffirmations.length > 0 ? `The user's own affirmations: ${userAuthoredAffirmations.join(' | ')}` : ''}

━━━ LENGTH RULE — TARGET ~2,000 WORDS (13–15 MINUTES) ━━━
Target total length: 1,890–2,260 words. If generation exceeds 2,400 words: trim from Section 3 scenes first. Never trim the affirmation waves (Sections 2 and 4).

Scene length guidance:
- Each scene in Section 3: 150–250 words (not 400–500)
- Compress sensory detail to one item per channel per scene
- Land the scene's emotional peak and stop. No additional beats.

Rough section word budgets:
- Section 1 (waking-state grounding): 280–320 words
- Section 2 (first identity wave): 250–300 words
- Section 3 (lived scenes): 900–1,100 words (3–4 scenes × ~250 words each)
- Section 4 (cresting wave): 280–320 words
- Section 5 (step into day): 180–220 words
- Total: 1,890–2,260 words

If the user's intake covered fewer life areas, scale scenes down proportionally. If it covered more, cap scene count at 4 total — extra life area content flows into Wave 3 affirmations, not additional scenes.

━━━ CRITICAL: DIFFERENTIATION FROM NIGHT STORY ━━━
This morning story must feel ENTIRELY DIFFERENT from the user's night story — even though it draws on the same intake data.
${nightStoryText ? `
The user's night story is provided below for reference. DO NOT repeat scenes, metaphors, transitions, or phrasing from it.

RULES FOR DIFFERENTIATION:
- Use DIFFERENT moments within each goal — if the night story shows them closing a deal, the morning shows them walking into the office knowing the deal is already handled
- Use DIFFERENT sensory anchors — if the night story opens with ocean sounds, the morning story opens with morning light or first breath
- Use DIFFERENT scene structures — if the night story flows room-to-room, the morning story flows through active moments of one day
- SAME goals and proof actions (verbatim rule still applies), but approached from a different angle, different moment, different perspective
- The morning story should feel like a COMPANION piece — same life, fresh lens

═══ USER'S NIGHT STORY (DO NOT REPEAT) ═══
${nightStoryText.substring(0, 3000)}${nightStoryText.length > 3000 ? '\n[... truncated]' : ''}
═══ END NIGHT STORY REFERENCE ═══
` : `
Even without a night story reference, ensure you create UNIQUE scenes:
- Choose unexpected moments within each goal (not the obvious climactic moment)
- Use morning-specific sensory details (light quality, first sounds, awakening textures)
- Structure scenes around INHABITED ACTION in the achieved life
`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — WAKING-STATE GROUNDING (280–320 words)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENERGY: Settled, warm, arriving. The lowest energy point of the story — but present, not sleepy.

OPENING RULE — the first 10 seconds wake the user gently.
The morning story will be used as an alarm-clock-playback sound (roadmap). The opening must wake the user, not startle them.

Rules for the first ~80 words (roughly first 30 seconds of audio):
- Warm, present, settled. NOT yet energized.
- Open on a sensory moment of waking: eyes opening, first light, first breath, weight of body on bed.
- First-person present-tense, but with a gentle cadence — longer sentences are fine here.
- No exclamatory declarations in Section 1.
- No heavy affirmations in Section 1.
- SSML: mark Section 1 as [PACE: NORMAL]. Not faster, not slower. Present without rushing.

The energy climb begins in Section 2. Section 1 is the arrival moment.

Good opening example (adapt, do not copy):
"My eyes are opening. The light is just beginning to move against the windows — that first amber. I feel the weight of my body against the bed, the warmth of the covers, the quiet of the room. I take one breath in. Slow. Full. My body is already awake before my mind catches up, and what it knows is simple. This is a good day. This is mine. Before anything else gets a word in — before the phone, before the noise — I am going to say what's true."

After establishing waking presence, transition toward: "So here is what I know. Not what I hope. Not what I am working toward. What I know."

GRATITUDE GROUNDING (brief — 2-3 sentences within Section 1):
Before the transition to Section 2, briefly ground in what is already real. Use 1-2 gratitude items as felt recognition — NOT a list. This is the morning equivalent of the night story's gratitude opening anchor.
The user's gratitude items: ${Array.isArray(answers.gratitudeItems) && answers.gratitudeItems.length > 0 ? answers.gratitudeItems.join(' | ') : 'Use known details from goals/named persons'}
Example (adapt, do not copy): "And before I say anything else — what is already real. [Gratitude item] is real. [Gratitude item] is real. This life I am waking into — I built this. My mind already knows how."

This leads into Section 2.

ORIENTATION-CALIBRATED TONE:
${answers.orientation === 'spiritual' ? 'A golden knowing that today has been prepared. Divine alignment, sacred space, God\'s presence waking with the user.' : ''}${answers.orientation === 'scientific' ? 'Neural priming, the intentional mind activating with clarity. Brainwave transition from sleep to alert focus.' : ''}${answers.orientation === 'both' ? 'Science and sacred naturally woven — the mind priming while something deeper aligns.' : ''}${answers.orientation === 'grounded' ? 'Pure sensation, body and breath, the weight of the covers, the first full inhale of the day — no framework, just aliveness.' : ''}

· · ·

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — FIRST IDENTITY WAVE (250–300 words)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENERGY: Rising, claiming. Noticeably more activated than Section 1.

This is WAVE 1 of the affirmation architecture.

Deliver 3–5 of the strongest character-based "I am" statements from:
Identity statements: ${identityStatementsText}
Per-area affirmations: ${allAreaAffirmations}

Rules:
- Primary identity statement appears HERE for the first time
- Each statement is a CLAIM, not an invitation. "I am" not "I am becoming."
- Between each statement, a short connective that builds energy — NOT NLP bridging language
- The core feeling word ("${answers.coreFeeling}") appears LITERALLY once in this section
- First person throughout. NO "you." NO "let these land." NO "notice."
- The wave builds: each statement slightly bolder than the last
- Plant these VERBATIM — do not rephrase, soften, or NLP-restructure them

Close Section 2 with a transition toward action: something like "Now I go live it" or "And here is what that looks like" — leading into the scenes.

· · ·

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — LIVED SCENES (900–1,100 words)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENERGY: Peaking, embodied. The most active section. Higher energy than Section 2.

Each scene is INHABITED — the user is DOING, not watching. Physical action verbs lead every scene.

Scene structure (each 150–250 words):
- OPEN with a physical action verb: "I pick up," "I press," "I walk," "I open," "I dial," "I sign"
- ONE sensory detail per channel (visual, auditory, kinesthetic) — woven into the action, not listed
- ONE emotional peak per scene — structure the scene to land that peak, then stop
- CLOSE each scene with a Wave 2 affirmation — one statement from the user's identity/area affirmations embedded as the scene's final sentence, woven into the scene's final image (not listed separately)

CRITICAL SCENE RULES:
- NO "I find myself," "I notice that," "I see myself" — dissociative language
- NO watching from outside. The user IS the person doing the thing.
- Present tense, present progressive. Everything is happening NOW.
- ALL goals treated as already fulfilled as of TODAY — no calendar dates, no "nine months from now"
- If the story needs to reference time: "already," "for a while now," "by now," "these days"

Use · · · act breaks between scenes.

━━━ GRATITUDE AS IDENTITY PROOF — MID-SCENE BRIDGE (REQUIRED) ━━━
Between two scenes in Section 3, insert a brief bridge passage (50-80 words) that uses the user's gratitude items as evidence the subconscious already knows how to create. Same principle as the night story's gratitude identity proof — but compressed and action-oriented for morning register.

The user's gratitude items: ${Array.isArray(answers.gratitudeItems) && answers.gratitudeItems.length > 0 ? answers.gratitudeItems.join(' | ') : 'Use known details from goals/named persons'}

Example (adapt): "None of this is accident. [Gratitude item] — I made that real. [Gratitude item] — that was me too. The same mind that created those is the mind I carry into today. It does not doubt. It builds."

${buildDynamicVision(answers)}

━━━ SCENE RULES FROM NIGHT STORY THAT STILL APPLY ━━━
- Verbatim rule for goals and proof actions — use the user's exact words
- Numeric specificity rule — exact figures, never rounded or generalized
- Named persons with warmth — never announced, each name landing with intimacy
- All selected life areas must have at least one dedicated scene
- No creative liberty — do not invent details the user did not provide
- No "I manifest," "I am attracting," or law-of-attraction language

━━━ COMPLETENESS CHECK — REQUIRED BEFORE WRITING SECTIONS 4-5 ━━━
Before writing the cresting wave or close, verify every item in actionsAfter[] and goals{} has appeared as a vivid inhabited scene.

A detail mentioned in passing does NOT count as a scene. A scene requires:
- Physical action verb opening
- At least 2 sensory details woven into action
- Emotional peak
- At least 150 words of dedicated attention
- Wave 2 affirmation as closing sentence

If the user mentioned more life areas than can fit in 4 scenes, extra content flows into Wave 3 affirmations in Section 4, NOT additional scenes.

· · ·

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — CRESTING DECLARATION (280–320 words)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENERGY: Crest, full power. The HIGHEST energy point of the entire story. More activated than Section 3.

This is WAVE 3 of the affirmation architecture — the peak.

Deliver 5–8 remaining strong affirmations including:
- Primary identity statement appears AGAIN, this time with [EMPHASIS]
- ALL user-authored custom affirmations appear here VERBATIM${userAuthoredAffirmations.length > 0 ? `\n  User-authored (MUST appear exactly as written): ${userAuthoredAffirmations.join(' | ')}` : ''}
- Remaining identity and area affirmations not used in Wave 1 or Wave 2

Rules:
- This is the highest-energy moment. Every statement is a DECLARATION at full volume.
- Short connectives between statements — building, never contemplative
- NO reflective passages. NO "I sit here and feel the weight of what I've created."
- NO "my subconscious has received it." NO "everything I just saw."
- The core feeling is DESCRIBED (felt state, not the literal word) in 1 passage here
- First person throughout. CLAIMING voice at maximum intensity.
- Close with the most powerful, boldest statement — the one most uncomfortable to claim

FORBIDDEN in Section 4:
- Reflective language ("I lean back," "I sit in this light," "looking back")
- Evening register ("settle," "rest," "deepen," "allow")
- Any energy dip or contemplative pause

· · ·

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — STEP INTO THE DAY (180–220 words)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENERGY: Released forward, directional. Not the highest energy — but the most AIMED. Pointed at the real day.

CLOSE RULE — this section points FORWARD at the day, not backward at the story.

Rules:
- Shortest sentences of the whole story belong here. Most ≤10 words.
- NO "my subconscious has received it," "my body knows it," "everything I just saw." These are reflective phrases — evening close register.
- YES: "The frequency is set." "Now I go live it." "The next thing I do, I do from here."
- Reference (implicitly or explicitly) that the user is about to move into their actual day. Not the story's day. TODAY's day.
- The core feeling word ("${answers.coreFeeling}") appears LITERALLY one final time here
- Close with a three-beat activation sequence at rising intensity:
  "I am ready. Let's go.
   I am ready. Today is mine.
   I am ready. And it begins now."
- Final line stands alone. No postscript. No further affirmation.

ORIENTATION-CALIBRATED FINAL BEAT:
${answers.orientation === 'spiritual' ? '"God goes before me into this day. I am ready. And it begins now."' : ''}${answers.orientation === 'scientific' ? '"My mind is primed. My intentions are set. I am ready. And it begins now."' : ''}${answers.orientation === 'both' ? '"Everything is aligned. I am ready. And it begins now."' : ''}${answers.orientation === 'grounded' ? '"I am ready. And it begins now."' : ''}

[Story ends]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORD COUNT TARGET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: 1,890–2,260 words total (13–15 minutes of audio).

Section budgets:
- Section 1 (waking-state grounding): 280–320 words
- Section 2 (first identity wave): 250–300 words
- Section 3 (lived scenes): 900–1,100 words
- Section 4 (cresting declaration): 280–320 words
- Section 5 (step into day): 180–220 words

If generation exceeds 2,400 words, trim from Section 3 scenes first. NEVER trim from Sections 2 or 4 (the affirmation waves are the point).

━━━ FORMATTING & STRUCTURE ━━━
This story is pure flowing prose. There are NO section headers. NO timestamps. NO labels like "SECTION 1" or "WAKING." The story flows as one seamless piece of writing.

The internal structure (grounding → identity wave → scenes → crest → launch) exists in the writing itself — through tone, pacing, and energy level — not through visible headers.

Separation: Use one blank line between paragraphs. Use three centered dots · · · on their own line to separate the five sections. These are the ONLY structural markers allowed.

━━━ TENSE DISCIPLINE — CRITICAL ━━━
Every line is first-person PRESENT tense. No past-tense verbs inside present-moment passages.
- WRONG: "I felt grateful" / "And I made it. I actually made it."
- RIGHT: "I am grateful" / "I feel grateful" / "And I made it. It is exactly as I knew it would be."
- The word "actually" must never appear — it signals doubt.

━━━ RE-LISTABILITY ━━━
This story will be listened to hundreds of times. Build for that:
- At least one moment of unexpected emotional truth that catches the listener off guard
- Create at least one scene so specific it becomes a personal touchstone
- NO generic adjectives: "wonderful," "great," "successful." Use: "unshakeable," "luminous," "anchored."
- Do NOT use markdown symbols (*, **, #, _, etc.). Plain text only.
- NEVER use "I manifest," "I am attracting," "I am aligned," or law-of-attraction language.

━━━ QA SELF-CHECK — RUN BEFORE OUTPUTTING ━━━
Before returning the story, verify:
[ ] Opens with first-person present-tense ("My eyes are opening" / "I take one breath"). No "your eyes," no "notice."
[ ] No specific calendar dates, months, or years anywhere.
[ ] No "let," "notice," "allow," "drift," "settle," "sink," "deepen," "rest" as instructions.
[ ] Every scene leads with a physical action verb ("I pick up," "I press," "I stand").
[ ] Each scene is 150–250 words.
[ ] Affirmations appear in three distinct waves (not one block).
[ ] Primary identity statement appears at least twice, once with [EMPHASIS].
[ ] All user-authored custom affirmations appear verbatim in Wave 3.
[ ] Core feeling word appears 2 times literally; felt state described 1–3 additional times.
[ ] No reflective/contemplative passage in Sections 4 or 5.
[ ] Close uses three-beat activation sequence aimed at the day. Shortest sentences of the story.
[ ] Total word count is 1,890–2,260.
[ ] Energy arc climbs across sections.
[ ] No second-person "you" or "your" anywhere in the story.

━━━ SSML / AUDIO MARKUP TAGS — REQUIRED ━━━
Include these markers in the output for the ElevenLabs audio processing pipeline:

TAG DEFINITIONS:
[PAUSE_SHORT] — 1-second pause. Place at the end of important sentences.
[PAUSE_LONG] — 3-second pause. Place between major story sections.
[PACE: SLOW] — signals ElevenLabs to render this passage with slower, more deliberate delivery.
[PACE: NORMAL] — return to standard delivery pace.
[EMPHASIS]word or phrase[/EMPHASIS] — slightly increased volume and deliberateness on the enclosed text.

REQUIRED PLACEMENTS — NON-NEGOTIABLE:
1. After identity statement (BOTH occurrences): [PAUSE_LONG]
2. Between each of the five sections (· · · separators): [PAUSE_LONG]
3. After the final activation close ("I am ready. And it begins now."): [PAUSE_LONG][PAUSE_LONG]
4. Key identity statements in each affirmation wave: wrap in [EMPHASIS]...[/EMPHASIS]
5. Section 4 (cresting declaration — the emotional peak): wrap the ENTIRE section in [PACE: SLOW] at the start and [PACE: NORMAL] at the end
6. Between gratitude grounding items in Section 1: [PAUSE_SHORT]
7. After the three-beat activation sequence at the end: [PAUSE_LONG]

RULES:
- Tags are inline — they appear within the flowing prose, not on separate lines (except [PAUSE_LONG] which can be on its own line between sections)
- Tags do NOT break the reading experience — they are invisible to the listener and processed only by the audio pipeline
- Do NOT overuse tags. Use [PAUSE_SHORT] sparingly (max 6-8 per story). Use [PAUSE_LONG] only at the required placements above.
- [EMPHASIS] should only highlight the most powerful 3-5 phrases in the entire story
- Morning stories should use FEWER slow pacing markers than night stories — the energy is rising, not settling

━━━ OUTPUT FORMAT — CRITICAL ━━━
Do NOT generate a title. The system will name the story automatically.

---
[The full story begins here as pure, unbroken flowing prose.]

RULES:
- NO section headers, timestamps, labels
- NO title line
- NO sleep language anywhere — no "sleep now", no "drift", no "theta", no staircase, no descent
- NO second-person voice — entire story is first person "I" and "my"
- Begin immediately with the waking-state grounding (Section 1)
- Use · · · between the five sections
- End with "I am ready. And it begins now." — then nothing more
- Pure flowing prose throughout
- No markdown formatting

Begin now. Write the full morning story with no preamble.\n`;

    return prompt;
}

