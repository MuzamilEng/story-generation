'use client'
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../styles/AudioReady.module.css';

// Icon Components
const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const MicrophoneIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
);

const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21" />
    </svg>
);

const PauseIcon = () => (
    <>
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </>
);

const SkipBackIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
        <text x="8" y="16" fontSize="7" fill="currentColor" stroke="none">15</text>
    </svg>
);

const SkipForwardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-.49-4.95" />
    </svg>
);

const VolumeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const AlarmIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2" />
        <path d="M5 3 2 6M22 6l-3-3M6.38 18.7 4 21M17.64 18.67 20 21" />
    </svg>
);

const ArrowIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const StarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l1.9 5.8H20l-4.95 3.6 1.9 5.8L12 14.6l-4.95 3.6 1.9-5.8L4 8.8h6.1z" />
    </svg>
);

const ChartIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

const BookIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

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

interface WaveformBar {
    height: number;
    played: boolean;
}

const AudioReady: React.FC = () => {
    const router = useRouter();
    useEffect(() => {
        document.title = "ManifestMyStory — Your Audio is Ready";
        const link = document.createElement('link');
        link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);

        return () => {
            if (document.head.contains(link)) {
                document.head.removeChild(link);
            }
        };
    }, []);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(85);
    const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
    const [waveformBars, setWaveformBars] = useState<WaveformBar[]>([]);

    const totalDuration = 384; // 6:24 in seconds
    const waveformCount = 80;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Generate random waveform heights
        const heights = Array.from({ length: waveformCount }, () => Math.random() * 32 + 4);
        setWaveformBars(heights.map(height => ({ height, played: false })));
    }, []);

    useEffect(() => {
        // Update played bars based on current time
        const playedBars = Math.floor((currentTime / totalDuration) * waveformCount);
        setWaveformBars(prev =>
            prev.map((bar, index) => ({
                ...bar,
                played: index < playedBars
            }))
        );
    }, [currentTime, totalDuration, waveformCount]);

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= totalDuration) {
                        setIsPlaying(false);
                        return totalDuration;
                    }
                    return prev + 1;
                });
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPlaying, totalDuration]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const skip = (seconds: number) => {
        setCurrentTime(prev => Math.max(0, Math.min(totalDuration, prev + seconds)));
    };

    const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        setCurrentTime(Math.floor(pct * totalDuration));
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(parseInt(e.target.value));
    };

    const simulateDownload = () => {
        const confirmed = window.confirm(
            "Once you download your audio file, the purchase is final and non-refundable.\n\nHappy with how it sounds? Click OK to download."
        );

        if (!confirmed) return;

        setShowDownloadPrompt(true);

        // Scroll to download prompt
        setTimeout(() => {
            document.getElementById('postDownload')?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }, 2500);
    };

    const progressPercentage = (currentTime / totalDuration) * 100;

    return (
        <div className={styles.container}>
            {/* TOP BAR */}
            <div className={styles.topbar}>
                <div className={styles.logo}>
                    Manifest<span>MyStory</span>
                </div>
                <div className={styles.stepsRow}>
                    <StepItem number={1} label="Your Goals" status="done" />
                    <StepItem number={2} label="Your Story" status="done" />
                    <StepItem number={3} label="Free Sample" status="done" />
                    <StepItem number={4} label="Account" status="done" />
                    <StepItem number={5} label="Choose Plan" status="done" />
                    <StepItem number={6} label="Full Audio" status="active" />
                </div>
            </div>

            {/* PAGE */}
            <div className={styles.page}>
                {/* CELEBRATION */}
                <div className={styles.celebrateHeader}>
                    <div className={styles.celebrateIcon}>
                        <MicrophoneIcon />
                    </div>
                    <h1 className={styles.celebrateTitle}>
                        Your audio story<br />
                        <em>is ready.</em>
                    </h1>
                    <p className={styles.celebrateSub}>
                        Your personal manifestation story — written from your vision, spoken in your voice. Listen every morning and night to begin rewiring your mind toward your future.
                    </p>
                </div>

                {/* PLAYER */}
                <div className={styles.playerCard}>
                    <div className={styles.playerTop}>
                        <div className={styles.playerEyebrow}>Your Personal Audio Story</div>
                        <div className={styles.playerTitle}>A Day in the Life of My Highest Self</div>
                        <div className={styles.playerMeta}>13 min 42 sec · Generated just now</div>
                        <div className={styles.waveformDisplay}>
                            {waveformBars.map((bar, index) => (
                                <div
                                    key={index}
                                    className={`${styles.wdBar} ${bar.played ? styles.played : ''}`}
                                    style={{ height: `${bar.height}px` }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={styles.playerControls}>
                        <div className={styles.progressRow}>
                            <div className={styles.progressBar} onClick={seekTo}>
                                <div
                                    className={styles.progressBarFill}
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                            <div className={styles.timeRow}>
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(totalDuration)}</span>
                            </div>
                        </div>

                        <div className={styles.ctrlRow}>
                            <button
                                className={styles.ctrlSkip}
                                title="Back 15s"
                                onClick={() => skip(-15)}
                            >
                                <SkipBackIcon />
                            </button>
                            <button
                                className={styles.ctrlPlay}
                                onClick={togglePlay}
                            >
                                <div className={styles.playPauseIcon}>
                                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                </div>
                            </button>
                            <button
                                className={styles.ctrlSkip}
                                title="Forward 15s"
                                onClick={() => skip(15)}
                            >
                                <SkipForwardIcon />
                            </button>
                        </div>

                        <div className={styles.volumeRow}>
                            <div className={styles.volIcon}>
                                <VolumeIcon />
                            </div>
                            <input
                                type="range"
                                className={styles.volSlider}
                                min="0"
                                max="100"
                                value={volume}
                                onChange={handleVolumeChange}
                            />
                        </div>
                    </div>
                </div>

                {/* DOWNLOADS */}
                <div className={styles.downloadSection}>
                    <div className={styles.downloadCard}>
                        <div className={`${styles.dlIcon} ${styles.mp3}`}>
                            <DownloadIcon />
                        </div>
                        <div className={styles.dlInfo}>
                            <div className={styles.dlTitle}>Download MP3</div>
                            <div className={styles.dlSub}>
                                Listen online first — download is final & non-refundable
                            </div>
                        </div>
                        <button
                            className={styles.dlBtn}
                            onClick={simulateDownload}
                        >
                            <DownloadIcon />
                            Download
                        </button>
                    </div>

                    <div className={styles.downloadCard}>
                        <div className={`${styles.dlIcon} ${styles.alarm}`}>
                            <AlarmIcon />
                        </div>
                        <div className={styles.dlInfo}>
                            <div className={styles.dlTitle}>Add to Morning Alarm</div>
                            <div className={styles.dlSub}>
                                Opens in Apple Clock or Google Clock
                            </div>
                        </div>
                        <button className={`${styles.dlBtn} ${styles.ghost}`}>
                            Set up
                            <ArrowIcon />
                        </button>
                    </div>
                </div>

                {/* HOW TO USE */}
                <div className={styles.usageSection}>
                    <div className={styles.usageTitle}>How to get the most from your story</div>
                    <div className={styles.usageList}>
                        <div className={styles.usageItem}>
                            <div className={styles.usageItemIcon}>🌅🌙</div>
                            <div className={styles.usageItemContent}>
                                <div className={styles.usageItemTitle}>Listen morning and night</div>
                                <div className={styles.usageItemBody}>
                                    Play your story within the first few minutes of waking and again right before you fall asleep. These are the windows when your subconscious mind is most open and receptive — and when the reprogramming goes deepest.
                                </div>
                            </div>
                        </div>

                        <div className={styles.usageItem}>
                            <div className={styles.usageItemIcon}>🎧</div>
                            <div className={styles.usageItemContent}>
                                <div className={styles.usageItemTitle}>Immerse yourself — don't just listen</div>
                                <div className={styles.usageItemBody}>
                                    Close your eyes and place yourself inside the story. See the details, feel the environment, inhabit the version of you being described. The more vividly you can experience it as real, the more powerful it becomes. This is a skill — it gets easier and richer with every listen.
                                </div>
                            </div>
                        </div>

                        <div className={styles.usageItem}>
                            <div className={styles.usageItemIcon}>❤️</div>
                            <div className={styles.usageItemContent}>
                                <div className={styles.usageItemTitle}>Feel it as your life now — not something you want</div>
                                <div className={styles.usageItemBody}>
                                    The goal isn't to wish for this life — it's to emotionally <em>inhabit</em> it. Your subconscious doesn't distinguish between a vividly imagined experience and a real one. When you generate the emotions of already living this story, your brain begins to treat it as your reality. This is the hardest part, and it takes practice. Be patient with yourself. Visit the{' '}
                                    <Link href="/science" className={styles.inlineLink}>
                                        science page
                                    </Link>{' '}
                                    to understand exactly why repetition is the key that makes this work.
                                </div>
                            </div>
                        </div>

                        <div className={styles.usageItem}>
                            <div className={styles.usageItemIcon}>🚶</div>
                            <div className={styles.usageItemContent}>
                                <div className={styles.usageItemTitle}>Stay open to action — and take it</div>
                                <div className={styles.usageItemBody}>
                                    Your story will attract opportunities, people, and moments — but you still have to walk through the doors when they open. The more consistently you listen, the more clearly you'll recognize the right actions when they appear in your life. Don't wait for the perfect moment. Move when something feels aligned.
                                </div>
                            </div>
                        </div>

                        <div className={styles.usageItem}>
                            <div className={styles.usageItemIcon}>🔁</div>
                            <div className={styles.usageItemContent}>
                                <div className={styles.usageItemTitle}>Stay consistent — especially when it's working</div>
                                <div className={styles.usageItemBody}>
                                    Things will start to shift. When they do, that is not the time to stop. Consistency is everything here. Missing a day is fine — missing a week breaks the pattern your brain is building. If you feel momentum, that's your signal to double down, not ease off.
                                </div>
                            </div>
                        </div>

                        <div className={styles.usageItem}>
                            <div className={styles.usageItemIcon}>✏️</div>
                            <div className={styles.usageItemContent}>
                                <div className={styles.usageItemTitle}>Update your story as your life evolves</div>
                                <div className={styles.usageItemBody}>
                                    Life changes — and your story should too. If something happens that makes a part of your story feel untrue, outdated, or misaligned, come back and revise it. A story that no longer resonates loses its power. Keep it current, keep it real, keep it yours.
                                </div>
                            </div>
                        </div>

                        <div className={`${styles.usageItem} ${styles.usageItemHighlight}`}>
                            <div className={styles.usageItemIcon}>✨</div>
                            <div className={styles.usageItemContent}>
                                <div className={styles.usageItemTitle}>This should feel exciting — if it doesn't, revise it</div>
                                <div className={styles.usageItemBody}>
                                    Your story is a portrait of your dream life — everything you told us you wanted, brought to life in vivid detail. Listening to it should feel energizing, emotional, and deeply personal. If something feels off, flat, or doesn't quite sound like you — change it. This is your life. Make sure the story feels like it.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SCIENCE */}
                <div className={styles.scienceBanner}>
                    <div className={styles.sciIcon}>🧠</div>
                    <div className={styles.sciText}>
                        <strong>Why your own voice matters:</strong> Research in cognitive psychology shows that self-directed affirmations — heard in your own voice — produce significantly stronger belief activation than the same statements heard in a stranger's voice. Your brain recognizes and trusts your own voice at a neurological level.
                    </div>
                </div>

                {/* NEXT STEPS */}
                <div className={styles.nextSection}>
                    <div className={styles.nextTitle}>Keep going</div>
                    <div className={styles.nextCards}>
                        <div
                            className={styles.nextCard}
                            onClick={() => router.push('/goal-intake-ai')}
                        >
                            <div className={styles.nextCardIcon}>
                                <StarIcon />
                            </div>
                            <div className={styles.nextCardText}>
                                <div className={styles.nextCardTitle}>Create a second story</div>
                                <div className={styles.nextCardSub}>
                                    Go deeper on a specific area — health, abundance, relationships
                                </div>
                            </div>
                            <div className={styles.nextCardArrow}>
                                <ArrowIcon />
                            </div>
                        </div>

                        <div
                            className={styles.nextCard}
                            onClick={() => router.push('/dashboard')}
                        >
                            <div className={styles.nextCardIcon}>
                                <ChartIcon />
                            </div>
                            <div className={styles.nextCardText}>
                                <div className={styles.nextCardTitle}>Track your progress</div>
                                <div className={styles.nextCardSub}>
                                    Log your listening streak and journal moments of alignment
                                </div>
                            </div>
                            <div className={styles.nextCardArrow}>
                                <ArrowIcon />
                            </div>
                        </div>

                        <div
                            className={styles.nextCard}
                            onClick={() => router.push('/science')}
                        >
                            <div className={styles.nextCardIcon}>
                                <BookIcon />
                            </div>
                            <div className={styles.nextCardText}>
                                <div className={styles.nextCardTitle}>Explore the science</div>
                                <div className={styles.nextCardSub}>
                                    Read the research behind visualization, RAS, and neuroplasticity
                                </div>
                            </div>
                            <div className={styles.nextCardArrow}>
                                <ArrowIcon />
                            </div>
                        </div>
                    </div>
                </div>

                {/* POST DOWNLOAD PROMPT */}
                {showDownloadPrompt && (
                    <div id="postDownload" className={styles.postDownload}>
                        <p className={styles.postDownloadTitle}>You're all set. 🎉</p>
                        <p className={styles.postDownloadText}>
                            Listen to your story every morning and every night. Your brain will start to notice what it's been programmed to see.
                        </p>
                        <div className={styles.postDownloadActions}>
                            <Link href="/manifest" className={styles.homeCta}>
                                ← Return Home
                            </Link>
                            <Link href="/goal-intake-ai" className={styles.homeCtaOutline}>
                                Create another story
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioReady;