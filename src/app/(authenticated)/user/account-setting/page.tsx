"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, signOut } from "next-auth/react";
import { format } from "date-fns";
import styles from "../../../styles/AccountSettings.module.css";
import {
  PlusIcon,
  ArrowLeftIcon,
  UserIcon,
  MicIcon,
  BellIcon,
  StarIcon,
  WarningIcon,
  PlayIcon,
  RefreshIcon,
  DeleteIcon,
  StopIcon,
} from "../../../components/icons/SettingsIcons";
import {
  UserProfile,
  VoiceModel,
  NotificationSettings,
  PlanDetails,
} from "../../../types/settings";
import { useGlobalUI } from "@/components/ui/global-ui-context";

// ── Extra icons for V2 features ───────────────────────────────────────────────
const SoundwaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 10v4M6 6v12M10 3v18M14 6v12M18 10v4M22 12" />
  </svg>
);

const HeadphonesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

// Settings Section Header Component
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconColor?: "default" | "gold";
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  subtitle,
  iconColor = "default",
}) => (
  <div className={styles.sectionHead}>
    <div
      className={`${styles.sectionIcon} ${iconColor === "gold" ? styles.gold : ""}`}
    >
      {icon}
    </div>
    <div>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.sectionSub}>{subtitle}</div>
    </div>
  </div>
);

// Form Row Component
interface FormRowProps {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  onEdit?: () => void;
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  inputType?: string;
  children?: React.ReactNode;
}

const FormRow: React.FC<FormRowProps> = ({
  label,
  value,
  onChange,
  onEdit,
  isEditing,
  onSave,
  onCancel,
  inputType = "text",
  children,
}) => (
  <div className={styles.formRow}>
    <div className={styles.rowLabel}>{label}</div>
    <div className={styles.rowValue}>
      {children || (
        <>
          <input
            className={styles.formInput}
            type={inputType}
            value={value}
            disabled={!isEditing}
            onChange={(e) => onChange && onChange(e.target.value)}
          />
          {!isEditing && onEdit && (
            <button className={styles.editBtn} onClick={onEdit}>
              Edit
            </button>
          )}
          {isEditing && (
            <>
              <button className={styles.saveBtn} onClick={onSave}>
                Save
              </button>
              <button className={styles.cancelBtn} onClick={onCancel}>
                Cancel
              </button>
            </>
          )}
        </>
      )}
    </div>
  </div>
);

// Toggle Row Component
interface ToggleRowProps {
  label: string;
  subtitle: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  subtitle,
  checked,
  onChange,
}) => (
  <div className={styles.toggleRow}>
    <div className={styles.toggleText}>
      <div className={styles.toggleLabel}>{label}</div>
      <div className={styles.toggleSub}>{subtitle}</div>
    </div>
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.slider} />
    </label>
  </div>
);

// Danger Section Component
interface DangerRowProps {
  label: string;
  subtitle: string;
  buttonText: string;
  onConfirm: () => void;
}

const DangerRow: React.FC<DangerRowProps> = ({
  label,
  subtitle,
  buttonText,
  onConfirm,
}) => (
  <div className={styles.dangerRow}>
    <div>
      <div className={styles.dangerRowLabel}>{label}</div>
      <div className={styles.dangerRowSub}>{subtitle}</div>
    </div>
    <button className={styles.dangerBtn} onClick={onConfirm}>
      {buttonText}
    </button>
  </div>
);

// Voice Model Component
interface VoiceModelProps {
  model: VoiceModel;
  sampleUrl?: string | null;
  onPlay: () => void;
  onReRecord: () => void;
  onDelete: () => void;
}

const VoiceModelCard: React.FC<VoiceModelProps> = ({
  model,
  sampleUrl,
  onPlay,
  onReRecord,
  onDelete,
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handlePlay = () => {
    if (!sampleUrl) {
      onPlay(); // fallback to parent toast
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(sampleUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className={styles.voiceRow}>
      <div className={styles.voiceInfo}>
        <div className={styles.voiceAvatar}>
          <MicIcon />
        </div>
        <div>
          <div className={styles.voiceName}>{model.name}</div>
          <div className={styles.voiceMeta}>
            Created {format(model.createdDate, "MMMM d, yyyy")} &nbsp;·&nbsp;
            Used in {model.storyCount} stories &nbsp;·&nbsp; Powered by{" "}
            {model.provider}
          </div>
        </div>
      </div>
      <div className={styles.voiceBtns}>
        <button
          className={`${styles.vbtn} ${styles.outline}`}
          onClick={handlePlay}
        >
          {isPlaying ? <StopIcon /> : <PlayIcon />}
          {isPlaying ? "Stop" : "Play Sample"}
        </button>
        <button
          className={`${styles.vbtn} ${styles.outline}`}
          onClick={onReRecord}
        >
          <RefreshIcon />
          Re-record Voice
        </button>
        <button className={`${styles.vbtn} ${styles.red}`} onClick={onDelete}>
          <DeleteIcon />
          Delete Voice Model
        </button>
      </div>
    </div>
  );
};

// ── PauseIcon (not in SettingsIcons) ──────────────────────────────────────────
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

// ── Saved Voice type ─────────────────────────────────────────────────────────
interface VoiceSampleItem {
  id: string;
  label: string;
  sample_url: string;
  duration_s: number | null;
  is_default: boolean;
  created_at: string;
}

// ── Inline Voice Recorder ────────────────────────────────────────────────────
type RecState = "idle" | "recording" | "stopped";

interface InlineRecorderProps {
  onSaved: (voice: VoiceSampleItem) => void;
  showToast: (msg: string) => void;
  voiceCount: number;
}

const InlineRecorder: React.FC<InlineRecorderProps> = ({
  onSaved,
  showToast,
  voiceCount,
}) => {
  const [recState, setRecState] = useState<RecState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [mimeType, setMimeType] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (recState === "recording") {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= 90) stopRecording();
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recState]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        showToast("Recording not supported in this browser");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
      ];
      const supported =
        types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
      setMimeType(supported);

      const recorder = new MediaRecorder(
        stream,
        supported ? { mimeType: supported } : {},
      );
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: supported || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
      };

      recorder.start(500);
      setRecState("recording");
      setSeconds(0);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    } catch (err: any) {
      const msg =
        err.name === "NotAllowedError"
          ? "Microphone access denied. Check browser permissions."
          : "Cannot access microphone.";
      showToast(msg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setRecState("stopped");
  };

  const handleMicClick = () => {
    if (recState === "idle") startRecording();
    else if (recState === "recording") stopRecording();
  };

  const handleReset = () => {
    setRecState("idle");
    setSeconds(0);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setLabelInput("");
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (isPlaying) {
      playbackRef.current?.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrl);
      playbackRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!audioBlob) return;
    if (voiceCount >= 5) {
      showToast("Maximum 5 voices. Delete one first.");
      return;
    }
    setIsSaving(true);
    try {
      const ext =
        mimeType.includes("mp4") || mimeType.includes("aac") ? "m4a" : "webm";
      const fd = new FormData();
      fd.append("audio", audioBlob, `sample.${ext}`);
      fd.append("duration", String(seconds));
      if (labelInput.trim()) fd.append("label", labelInput.trim());

      const res = await fetch("/api/user/audio/save-voice", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.voice);
        handleReset();
        showToast("✓ Voice saved");
      } else {
        showToast("❌ " + (data.error || "Failed to save"));
      }
    } catch {
      showToast("❌ Failed to save voice");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.inlineRecorder}>
      <div className={styles.recorderRow}>
        <button
          className={`${styles.recorderMicBtn} ${recState === "recording" ? styles.recorderMicRecording : ""} ${recState === "stopped" ? styles.recorderMicDone : ""}`}
          onClick={handleMicClick}
          disabled={recState === "stopped"}
        >
          {recState === "recording" ? <StopIcon /> : <MicIcon />}
        </button>

        <div className={styles.recorderInfo}>
          <div className={styles.recorderStatus}>
            {recState === "idle" && "Tap mic to record your voice"}
            {recState === "recording" && `Recording… ${fmtTime(seconds)}`}
            {recState === "stopped" && `Recorded ${fmtTime(seconds)}`}
          </div>
          {recState === "idle" && (
            <div className={styles.recorderHint}>
              Read naturally for ~60 seconds. Quiet room works best.
            </div>
          )}
          {recState === "recording" && (
            <div className={styles.recorderTimer}>
              <div
                className={styles.recorderTimerFill}
                style={{ width: `${Math.min((seconds / 60) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {recState === "stopped" && (
        <div className={styles.recorderActions}>
          <button
            className={`${styles.vbtn} ${styles.outline}`}
            onClick={togglePlayback}
          >
            {isPlaying ? <StopIcon /> : <PlayIcon />}
            {isPlaying ? "Stop" : "Listen"}
          </button>
          <button
            className={`${styles.vbtn} ${styles.outline}`}
            onClick={handleReset}
          >
            <RefreshIcon />
            Re-record
          </button>
          <input
            className={styles.recorderLabelInput}
            placeholder="Voice name (optional)"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
          />
          <button
            className={`${styles.vbtn} ${styles.solid}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            <PlusIcon />
            {isSaving ? "Saving…" : "Save Voice"}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Saved Voices List ────────────────────────────────────────────────────────
interface SavedVoicesProps {
  voices: VoiceSampleItem[];
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

const SavedVoices: React.FC<SavedVoicesProps> = ({
  voices,
  onSetDefault,
  onDelete,
  deletingId,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (v: VoiceSampleItem) => {
    if (playingId === v.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const a = new Audio(v.sample_url);
      audioRef.current = a;
      a.onended = () => setPlayingId(null);
      a.play();
      setPlayingId(v.id);
    }
  };

  const fmtDur = (s: number | null) => {
    if (!s) return "—";
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  if (voices.length === 0) return null;

  return (
    <div className={styles.savedVoicesList}>
      {voices.map((v) => (
        <div
          key={v.id}
          className={`${styles.savedVoiceItem} ${v.is_default ? styles.savedVoiceDefault : ""}`}
        >
          <div className={styles.savedVoiceItemIcon}>
            <MicIcon />
          </div>
          <div className={styles.savedVoiceItemInfo}>
            <div className={styles.savedVoiceItemLabel}>
              {v.label}
              {v.is_default && (
                <span className={styles.savedVoiceDefaultTag}>Default</span>
              )}
            </div>
            <div className={styles.savedVoiceItemMeta}>
              {fmtDur(v.duration_s)} ·{" "}
              {format(new Date(v.created_at), "MMM d, yyyy")}
            </div>
          </div>
          <div className={styles.savedVoiceItemBtns}>
            <button
              className={`${styles.vbtn} ${styles.outline}`}
              onClick={() => togglePlay(v)}
            >
              {playingId === v.id ? <StopIcon /> : <PlayIcon />}
            </button>
            {!v.is_default && (
              <button
                className={`${styles.vbtn} ${styles.outline}`}
                onClick={() => onSetDefault(v.id)}
              >
                Set Default
              </button>
            )}
            <button
              className={`${styles.vbtn} ${styles.red}`}
              onClick={() => onDelete(v.id)}
              disabled={deletingId === v.id}
            >
              <DeleteIcon />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const NONE_SOUNDSCAPE = {
  value: "none",
  label: "None",
  emoji: "🔇",
  desc: "Story audio only",
  imageUrl: undefined,
};

interface SoundscapeSelectorProps {
  current: string;
  disabled?: boolean;
  dynamicAssets: any[];
  onChange: (val: string) => void;
}

const SoundscapeSelector: React.FC<SoundscapeSelectorProps> = ({
  current,
  disabled,
  dynamicAssets,
  onChange,
}) => {
  // Only show 'none' and the dynamic assets from the admin
  const allChoices = [
    NONE_SOUNDSCAPE,
    ...dynamicAssets.map((a) => ({
      value: a.value,
      label: a.title,
      emoji: "🎵",
      desc: "Ambient soundscape",
      imageUrl: a.image_url,
    })),
  ];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        padding: "4px 0",
      }}
    >
      {allChoices.map((s) => (
        <button
          key={s.value}
          onClick={() => !disabled && onChange(s.value)}
          disabled={disabled}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            padding: s.imageUrl ? "0" : "10px 14px",
            borderRadius: "12px",
            cursor: disabled ? "not-allowed" : "pointer",
            border:
              current === s.value
                ? "2px solid #52b788"
                : "2px solid rgba(255,255,255,0.08)",
            background:
              current === s.value
                ? "rgba(82,183,136,0.1)"
                : "rgba(255,255,255,0.03)",
            color: current === s.value ? "#52b788" : "#8a8476",
            transition: "all 0.2s",
            fontSize: "0.78rem",
            minWidth: "100px",
            height: "100px",
            opacity: disabled ? 0.45 : 1,
            position: "relative",
            overflow: "hidden",
            boxShadow:
              current === s.value
                ? "0 4px 15px rgba(82, 183, 136, 0.2)"
                : "none",
          }}
          title={s.desc}
        >
          {s.imageUrl ? (
            <>
              <img
                src={s.imageUrl}
                alt=""
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: current === s.value ? 0.9 : 0.65,
                  zIndex: 0,
                  transition: "opacity 0.2s",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(8, 7, 15, 0.9) 0%, rgba(8, 7, 15, 0) 70%)",
                  zIndex: 1,
                }}
              ></div>
              <span
                style={{
                  fontWeight: current === s.value ? 600 : 500,
                  zIndex: 2,
                  position: "absolute",
                  bottom: "12px",
                  color: current === s.value ? "#fff" : "rgba(255,255,255,0.8)",
                  textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                }}
              >
                {s.label}
              </span>
              {current === s.value && (
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#52b788",
                    zIndex: 2,
                    boxShadow: "0 0 8px #52b788",
                  }}
                ></div>
              )}
            </>
          ) : (
            <>
              <span
                style={{ fontSize: "1.6rem", zIndex: 1, marginBottom: "4px" }}
              >
                {s.emoji}
              </span>
              <span
                style={{
                  fontWeight: current === s.value ? 600 : 400,
                  zIndex: 1,
                  color: current === s.value ? "#52b788" : "#8a8476",
                }}
              >
                {s.label}
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
};

// Main Component
const AccountSettings: React.FC = () => {
  const router = useRouter();
  const { showToast, showConfirm } = useGlobalUI();

  useEffect(() => {
    document.title = "ManifestMyStory — Account Settings";

    // Add font if it doesn't exist
    if (!document.getElementById("dm-fonts")) {
      const link = document.createElement("link");
      link.id = "dm-fonts";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const queryClient = useQueryClient();
  const { data: session, update } = useSession();

  // Fetch user settings
  const { data: userData, isLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const res = await fetch("/api/user/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Fetch dynamic soundscapes
  const { data: soundscapeData } = useQuery({
    queryKey: ["available-soundscapes"],
    queryFn: async () => {
      const res = await fetch("/api/user/soundscapes");
      if (!res.ok) throw new Error("Failed to fetch soundscapes");
      return res.json();
    },
  });
  const dynamicAssets = soundscapeData?.assets || [];

  // Fetch saved voices
  const { data: savedVoicesData } = useQuery({
    queryKey: ["saved-voices"],
    queryFn: async () => {
      const res = await fetch("/api/user/audio/save-voice");
      if (!res.ok) throw new Error("Failed to fetch voices");
      return res.json();
    },
  });
  const [savedVoices, setSavedVoices] = useState<VoiceSampleItem[]>([]);
  const [deletingVoiceId, setDeletingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (savedVoicesData?.voices) setSavedVoices(savedVoicesData.voices);
  }, [savedVoicesData]);

  const handleVoiceSaved = (voice: VoiceSampleItem) => {
    setSavedVoices((prev) => [voice, ...prev]);
    queryClient.invalidateQueries({ queryKey: ["user-settings"] });
  };

  const handleSetDefaultVoice = async (id: string) => {
    try {
      const res = await fetch("/api/user/audio/save-voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, setDefault: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedVoices((prev) =>
          prev.map((v) => ({ ...v, is_default: v.id === id })),
        );
        showToast("✓ Default voice updated");
        queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      }
    } catch {
      showToast("❌ Failed to update default voice");
    }
  };

  const handleDeleteSavedVoice = (id: string) => {
    showConfirm({
      title: "Delete Voice Sample",
      message: "Delete this voice sample?",
      confirmText: "Delete",
      danger: true,
      onConfirm: async () => {
        setDeletingVoiceId(id);
        try {
          const res = await fetch("/api/user/audio/save-voice", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          const data = await res.json();
          if (data.success) {
            setSavedVoices((prev) => prev.filter((v) => v.id !== id));
            showToast("✓ Voice deleted");
            queryClient.invalidateQueries({ queryKey: ["user-settings"] });
          }
        } catch {
          showToast("❌ Failed to delete voice");
        } finally {
          setDeletingVoiceId(null);
        }
      },
    });
  };

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      showToast("✓ Changes saved");
      setEditingField(null);
    },
    onError: () => {
      showToast("❌ Failed to save changes");
    },
  });

  // Delete all stories mutation
  const deleteStoriesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/stories", { method: "DELETE" });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to delete stories");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      showToast("✓ All stories deleted");
    },
    onError: (err: any) => {
      console.error("[DELETE_STORIES]", err);
      showToast("❌ Failed to delete stories");
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/settings", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: () => {
      showToast("✓ Account deleted");
      signOut({ callbackUrl: "/" });
    },
    onError: () => {
      showToast("❌ Failed to delete account");
    },
  });

  // Edit states
  const [editingField, setEditingField] = useState<"name" | "email" | null>(
    null,
  );
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [betaCodeInput, setBetaCodeInput] = useState("");
  const [isRedeemingBeta, setIsRedeemingBeta] = useState(false);

  const isEditingName = editingField === "name";
  const isEditingEmail = editingField === "email";

  useEffect(() => {
    if (userData) {
      setNameInput(userData.name || "");
      setEmailInput(userData.email || "");
    }
  }, [userData]);

  const handleEdit = (field: "name" | "email") => {
    setEditingField(field);
  };

  const handleSave = (field: "name" | "email") => {
    if (field === "name") {
      updateSettingsMutation.mutate({ name: nameInput });
    } else if (field === "email") {
      // Usually email changes require more verification, but we'll allow it for now
      updateSettingsMutation.mutate({ email: emailInput });
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    if (userData) {
      setNameInput(userData.name || "");
      setEmailInput(userData.email || "");
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    const backendKeyMap: Record<string, string> = {
      morningReminder: "morning_reminder",
      eveningReminder: "evening_reminder",
      streakMilestones: "streak_milestones",
      productUpdates: "product_updates",
    };

    const backendKey = backendKeyMap[key] || key;
    updateSettingsMutation.mutate({ [backendKey]: value });
  };

  const handlePlaySample = () => {
    if (!userData?.voice_sample_url) {
      showToast("No sample available yet — re-record your voice first.");
    }
    // Playback is handled inside VoiceModelCard when sampleUrl is provided
  };

  const handleReRecord = () => {
    router.push("/user/voice-recording");
  };

  const handleDeleteVoice = () => {
    showConfirm({
      title: "Delete Voice Model",
      message:
        "Delete your voice model? Your existing audio stories will still play, but you won't be able to generate new ones until you re-record. This cannot be undone.",
      confirmText: "Delete",
      danger: true,
      onConfirm: () => {
        // TODO: API call to delete voice model
        showToast("Voice model deleted");
      },
    });
  };

  const handlePasswordChange = () => {
    showToast("✉ Password reset email sent");
  };

  const handleRedeemBeta = async () => {
    if (!betaCodeInput.trim()) return;

    setIsRedeemingBeta(true);
    try {
      const res = await fetch("/api/beta/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: betaCodeInput.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(`❌ ${data.error || "Failed to redeem code"}`);
      } else {
        showToast(`✓ Beta code redeemed! Your plan is now active.`);
        setBetaCodeInput("");
        queryClient.invalidateQueries({ queryKey: ["user-settings"] });
        // Refresh the session to update the plan in the UI
        update();
      }
    } catch (error) {
      showToast("❌ An error occurred while redeeming the code.");
    } finally {
      setIsRedeemingBeta(false);
    }
  };

  const handleDeleteStories = () => {
    showConfirm({
      title: "Delete All Stories",
      message:
        "Permanently delete all stories and audio files? This cannot be undone.",
      confirmText: "Delete All",
      danger: true,
      onConfirm: () => {
        deleteStoriesMutation.mutate();
      },
    });
  };

  const handleDeleteAccount = () => {
    showConfirm({
      title: "Delete Account",
      message:
        "Permanently delete your account? Everything — stories, audio, voice model — will be lost forever. This cannot be undone.",
      confirmText: "Delete Account",
      danger: true,
      onConfirm: () => {
        deleteAccountMutation.mutate();
      },
    });
  };

  if (isLoading)
    return (
      <div className={styles.container}>
        <div className={styles.page}>Loading settings...</div>
      </div>
    );
  if (!userData)
    return (
      <div className={styles.container}>
        <div className={styles.page}>Error loading settings</div>
      </div>
    );

  const isActuallyBeta = userData.isBetaUser && !userData.stripeSubscriptionId;
  const betaDisplayName =
    userData.betaPlanName ||
    (userData.plan
      ? userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1)
      : "Beta");
  const planDisplayName = isActuallyBeta
    ? betaDisplayName
    : userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1);

  return (
    <>
      <div className={styles.container}>
        <main className={styles.page}>
          {/* Back Link */}
          <Link href="/user/dashboard" className={styles.backLink}>
            <ArrowLeftIcon />
            Back to Dashboard
          </Link>

          <h1 className={styles.pageTitle}>Account Settings</h1>
          <p className={styles.pageSub}>
            Manage your profile, voice model, notifications, and account.
          </p>

          {/* Profile Section */}
          <div className={styles.settingsSection}>
            <SectionHeader
              icon={<UserIcon />}
              title="Profile"
              subtitle="Your name and contact information"
            />

            <FormRow
              label="Full Name"
              value={isEditingName ? nameInput : userData.name}
              onChange={(val) => setNameInput(val)}
              isEditing={isEditingName}
              onEdit={() => handleEdit("name")}
              onSave={() => handleSave("name")}
              onCancel={handleCancel}
            />

            <FormRow
              label="Email"
              value={isEditingEmail ? emailInput : userData.email}
              onChange={(val) => setEmailInput(val)}
              inputType="email"
              isEditing={isEditingEmail}
              onEdit={() => handleEdit("email")}
              onSave={() => handleSave("email")}
              onCancel={handleCancel}
            />

            <FormRow label="Password" value="••••••••••••">
              <span className={styles.pwDots}>••••••••••••</span>
              <button className={styles.editBtn} onClick={handlePasswordChange}>
                Change
              </button>
            </FormRow>

            <FormRow
              label="Sign-in Method"
              value={
                userData.auth_provider === "email"
                  ? "Email & Password"
                  : userData.auth_provider
              }
            />
          </div>

          {/* Voice Model Section */}
          <div className={styles.settingsSection}>
            <SectionHeader
              icon={<MicIcon />}
              title="Your Voice Model"
              subtitle="The cloned voice used to narrate your stories"
            />

            {userData.voice_model_id ? (
              <VoiceModelCard
                model={{
                  name: "My Voice Model",
                  createdDate: new Date(userData.createdAt),
                  storyCount: userData._count?.stories || 0,
                  provider: "ElevenLabs",
                }}
                sampleUrl={userData.voice_sample_url ?? null}
                onPlay={handlePlaySample}
                onReRecord={handleReRecord}
                onDelete={handleDeleteVoice}
              />
            ) : (
              <div className={styles.voiceRow}>
                <div className={styles.voiceInfo}>
                  <div className={styles.voiceAvatar}>
                    <MicIcon />
                  </div>
                  <div>
                    <div className={styles.voiceName}>No Voice Model Yet</div>
                    <div className={styles.voiceMeta}>
                      Record your voice below to save it for audio generation
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Recorder */}
            <InlineRecorder
              onSaved={handleVoiceSaved}
              showToast={showToast}
              voiceCount={savedVoices.length}
            />

            {/* Saved Voices */}
            {savedVoices.length > 0 && (
              <div style={{ padding: "0 1.4rem 1rem" }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--ink-faint)",
                    marginBottom: "0.6rem",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Saved Voices ({savedVoices.length}/5)
                </div>
                <SavedVoices
                  voices={savedVoices}
                  onSetDefault={handleSetDefaultVoice}
                  onDelete={handleDeleteSavedVoice}
                  deletingId={deletingVoiceId}
                />
              </div>
            )}
          </div>

          {/* Notifications Section */}
          <div className={styles.settingsSection}>
            <SectionHeader
              icon={<BellIcon />}
              title="Notifications"
              subtitle="Reminders to keep your daily listening practice"
            />

            <ToggleRow
              label="Morning listening reminder"
              subtitle="Daily nudge to listen to your story when you wake up"
              checked={userData.morning_reminder}
              onChange={(val) =>
                handleNotificationChange("morningReminder", val)
              }
            />

            <ToggleRow
              label="Evening listening reminder"
              subtitle="Reminder before bed to complete your daily practice"
              checked={userData.evening_reminder}
              onChange={(val) =>
                handleNotificationChange("eveningReminder", val)
              }
            />

            <ToggleRow
              label="Streak milestones"
              subtitle="Celebrate when you hit 7, 30, and 60-day listening streaks"
              checked={userData.streak_milestones}
              onChange={(val) =>
                handleNotificationChange("streakMilestones", val)
              }
            />

            <ToggleRow
              label="Product updates & tips"
              subtitle="Occasional emails about new features and manifestation techniques"
              checked={userData.product_updates}
              onChange={(val) =>
                handleNotificationChange("productUpdates", val)
              }
            />
          </div>

          {/* Soundscape Section — Manifester + Amplifier */}
          <div className={styles.settingsSection}>
            <SectionHeader
              icon={<SoundwaveIcon />}
              title="Background Soundscape"
              subtitle="Ambient audio mixed softly beneath your story at −18 dB"
            />
            {userData.plan === "free" || userData.plan === "activator" ? (
              <div
                style={{
                  padding: "16px 24px",
                  color: "#5a5650",
                  fontSize: "0.88rem",
                }}
              >
                🔒 Soundscapes are available on Manifester and Amplifier plans.{" "}
                <Link
                  href="/pricing"
                  style={{ color: "#c9a84c", textDecoration: "underline" }}
                >
                  Upgrade →
                </Link>
              </div>
            ) : (
              <div style={{ padding: "16px 24px" }}>
                <p
                  style={{
                    fontSize: "0.83rem",
                    color: "#6a6460",
                    marginBottom: "14px",
                  }}
                >
                  Your chosen soundscape is mixed into every new audio file you
                  generate. Two versions are stored: story-only and with
                  soundscape.
                </p>
                <SoundscapeSelector
                  current={userData.soundscape ?? "none"}
                  dynamicAssets={dynamicAssets}
                  onChange={(val) =>
                    updateSettingsMutation.mutate({ soundscape: val })
                  }
                />
              </div>
            )}
          </div>

          {/* Binaural Beats Section — Amplifier only */}
          <div className={styles.settingsSection}>
            <SectionHeader
              icon={<HeadphonesIcon />}
              title="Binaural Beats"
              subtitle="Theta frequency (4–8 Hz) layered softly under the full audio at −18 dB"
              iconColor="gold"
            />
            {userData.plan !== "amplifier" ? (
              <div
                style={{
                  padding: "16px 24px",
                  color: "#5a5650",
                  fontSize: "0.88rem",
                }}
              >
                🔒 Binaural beats are an Amplifier exclusive.{" "}
                <Link
                  href="/pricing"
                  style={{ color: "#c9a84c", textDecoration: "underline" }}
                >
                  Upgrade →
                </Link>
              </div>
            ) : (
              <>
                <ToggleRow
                  label="Enable Binaural Beats"
                  subtitle="Theta waves promote deep focus and receptivity during listening"
                  checked={userData.binaural_enabled ?? false}
                  onChange={(val) =>
                    updateSettingsMutation.mutate({ binaural_enabled: val })
                  }
                />
                {userData.binaural_enabled && (
                  <div
                    style={{
                      margin: "0 24px 16px",
                      padding: "12px 16px",
                      background: "rgba(201,168,76,0.06)",
                      border: "1px solid rgba(201,168,76,0.18)",
                      borderRadius: "10px",
                      fontSize: "0.84rem",
                      color: "#8a8476",
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>🎧</span>
                    <span>
                      Best experienced with{" "}
                      <strong style={{ color: "#c9a84c" }}>headphones</strong>.
                      Binaural beats require separate audio channels to create
                      the effect. Speaker playback will not produce the theta
                      frequency result.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Plan Summary Section */}
          <div className={styles.settingsSection}>
            <SectionHeader
              icon={<StarIcon />}
              title={`Current Plan — ${planDisplayName.toUpperCase()}`}
              subtitle={
                isActuallyBeta
                  ? `${betaDisplayName} (Beta — 2 month trial)${userData.betaExpiresAt ? ` · Expires ${format(new Date(userData.betaExpiresAt), "MMMM d, yyyy")}` : ""}`
                  : `${userData.plan === "free" ? "Free Plan" : userData.plan === "activator" ? "$9.99 one-time" : userData.plan === "manifester" ? "$19.99/month" : "$39.99/month"} · Active since ${format(new Date(userData.createdAt), "MMMM d, yyyy")}`
              }
              iconColor="gold"
            />

            <FormRow
              label="Stories created"
              value={`${userData._count?.stories || 0} stories`}
            />

            <FormRow label="Manage plan" value="Upgrade, downgrade, or cancel">
              <input
                className={styles.formInput}
                value="Upgrade, downgrade, or cancel"
                disabled
              />
              <Link href="/user/manage-subscription">
                <button className={styles.editBtn}>Manage →</button>
              </Link>
            </FormRow>
          </div>

          {/* Beta Code Section */}
          <div className={styles.settingsSection}>
            <SectionHeader
              icon={<StarIcon />}
              title="Redeem Beta Code"
              subtitle="Enter a beta or VIP code for special access"
            />
            <div className={styles.formRow}>
              <div className={styles.rowLabel}>Beta Code</div>
              <div className={styles.rowValue}>
                <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="Enter code (e.g. VIP-BETA)"
                    value={betaCodeInput}
                    onChange={(e) =>
                      setBetaCodeInput(e.target.value.toUpperCase())
                    }
                    style={{ textTransform: "uppercase" }}
                  />
                  <button
                    className={styles.saveBtn}
                    onClick={handleRedeemBeta}
                    disabled={!betaCodeInput.trim() || isRedeemingBeta}
                    style={{ minWidth: "100px" }}
                  >
                    {isRedeemingBeta ? "Redeeming..." : "Redeem"}
                  </button>
                </div>
              </div>
            </div>
            {isActuallyBeta && (
              <div
                style={{
                  padding: "0 24px 16px",
                  fontSize: "0.84rem",
                  color: "var(--accent-mid)",
                }}
              >
                ✓ You currently have an active beta plan.
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className={styles.dangerSection}>
            <div className={styles.dangerHead}>
              <div className={styles.dangerIcon}>
                <WarningIcon />
              </div>
              <div>
                <div className={styles.dangerTitle}>Danger Zone</div>
                <div className={styles.dangerSub}>
                  These actions are permanent and cannot be undone
                </div>
              </div>
            </div>

            <DangerRow
              label="Delete all stories"
              subtitle="Permanently removes all stories and audio files. Your account stays active."
              buttonText="Delete All Stories"
              onConfirm={handleDeleteStories}
            />

            <DangerRow
              label="Delete account"
              subtitle="Permanently deletes your account, all stories, audio files, and voice model."
              buttonText="Delete Account"
              onConfirm={handleDeleteAccount}
            />
          </div>
        </main>
      </div>
    </>
  );
};

export default AccountSettings;
