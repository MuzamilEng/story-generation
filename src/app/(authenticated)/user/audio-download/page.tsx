"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../../../styles/AudioReady.module.css";
import { useStoryStore } from "@/store/useStoryStore";
import { useAudioPlayerStore } from "@/store/useAudioPlayerStore";
import { useGlobalUI } from "@/components/ui/global-ui-context";
import { notifyAudioReady } from "@/lib/browser-notifications";
import FeedbackPopup from "@/components/FeedbackPopup";

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
    <text x="8" y="16" fontSize="7" fill="currentColor" stroke="none">
      15
    </text>
  </svg>
);

const SkipForwardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-.49-4.95" />
    <text x="8" y="16" fontSize="7" fill="currentColor" stroke="none">
      15
    </text>
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
  status: "done" | "active" | "pending";
}

const StepItem: React.FC<StepItemProps> = ({ number, label, status }) => (
  <div className={`${styles.stepItem} ${styles[status]}`}>
    <div className={styles.stepNum}>
      {status === "done" ? <CheckIcon /> : number}
    </div>
    {label}
  </div>
);

const AudioReadyContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAlert, showToast, showConfirm } = useGlobalUI();
  const storyId = searchParams.get("storyId");

  const [story, setStory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [assembleStatus, setAssembleStatus] = useState<
    "queued" | "processing" | "failed" | "completed" | null
  >(null);
  const [assembleMessage, setAssembleMessage] = useState("");

  const hasReadyNotificationSent = useRef(false);

  const [isServerMixing, setIsServerMixing] = useState(false);
  const [mixingTrackId, setMixingTrackId] = useState<string | null>(null);
  const [availableSoundscapes, setAvailableSoundscapes] = useState<any[]>([]);
  const [selectedSoundscapeId, setSelectedSoundscapeId] = useState<
    string | null
  >(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  const { clearStore } = useStoryStore();
  const [showFeedback, setShowFeedback] = useState(false);

  // Global audio player store
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isBuffering,
    bufferedPct,
    setStory: setGlobalAudio,
    play: globalPlay,
    pause: globalPause,
    togglePlay: globalTogglePlay,
    seek: globalSeek,
    setVolume: globalSetVolume,
    setPendingAutoplay,
  } = useAudioPlayerStore();

  useEffect(() => {
    const checkFeedback = async () => {
      // Don't show if already dismissed in this session
      if (sessionStorage.getItem("feedback_dismissed")) return;

      try {
        const res = await fetch("/api/feedback");
        if (res.ok) {
          const { shouldShowSurvey } = await res.json();
          if (shouldShowSurvey) {
            // Show feedback after a short delay to let the page load
            setTimeout(() => {
              setShowFeedback(true);
            }, 3000);
          }
        }
      } catch (err) {
        console.error("Failed to check feedback status", err);
      }
    };
    if (story) {
      checkFeedback();
    }
  }, [story]);

  const handleFeedbackSubmit = async (responses: any) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });
      if (res.ok) {
        showToast("Thank you for your feedback!", "success");
        setShowFeedback(false);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to submit feedback", "error");
      }
    } catch (err) {
      console.error("Feedback submission failed", err);
      showToast("Failed to submit feedback", "error");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept Space when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        useAudioPlayerStore.getState().togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    document.title = "ManifestMyStory — Your Audio is Ready";
    // Reset the store as the process is successfully complete
    clearStore();

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
          hasReadyNotificationSent.current = !!data?.audio_url;
          if (data?.audio_url) {
            setGlobalAudio(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch story", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStory();
  }, [storyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!storyId || !story || story?.audio_url) return;

    let cancelled = false;
    let pollCount = 0;
    const MAX_POLLS = 90; // 90 × 4s = 6 min max polling window
    const POLL_INTERVAL = 4000;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 5;

    const poll = async () => {
      pollCount++;
      if (pollCount > MAX_POLLS) {
        setAssembleStatus("failed");
        setAssembleMessage(
          "Audio generation is taking longer than expected. Please go back and try again.",
        );
        showToast("Audio generation timed out. Please try again.", "error");
        return; // stop polling
      }

      try {
        const [statusRes, storyRes] = await Promise.all([
          fetch(
            `/api/user/audio/assemble?storyId=${encodeURIComponent(storyId)}`,
          ),
          fetch(`/api/user/stories/${storyId}`),
        ]);

        if (!cancelled && statusRes.ok) {
          const statusData = await statusRes.json();
          const nextState = (statusData?.state || "processing") as
            | "queued"
            | "processing"
            | "failed"
            | "completed";
          setAssembleStatus(nextState);
          setAssembleMessage(statusData?.message || "Preparing your audio...");

          consecutiveFailures = 0; // reset on success

          if (nextState === "failed") {
            showToast(
              "Audio generation failed. Please try generating again.",
              "error",
            );
            return; // stop polling on definitive failure
          }
        }

        if (!cancelled && storyRes.ok) {
          const storyData = await storyRes.json();
          if (storyData?.audio_url) {
            setStory(storyData);
            setGlobalAudio(storyData);
            setAssembleStatus("completed");
            setAssembleMessage("Your audio is ready.");
            if (!hasReadyNotificationSent.current) {
              hasReadyNotificationSent.current = true;
              showAlert({
                title: "Voice Generated",
                message:
                  "Your voice was successfully generated and your audio is ready.",
                buttonText: "Close",
              });
              notifyAudioReady(storyData.id, storyData.title || "Your story");
            }
            return; // stop polling
          }
        }
      } catch {
        consecutiveFailures++;
        if (!cancelled) {
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            setAssembleStatus("failed");
            setAssembleMessage(
              "Lost connection to the server. Please check your connection and try again.",
            );
            return; // stop polling
          }
          setAssembleStatus("processing");
          setAssembleMessage("Preparing your audio...");
        }
      }

      // Schedule next poll if not stopped
      if (!cancelled) {
        pollTimer = setTimeout(poll, POLL_INTERVAL);
      }
    };

    let pollTimer: ReturnType<typeof setTimeout>;
    poll();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [storyId, story, showAlert, showToast]);

  // Fetch available soundscapes for server-side mixing
  useEffect(() => {
    const fetchSoundscapes = async () => {
      try {
        const res = await fetch("/api/user/soundscapes");
        if (res.ok) {
          const data = await res.json();
          const assets = data.assets || [];
          setAvailableSoundscapes(assets);
          // If a soundscape was already mixed into this story, match it by r2_key
          if (story?.soundscape_audio_key && story?.combined_audio_key) {
            const matched = assets.find(
              (sc: any) => sc.r2_key === story.soundscape_audio_key,
            );
            if (matched) {
              setSelectedSoundscapeId(matched.id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch soundscapes", err);
      }
    };
    fetchSoundscapes();
  }, [story]);

  /** Server-side mix: sends voice + selected soundscape to the Express mixing server */
  const handleServerMix = async (soundscapeId: string) => {
    if (!story?.id || !soundscapeId) return;
    setIsServerMixing(true);
    setMixingTrackId(soundscapeId);
    // Stop current playback while mixing
    globalPause();

    const MAX_RETRIES = 2;
    let lastError =
      "Something went wrong while applying background music. Please try again.";

    try {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const res = await fetch("/api/user/audio/mix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storyId: story.id,
              soundscapeId,
            }),
          });
          let data;
          try {
            data = await res.json();
          } catch {
            showToast(
              "Something went wrong while applying background music. Please try again.",
              "error",
            );
            return;
          }
          if (!res.ok) {
            lastError = data.error || lastError;
            // Auto-retry if the server says the audio is still uploading
            if (data.retryable && attempt < MAX_RETRIES) {
              console.warn(
                `[mix] Attempt ${attempt + 1} failed: ${data.code}. Retrying...`,
              );
              await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
              continue;
            }
            showToast(lastError, "error");
            return;
          }
          // Update local story state with new audio URL
          const updatedStory = (prev: any) => ({
            ...prev,
            audio_url: data.audio_url,
            combined_audio_key: data.combined_audio_key,
            soundscape_audio_key:
              data.soundscape_audio_key ?? prev.soundscape_audio_key,
          });
          setStory((prev: any) => updatedStory(prev));
          setSelectedSoundscapeId(soundscapeId);
          // Register the new audio URL globally and request autoplay
          setPendingAutoplay(true);
          setGlobalAudio(updatedStory(story));
          setShowBgPicker(false);
          showToast("Background music applied ✓", "success");
          return; // Success — exit
        } catch (err) {
          console.error("Server mix failed:", err);
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
            continue;
          }
          showToast(lastError, "error");
        }
      }
    } finally {
      setIsServerMixing(false);
      setMixingTrackId(null);
    }
  };

  /** Revert to voice-only on server */
  const handleServerUnmix = async () => {
    if (!story?.id) return;
    setIsServerMixing(true);
    setMixingTrackId("unmix");
    // Stop current playback while unmixing
    globalPause();
    try {
      const res = await fetch("/api/user/audio/unmix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        showToast(
          "Something went wrong while removing background music. Please try again.",
          "error",
        );
        return;
      }
      if (!res.ok) {
        showToast(
          "Something went wrong while removing background music. Please try again.",
          "error",
        );
        return;
      }
      const updatedStory = {
        ...story,
        audio_url: data.audio_url,
        combined_audio_key: null,
      };
      setStory(updatedStory);
      setSelectedSoundscapeId(null);
      // Register the new audio URL globally and request autoplay
      setPendingAutoplay(true);
      setGlobalAudio(updatedStory);
      setShowBgPicker(false);
      showToast("Background music removed", "success");
    } catch (err) {
      console.error("Server unmix failed:", err);
      showToast(
        "Something went wrong while removing background music. Please try again.",
        "error",
      );
    } finally {
      setIsServerMixing(false);
      setMixingTrackId(null);
    }
  };

  /** Toggle preview playback for a soundscape track (capped at 45s) */
  const PREVIEW_MAX_SECS = 45;
  const togglePreview = (soundscape: any) => {
    if (!previewAudioRef.current) return;
    if (previewingId === soundscape.id) {
      // Stop preview
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setPreviewingId(null);
    } else {
      // Start preview of this track
      previewAudioRef.current.pause();
      previewAudioRef.current.src = soundscape.preview_url;
      previewAudioRef.current.volume = 0.5;
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.play().catch(() => {});
      setPreviewingId(soundscape.id);
    }
  };

  // Stop preview when it ends naturally or after 45s
  useEffect(() => {
    const el = previewAudioRef.current;
    if (!el) return;
    const onEnded = () => setPreviewingId(null);
    const onTimeUpdate = () => {
      if (el.currentTime >= PREVIEW_MAX_SECS) {
        el.pause();
        el.currentTime = 0;
        setPreviewingId(null);
      }
    };
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, []);

  // Stop preview when server mixing starts
  useEffect(() => {
    if (isServerMixing && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewingId(null);
    }
  }, [isServerMixing]);

  // Always use DB-stored duration as the authoritative source.
  const dbDuration = story?.audio_duration_secs ?? 0;
  const displayDuration =
    dbDuration > 0
      ? dbDuration
      : duration > 0 && isFinite(duration)
        ? duration
        : 0;

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const recordEvent = async (eventType: "play" | "download") => {
    if (!story?.id) return;
    try {
      await fetch("/api/user/events/record", {
        method: "POST",
        body: JSON.stringify({ storyId: story.id, eventType }),
      });
    } catch (e) {
      console.error("Failed to record event:", e);
    }
  };

  const togglePlay = () => {
    if (!isPlaying && currentTime < 1) recordEvent("play");
    globalTogglePlay();
  };

  // Handle autoplay from dashboard/stories
  useEffect(() => {
    const autoplay = searchParams.get("autoplay");
    if (autoplay === "true" && story?.audio_url && !isPlaying) {
      const timer = setTimeout(() => {
        globalPlay();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [story?.audio_url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced skip with burst accumulation
  const wasPlayingBeforeSkip = useRef(false);
  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSkipAmt = useRef(0);
  const pageSeekTarget = useRef<number | null>(null);

  const skip = (seconds: number) => {
    const total = displayDuration;
    if (!total || total <= 0) return;
    const s = useAudioPlayerStore.getState();

    if (skipTimer.current === null) {
      wasPlayingBeforeSkip.current = s.isPlaying;
      if (s.isPlaying) globalPause();
      pendingSkipAmt.current = 0;
    } else {
      clearTimeout(skipTimer.current);
    }

    pendingSkipAmt.current += seconds;
    const base =
      pageSeekTarget.current !== null ? pageSeekTarget.current : s.currentTime;
    const newTime = Math.max(0, Math.min(total, base + pendingSkipAmt.current));
    pageSeekTarget.current = newTime;
    // Update store UI immediately
    useAudioPlayerStore.setState({ currentTime: newTime, isBuffering: true });

    skipTimer.current = setTimeout(() => {
      skipTimer.current = null;
      pendingSkipAmt.current = 0;
      const t = pageSeekTarget.current!;
      pageSeekTarget.current = null;
      globalSeek(t, wasPlayingBeforeSkip.current);
    }, 300);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    globalSetVolume(parseInt(e.target.value));
  };

  const handleDownload = (type: "mixed" | "voice" = "mixed") => {
    if (!story?.audio_url) return;

    showConfirm({
      title: "Download Audio",
      message:
        type === "voice"
          ? "Downloading the clean voice version (no background sounds)."
          : "Downloading your story audio.",
      confirmText: "Download",
      onConfirm: () => {
        // Record download event
        recordEvent("download");

        // Determine which URL to use.
        // audio_url = fully assembled file (intro + affirmations + story + closing).
        // voice_only_url = legacy field; may predate intro assembly — only used
        //                  for the explicit "Clean Voice Only" button (type='voice').
        let targetUrl = story.audio_url;

        if (type === "voice" && story.voice_only_url) {
          targetUrl = story.voice_only_url;
        }
        // For type='mixed': always use audio_url which contains the full assembly.

        const downloadUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}download=true`;
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.click();

        setShowDownloadPrompt(true);
        setTimeout(() => {
          document
            .getElementById("postDownload")
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 500);
      },
    });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.genWrapper}>
          <div className={styles.genCard}>
            <div className={styles.genPulseRing}>
              <div className={styles.genWave}>
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className={styles.genTitle}>
              Preparing your <em>story</em>…
            </div>
          </div>
        </div>
      </div>
    );
  }
  //   comment
  if (!story) {
    return (
      <div className={styles.container}>
        <div style={{ padding: "100px", textAlign: "center" }}>
          Story not found.
        </div>
      </div>
    );
  }

  if (!story?.audio_url) {
    const isFailed = assembleStatus === "failed";
    const isQueued = assembleStatus === "queued";
    const isProcessing = !isFailed && !isQueued;

    // Step progress based on assembleStatus / assembleMessage
    const stepLabels = [
      "Queued & waiting",
      "Generating your voice",
      "Mixing with soundscape",
      "Finalizing audio",
    ];
    const activeIdx = isFailed
      ? -1
      : isQueued
        ? 0
        : assembleMessage?.toLowerCase().includes("mix")
          ? 2
          : assembleMessage?.toLowerCase().includes("final")
            ? 3
            : 1;

    return (
      <div className={styles.container}>
        <div
          className={`${styles.genWrapper} ${isFailed ? styles.genFailed : ""}`}
        >
          <div className={styles.genCard}>
            {/* Animated waveform with pulsing ring */}
            {!isFailed && (
              <div className={styles.genPulseRing}>
                <div className={styles.genWave}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {/* Failed icon */}
            {isFailed && (
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e5786d"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}

            <div className={styles.genTitle}>
              {isFailed ? (
                <>
                  Audio generation <em>failed</em>
                </>
              ) : isQueued ? (
                <>
                  Your story is <em>in the queue</em>
                </>
              ) : (
                <>
                  Crafting your <em>audio story</em>
                </>
              )}
            </div>

            <div className={styles.genStatusText}>
              {isFailed
                ? "Something went wrong. You can try generating again from your story page."
                : assembleMessage ||
                  "This can take a minute or two — we're turning your vision into sound."}
            </div>

            {/* Step indicators (not shown on failure) */}
            {!isFailed && (
              <div className={styles.genSteps}>
                {stepLabels.map((label, i) => {
                  const status =
                    i < activeIdx ? "done" : i === activeIdx ? "active" : "";
                  return (
                    <div
                      key={i}
                      className={`${styles.genStep} ${status ? styles[status] : ""}`}
                    >
                      <div className={styles.genStepIcon}>
                        {status === "done" ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : status === "active" ? (
                          <div className={styles.genDot} />
                        ) : null}
                      </div>
                      {label}
                    </div>
                  );
                })}
              </div>
            )}

            {isFailed && (
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <button
                  className={styles.genRetryBtn}
                  onClick={async () => {
                    setAssembleStatus("processing");
                    setAssembleMessage("Retrying audio generation...");
                    try {
                      const res = await fetch("/api/user/audio/assemble", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ storyId }),
                      });
                      if (res.ok) {
                        setAssembleMessage(
                          "Audio generation re-queued. Please wait...",
                        );
                        // Reset story to trigger polling
                        setStory((prev: any) =>
                          prev ? { ...prev, audio_url: null } : prev,
                        );
                      } else {
                        setAssembleStatus("failed");
                        setAssembleMessage(
                          "Retry failed. Please go back and try again.",
                        );
                      }
                    } catch {
                      setAssembleStatus("failed");
                      setAssembleMessage(
                        "Retry failed. Please check your connection.",
                      );
                    }
                  }}
                >
                  ↻ Retry Now
                </button>
                <button
                  className={styles.genRetryBtn}
                  onClick={() => router.back()}
                >
                  ← Go back & retry
                </button>
              </div>
            )}

            <button
              className={styles.genBackLink}
              onClick={() => router.push("/user/dashboard")}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Full-screen loader while server mix/unmix is in progress */}
      {isServerMixing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            zIndex: 9999,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 36,
              height: 36,
              border: "3px solid rgba(255,255,255,0.15)",
              borderTop: "3px solid var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span
            style={{
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.8)",
              fontFamily: "var(--sans)",
            }}
          >
            {mixingTrackId === "unmix"
              ? "Removing background music — please wait…"
              : "Applying your background music — please wait…"}
          </span>
        </div>
      )}

      <div className={styles.page}>
        {/* CELEBRATION */}
        <div className={styles.celebrateHeader}>
          <div className={styles.celebrateIcon}>
            <MicrophoneIcon />
          </div>
          <h1 className={styles.celebrateTitle}>
            Your audio story
            <br />
            <em>is ready.</em>
          </h1>
          <p className={styles.celebrateSub}>
            Your personal manifestation story — written from your vision, spoken
            in your voice. Listen every morning and night to begin rewiring your
            mind toward your future.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className={styles.dashboardBtn}
              onClick={() => router.push("/user/dashboard")}
              style={{
                padding: "0.6rem 1.5rem",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              style={{
                padding: "0.6rem 1.5rem",
                borderRadius: "8px",
                cursor: "pointer",
                background:
                  "linear-gradient(135deg, var(--green1), var(--green2))",
                border: "none",
                color: "var(--text)",
                fontFamily: "var(--sans)",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "1px",
                textTransform: "uppercase" as const,
              }}
            >
              Give Feedback
            </button>
          </div>
        </div>

        {/* PLAYER */}
        <div className={styles.playerCard}>
          <div className={styles.playerTop}>
            <div className={styles.playerEyebrow}>
              Your Personal Audio Story
            </div>
            <div className={styles.playerTitle}>
              {story?.title || "A Day in the Life of My Highest Self"}
            </div>
            <div className={styles.playerMeta}>
              Personalized Story Experience · {formatTime(displayDuration || 0)}
            </div>
            <div className={styles.playerMetaSub}>
              Opening Affirmations + Your Vision Story + Closing Affirmations
            </div>

            {/* Custom Audio Player — uses displayDuration for accurate timing on all browsers (Safari reports wrong duration from concatenated MP3 VBR headers) */}
            <div style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>
              {story?.audio_url && (
                <>
                  {/* Audio element lives in GlobalAudioPlayer (layout) so it
                      persists across navigation. Controls here talk to the
                      global audio player store. */}

                  {/* Custom controls UI */}
                  <div
                    className={styles.playerControls}
                    style={{ padding: 0, position: "relative" }}
                  >
                    {/* Full-width buffering bar at top of player controls */}
                    {isBuffering && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "2px",
                          background: "rgba(255,255,255,0.06)",
                          overflow: "hidden",
                          zIndex: 5,
                          borderRadius: "1px",
                        }}
                      >
                        <div
                          style={{
                            width: "40%",
                            height: "100%",
                            background:
                              "linear-gradient(90deg, #6ECF7A, #A8E6A1)",
                            borderRadius: "1px",
                            animation: "bufferSlide 1.2s ease-in-out infinite",
                          }}
                        />
                      </div>
                    )}

                    <div className={styles.ctrlRow}>
                      <button
                        className={styles.ctrlSkip}
                        onClick={() => skip(-15)}
                        aria-label="Rewind 15 seconds"
                        style={{
                          opacity: isBuffering ? 0.5 : 1,
                          pointerEvents: isBuffering ? "none" : "auto",
                          transition: "opacity 0.2s",
                        }}
                      >
                        <SkipBackIcon />
                      </button>
                      <button
                        className={styles.ctrlPlay}
                        onClick={togglePlay}
                        aria-label={
                          isBuffering ? "Loading" : isPlaying ? "Pause" : "Play"
                        }
                        style={{
                          position: "relative",
                        }}
                      >
                        <div className={styles.playPauseIcon}>
                          {isBuffering ? (
                            <span
                              style={{
                                display: "inline-block",
                                width: 22,
                                height: 22,
                                border: "2.5px solid rgba(0,0,0,0.1)",
                                borderTop: "2.5px solid #111614",
                                borderRadius: "50%",
                                animation: "spin 0.7s linear infinite",
                              }}
                            />
                          ) : isPlaying ? (
                            <PauseIcon />
                          ) : (
                            <PlayIcon />
                          )}
                        </div>
                      </button>
                      <button
                        className={styles.ctrlSkip}
                        onClick={() => skip(15)}
                        aria-label="Forward 15 seconds"
                        style={{
                          opacity: isBuffering ? 0.5 : 1,
                          pointerEvents: isBuffering ? "none" : "auto",
                          transition: "opacity 0.2s",
                        }}
                      >
                        <SkipForwardIcon />
                      </button>
                    </div>
                    <div className={styles.progressRow}>
                      <div
                        className={styles.progressBar}
                        style={{
                          position: "relative",
                          cursor: "default",
                          touchAction: "none",
                        }}
                      >
                        {/* Buffered range indicator */}
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: "100%",
                            width: `${bufferedPct}%`,
                            background: "rgba(255,255,255,0.08)",
                            borderRadius: "inherit",
                            transition: "width 0.3s ease",
                          }}
                        />
                        {/* Played fill */}
                        <div
                          className={styles.progressBarFill}
                          style={{
                            width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%`,
                            position: "relative",
                            zIndex: 1,
                            transition: "width 0.5s linear",
                          }}
                        />
                        {/* Scrub thumb */}
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%`,
                            transform: "translate(-50%, -50%)",
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#fff",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                            zIndex: 2,
                            transition:
                              "left 0.5s linear, width 0.15s, height 0.15s",
                            opacity: currentTime > 0 ? 1 : 0,
                          }}
                        />
                      </div>
                      <div className={styles.timeRow}>
                        <span>{formatTime(currentTime)}</span>
                        <span>
                          {isBuffering && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                color: "#A8E6A1",
                                marginRight: "6px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 8,
                                  height: 8,
                                  border: "1.5px solid rgba(255,255,255,0.15)",
                                  borderTop: "1.5px solid #A8E6A1",
                                  borderRadius: "50%",
                                  animation: "spin 0.7s linear infinite",
                                }}
                              />
                              Loading…
                            </span>
                          )}
                          {formatTime(displayDuration || 0)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.volumeRow}>
                      <div className={styles.volIcon}>
                        <VolumeIcon />
                      </div>
                      <input
                        type="range"
                        className={styles.volSlider}
                        min={0}
                        max={100}
                        value={volume}
                        onChange={handleVolumeChange}
                        aria-label="Volume"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            className={styles.playerControls}
            style={{ paddingTop: "0.5rem" }}
          >
            {/* Hidden audio element for previewing soundscapes */}
            <audio ref={previewAudioRef} preload="none" />

            {availableSoundscapes.length > 0 &&
              (() => {
                const selectedTrack = availableSoundscapes.find(
                  (sc: any) => sc.id === selectedSoundscapeId,
                );
                const hasBackground = !!story?.combined_audio_key;

                // ── Background IS applied: show selected track + Change/Remove ──
                if (hasBackground && selectedTrack) {
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "0.1rem 0",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.62rem",
                            color: "rgba(255,255,255,0.4)",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginBottom: "3px",
                          }}
                        >
                          Background Music
                        </div>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 500,
                            color: "var(--accent)",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          🎵 {selectedTrack.title}
                          {selectedTrack.mood && (
                            <span
                              style={{
                                fontSize: "0.62rem",
                                color: "rgba(255,255,255,0.4)",
                                fontWeight: 400,
                              }}
                            >
                              · {selectedTrack.mood}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{ display: "flex", gap: "6px", flexShrink: 0 }}
                      >
                        <button
                          onClick={() => setShowBgPicker(true)}
                          disabled={isServerMixing}
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            padding: "0.45rem 0.9rem",
                            fontSize: "0.72rem",
                            color: "var(--accent)",
                            cursor: isServerMixing ? "default" : "pointer",
                            opacity: isServerMixing ? 0.5 : 1,
                            fontFamily: "var(--sans)",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            transition: "all 0.2s",
                          }}
                        >
                          Change
                        </button>
                        <button
                          onClick={() => handleServerUnmix()}
                          disabled={isServerMixing}
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            padding: "0.45rem 0.9rem",
                            fontSize: "0.72rem",
                            color: "rgba(255,255,255,0.5)",
                            cursor: isServerMixing ? "default" : "pointer",
                            opacity: isServerMixing ? 0.5 : 1,
                            fontFamily: "var(--sans)",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            transition: "all 0.2s",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── No background set: show all tracks inline ──
                return (
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        fontSize: "0.62rem",
                        color: "rgba(255,255,255,0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "8px",
                      }}
                    >
                      Select Background Music
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "rgba(255,255,255,0.45)",
                        marginBottom: "10px",
                        lineHeight: "1.5",
                      }}
                    >
                      Every track is layered with Theta binaural beats (4–8 Hz).
                      🎧 Best with headphones.
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {availableSoundscapes.map((sc: any) => {
                        const isPreviewing = previewingId === sc.id;
                        const isMixingThis = mixingTrackId === sc.id;
                        return (
                          <div
                            key={sc.id}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              borderRadius: "10px",
                              overflow: "hidden",
                              border: "1px solid var(--border)",
                              background: "rgba(255,255,255,0.04)",
                              transition: "all 0.2s",
                            }}
                          >
                            {/* Preview */}
                            <button
                              onClick={() => togglePreview(sc)}
                              style={{
                                background: "none",
                                border: "none",
                                borderRight: "1px solid var(--border)",
                                padding: "10px 10px",
                                cursor: "pointer",
                                color: isPreviewing
                                  ? "var(--accent)"
                                  : "rgba(255,255,255,0.5)",
                                fontSize: "0.85rem",
                                display: "flex",
                                alignItems: "center",
                                transition: "color 0.2s",
                                flexShrink: 0,
                              }}
                              title={isPreviewing ? "Stop preview" : "Preview"}
                            >
                              {isPreviewing ? "⏸" : "▶"}
                            </button>
                            {/* Track info + apply */}
                            <button
                              onClick={() => {
                                if (isServerMixing) return;
                                if (previewAudioRef.current) {
                                  previewAudioRef.current.pause();
                                  setPreviewingId(null);
                                }
                                handleServerMix(sc.id);
                              }}
                              disabled={isServerMixing}
                              style={{
                                background: "none",
                                border: "none",
                                padding: "8px 12px",
                                cursor: isServerMixing ? "default" : "pointer",
                                opacity: isServerMixing ? 0.6 : 1,
                                textAlign: "left",
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  marginBottom: "2px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.76rem",
                                    fontWeight: 500,
                                    color: "var(--ink)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  {sc.title}
                                  {isMixingThis && (
                                    <span
                                      style={{
                                        display: "inline-block",
                                        width: 12,
                                        height: 12,
                                        border:
                                          "2px solid rgba(255,255,255,0.15)",
                                        borderTop: "2px solid var(--accent)",
                                        borderRadius: "50%",
                                        animation: "spin 0.8s linear infinite",
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}
                                </span>
                              </div>
                              {sc.mood && (
                                <div
                                  style={{
                                    fontSize: "0.62rem",
                                    color: "rgba(255,255,255,0.4)",
                                    marginBottom: "2px",
                                  }}
                                >
                                  {sc.mood}
                                </div>
                              )}
                              {sc.description && (
                                <div
                                  style={{
                                    fontSize: "0.6rem",
                                    color: "rgba(255,255,255,0.28)",
                                  }}
                                >
                                  {sc.description}
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>

        {/* BACKGROUND MUSIC PICKER POPUP */}
        {showBgPicker && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9998,
              padding: "1rem",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isServerMixing) {
                if (previewAudioRef.current) {
                  previewAudioRef.current.pause();
                  setPreviewingId(null);
                }
                setShowBgPicker(false);
              }
            }}
          >
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "480px",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
            >
              {/* Popup header */}
              <div
                style={{
                  padding: "1.25rem 1.5rem 1rem",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: "1.1rem",
                      color: "var(--ink)",
                      margin: 0,
                    }}
                  >
                    Choose Background Music
                  </h3>
                  <button
                    onClick={() => {
                      if (previewAudioRef.current) {
                        previewAudioRef.current.pause();
                        setPreviewingId(null);
                      }
                      setShowBgPicker(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ink-muted)",
                      fontSize: "1.3rem",
                      cursor: "pointer",
                      padding: "4px 8px",
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: "1.5",
                    margin: 0,
                  }}
                >
                  Every track is layered with Theta binaural beats (4–8 Hz) for
                  deep relaxation and subconscious receptivity. 🎧 Best with
                  headphones.
                </p>
              </div>

              {/* Track list — scrollable */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {availableSoundscapes.map((sc: any) => {
                  const isSelected = selectedSoundscapeId === sc.id;
                  const isPreviewing = previewingId === sc.id;
                  const isMixingThis = mixingTrackId === sc.id;
                  return (
                    <div
                      key={sc.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        background: isSelected
                          ? "var(--accent-light)"
                          : "rgba(255,255,255,0.04)",
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Preview button */}
                      <button
                        onClick={() => togglePreview(sc)}
                        style={{
                          background: "none",
                          border: "none",
                          borderRight: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                          padding: "12px 10px",
                          cursor: "pointer",
                          color: isPreviewing
                            ? "var(--accent)"
                            : "rgba(255,255,255,0.5)",
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          transition: "color 0.2s",
                          flexShrink: 0,
                        }}
                        title={
                          isPreviewing ? "Stop preview" : "Preview track (45s)"
                        }
                      >
                        {isPreviewing ? "⏸" : "▶"}
                      </button>
                      {/* Track info + select */}
                      <button
                        onClick={() => {
                          if (isServerMixing) return;
                          if (previewAudioRef.current) {
                            previewAudioRef.current.pause();
                            setPreviewingId(null);
                          }
                          if (isSelected && story?.combined_audio_key) {
                            handleServerUnmix();
                          } else {
                            handleServerMix(sc.id);
                          }
                        }}
                        disabled={isServerMixing}
                        style={{
                          background: "none",
                          border: "none",
                          padding: "8px 12px",
                          cursor: isServerMixing ? "default" : "pointer",
                          opacity: isServerMixing ? 0.6 : 1,
                          textAlign: "left",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginBottom: "2px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 500,
                              color: isSelected
                                ? "var(--accent)"
                                : "var(--ink)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {sc.title}
                            {isMixingThis && (
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 12,
                                  height: 12,
                                  border: "2px solid rgba(255,255,255,0.15)",
                                  borderTop: "2px solid var(--accent)",
                                  borderRadius: "50%",
                                  animation: "spin 0.8s linear infinite",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            {isSelected && !isMixingThis && " ✓"}
                          </span>
                        </div>
                        {sc.mood && (
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: isSelected
                                ? "var(--accent)"
                                : "rgba(255,255,255,0.45)",
                              marginBottom: "2px",
                            }}
                          >
                            {sc.mood}
                          </div>
                        )}
                        {sc.description && (
                          <div
                            style={{
                              fontSize: "0.62rem",
                              color: "rgba(255,255,255,0.3)",
                            }}
                          >
                            {sc.description}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}

                {/* No Music option */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: `1px solid ${!selectedSoundscapeId && !story?.combined_audio_key ? "var(--accent)" : "var(--border)"}`,
                    background:
                      !selectedSoundscapeId && !story?.combined_audio_key
                        ? "var(--accent-light)"
                        : "rgba(255,255,255,0.04)",
                    transition: "all 0.2s",
                  }}
                >
                  <button
                    onClick={() => {
                      if (isServerMixing) return;
                      if (previewAudioRef.current) {
                        previewAudioRef.current.pause();
                        setPreviewingId(null);
                      }
                      if (story?.combined_audio_key) {
                        handleServerUnmix();
                      } else {
                        setSelectedSoundscapeId(null);
                      }
                    }}
                    disabled={isServerMixing}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "10px 14px",
                      cursor: isServerMixing ? "default" : "pointer",
                      opacity: isServerMixing ? 0.6 : 1,
                      textAlign: "left",
                      flex: 1,
                      color:
                        !selectedSoundscapeId && !story?.combined_audio_key
                          ? "var(--accent)"
                          : "var(--ink-muted)",
                      fontSize: "0.75rem",
                    }}
                  >
                    🔇 No Music — voice only
                    {!selectedSoundscapeId &&
                      !story?.combined_audio_key &&
                      " ✓"}
                  </button>
                </div>
              </div>

              {/* Popup footer — mixing indicator */}
              {isServerMixing && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderTop: "1px solid var(--border)",
                    textAlign: "center",
                    fontSize: "0.78rem",
                    color: "rgba(255,255,255,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTop: "2px solid var(--accent)",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  {mixingTrackId === "unmix"
                    ? "Removing background music…"
                    : "Applying background music…"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOWNLOADS */}
        <div className={styles.downloadSection}>
          {/* Voice Only download — always available */}
          <div className={styles.downloadCard}>
            <div className={`${styles.dlIcon} ${styles.mp3}`}>
              <DownloadIcon />
            </div>
            <div className={styles.dlInfo}>
              <div className={styles.dlTitle}>Original Voice</div>
              <div className={styles.dlSub}>
                Your narration — no background music
              </div>
            </div>
            <button
              className={styles.dlBtn}
              onClick={() => handleDownload("voice")}
            >
              <DownloadIcon />
              Download
            </button>
          </div>

          {/* With Music download — only when background is applied */}
          {story?.combined_audio_key && (
            <div className={styles.downloadCard}>
              <div className={`${styles.dlIcon} ${styles.mp3}`}>
                <DownloadIcon />
              </div>
              <div className={styles.dlInfo}>
                <div className={styles.dlTitle}>With Background Music</div>
                <div className={styles.dlSub}>
                  Your narration mixed with background music
                </div>
              </div>
              <button
                className={styles.dlBtn}
                onClick={() => handleDownload("mixed")}
              >
                <DownloadIcon />
                Download
              </button>
            </div>
          )}

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
          <div className={styles.usageTitle}>
            How to get the most from your story
          </div>
          <div className={styles.usageList}>
            <div className={styles.usageItem}>
              <div className={styles.usageItemIcon}>🌅🌙</div>
              <div className={styles.usageItemContent}>
                <div className={styles.usageItemTitle}>
                  Listen morning and night
                </div>
                <div className={styles.usageItemBody}>
                  Play your story within the first few minutes of waking and
                  again right before you fall asleep. These are the windows when
                  your subconscious mind is most open and receptive — and when
                  the reprogramming goes deepest.
                </div>
              </div>
            </div>

            <div className={styles.usageItem}>
              <div className={styles.usageItemIcon}>🎧</div>
              <div className={styles.usageItemContent}>
                <div className={styles.usageItemTitle}>
                  Immerse yourself — don't just listen
                </div>
                <div className={styles.usageItemBody}>
                  Close your eyes and place yourself inside the story. See the
                  details, feel the environment, inhabit the version of you
                  being described. The more vividly you can experience it as
                  real, the more powerful it becomes. This is a skill — it gets
                  easier and richer with every listen.
                </div>
              </div>
            </div>

            <div className={styles.usageItem}>
              <div className={styles.usageItemIcon}>❤️</div>
              <div className={styles.usageItemContent}>
                <div className={styles.usageItemTitle}>
                  Feel it as your life now — not something you want
                </div>
                <div className={styles.usageItemBody}>
                  The goal isn't to wish for this life — it's to emotionally{" "}
                  <em>inhabit</em> it. Your subconscious doesn't distinguish
                  between a vividly imagined experience and a real one. When you
                  generate the emotions of already living this story, your brain
                  begins to treat it as your reality. This is the hardest part,
                  and it takes practice. Be patient with yourself. Visit the{" "}
                  <Link href="/science" className={styles.inlineLink}>
                    science page
                  </Link>{" "}
                  to understand exactly why repetition is the key that makes
                  this work.
                </div>
              </div>
            </div>

            <div className={styles.usageItem}>
              <div className={styles.usageItemIcon}>🚶</div>
              <div className={styles.usageItemContent}>
                <div className={styles.usageItemTitle}>
                  Stay open to action — and take it
                </div>
                <div className={styles.usageItemBody}>
                  Your story will attract opportunities, people, and moments —
                  but you still have to walk through the doors when they open.
                  The more consistently you listen, the more clearly you'll
                  recognize the right actions when they appear in your life.
                  Don't wait for the perfect moment. Move when something feels
                  aligned.
                </div>
              </div>
            </div>

            <div className={styles.usageItem}>
              <div className={styles.usageItemIcon}>🔁</div>
              <div className={styles.usageItemContent}>
                <div className={styles.usageItemTitle}>
                  Stay consistent — especially when it's working
                </div>
                <div className={styles.usageItemBody}>
                  Things will start to shift. When they do, that is not the time
                  to stop. Consistency is everything here. Missing a day is fine
                  — missing a week breaks the pattern your brain is building. If
                  you feel momentum, that's your signal to double down, not ease
                  off.
                </div>
              </div>
            </div>

            <div className={styles.usageItem}>
              <div className={styles.usageItemIcon}>✏️</div>
              <div className={styles.usageItemContent}>
                <div className={styles.usageItemTitle}>
                  Update your story as your life evolves
                </div>
                <div className={styles.usageItemBody}>
                  Life changes — and your story should too. If something happens
                  that makes a part of your story feel untrue, outdated, or
                  misaligned, come back and revise it. A story that no longer
                  resonates loses its power. Keep it current, keep it real, keep
                  it yours.
                </div>
              </div>
            </div>

            <div className={`${styles.usageItem} ${styles.usageItemHighlight}`}>
              <div className={styles.usageItemIcon}>✨</div>
              <div className={styles.usageItemContent}>
                <div className={styles.usageItemTitle}>
                  This should feel exciting — if it doesn't, revise it
                </div>
                <div className={styles.usageItemBody}>
                  Your story is a portrait of your dream life — everything you
                  told us you wanted, brought to life in vivid detail. Listening
                  to it should feel energizing, emotional, and deeply personal.
                  If something feels off, flat, or doesn't quite sound like you
                  — change it. This is your life. Make sure the story feels like
                  it.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SCIENCE */}
        <div className={styles.scienceBanner}>
          <div className={styles.sciIcon}>🧠</div>
          <div className={styles.sciText}>
            <strong>Why your own voice matters:</strong> Research in cognitive
            psychology shows that self-directed affirmations — heard in your own
            voice — produce significantly stronger belief activation than the
            same statements heard in a stranger's voice. Your brain recognizes
            and trusts your own voice at a neurological level.
          </div>
        </div>

        {/* NEXT STEPS */}
        <div className={styles.nextSection}>
          <div className={styles.nextTitle}>Keep going</div>
          <div className={styles.nextCards}>
            <div
              className={styles.nextCard}
              onClick={() => router.push("/user/goal-intake-ai")}
            >
              <div className={styles.nextCardIcon}>
                <StarIcon />
              </div>
              <div className={styles.nextCardText}>
                <div className={styles.nextCardTitle}>
                  Create a second story
                </div>
                <div className={styles.nextCardSub}>
                  Go deeper on a specific area — health, abundance,
                  relationships
                </div>
              </div>
              <div className={styles.nextCardArrow}>
                <ArrowIcon />
              </div>
            </div>

            <div
              className={styles.nextCard}
              onClick={() => router.push("/user/dashboard")}
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
              onClick={() => router.push("/user/account-setting")}
            >
              <div className={styles.nextCardIcon}>
                <BookIcon />
              </div>
              <div className={styles.nextCardText}>
                <div className={styles.nextCardTitle}>Explore the science</div>
                <div className={styles.nextCardSub}>
                  Read the research behind visualization, RAS, and
                  neuroplasticity
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
              Listen to your story every morning and every night. Your brain
              will start to notice what it's been programmed to see.
            </p>
            <div className={styles.postDownloadActions}>
              <Link href="/user/dashboard" className={styles.homeCta}>
                ← Go to Dashboard
              </Link>
              <Link
                href="/user/goal-intake-ai"
                className={styles.homeCtaOutline}
              >
                Create another story
              </Link>
            </div>
          </div>
        )}
      </div>

      {showFeedback && (
        <FeedbackPopup
          onClose={() => {
            sessionStorage.setItem("feedback_dismissed", "true");
            setShowFeedback(false);
          }}
          onSubmit={handleFeedbackSubmit}
        />
      )}
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
