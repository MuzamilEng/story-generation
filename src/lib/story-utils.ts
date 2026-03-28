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
        'Future Vision': 'futureVision',
        'Giving Back': 'givingBack'
    };

    const mainKeys = ['identity', 'purpose', 'location', 'emotions'];
    const auxiliaryCategories: string[] = [];

    Object.keys(raw).forEach(key => {
        const val = raw[key];
        const normalizedKey = mapping[key] || mapping[key.trim()] || key.toLowerCase().trim();
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
            obstacleSection += `- Struggle (now resolved): "${o.struggle}"${o.proof ? ` → Proof scene: "${o.proof}"` : ' → Infer an emotionally resonant proof scene from the context'}\n`;
        });
        obstacleSection += `\nFor each proof scene: make it physical, specific, and undeniable. A person who never has to think about that struggle anymore — show what that looks like in their body, their choices, their world.\n`;
    }

    const wordCountInstruction = length === 'short'
        ? '- Target approximately 400-500 words. Every sentence must earn its place — focused, potent, and charged with feeling. Zero filler. Centre on the 1-2 most transformative goals.'
        : '- Target approximately 1000-1200 words. Build a fully immersive world. Move through multiple scenes and dimensions of their life. Let the reader sink into it completely.';

    // Pick this story's unique creative brief
    const narrativeStructure = pickRandom(NARRATIVE_STRUCTURES);
    const emotionalArc = pickRandom(EMOTIONAL_ARCS);
    const tonalMode = pickRandom(TONAL_MODES);
    const seasonalContext = pickRandom(SEASONAL_CONTEXTS);
    const openingStyle = pickRandom(OPENING_STYLES);

    return `You are a master storyteller and narrative therapist creating a highly personalised, transformational first-person story for ManifestMyStory.com.

This story will be narrated by an AI voice and listened to repeatedly — in the morning to ignite the day and at night to anchor the mind. Its purpose is therapeutic, motivational, and deeply personal: to rewire this person's self-concept, dissolve inner resistance, and make them feel genuinely capable, energised, and inspired every single time they listen.

━━━ YOUR UNIQUE CREATIVE BRIEF FOR THIS STORY ━━━
Every story generated is given a distinct creative brief. Honour yours exactly.

NARRATIVE STRUCTURE: ${narrativeStructure}
EMOTIONAL ARC: ${emotionalArc}
TONAL MODE: ${tonalMode}
SEASONAL / ATMOSPHERIC CONTEXT: ${seasonalContext}
OPENING STYLE: ${openingStyle}

These five parameters are your creative foundation. They must shape every structural and tonal decision you make. This is what makes this story unlike any other story this system has generated.

━━━ WORD COUNT & PACING ━━━
${wordCountInstruction}
- This will be narrated at an emotionally resonant pace. Every sentence should breathe and land.
- Vary sentence length deliberately: long, flowing sentences for immersion and feeling; short, impactful sentences for clarity and power.

━━━ CORE WRITING REQUIREMENTS ━━━
- First person, present tense throughout: "I feel," "I walk," "I choose" — never future tense.
- Deeply sensory: engage sight, sound, smell, touch, and the felt sense in the body. Make the reader feel present.
- Emotionally alive: capture pride, peace, joy, and the quiet thrill of a life fully inhabited.
- Specific and personal: use the exact words, imagery, and details from the user's own inputs wherever possible. No generic stand-ins.
- Weave all life dimensions naturally: purpose, relationships, health, financial ease, creative work, community.
- Natural spoken rhythm: every sentence must flow beautifully when read aloud. Write for the ear, not the eye.

━━━ THERAPEUTIC PURPOSE — THE SOUL OF THIS STORY ━━━
This story must do more than paint a picture. It must ACTIVATE the reader. Each paragraph should leave them feeling more capable, more certain, and more energised than before they read it. Achieve this by:

- Writing the person as someone who ACTS with ease and agency — they choose, they create, they decide. Active voice. Forward motion.
- Including at least one natural, unannounced moment where the person feels a surge of capability or pride — earned, quiet, real.
- Using language that makes success feel inevitable and completely natural, not lucky or surprising.
- Writing at least one line per major section that resonates so deeply the listener wants to claim it as their own truth.
- Ending with a closing that feels so complete, so right, so deeply satisfying that the reader immediately wants to return to this story.

━━━ PERSONALIZATION IMPERATIVE ━━━
This story must be unmistakably, exclusively about THIS person. No two stories should ever feel the same, even with overlapping goals. Achieve this by:

- Drawing specific words, phrases, and imagery directly from their own inputs — their voice reflected back to them.
- Grounding every abstract goal in a concrete, physical, sensory scene unique to their life and location.
- Reflecting their actual daily rhythms, relationships, and environment.
- Making creative choices — the specific moment chosen, the detail selected, the emotion foregrounded — that could ONLY fit this exact combination of human details.

━━━ GOALS & PROOF OF ACHIEVEMENT — THE HEART OF THIS STORY ━━━
The "Specific Goals" and "Life After Goals" fields are mandatory story material. Every goal must be SHOWN — not stated — as already completely real through vivid, concrete scenes that could only exist because the goal is done.

"Life After Goals" describes exactly what this person DOES once their goals are achieved. These behaviours and experiences are the most powerful proof available. Weave every single one into the narrative prominently and specifically.

For every goal listed: include at least one scene that is physical, present, and emotionally resonant — a moment of undeniable proof. The reader must finish the story and feel in their chest: "This is already done. This is already mine."

${buildDynamicVision(answers)}${obstacleSection}

━━━ RE-LISTABILITY — MAKE THEM RETURN ━━━
This story will be listened to dozens of times. It must earn every replay:
- Include at least one moment of unexpected beauty, insight, or emotional truth.
- The closing lines must be so resonant that the listener carries them through their day.
- Create at least one image or scene so specific and alive that it becomes a touchstone — something the listener sees clearly every time they close their eyes.

━━━ WHAT TO AVOID ━━━
- Never use "I manifest," "I am attracting," "I am aligned," or any law-of-attraction language
- Never reference the original struggle directly ("I used to worry..." — never)
- No chapter headings, section labels, or bullet points — pure flowing prose only
- Begin your response with a short, evocative, and deeply personal title that reflects the heart of this specific vision.
- Follow the title with a separator '---' on its own line.
- Then, begin the story directly with the first line of the narrative.
- Do NOT use the literal phrase "I wake up" in the opening.
- Do NOT invent highly specific fictional personal details not present in the user's inputs (invented family names, specific fictional places, fictional pets, etc.). If a dimension is sparse, keep it abstract and emotionally true.
- Do NOT write a generic "motivational speech." This must feel like a real, lived, intimate memory — not a pep talk.

Write the story now. Format your response exactly as follows:
[Short Dynamic Title]
---
[Full Story Text]

Begin now.`;
}

function buildDynamicVision(answers: UserAnswers): string {
    let result = '';
    const addLine = (label: string, val: string | undefined | null) => {
        if (val && val.trim().length > 0 && val.toLowerCase() !== 'not specified') {
            result += `${label}: ${val.trim()}\n`;
        }
    };

    // ── TIER 1: Goals & proof of achievement — must dominate the story ──────────
    if (answers.goals || answers.actionsAfter || answers.futureVision || answers.givingBack) {
        result += `\n╔══ TIER 1: GOALS & PROOF — MANDATORY STORY CORE ══╗\n`;
        result += `Every item in this tier MUST appear in the story as a concrete, vivid, physical scene.\n\n`;
        addLine('GOALS — show each as already completely real (not wished for, not worked toward — DONE)', answers.goals);
        addLine('LIFE AFTER GOALS — the specific actions, behaviours, and experiences that prove the goals are real (use their exact words; weave every single one into the narrative as prominent scenes)', answers.actionsAfter);
        addLine('GIVING BACK — show this as a natural, joyful part of their current life', answers.givingBack);
        addLine('BIGGER FUTURE VISION — the expanded horizon already visible from where they stand', answers.futureVision);
        result += `╚══ END TIER 1 ══╝\n\n`;
    }

    // ── TIER 2: Identity & inner world ─────────────────────────────────────────
    result += `╔══ TIER 2: WHO THIS PERSON IS ══╗\n`;
    addLine('Identity (use their own words to ground the story\'s voice)', answers.identity);
    addLine('Core Purpose (the why behind everything they do — let it pulse through the story)', answers.purpose);
    addLine('Core Values (honour these in every choice the character makes)', answers.values);
    addLine('How they feel each day (this is the emotional baseline — the reader should feel this tone throughout)', answers.emotions);
    result += `╚══ END TIER 2 ══╝\n\n`;

    // ── TIER 3: Sensory world ───────────────────────────────────────────────────
    result += `╔══ TIER 3: THEIR WORLD — SENSORY DETAIL ══╗\n`;
    result += `Use these details to build a world so specific and real that the listener knows they are home.\n`;
    addLine('Where they live (anchor the story physically in this place)', answers.location);
    addLine('Their home (describe it as a place that holds and reflects who they are)', answers.home);
    addLine('Morning routine (if the story includes morning, make this real and specific)', answers.morning);
    addLine('Work / creative life (show them in mastery — doing this with skill and joy)', answers.work);
    addLine('Key relationships (bring these people alive in at least one scene)', answers.people);
    addLine('Financial ease (show this through natural, unforced behaviour — not announcements)', answers.abundance);
    addLine('Health & body (let the body feel strong, capable, and alive in the story)', answers.health);
    addLine('Spirituality & inner life (let this be a quiet undertone, not a lecture)', answers.spirit);
    addLine('Joyful micro-moments (include at least one — these make the story feel real and human)', answers.joy);
    addLine('Community & contribution (show them as a person people are drawn to and nourished by)', answers.community);
    addLine('Recreation & travel (if relevant, let this add texture and expansion)', answers.travel);
    addLine('How they move through challenges (show this as natural wisdom, not struggle)', answers.challenges);
    addLine('Evening routine (if the story ends in evening, make this feel like earned rest)', answers.evening);
    addLine('End of day reflection (the emotional close — let this resonate)', answers.reflection);
    addLine('Dreams and deeper intentions (let these shimmer underneath the whole story)', answers.dreams);
    result += `╚══ END TIER 3 ══╝\n`;

    return result || '- No specific vision details were provided. Focus entirely on this person\'s inner emotional landscape — their capability, clarity, peace, and the quiet certainty of someone who has arrived where they always knew they belonged.';
}
