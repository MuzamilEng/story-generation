'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    LoopIcon,
    TrashIcon
} from '../../../components/icons/StoryDetailIcons';
import { Story, StoryVersion, AudioPlayerState } from '../../../types/story-detail';

// Top Bar Component
interface TopBarProps {
    onNewStory: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onNewStory }) => (
    <header className={styles.topbar}>
        <Link href="/user/dashboard" className={styles.logo}>
            Manifest<span>MyStory</span>
        </Link>

        <nav className={styles.topbarNav}>
            <Link href="/user/dashboard" className={`${styles.navLink} ${styles.active}`}>
                My Stories
            </Link>
            <Link href="/user/account-setting" className={styles.navLink}>
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
    onDelete: () => void;
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
    onDelete,
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
                Story 1 · Created {story.createdAt instanceof Date && !isNaN(story.createdAt.getTime()) ? format(story.createdAt, 'MMMM d, yyyy') : 'Recently'}
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

                <button
                    className={`${styles.shBtn} ${styles.delete}`}
                    onClick={onDelete}
                    title="Delete story"
                >
                    <TrashIcon />
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
                            {version.date instanceof Date && !isNaN(version.date.getTime()) ? format(version.date, 'MMMM d, yyyy') : 'Date unknown'} · {version.wordCount.toLocaleString()} words
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
    const id = params?.id as string;

    const [editedContent, setEditedContent] = useState('');
    const [editedTitle, setEditedTitle] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showRegen, setShowRegen] = useState(false);
    const [toast, setToast] = useState({ message: '', visible: false });

    // Audio player state
    const [audioState, setAudioState] = useState<AudioPlayerState>({
        isPlaying: false,
        isLooping: false,
        currentTime: 0,
        duration: 0
    });

    const queryClient = useQueryClient();

    const { data: storyData, isLoading, error: queryError } = useQuery({
        queryKey: ['story', id],
        queryFn: async () => {
            const res = await fetch(`/api/user/stories/${id}`);
            if (!res.ok) throw new Error('Failed to fetch story');
            return res.json();
        },
        enabled: !!id,
    });

    const updateStoryMutation = useMutation({
        mutationFn: async (updatedData: { title?: string; content?: string }) => {
            const res = await fetch(`/api/user/stories/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!res.ok) throw new Error('Failed to update story');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['story', id] });
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            showToast('✓ Story saved successfully');
            setIsEditing(false);
        },
        onError: () => {
            showToast('❌ Failed to save changes');
        },
    });

    const deleteStoryMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/user/stories/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete story');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            router.push('/user/dashboard');
        },
        onError: () => {
            showToast('❌ Failed to delete story');
        },
    });

    const error = queryError ? (queryError as Error).message : null;

    const story = React.useMemo(() => {
        if (!storyData) return null;
        return {
            id: storyData.id,
            title: storyData.title || 'My Manifestation Story',
            createdAt: new Date(storyData.createdAt),
            wordCount: storyData.word_count || 0,
            audioDuration: storyData.audio_duration_seconds || 402,
            plays: 0,
            downloads: 0,
            content: storyData.story_text_approved || storyData.story_text_draft || '',
            audioUrl: storyData.audio_url || '#'
        };
    }, [storyData]);

    const versions = React.useMemo(() => {
        if (!storyData?.versions || !Array.isArray(storyData.versions)) return [];
        return storyData.versions.map((v: any, idx: number) => ({
            id: v.id,
            version: v.version,
            label: idx === 0 ? 'Current' : 'Previous',
            date: new Date(v.createdAt),
            wordCount: v.word_count || 0,
            isCurrent: idx === 0
        }));
    }, [storyData]);

    useEffect(() => {
        if (story) {
            setEditedContent(story.content);
            setEditedTitle(story.title);
            setAudioState(prev => ({ ...prev, duration: story.audioDuration }));
            document.title = `ManifestMyStory — ${story.title}`;
        }
    }, [story]);

    useEffect(() => {
        if (!document.getElementById('dm-fonts')) {
            const link = document.createElement('link');
            link.id = 'dm-fonts';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap';
            document.head.appendChild(link);
        }
    }, []);

    const originalContentRef = useRef('');
    const originalTitleRef = useRef('');

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3200);
    };

    const handleEditToggle = () => {
        if (!story) return;
        if (!isEditing) {
            // Enter edit mode
            originalContentRef.current = story.content;
            originalTitleRef.current = story.title;
            setEditedContent(story.content);
            setEditedTitle(story.title);
        }
        setIsEditing(!isEditing);
    };

    const handleSaveEdit = async () => {
        if (!story) return;
        updateStoryMutation.mutate({
            title: editedTitle,
            content: editedContent
        });
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
            deleteStoryMutation.mutate();
        }
    };

    const handleCancelEdit = () => {
        setEditedContent(originalContentRef.current);
        setEditedTitle(originalTitleRef.current);
        setIsEditing(false);
    };

    const handleContentChange = (content: string) => {
        setEditedContent(content);
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
        if (!story?.audioUrl || story.audioUrl === '#') {
            showToast('📥 Audio not generated yet');
            return;
        }
        window.open(story.audioUrl, '_blank');
    };

    const handleRestoreVersion = (versionId: string) => {
        showToast(`Version ${versionId} restored`);
        // TODO: Load version content
    };

    const handleNewStory = () => {
        router.push('/user/goal-intake-ai');
    };

    if (isLoading) return <div className={styles.container}><TopBar onNewStory={handleNewStory} /><div className={styles.page}>Loading story...</div></div>;
    if (error || !story) return <div className={styles.container}><TopBar onNewStory={handleNewStory} /><div className={styles.page}>Error: {error || 'Story not found'}</div></div>;

    return (
        <>
            <div className={styles.container}>
                <TopBar onNewStory={handleNewStory} />

                <main className={styles.page}>
                    {/* Back Link */}
                    <Link href="/user/dashboard" className={styles.backLink}>
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
                        onDelete={handleDelete}
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
                    {versions.length > 0 && (
                        <VersionHistory
                            versions={versions}
                            onRestore={handleRestoreVersion}
                        />
                    )}

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