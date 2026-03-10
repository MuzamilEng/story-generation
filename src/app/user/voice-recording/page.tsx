'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../styles/VoiceRecording.module.css';
import {
    CheckIcon,
    MicIcon,
    StopIcon,
    PlayIcon,
    PauseIcon,
    RefreshIcon,
    HomeIcon,
    InfoIcon,
    ClockIcon,
    ShieldIcon,
    ArrowIcon
} from '../../components/icons/VoiceIcons';
import { RecordingState, TipItem } from '../../types/voice';

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

// Tip Row Component
interface TipRowProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const TipRow: React.FC<TipRowProps> = ({ icon, title, description }) => (
    <div className={styles.tipRow}>
        <div className={styles.tipIcon}>{icon}</div>
        <div className={styles.tipText}>
            <strong>{title}</strong>
            {description}
        </div>
    </div>
);

// Waveform Component
interface WaveformProps {
    isRecording: boolean;
    isStopped: boolean;
    duration: number;
}

const Waveform: React.FC<WaveformProps> = ({ isRecording, isStopped, duration }) => {
    const [bars, setBars] = useState<number[]>([]);
    const waveformRef = useRef<HTMLDivElement>(null);
    const NUM_BARS = 60;

    // Initialize bars
    useEffect(() => {
        setBars(Array(NUM_BARS).fill(4));
    }, []);

    // Animate waveform during recording
    useEffect(() => {
        if (!isRecording) return;

        const interval = setInterval(() => {
            setBars(prev => {
                const newBars = [...prev];
                // Shift left and add new random height
                for (let i = 0; i < NUM_BARS - 1; i++) {
                    newBars[i] = newBars[i + 1];
                }
                newBars[NUM_BARS - 1] = Math.random() * 42 + 4;
                return newBars;
            });
        }, 80);

        return () => clearInterval(interval);
    }, [isRecording]);

    return (
        <div className={styles.waveformWrap} ref={waveformRef}>
            {bars.map((height, index) => (
                <div
                    key={index}
                    className={`${styles.waveBar} 
            ${isRecording ? styles.active : ''} 
            ${isStopped ? styles.recorded : ''}`}
                    style={{ height: `${height}px` }}
                />
            ))}
        </div>
    );
};

// Timer Display Component
interface TimerDisplayProps {
    seconds: number;
    isRecording: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ seconds, isRecording }) => {
    const formatTime = (s: number): string => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`${styles.timerDisplay} ${isRecording ? styles.recording : ''}`}>
            {formatTime(seconds)}
        </div>
    );
};

// Playback Component
interface PlaybackProps {
    duration: number;
    onReRecord: () => void;
}

const Playback: React.FC<PlaybackProps> = ({ duration, onReRecord }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const formatTime = (s: number): string => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= duration) {
                        setIsPlaying(false);
                        return 0;
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
    }, [isPlaying, duration]);

    const togglePlayback = () => {
        setIsPlaying(!isPlaying);
    };

    const progressPercentage = (currentTime / duration) * 100;

    return (
        <div className={`${styles.playbackCard} ${styles.visible}`}>
            <button className={styles.playPause} onClick={togglePlayback}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className={styles.pbInfo}>
                <div className={styles.pbTitle}>
                    Your voice sample · <span>{formatTime(duration)}</span>
                </div>
                <div className={styles.pbProgress}>
                    <div className={styles.pbFill} style={{ width: `${progressPercentage}%` }} />
                </div>
                <div className={styles.pbTime}>{formatTime(currentTime)}</div>
            </div>
            <button className={styles.pbRedo} onClick={onReRecord}>
                Re-record
            </button>
        </div>
    );
};

// Main Component
const VoiceRecording: React.FC = () => {
    const router = useRouter();

    useEffect(() => {
        document.title = "ManifestMyStory — Record Your Voice";

        // Add font stylesheet
        const fontLink = document.createElement('link');
        fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap";
        fontLink.rel = "stylesheet";
        document.head.appendChild(fontLink);
    }, []);
    const [recState, setRecState] = useState<RecordingState>('idle');
    const [seconds, setSeconds] = useState(0);
    const [quality, setQuality] = useState({ text: '—', color: 'var(--ink-faint)' });
    const [recordedDuration, setRecordedDuration] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const tips: TipItem[] = [
        {
            icon: <HomeIcon />,
            title: 'Quiet environment',
            description: 'Find a room with minimal echo and background noise. Close doors and windows.'
        },
        {
            icon: <MicIcon />,
            title: 'Phone or laptop mic is fine',
            description: 'You don\'t need special equipment. Hold your device 8–12 inches from your mouth.'
        },
        {
            icon: <ClockIcon />,
            title: 'Read naturally',
            description: 'Speak at a normal pace, as if you\'re reading to yourself. Relaxed and clear wins over slow and stiff.'
        },
        {
            icon: <RefreshIcon />,
            title: 'You can re-record',
            description: 'Don\'t worry about perfection. Listen back and re-record as many times as you need.'
        }
    ];

    // Update quality based on duration
    useEffect(() => {
        if (seconds < 10) {
            setQuality({ text: '—', color: 'var(--ink-faint)' });
        } else if (seconds < 30) {
            setQuality({ text: 'Building…', color: 'var(--gold)' });
        } else if (seconds < 50) {
            setQuality({ text: 'Good', color: 'var(--accent)' });
        } else {
            setQuality({ text: 'Excellent ✓', color: 'var(--accent)' });
        }
    }, [seconds]);

    // Handle recording timer
    useEffect(() => {
        if (recState === 'recording') {
            timerRef.current = setInterval(() => {
                setSeconds(prev => {
                    const newSeconds = prev + 1;
                    // Auto-stop at 90 seconds
                    if (newSeconds >= 90) {
                        stopRecording();
                    }
                    return newSeconds;
                });
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [recState]);

    const startRecording = () => {
        setRecState('recording');
        setSeconds(0);
    };

    const stopRecording = () => {
        setRecState('stopped');
        setRecordedDuration(seconds);
    };

    const handleMicClick = () => {
        if (recState === 'idle') {
            startRecording();
        } else if (recState === 'recording') {
            stopRecording();
        }
    };

    const handleRetake = () => {
        setRecState('idle');
        setSeconds(0);
        setRecordedDuration(0);
    };

    const handleSkip = () => {
        router.push('/user/audio-download');
    };

    const handleSubmit = () => {
        // In production, upload the recorded audio
        router.push('/user/audio-download');
    };

    const formatTime = (s: number): string => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            <div className={styles.container}>
                {/* TOP BAR */}
                <header className={styles.topbar}>
                    <div className={styles.logo}>
                        Manifest<span>MyStory</span>
                    </div>

                    <div className={styles.stepsRow}>
                        <StepItem number={1} label="Goals" status="done" />
                        <StepItem number={2} label="Your Story" status="done" />
                        <StepItem number={3} label="Voice Sample" status="active" />
                        <StepItem number={4} label="Your Audio" status="pending" />
                    </div>

                    <div className={styles.topRight}>
                        <button className={styles.ghostBtn} onClick={handleSkip}>
                            Skip for now
                        </button>
                    </div>
                </header>

                {/* PAGE */}
                <div className={styles.page}>
                    {/* LEFT COLUMN - TIPS */}
                    <aside className={styles.leftCol}>
                        <div className={styles.infoCard}>
                            <div className={styles.infoCardTitle}>Recording tips</div>
                            <div className={styles.infoCardSub}>
                                A clean 60-second sample is all we need to clone your voice accurately.
                            </div>
                            <div className={styles.tipList}>
                                {tips.map((tip, index) => (
                                    <TipRow
                                        key={index}
                                        icon={tip.icon}
                                        title={tip.title}
                                        description={tip.description}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className={styles.sampleScript}>
                            <div className={styles.sampleScriptLabel}>📖 Read this script</div>
                            <p>
                                I wake each morning with a quiet sense of purpose — knowing exactly who I am and where I'm headed. My days are filled with meaningful work, deep connection, and the kind of joy that doesn't need a reason. I am healthy, free, and fully alive to the beauty of the life I've built. Everything I once dreamed of is now simply the life I live.
                            </p>
                        </div>
                    </aside>

                    {/* CENTER COLUMN - RECORDER */}
                    <div className={styles.centerCol}>
                        {/* RECORDER CARD */}
                        <div className={styles.recorderCard}>
                            {/* MIC + STATUS */}
                            <div className={styles.recTop}>
                                <div
                                    className={`${styles.micRing} 
                    ${recState === 'recording' ? styles.recording : ''}
                    ${recState === 'stopped' ? styles.hasRecording : ''}`}
                                    onClick={handleMicClick}
                                >
                                    <div className={styles.micRingBg} />
                                    <div className={styles.micIcon}>
                                        {recState === 'stopped' ? <CheckIcon /> : <MicIcon />}
                                    </div>
                                </div>

                                <div className={styles.recStatus}>
                                    {recState === 'idle' && 'Tap to start recording'}
                                    {recState === 'recording' && 'Recording… tap to stop'}
                                    {recState === 'stopped' && 'Recording saved'}
                                </div>

                                <div
                                    className={styles.recHint}
                                    style={{ color: recState === 'recording' ? 'var(--red)' : recState === 'stopped' ? 'var(--accent)' : '' }}
                                >
                                    {recState === 'idle' && 'Read the sample script on the left at a natural pace for 60 seconds'}
                                    {recState === 'recording' && 'Speak clearly at a relaxed, natural pace'}
                                    {recState === 'stopped' && `${formatTime(recordedDuration)} recorded — listen back below, then continue`}
                                </div>
                            </div>

                            {/* TIMER */}
                            <div className={styles.timerRow}>
                                <div>
                                    <div className={styles.timerLabel}>Recorded</div>
                                    <TimerDisplay seconds={seconds} isRecording={recState === 'recording'} />
                                </div>

                                <div className={styles.timerDivider} />

                                <div className={styles.timerTarget}>
                                    <div className={styles.timerLabel}>Target</div>
                                    <div className={styles.timerTargetVal}>1:00</div>
                                </div>

                                <div className={styles.timerDivider} />

                                <div>
                                    <div className={styles.timerLabel}>Quality</div>
                                    <div
                                        className={styles.qualityLabel}
                                        style={{ color: quality.color }}
                                    >
                                        {quality.text}
                                    </div>
                                </div>
                            </div>

                            {/* WAVEFORM */}
                            <Waveform
                                isRecording={recState === 'recording'}
                                isStopped={recState === 'stopped'}
                                duration={seconds}
                            />

                            {/* CONTROLS */}
                            <div className={styles.recControls}>
                                <button
                                    className={`${styles.ctrlBtn} ${styles.secondary}`}
                                    onClick={handleRetake}
                                    disabled={recState === 'idle' || recState === 'recording'}
                                >
                                    <RefreshIcon />
                                    Re-record
                                </button>

                                <button
                                    className={`${styles.ctrlBtn} 
                    ${recState === 'recording' ? styles.danger : styles.primary}`}
                                    onClick={handleMicClick}
                                >
                                    {recState === 'recording' ? (
                                        <>
                                            <StopIcon />
                                            Stop
                                        </>
                                    ) : recState === 'stopped' ? (
                                        <>
                                            <CheckIcon />
                                            Saved
                                        </>
                                    ) : (
                                        <>
                                            <MicIcon />
                                            Start Recording
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* PLAYBACK */}
                        {recState === 'stopped' && (
                            <Playback
                                duration={recordedDuration}
                                onReRecord={handleRetake}
                            />
                        )}

                        {/* SUBMIT */}
                        {recState === 'stopped' && (
                            <div className={`${styles.submitArea} ${styles.visible}`}>
                                <div className={styles.submitNote}>
                                    <InfoIcon />
                                    <span>
                                        Your voice sample will be used <strong>only</strong> to generate your personal audio story. It is never shared, sold, or used for any other purpose.
                                    </span>
                                </div>

                                <button className={styles.submitBtn} onClick={handleSubmit}>
                                    <MicIcon />
                                    Generate My Audio Story
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default VoiceRecording;