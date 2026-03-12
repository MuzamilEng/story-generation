'use client'
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from '../../../styles/Story.module.css';
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
} from '../../../components/icons/StoryIcons';
import { ChecklistItem, GenerationStep } from '../../../types/story';
import { UserAnswers, normalizeGoals } from '@/lib/story-utils';
import { useStoryStore } from '@/store/useStoryStore';

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

const StoryContent: React.FC = () => {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const storyIdFromUrl = searchParams.get('id');

    const isLoggedIn = authStatus === 'authenticated';
    const isPaid = session?.user?.plan && session.user.plan !== 'free';

    const [isGenerating, setIsGenerating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [storyText, setStoryText] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [activeStep, setActiveStep] = useState(0);
    const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
    const [storyId, setStoryId] = useState<string | null>(storyIdFromUrl);

    const { capturedGoals, normalizedGoals, setNormalizedGoals, clearStore, isHydrated } = useStoryStore();
    const hasInitialized = useRef(false);

    // Dynamic steps based on logic
    const getSteps = () => {
        if (!isLoggedIn) {
            return [
                { label: 'Goals', status: 'done' as const },
                { label: 'Your Story', status: 'active' as const },
                { label: 'Account', status: 'pending' as const },
                { label: 'Voice Recording', status: 'pending' as const },
                { label: 'Your Audio', status: 'pending' as const },
            ];
        }
        return [
            { label: 'Goals', status: 'done' as const },
            { label: 'Your Story', status: 'active' as const },
            { label: 'Voice Recording', status: 'pending' as const },
            { label: 'Your Audio', status: 'pending' as const },
        ];
    };

    const steps = getSteps();

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        document.title = "ManifestMyStory — Your Story";

        const fontLink = document.createElement('link');
        fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap";
        fontLink.rel = "stylesheet";
        document.head.appendChild(fontLink);
    }, []);


    const generate = useCallback(async (id: string) => {
        setIsGenerating(true);
        setActiveStep(0);

        // UI simulation of steps
        for (let i = 0; i < generationSteps.length; i++) {
            setActiveStep(i);
            await new Promise(r => setTimeout(r, 1200));
        }

        try {
            const res = await fetch(`/api/user/stories/${id}/generate`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.storyText) {
                setStoryText(data.storyText);
            }
        } catch (e) {
            console.error("Generation failed", e);
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const saveAndGenerate = useCallback(async (goals: UserAnswers) => {
        // Validation check to prevent {goals: {}} - handles arrays and missing values
        const isEmpty = !goals ||
            Object.keys(goals).length === 0 ||
            Object.values(goals).every(v => !v || v === '' || (Array.isArray(v) && v.length === 0));

        if (isEmpty) {
            console.warn("Skipping saveAndGenerate: Goals are empty or default.");
            return;
        }

        const length = sessionStorage.getItem('storyLength') || 'long';

        try {
            const res = await fetch('/api/user/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goals,
                    length: length
                })
            });
            const data = await res.json();
            if (data.storyId) {
                setStoryId(data.storyId);
                generate(data.storyId);
                sessionStorage.removeItem('capturedGoals');
                sessionStorage.removeItem('storyLength');
            } else if (data.error) {
                console.error("API error:", data.error);
                alert(`Could not save story: ${data.error}`);
            }
        } catch (e) {
            console.error("Failed to save goals", e);
        }
    }, [generate]);

    useEffect(() => {
        const init = async () => {
            if (!isHydrated || hasInitialized.current) return;
            hasInitialized.current = true;

            let currentId = storyIdFromUrl || storyId;

            // 1. Check Store for goals
            let goals: UserAnswers | null = normalizedGoals;

            // If we have raw captured goals but no normalized version, normalize them now
            if (!goals && capturedGoals && Object.keys(capturedGoals).length > 0) {
                goals = normalizeGoals(capturedGoals);
                setNormalizedGoals(goals);
            }

            if (goals) {
                setUserAnswers(goals);
            }

            // 2. Load or Save
            if (currentId) {
                try {
                    const res = await fetch(`/api/user/stories/${currentId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.goal_intake_json) {
                            const dbGoals = normalizeGoals(data.goal_intake_json);
                            setUserAnswers(dbGoals);
                            setNormalizedGoals(dbGoals);
                        }

                        if (data.story_text_draft) {
                            setStoryText(data.story_text_draft);
                            setIsGenerating(false);
                        } else {
                            generate(currentId);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch story", e);
                }
            } else if (goals && Object.values(goals).some(v => v && (typeof v === 'string' ? v !== '' : (!Array.isArray(v) || v.length > 0)))) {
                saveAndGenerate(goals);
            }
        };

        init();
    }, [isHydrated, storyIdFromUrl, generate, saveAndGenerate, storyId, capturedGoals, normalizedGoals, setNormalizedGoals]);

    useEffect(() => {
        const count = storyText.trim().split(/\s+/).filter(Boolean).length;
        setWordCount(count);
    }, [storyText]);

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
        if (storyId) {
            generate(storyId);
        }
    };

    const handleApprove = () => {
        setIsApproved(true);
        if (isEditing) {
            setIsEditing(false);
        }

        // Logic for next step
        if (!isLoggedIn) {
            router.push('/auth/signup?next=/user/story');
        } else {
            router.push(`/user/voice-recording?storyId=${storyId}`);
        }
    };

    const handleUnapprove = () => {
        setIsApproved(false);
    };

    const handleRecordVoice = () => {
        router.push(`/user/voice-recording?storyId=${storyId}`);
    };

    const handleToggleCheck = (id: string) => {
        setCheckedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    if (!userAnswers && !isGenerating) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h2>No story data found.</h2>
                    <p>Please complete the goal discovery first.</p>
                    <Link href="/user/goal-intake-ai" className={styles.primaryBtn}>
                        Start Discovery
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>


            <div className={styles.pageBody}>
                <aside className={styles.leftPanel}>
                    {userAnswers && (
                        <div>
                            <div className={styles.panelSectionTitle}>Your Vision</div>

                            {/* Main Pillars */}
                            {['identity', 'purpose', 'location', 'emotions'].map(key => {
                                const val = (userAnswers as any)[key];
                                if (!val || typeof val !== 'string' || val.trim() === '') return null;
                                return (
                                    <VisionItem
                                        key={key}
                                        label={key === 'emotions' ? 'Core Feeling' : key.charAt(0).toUpperCase() + key.slice(1)}
                                        value={val}
                                    />
                                );
                            })}

                            {/* Any other dynamically captured goals */}
                            {Object.entries(userAnswers)
                                .filter(([key, val]) =>
                                    !['identity', 'purpose', 'location', 'emotions', 'categories'].includes(key) &&
                                    val && typeof val === 'string' && val.trim() !== ''
                                )
                                .map(([key, val]) => (
                                    <VisionItem
                                        key={key}
                                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                                        value={val as string}
                                    />
                                ))
                            }

                            {userAnswers.categories && userAnswers.categories.length > 0 && (
                                <div className={styles.visionItem}>
                                    <div className={styles.visionLabel}>Focus Areas</div>
                                    <CategoryTags categories={userAnswers.categories} />
                                </div>
                            )}
                        </div>
                    )}

                    <button className={styles.regenBtn} onClick={handleRegenerate}>
                        <RefreshIcon />
                        Regenerate story
                    </button>
                </aside>

                <main className={styles.centerPanel} id="centerPanel">
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

                    {!isGenerating && storyText && (
                        <div className={`${styles.storyCard} ${styles.visible}`} id="storyCard">
                            <div className={styles.storyHeader}>
                                <div className={styles.storyHeaderLeft}>
                                    <div className={styles.storyEyebrow}>Your Personal Manifestation Story</div>
                                    <div className={styles.storyTitle} id="storyTitleEl">
                                        {userAnswers?.identity
                                            ? `A Day in the Life of ${userAnswers.identity.split(' ')[0]}'s Highest Self`
                                            : 'Your Manifestation Story'}
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

                    {isApproved && !isGenerating && (
                        <ApproveBanner
                            onEditMore={handleUnapprove}
                            onRecordVoice={handleRecordVoice}
                        />
                    )}
                </main>

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
    );
};

const Story: React.FC = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StoryContent />
        </Suspense>
    );
};

export default Story;