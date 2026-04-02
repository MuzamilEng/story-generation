'use client'
import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../../../styles/AudioReady.module.css';
import { useStoryStore } from '@/store/useStoryStore';

// Icon Components (kept as they were)
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
    <svg viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
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
        <text x="8" y="16" fontSize="7" fill="currentColor" stroke="none">15</text>
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

const AudioReadyContent: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const storyId = searchParams.get('storyId');

    const [story, setStory] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(85);
    const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
    const [waveformBars, setWaveformBars] = useState<WaveformBar[]>([]);

    const audioRef = useRef<HTMLAudioElement>(null);
    const soundscapeRef = useRef<HTMLAudioElement>(null);
    const binauralRef = useRef<HTMLAudioElement>(null);
    const waveformCount = 80;

    const [soundscapeOn, setSoundscapeOn] = useState(false);
    const [binauralOn, setBinauralOn] = useState(false);

    const { clearStore } = useStoryStore();

    useEffect(() => {
        document.title = "ManifestMyStory — Your Audio is Ready";

        // Reset the store as the process is successfully complete
        clearStore();

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

    useEffect(() => {
        const fetchStory = async () => {
            if (!storyId) {
                setIsLoading(false);
                return;
            }
            try {
                const res = await fetch(`/api/user/stories/${storyId}`);
                if (res.ok) {
                    const data = await res.json();
                    setStory(data);
                    // Default toggles based on user preference
                    if (data.user?.soundscape && data.user.soundscape !== 'none') {
                        setSoundscapeOn(true);
                    }
                    if (data.user?.binaural_enabled && data.user?.plan === 'amplifier') {
                        setBinauralOn(true);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch story", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStory();
    }, [storyId]);

    useEffect(() => {
        // Generate random-ish waveform heights
        const heights = Array.from({ length: waveformCount }, () => Math.random() * 32 + 4);
        setWaveformBars(heights.map(height => ({ height, played: false })));
    }, []);

    useEffect(() => {
        if (!duration) return;
        const playedBars = Math.floor((currentTime / duration) * waveformCount);
        setWaveformBars(prev =>
            prev.map((bar, index) => ({
                ...bar,
                played: index < playedBars
            }))
        );
    }, [currentTime, duration]);

    // Ensure audio element volumes are synced
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume / 100;
        // Background tracks are mixed at ~ -18dB relative to voice (approx 0.13 volume)
        if (soundscapeRef.current) soundscapeRef.current.volume = (volume / 100) * 0.13;
        if (binauralRef.current) binauralRef.current.volume = (volume / 100) * 0.13;
    }, [volume]);

    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const recordEvent = async (eventType: 'play' | 'download') => {
        if (!story?.id) return;
        try {
            await fetch('/api/user/events/record', {
                method: 'POST',
                body: JSON.stringify({ storyId: story.id, eventType })
            });
        } catch (e) {
            console.error('Failed to record event:', e);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        
        if (isPlaying) {
            audioRef.current.pause();
            soundscapeRef.current?.pause();
            binauralRef.current?.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => {
                if (soundscapeOn && soundscapeRef.current) {
                    const duration = soundscapeRef.current.duration || 300;
                    soundscapeRef.current.currentTime = audioRef.current!.currentTime % duration;
                    soundscapeRef.current.play().catch(e => console.warn("Soundscape play failed", e));
                }
                if (binauralOn && binauralRef.current) {
                    const duration = binauralRef.current.duration || 300;
                    binauralRef.current.currentTime = audioRef.current!.currentTime % duration;
                    binauralRef.current.play().catch(e => console.warn("Binaural play failed", e));
                }
                setIsPlaying(true);
            }).catch(err => {
                console.error("Playback failed:", err);
                setIsPlaying(false);
            });
            
            // Record play event if near start
            if (currentTime < 1) recordEvent('play');
        }
    };


    // Keep background tracks sync'd on seek
    useEffect(() => {
        if (isPlaying) {
            if (soundscapeOn && soundscapeRef.current && audioRef.current) {
                const diff = Math.abs(soundscapeRef.current.currentTime - (audioRef.current.currentTime % (soundscapeRef.current.duration || 300)));
                if (diff > 0.5) soundscapeRef.current.currentTime = audioRef.current.currentTime % (soundscapeRef.current.duration || 300);
            }
            if (binauralOn && binauralRef.current && audioRef.current) {
                const diff = Math.abs(binauralRef.current.currentTime - (audioRef.current.currentTime % (binauralRef.current.duration || 300)));
                if (diff > 0.5) binauralRef.current.currentTime = audioRef.current.currentTime % (binauralRef.current.duration || 300);
            }
        }
    }, [currentTime]);


    const skip = (seconds: number) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    };

    const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = pct * duration;
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVol = parseInt(e.target.value);
        setVolume(newVol);
        if (audioRef.current) {
            audioRef.current.volume = newVol / 100;
        }
    };

    const handleMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleDownload = () => {
        if (!story?.audio_url) return;

        const confirmed = window.confirm(
            "Once you download your audio file, the purchase is final and non-refundable.\n\nHappy with how it sounds? Click OK to download."
        );

        if (!confirmed) return;

        // Record download event
        recordEvent('download');

        // Trigger real download via our stream API with download=true
        const downloadUrl = `${story.audio_url}${story.audio_url.includes('?') ? '&' : '?'}download=true`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.click();


        setShowDownloadPrompt(true);

        setTimeout(() => {
            document.getElementById('postDownload')?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }, 1000);
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '100px', textAlign: 'center' }}>Preparing your story...</div>
            </div>
        );
    }

    if (!story) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '100px', textAlign: 'center' }}>Story not found.</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {story?.audio_url && (
                <audio
                    ref={audioRef}
                    src={story.audio_url}
                    preload="auto"
                    crossOrigin="anonymous"
                    onLoadedMetadata={handleMetadata}
                    onDurationChange={handleMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => {
                        setIsPlaying(false);
                        soundscapeRef.current?.pause();
                        binauralRef.current?.pause();
                    }}
                />
            )}

            {/* Feature C/D: Background Loops — served from authenticated R2 stream */}
            {story?.soundscape_audio_key && (
                <audio
                    ref={soundscapeRef}
                    src={`/api/user/audio/stream?key=${encodeURIComponent(story.soundscape_audio_key)}`}
                    loop
                    preload="auto"
                    onError={() => {
                        console.warn(`[audio] Failed to load soundscape: ${story.soundscape_audio_key}`);
                        setSoundscapeOn(false);
                    }}
                />
            )}

            {story?.binaural_audio_key && (
                <audio
                    ref={binauralRef}
                    src={`/api/user/audio/stream?key=${encodeURIComponent(story.binaural_audio_key)}`}
                    loop
                    preload="auto"
                    onError={() => {
                        console.warn(`[audio] Failed to load binaural: ${story.binaural_audio_key}`);
                        setBinauralOn(false);
                    }}
                />
            )}


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
                    <div style={{ marginTop: '1.5rem' }}>
                        <button
                            className={styles.dashboardBtn}
                            onClick={() => router.push('/user/dashboard')}
                            style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>

                {/* PLAYER */}
                <div className={styles.playerCard}>
                    <div className={styles.playerTop}>
                        <div className={styles.playerEyebrow}>Your Personal Audio Story</div>
                        <div className={styles.playerTitle}>{story?.title || 'A Day in the Life of My Highest Self'}</div>
                        <div className={styles.playerMeta}>
                            Personalized Story Experience · {formatTime(duration || 0)}
                        </div>
                        <div className={styles.playerMetaSub}>
                            Opening Affirmations + Your Vision Story + Closing Affirmations
                        </div>
                        <div className={styles.waveformDisplay} onClick={seekTo} style={{ cursor: 'pointer' }}>
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
                                <span>{formatTime(duration)}</span>
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

                        <div className={styles.layerControls}>
                            {/* Soundscape toggle — only shown if assemble stored a key (plan-gated server-side) */}
                            {story?.soundscape_audio_key && (
                                <button
                                    className={`${styles.layerBtn} ${soundscapeOn ? styles.active : ''}`}
                                    onClick={() => {
                                        setSoundscapeOn(!soundscapeOn);
                                        if (!soundscapeOn && isPlaying) {
                                            soundscapeRef.current?.play();
                                        } else {
                                            soundscapeRef.current?.pause();
                                        }
                                    }}
                                    title="Ambient background at −18 dB"
                                >
                                    🌊 {soundscapeOn ? 'Soundscape: ON' : 'Soundscape: OFF'}
                                </button>
                            )}

                            {/* Binaural toggle — Amplifier only, key set by assemble */}
                            {story?.binaural_audio_key && (
                                <button
                                    className={`${styles.layerBtn} ${binauralOn ? styles.active : ''}`}
                                    onClick={() => {
                                        setBinauralOn(!binauralOn);
                                        if (!binauralOn && isPlaying) {
                                            binauralRef.current?.play();
                                        } else {
                                            binauralRef.current?.pause();
                                        }
                                    }}
                                    title="Theta binaural beats at −18 dB — best with headphones"
                                >
                                    🎧 {binauralOn ? 'Binaural: ON' : 'Binaural: OFF'}
                                </button>
                            )}

                            {/* Headphones reminder when binaural is on */}
                            {story?.binaural_audio_key && binauralOn && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#c9a84c',
                                    padding: '4px 10px',
                                    background: 'rgba(201,168,76,0.08)',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(201,168,76,0.2)',
                                }}>
                                    🎧 Best experienced with headphones for full theta effect
                                </div>
                            )}
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
                            onClick={handleDownload}
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
                            onClick={() => router.push('/user/goal-intake-ai')}
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
                            onClick={() => router.push('/user/dashboard')}
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
                            onClick={() => router.push('/user/account-setting')}
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
                            <Link href="/user/dashboard" className={styles.homeCta}>
                                ← Go to Dashboard
                            </Link>
                            <Link href="/user/goal-intake-ai" className={styles.homeCtaOutline}>
                                Create another story
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const AudioReady: React.FC = () => {
    return (
        <Suspense fallback={<div className={styles.container}>Loading...</div>}>
            <AudioReadyContent />
        </Suspense>
    );
};

export default AudioReady;