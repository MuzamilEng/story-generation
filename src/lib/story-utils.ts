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
}

export function normalizeGoals(raw: any): UserAnswers {
    if (!raw) return {} as UserAnswers;

    const normalized: any = {};
    const mapping: Record<string, keyof UserAnswers> = {
        // New V4 Fields
        'orientation': 'orientation',
        'tone': 'tone',
        'selectedAreas': 'selectedAreas',
        'goals': 'goals',
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
    const auxiliaryCategories: string[] = [];

    Object.keys(raw).forEach(key => {
        const val = raw[key];
        const normalizedKey = mapping[key] || mapping[key.trim()] || key.trim();
        normalized[normalizedKey] = val;

        // Collect auxiliary goals into categories for sidebar display
        if (!mainKeys.includes(normalizedKey) && val && typeof val === 'string' && val.length > 0) {
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

    // Ensure selectedAreas is always an array (AI sometimes sends a string or comma-separated string)
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
            // Handle legacy field if it exists
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

export function buildStoryPrompt(answers: UserAnswers, userTier: Tier = 'explorer'): string {
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

The core feeling must be present as an emotional undertone in EVERY scene — not just the close. The listener should feel it growing from the opening to the final word.\n\n`;

    // BLOCK A — HYPNOTIC INDUCTION (Activator+)
    if (['activator', 'manifester', 'amplifier'].includes(userTier)) {
        const targetWords = userTier === 'activator' ? '250-300' : (userTier === 'manifester' ? '300-350' : '350-400');
        prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCK A — HYPNOTIC INDUCTION
TARGET WORD COUNT: ${targetWords} words
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Open the story with a full self-directed hypnotic induction. The narrator IS the user — they guide themselves into a receptive state in their own voice. There is no external guide. This creates a seamless identity bridge: the same voice inducing the state is the voice that lives the vision.

THE INDUCTION MUST FOLLOW THIS SEQUENCE:
1. Begin with breath awareness — "I simply notice... that I am already breathing."
2. Physical anchoring — body weight, jaw softening, shoulders releasing
3. Progressive relaxation — head to feet, each area releasing completely
4. Deepening technique — calibrated to orientation:
   • Spiritual → golden light, divine presence, a sacred space opening
   • Scientific → brainwave descent, neurological opening, theta state arriving
   • Both → "the science and the sacred meet here"
   • Grounded → pure physical sensation only — no framework language
5. Threshold moment — the listener has arrived somewhere open and receptive. They are ready.

NLP LANGUAGE THROUGHOUT THE INDUCTION:
Embedded commands (first person): "...and as I notice myself sinking deeper..." / "...I find my mind growing quieter and more open..."
Universal quantifiers: "With every breath..." / "With every sound I hear..." / "With each passing moment..."
Presuppositions: "Something extraordinary is already beginning in the deep, intelligent part of my mind..." / "That part of me is listening now. And it is ready."

INDUCTION LANGUAGE RULES:
- First person ONLY throughout — "I" and "my." Never "you."
- NEVER use "I wake up" anywhere in the induction or the entire story
- Write as if the listener is already drifting — invited, not commanded
- Do NOT reference the word "story" — the listener IS the story from the first word
- Tone: slow, warm, unhurried — every sentence gives permission to go deeper\n\n`;
    }

    // BLOCK B — THE VISION: all tiers
    const visionWordCounts: Record<Tier, string> = {
        explorer: '550-650 words (1 area)',
        activator: '700-850 words (up to 3 areas)',
        manifester: '900-1,100 words (all selected areas)',
        amplifier: '1,300-1,600 words (all areas, 2+ scenes per area)'
    };

    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCK B — THE VISION (THE ACHIEVED LIFE)
TARGET WORD COUNT: ${visionWordCounts[userTier]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPENING TIME ANCHOR (required for all tiers):
Open by grounding the story in a specific future moment:
"It is [season], ${answers.timeframe} from where I once stood..."
Or a natural variation that communicates the same: this is a specific future, not a vague someday.
The listener must know immediately: I am inside a real moment, not a fantasy.

The user's goals are ALREADY achieved. This is not the day they achieve them — this is a day deep inside the life that achievement made possible. The struggle is over. Only its absence is shown.

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
Required throughout: "...and as I notice myself moving with complete ease..." / "...I find myself feeling deeply certain about where my life is going..." / "...I continue to grow into the person I always knew I was becoming..." / "...and I allow this knowing to settle deeper with every breath..."

PRESUPPOSITIONS (assume the desired state is already permanently true):
Required in every scene: "As I continue building on everything I've created..." / "Each morning I wake into this life..." / "The version of me who lives here..." / "As my abundance continues to grow..."

UNIVERSAL QUANTIFIERS (signal permanence to the subconscious):
Required throughout: "Every morning..." / "Always..." / "Each time..." / "Whenever I..." / "Every single day..."

━━━ NLP TECHNIQUE 3 — IDENTITY-LEVEL STATEMENTS ━━━
Include 2-3 moments mid-story where the narrator quietly recognises who they ARE — not what they have. These feel like private knowings, not declarations. They arise naturally from the story's flow — never announced:
- "This is simply who I am now."
- "I have always known, somewhere, that I was capable of this."
- "I am someone who shows up fully for the life I built."

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

━━━ RE-LISTABILITY ━━━
This story will be listened to dozens or hundreds of times. Build for that:
- At least one moment of unexpected beauty or emotional truth that catches the listener off guard
- Create at least one scene so specific it becomes a personal touchstone — a scene the listener can return to by memory
- Closing lines must be so resonant the listener carries them into sleep
- NEVER use "I manifest," "I am attracting," "I am aligned," or law-of-attraction language
- No headings, bullets, or section breaks within the vision — pure flowing prose\n\n`;

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

ANCHOR LANGUAGE (adapt to story's voice and tone):
"And in this moment — with all of this completely, undeniably real — I bring the thumb and first finger of my right hand gently together. I hold them. I breathe. I feel everything. [Name 3-4 specific feelings present in this exact scene, using the user's own language.] This is real. This is mine. My body knows it now."

ANCHOR REINFORCEMENT immediately after:
"Every time I bring these fingers together — before any decision, before any important conversation, before I walk into any room — this entire state returns to me. Completely. Instantly. My nervous system has learned it. My subconscious does not forget."

Then flow naturally into Block D.\n\n`;
    }

    // BLOCK D — AFFIRMATIONS & CLOSE
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCK D — AFFIRMATIONS & CLOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━ AFFIRMATION SOURCE — CRITICAL ━━━
The user selected their own identity statements during the intake (identityStatements field).
These statements must be used VERBATIM — they are the user's own claimed identity.

Priority order:
1. User's own written statement (highest priority — use exactly as written)
2. User's selected chips (use verbatim — do not rewrite or polish)
3. Claude-generated statements (only if identityStatements is empty — generate from goals/proof actions)

━━━ AFFIRMATION STRUCTURE — THREE LEVELS (All Tiers) ━━━
Affirmations must escalate through three levels in order:

LEVEL 1 — HAVING (most immediately believable):
Present-tense possession drawn from specific goals.
"My finances are completely free. Every obligation is met with ease."

LEVEL 2 — DOING (behavioural identity):
Present-tense action drawn from proof actions.
"I invest with certainty. I make decisions that build wealth effortlessly."

LEVEL 3 — BEING (deepest identity — most transformational — always lands last):
Pure identity statement — the most powerful position.
"I am a person of extraordinary abundance. This is simply who I am now."

The final affirmation of the entire story must always be a BEING-level statement.

━━━ AFFIRMATION NLP RULES (All Tiers) ━━━
- NEVER present as a list — affirmations arrive as flowing prose, quiet first-person recognitions
- Weave Milton Model language BETWEEN affirmations:
  "And as these truths settle deeper into every cell..."
  "Each time I hear these words, they become more completely mine..."
  "I find myself already knowing, in the deepest part of my being..."
- Each affirmation separated by a beat — a pause, a breath, a moment of landing
- Affirmations feel like things the subconscious is already thinking — not declarations being made
- Use user's exact language from identityStatements — do not rewrite

━━━ TIER-SPECIFIC CLOSE ━━━

─── EXPLORER CLOSE (Target: 120-180 words) ───
The vision naturally settles. No formal dissolution needed.
Deliver 3-4 affirmations (Having → Doing → Being) woven into the final paragraph as quiet recognitions — not a list.
End on a single resonant BEING-level line — the last thing the listener carries into sleep.

─── ACTIVATOR CLOSE (Target: 180-240 words) ───
Begin a gentle dissolution — scenes soften, light fades, listener is drifting.
In this liminal state, deliver 4-5 affirmations (Having → Doing → Being) as quiet recognitions, one breath apart.
Between affirmations, weave ONE Milton Model bridge sentence to deepen receptive state.
Final line: so quiet and certain it dissolves naturally into rest.

─── MANIFESTER / AMPLIFIER CLOSE (Target: 430-580 words total) ───
STEP 1 — DISSOLUTION (80-100 words):
"And now... I let it all go. I let every image soften. Let every vision dissolve into warm light. I don't need to hold on. My subconscious mind has received every word of this. Every feeling. Every vision. It is already working. Right now. As I drift. As I sleep."

STEP 2 — AFFIRMATION PLANTING (150-200 words):
Post-dissolution, directly into open subconscious. This is the most receptive moment of the entire story. Critical faculty is fully offline.
Use identityStatements verbatim.
Structure: 2 Having → 2 Doing → 2-3 Being, escalating to deepest identity statement last.
Between each affirmation, one Milton Model bridge.
Format as flowing prose — never a list.

STEP 3 — SLEEP SEEDING (80-120 words):
"Tonight my dreams carry the frequency of my highest life. My cells repair and renew. My subconscious mind assembles everything — the circumstances, the connections, the ideas, the opportunities. I will feel the shift tomorrow. A quiet certainty. The feeling of someone who knows something the world doesn't know yet."

Orientation-specific final line:
  Spiritual → "God's hand is on my life as I sleep."
  Scientific → "My subconscious works powerfully through the night."
  Both → "The universe and my own subconscious mind work together as I sleep."
  Grounded → "Everything I need is already in motion."

STEP 4 — THREE SLOW REPETITIONS (20-30 words):
Three final lines, each one breath apart — the last sounds before sleep:
"Sleep... and receive."
"Sleep... and receive."
"Sleep... and receive."
(Adapt phrasing to orientation if needed — keep the rhythm, the pause, the finality.)\n\n`;

    prompt += `━━━ FORMAT ━━━
Write the story now. Format your response exactly as:

[Short evocative title — never generic, never "My Story." Strip all markdown formatting — no asterisks, no bold, plain text only.]
---
[Full story text — pure flowing prose. No headings. No bullets. No section breaks except the centered dot leaders · · · between major life area acts.]

Begin now.\n`;

    return prompt;
}

export function buildDynamicVision(answers: UserAnswers): string {
    let result = '';
    
    // ── TIER 1: GOALS, PROOF ACTIONS & IDENTITY — NON-NEGOTIABLE STORY CORE ───────────────
    result += `\n╔══ TIER 1: GOALS, PROOF ACTIONS & IDENTITY — NON-NEGOTIABLE STORY CORE ══╗\n`;
    result += `CRITICAL: Every item in this tier MUST appear in the story. Goals and proof actions as vivid present-tense scenes. Identity statements verbatim in the affirmation close.\n\n`;
    
    if (answers.goals) result += `GOALS — show each as already completely real. Not pursued. Simply lived:\n${answers.goals}\n\n`;
    
    if (answers.actionsAfter) result += `PROOF ACTIONS — the single most important field. Build every major scene around these. Use exact words — no paraphrasing:\n${answers.actionsAfter}\n\n`;
    
    if (answers.identityStatements && answers.identityStatements.length > 0) {
        result += `IDENTITY STATEMENTS — user's own claimed identity. Use VERBATIM in affirmation close. Do not rewrite:\n${answers.identityStatements.join(", ")}\n\n`;
    }
    
    result += `TIMEFRAME — open the story in this specific future moment:\n${answers.timeframe}\n\n`;
    result += `CORE FEELING — present as undertone in EVERY scene throughout the entire story:\n${answers.coreFeeling}\n`;
    result += `╚══ END TIER 1 ══╝\n\n`;

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
    result += `╚══ END TIER 3 ══╝\n`;

    if (!answers.goals && !answers.actionsAfter) {
        return 'Minimal details were provided beyond goals and proof actions. Build every scene entirely around the Tier 1 inputs — use the user\'s exact words as the story\'s foundation. For the inner landscape, let the core feeling be the emotional spine. Keep all other dimensions abstract and beautifully unspecific.';
    }

    return result;
}
