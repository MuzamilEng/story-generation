"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../../../styles/VoiceRecording.module.css";
import {
  CheckIcon,
  MicIcon,
  StopIcon,
  PlayIcon,
  PauseIcon,
  RefreshIcon,
  HomeIcon,
  InfoIcon,
  ClockIcon,
  ShieldIcon,
  ArrowIcon,
  EditIcon,
} from "../../../components/icons/VoiceIcons";
import { RecordingState, TipItem } from "../../../types/voice";
import { useGlobalUI } from "@/components/ui/global-ui-context";
import { primeBrowserNotifications } from "@/lib/browser-notifications";

// Saved voice info from API
interface VoiceSampleItem {
  id: string;
  label: string;
  sample_url: string;
  duration_s: number | null;
  is_default: boolean;
  created_at: string;
}

// Tip Row Component
interface TipRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const TipRow: React.FC<TipRowProps> = ({ icon, title, description }) => (
  <div className={styles.tipRow}>
    <div className={styles.tipIcon}>{icon}</div>
    <div className={styles.tipText}>
      <strong>{title}</strong>
      {description}
    </div>
  </div>
);

interface WaveformProps {
  isRecording: boolean;
  isStopped: boolean;
  duration: number;
}

const Waveform: React.FC<WaveformProps & { volume?: number }> = ({
  isRecording,
  isStopped,
  volume = 0,
}) => {
  const [bars, setBars] = useState<number[]>([]);
  const waveformRef = useRef<HTMLDivElement>(null);
  const NUM_BARS = 60;

  // Initialize bars
  useEffect(() => {
    setBars(Array(NUM_BARS).fill(4));
  }, []);

  // Animate waveform during recording
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setBars((prev) => {
        const newBars = [...prev];
        // Shift left and add new magnitude height based on volume
        for (let i = 0; i < NUM_BARS - 1; i++) {
          newBars[i] = newBars[i + 1];
        }
        const magnitude = isRecording ? volume * 80 + 4 : 4;
        newBars[NUM_BARS - 1] = magnitude;
        return newBars;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRecording, volume]);

  return (
    <div className={styles.waveformWrap} ref={waveformRef}>
      {bars.map((height, index) => (
        <div
          key={index}
          className={`${styles.waveBar} 
            ${isRecording ? styles.active : ""} 
            ${isStopped ? styles.recorded : ""}`}
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
};

// Timer Display Component
interface TimerDisplayProps {
  seconds: number;
  isRecording: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  seconds,
  isRecording,
}) => {
  const formatTime = (s: number): string => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`${styles.timerDisplay} ${isRecording ? styles.recording : ""}`}
    >
      {formatTime(seconds)}
    </div>
  );
};

// Playback Component
interface PlaybackProps {
  duration: number;
  audioUrl: string | null;
  onReRecord: () => void;
}

const Playback: React.FC<PlaybackProps> = ({
  duration,
  audioUrl,
  onReRecord,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (s: number): string => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Update audioDuration when prop changes
  useEffect(() => {
    if (duration > 0) setAudioDuration(duration);
  }, [duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const progressPercentage =
    audioDuration > 0 ? Math.min((currentTime / audioDuration) * 100, 100) : 0;

  return (
    <div className={`${styles.playbackCard} ${styles.visible}`}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" crossOrigin="anonymous" playsInline />}
      <button className={styles.playPause} onClick={togglePlayback}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className={styles.pbInfo}>
        <div className={styles.pbTitle}>
          Your voice sample · <span>{formatTime(audioDuration)}</span>
        </div>
        <div
          className={styles.pbProgress}
          onClick={(e) => {
            if (!audioRef.current || !audioDuration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = percent * audioDuration;
          }}
          style={{ cursor: "pointer" }}
        >
          <div
            className={styles.pbFill}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className={styles.pbTime}>{formatTime(currentTime)}</div>
      </div>
      <button className={styles.pbRedo} onClick={onReRecord}>
        Re-record
      </button>
    </div>
  );
};

// Saved Voices List Component
interface SavedVoicesListProps {
  voices: VoiceSampleItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newLabel: string) => void;
  onUse: (voice: VoiceSampleItem) => void;
  isDeleting: string | null;
  isSubmitting: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const SavedVoicesList: React.FC<SavedVoicesListProps> = ({
  voices,
  selectedId,
  onSelect,
  onDelete,
  onRename,
  onUse,
  isDeleting,
  isSubmitting,
  showToast,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  const startEditing = (v: VoiceSampleItem) => {
    setEditingId(v.id);
    setEditLabel(v.label);
  };

  const confirmRename = () => {
    if (editingId && editLabel.trim()) {
      onRename(editingId, editLabel.trim());
    }
    setEditingId(null);
    setEditLabel("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditLabel("");
  };

  const togglePlay = (voice: VoiceSampleItem) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === voice.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.pause();
      audio.src = voice.sample_url;
      audio.load();
      audio.play().then(() => {
        setPlayingId(voice.id);
      }).catch(e => {
        console.error("Playback failed, retrying compatibility stream", e);

        const compatUrl = voice.sample_url.includes("?")
          ? `${voice.sample_url}&compat=1`
          : `${voice.sample_url}?compat=1`;

        audio.pause();
        audio.src = compatUrl;
        audio.load();

        audio.play().then(() => {
          setPlayingId(voice.id);
        }).catch((compatError) => {
          console.error("Compatibility playback failed", compatError);
          showToast("Playback failed in this browser.", "error");
          setPlayingId(null);
        });
      });
      audio.onended = () => setPlayingId(null);
    }
  };

  const formatDuration = (s: number | null) => {
    if (!s) return "—";
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (voices.length === 0) return null;

  return (
    <div className={styles.savedVoiceCard}>
      {/* Hidden audio for playback */}
      <audio ref={audioRef} crossOrigin="anonymous" playsInline />
      <div className={styles.savedVoiceHeader}>
        <div className={styles.savedVoiceBadge}>
          <MicIcon /> My Saved Voices ({voices.length}/5)
        </div>
      </div>
      <div className={styles.savedVoiceBody}>
        <p className={styles.savedVoiceDesc}>
          Select a saved voice to generate your audio story, or record a new one
          below.
        </p>
        <div className={styles.voiceList}>
          {voices.map((voice) => (
            <div
              key={voice.id}
              className={`${styles.voiceItem} ${selectedId === voice.id ? styles.voiceItemSelected : ""}`}
              onClick={() => !editingId && onSelect(voice.id)}
            >
              <div className={styles.voiceItemRadio}>
                <div
                  className={`${styles.radioCircle} ${selectedId === voice.id ? styles.radioActive : ""}`}
                />
              </div>
              <div className={styles.voiceItemInfo}>
                {editingId === voice.id ? (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      className={styles.pbRedo} // reusing a styled border-radius input-like button base
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                      style={{
                        fontSize: "0.85rem",
                        padding: "4px 8px",
                        maxWidth: "160px",
                        background: "rgba(0,0,0,0.2)",
                        color: "#fff",
                        border: "1px solid var(--accent)",
                      }}
                    />
                    <button
                      className={styles.voiceItemPlayBtn}
                      onClick={confirmRename}
                      style={{
                        width: "auto",
                        height: "auto",
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        borderRadius: "6px",
                        background: "var(--accent)",
                      }}
                    >
                      Save
                    </button>
                    <button
                      className={styles.voiceItemPlayBtn}
                      onClick={cancelEditing}
                      style={{
                        width: "auto",
                        height: "auto",
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        borderRadius: "6px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.voiceItemLabel}>
                      {voice.label}
                      {voice.is_default && (
                        <span className={styles.defaultTag}>Active</span>
                      )}
                    </div>
                    <div className={styles.voiceItemMeta}>
                      {formatDuration(voice.duration_s)} ·{" "}
                      {new Date(voice.created_at).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>
              <div className={styles.voiceItemActions}>
                {editingId !== voice.id && (
                  <button
                    className={styles.voiceItemPlayBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(voice);
                    }}
                    title="Rename"
                  >
                    <EditIcon />
                  </button>
                )}
                <button
                  className={styles.voiceItemPlayBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay(voice);
                  }}
                >
                  {playingId === voice.id ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button
                  className={styles.voiceItemDeleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(voice.id);
                  }}
                  disabled={isDeleting === voice.id}
                >
                  {isDeleting === voice.id ? "…" : "✕"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {selectedId && (
          <button
            className={styles.savedVoiceUse}
            onClick={() => {
              const v = voices.find((v) => v.id === selectedId);
              if (v) onUse(v);
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "Generating…"
            ) : (
              <>
                <MicIcon /> Use Selected Voice
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// Content Component
const VoiceRecordingContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, showConfirm } = useGlobalUI();
  const storyId = searchParams.get("storyId");
  const autoAssemble = searchParams.get("autoAssemble") === "true";

  useEffect(() => {
    document.title = "ManifestMyStory — Record Your Voice";

    // Add font stylesheet
    const fontLink = document.createElement("link");
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
  }, []);

  // Auto-assemble for morning stories — skip recording, use existing voice clone
  useEffect(() => {
    if (!autoAssemble || !storyId) return;

    const doAutoAssemble = async () => {
      try {
        // First approve the story text
        const storyRes = await fetch(`/api/user/stories/${storyId}`);
        if (storyRes.ok) {
          const storyData = await storyRes.json();
          const textToApprove = storyData.story_text_draft || storyData.story_text_approved;
          if (textToApprove) {
            await fetch(`/api/user/stories/${storyId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: textToApprove }),
            });
          }
        }

        // Then assemble audio
        await primeBrowserNotifications();
        const assembleRes = await fetch("/api/user/audio/assemble", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId }),
        });
        const assembleData = await assembleRes.json();

        if (assembleData.success) {
          router.push(`/user/audio-download?storyId=${storyId}`);
        } else {
          showToast(
            "Audio generation failed: " + (assembleData.error || "Unknown error"),
            "error",
          );
          router.push(`/user/dashboard`);
        }
      } catch (e) {
        console.error("Auto-assembly failed:", e);
        showToast("Failed to generate audio. Please try again.", "error");
        router.push(`/user/dashboard`);
      }
    };

    doAutoAssemble();
  }, [autoAssemble, storyId, router, showToast]);
  const [recState, setRecState] = useState<RecordingState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [quality, setQuality] = useState({
    text: "—",
    color: "var(--ink-faint)",
  });
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedVoices, setSavedVoices] = useState<VoiceSampleItem[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [deletingVoiceId, setDeletingVoiceId] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const handleSelectVoice = async (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setSavedVoices((prev) =>
      prev.map((v) => ({ ...v, is_default: v.id === voiceId }))
    );
    try {
      await fetch("/api/user/audio/save-voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: voiceId, setDefault: true }),
      });
    } catch (e) {
      console.error("Failed to save default voice:", e);
    }
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(0);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Fetch saved voices on mount
  useEffect(() => {
    const fetchSavedVoices = async () => {
      try {
        const res = await fetch("/api/user/audio/save-voice");
        if (res.ok) {
          const data = await res.json();
          setSavedVoices(data.voices || []);
          // Auto-select the default voice
          const defaultVoice = (data.voices || []).find(
            (v: VoiceSampleItem) => v.is_default,
          );
          if (defaultVoice) setSelectedVoiceId(defaultVoice.id);
        }
      } catch (e) {
        console.error("Failed to fetch saved voices:", e);
      } finally {
        setIsLoadingSaved(false);
      }
    };
    fetchSavedVoices();
  }, []);

  const handleRenameVoice = async (id: string, newLabel: string) => {
    try {
      const res = await fetch("/api/user/audio/save-voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label: newLabel }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedVoices((prev) =>
          prev.map((v) => (v.id === id ? { ...v, label: newLabel } : v)),
        );
        showToast("✓ Voice renamed");
      } else {
        showToast("❌ " + (data.error || "Failed to rename voice"));
      }
    } catch {
      showToast("❌ Failed to rename voice");
    }
  };

  const tips: TipItem[] = [
    {
      icon: <HomeIcon />,
      title: "Quiet environment",
      description:
        "Find a room with minimal echo and background noise. Close doors and windows.",
    },
    {
      icon: <MicIcon />,
      title: "Phone or laptop mic is fine",
      description:
        "You don't need special equipment. Hold your device 8–12 inches from your mouth.",
    },
    {
      icon: <ClockIcon />,
      title: "Read naturally",
      description:
        "Speak at a normal pace, as if you're reading to yourself. Relaxed and clear wins over slow and stiff.",
    },
    {
      icon: <RefreshIcon />,
      title: "You can re-record",
      description:
        "Don't worry about perfection. Listen back and re-record as many times as you need.",
    },
  ];

  // Update quality based on duration
  useEffect(() => {
    if (seconds < 15) {
      setQuality({ text: "Too Short", color: "var(--red)" });
    } else if (seconds < 25) {
      setQuality({ text: "Building…", color: "var(--gold)" });
    } else if (seconds < 50) {
      setQuality({ text: "Good", color: "var(--accent)" });
    } else {
      setQuality({ text: "Excellent ✓", color: "var(--accent)" });
    }
  }, [seconds]);

  // Handle recording timer
  useEffect(() => {
    if (recState === "recording") {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1;
          // Auto-stop at 90 seconds
          if (newSeconds >= 90) {
            stopRecording();
          }
          return newSeconds;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recState]);

  const [mimeType, setMimeType] = useState<string>("");

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Recording is not supported in this browser.", "error");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // ANALYZER FOR VISUAL FEEDBACK
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (
          recState === "recording" ||
          mediaRecorderRef.current?.state === "recording"
        ) {
          analyzer.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((p, c) => p + c, 0) / bufferLength;
          setAudioVolume(average / 255); // Normalized
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();

      // Detect best supported mime type (Safari prefers mp4/aac, others prefer webm)
      const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
      ];
      const supportedType =
        types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      setMimeType(supportedType);

      const options = supportedType ? { mimeType: supportedType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: supportedType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        // Do not set recordedDuration here — stopRecording already sets it
        // with the correct current seconds value. This closure captures stale seconds.
        audioCtx.close();
      };

      // Using a timeslice (500ms) ensures chunks are periodically captured
      // and helps prevent data loss in some environments.
      mediaRecorder.start(500);
      setRecState("recording");
      setSeconds(0);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      const msg =
        err.name === "NotAllowedError"
          ? "Microphone access denied. Please enable microphone permissions in your browser settings."
          : "Cannot access microphone. Please ensure your device has a working microphone.";
      showToast(msg, "error");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setRecState("stopped");
    setRecordedDuration(seconds);
  };

  const handleMicClick = () => {
    if (recState === "idle") {
      startRecording();
    } else if (recState === "recording") {
      stopRecording();
    }
  };

  const handleRetake = () => {
    setRecState("idle");
    setSeconds(0);
    setRecordedDuration(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleSaveVoice = async () => {
    if (!audioBlob) return;

    if (recordedDuration < 25) {
      showToast(
        `Your recording is too short (${recordedDuration}s). Please record at least 25 seconds of clear speech.`,
        "error"
      );
      return;
    }

    setIsSaving(true);
    try {
      const extension =
        mimeType.includes("mp4") || mimeType.includes("aac") ? "m4a" : "webm";
      const formData = new FormData();
      formData.append("audio", audioBlob, `sample.${extension}`);
      formData.append("duration", String(recordedDuration));

      const res = await fetch("/api/user/audio/save-voice", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSavedVoices((prev) => [data.voice, ...prev]);
        if (!selectedVoiceId) setSelectedVoiceId(data.voice.id);
      } else {
        showToast("Failed to save voice: " + (data.error || "Unknown error"), "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Could not upload voice. Please try again in a moment.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVoice = (voiceId: string) => {
    showConfirm({
      title: "Remove Voice Sample",
      message: "Remove this voice sample?",
      confirmText: "Remove",
      danger: true,
      onConfirm: async () => {
        setDeletingVoiceId(voiceId);
        try {
          const res = await fetch("/api/user/audio/save-voice", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: voiceId }),
          });
          const data = await res.json();
          if (data.success) {
            setSavedVoices((prev) => prev.filter((v) => v.id !== voiceId));
            if (selectedVoiceId === voiceId) setSelectedVoiceId(null);
          }
        } catch (e) {
          console.error(e);
          showToast("Failed to remove voice.", "error");
        } finally {
          setDeletingVoiceId(null);
        }
      },
    });
  };

  const handleUseSavedVoice = async (voice: VoiceSampleItem) => {
    // Warn if the saved voice has a very short duration
    if (voice.duration_s !== null && voice.duration_s < 25) {
      showToast(
        `This voice sample is only ${voice.duration_s}s long. For best results, use a sample that is at least 30–60 seconds. The generated voice may not sound like you.`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Set this voice as default first so clone-voice picks it up
      const patchRes = await fetch("/api/user/audio/save-voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: voice.id, setDefault: true }),
      });
      if (patchRes.ok) {
        setSavedVoices((prev) =>
          prev.map((v) => ({ ...v, is_default: v.id === voice.id }))
        );
        setSelectedVoiceId(voice.id);
      }

      // Clone using saved voice (clone-voice falls back to existing R2 sample)
      const cloneRes = await fetch("/api/user/audio/clone-voice", {
        method: "POST",
        body: new FormData(), // empty — triggers R2 fallback
      });
      const cloneData = await cloneRes.json();

      if (!cloneData.success) {
        const msg =
          cloneData.code === "VOICE_LIMIT_REACHED"
            ? "Voice limit reached on ElevenLabs. Please contact support."
            : cloneData.code === "SAMPLE_TOO_SHORT"
              ? cloneData.error
              : "Voice cloning failed: " + (cloneData.error || "Unknown error");
        showToast(msg, "error");
        return;
      }

      const resolvedStoryId = storyId || null;
      if (!resolvedStoryId) {
        showToast("No story found. Please create a story first.", "error");
        return;
      }

      const assembleRes = await fetch("/api/user/audio/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: resolvedStoryId }),
      });
      const assembleData = await assembleRes.json();

      if (assembleData.success) {
        router.push(`/user/audio-download?storyId=${resolvedStoryId}`);
      } else {
        showToast(
          "Audio generation failed: " + (assembleData.error || "Unknown error"),
          "error",
        );
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to generate audio. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;

    // ── Minimum duration check ───────────────────────────────────────────
    // ElevenLabs Instant Voice Cloning requires at least 30–60 seconds of
    // clear speech. Anything shorter produces a generic-sounding voice.
    if (recordedDuration < 25) {
      showToast(
        `Your recording is only ${recordedDuration}s. Please record at least 25 seconds of clear speech so we can accurately clone your voice.`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // ── Step 0: Save the voice sample so the user doesn't lose it ─────
      // This ensures the recording persists in the Voice Library for reuse
      // even when the user clicks "Generate" instead of "Save for Later".
      const extension =
        mimeType.includes("mp4") || mimeType.includes("aac") ? "m4a" : "webm";

      if (!savedVoices.some((v) => v.is_default) || savedVoices.length === 0) {
        try {
          const saveFormData = new FormData();
          saveFormData.append("audio", audioBlob, `sample.${extension}`);
          saveFormData.append("duration", String(recordedDuration));
          const saveRes = await fetch("/api/user/audio/save-voice", {
            method: "POST",
            body: saveFormData,
          });
          const saveData = await saveRes.json();
          if (saveData.success) {
            setSavedVoices((prev) => [saveData.voice, ...prev]);
            if (!selectedVoiceId) setSelectedVoiceId(saveData.voice.id);
          }
        } catch (e) {
          // Non-fatal — we can still proceed with cloning
          console.warn("Voice sample save failed (non-fatal):", e);
        }
      }

      // ── Step 1: Clone voice ONLY — no TTS generated here ──────────────
      // Uses the dedicated clone-voice endpoint so we don't waste an
      // ElevenLabs TTS credit before assembly runs.
      const cloneFormData = new FormData();
      cloneFormData.append("audio", audioBlob, `sample.${extension}`);

      const cloneRes = await fetch("/api/user/audio/clone-voice", {
        method: "POST",
        body: cloneFormData,
      });
      const cloneData = await cloneRes.json();

      if (!cloneData.success) {
        const msg =
          cloneData.code === "VOICE_LIMIT_REACHED"
            ? "Voice limit reached on ElevenLabs. Please contact support."
            : cloneData.code === "SAMPLE_TOO_SHORT"
              ? cloneData.error
              : "Voice cloning failed: " + (cloneData.error || "Unknown error");
        showToast(msg, "error");
        return;
      }

      // Resolve which story to assemble (prefer URL param, fall back to latest)
      const resolvedStoryId = storyId || null;
      if (!resolvedStoryId) {
        showToast("No story found. Please create a story first.", "error");
        return;
      }

      // ── Step 2: Full assembly — ONE ElevenLabs call for everything ──────
      // Pipeline: Induction → Opening Affirmations → Story → Closing Affirmations → Guide Close
      await primeBrowserNotifications();
      const assembleRes = await fetch("/api/user/audio/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: resolvedStoryId }),
      });
      const assembleData = await assembleRes.json();

      if (assembleData.success) {
      await primeBrowserNotifications();
        router.push(`/user/audio-download?storyId=${resolvedStoryId}`);
      } else {
        showToast(
          "Audio generation failed: " + (assembleData.error || "Unknown error"),
          "error",
        );
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to generate audio. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (s: number): string => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.container}>
      {/* PAGE */}
      <div className={styles.page}>
        {/* LEFT COLUMN - TIPS */}
        <aside className={styles.leftCol}>
          <div className={styles.infoCard}>
            <div className={styles.infoCardTitle}>Recording tips</div>
            <div className={styles.infoCardSub}>
              A clean 60-second sample is all we need to clone your voice
              accurately.
            </div>
            <div className={styles.tipList}>
              {tips.map((tip, index) => (
                <TipRow
                  key={index}
                  icon={tip.icon}
                  title={tip.title}
                  description={tip.description}
                />
              ))}
            </div>
          </div>

          <div className={`${styles.sampleScript} ${styles.desktopScript}`}>
            <div className={styles.sampleScriptLabel}>🎙 Before you record</div>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: "10px" }}>
              Read this passage the way you'd read the most important sentences
              of your life. Clear. Present. Strong enough to be trusted — gentle
              enough to hear yourself fall asleep to.
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--ink-faint)", lineHeight: 1.5, marginBottom: "12px" }}>
              Your voice will be used for both your evening story (played as you
              fall asleep) and your morning story (played as you wake up). A
              neutral, present, grounded recording works for both. Don't make it
              sleepy. Don't make it performative. Just make it true.
            </p>
            <div className={styles.sampleScriptLabel}>📖 Read this script</div>
            <p>
              I wake each morning with a quiet sense of purpose — knowing
              exactly who I am and where I'm headed. My days are filled with
              meaningful work, deep connection, and the kind of joy that doesn't
              need a reason. I am healthy, free, and fully alive to the beauty
              of the life I've built. Everything I once dreamed of is now simply
              the life I live.
            </p>
          </div>
        </aside>

        {/* CENTER COLUMN - RECORDER */}
        <div className={styles.centerCol}>
          <div className={`${styles.sampleScript} ${styles.mobileScript}`}>
            <div className={styles.sampleScriptLabel}>🎙 Before you record</div>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: "10px" }}>
              Read this passage the way you'd read the most important sentences
              of your life. Clear. Present. Strong enough to be trusted — gentle
              enough to hear yourself fall asleep to.
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--ink-faint)", lineHeight: 1.5, marginBottom: "12px" }}>
              Your voice will be used for both your evening story (played as you
              fall asleep) and your morning story (played as you wake up). A
              neutral, present, grounded recording works for both. Don't make it
              sleepy. Don't make it performative. Just make it true.
            </p>
            <div className={styles.sampleScriptLabel}>📖 Read this script</div>
            <p>
              I wake each morning with a quiet sense of purpose — knowing
              exactly who I am and where I'm headed. My days are filled with
              meaningful work, deep connection, and the kind of joy that doesn't
              need a reason. I am healthy, free, and fully alive to the beauty
              of the life I've built. Everything I once dreamed of is now simply
              the life I live.
            </p>
          </div>

          {/* SAVED VOICES LIST */}
          {!isLoadingSaved && savedVoices.length > 0 && (
            <SavedVoicesList
              voices={savedVoices}
              selectedId={selectedVoiceId}
              onSelect={handleSelectVoice}
              onDelete={handleDeleteVoice}
              onRename={handleRenameVoice}
              onUse={handleUseSavedVoice}
              isDeleting={deletingVoiceId}
              isSubmitting={isSubmitting}
              showToast={showToast}
            />
          )}

          {/* RECORDER CARD */}
          <div className={styles.recorderCard}>
            {/* MIC + STATUS */}
            <div className={styles.recTop}>
              <div
                className={`${styles.micRing} 
                    ${recState === "recording" ? styles.recording : ""}
                    ${recState === "stopped" ? styles.hasRecording : ""}`}
                onClick={handleMicClick}
              >
                <div className={styles.micRingBg} />
                <div className={styles.micIcon}>
                  {recState === "stopped" ? <CheckIcon /> : <MicIcon />}
                </div>
              </div>

              <div className={styles.recStatus}>
                {recState === "idle" && "Tap to start recording"}
                {recState === "recording" && "Recording… tap to stop"}
                {recState === "stopped" && "Recording saved"}
              </div>

              <div
                className={styles.recHint}
                style={{
                  color:
                    recState === "recording"
                      ? "var(--red)"
                      : recState === "stopped"
                        ? "var(--accent)"
                        : "",
                }}
              >
                {recState === "idle" &&
                  "Read the sample script on the left at a natural pace for 60 seconds"}
                {recState === "recording" &&
                  "Speak clearly at a relaxed, natural pace"}
                {recState === "stopped" &&
                  `${formatTime(recordedDuration)} recorded — listen back below, then continue`}
              </div>
            </div>

            {/* TIMER */}
            <div className={styles.timerRow}>
              <div>
                <div className={styles.timerLabel}>Recorded</div>
                <TimerDisplay
                  seconds={seconds}
                  isRecording={recState === "recording"}
                />
              </div>

              <div className={styles.timerDivider} />

              <div className={styles.timerTarget}>
                <div className={styles.timerLabel}>Target</div>
                <div className={styles.timerTargetVal}>1:00</div>
              </div>

              <div className={styles.timerDivider} />

              <div>
                <div className={styles.timerLabel}>Quality</div>
                <div
                  className={styles.qualityLabel}
                  style={{ color: quality.color }}
                >
                  {quality.text}
                </div>
              </div>
            </div>

            {/* WAVEFORM */}
            <Waveform
              isRecording={recState === "recording"}
              isStopped={recState === "stopped"}
              duration={seconds}
              volume={audioVolume}
            />

            {/* CONTROLS */}
            <div className={styles.recControls}>
              <button
                className={`${styles.ctrlBtn} ${styles.secondary}`}
                onClick={handleRetake}
                disabled={recState === "idle" || recState === "recording"}
              >
                <RefreshIcon />
                Re-record
              </button>

              <button
                className={`${styles.ctrlBtn} 
                    ${recState === "recording" ? styles.danger : styles.primary}`}
                onClick={handleMicClick}
              >
                {recState === "recording" ? (
                  <>
                    <StopIcon />
                    Stop
                  </>
                ) : recState === "stopped" ? (
                  <>
                    <CheckIcon />
                    Saved
                  </>
                ) : (
                  <>
                    <MicIcon />
                    Start Recording
                  </>
                )}
              </button>
            </div>
          </div>

          {recState === "stopped" && (
            <Playback
              duration={recordedDuration}
              audioUrl={audioUrl}
              onReRecord={handleRetake}
            />
          )}

          {/* SUBMIT */}
          {recState === "stopped" && (
            <div className={`${styles.submitArea} ${styles.visible}`}>
              <div className={styles.submitNote}>
                <InfoIcon />
                <span>
                  Your voice sample will be used <strong>only</strong> to
                  generate your personal audio story. It is never shared, sold,
                  or used for any other purpose.
                </span>
              </div>

              <div className={styles.submitBtnGroup}>
                <button
                  className={styles.saveVoiceBtn}
                  onClick={handleSaveVoice}
                  disabled={isSaving || isSubmitting || !audioBlob}
                >
                  {isSaving ? "Saving…" : "Save Voice for Later"}
                </button>

                <button
                  className={styles.submitBtn}
                  onClick={handleSubmit}
                  disabled={isSubmitting || isSaving}
                >
                  {isSubmitting ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <MicIcon />
                      Generate My Audio Story
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isSubmitting && (
        <div className={styles.fullPageOverlay}>
          <div className={styles.overlaySpinner} />
          <div className={styles.overlayText}>Generating your audio story…</div>
          <div className={styles.overlaySubtext}>
            This may take a minute or two. Please don't close this page.
          </div>
        </div>
      )}
    </div>
  );
};

const VoiceRecording: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VoiceRecordingContent />
    </Suspense>
  );
};

export default VoiceRecording;
