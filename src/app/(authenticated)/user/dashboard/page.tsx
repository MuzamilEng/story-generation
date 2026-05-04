"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import styles from "../../../styles/Dashboard.module.css";
import Header from "../../../components/Header";
import { useStoryStore } from "@/store/useStoryStore";
import { useGlobalUI } from "@/components/ui/global-ui-context";
import { notifyAudioReady } from "@/lib/browser-notifications";

// Icon Components
// ... (removing redundant icons if used only in old header)

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
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
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
    <text x="8" y="14" fontSize="5" fill="currentColor" stroke="none">
      15
    </text>
  </svg>
);

const SkipForwardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-.49-3.58" />
    <text x="8" y="14" fontSize="5" fill="currentColor" stroke="none">
      15
    </text>
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

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const MusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const VolumeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

// Types
interface Story {
  id: string;
  title: string;
  excerpt: string;
  createdAt: Date;
  duration: string;
  plays: number;
  downloads: number;
  audio_url?: string;
  voice_only_url?: string;
  status: "draft" | "approved" | "awaited_voice_generation" | "audio_ready";
  story_text_approved?: string;
  story_text_draft?: string;
  story_type: "night" | "morning";
  story_number: number;
  queueState?: "queued" | "processing" | "completed" | "failed" | null;
}

interface Activity {
  id: number;
  type: "play" | "create" | "download";
  storyId: string;
  storyTitle: string;
  timestamp: Date;
}

interface MetricCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  delta?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  value,
  label,
  delta,
}) => (
  <div className={styles.metricCard}>
    <div className={styles.metricIcon}>{icon}</div>
    <div className={styles.metricValue}>{value}</div>
    <div className={styles.metricLabel}>{label}</div>
    {delta && <div className={styles.metricDelta}>{delta}</div>}
  </div>
);

interface StoryCardProps {
  story: Story;
  onPlay: (story: Story) => void;
  onDownload: (story: Story) => void;
  onRead: (story: Story) => void;
  onEnhance: (story: Story) => void;
}

const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onPlay,
  onDownload,
  onRead,
  onEnhance,
}) => {
  // A story is a draft if it's not explicitly 'audio_ready'
  const isDraft = story.status !== "audio_ready" || !story.audio_url;

  const getExcerpt = () => {
    if (story.excerpt && story.excerpt.includes("...")) {
      // This was a fallback excerpt, let's try better one below
    } else if (story.excerpt) {
      return story.excerpt;
    }

    const text = story.story_text_approved || story.story_text_draft;
    if (!text)
      return isDraft
        ? "Finish generating your manifestation story to listen and download."
        : "No excerpt available.";

    // Split by lines, take first three non-empty ones
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    return lines.slice(0, 3).join("\n");
  };

  const getDraftReason = () => {
    if (story.status === "draft") return "In Progress";
    if (story.status === "awaited_voice_generation") {
      if (story.queueState === "queued") return "Queued";
      if (story.queueState === "processing") return "Processing";
      return "Awaiting Voice Generation";
    }
    if (story.status === "approved" || !story.audio_url) {
      if (story.queueState === "queued") return "Queued";
      if (story.queueState === "processing") return "Processing";
      return "Awaiting Voice";
    }
    return "Draft";
  };

  return (
    <div className={styles.storyCard} onClick={() => onPlay(story)}>
      <div className={styles.storyCardTop}>
        {isDraft && <div className={styles.draftBadge}>{getDraftReason()}</div>}
        <div className={styles.storyCardEyebrow}>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span
              style={{
                width: "14px",
                height: "14px",
                display: "inline-flex",
                color: story.story_type === "morning" ? "#e8a838" : "#8b9dc3",
              }}
            >
              {story.story_type === "morning" ? <SunIcon /> : <MoonIcon />}
            </span>
            Generated{" "}
            {story.createdAt instanceof Date &&
            !isNaN(story.createdAt.getTime())
              ? format(story.createdAt, "MMM d, yyyy")
              : "Recently"}
          </span>
        </div>
        <div className={styles.storyCardTitle}>{story.title}</div>
        <div className={styles.storyCardMeta}>
          <div className={styles.storyMetaPill}>
            <ClockIcon />
            {story.duration || "—"}
          </div>
          {!isDraft && (
            <div className={styles.storyMetaPill}>
              <PlayIcon />
              {story.plays} plays
            </div>
          )}
        </div>
      </div>
      <div className={styles.storyCardBody}>
        <div
          className={styles.storyExcerpt}
          style={{
            whiteSpace: "pre-line",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {getExcerpt()}
        </div>
        <div className={styles.storyActions}>
          <button
            className={`${styles.storyBtn} ${styles.primary} ${isDraft ? styles.fullWidth : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(story);
            }}
          >
            {isDraft ? (
              <>
                <RefreshIcon />
                {story.queueState === "queued"
                  ? "Queued — View Status"
                  : story.queueState === "processing"
                    ? "Processing — View Status"
                    : story.status === "awaited_voice_generation"
                      ? "Awaiting Voice — View Status"
                      : "Resume Generation"}
              </>
            ) : (
              <>
                <PlayIcon />
                Play
              </>
            )}
          </button>
          {!isDraft && (
            <>
              <button
                className={styles.storyBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(story);
                }}
              >
                <DownloadIcon />
                Download
              </button>
              <button
                className={styles.storyBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onEnhance(story);
                }}
                title="Add background music & binaural beats to your story"
              >
                <MusicIcon />
                Enhance
              </button>
              <div className={styles.storyBtnSpacer} />
              <button
                className={styles.storyBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onRead(story);
                }}
              >
                <EyeIcon />
                Read
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface ActivityRowProps {
  activity: Activity;
}

const ActivityRow: React.FC<ActivityRowProps> = ({ activity }) => {
  const getIcon = () => {
    switch (activity.type) {
      case "play":
        return <PlayIcon />;
      case "download":
        return <DownloadIcon />;
      case "create":
        return <StarIcon />;
    }
  };

  const getText = () => {
    switch (activity.type) {
      case "play":
        return (
          <>
            Listened to <strong>{activity.storyTitle}</strong>
          </>
        );
      case "download":
        return (
          <>
            Downloaded MP3 — <strong>{activity.storyTitle}</strong>
          </>
        );
      case "create":
        return (
          <>
            Created story — <strong>{activity.storyTitle}</strong>
          </>
        );
    }
  };

  return (
    <div className={styles.activityRow}>
      <div className={`${styles.activityDot} ${styles[activity.type]}`}>
        {getIcon()}
      </div>
      <div className={styles.activityText}>{getText()}</div>
      <div className={styles.activityTime}>
        {activity.timestamp instanceof Date &&
        !isNaN(activity.timestamp.getTime())
          ? formatDistanceToNow(activity.timestamp, { addSuffix: true })
          : "Recently"}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { showAlert, showToast, showConfirm } = useGlobalUI();
  const { data: session, update } = useSession();
  const { clearStore } = useStoryStore();

  const handleNewStory = async () => {
    clearStore();
    localStorage.removeItem("mms_chat_session");
    sessionStorage.removeItem("capturedGoals");
    sessionStorage.removeItem("storyLength");

    try {
      await fetch("/api/user/intake-snapshot", { method: "DELETE" });
    } catch (error) {
      console.error("Failed to clear intake snapshot:", error);
    }

    router.push("/user/goal-intake-ai?fresh=1");
  };

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "user@example.com";
  const userInitials =
    userName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "U";
  const firstName = userName.split(" ")[0] || "User";
  const isBetaUser = Boolean(session?.user?.isBetaUser);
  const betaPlanName = session?.user?.plan
    ? `${session.user.plan.charAt(0).toUpperCase()}${session.user.plan.slice(1)} Beta`
    : "Beta Plan";

  useEffect(() => {
    document.title = "ManifestMyStory — My Dashboard";
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  const [queueStates, setQueueStates] = useState<
    Record<string, "queued" | "processing" | "completed" | "failed" | null>
  >({});
  const notifiedReadyStoriesRef = useRef<Set<string>>(new Set());

  const {
    data: storiesRaw = [],
    isLoading: isLoadingStories,
    refetch: refetchStories,
  } = useQuery<Story[]>({
    queryKey: ["stories"],
    queryFn: async () => {
      const res = await fetch("/api/user/stories");
      if (!res.ok) throw new Error("Failed to fetch stories");
      const data = await res.json();
      return data.map((s: any) => ({
        id: s.id,
        title: s.title || "My Manifestation Story",
        excerpt: s.excerpt || "",
        story_text_draft: s.story_text_draft,
        story_text_approved: s.story_text_approved,
        createdAt: new Date(s.createdAt),
        duration: s.audio_duration_secs
          ? `${Math.floor(s.audio_duration_secs / 60)} min ${s.audio_duration_secs % 60} sec`
          : s.word_count
            ? `~${Math.ceil(s.word_count / 150)} min read`
            : "—",
        plays: s.play_count || 0,
        downloads: s.download_count || 0,
        audio_url: s.audio_url,
        voice_only_url: s.voice_only_url,
        status: s.status,
        story_type: s.story_type || "night",
        story_number: s.story_number || 1,
      }));
    },
    enabled: !!session,
  });

  // For approved stories without audio, poll the assemble queue status
  // so we can show "Queued" / "Processing" instead of "Awaiting Voice".
  useEffect(() => {
    const pending = storiesRaw.filter(
      (s) =>
        (s.status === "approved" || s.status === "awaited_voice_generation") &&
        !s.audio_url,
    );
    if (pending.length === 0) return;

    let cancelled = false;

    const fetchStates = async () => {
      const results = await Promise.all(
        pending.map(async (s) => {
          try {
            const res = await fetch(
              `/api/user/audio/assemble?storyId=${encodeURIComponent(s.id)}`,
            );
            if (!res.ok) return { id: s.id, state: null };
            const data = await res.json();
            return { id: s.id, state: data.state ?? null };
          } catch {
            return { id: s.id, state: null };
          }
        }),
      );
      if (!cancelled) {
        setQueueStates((prev) => {
          const next = { ...prev };
          for (const { id, state } of results) next[id] = state;
          return next;
        });

        const completedStories = results.filter(
          ({ state }) => state === "completed",
        );
        if (completedStories.length > 0) {
          for (const { id } of completedStories) {
            if (notifiedReadyStoriesRef.current.has(id)) continue;
            notifiedReadyStoriesRef.current.add(id);
            const completedStory = pending.find((story) => story.id === id);
            showAlert({
              title: "Voice Generated",
              message: completedStory?.title
                ? `Your voice was successfully generated for \"${completedStory.title}\".`
                : "Your voice was successfully generated and your audio is ready.",
              buttonText: "Close",
            });
            notifyAudioReady(id, completedStory?.title || "Your story");
          }
          await refetchStories();
        }
      }
    };

    fetchStates();
    const timer = setInterval(fetchStates, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [storiesRaw, refetchStories, showAlert]);

  // Merge queue states into story objects
  const stories = storiesRaw.map((s) => ({
    ...s,
    queueState: queueStates[s.id] ?? null,
  }));

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/user/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!session,
  });

  // Fetch saved voice samples for "My Voice" section
  const { data: savedVoices = [] } = useQuery<
    {
      id: string;
      label: string;
      duration_s: number | null;
      is_default: boolean;
      created_at: string;
      sample_url: string;
    }[]
  >({
    queryKey: ["saved-voices"],
    queryFn: async () => {
      const res = await fetch("/api/user/audio/save-voice");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.voices) ? data.voices : [];
    },
    enabled: !!session,
  });

  // Voice playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();

  const handleSelectVoice = async (voiceId: string) => {
    // Optimistic update
    queryClient.setQueryData<typeof savedVoices>(["saved-voices"], (old) =>
      (old || []).map((v) => ({ ...v, is_default: v.id === voiceId })),
    );
    try {
      await fetch("/api/user/audio/save-voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: voiceId, setDefault: true }),
      });
    } catch (e) {
      console.error("Failed to set active voice:", e);
      queryClient.invalidateQueries({ queryKey: ["saved-voices"] });
    }
  };

  // Voice editing state
  const [editingVoiceId, setEditingVoiceId] = useState<string | null>(null);
  const [editVoiceLabel, setEditVoiceLabel] = useState("");

  // Morning story generation state
  const [isGeneratingMorning, setIsGeneratingMorning] = useState(false);

  const hasNightStory = stories.some(
    (s) => (s.story_type || "night") === "night",
  );
  const hasMorningStory = stories.some((s) => s.story_type === "morning");
  const showMorningPrompt =
    hasNightStory && !hasMorningStory && !isGeneratingMorning;

  const handleGenerateMorningStory = async () => {
    setIsGeneratingMorning(true);
    try {
      const res = await fetch("/api/user/stories/morning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to generate morning story", "error");
        setIsGeneratingMorning(false);
        return;
      }
      const data = await res.json();
      // Navigate to the morning story review page
      router.push(`/user/story?id=${data.storyId}`);
    } catch (err) {
      console.error("Morning story generation failed:", err);
      showToast("Failed to generate morning story. Please try again.", "error");
      setIsGeneratingMorning(false);
    }
  };

  const handleRenameVoice = async (id: string, newLabel: string) => {
    queryClient.setQueryData<typeof savedVoices>(["saved-voices"], (old) =>
      (old || []).map((v) => (v.id === id ? { ...v, label: newLabel } : v)),
    );
    setEditingVoiceId(null);
    try {
      await fetch("/api/user/audio/save-voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label: newLabel }),
      });
    } catch {
      queryClient.invalidateQueries({ queryKey: ["saved-voices"] });
      showToast("Failed to rename voice", "error");
    }
  };

  const handleDeleteVoice = (voiceId: string) => {
    showConfirm({
      title: "Remove Voice Sample",
      message: "Are you sure you want to remove this voice sample?",
      confirmText: "Remove",
      danger: true,
      onConfirm: async () => {
        queryClient.setQueryData<typeof savedVoices>(["saved-voices"], (old) =>
          (old || []).filter((v) => v.id !== voiceId),
        );
        try {
          await fetch("/api/user/audio/save-voice", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: voiceId }),
          });
        } catch {
          queryClient.invalidateQueries({ queryKey: ["saved-voices"] });
          showToast("Failed to remove voice", "error");
        }
      },
    });
  };

  const handlePlayVoice = (voice: { id: string; sample_url: string }) => {
    // If same voice is playing, pause it
    if (playingVoiceId === voice.id && voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }
    // Stop any currently playing voice
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
    }
    const audio = new Audio(voice.sample_url);
    audio.onended = () => setPlayingVoiceId(null);
    audio.onerror = () => {
      setPlayingVoiceId(null);
      showToast("Failed to play voice sample", "error");
    };
    audio.play();
    voiceAudioRef.current = audio;
    setPlayingVoiceId(voice.id);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current = null;
      }
    };
  }, []);

  // Automatic beta code redemption from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("betaCode");

    if (code && session?.user && !stats?.isBetaUser) {
      const redeem = async () => {
        try {
          const res = await fetch("/api/beta/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code.toUpperCase() }),
          });
          if (res.ok) {
            update(); // Refresh session
            // Clear the param from URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
          }
        } catch (e) {
          console.error("Auto-redemption failed:", e);
        }
      };
      redeem();
    }
  }, [session, stats, update]);

  const activities =
    stats?.activities?.map((a: any) => ({
      ...a,
      timestamp: new Date(a.timestamp),
    })) || [];

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

  const handlePlayStory = (story: Story) => {
    const isDraft = story.status !== "audio_ready" || !story.audio_url;

    if (isDraft) {
      if (story.status === "draft") {
        router.push(`/user/story?id=${story.id}`);
      } else if (
        story.status === "awaited_voice_generation" ||
        story.queueState === "queued" ||
        story.queueState === "processing"
      ) {
        // Audio is being assembled in the queue — send to the waiting/ready page
        router.push(`/user/audio-download?storyId=${story.id}`);
      } else {
        router.push(`/user/voice-recording?storyId=${story.id}`);
      }
      return;
    }

    // Redirect to download page and play
    router.push(`/user/audio-download?storyId=${story.id}&autoplay=true`);
  };

  const handleDownload = (story: Story) => {
    if (!story.audio_url) {
      showToast("Audio is not ready yet.", "error");
      return;
    }
    // Record the download event
    recordEvent(story.id, "download");

    // Trigger download via our stream API with download=true
    const downloadUrl = `${story.audio_url}${story.audio_url.includes("?") ? "&" : "?"}download=true`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    // The filename is handled by Content-Disposition header in the API
    link.click();
  };

  const handleRead = (story: Story) => {
    if (story.status === "draft") {
      router.push(`/user/story?id=${story.id}`);
    } else if (
      (story.status === "approved" ||
        story.status === "awaited_voice_generation") &&
      !story.audio_url
    ) {
      if (
        story.status === "awaited_voice_generation" ||
        story.queueState === "queued" ||
        story.queueState === "processing"
      ) {
        router.push(`/user/audio-download?storyId=${story.id}`);
      } else {
        router.push(`/user/voice-recording?storyId=${story.id}`);
      }
    } else {
      router.push(`/user/story-detail/${story.id}`);
    }
  };

  const handleEnhance = (story: Story) => {
    router.push(`/user/audio-download?storyId=${story.id}`);
  };

  // V13 Layout State
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const heroStory = stories.find(
    (s) => s.status === "audio_ready" && s.audio_url,
  );
  const libraryStories = stories.filter((s) => s !== heroStory);
  const voiceList = Array.isArray(savedVoices) ? savedVoices : [];
  const defaultVoice =
    voiceList.find((v) => v.is_default) || voiceList[0] || null;

  const handleRowClick = (storyId: string) => {
    setSelectedStoryId((prev) => (prev === storyId ? null : storyId));
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, storyId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick(storyId);
    }
  };

  const handleDeleteStory = (story: Story) => {
    showConfirm({
      title: "Delete Story",
      message: `Are you sure you want to delete "${story.title}"?`,
      confirmText: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          await fetch(`/api/user/stories/${story.id}`, { method: "DELETE" });
          queryClient.invalidateQueries({ queryKey: ["stories"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          showToast("Story deleted", "success");
        } catch {
          showToast("Failed to delete story", "error");
        }
      },
    });
  };

  return (
    <div className={styles.mmsWrap}>
      {/* TOP LINE */}
      <div className={styles.topline}>
        <div className={styles.toplineTitleWrap}>
          <p className={styles.toplineH1}>
            Welcome back, <em>{firstName}</em>.
          </p>
          {isBetaUser && (
            <span className={styles.betaPlanTag}>{betaPlanName}</span>
          )}
        </div>
        <div className={styles.topStats}>
          <span>
            <b>{stats?.metrics?.stories_ever || 0}</b> stories
          </span>
          <span>
            <b>{stats?.metrics?.total_plays || 0}</b> plays
          </span>
          <span>
            <b>{stats?.metrics?.total_downloads || 0}</b> downloads
          </span>
          <div className={styles.streakInline}>
            <div className={styles.streakDotsInline}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`${styles.dot} ${styles.dotDone}`} />
              ))}
              <div className={`${styles.dot} ${styles.dotNow}`} />
            </div>
            <span>{stats?.metrics?.streak_days || 0} day streak</span>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className={styles.toolbar}>
        {defaultVoice ? (
          <div className={styles.toolItem}>
            <div className={styles.voiceMini} />
            <span>
              Voice ·{" "}
              {defaultVoice.duration_s
                ? `${Math.floor(defaultVoice.duration_s / 60)}:${String(Math.round(defaultVoice.duration_s) % 60).padStart(2, "0")}`
                : "—"}
            </span>
            <button
              className={styles.toolLink}
              onClick={() => router.push("/user/voice-recording")}
            >
              Re-record
            </button>
          </div>
        ) : (
          <div className={styles.toolItem}>
            <button
              className={styles.toolLink}
              onClick={() => router.push("/user/voice-recording")}
            >
              + Record voice
            </button>
          </div>
        )}
        <div className={styles.toolSep} />
        <button
          className={styles.toolLink}
          onClick={() => {
            router.push("/user/goal-intake-ai?edit=1");
          }}
        >
          Edit intake ✎
        </button>
        <div className={styles.toolSep} />
        <span className={styles.reminderPill}>☀ 6:30 AM</span>
        <span className={styles.reminderPill}>☾ 10:00 PM</span>
        <div className={styles.toolSpacer} />
        <button className={styles.toolLink} onClick={handleNewStory}>
          + New story ·{" "}
          {stats?.limits
            ? `${stats.limits.total - stats.limits.used} left`
            : "..."}
        </button>
      </div>

      {/* HERO CARD — most recent audio-ready story */}
      {heroStory && (
        <div className={styles.hero}>
          <button
            className={styles.heroPlay}
            onClick={() => handlePlayStory(heroStory)}
            aria-label="Play story"
          >
            ▶
          </button>
          <div className={styles.heroInfo}>
            <div className={styles.heroKicker}>
              {heroStory.story_type === "morning" ? "☀" : "☾"} Today&rsquo;s
              story
            </div>
            <div className={styles.heroTitle}>{heroStory.title}</div>
            <div className={styles.heroMeta}>{heroStory.duration}</div>
          </div>
          <div className={styles.heroActions}>
            <button
              className={styles.mmsBtn}
              onClick={() => handleEnhance(heroStory)}
            >
              ♫ Enhance
            </button>
            <button
              className={styles.mmsBtn}
              onClick={() => handleDownload(heroStory)}
            >
              ↓ Download
            </button>
            <button
              className={styles.mmsBtn}
              onClick={() => handleRead(heroStory)}
            >
              👁 Read
            </button>
            <button
              className={`${styles.mmsBtn} ${styles.mmsBtnIconOnly}`}
              onClick={() => handleDeleteStory(heroStory)}
              aria-label="Delete story"
            >
              🗑
            </button>
          </div>
        </div>
      )}

      {/* MORNING STORY PROMPT */}
      {showMorningPrompt && (
        <div className={styles.morningPrompt}>
          <span className={styles.morningPromptIcon}>☀</span>
          <div className={styles.morningPromptText}>
            <strong>Start your mornings the same way</strong> — Generate your
            Morning Story from the same vision.
          </div>
          <button
            className={styles.mmsBtn}
            onClick={handleGenerateMorningStory}
            disabled={isGeneratingMorning}
          >
            {isGeneratingMorning ? "Generating..." : "Generate Morning Story →"}
          </button>
        </div>
      )}

      {/* GENERATING INDICATOR */}
      {isGeneratingMorning && (
        <div className={styles.generatingBar}>
          <div className={styles.spinner} />
          <span>Generating your Morning Story...</span>
        </div>
      )}

      {/* LIBRARY HEADER */}
      <div className={styles.libHeader}>
        <span className={styles.libTitle}>Library</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {hasNightStory && (
            <button
              className={styles.morningStoryBtn}
              onClick={handleGenerateMorningStory}
              disabled={isGeneratingMorning}
            >
              ☀ {isGeneratingMorning ? "Generating..." : "+ New Morning Story"}
            </button>
          )}
          <span className={styles.libHint}>Click a row to see options</span>
        </div>
      </div>

      {/* LIBRARY LIST */}
      <div className={styles.storyList}>
        {isLoadingStories ? (
          <div style={{ opacity: 0.7, padding: "1rem 0.75rem" }}>
            Loading your stories...
          </div>
        ) : libraryStories.length === 0 && !heroStory ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--ink-faint)",
              fontSize: "0.85rem",
            }}
          >
            No stories yet. Create your first story to get started.
          </div>
        ) : (
          libraryStories.map((story) => {
            const isDraft = story.status !== "audio_ready" || !story.audio_url;
            const isSelected = selectedStoryId === story.id;
            return (
              <div
                key={story.id}
                className={`${styles.storyRow} ${isSelected ? styles.storyRowSelected : ""} ${isDraft ? styles.storyRowProgress : ""}`}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  handleRowClick(story.id);
                }}
                onKeyDown={(e) => handleRowKeyDown(e, story.id)}
                aria-expanded={isSelected}
              >
                <button
                  className={styles.roundPlay}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayStory(story);
                  }}
                  aria-label={isDraft ? "Resume generation" : "Play story"}
                >
                  {isDraft ? "↻" : "▶"}
                </button>
                <div className={styles.storyMain}>
                  <div className={styles.storyRowTitle}>{story.title}</div>
                  {isDraft && (
                    <span className={styles.storyBadge}>
                      {story.status === "draft"
                        ? "In progress"
                        : story.status === "awaited_voice_generation"
                          ? story.queueState === "queued"
                            ? "Queued"
                            : story.queueState === "processing"
                              ? "Processing"
                              : "Awaiting voice generation"
                          : story.queueState === "queued"
                            ? "Queued"
                            : story.queueState === "processing"
                              ? "Processing"
                              : "Awaiting voice"}
                    </span>
                  )}
                  <div className={styles.storyRowDate}>
                    {story.createdAt instanceof Date &&
                    !isNaN(story.createdAt.getTime())
                      ? format(story.createdAt, "MMM d")
                      : "Recently"}
                  </div>
                </div>
                <div className={styles.storyRowActions}>
                  {isDraft ? (
                    <>
                      <button
                        className={styles.mmsBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayStory(story);
                        }}
                      >
                        {story.status === "draft"
                          ? "Resume generation"
                          : story.status === "awaited_voice_generation"
                            ? story.queueState === "queued"
                              ? "Queued — View status"
                              : story.queueState === "processing"
                                ? "Processing — View status"
                                : "Awaiting Voice — View status"
                            : story.queueState === "queued"
                              ? "Queued — View status"
                              : story.queueState === "processing"
                                ? "Processing — View status"
                                : "Resume generation"}
                      </button>
                      <button
                        className={`${styles.mmsBtn} ${styles.mmsBtnIconOnly}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStory(story);
                        }}
                        aria-label="Delete story"
                      >
                        🗑
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={styles.mmsBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnhance(story);
                        }}
                      >
                        ♫ Enhance
                      </button>
                      <button
                        className={styles.mmsBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(story);
                        }}
                      >
                        ↓ Download
                      </button>
                      <button
                        className={styles.mmsBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRead(story);
                        }}
                      >
                        👁 Read
                      </button>
                      <button
                        className={`${styles.mmsBtn} ${styles.mmsBtnIconOnly}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStory(story);
                        }}
                        aria-label="Delete story"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
                {!isSelected && (
                  <span className={styles.storyChevron} aria-hidden="true">
                    ›
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ACTIVITY FOOTER */}
      <div className={styles.activityFooter}>
        <span>
          {activities.length > 0 ? (
            <>
              Last activity · <b>{activities[0]?.storyTitle}</b> ·{" "}
              {activities[0]?.timestamp instanceof Date &&
              !isNaN(activities[0].timestamp.getTime())
                ? formatDistanceToNow(activities[0].timestamp, {
                    addSuffix: false,
                  })
                : "recently"}{" "}
              ago
            </>
          ) : (
            "No recent activity yet"
          )}
        </span>
        {activities.length > 0 && (
          <button
            className={styles.activityToggle}
            onClick={() => router.push("/user/stories")}
          >
            See all →
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
