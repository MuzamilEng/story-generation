"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../../../styles/AudioReady.module.css";
import { useStoryStore } from "@/store/useStoryStore";
import { useGlobalUI } from "@/components/ui/global-ui-context";
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

interface WaveformBar {
  height: number;
  played: boolean;
}

const AudioReadyContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, showConfirm } = useGlobalUI();
  const storyId = searchParams.get("storyId");

  const [story, setStory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMixing, setIsMixing] = useState(false);
  const [mixProgress, setMixProgress] = useState(0);
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
  const [isServerMixing, setIsServerMixing] = useState(false);
  const [availableSoundscapes, setAvailableSoundscapes] = useState<any[]>([]);
  const [selectedSoundscapeId, setSelectedSoundscapeId] = useState<string | null>(null);

  const { clearStore } = useStoryStore();
  const [showFeedback, setShowFeedback] = useState(false);

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
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

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
          // Default toggles based on user preference
          if (data.user?.soundscape && data.user.soundscape !== "none") {
            setSoundscapeOn(true);
          }
          if (data.user?.binaural_enabled && data.user?.plan === "amplifier") {
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

  // Fetch available soundscapes for server-side mixing
  useEffect(() => {
    const fetchSoundscapes = async () => {
      try {
        const res = await fetch("/api/user/soundscapes");
        if (res.ok) {
          const data = await res.json();
          setAvailableSoundscapes(data.assets || []);
        }
      } catch (err) {
        console.error("Failed to fetch soundscapes", err);
      }
    };
    fetchSoundscapes();
  }, []);

  /** Server-side mix: sends voice + selected soundscape to the Express mixing server */
  const handleServerMix = async (soundscapeId: string) => {
    if (!story?.id || !soundscapeId) return;
    setIsServerMixing(true);
    try {
      const res = await fetch("/api/user/audio/mix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          soundscapeId,
          backgroundVolume: 0.15,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Mixing failed", "error");
        return;
      }
      // Update local story state with new audio URL
      setStory((prev: any) => ({
        ...prev,
        audio_url: data.audio_url,
        combined_audio_key: data.combined_audio_key,
      }));
      setSoundscapeOn(true);
      setSelectedSoundscapeId(soundscapeId);
      showToast("Background sound mixed successfully!", "success");
      // Reload the audio element with the new mixed URL
      if (audioRef.current) {
        audioRef.current.load();
      }
    } catch (err) {
      console.error("Server mix failed:", err);
      showToast("Failed to mix audio on server", "error");
    } finally {
      setIsServerMixing(false);
    }
  };

  /** Revert to voice-only on server */
  const handleServerUnmix = async () => {
    if (!story?.id) return;
    setIsServerMixing(true);
    try {
      const res = await fetch("/api/user/audio/unmix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Unmix failed", "error");
        return;
      }
      setStory((prev: any) => ({
        ...prev,
        audio_url: data.audio_url,
        combined_audio_key: null,
      }));
      setSoundscapeOn(false);
      setSelectedSoundscapeId(null);
      showToast("Reverted to voice-only audio", "success");
      if (audioRef.current) {
        audioRef.current.load();
      }
    } catch (err) {
      console.error("Server unmix failed:", err);
      showToast("Failed to remove background sound", "error");
    } finally {
      setIsServerMixing(false);
    }
  };

  useEffect(() => {
    // Generate random-ish waveform heights
    const heights = Array.from(
      { length: waveformCount },
      () => Math.random() * 32 + 4,
    );
    setWaveformBars(heights.map((height) => ({ height, played: false })));
  }, []);

  // Use DB-stored duration as authoritative source.
  // Only override with live browser value if it's plausible (within 20% of DB
  // value, or DB has no value). This prevents a stale VBR header in a cached
  // audio file from overriding with a bogus short duration (e.g. 3 seconds).
  const dbDuration = story?.audio_duration_secs ?? 0;
  const displayDuration = (() => {
    if (duration > 0 && isFinite(duration)) {
      // Reject the live value if it looks like VBR-truncated nonsense
      if (dbDuration > 0 && duration < dbDuration * 0.5) return dbDuration;
      return duration;
    }
    return dbDuration;
  })();

  useEffect(() => {
    if (!displayDuration) return;
    const playedBars = Math.floor(
      (currentTime / displayDuration) * waveformCount,
    );
    setWaveformBars((prev) =>
      prev.map((bar, index) => ({
        ...bar,
        played: index < playedBars,
      })),
    );
  }, [currentTime, displayDuration]);

  // Ensure audio element volumes are synced
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    // Background tracks are mixed at ~ -18dB relative to voice (approx 0.13 volume)
    if (soundscapeRef.current)
      soundscapeRef.current.volume = (volume / 100) * 0.13;
    if (binauralRef.current) binauralRef.current.volume = (volume / 100) * 0.13;
  }, [volume]);

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

  const handlePlay = () => {
    setIsPlaying(true);
    if (soundscapeOn && soundscapeRef.current && audioRef.current) {
      const bgDuration = soundscapeRef.current.duration || 300;
      soundscapeRef.current.currentTime =
        audioRef.current.currentTime % bgDuration;
      soundscapeRef.current
        .play()
        .catch((e) => console.warn("Soundscape play failed", e));
    }
    if (binauralOn && binauralRef.current && audioRef.current) {
      const binDuration = binauralRef.current.duration || 300;
      binauralRef.current.currentTime =
        audioRef.current.currentTime % binDuration;
      binauralRef.current
        .play()
        .catch((e) => console.warn("Binaural play failed", e));
    }
    if (currentTime < 1) recordEvent("play");
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (soundscapeRef.current) soundscapeRef.current.pause();
    if (binauralRef.current) binauralRef.current.pause();
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Playback failed:", err);
      });
    }
  };

  // Handle autoplay from dashboard/stories
  useEffect(() => {
    const autoplay = searchParams.get("autoplay");
    if (autoplay === "true" && story && audioRef.current && !isPlaying) {
      // Short delay to ensure audio is ready
      const timer = setTimeout(() => {
        togglePlay();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [story, audioRef.current]);

  // Keep background tracks sync'd on seek
  useEffect(() => {
    if (isPlaying) {
      if (soundscapeOn && soundscapeRef.current && audioRef.current) {
        const diff = Math.abs(
          soundscapeRef.current.currentTime -
            (audioRef.current.currentTime %
              (soundscapeRef.current.duration || 300)),
        );
        if (diff > 0.5)
          soundscapeRef.current.currentTime =
            audioRef.current.currentTime %
            (soundscapeRef.current.duration || 300);
      }
      if (binauralOn && binauralRef.current && audioRef.current) {
        const diff = Math.abs(
          binauralRef.current.currentTime -
            (audioRef.current.currentTime %
              (binauralRef.current.duration || 300)),
        );
        if (diff > 0.5)
          binauralRef.current.currentTime =
            audioRef.current.currentTime %
            (binauralRef.current.duration || 300);
      }
    }
  }, [currentTime]);

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    const total = displayDuration;
    if (!total || total <= 0) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(total, audioRef.current.currentTime + seconds),
    );
  };

  const seekTo = (pct: number) => {
    if (!audioRef.current) return;
    const total = displayDuration;
    if (!total || total <= 0) return;
    audioRef.current.currentTime = pct * total;
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
      const d = audioRef.current.duration;
      if (d && isFinite(d) && d > 0) {
        setDuration(d);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      // Browser progressively refines duration as it buffers more data.
      // Keep updating so we always have the most accurate value.
      const d = audioRef.current.duration;
      if (d && isFinite(d) && d > 0 && d !== duration) {
        setDuration(d);
      }
    }
  };

  /**
   * Client-side Mixing Engine
   * Bypasses server-side FFmpeg limits (like Vercel) by mixing tracks in the browser context.
   */
  const mixAndDownloadInBrowser = async () => {
    if (!story || !audioRef.current) return;

    setIsMixing(true);
    setMixProgress(10);

    try {
      const voiceUrl = story.audio_url;
      const soundscapeUrl = soundscapeOn
        ? `/api/user/audio/stream?key=${encodeURIComponent(story.soundscape_audio_key)}`
        : null;
      const binauralUrl = binauralOn
        ? `/api/user/audio/stream?key=${encodeURIComponent(story.binaural_audio_key)}`
        : null;

      // 1. Fetch all required audio files as ArrayBuffers
      const fetchAudio = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        return res.arrayBuffer();
      };

      setMixProgress(20);
      const [voiceTask, soundscapeTask, binauralTask] = await Promise.all([
        fetchAudio(voiceUrl),
        soundscapeUrl ? fetchAudio(soundscapeUrl) : Promise.resolve(null),
        binauralUrl ? fetchAudio(binauralUrl) : Promise.resolve(null),
      ]);

      setMixProgress(40);
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();

      // 2. Decode all buffers
      const decode = (buffer: ArrayBuffer) => audioCtx.decodeAudioData(buffer);
      const [voiceBuffer, soundscapeBuffer, binauralBuffer] = await Promise.all(
        [
          decode(voiceTask),
          soundscapeTask ? decode(soundscapeTask) : Promise.resolve(null),
          binauralTask ? decode(binauralTask) : Promise.resolve(null),
        ],
      );

      setMixProgress(60);

      // 3. Setup OfflineAudioContext
      // We use the voice buffer length as the master duration
      const duration = voiceBuffer.duration;
      const sampleRate = voiceBuffer.sampleRate;
      const offlineCtx = new OfflineAudioContext(
        2,
        duration * sampleRate,
        sampleRate,
      );

      // 4. Create source nodes & Gain nodes
      const voiceSource = offlineCtx.createBufferSource();
      voiceSource.buffer = voiceBuffer;
      const voiceGain = offlineCtx.createGain();
      voiceGain.gain.value = 1.0; // Primary voice
      voiceSource.connect(voiceGain).connect(offlineCtx.destination);

      if (soundscapeBuffer) {
        const bgSource = offlineCtx.createBufferSource();
        bgSource.buffer = soundscapeBuffer;
        bgSource.loop = true;
        const bgGain = offlineCtx.createGain();
        bgGain.gain.value = 0.15; // Set softly as per design
        bgSource.connect(bgGain).connect(offlineCtx.destination);
        bgSource.start(0);
      }

      if (binauralBuffer) {
        const binSource = offlineCtx.createBufferSource();
        binSource.buffer = binauralBuffer;
        binSource.loop = true;
        const binGain = offlineCtx.createGain();
        binGain.gain.value = 0.12; // Binaural subtle effect
        binSource.connect(binGain).connect(offlineCtx.destination);
        binSource.start(0);
      }

      voiceSource.start(0);

      setMixProgress(80);

      // 5. Render
      const renderedBuffer = await offlineCtx.startRendering();

      setMixProgress(95);

      // 6. Convert to WAV (simple helper)
      const wavBlob = audioBufferToWav(renderedBuffer);
      const downloadUrl = URL.createObjectURL(wavBlob);

      // 7. Trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${story.title || "My_Manifestation_Story"}_HD_Mix.wav`;
      link.click();

      URL.revokeObjectURL(downloadUrl);
      setMixProgress(100);
      setShowDownloadPrompt(true);

      setTimeout(() => {
        document
          .getElementById("postDownload")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 500);
    } catch (err) {
      console.error("Browser mixing failed:", err);
      showToast(
        "High-fidelity mixing failed in this browser. Falling back to voice-only download.",
        "error",
      );
      handleDownload("voice"); // Fallback to simple download
    } finally {
      setIsMixing(false);
      setMixProgress(0);
    }
  };

  /** Simple WAV helper for browser-side output */
  const audioBufferToWav = (buffer: AudioBuffer) => {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length * numChannels * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);
    const channels = [];
    let i,
      sample,
      offset = 0;

    // RIFF chunk descriptor
    const writeString = (s: string) => {
      for (i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
    };
    writeString("RIFF");
    view.setUint32(offset, length - 8, true);
    offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numChannels, true);
    offset += 2;
    view.setUint32(offset, buffer.sampleRate, true);
    offset += 4;
    view.setUint32(offset, buffer.sampleRate * 2 * numChannels, true);
    offset += 4;
    view.setUint16(offset, numChannels * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString("data");
    view.setUint32(offset, length - offset - 4, true);
    offset += 4;

    for (i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));

    let pos = 0;
    while (pos < buffer.length) {
      for (i = 0; i < numChannels; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][pos]));
        view.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true,
        );
        offset += 2;
      }
      pos++;
    }
    return new Blob([out], { type: "audio/wav" });
  };

  const handleDownload = (type: "mixed" | "voice" = "mixed") => {
    if (!story?.audio_url) return;

    // If user wants mixed and has backgrounds ON, try browser mixing first
    // to bypass FFmpeg limits on serverless production (Vercel)
    if (type === "mixed" && (soundscapeOn || binauralOn)) {
      showConfirm({
        title: "High Fidelity Master",
        message:
          "I will now mix your narration with your chosen background sounds directly in your browser. This creates a lossless (WAV) file for the best quality.\n\nContinue?",
        confirmText: "Continue",
        onConfirm: () => {
          mixAndDownloadInBrowser();
        },
      });
      return;
    }

    showConfirm({
      title: "Download Audio",
      message:
        type === "mixed"
          ? "Downloading the standard MP3 version.\n\nNote: If background mixing wasn't completed during generation, this file may only contain voice."
          : "Downloading the clean voice version (no background sounds).",
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

  const progressPercentage =
    displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ padding: "100px", textAlign: "center" }}>
          Preparing your story...
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

  return (
    <div className={styles.container}>
      {/* Background audio elements kept hidden but active */}
      {story?.soundscape_audio_key && (
        <audio
          ref={soundscapeRef}
          src={`/api/user/audio/stream?key=${encodeURIComponent(story.soundscape_audio_key)}`}
          loop
          preload="auto"
          onError={() => {
            console.warn(
              `[audio] Failed to load soundscape: ${story.soundscape_audio_key}`,
            );
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
            console.warn(
              `[audio] Failed to load binaural: ${story.binaural_audio_key}`,
            );
            setBinauralOn(false);
          }}
        />
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
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
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
                background: "linear-gradient(135deg, var(--green1), var(--green2))",
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
                  {/* Hidden audio element — drives playback, no native controls */}
                  <audio
                    ref={audioRef}
                    preload="auto"
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onLoadedMetadata={handleMetadata}
                    onDurationChange={handleMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => {
                      setIsPlaying(false);
                      if (soundscapeRef.current) soundscapeRef.current.pause();
                      if (binauralRef.current) binauralRef.current.pause();
                    }}
                    onError={(e) => {
                      console.error("Main audio error:", e);
                      showToast(
                        "Failed to load audio. Please refresh or try another browser.",
                        "error",
                      );
                    }}
                    crossOrigin="anonymous"
                    playsInline
                  >
                    <source src={story.audio_url} type="audio/mpeg" />
                  </audio>

                  {/* Custom controls UI */}
                  <div className={styles.playerControls} style={{ padding: 0 }}>
                    <div className={styles.ctrlRow}>
                      <button
                        className={styles.ctrlSkip}
                        onClick={() => skip(-15)}
                        aria-label="Rewind 15 seconds"
                      >
                        <SkipBackIcon />
                      </button>
                      <button
                        className={styles.ctrlPlay}
                        onClick={togglePlay}
                        aria-label={isPlaying ? "Pause" : "Play"}
                      >
                        <div className={styles.playPauseIcon}>
                          {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </div>
                      </button>
                      <button
                        className={styles.ctrlSkip}
                        onClick={() => skip(15)}
                        aria-label="Forward 15 seconds"
                      >
                        <SkipForwardIcon />
                      </button>
                    </div>
                    <div className={styles.progressRow}>
                      <div
                        className={styles.progressBar}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = (e.clientX - rect.left) / rect.width;
                          seekTo(Math.max(0, Math.min(1, pct)));
                        }}
                      >
                        <div
                          className={styles.progressBarFill}
                          style={{
                            width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className={styles.timeRow}>
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(displayDuration || 0)}</span>
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
            <div className={styles.layerControls}>
              {/* Server-side soundscape mixing */}
              {availableSoundscapes.length > 0 && (
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                    {availableSoundscapes.map((sc: any) => (
                      <button
                        key={sc.id}
                        className={`${styles.layerBtn} ${selectedSoundscapeId === sc.id ? styles.active : ""}`}
                        onClick={() => {
                          if (isServerMixing) return;
                          if (selectedSoundscapeId === sc.id && story?.combined_audio_key) {
                            // Already mixed with this soundscape — unmix
                            handleServerUnmix();
                          } else {
                            handleServerMix(sc.id);
                          }
                        }}
                        disabled={isServerMixing}
                        style={{ opacity: isServerMixing ? 0.6 : 1 }}
                      >
                        🌊 {sc.title}
                      </button>
                    ))}
                    {story?.combined_audio_key && (
                      <button
                        className={styles.layerBtn}
                        onClick={() => !isServerMixing && handleServerUnmix()}
                        disabled={isServerMixing}
                        style={{ opacity: isServerMixing ? 0.6 : 1 }}
                      >
                        ✕ Remove Background
                      </button>
                    )}
                  </div>
                  {isServerMixing && (
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
                      Mixing audio on server...
                    </div>
                  )}
                </div>
              )}

              {/* Fallback: original soundscape toggle when no server mixing available */}
              {availableSoundscapes.length === 0 && story?.soundscape_audio_key && (
                <button
                  className={`${styles.layerBtn} ${soundscapeOn ? styles.active : ""}`}
                  onClick={() => {
                    setSoundscapeOn(!soundscapeOn);
                    if (!soundscapeOn && isPlaying) {
                      soundscapeRef.current?.play();
                    } else {
                      soundscapeRef.current?.pause();
                    }
                  }}
                >
                  🌊 {soundscapeOn ? "Soundscape: ON" : "Soundscape: OFF"}
                </button>
              )}

              {/* Binaural toggle */}
              {story?.binaural_audio_key && (
                <button
                  className={`${styles.layerBtn} ${binauralOn ? styles.active : ""}`}
                  onClick={() => {
                    setBinauralOn(!binauralOn);
                    if (!binauralOn && isPlaying) {
                      binauralRef.current?.play();
                    } else {
                      binauralRef.current?.pause();
                    }
                  }}
                >
                  🎧 {binauralOn ? "Binaural: ON" : "Binaural: OFF"}
                </button>
              )}
            </div>

            {/* Headphones reminder */}
            {story?.binaural_audio_key && binauralOn && (
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.4)",
                  textAlign: "center",
                  marginTop: "-0.2rem",
                }}
              >
                🎧 Best with headphones for theta effects
              </div>
            )}
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
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <button
                className={styles.dlBtn}
                onClick={() => handleDownload("mixed")}
                style={{ width: "100%", position: "relative" }}
                disabled={isMixing}
              >
                {isMixing ? (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${mixProgress}%`,
                        background: "rgba(255,255,255,0.1)",
                        transition: "width 0.3s ease",
                      }}
                    />
                    Mixing High-Fidelity... {mixProgress}%
                  </>
                ) : (
                  <>
                    <DownloadIcon />
                    Download HD Mix
                  </>
                )}
              </button>

              {story?.voice_only_url && (
                <button
                  className={styles.dlBtn}
                  onClick={() => handleDownload("voice")}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--ink-faint)",
                    marginTop: "4px",
                  }}
                >
                  Clean Voice Only
                </button>
              )}
            </div>
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
