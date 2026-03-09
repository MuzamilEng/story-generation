'use client'
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import styles from '../../styles/Dashboard.module.css';

// Icon Components
const LogoIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l1.9 5.8H20l-4.95 3.6 1.9 5.8L12 14.6l-4.95 3.6 1.9-5.8L4 8.8h6.1z" />
    </svg>
);

const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const PauseIcon = () => (
    <>
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </>
);

const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const EyeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const StarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l1.9 5.8H20l-4.95 3.6 1.9 5.8L12 14.6l-4.95 3.6 1.9-5.8L4 8.8h6.1z" />
    </svg>
);

const TrendIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

const ClockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const SkipBackIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-3.58" />
        <text x="8" y="14" fontSize="5" fill="currentColor" stroke="none">15</text>
    </svg>
);

const SkipForwardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-.49-3.58" />
        <text x="8" y="14" fontSize="5" fill="currentColor" stroke="none">15</text>
    </svg>
);

const LoopIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
);

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const UserIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
);

const LogoutIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

// Types
interface Story {
    id: number;
    title: string;
    excerpt: string;
    createdAt: Date;
    duration: string;
    plays: number;
    downloads: number;
    audioUrl?: string;
}

interface Activity {
    id: number;
    type: 'play' | 'create' | 'download';
    storyId: number;
    storyTitle: string;
    timestamp: Date;
}

interface MetricCardProps {
    icon: React.ReactNode;
    value: number | string;
    label: string;
    delta?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, value, label, delta }) => (
    <div className={styles.metricCard}>
        <div className={styles.metricIcon}>{icon}</div>
        <div className={styles.metricValue}>{value}</div>
        <div className={styles.metricLabel}>{label}</div>
        {delta && <div className={styles.metricDelta}>{delta}</div>}
    </div>
);

interface StoryCardProps {
    story: Story;
    isActive: boolean;
    onPlay: (story: Story) => void;
    onDownload: (story: Story) => void;
    onRead: (story: Story) => void;
}

const StoryCard: React.FC<StoryCardProps> = ({ story, isActive, onPlay, onDownload, onRead }) => (
    <div className={`${styles.storyCard} ${isActive ? styles.activeCard : ''}`} onClick={() => onPlay(story)}>
        <div className={styles.storyCardTop}>
            {isActive && (
                <div className={`${styles.storyPlayingBadge} ${styles.show}`}>
                    Playing
                </div>
            )}
            <div className={styles.storyCardEyebrow}>
                Story {story.id} · Created {format(story.createdAt, 'MMM d, yyyy')}
            </div>
            <div className={styles.storyCardTitle}>{story.title}</div>
            <div className={styles.storyCardMeta}>
                <div className={styles.storyMetaPill}>
                    <ClockIcon />
                    {story.duration}
                </div>
                <div className={styles.storyMetaPill}>
                    <PlayIcon />
                    {story.plays} plays
                </div>
            </div>
        </div>
        <div className={styles.storyCardBody}>
            <div className={styles.storyExcerpt}>{story.excerpt}</div>
            <div className={styles.storyActions}>
                <button
                    className={`${styles.storyBtn} ${styles.primary}`}
                    onClick={(e) => { e.stopPropagation(); onPlay(story); }}
                >
                    <PlayIcon />
                    Play
                </button>
                <button
                    className={styles.storyBtn}
                    onClick={(e) => { e.stopPropagation(); onDownload(story); }}
                >
                    <DownloadIcon />
                    Download
                </button>
                <div className={styles.storyBtnSpacer} />
                <button
                    className={styles.storyBtn}
                    onClick={(e) => { e.stopPropagation(); onRead(story); }}
                >
                    <EyeIcon />
                    Read
                </button>
            </div>
        </div>
    </div>
);

interface ActivityRowProps {
    activity: Activity;
}

const ActivityRow: React.FC<ActivityRowProps> = ({ activity }) => {
    const getIcon = () => {
        switch (activity.type) {
            case 'play':
                return <PlayIcon />;
            case 'download':
                return <DownloadIcon />;
            case 'create':
                return <StarIcon />;
        }
    };

    const getText = () => {
        switch (activity.type) {
            case 'play':
                return <>Listened to <strong>{activity.storyTitle}</strong></>;
            case 'download':
                return <>Downloaded MP3 — <strong>{activity.storyTitle}</strong></>;
            case 'create':
                return <>Created story — <strong>{activity.storyTitle}</strong></>;
        }
    };

    const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: true });

    return (
        <div className={styles.activityRow}>
            <div className={`${styles.activityDot} ${styles[activity.type]}`}>
                {getIcon()}
            </div>
            <div className={styles.activityText}>{getText()}</div>
            <div className={styles.activityTime}>{timeAgo}</div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const router = useRouter();

    useEffect(() => {
        document.title = "ManifestMyStory — My Dashboard";
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
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [activeStory, setActiveStory] = useState<Story | null>(null);
    const [currentTime, setCurrentTime] = useState(138); // 2:18 in seconds
    const [audioPanelOpen, setAudioPanelOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Mock data
    const [stories] = useState<Story[]>([
        {
            id: 1,
            title: "A Day in the Life of My Highest Self",
            excerpt: "Morning light filters through the curtains of my home in the hills. I stretch without an alarm — my body knows when it's ready. The day ahead is full, but it's mine...",
            createdAt: new Date(2025, 0, 12),
            duration: "6 min 42 sec",
            plays: 34,
            downloads: 4,
            audioUrl: 'TODO: R2_URL_STORY_1'
        },
        {
            id: 2,
            title: "My Abundant Life — Financial Freedom",
            excerpt: "The number in my account no longer surprises me. It just is. I book the flight without checking it twice — there is always enough, and I've always known it...",
            createdAt: new Date(2025, 1, 3),
            duration: "7 min 08 sec",
            plays: 13,
            downloads: 2,
            audioUrl: 'TODO: R2_URL_STORY_2'
        }
    ]);

    const [activities] = useState<Activity[]>([
        { id: 1, type: 'play', storyId: 1, storyTitle: "A Day in the Life of My Highest Self", timestamp: new Date(new Date().setHours(7, 2)) },
        { id: 2, type: 'play', storyId: 2, storyTitle: "My Abundant Life — Financial Freedom", timestamp: new Date(Date.now() - 86400000) },
        { id: 3, type: 'download', storyId: 1, storyTitle: "A Day in the Life of My Highest Self", timestamp: new Date(Date.now() - 5 * 86400000) },
        { id: 4, type: 'create', storyId: 2, storyTitle: "My Abundant Life — Financial Freedom", timestamp: new Date(Date.now() - 8 * 86400000) },
        { id: 5, type: 'create', storyId: 1, storyTitle: "A Day in the Life of My Highest Self", timestamp: new Date(Date.now() - 29 * 86400000) }
    ]);

    const totalDuration = 402; // 6:42 in seconds
    const progressPercentage = (currentTime / totalDuration) * 100;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= totalDuration) {
                        if (isLooping) {
                            return 0;
                        }
                        setIsPlaying(false);
                        return prev;
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
    }, [isPlaying, isLooping, totalDuration]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const handlePlayStory = (story: Story) => {
        setActiveStory(story);
        setAudioPanelOpen(true);
        setIsPlaying(true);
    };

    const handleClosePlayer = () => {
        setAudioPanelOpen(false);
        setActiveStory(null);
        setIsPlaying(false);
        setCurrentTime(138);
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const toggleLoop = () => {
        setIsLooping(!isLooping);
    };

    const skipTime = (seconds: number) => {
        setCurrentTime(prev => Math.max(0, Math.min(totalDuration, prev + seconds)));
    };

    const seekAudio = (e: React.MouseEvent<HTMLDivElement>, track: HTMLDivElement) => {
        const rect = track.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setCurrentTime(Math.floor(pct * totalDuration));
    };

    const handleDownload = (story: Story) => {
        if (!story.audioUrl || story.audioUrl.startsWith('TODO')) {
            alert('Download will work once audio URLs are wired by developer.');
            return;
        }
        // Trigger download
        const link = document.createElement('a');
        link.href = story.audioUrl;
        link.download = `${story.title.toLowerCase().replace(/\s+/g, '-')}.mp3`;
        link.click();
    };

    const handleRead = (story: Story) => {
        alert('View full story text — to be wired by developer.');
    };

    return (
        <div className={styles.container}>
            {/* TOP NAV */}
            <header className={styles.topbar}>
                <Link href="/manifest" className={styles.logo}>
                    Manifest<span>MyStory</span>
                </Link>

                <nav className={styles.topbarNav}>
                    <Link href="/dashboard" className={`${styles.navLink} ${styles.active}`}>
                        My Dashboard
                    </Link>
                    <Link href="/science" className={styles.navLink}>
                        The Science
                    </Link>
                </nav>

                <div className={styles.topbarRight}>
                    <Link href="/goal-intake-ai" className={styles.newStoryBtn}>
                        <PlusIcon />
                        New story
                    </Link>

                    <div className={styles.avatarWrapper} ref={dropdownRef}>
                        <button
                            className={styles.avatarBtn}
                            onClick={toggleDropdown}
                            aria-label="Account menu"
                        >
                            JD
                        </button>

                        <div className={`${styles.avatarDropdown} ${dropdownOpen ? styles.open : ''}`}>
                            <div className={styles.ddUser}>
                                <div className={styles.ddName}>Jane Doe</div>
                                <div className={styles.ddEmail}>jane.doe@example.com</div>
                            </div>

                            <div
                                className={styles.ddItem}
                                onClick={() => alert('Account settings — coming soon')}
                            >
                                <UserIcon />
                                Account settings
                            </div>

                            <div className={styles.ddSep} />

                            <div
                                className={styles.ddItem}
                                onClick={() => router.push('/login')}
                                style={{ color: 'var(--red)' }}
                            >
                                <LogoutIcon />
                                Sign out
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className={styles.page}>
                {/* GREETING */}
                <div className={styles.greeting}>
                    <div className={styles.greetingEyebrow}>Good morning</div>
                    <h1 className={styles.greetingTitle}>
                        Welcome back, <em>Jane.</em>
                    </h1>
                    <p className={styles.greetingSub}>
                        Your story is waiting. Take a few minutes to listen — your future self is already living this.
                    </p>
                </div>

                {/* METRICS */}
                <div className={styles.metricsRow}>
                    <MetricCard
                        icon={<StarIcon />}
                        value="2"
                        label="Stories created"
                    />
                    <MetricCard
                        icon={<TrendIcon />}
                        value="14"
                        label="Day streak"
                        delta="Personal best 🎉"
                    />
                    <MetricCard
                        icon={<ClockIcon />}
                        value="47"
                        label="Times played"
                        delta="↑ 8 this week"
                    />
                    <MetricCard
                        icon={<DownloadIcon />}
                        value="6"
                        label="MP3 downloads"
                    />
                </div>

                {/* STREAK CARD */}
                <div className={styles.streakCard}>
                    <div className={styles.streakLeft}>
                        <div className={styles.streakEyebrow}>Your listening streak</div>
                        <div className={styles.streakCount}>
                            14 <span>days in a row</span>
                        </div>
                        <div className={styles.streakSub}>
                            Keep it going — your brain is rewiring with every listen.<br />
                            Listen today to protect your streak.
                        </div>
                    </div>
                    <div className={styles.streakDots} aria-label="Last 7 days">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={`${styles.streakDot} ${styles.done}`}>
                                <CheckIcon />
                            </div>
                        ))}
                        <div className={`${styles.streakDot} ${styles.today}`}>
                            Now
                        </div>
                    </div>
                </div>

                {/* INLINE AUDIO PLAYER */}
                {audioPanelOpen && activeStory && (
                    <div className={`${styles.audioPanel} ${styles.open}`}>
                        <div className={styles.audioTop}>
                            <div className={styles.audioTopInfo}>
                                <div className={styles.audioPlayingLabel}>Now playing</div>
                                <div className={styles.audioTitle}>{activeStory.title}</div>
                            </div>
                            <button
                                className={styles.audioClose}
                                onClick={handleClosePlayer}
                                aria-label="Close player"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className={styles.audioControls}>
                            <div className={styles.progressRow}>
                                <span>{formatTime(currentTime)}</span>
                                <div
                                    className={styles.progressTrack}
                                    onClick={(e) => seekAudio(e, e.currentTarget)}
                                >
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${progressPercentage}%` }}
                                    />
                                </div>
                                <span>{formatTime(totalDuration)}</span>
                            </div>

                            <div className={styles.playerBtns}>
                                <button
                                    className={styles.playerBtn}
                                    onClick={() => skipTime(-15)}
                                    title="Back 15s"
                                >
                                    <SkipBackIcon />
                                </button>

                                <button
                                    className={styles.playerPlay}
                                    onClick={togglePlay}
                                    aria-label="Play/pause"
                                >
                                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                </button>

                                <button
                                    className={styles.playerBtn}
                                    onClick={() => skipTime(15)}
                                    title="Forward 15s"
                                >
                                    <SkipForwardIcon />
                                </button>

                                <div className={styles.playerRight}>
                                    <button
                                        className={`${styles.playerLoop} ${isLooping ? styles.on : ''}`}
                                        onClick={toggleLoop}
                                        title="Loop recording"
                                    >
                                        <LoopIcon />
                                        <span>{isLooping ? 'Looping' : 'Loop'}</span>
                                    </button>

                                    <button
                                        className={styles.playerDl}
                                        onClick={() => handleDownload(activeStory)}
                                    >
                                        <DownloadIcon />
                                        Download MP3
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STORY LIBRARY */}
                <div className={styles.sectionHeader}>
                    <div>
                        <div className={styles.sectionTitle}>My Story Library</div>
                        <div className={styles.sectionSub}>2 of 5 story slots used</div>
                    </div>
                </div>

                <div className={styles.storyGrid}>
                    {stories.map(story => (
                        <StoryCard
                            key={story.id}
                            story={story}
                            isActive={activeStory?.id === story.id}
                            onPlay={handlePlayStory}
                            onDownload={handleDownload}
                            onRead={handleRead}
                        />
                    ))}

                    {/* Empty slot for new story */}
                    <Link href="/goal-intake-ai" className={styles.storySlot}>
                        <div className={styles.storySlotIcon}>
                            <PlusIcon />
                        </div>
                        <div className={styles.storySlotTitle}>Create a new story</div>
                        <div className={styles.storySlotSub}>
                            Go deeper on health, relationships, abundance...
                        </div>
                        <div className={styles.storySlotCount}>3 of 5 slots remaining</div>
                    </Link>
                </div>

                {/* RECENT ACTIVITY */}
                <div className={styles.sectionHeader}>
                    <div>
                        <div className={styles.sectionTitle}>Recent Activity</div>
                    </div>
                </div>

                <div className={styles.activityCard}>
                    {activities.map(activity => (
                        <ActivityRow key={activity.id} activity={activity} />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;