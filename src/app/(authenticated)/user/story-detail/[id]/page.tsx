"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import styles from "../../../../styles/StoryDetail.module.css";
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
  TrashIcon,
  MusicIcon,
} from "../../../../components/icons/StoryDetailIcons";
import {
  Story,
  StoryVersion,
  AudioPlayerState,
} from "../../../../types/story-detail";
import { useGlobalUI } from "@/components/ui/global-ui-context";

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
  onTitleChange,
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
        Story 1 · Created{" "}
        {story.createdAt instanceof Date && !isNaN(story.createdAt.getTime())
          ? format(story.createdAt, "MMMM d, yyyy")
          : "Recently"}
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
          <span id="storyWordCount">
            {story.wordCount.toLocaleString()} words
          </span>
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
        <button
          className={`${styles.shBtn} ${styles.play}`}
          onClick={onPlayToggle}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
          <span>{isPlaying ? "Pause" : "Play Audio"}</span>
        </button>

        <button
          className={`${styles.shBtn} ${styles.download}`}
          onClick={onDownload}
        >
          <DownloadIcon />
          Download MP3
        </button>

        <button
          className={`${styles.shBtn} ${styles.edit}`}
          onClick={onEditToggle}
        >
          {isEditing ? <CloseIcon /> : <EditIcon />}
          {isEditing ? "Stop Editing" : "Edit Story"}
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
      <button
        className={`${styles.toolbarBtn} ${styles.cancel}`}
        onClick={onCancel}
      >
        Discard Changes
      </button>
      <button
        className={`${styles.toolbarBtn} ${styles.save}`}
        onClick={onSave}
      >
        Save Changes
      </button>
    </div>
  </div>
);

// Regenerate Panel Component
interface RegenPanelProps {
  isVisible: boolean;
  isLoading: boolean;
  activeStep: number | null;
  onClose: () => void;
  onRegenerate: (prompt: string) => void;
}

const RegenPanel: React.FC<RegenPanelProps> = ({
  isVisible,
  isLoading,
  activeStep,
  onClose,
  onRegenerate,
}) => {
  const [prompt, setPrompt] = useState("");

  const handleRegenerate = () => {
    if (!prompt.trim() || isLoading) return;
    onRegenerate(prompt);
  };

  useEffect(() => {
    if (!isLoading && !isVisible) {
      setPrompt("");
    }
  }, [isLoading, isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`${styles.regenCard} ${styles.visible}`}>
      <div className={styles.regenTitle}>
        <RefreshIcon />
        Regenerate this story
      </div>
      <div className={styles.regenSub}>
        Tell us what to change and we'll rewrite your story with the same goals
        in mind. Your current version will be saved to history so you can always
        go back.
      </div>
      {!isLoading && (
        <textarea
          className={styles.regenTextarea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Make it more emotionally vivid. Focus more on my family life. Add a morning exercise scene..."
        />
      )}
      {isLoading && (
        <div className={styles.genSteps}>
          <div className={`${styles.genStep} ${activeStep === 1 ? styles.active : activeStep && activeStep > 1 ? styles.done : ""}`}>
            <div className={styles.genStepIcon}>
              {activeStep === 1 ? <div className={styles.spinnerSmall} /> : activeStep && activeStep > 1 ? <RefreshIcon /> : null}
            </div>
            Rewriting your future manifestation story...
          </div>
          <div className={`${styles.genStep} ${activeStep === 2 ? styles.active : ""}`}>
            <div className={styles.genStepIcon}>
              {activeStep === 2 ? <div className={styles.spinnerSmall} /> : null}
            </div>
            Redirecting to affirmations selection...
          </div>
        </div>
      )}

      <div className={styles.regenActions}>
        <button
          className={`${styles.regenBtn} ${styles.go}`}
          onClick={handleRegenerate}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? "Regenerating..." : "Regenerate Story"}
        </button>
        {!isLoading && (
          <button
            className={`${styles.regenBtn} ${styles.closeRegen}`}
            onClick={onClose}
          >
            Cancel
          </button>
        )}
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
  onContentChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
    }
  }, [isEditing, content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(e.target.value);
  };

  return (
    <div className={`${styles.storyBodyCard} ${isEditing ? styles.editing : ""}`}>
      <div className={styles.storyBodyHead}>
        <div className={styles.storyBodyLabel}>Story Text</div>
        <div className={styles.wordCount}>
          {wordCount.toLocaleString()} words
        </div>
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

const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  onRestore,
}) => (
  <div className={styles.historyCard}>
    <div className={styles.historyHead}>
      <div className={styles.historyLabel}>Version History</div>
    </div>

    {versions.map((version) => (
      <div key={version.id} className={styles.historyRow}>
        <div className={styles.historyLeft}>
          <div
            className={`${styles.historyDot} ${version.isCurrent ? styles.current : styles.old}`}
          />
          <div>
            <div className={styles.historyVersion}>
              Version {version.version} — {version.label}
            </div>
            <div className={styles.historyDate}>
              {version.date instanceof Date && !isNaN(version.date.getTime())
                ? format(version.date, "MMMM d, yyyy")
                : "Date unknown"}{" "}
              · {version.wordCount.toLocaleString()} words
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


// Toast Component
interface ToastProps {
  message: string;
  visible: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, visible }) => (
  <div className={`${styles.toast} ${visible ? styles.show : ""}`}>
    {message}
  </div>
);

// Main Component
const StoryDetail: React.FC = () => {
  const router = useRouter();
  const { showConfirm } = useGlobalUI();
  const params = useParams();
  const id = params?.id as string;

  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [activeRegenStep, setActiveRegenStep] = useState<number | null>(null);
  const [toast, setToast] = useState({ message: "", visible: false });


  const queryClient = useQueryClient();

  const {
    data: storyData,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["story", id],
    queryFn: async () => {
      const res = await fetch(`/api/user/stories/${id}`);
      if (!res.ok) throw new Error("Failed to fetch story");
      return res.json();
    },
    enabled: !!id,
  });

  const updateStoryMutation = useMutation({
    mutationFn: async (updatedData: { title?: string; content?: string }) => {
      const res = await fetch(`/api/user/stories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error("Failed to update story");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story", id] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      showToast("✓ Story saved successfully");
      setIsEditing(false);
    },
    onError: () => {
      showToast("❌ Failed to save changes");
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/user/stories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete story");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      router.push("/user/dashboard");
    },
    onError: () => {
      showToast("❌ Failed to delete story");
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (instruction: string) => {
      setActiveRegenStep(1);
      const res = await fetch(`/api/user/stories/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      if (!res.ok) throw new Error("Failed to regenerate story");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story", id] });
      setActiveRegenStep(2);
      showToast("✨ Story rewritten! Redirecting to affirmations...");
      // Give the user a moment to see the step, then redirect to affirmations
      setTimeout(() => {
        router.push(`/user/affirmations?storyId=${id}`);
      }, 1200);
    },
    onError: () => {
      showToast("❌ Failed to rewrite story");
      setActiveRegenStep(null);
    },
  });

  const generateAffirmationsMutation = useMutation({
    mutationFn: async () => {
      setActiveRegenStep(2);
      const res = await fetch(`/api/user/affirmations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: id, action: "generate" }),
      });
      if (!res.ok) throw new Error("Failed to generate affirmations");
      return res.json();
    },
    onSuccess: (data) => {
      saveAffirmationsMutation.mutate(data.affirmations);
    },
    onError: () => {
      showToast("❌ Failed to generate affirmations");
      assembleAudioMutation.mutate(); // Fallback: try audio anyway
    },
  });

  const saveAffirmationsMutation = useMutation({
    mutationFn: async (affirmations: { opening: string[]; closing: string[] }) => {
      const res = await fetch(`/api/user/affirmations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: id, ...affirmations }),
      });
      if (!res.ok) throw new Error("Failed to save affirmations");
      return res.json();
    },
    onSuccess: () => {
      cloneVoiceMutation.mutate();
    },
    onError: () => {
      cloneVoiceMutation.mutate(); // Fallback
    },
  });

  const cloneVoiceMutation = useMutation({
    mutationFn: async () => {
      setActiveRegenStep(3);
      const res = await fetch(`/api/user/audio/clone-voice`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to refresh voice clone");
      return res.json();
    },
    onSuccess: () => {
      assembleAudioMutation.mutate();
    },
    onError: () => {
      assembleAudioMutation.mutate(); // Fallback
    },
  });

  const assembleAudioMutation = useMutation({
    mutationFn: async () => {
      setActiveRegenStep(4);
      const res = await fetch(`/api/user/audio/assemble`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: id }),
      });
      if (!res.ok) throw new Error("Failed to generate audio");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story", id] });
      showToast("🎵 New audio version is ready!");
      setShowRegen(false);
      setActiveRegenStep(null);
    },
    onError: () => {
      showToast("❌ Audio generation failed");
      setActiveRegenStep(null);
    },
  });

  const error = queryError ? (queryError as Error).message : null;

  const story = React.useMemo(() => {
    if (!storyData) return null;
    return {
      id: storyData.id,
      title: storyData.title || "My Manifestation Story",
      createdAt: new Date(storyData.createdAt),
      wordCount: storyData.word_count || 0,
      audioDuration: storyData.audio_duration_secs || 0,
      plays: 0,
      downloads: 0,
      content:
        storyData.story_text_approved || storyData.story_text_draft || "",
      audioUrl: storyData.audio_url || "#",
      voiceOnlyUrl: storyData.voice_only_url,
    };
  }, [storyData]);

  const versions = React.useMemo(() => {
    if (!storyData?.versions || !Array.isArray(storyData.versions)) return [];
    return storyData.versions.map((v: any, idx: number) => ({
      id: v.id,
      version: v.version,
      label: idx === 0 ? "Current" : "Previous",
      date: new Date(v.createdAt),
      wordCount: v.word_count || 0,
      isCurrent: idx === 0,
    }));
  }, [storyData]);

  useEffect(() => {
    if (story) {
      setEditedContent(story.content);
      setEditedTitle(story.title);
      document.title = `ManifestMyStory — ${story.title}`;
    }
  }, [story]);

  useEffect(() => {
    if (!document.getElementById("dm-fonts")) {
      const link = document.createElement("link");
      link.id = "dm-fonts";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const originalContentRef = useRef("");
  const originalTitleRef = useRef("");

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3200);
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
      content: editedContent,
    });
  };

  const handleDelete = () => {
    showConfirm({
      title: "Delete Story",
      message: "Are you sure you want to delete this story? This action cannot be undone.",
      confirmText: "Delete",
      danger: true,
      onConfirm: () => {
        deleteStoryMutation.mutate();
      },
    });
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

  const recordEvent = async (
    storyId: string,
    eventType: "play" | "download",
    duration?: number,
  ) => {
    try {
      await fetch("/api/user/events/record", {
        method: "POST",
        body: JSON.stringify({ storyId, eventType, duration }),
      });
    } catch (e) {
      console.error("Failed to record event:", e);
    }
  };

  const handleRegenerate = (prompt: string) => {
    regenerateMutation.mutate(prompt);
  };

  const handlePlayToggle = () => {
    if (!story?.audioUrl || story.audioUrl === "#") {
      showToast("📥 Audio not generated yet");
      return;
    }

    router.push(`/user/audio-download?storyId=${story.id}&autoplay=true`);
  };


  const handleDownload = () => {
    if (!story?.audioUrl || story.audioUrl === "#") {
      showToast("📥 Audio not generated yet");
      return;
    }

    // Record download event
    recordEvent(story.id, "download");

    // Trigger real download via our stream API with download=true
    const downloadUrl = `${story.audioUrl}${story.audioUrl.includes("?") ? "&" : "?"}download=true`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.click();
  };

  const handleRestoreVersion = (versionId: string) => {
    showToast(`Version ${versionId} restored`);
    // TODO: Load version content
  };

  if (isLoading)
    return (
      <div className={styles.container}>
        <div className={styles.page}>Loading story...</div>
      </div>
    );
  if (error || !story)
    return (
      <div className={styles.container}>
        <div className={styles.page}>Error: {error || "Story not found"}</div>
      </div>
    );

  return (
    <>
      <div className={styles.container}>
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
            isPlaying={false}
            onTitleChange={handleTitleChange}
          />

          {/* Edit Toolbar */}
          {isEditing && (
            <EditToolbar onCancel={handleCancelEdit} onSave={handleSaveEdit} />
          )}

          {/* Regenerate Panel */}
          <RegenPanel
            isVisible={showRegen}
            isLoading={regenerateMutation.isPending || activeRegenStep === 2}
            activeStep={activeRegenStep}
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
        </main>

        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </>
  );
};

export default StoryDetail;
