'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Story.module.css';
import {
    CheckIcon,
    ArrowIcon,
    EditIcon,
    DoneIcon,
    StarIcon,
    RefreshIcon,
    CircleIcon,
    InfoIcon,
    MicIcon
} from '../../components/icons/StoryIcons';
import { UserAnswers, ChecklistItem, GenerationStep } from '../../types/story';

// Step Item Component
interface StepItemProps {
    number: number;
    label: string;
    status: 'done' | 'active' | 'pending';
}

const StepItem: React.FC<StepItemProps> = ({ number, label, status }) => (
    <div className={`${styles.stepItem} ${styles[status]}`}>
        <div className={styles.stepNum}>
            {status === 'done' ? <CheckIcon /> : number}
        </div>
        {label}
    </div>
);

// Vision Item Component
interface VisionItemProps {
    label: string;
    value: string;
}

const VisionItem: React.FC<VisionItemProps> = ({ label, value }) => (
    <div className={styles.visionItem}>
        <div className={styles.visionLabel}>{label}</div>
        <div className={styles.visionValue}>{value || '—'}</div>
    </div>
);

// Category Tags Component
interface CategoryTagsProps {
    categories: string[];
}

const CategoryTags: React.FC<CategoryTagsProps> = ({ categories }) => (
    <div className={styles.catTags}>
        {categories.map((cat, idx) => (
            <span key={idx} className={styles.catTag}>{cat}</span>
        ))}
    </div>
);

// Checklist Item Component
interface ChecklistItemProps {
    item: ChecklistItem;
    checked: boolean;
    onToggle: (id: string) => void;
}

const ChecklistItemComponent: React.FC<ChecklistItemProps> = ({ item, checked, onToggle }) => (
    <div
        className={`${styles.checkItem} ${checked ? styles.checked : ''}`}
        onClick={() => onToggle(item.id)}
    >
        <div className={styles.checkBox} />
        <span>{item.text}</span>
    </div>
);

// Generation Step Component
interface GenerationStepProps {
    step: GenerationStep;
    status: 'pending' | 'active' | 'done';
}

const GenerationStepItem: React.FC<GenerationStepProps> = ({ step, status }) => (
    <div className={`${styles.genStep} ${styles[status]}`}>
        <div className={styles.genStepIcon}>
            {status === 'active' && <div className={styles.spinnerSmall} />}
            {status === 'done' && <CheckIcon />}
            {status === 'pending' && <CircleIcon />}
        </div>
        <span>{step.label}</span>
    </div>
);

// Tip Card Component
const TipCard: React.FC = () => (
    <div className={styles.tipCard}>
        <div className={styles.tipTitle}>
            <InfoIcon />
            Editing tips
        </div>
        <div className={styles.tipBody}>
            Click <strong>Edit story</strong> to make changes. Read it aloud as you edit — if it doesn't sound natural in your voice, revise it.
        </div>
    </div>
);

// Next Step Card Component
interface NextStepCardProps {
    onNext: () => void;
    disabled: boolean;
}

const NextStepCard: React.FC<NextStepCardProps> = ({ onNext, disabled }) => (
    <div className={styles.nextStepCard}>
        <div className={styles.nextStepTitle}>Next: Your Voice</div>
        <div className={styles.nextStepBody}>
            Once you approve your story, you'll record a 60-second voice sample — we'll use it to create your personal audio file.
        </div>
        <button
            className={styles.nextStepBtn}
            onClick={onNext}
            disabled={disabled}
        >
            Record My Voice
            <ArrowIcon />
        </button>
    </div>
);

// Approve Banner Component
interface ApproveBannerProps {
    onEditMore: () => void;
    onRecordVoice: () => void;
}

const ApproveBanner: React.FC<ApproveBannerProps> = ({ onEditMore, onRecordVoice }) => (
    <div className={`${styles.approveBanner} ${styles.visible}`}>
        <div className={styles.approveText}>
            <strong>Story approved ✦</strong>
            <span>Ready to record your voice sample and create your audio</span>
        </div>
        <div className={styles.approveActions}>
            <button className={styles.approveSecondary} onClick={onEditMore}>
                Edit more
            </button>
            <button className={styles.approvePrimary} onClick={onRecordVoice}>
                Record My Voice
                <MicIcon />
            </button>
        </div>
    </div>
);

// Main Story Component
const Story: React.FC = () => {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [storyText, setStoryText] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [activeStep, setActiveStep] = useState(0);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        document.title = "ManifestMyStory — Your Story";

        // Add font stylesheet
        const fontLink = document.createElement('link');
        fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap";
        fontLink.rel = "stylesheet";
        document.head.appendChild(fontLink);
    }, []);

    // Mock user answers (in real app, would come from sessionStorage/context)
    const userAnswers: UserAnswers = {
        identity: "A thriving entrepreneur and devoted father living a life of purpose, health, and deep connection",
        purpose: "To build businesses that create real value while being fully present for the people I love",
        values: "Integrity, freedom, family, creativity, and service",
        location: "A sun-filled coastal town in southern Portugal, minutes from the ocean",
        home: "A whitewashed villa with terracotta floors, an open kitchen that smells of fresh bread and espresso, surrounded by lemon trees",
        morning: "I wake naturally at 6am, meditate for 20 minutes on the terrace with a view of the sea, then journal and move my body before the rest of the house stirs",
        work: "Building my digital business from a quiet home office — deep work in the mornings, creative collaboration in the afternoons",
        people: "My partner, our two children, a close circle of friends who challenge and inspire me, and a growing team I genuinely love working with",
        emotions: "Deeply peaceful, quietly confident, and profoundly grateful — alive in a way I used to only dream about",
        joy: "The sound of my kids laughing downstairs, the cold ocean on my skin in the morning, the feeling after finishing deep work",
        challenges: "I navigate obstacles with calm clarity — I know who I am, and setbacks feel like information, not failure",
        evening: "A slow family dinner, a walk along the coast as the sun sets, and reading before bed",
        reflection: "Gratitude for the ordinary beauty of the day. Pride in showing up fully. Excitement for what's still unfolding.",
        dreams: "A life that keeps expanding — more depth, more impact, more presence",
        categories: ["❤️ Love", "💪 Health", "💰 Abundance", "🎯 Work", "🏡 Home", "🌍 Travel"]
    };

    const generationSteps: GenerationStep[] = [
        { id: 'gstep1', label: 'Analysing your vision & goals', delay: 0 },
        { id: 'gstep2', label: 'Building your future world', delay: 1200 },
        { id: 'gstep3', label: 'Writing sensory narrative', delay: 2400 },
        { id: 'gstep4', label: 'Finalising your personal story', delay: 4000 }
    ];

    const checklistItems: ChecklistItem[] = [
        { id: 'first-person', text: 'Written in first person (I, me, my)' },
        { id: 'present-tense', text: 'Present tense throughout' },
        { id: 'sensory', text: 'Includes physical sensations' },
        { id: 'authentic', text: 'Emotions feel authentic to you' },
        { id: 'specific', text: 'Specific details you recognize' },
        { id: 'readable', text: 'Reads naturally when spoken aloud' },
        { id: 'length', text: '5–8 minutes to read aloud' }
    ];

    // Build prompt for AI
    const buildPrompt = useCallback((answers: UserAnswers): string => {
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

THEIR VISION:
Identity: ${answers.identity}
Core Purpose: ${answers.purpose}
Values: ${answers.values}
Where they live: ${answers.location}
Their home: ${answers.home}
Morning routine: ${answers.morning}
Work/creative life: ${answers.work}
Key relationships: ${answers.people}
Financial abundance: ${answers.abundance || 'Not specified'}
Health & body: ${answers.health || 'Not specified'}
Spirituality & inner life: ${answers.spirit || 'Not specified'}
How they feel each day: ${answers.emotions}
Small joyful moments: ${answers.joy}
Community & contribution: ${answers.community || 'Not specified'}
Recreation & travel: ${answers.travel || 'Not specified'}
How they handle challenges: ${answers.challenges}
Evening routine: ${answers.evening}
End of day reflection: ${answers.reflection}
Dreams and intentions: ${answers.dreams}${obstacleSection}

Write the story now. Begin directly with the first line — no preamble, no title, no intro.`;
    }, []);

    // Demo story fallback
    const getDemoStory = useCallback((): string => {
        return `I open my eyes before my alarm has a chance to sound. The room is quiet except for the low hum of the sea beyond the open window — that familiar rhythm that has become the backdrop of my whole life here. Pale morning light falls across the terracotta floor in long, warm strips, and for a moment I simply lie still and let the gratitude wash through me. This is my life. This is actually my life.

I rise without effort, the way I always do now. There is no resistance in the morning anymore, no heaviness I used to carry. I walk barefoot across the cool tiles and step onto the terrace, and there it is — the Atlantic stretching wide and silver under the early sun. I settle into my chair, close my eyes, and let my breath slow. Twenty minutes of stillness that feel like drinking something essential. By the time I open my journal, my mind is clear in a way I spent years trying to manufacture and now simply wake into.

The smell of coffee drifts from inside. My partner is up, moving quietly through the kitchen, and I can hear the low, contented sounds of our home beginning its day. The kids are still asleep. This hour is mine, and I hold it like something precious.

I move through my morning practice — some stretching on the terrace, a cold rinse, a slow breakfast of fruit and yogurt with espresso so dark and rich it still surprises me. By eight o'clock I am at my desk, the window open to the garden, and I am working. Not grinding. Working — which is a different thing entirely. There is a project I have been turning over in my mind for weeks and today something opens in it. I write for two hours without looking up, and when I finally do, I feel that deep animal satisfaction of having made something that wasn't there before.

Midmorning, a call with my team. I watch their faces on screen — smart, motivated people who genuinely believe in what we're building — and I feel the particular pride of having created something that takes on a life of its own. We solve a problem together. It takes twenty minutes and we are all better for it.

Lunch is long, the way it should be. My partner and I eat outside under the fig tree and we talk — really talk — about nothing important and everything that matters. This is one of those small moments I could not have imagined would mean so much: just this, sitting in dappled shade with someone I love, unhurried.

The afternoon has its own shape. I swim. The cold water closes over me and I feel completely, electrically present — every cell of my body awake. I float on my back and look up at the blue sky and think: I built this. Not the sea, not the sky, but the life that puts me here.

The children are home by four. The house fills with noise and laughter and the particular energy of small people who have strong feelings about everything. I am not distracted, not half-present with one eye on a screen. I am just here. We kick a ball in the garden until dinner.

We eat together as a family, slowly, the way families should. After the children are in bed I walk along the coast road with my partner, the sun going down in long bands of orange and pink. We barely need to speak. Everything that needs to be said has been said, or doesn't need saying at all.

Later, in bed, I feel the day settle into me. It was not extraordinary by any measure the outside world would recognize. No headline, no milestone. But it was full — full in a way I used to ache for and now simply live. I carry that fullness into sleep, and I dream about tomorrow.`;
    }, []);

    // Simulate generation steps
    useEffect(() => {
        if (!isGenerating) return;

        const timers: NodeJS.Timeout[] = [];

        generationSteps.forEach((step, index) => {
            const timer = setTimeout(() => {
                setActiveStep(index);
            }, step.delay);
            timers.push(timer);
        });

        // Simulate API call completion
        const completionTimer = setTimeout(() => {
            setIsGenerating(false);
            setStoryText(getDemoStory());
        }, 5000);

        timers.push(completionTimer);

        return () => timers.forEach(t => clearTimeout(t));
    }, [isGenerating, generationSteps, getDemoStory]);

    // Update word count when story changes
    useEffect(() => {
        const count = storyText.trim().split(/\s+/).filter(Boolean).length;
        setWordCount(count);
    }, [storyText]);

    // Adjust textarea height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [storyText, isEditing]);

    const handleToggleEdit = () => {
        setIsEditing(!isEditing);
        if (!isEditing && textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const handleStoryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setStoryText(e.target.value);
    };

    const handleRegenerate = () => {
        setIsApproved(false);
        setIsGenerating(true);
        setActiveStep(0);
        // In real app, would call API here
        setTimeout(() => {
            setIsGenerating(false);
            setStoryText(getDemoStory());
        }, 5000);
    };

    const handleApprove = () => {
        setIsApproved(true);
        if (isEditing) {
            setIsEditing(false);
        }
        router.push('/user/voice-recording');
    };

    const handleUnapprove = () => {
        setIsApproved(false);
    };

    const handleRecordVoice = () => {
        router.push('/user/voice-recording');
    };

    const handleToggleCheck = (id: string) => {
        setCheckedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <>


            <div className={styles.container}>
                {/* TOP BAR */}
                <header className={styles.topbar}>
                    <Link href="/" className={styles.logo}>
                        Manifest<span>MyStory</span>
                    </Link>

                    <div className={styles.stepsRow}>
                        <StepItem number={1} label="Goals" status="done" />
                        <StepItem number={2} label="Your Story" status="active" />
                        <StepItem number={3} label="Voice Recording" status="pending" />
                        <StepItem number={4} label="Your Audio" status="pending" />
                    </div>

                    <div className={styles.topbarRight}>
                        <button className={styles.outlineBtn} onClick={handleRegenerate}>
                            ↺ Regenerate
                        </button>
                        <button
                            className={styles.primaryBtn}
                            id="approveTopBtn"
                            disabled={isGenerating || isApproved}
                            onClick={handleApprove}
                        >
                            {isApproved ? '✓ Approved' : 'Approve Story'}
                            {!isApproved && <ArrowIcon />}
                        </button>
                    </div>
                </header>

                {/* PAGE BODY */}
                <div className={styles.pageBody}>
                    {/* LEFT: VISION SUMMARY */}
                    <aside className={styles.leftPanel}>
                        <div>
                            <div className={styles.panelSectionTitle}>Your Vision</div>
                            <VisionItem label="Identity" value={userAnswers.identity} />
                            <VisionItem label="Purpose" value={userAnswers.purpose} />
                            <VisionItem label="Location" value={userAnswers.location} />
                            <div className={styles.visionItem}>
                                <div className={styles.visionLabel}>Focus Areas</div>
                                {userAnswers.categories && (
                                    <CategoryTags categories={userAnswers.categories} />
                                )}
                            </div>
                            <VisionItem label="Core Feeling" value={userAnswers.emotions} />
                        </div>

                        <button className={styles.regenBtn} onClick={handleRegenerate}>
                            <RefreshIcon />
                            Regenerate story
                        </button>
                    </aside>

                    {/* CENTER: STORY EDITOR */}
                    <main className={styles.centerPanel} id="centerPanel">
                        {/* GENERATING STATE */}
                        {isGenerating && (
                            <div className={styles.generatingCard} id="generatingCard">
                                <div className={styles.genIcon}>
                                    <StarIcon />
                                </div>
                                <div className={styles.genTitle}>Crafting your story…</div>
                                <div className={styles.genSubtitle}>
                                    We're weaving your vision into a rich, sensory narrative set on a perfect day in your future life.
                                </div>

                                <div className={styles.genSteps}>
                                    {generationSteps.map((step, index) => {
                                        let status: 'pending' | 'active' | 'done' = 'pending';
                                        if (index < activeStep) status = 'done';
                                        else if (index === activeStep) status = 'active';
                                        return (
                                            <GenerationStepItem
                                                key={step.id}
                                                step={step}
                                                status={status}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* STORY CARD */}
                        {!isGenerating && (
                            <div className={`${styles.storyCard} ${styles.visible}`} id="storyCard">
                                <div className={styles.storyHeader}>
                                    <div className={styles.storyHeaderLeft}>
                                        <div className={styles.storyEyebrow}>Your Personal Manifestation Story</div>
                                        <div className={styles.storyTitle} id="storyTitleEl">
                                            A Day in the Life of My Highest Self
                                        </div>
                                        <div className={styles.storyMeta} id="storyMeta">
                                            Generated just now · {wordCount.toLocaleString()} words
                                        </div>
                                    </div>
                                    <button
                                        className={`${styles.editToggle} ${isEditing ? styles.editing : ''}`}
                                        onClick={handleToggleEdit}
                                    >
                                        {isEditing ? (
                                            <>
                                                <DoneIcon />
                                                Done editing
                                            </>
                                        ) : (
                                            <>
                                                <EditIcon />
                                                Edit story
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className={styles.storyBody}>
                                    <textarea
                                        ref={textareaRef}
                                        id="storyText"
                                        className={styles.storyText}
                                        readOnly={!isEditing}
                                        value={storyText}
                                        onChange={handleStoryChange}
                                    />
                                </div>

                                <div className={styles.storyFooter}>
                                    <span className={styles.wordCount} id="wordCountBottom">
                                        {wordCount.toLocaleString()} words
                                    </span>
                                    <div className={styles.footerActions}>
                                        <button className={styles.outlineBtn} onClick={handleRegenerate}>
                                            ↺ New version
                                        </button>
                                        <button
                                            className={styles.primaryBtn}
                                            onClick={handleApprove}
                                            disabled={isApproved}
                                        >
                                            Approve & Continue
                                            <ArrowIcon />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APPROVE BANNER */}
                        {isApproved && !isGenerating && (
                            <ApproveBanner
                                onEditMore={handleUnapprove}
                                onRecordVoice={handleRecordVoice}
                            />
                        )}
                    </main>

                    {/* RIGHT PANEL */}
                    <aside className={styles.rightPanel}>
                        <TipCard />

                        <div>
                            <div className={styles.panelSectionTitle}>Story Checklist</div>
                            <div className={styles.checklist} id="checklist">
                                {checklistItems.map(item => (
                                    <ChecklistItemComponent
                                        key={item.id}
                                        item={item}
                                        checked={!!checkedItems[item.id]}
                                        onToggle={handleToggleCheck}
                                    />
                                ))}
                            </div>
                        </div>

                        <NextStepCard
                            onNext={handleRecordVoice}
                            disabled={!isApproved}
                        />
                    </aside>
                </div>
            </div>
        </>
    );
};

export default Story;