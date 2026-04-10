"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import styles from "../../../styles/Stories.module.css";

// Icons
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

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const SkipBackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-3.58" />
  </svg>
);

const SkipForwardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-.49-3.58" />
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

interface Story {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  duration: string;
  audio_duration_secs?: number;
  word_count?: number;
  plays: number;
  downloads: number;
  audio_url?: string;
  soundscape_audio_key?: string;
  binaural_audio_key?: string;
  story_text_approved?: string;
  story_text_draft?: string;
  status: "draft" | "approved" | "audio_ready";
}

const StoryCard = ({
  story,
  onPlay,
  onDownload,
  onRead,
}: {
  story: Story;
  onPlay: (s: Story) => void;
  onDownload: (s: Story) => void;
  onRead: (s: Story) => void;
}) => {
  const isDraft = story.status !== "audio_ready" || !story.audio_url;

  const getDraftReason = () => {
    if (story.status === "draft") return "In Progress";
    if (story.status === "approved" || !story.audio_url)
      return "Awaiting Voice";
    return "Draft";
  };

  const getExcerpt = () => {
    if (story.excerpt) return story.excerpt;
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

  return (
    <div className={styles.storyCard} onClick={() => onPlay(story)}>
      <div className={styles.storyCardTop}>
        {isDraft && <div className={styles.draftBadge}>{getDraftReason()}</div>}
        <div className={styles.storyCardEyebrow}>
          Created{" "}
          {story.createdAt
            ? format(new Date(story.createdAt), "MMM d, yyyy")
            : "Recently"}
        </div>
        <div className={styles.storyCardTitle}>{story.title}</div>
        <div className={styles.storyCardMeta}>
          <div className={styles.storyMetaPill}>
            <ClockIcon /> {story.duration || "—"}
          </div>
          {!isDraft && (
            <div className={styles.storyMetaPill}>
              <PlayIcon /> {story.plays || 0} plays
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
                <RefreshIcon /> Resume Generation
              </>
            ) : (
              <>
                <PlayIcon /> Play
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
              </button>
              <button
                className={styles.storyBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onRead(story);
                }}
              >
                <EyeIcon /> Read
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function StoriesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ["stories"],
    queryFn: async () => {
      const res = await fetch("/api/user/stories");
      if (!res.ok) throw new Error("Failed to fetch stories");
      const data = await res.json();
      return data.map((s: any) => ({
        ...s,
        duration: s.audio_duration_secs
          ? `${Math.floor(s.audio_duration_secs / 60)} min ${s.audio_duration_secs % 60} sec`
          : s.word_count
            ? `~${Math.ceil(s.word_count / 150)} min read`
            : "\u2014",
        plays: s.play_count || 0,
        downloads: s.download_count || 0,
      }));
    },
  });

  const filteredStories = stories.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handlePlayStory = (story: Story) => {
    const isDraft = story.status === "draft" || !story.audio_url;

    if (isDraft) {
      if (story.status === "draft") {
        router.push(`/user/story?id=${story.id}`);
      } else {
        router.push(`/user/voice-recording?storyId=${story.id}`);
      }
      return;
    }

    router.push(`/user/audio-download?storyId=${story.id}&autoplay=true`);
  };

  const handleDownload = (story: Story) => {
    if (!story.audio_url) return;
    const downloadUrl = `${story.audio_url}${story.audio_url.includes("?") ? "&" : "?"}download=true`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.click();
  };

  const handleRead = (story: Story) => {
    router.push(`/user/story-detail/${story.id}`);
  };

  return (
    <div className={styles.container}>
      <main className={styles.page}>
        <div className={styles.header}>
          <Link href="/user/dashboard" className={styles.backBtn}>
            <ArrowLeftIcon /> Back to Dashboard
          </Link>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>
              <span>Your Library</span>
              My Manifestation Stories
            </h1>
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search stories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.storyGrid}>
          {isLoading ? (
            <div style={{ padding: "4rem", textAlign: "center", opacity: 0.6 }}>
              Loading stories...
            </div>
          ) : filteredStories.length > 0 ? (
            filteredStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onPlay={handlePlayStory}
                onDownload={handleDownload}
                onRead={handleRead}
              />
            ))
          ) : (
            <div
              style={{
                padding: "4rem",
                gridColumn: "1/-1",
                textAlign: "center",
                opacity: 0.6,
              }}
            >
              {searchTerm
                ? "No stories match your search."
                : "You haven't created any stories yet."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
