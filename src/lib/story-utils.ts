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
    // For proof logic mentioned in original code
    obstacle1?: string;
    proof1?: string;
    obstacle2?: string;
    proof2?: string;
    obstacle3?: string;
    proof3?: string;
}
export function normalizeGoals(raw: any): UserAnswers {
    if (!raw) return {} as UserAnswers;

    const normalized: any = {};
    const mapping: Record<string, keyof UserAnswers> = {
        'Identity': 'identity',
        'Purpose': 'purpose',
        'Values': 'values',
        'Location': 'location',
        'Home': 'home',
        'Morning': 'morning',
        'Work': 'work',
        'Relationships': 'people',
        'Feelings': 'emotions',
        'Joy': 'joy',
        'Evening': 'evening',
        'Dreams': 'dreams',
        'Obstacle': 'obstacle1',
        'Proof': 'proof1'
    };

    Object.keys(raw).forEach(key => {
        const normalizedKey = mapping[key] || key.toLowerCase();
        normalized[normalizedKey] = raw[key];
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

    return normalized as UserAnswers;
}

export function buildStoryPrompt(answers: UserAnswers): string {
    let obstacleSection = '';
    const obstacles = [];
    if (answers.obstacle1) obstacles.push({ struggle: answers.obstacle1, proof: answers.proof1 || '' });
    if (answers.obstacle2) obstacles.push({ struggle: answers.obstacle2, proof: answers.proof2 || '' });
    if (answers.obstacle3) obstacles.push({ struggle: answers.obstacle3, proof: answers.proof3 || '' });

    if (obstacles.length > 0) {
        obstacleSection = `\n\nCURRENT OBSTACLES & PROOF MOMENTS:\nFor each obstacle below, weave a specific proof moment into the story — a scene or action that could ONLY exist if this struggle is already completely resolved. Never name the obstacle directly. Never say "I used to..." Just show its absence through ease, freedom, and natural action.\n`;
        obstacles.forEach(o => {
            obstacleSection += `- Struggle: "${o.struggle}"${o.proof ? ` → Proof moment: "${o.proof}"` : ' → Infer an appropriate proof moment from the context'}\n`;
        });
    }

    return `You are a gifted narrative writer creating a deeply personal first-person manifestation story for ManifestMyStory.com.

This story will be professionally narrated by an AI voice and listened to by the user every morning and every night as a tool for rewiring their subconscious mind toward their ideal life.

THE STORY IS: "A Day in Alignment With My Highest Self" — one complete, perfect day from waking to sleeping. Written as if it is already real and already happening. Not a dream. Not a wish. A memory of a day that has not happened yet, told in the present tense.

WORD COUNT & PACING:
- Target exactly 700-800 words — no shorter, no longer
- This will be narrated at a measured, emotionally present pace of approximately 120 words per minute
- At this pace, 700-800 words = 6-7 minutes of deeply immersive listening
- Every sentence should breathe. Write for the voice, not the eye.

CRITICAL WRITING REQUIREMENTS:
- First person, present tense throughout: "I wake," "I feel," "I walk" — never future tense, never "I will"
- Deeply sensory in every scene: sight, sound, smell, feel, touch — engage all senses throughout
- Emotionally alive: capture how it FEELS to live this life — the quiet pride, deep peace, aliveness, gratitude
- Emotional arc: peaceful morning → engaged purposeful day → deep evening gratitude. The listener should feel genuine thankfulness that this is their life.
- Specific and personal: use the exact details given — their city, home, people, work. No generic placeholders.
- Natural spoken rhythm: every sentence must flow when read aloud. Write as a warm, present voice speaking into someone's ear.
- Weave in all life dimensions naturally: love, health, work, financial abundance, community, spirituality, growth, recreation — as moments in a lived day, not a checklist
- Weave in values and purpose without stating them — show through action, choice, and feeling
- Arc: waking → morning practices → full day including work and relationships → evening → sleep
- End with a sense of deep rightness — they are exactly where they are meant to be, and they know it

THE OBSTACLE PROOF PRINCIPLE — CRITICAL:
Each obstacle listed below must be addressed with a proof moment — a specific scene that could ONLY exist if that struggle is fully, completely behind them. The obstacle is never named or referenced. Only its absence is shown through natural action and ease. These moments carry quiet but powerful emotional weight — a feeling of freedom in a place where there used to be fear.

Examples of how this works:
- Financial anxiety → "I book us on a last-minute flight without a second thought. I don't even check the balance. There's always enough."
- Career struggle → "My calendar has three things on it today and I chose every single one of them."
- Health struggle → "My body moves the way I always knew it could — strong, light, easy."
- Loneliness → "She reaches for my hand across the table. We don't need words."
- Feeling stuck → "I decline the meeting with a calm no. My time is mine. I know exactly what it's worth."
- Parenting guilt → "My son asks if I can stay and play. I close the laptop without a moment's hesitation. Yes. Always yes now."

THE TONE:
Warm. Grounded. Real. Quietly joyful. Not mystical. Not a motivational speech.
The person should listen with their eyes closed and feel: "Yes. That is me. That is already my life."
Write like a beautifully crafted memoir entry: intimate, present, unhurried. The reader has arrived.

WHAT TO AVOID:
- Never use "I manifest," "I am attracting," or any law-of-attraction language
- Never directly reference any original struggle ("I used to worry about..." — never)
- No chapter headings, section labels, bullet points — pure flowing prose only
- No preamble or title — begin directly with the first line of the story
- Do not open with the literal words "I wake up" — find a more evocative entry
- Do NOT invent highly specific fictional personal details (e.g. eating figs/honey, specific dog breeds, names of relatives, a coastal town if none of those were specified by the user). If a dimension of life is sparse or missing in the details below, keep it abstract and focused on the core purpose.

THEIR VISION:
${buildDynamicVision(answers)}${obstacleSection}

Write the story now. Begin directly with the first line — no preamble, no title, no intro.`;
}

function buildDynamicVision(answers: UserAnswers): string {
    let result = '';
    const addLine = (label: string, val: string | undefined | null) => {
        if (val && val.trim().length > 0 && val.toLowerCase() !== 'not specified') {
            result += `${label}: ${val.trim()}\n`;
        }
    };

    addLine('Identity', answers.identity);
    addLine('Core Purpose', answers.purpose);
    addLine('Values', answers.values);
    addLine('Where they live', answers.location);
    addLine('Their home', answers.home);
    addLine('Morning routine', answers.morning);
    addLine('Work/creative life', answers.work);
    addLine('Key relationships', answers.people);
    addLine('Financial abundance', answers.abundance);
    addLine('Health & body', answers.health);
    addLine('Spirituality & inner life', answers.spirit);
    addLine('How they feel each day', answers.emotions);
    addLine('Small joyful moments', answers.joy);
    addLine('Community & contribution', answers.community);
    addLine('Recreation & travel', answers.travel);
    addLine('How they handle challenges', answers.challenges);
    addLine('Evening routine', answers.evening);
    addLine('End of day reflection', answers.reflection);
    addLine('Dreams and intentions', answers.dreams);

    return result || '- No specific vision details were provided. Focus purely on their inner emotional landscape and feelings of manifestation achieved.';
}
