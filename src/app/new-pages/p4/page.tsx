'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/GoalDiscovery.module.css';
import { SendIcon, UserIcon, ArrowIcon } from '../../components/icons/ChatIcons';
import {
    Message,
    CapturedData,
    ProgressData,
    CaptureData,
    TOPICS,
    SYSTEM_PROMPT
} from '../../types/goal-discovery';

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
}

const TopicItem: React.FC<TopicItemProps> = ({ id, label, isActive, isCovered }) => {
    let className = styles.topicItem;
    if (isCovered) className += ` ${styles.covered}`;
    if (isActive) className += ` ${styles.active}`;

    return (
        <div className={className} id={`t-${id}`}>
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
        const lines = raw.split('\n');
        const textLines: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('PROGRESS:')) {
                try {
                    const data = JSON.parse(trimmed.slice(9)) as ProgressData;
                    setProgress({
                        pct: data.pct || 0,
                        phase: data.phase || progress.phase,
                        covered: data.covered || []
                    });
                    if (data.phase === 'Complete') {
                        setIsComplete(true);
                    }
                } catch (e) {
                    console.error('Error parsing progress:', e);
                }
            }
            else if (trimmed.startsWith('CAPTURE:')) {
                try {
                    const data = JSON.parse(trimmed.slice(8)) as CaptureData;
                    if (data.label && data.value) {
                        setCapturedData(prev => ({
                            ...prev,
                            [data.label]: data.value
                        }));
                    }
                } catch (e) {
                    console.error('Error parsing capture:', e);
                }
            }
            else {
                textLines.push(line);
            }
        }

        return textLines.join('\n').trim();
    }, [progress.phase]);

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
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add your API key here or via environment variable
                    'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
                },
                body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 1000,
                    system: SYSTEM_PROMPT,
                    messages: newMessages.map(({ role, content }) => ({ role, content }))
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.content?.[0]?.text || '';
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

    const handleGenerateStory = useCallback(() => {
        // Store captured data for next page
        sessionStorage.setItem('capturedGoals', JSON.stringify(capturedData));
        router.push('/story-generation');
    }, [capturedData, router]);

    return (
        <div className={styles.container}>
            {/* Top Bar */}
            <header className={styles.topbar}>
                <div className={styles.logo}>
                    Manifest<span>MyStory</span>
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

                <div className={styles.phaseBadge}>
                    {progress.phase}
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