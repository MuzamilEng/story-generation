'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from '../../styles/GoalDiscovery.module.css';
import Link from 'next/link';
import { SendIcon, UserIcon, ArrowIcon } from '../../components/icons/ChatIcons';
import {
    Message,
    CapturedData,
    ProgressData,
    CaptureData,
    TOPICS,
    SYSTEM_PROMPT
} from '../../types/goal-discovery';

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

// Define your icons if needed or import them
const CheckIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

// Typing animation component
const TypingIndicator: React.FC = () => (
    <div className={`${styles.msgRow} ${styles.bot}`}>
        <div className={`${styles.avatar} ${styles.bot}`}>M</div>
        <div className={styles.typingBub}>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
        </div>
    </div>
);

// Topic item component
interface TopicItemProps {
    id: string;
    label: string;
    isActive: boolean;
    isCovered: boolean;
    onClick: (id: string, label: string) => void;
}

const TopicItem: React.FC<TopicItemProps> = ({ id, label, isActive, isCovered, onClick }) => {
    let className = styles.topicItem;
    if (isCovered) className += ` ${styles.covered}`;
    if (isActive) className += ` ${styles.active}`;

    return (
        <div
            className={className}
            id={`t-${id}`}
            onClick={() => onClick(id, label)}
            style={{ cursor: 'pointer' }}
        >
            <div className={styles.tDot}></div>
            <span>{label}</span>
        </div>
    );
};

// Captured item component
interface CapturedItemProps {
    label: string;
    value: string;
}

const CapturedItem: React.FC<CapturedItemProps> = ({ label, value }) => (
    <div className={styles.capturedItem}>
        <strong>{label}</strong>
        {value.length > 80 ? `${value.slice(0, 80)}…` : value}
    </div>
);

// Completion card component
interface CompletionCardProps {
    onGenerate: () => void;
}

const CompletionCard: React.FC<CompletionCardProps> = ({ onGenerate }) => (
    <div className={`${styles.msgRow} ${styles.bot}`}>
        <div className={`${styles.avatar} ${styles.bot}`}>M</div>
        <div className={styles.completeCard}>
            <h3>✦ Your vision is captured</h3>
            <p>
                I have everything I need to write your personal manifestation story —
                a rich, sensory, first-person narrative set on a perfect day in your future life.
            </p>
            <button className={styles.completeBtn} onClick={onGenerate}>
                Generate My Story
                <ArrowIcon />
            </button>
        </div>
    </div>
);

// Message bubble component
interface MessageBubbleProps {
    message: Message;
    onChipClick?: (text: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onChipClick }) => {
    const isUser = message.role === 'user';

    // Extract chips from assistant messages (simple heuristic)
    const chips = !isUser && message.content.toLowerCase().includes('already have')
        ? ['Yes, I have my goals ready', "Let's explore together"]
        : !isUser && message.content.toLowerCase().includes('would you like')
            ? ['Tell me more', "Let's move on"]
            : [];

    // Format text with simple markdown
    const formatText = (text: string) => {
        const withBold = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const withItalic = withBold.replace(/\*(.*?)\*/g, '<em>$1</em>');
        const withParagraphs = withItalic.replace(/\n\n/g, '</p><p>');
        const withBreaks = withParagraphs.replace(/\n/g, '<br>');
        return `<p>${withBreaks}</p>`;
    };

    return (
        <div className={`${styles.msgRow} ${isUser ? styles.user : styles.bot}`}>
            <div className={`${styles.avatar} ${isUser ? styles.user : styles.bot}`}>
                {isUser ? <UserIcon /> : 'M'}
            </div>
            <div className={styles.bubble}>
                <div dangerouslySetInnerHTML={{ __html: formatText(message.content) }} />
                {chips.length > 0 && (
                    <div className={styles.chips}>
                        {chips.map((chip, i) => (
                            <button
                                key={i}
                                className={styles.chip}
                                onClick={() => onChipClick?.(chip)}
                            >
                                {chip}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const GoalDiscovery: React.FC = () => {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();

    useEffect(() => {
        document.title = "ManifestMyStory — Goal Discovery";
        const link = document.createElement('link');
        link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);

        return () => {
            if (document.head.contains(link)) {
                document.head.removeChild(link);
            }
        };
    }, []);
    const [messages, setMessages] = useState<Message[]>([]);
    const [capturedData, setCapturedData] = useState<CapturedData>({});
    const [progress, setProgress] = useState<ProgressData>({
        pct: 0,
        phase: 'Getting Started',
        covered: []
    });
    const [isWaiting, setIsWaiting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [showTyping, setShowTyping] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showTyping]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
        }
    }, [inputValue]);

    // Start conversation on mount
    useEffect(() => {
        sendToAI();
    }, []);

    // Parse bot response for metadata
    const parseResponse = useCallback((raw: string): string => {
        let cleanText = raw;

        // 1. Extract PROGRESS data
        const progressMatch = cleanText.match(/PROGRESS:(\{.*?\})/);
        if (progressMatch) {
            try {
                const data = JSON.parse(progressMatch[1]) as ProgressData;
                setProgress(prev => ({
                    pct: data.pct !== undefined ? data.pct : prev.pct,
                    phase: data.phase || prev.phase,
                    covered: data.covered || prev.covered
                }));
                if (data.phase === 'Complete' || data.pct >= 100) {
                    setIsComplete(true);
                }
                // Remove the progress line from the clean text
                cleanText = cleanText.replace(progressMatch[0], '');
            } catch (e) {
                console.error('Error parsing progress JSON:', e);
            }
        }

        // 2. Extract all CAPTURE data (could be multiple)
        const captureRegex = /CAPTURE:(\{.*?\})/g;
        let match;
        while ((match = captureRegex.exec(cleanText)) !== null) {
            try {
                const data = JSON.parse(match[1]) as CaptureData;
                if (data.label && data.value) {
                    setCapturedData(prev => ({
                        ...prev,
                        [data.label]: data.value
                    }));
                }
                // Mark for removal below
            } catch (e) {
                console.error('Error parsing capture JSON:', e);
            }
        }

        // Clean up the text: remove all CAPTURE lines and extra whitespace
        return cleanText.replace(/CAPTURE:\{.*?\}/g, '').trim();
    }, []);

    // Send message to AI
    const sendToAI = useCallback(async (userMessage?: string) => {
        const newMessages: Message[] = [...messages];

        if (userMessage) {
            newMessages.push({ role: 'user', content: userMessage });
            setMessages(newMessages);
        }

        setShowTyping(true);
        setIsWaiting(true);

        try {
            const response = await fetch('/api/user/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: newMessages.map(({ role, content }) => ({ role, content }))
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.text || '';
            const cleanText = parseResponse(rawText);

            newMessages.push({ role: 'assistant', content: cleanText });
            setMessages(newMessages);

        } catch (error) {
            console.error('Error calling AI:', error);
            newMessages.push({
                role: 'assistant',
                content: "I'm having a moment of connection trouble. Please check your network and try again — your answers so far are safe."
            });
            setMessages(newMessages);
        } finally {
            setShowTyping(false);
            setIsWaiting(false);
            setInputValue('');
        }
    }, [messages, parseResponse]);

    const handleSend = useCallback(() => {
        if (!inputValue.trim() || isWaiting) return;
        sendToAI(inputValue.trim());
    }, [inputValue, isWaiting, sendToAI]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleChipClick = useCallback((text: string) => {
        if (isWaiting) return;
        sendToAI(text);
    }, [isWaiting, sendToAI]);

    const handleTopicClick = useCallback((id: string, label: string) => {
        if (isWaiting) return;

        // 1. Immediate visual feedback: update progress even before AI responds
        const topicIndex = TOPICS.findIndex(t => t.id === id);
        const targetPct = Math.max(progress.pct, (topicIndex + 1) * 15);

        setProgress(prev => ({
            pct: targetPct,
            phase: TOPICS[topicIndex].phase,
            covered: prev.covered.includes(id) ? prev.covered : [...prev.covered, id]
        }));

        // 2. Tell the AI to focus there
        const prompt = `I'd like to dive into ${label} next.`;
        sendToAI(prompt);
    }, [isWaiting, sendToAI, progress.pct]);

    const handleGenerateStory = useCallback(async () => {
        // Prepare goal data
        const goalData = capturedData;

        // If not logged in: store in session storage first then go through signup
        if (!session) {
            sessionStorage.setItem('capturedGoals', JSON.stringify(goalData));
            router.push('/auth/signup?next=/user/story');
            return;
        }

        // Logged in: save directly to database
        try {
            const response = await fetch('/api/user/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goals: goalData })
            });
            const data = await response.json();
            if (data.storyId) {
                router.push(`/user/story?id=${data.storyId}`);
            } else {
                // Fallback if API fails
                sessionStorage.setItem('capturedGoals', JSON.stringify(goalData));
                router.push('/user/story');
            }
        } catch (error) {
            console.error('Error saving story goals:', error);
            // Fallback
            sessionStorage.setItem('capturedGoals', JSON.stringify(goalData));
            router.push('/user/story');
        }
    }, [capturedData, router, session]);

    const isPaid = session?.user?.plan && session.user.plan !== 'free';

    // Dynamic steps
    const getSteps = () => {
        if (authStatus !== 'authenticated') {
            return [
                { label: 'Goals', status: 'active' as const },
                { label: 'Your Story', status: 'pending' as const },
                { label: 'Account', status: 'pending' as const },
                { label: 'Plan', status: 'pending' as const },
                { label: 'Voice Recording', status: 'pending' as const },
                { label: 'Your Audio', status: 'pending' as const },
            ];
        }
        if (!isPaid) {
            return [
                { label: 'Goals', status: 'active' as const },
                { label: 'Your Story', status: 'pending' as const },
                { label: 'Plan', status: 'pending' as const },
                { label: 'Voice Recording', status: 'pending' as const },
                { label: 'Your Audio', status: 'pending' as const },
            ];
        }
        return [
            { label: 'Goals', status: 'active' as const },
            { label: 'Your Story', status: 'pending' as const },
            { label: 'Voice Recording', status: 'pending' as const },
            { label: 'Your Audio', status: 'pending' as const },
        ];
    };

    const steps = getSteps();

    return (
        <div className={styles.container}>
            {/* Top Bar */}
            <header className={styles.topbar}>
                <Link href="/" className={styles.logo}>
                    Manifest<span>MyStory</span>
                </Link>

                <div className={styles.stepsRow}>
                    {steps.map((step, idx) => (
                        <StepItem key={idx} number={idx + 1} label={step.label} status={step.status} />
                    ))}
                </div>

                <div className={styles.progressWrap}>
                    <div className={styles.progressMeta}>
                        <span className={styles.progressLabel}>Goal Discovery</span>
                        <span className={styles.progressPct}>{progress.pct}%</span>
                    </div>
                    <div className={styles.progressTrack}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${progress.pct}%` }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className={styles.phaseBadge}>
                        {progress.phase}
                    </div>

                    {/* Show Generate Story button very early if they've shared anything useful */}
                    {!isComplete && progress.pct >= 40 && (
                        <button
                            className={styles.headerProceedBtn}
                            onClick={handleGenerateStory}
                        >
                            Generate My Story
                            <ArrowIcon />
                        </button>
                    )}

                    {session ? (
                        <Link href="/user/dashboard" style={{ fontSize: '13px', opacity: 0.7, textDecoration: 'none' }}>
                            Dashboard →
                        </Link>
                    ) : (
                        <Link href="/auth/signin" style={{ fontSize: '13px', opacity: 0.7, textDecoration: 'none' }}>
                            Sign In
                        </Link>
                    )}
                </div>
            </header>

            <div className={styles.main}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarTitle}>Topics</div>

                    {TOPICS.map(topic => (
                        <TopicItem
                            key={topic.id}
                            id={topic.id}
                            label={topic.label}
                            isActive={progress.phase === topic.phase}
                            isCovered={progress.covered.includes(topic.id)}
                            onClick={handleTopicClick}
                        />
                    ))}

                    <div className={styles.sidebarDivider} />

                    <div className={styles.capturedBox}>
                        <div className={styles.capturedTitle}>Captured So Far</div>
                        <div className={styles.capturedList}>
                            {Object.entries(capturedData).length === 0 ? (
                                <span className={styles.nothingYet}>Your vision will appear here…</span>
                            ) : (
                                Object.entries(capturedData).map(([label, value]) => (
                                    <CapturedItem key={label} label={label} value={value} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Sidebar finish button shown even earlier */}
                    {!isComplete && progress.pct >= 30 && (
                        <button
                            className={styles.finishEarlyBtn}
                            onClick={handleGenerateStory}
                            title="Click here whenever you feel ready to see your story"
                        >
                            <span>Ready to see your story?</span>
                            <strong>Finish & Generate →</strong>
                        </button>
                    )}
                </aside>

                {/* Chat Area */}
                <div className={styles.chatWrap}>
                    <div className={styles.chatMessages}>
                        {messages.map((msg, index) => (
                            <MessageBubble
                                key={index}
                                message={msg}
                                onChipClick={handleChipClick}
                            />
                        ))}

                        {showTyping && <TypingIndicator />}

                        {isComplete && (
                            <CompletionCard onGenerate={handleGenerateStory} />
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.inputArea}>
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Share your answer here…"
                            rows={1}
                            disabled={isWaiting || isComplete}
                        />
                        <button
                            className={styles.sendBtn}
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isWaiting || isComplete}
                        >
                            <SendIcon />
                        </button>
                    </div>

                    <div className={styles.inputHint}>
                        Enter to send · Shift+Enter for new line
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalDiscovery;