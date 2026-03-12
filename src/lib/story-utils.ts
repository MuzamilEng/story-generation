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
        'Proof 3': 'proof3'
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

export function buildStoryPrompt(answers: UserAnswers, length: StoryLength = 'long'): string {
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

    const wordCountInstruction = length === 'short'
        ? '- Target approximately 400-500 words. Keep it focused, punchy, and potent. Focus intensely on the 1-2 most important goals.'
        : '- Target approximately 1000-1200 words. Take the time to build a fully immersive, expansive world. Explore all dimensions of their vision in rich detail.';

    return `You are a gifted narrative writer creating a deeply personal first-person manifestation story for ManifestMyStory.com.

This story will be professionally narrated by an AI voice and listened to by the user every morning and every night as a tool for rewiring their subconscious mind toward their ideal life.

THE STORY IS: A deeply immersive manifestation narrative tailored to the user's unique vision. While a "day in the life" is a powerful structure, you have the creative freedom to set the narrative logic that best serves their specific goals. It should feel like a memory of a future that has already happened, told in the present tense.

WORD COUNT & PACING:
${wordCountInstruction}
- This will be narrated at an emotionally present pace. Every sentence should breathe.

CRITICAL WRITING REQUIREMENTS:
- First person, present tense throughout: "I wake," "I feel," "I walk" — never future tense.
- Deeply sensory: engage all senses to make the future feel tangibly real.
- Emotionally alive: capture the quiet pride, deep peace, and gratitude of this achieved life.
- Narrative Logic: You determine the best flow. It could be one perfect day, a series of milestone moments, or a specific significant event. The goal is to make the user feel: "This is my life."
- Specific and personal: use the exact details given. No generic placeholders.
- Weave in all life dimensions naturally: love, health, work, financial abundance, community.
- Arc: Start with presence, build through purpose and connection, and end with a sense of deep rightness and arrival.

THE OBSTACLE PROOF PRINCIPLE — CRITICAL:
Each obstacle listed below must be addressed with a proof moment — a specific scene that could ONLY exist if that struggle is fully, completely behind them. The obstacle is never named or referenced. Only its absence is shown through natural action and ease. 

**IMPORTANT**: Use the following examples ONLY for inspiration. DO NOT copy them literally. Create fresh, unique scenes that fit the specific user's life and location.
- Financial anxiety example: freedom in spending.
- Career struggle example: choice and boundaries.
- Health struggle example: ease of movement.
- Loneliness example: presence of others.
- Parenting guilt example: being fully present.

- Natural spoken rhythm: every sentence must flow when read aloud. Write as a warm, present voice speaking into someone's ear.
- Uniqueness: Every story must be unique. Even with similar goals, imagine a different specific day, a different season, or different small details. No two stories should ever feel the same.

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

THE VISION:
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
