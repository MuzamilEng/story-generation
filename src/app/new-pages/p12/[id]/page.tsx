'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import styles from '../../../styles/StoryDetail.module.css';
import {
    PlusIcon,
    ArrowLeftIcon,
    ClockIcon,
    FileIcon,
    StarIcon,
    DownloadIcon,
    EditIcon,
    CloseIcon,
    RefreshIcon,
    InfoIcon,
    PlayIcon,
    PauseIcon,
    SkipBackIcon,
    SkipForwardIcon,
    LoopIcon
} from '../../../components/icons/StoryDetailIcons';
import { Story, StoryVersion, AudioPlayerState } from '../../../types/story-detail';

// Top Bar Component
interface TopBarProps {
    onNewStory: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onNewStory }) => (
    <header className={styles.topbar}>
        <Link href="/" className={styles.logo}>
            Manifest<span>MyStory</span>
        </Link>

        <nav className={styles.topbarNav}>
            <Link href="/dashboard" className={`${styles.navLink} ${styles.active}`}>
                My Stories
            </Link>
            <Link href="/account-settings" className={styles.navLink}>
                Settings
            </Link>
        </nav>

        <div className={styles.topbarRight}>
            <button className={styles.newStoryBtn} onClick={onNewStory}>
                <PlusIcon />
                New Story
            </button>
            <button className={styles.avatarBtn}>MZ</button>
        </div>
    </header>
);

// Story Header Component
interface StoryHeaderProps {
    story: Story;
    isEditing: boolean;
    onEditToggle: () => void;
    onRegenToggle: () => void;
    onPlayToggle: () => void;
    onDownload: () => void;
    isPlaying: boolean;
    onTitleChange: (title: string) => void;
}

const StoryHeader: React.FC<StoryHeaderProps> = ({
    story,
    isEditing,
    onEditToggle,
    onRegenToggle,
    onPlayToggle,
    onDownload,
    isPlaying,
    onTitleChange
}) => {
    const [titleInput, setTitleInput] = useState(story.title);

    useEffect(() => {
        setTitleInput(story.title);
    }, [story.title]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitleInput(e.target.value);
    };

    const handleTitleBlur = () => {
        onTitleChange(titleInput);
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins} min ${secs} sec audio`;
    };

    return (
        <div className={styles.storyHeader}>
            <div className={styles.shEyebrow}>
                Story 1 · Created {format(story.createdAt, 'MMMM d, yyyy')}
            </div>

            {!isEditing ? (
                <div className={styles.shTitle} id="storyTitle">
                    {story.title}
                </div>
            ) : (
                <input
                    className={styles.shTitleInput}
                    value={titleInput}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    placeholder="Story title..."
                    autoFocus
                />
            )}

            <div className={styles.shMeta}>
                <div className={styles.shMetaPill}>
                    <ClockIcon />
                    {formatDuration(story.audioDuration)}
                </div>
                <div className={styles.shMetaPill}>
                    <FileIcon />
                    <span id="storyWordCount">{story.wordCount.toLocaleString()} words</span>
                </div>
                <div className={styles.shMetaPill}>
                    <StarIcon />
                    {story.plays} plays
                </div>
                <div className={styles.shMetaPill}>
                    <DownloadIcon />
                    {story.downloads} downloads
                </div>
            </div>

            <div className={styles.shActions}>
                <button className={`${styles.shBtn} ${styles.play}`} onClick={onPlayToggle}>
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    <span>{isPlaying ? 'Pause' : 'Play Audio'}</span>
                </button>

                <button className={`${styles.shBtn} ${styles.download}`} onClick={onDownload}>
                    <DownloadIcon />
                    Download MP3
                </button>

                <button
                    className={`${styles.shBtn} ${styles.edit}`}
                    onClick={onEditToggle}
                >
                    {isEditing ? <CloseIcon /> : <EditIcon />}
                    {isEditing ? 'Stop Editing' : 'Edit Story'}
                </button>

                <button
                    className={`${styles.shBtn} ${styles.regen}`}
                    onClick={onRegenToggle}
                >
                    <RefreshIcon />
                    Regenerate
                </button>
            </div>
        </div>
    );
};

// Edit Toolbar Component
interface EditToolbarProps {
    onCancel: () => void;
    onSave: () => void;
}

const EditToolbar: React.FC<EditToolbarProps> = ({ onCancel, onSave }) => (
    <div className={`${styles.editToolbar} ${styles.visible}`}>
        <div className={styles.editNote}>
            <InfoIcon />
            Editing story text. Your audio will not change until you regenerate.
        </div>
        <div className={styles.editToolbarBtns}>
            <button className={`${styles.toolbarBtn} ${styles.cancel}`} onClick={onCancel}>
                Discard Changes
            </button>
            <button className={`${styles.toolbarBtn} ${styles.save}`} onClick={onSave}>
                Save Changes
            </button>
        </div>
    </div>
);

// Regenerate Panel Component
interface RegenPanelProps {
    isVisible: boolean;
    onClose: () => void;
    onRegenerate: (prompt: string) => void;
}

const RegenPanel: React.FC<RegenPanelProps> = ({ isVisible, onClose, onRegenerate }) => {
    const [prompt, setPrompt] = useState('');

    const handleRegenerate = () => {
        if (!prompt.trim()) return;
        onRegenerate(prompt);
        setPrompt('');
        onClose();
    };

    if (!isVisible) return null;

    return (
        <div className={`${styles.regenCard} ${styles.visible}`}>
            <div className={styles.regenTitle}>
                <RefreshIcon />
                Regenerate this story
            </div>
            <div className={styles.regenSub}>
                Tell us what to change and we'll rewrite your story with the same goals in mind. Your current version will be saved to history so you can always go back.
            </div>
            <textarea
                className={styles.regenTextarea}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Make it more emotionally vivid. Focus more on my family life. Add a morning exercise scene..."
            />
            <div className={styles.regenActions}>
                <button className={`${styles.regenBtn} ${styles.go}`} onClick={handleRegenerate}>
                    Regenerate Story
                </button>
                <button className={`${styles.regenBtn} ${styles.closeRegen}`} onClick={onClose}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

// Story Body Component
interface StoryBodyProps {
    content: string;
    wordCount: number;
    isEditing: boolean;
    onContentChange: (content: string) => void;
}

const StoryBody: React.FC<StoryBodyProps> = ({
    content,
    wordCount,
    isEditing,
    onContentChange
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            textareaRef.current.focus();
        }
    }, [isEditing, content]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onContentChange(e.target.value);
    };

    return (
        <div className={styles.storyBodyCard}>
            <div className={styles.storyBodyHead}>
                <div className={styles.storyBodyLabel}>Story Text</div>
                <div className={styles.wordCount}>{wordCount.toLocaleString()} words</div>
            </div>

            {/* Read Mode */}
            {!isEditing && (
                <div className={styles.storyText} id="storyText">
                    {content}
                </div>
            )}

            {/* Edit Mode */}
            {isEditing && (
                <textarea
                    ref={textareaRef}
                    className={styles.storyTextarea}
                    value={content}
                    onChange={handleContentChange}
                />
            )}
        </div>
    );
};

// Version History Component
interface VersionHistoryProps {
    versions: StoryVersion[];
    onRestore: (versionId: string) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, onRestore }) => (
    <div className={styles.historyCard}>
        <div className={styles.historyHead}>
            <div className={styles.historyLabel}>Version History</div>
        </div>

        {versions.map((version) => (
            <div key={version.id} className={styles.historyRow}>
                <div className={styles.historyLeft}>
                    <div className={`${styles.historyDot} ${version.isCurrent ? styles.current : styles.old}`} />
                    <div>
                        <div className={styles.historyVersion}>
                            Version {version.version} — {version.label}
                        </div>
                        <div className={styles.historyDate}>
                            {format(version.date, 'MMMM d, yyyy')} · {version.wordCount.toLocaleString()} words
                        </div>
                    </div>
                </div>
                <div className={styles.historyRight}>
                    {version.isCurrent ? (
                        <span className={styles.historyBadge}>Current</span>
                    ) : (
                        <button
                            className={styles.historyRestore}
                            onClick={() => onRestore(version.id)}
                        >
                            Restore
                        </button>
                    )}
                </div>
            </div>
        ))}
    </div>
);

// Audio Player Component
interface AudioPlayerProps {
    story: Story;
    isPlaying: boolean;
    isLooping: boolean;
    currentTime: number;
    onPlayToggle: () => void;
    onLoopToggle: () => void;
    onSkip: (seconds: number) => void;
    onSeek: (percentage: number) => void;
    onDownload: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
    story,
    isPlaying,
    isLooping,
    currentTime,
    onPlayToggle,
    onLoopToggle,
    onSkip,
    onSeek,
    onDownload
}) => {
    const duration = story.audioDuration;
    const progressPercentage = (currentTime / duration) * 100;

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const track = e.currentTarget;
        const rect = track.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onSeek(pct);
    };

    return (
        <div className={styles.audioCard}>
            <div className={styles.audioHead}>
                <div>
                    <div className={styles.audioHeadLabel}>Audio File · MP3 · 9.2 MB</div>
                    <div className={styles.audioHeadTitle}>{story.title}</div>
                </div>
                <button className={styles.audioDlBtn} onClick={onDownload}>
                    <DownloadIcon />
                    Download MP3
                </button>
            </div>

            <div className={styles.audioControls}>
                <div className={styles.progressRow}>
                    <span className={styles.timeLabel}>{formatTime(currentTime)}</span>
                    <div className={styles.progressTrack} onClick={handleSeek}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                    <span className={`${styles.timeLabel} ${styles.right}`}>
                        {formatTime(duration)}
                    </span>
                </div>

                <div className={styles.controlsRow}>
                    <button className={styles.ctrlBtn} onClick={() => onSkip(-15)} title="Back 15s">
                        <SkipBackIcon />
                    </button>

                    <button
                        className={`${styles.ctrlBtn} ${styles.playPause}`}
                        onClick={onPlayToggle}
                    >
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>

                    <button className={styles.ctrlBtn} onClick={() => onSkip(15)} title="Forward 15s">
                        <SkipForwardIcon />
                    </button>

                    <button
                        className={`${styles.ctrlBtn} ${styles.loopBtn} ${isLooping ? styles.on : ''}`}
                        onClick={onLoopToggle}
                        title="Loop"
                    >
                        <LoopIcon />
                    </button>
                </div>
            </div>

            <div className={styles.audioNote}>
                Audio file is saved to your account. <Link href="#">Re-generate audio</Link> if you've updated your story text.
            </div>
        </div>
    );
};

// Toast Component
interface ToastProps {
    message: string;
    visible: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, visible }) => (
    <div className={`${styles.toast} ${visible ? styles.show : ''}`}>
        {message}
    </div>
);

// Main Component
const StoryDetail: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const id = params?.id;

    const [story, setStory] = useState<Story>({
        id: '1',
        title: 'A Day in the Life of My Highest Self',
        createdAt: new Date(2026, 0, 12),
        wordCount: 847,
        audioDuration: 402, // 6:42 in seconds
        plays: 34,
        downloads: 6,
        content: `Morning light filters through the curtains of my home in the hills. I stretch without an alarm — my body knows when it's ready. The day ahead is full, but it's mine completely.

I walk barefoot to the kitchen. The coffee is already made — I set it the night before, a small ritual that tells me tomorrow is worth preparing for. I stand at the window and look out at the garden. The roses are in bloom. I planted them two years ago, during the season when everything felt uncertain, and now they bloom every spring without asking permission.

My phone is face-down on the counter. It will stay that way until I've had an hour to myself.

By eight, I'm at my desk. Not the desk I used to have — the one wedged against a closet wall, where I hunched over spreadsheets I didn't believe in. This desk faces a window. There are books on either side of me. A candle. A glass of water. The work I do now is work that came from me, shaped by me, and every morning I am a little amazed that this is real.

The emails can wait. I read for twenty minutes first. This is non-negotiable.

At ten I take a call with a collaborator in Madrid. We are building something together that neither of us could build alone. After the call I sit for a moment in the quiet and feel the particular satisfaction of people who know their purpose and are living it.

Lunch is unhurried. I eat outside. The neighbor's dog wanders over, as it always does, and I scratch behind his ears and think about nothing in particular.

In the afternoon, I do the creative work — the kind that requires full presence, the kind I used to save for weekends and then never actually do. Now it is simply part of Tuesday. I lose track of time. When I look up, two hours have passed and I feel accomplished in a way that is different from busy. This is the feeling I once chased everywhere and could never quite catch.

By five, I am done. I close the laptop with intention. I do not check it again.

My partner and I cook dinner together. We talk about small things — something funny that happened, something we're curious about, a plan we're quietly excited for. The kitchen smells like garlic and something roasting. This is, I think, what abundance actually looks like: not the number in an account, but the quality of a Tuesday.

Later, I read again before bed. The book is good. I fall asleep before the chapter ends.

Tomorrow I will do this again. And the day after. Not because I have to. Because I built a life I actually want to live inside of — and every morning I wake up and it is still here.`,
        audioUrl: '#'
    });

    const [versions, setVersions] = useState<StoryVersion[]>([
        {
            id: 'v3',
            version: 3,
            label: 'Current',
            date: new Date(2026, 2, 7),
            wordCount: 847,
            isCurrent: true
        },
        {
            id: 'v2',
            version: 2,
            label: 'Regenerated',
            date: new Date(2026, 1, 14),
            wordCount: 792
        },
        {
            id: 'v1',
            version: 1,
            label: 'Original',
            date: new Date(2026, 0, 12),
            wordCount: 761
        }
    ]);

    const [isEditing, setIsEditing] = useState(false);
    const [showRegen, setShowRegen] = useState(false);
    const [toast, setToast] = useState({ message: '', visible: false });
    const [editedContent, setEditedContent] = useState(story.content);
    const [editedTitle, setEditedTitle] = useState(story.title);

    // Audio player state
    const [audioState, setAudioState] = useState<AudioPlayerState>({
        isPlaying: false,
        isLooping: false,
        currentTime: 138, // 2:18
        duration: story.audioDuration
    });

    useEffect(() => {
        document.title = `ManifestMyStory — ${story.title}`;

        // Add font if it doesn't exist
        if (!document.getElementById('dm-fonts')) {
            const link = document.createElement('link');
            link.id = 'dm-fonts';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap';
            document.head.appendChild(link);
        }
    }, [story.title]);

    const originalContentRef = useRef(story.content);
    const originalTitleRef = useRef(story.title);

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3200);
    };

    const handleEditToggle = () => {
        if (!isEditing) {
            // Enter edit mode
            originalContentRef.current = story.content;
            originalTitleRef.current = story.title;
            setEditedContent(story.content);
            setEditedTitle(story.title);
        }
        setIsEditing(!isEditing);
    };

    const handleSaveEdit = () => {
        setStory(prev => ({
            ...prev,
            title: editedTitle,
            content: editedContent,
            wordCount: editedContent.trim().split(/\s+/).filter(w => w.length > 0).length
        }));
        setIsEditing(false);
        showToast('✓ Story saved — your audio file is unchanged');
    };

    const handleCancelEdit = () => {
        setEditedContent(originalContentRef.current);
        setEditedTitle(originalTitleRef.current);
        setIsEditing(false);
    };

    const handleContentChange = (content: string) => {
        setEditedContent(content);
        const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
        setStory(prev => ({ ...prev, wordCount }));
    };

    const handleTitleChange = (title: string) => {
        setEditedTitle(title);
    };

    const handleRegenToggle = () => {
        setShowRegen(!showRegen);
    };

    const handleRegenerate = (prompt: string) => {
        showToast('✨ Regenerating your story...');
        // TODO: Call API with prompt
    };

    const handlePlayToggle = () => {
        setAudioState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    };

    const handleLoopToggle = () => {
        setAudioState(prev => ({ ...prev, isLooping: !prev.isLooping }));
        showToast(audioState.isLooping ? 'Loop off' : '🔁 Looping on');
    };

    const handleSkip = (seconds: number) => {
        setAudioState(prev => ({
            ...prev,
            currentTime: Math.max(0, Math.min(prev.duration, prev.currentTime + seconds))
        }));
    };

    const handleSeek = (percentage: number) => {
        setAudioState(prev => ({
            ...prev,
            currentTime: percentage * prev.duration
        }));
    };

    const handleDownload = () => {
        // TODO: Replace with actual signed URL
        showToast('📥 Download will work once audio URL is wired by developer');
    };

    const handleRestoreVersion = (versionId: string) => {
        showToast(`Version ${versionId} restored`);
        // TODO: Load version content
    };

    const handleNewStory = () => {
        router.push('/user/goal-intake-ai');
    };

    return (
        <>
            <div className={styles.container}>
                <TopBar onNewStory={handleNewStory} />

                <main className={styles.page}>
                    {/* Back Link */}
                    <Link href="/dashboard" className={styles.backLink}>
                        <ArrowLeftIcon />
                        Back to My Stories
                    </Link>

                    {/* Story Header */}
                    <StoryHeader
                        story={story}
                        isEditing={isEditing}
                        onEditToggle={handleEditToggle}
                        onRegenToggle={handleRegenToggle}
                        onPlayToggle={handlePlayToggle}
                        onDownload={handleDownload}
                        isPlaying={audioState.isPlaying}
                        onTitleChange={handleTitleChange}
                    />

                    {/* Edit Toolbar */}
                    {isEditing && (
                        <EditToolbar
                            onCancel={handleCancelEdit}
                            onSave={handleSaveEdit}
                        />
                    )}

                    {/* Regenerate Panel */}
                    <RegenPanel
                        isVisible={showRegen}
                        onClose={handleRegenToggle}
                        onRegenerate={handleRegenerate}
                    />

                    {/* Story Body */}
                    <StoryBody
                        content={isEditing ? editedContent : story.content}
                        wordCount={story.wordCount}
                        isEditing={isEditing}
                        onContentChange={handleContentChange}
                    />

                    {/* Version History */}
                    <VersionHistory
                        versions={versions}
                        onRestore={handleRestoreVersion}
                    />

                    {/* Audio Player */}
                    <AudioPlayer
                        story={story}
                        isPlaying={audioState.isPlaying}
                        isLooping={audioState.isLooping}
                        currentTime={audioState.currentTime}
                        onPlayToggle={handlePlayToggle}
                        onLoopToggle={handleLoopToggle}
                        onSkip={handleSkip}
                        onSeek={handleSeek}
                        onDownload={handleDownload}
                    />
                </main>

                <Toast message={toast.message} visible={toast.visible} />
            </div>
        </>
    );
};

export default StoryDetail;