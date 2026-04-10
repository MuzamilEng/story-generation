"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import styles from "../../../styles/Dashboard.module.css";
import Header from "../../../components/Header";
import { useStoryStore } from "@/store/useStoryStore";
import { useGlobalUI } from "@/components/ui/global-ui-context";

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
  status: "draft" | "approved" | "audio_ready";
  story_text_approved?: string;
  story_text_draft?: string;
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
}

const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onPlay,
  onDownload,
  onRead,
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
    if (story.status === "approved" || !story.audio_url)
      return "Awaiting Voice";
    return "Draft";
  };

  return (
    <div className={styles.storyCard} onClick={() => onPlay(story)}>
      <div className={styles.storyCardTop}>
        {isDraft && <div className={styles.draftBadge}>{getDraftReason()}</div>}
        <div className={styles.storyCardEyebrow}>
          Created{" "}
          {story.createdAt instanceof Date && !isNaN(story.createdAt.getTime())
            ? format(story.createdAt, "MMM d, yyyy")
            : "Recently"}
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
                Resume Generation
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
  const { showToast } = useGlobalUI();
  const { data: session, update } = useSession();
  const { clearStore } = useStoryStore();

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

  const { data: stories = [], isLoading: isLoadingStories } = useQuery<Story[]>(
    {
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
        }));
      },
      enabled: !!session,
    },
  );

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/user/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!session,
  });

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
    } else if (story.status === "approved" && !story.audio_url) {
      router.push(`/user/voice-recording?storyId=${story.id}`);
    } else {
      router.push(`/user/story-detail/${story.id}`);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.page}>
        {/* GREETING */}
        <div className={styles.greeting}>
          <div className={styles.greetingEyebrow}>Good morning</div>
          <h1 className={styles.greetingTitle}>
            Welcome back, <em>{firstName}.</em>
            {stats?.isBetaUser && (
              <span
                className={styles.betaBadge}
                style={{
                  fontSize: "14px",
                  backgroundColor: "var(--accent)",
                  color: "var(--surface-dark, #fff)",
                  padding: "4px 12px",
                  borderRadius: "99px",
                  marginLeft: "12px",
                  fontWeight: "600",
                  verticalAlign: "middle",
                  display: "inline-block",
                }}
              >
                Beta Access
              </span>
            )}
          </h1>
          <p className={styles.greetingSub}>
            Your story is waiting. Take a few minutes to listen — your future
            self is already living this.
          </p>
        </div>

        {/* METRICS */}
        <div className={styles.metricsRow}>
          <MetricCard
            icon={<StarIcon />}
            value={stats?.metrics?.stories_ever || "0"}
            label="Stories created"
          />
          <MetricCard
            icon={<TrendIcon />}
            value={stats?.metrics?.streak_days || "0"}
            label="Day streak"
            delta={
              stats?.metrics?.streak_days > 0
                ? "Keep it up! 🔥"
                : "Start today! ✨"
            }
          />
          <MetricCard
            icon={<ClockIcon />}
            value={stats?.metrics?.total_plays || "0"}
            label="Times played"
          />
          <MetricCard
            icon={<DownloadIcon />}
            value={stats?.metrics?.total_downloads || "0"}
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
              Keep it going — your brain is rewiring with every listen.
              <br />
              Listen today to protect your streak.
            </div>
          </div>
          <div className={styles.streakDots} aria-label="Last 7 days">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`${styles.streakDot} ${styles.done}`}>
                <CheckIcon />
              </div>
            ))}
            <div className={`${styles.streakDot} ${styles.today}`}>Now</div>
          </div>
        </div>

        {/* STORY LIBRARY */}
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>My Story Library</div>
            <div className={styles.sectionSub}>
              Recent captures and sessions
            </div>
          </div>
          {stories.length > 10 && (
            <Link href="/user/stories" className={styles.viewAllLink}>
              View All Stories
              <ArrowIcon />
            </Link>
          )}
        </div>

        <div className={styles.storyGrid}>
          {isLoadingStories ? (
            <div style={{ opacity: 0.7, padding: "2rem" }}>
              Loading your stories...
            </div>
          ) : (
            stories
              .slice(0, 10)
              .map((story: Story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onPlay={handlePlayStory}
                  onDownload={handleDownload}
                  onRead={handleRead}
                />
              ))
          )}

          {/* Empty slot for new story */}
          <div
            className={styles.storySlot}
            onClick={() => {
              clearStore();
              router.push("/user/goal-intake-ai");
            }}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.storySlotIcon}>
              <PlusIcon />
            </div>
            <div className={styles.storySlotTitle}>Create a new story</div>
            <div className={styles.storySlotSub}>
              Go deeper on health, relationships, abundance...
            </div>
            <div className={styles.storySlotCount}>
              {stats?.limits
                ? `${stats.limits.total - stats.limits.used} of ${stats.limits.total} slots remaining`
                : "Loading..."}
            </div>
          </div>
        </div>

        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Recent Activity</div>
          </div>
        </div>

        <div className={styles.activityCard}>
          {activities.length > 0 ? (
            activities.map((activity: any) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))
          ) : (
            <div className={styles.emptyActivity}>
              <div className={styles.emptyActivityIcon}>
                <ClockIcon />
              </div>
              <div className={styles.emptyActivityText}>
                No recent activity yet. Start with a new story session.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
