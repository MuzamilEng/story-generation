"use client";
import React, { useState, useEffect } from "react";
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
            Created {format(model.createdDate, "MMMM d, yyyy")} &nbsp;·&nbsp; Used
            in {model.storyCount} stories &nbsp;·&nbsp; Powered by{" "}
            {model.provider}
          </div>
        </div>
      </div>
      <div className={styles.voiceBtns}>
        <button className={`${styles.vbtn} ${styles.outline}`} onClick={handlePlay}>
          {isPlaying ? <StopIcon /> : <PlayIcon />}
          {isPlaying ? 'Stop' : 'Play Sample'}
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

const NONE_SOUNDSCAPE = { value: 'none', label: 'None', emoji: '🔇', desc: 'Story audio only', imageUrl: undefined };



interface SoundscapeSelectorProps {
  current: string;
  disabled?: boolean;
  dynamicAssets: any[];
  onChange: (val: string) => void;
}

const SoundscapeSelector: React.FC<SoundscapeSelectorProps> = ({ current, disabled, dynamicAssets, onChange }) => {
  // Only show 'none' and the dynamic assets from the admin
  const allChoices = [
    NONE_SOUNDSCAPE,
    ...dynamicAssets.map(a => ({
      value: a.value,
      label: a.title,
      emoji: '🎵',
      desc: 'Ambient soundscape',
      imageUrl: a.image_url
    }))
  ];


  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '4px 0' }}>
      {allChoices.map(s => (
        <button
          key={s.value}
          onClick={() => !disabled && onChange(s.value)}
          disabled={disabled}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
            padding: s.imageUrl ? '0' : '10px 14px', borderRadius: '12px', cursor: disabled ? 'not-allowed' : 'pointer',
            border: current === s.value ? '2px solid #52b788' : '2px solid rgba(255,255,255,0.08)',
            background: current === s.value ? 'rgba(82,183,136,0.1)' : 'rgba(255,255,255,0.03)',
            color: current === s.value ? '#52b788' : '#8a8476',
            transition: 'all 0.2s', fontSize: '0.78rem', minWidth: '100px', height: '100px',
            opacity: disabled ? 0.45 : 1,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: current === s.value ? '0 4px 15px rgba(82, 183, 136, 0.2)' : 'none'
          }}
          title={s.desc}
        >
          {s.imageUrl ? (
              <>
                 <img 
                   src={s.imageUrl} 
                   alt="" 
                   style={{ 
                       position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                       objectFit: 'cover', opacity: current === s.value ? 0.9 : 0.65, zIndex: 0, transition: 'opacity 0.2s' 
                   }} 
                 />
                 <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8, 7, 15, 0.9) 0%, rgba(8, 7, 15, 0) 70%)', zIndex: 1 }}></div>
                 <span style={{ fontWeight: current === s.value ? 600 : 500, zIndex: 2, position: 'absolute', bottom: '12px', color: current === s.value ? '#fff' : 'rgba(255,255,255,0.8)', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    {s.label}
                 </span>
                 {current === s.value && (
                     <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#52b788', zIndex: 2, boxShadow: '0 0 8px #52b788' }}></div>
                 )}
              </>
          ) : (
              <>
                <span style={{ fontSize: '1.6rem', zIndex: 1, marginBottom: '4px' }}>{s.emoji}</span>
                <span style={{ fontWeight: current === s.value ? 600 : 400, zIndex: 1, color: current === s.value ? '#52b788' : '#8a8476' }}>{s.label}</span>
              </>
          )}
        </button>
      ))}
    </div>
  );
};

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
const AccountSettings: React.FC = () => {
  const router = useRouter();
  const [toast, setToast] = useState({ message: "", visible: false });

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
  const { data: session } = useSession();

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
      if (!res.ok) throw new Error("Failed to delete stories");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      showToast("✓ All stories deleted");
    },
    onError: () => {
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

  const isEditingName = editingField === "name";
  const isEditingEmail = editingField === "email";

  useEffect(() => {
    if (userData) {
      setNameInput(userData.name || "");
      setEmailInput(userData.email || "");
    }
  }, [userData]);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000);
  };

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
    if (
      confirm(
        "Delete your voice model? Your existing audio stories will still play, but you won't be able to generate new ones until you re-record. This cannot be undone.",
      )
    ) {
      // TODO: API call to delete voice model
      showToast("Voice model deleted");
    }
  };

  const handlePasswordChange = () => {
    showToast("✉ Password reset email sent");
  };

  const handleDeleteStories = () => {
    if (
      confirm(
        "Permanently delete all stories and audio files? This cannot be undone.",
      )
    ) {
      deleteStoriesMutation.mutate();
    }
  };

  const handleDeleteAccount = () => {
    if (
      confirm(
        "Permanently delete your account? Everything — stories, audio, voice model — will be lost forever. This cannot be undone.",
      )
    ) {
      deleteAccountMutation.mutate();
    }
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
                      Record your voice to start generating audio stories
                    </div>
                  </div>
                </div>
                <div className={styles.voiceBtns}>
                  <button
                    className={`${styles.vbtn} ${styles.solid}`}
                    onClick={handleReRecord}
                  >
                    <PlusIcon />
                    Setup Voice Model
                  </button>
                </div>
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
            {userData.plan === 'free' || userData.plan === 'activator' ? (
              <div style={{ padding: '16px 24px', color: '#5a5650', fontSize: '0.88rem' }}>
                🔒 Soundscapes are available on Manifester and Amplifier plans.{' '}
                <Link href="/pricing" style={{ color: '#c9a84c', textDecoration: 'underline' }}>Upgrade →</Link>
              </div>
            ) : (
              <div style={{ padding: '16px 24px' }}>
                <p style={{ fontSize: '0.83rem', color: '#6a6460', marginBottom: '14px' }}>
                  Your chosen soundscape is mixed into every new audio file you generate.
                  Two versions are stored: story-only and with soundscape.
                </p>
                <SoundscapeSelector
                  current={userData.soundscape ?? 'none'}
                  dynamicAssets={dynamicAssets}
                  onChange={(val) => updateSettingsMutation.mutate({ soundscape: val })}
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
            {userData.plan !== 'amplifier' ? (
              <div style={{ padding: '16px 24px', color: '#5a5650', fontSize: '0.88rem' }}>
                🔒 Binaural beats are an Amplifier exclusive.{' '}
                <Link href="/pricing" style={{ color: '#c9a84c', textDecoration: 'underline' }}>Upgrade →</Link>
              </div>
            ) : (
              <>
                <ToggleRow
                  label="Enable Binaural Beats"
                  subtitle="Theta waves promote deep focus and receptivity during listening"
                  checked={userData.binaural_enabled ?? false}
                  onChange={(val) => updateSettingsMutation.mutate({ binaural_enabled: val })}
                />
                {userData.binaural_enabled && (
                  <div style={{
                    margin: '0 24px 16px',
                    padding: '12px 16px',
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.18)',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    color: '#8a8476',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>🎧</span>
                    <span>Best experienced with <strong style={{ color: '#c9a84c' }}>headphones</strong>.
                      Binaural beats require separate audio channels to create the effect.
                      Speaker playback will not produce the theta frequency result.</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Plan Summary Section */}
          <div className={styles.settingsSection}>
            <SectionHeader
              icon={<StarIcon />}
              title={`Current Plan — ${isActuallyBeta ? "BETA" : userData.plan.toUpperCase()}`}
              subtitle={isActuallyBeta 
                ? `Beta Program (2 month trial)${userData.betaExpiresAt ? ` · Expires ${format(new Date(userData.betaExpiresAt), "MMMM d, yyyy")}` : ""}`
                : `${userData.plan === "free" ? "Free Plan" : (userData.plan === 'activator' ? '$9.99 one-time' : (userData.plan === 'manifester' ? '$19.99/month' : '$39.99/month'))} · Active since ${format(new Date(userData.createdAt), "MMMM d, yyyy")}`}
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

        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </>
  );
};

export default AccountSettings;
