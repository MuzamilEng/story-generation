'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { format } from 'date-fns';
import styles from '../../styles/AccountSettings.module.css';
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
    DeleteIcon
} from '../../components/icons/SettingsIcons';
import { UserProfile, VoiceModel, NotificationSettings, PlanDetails } from '../../types/settings';

// Top Bar Component
interface TopBarProps {
    onNewStory: () => void;
    userName?: string;
}

const TopBar: React.FC<TopBarProps> = ({ onNewStory, userName }) => {
    const getInitials = (name?: string) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <header className={styles.topbar}>
            <Link href="/" className={styles.logo}>
                Manifest<span>MyStory</span>
            </Link>

            <nav className={styles.topbarNav}>
                <Link href="/user/dashboard" className={styles.navLink}>
                    My Dashboard
                </Link>
                <Link href="/science" className={styles.navLink}>
                    The Science
                </Link>
                <Link href="/user/account-setting" className={`${styles.navLink} ${styles.active}`}>
                    Settings
                </Link>
            </nav>

            <div className={styles.topbarRight}>
                <button className={styles.newStoryBtn} onClick={onNewStory}>
                    <PlusIcon />
                    New Story
                </button>
                <button className={styles.avatarBtn}>{getInitials(userName)}</button>
            </div>
        </header>
    );
};

// Settings Section Header Component
interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    iconColor?: 'default' | 'gold';
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle, iconColor = 'default' }) => (
    <div className={styles.sectionHead}>
        <div className={`${styles.sectionIcon} ${iconColor === 'gold' ? styles.gold : ''}`}>
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
    inputType = 'text',
    children
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

const ToggleRow: React.FC<ToggleRowProps> = ({ label, subtitle, checked, onChange }) => (
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

const DangerRow: React.FC<DangerRowProps> = ({ label, subtitle, buttonText, onConfirm }) => (
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
    onPlay: () => void;
    onReRecord: () => void;
    onDelete: () => void;
}

const VoiceModelCard: React.FC<VoiceModelProps> = ({ model, onPlay, onReRecord, onDelete }) => (
    <div className={styles.voiceRow}>
        <div className={styles.voiceInfo}>
            <div className={styles.voiceAvatar}>
                <MicIcon />
            </div>
            <div>
                <div className={styles.voiceName}>{model.name}</div>
                <div className={styles.voiceMeta}>
                    Created {format(model.createdDate, 'MMMM d, yyyy')} &nbsp;·&nbsp; Used in {model.storyCount} stories &nbsp;·&nbsp; Powered by {model.provider}
                </div>
            </div>
        </div>
        <div className={styles.voiceBtns}>
            <button className={`${styles.vbtn} ${styles.outline}`} onClick={onPlay}>
                <PlayIcon />
                Play Sample
            </button>
            <button className={`${styles.vbtn} ${styles.outline}`} onClick={onReRecord}>
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
const AccountSettings: React.FC = () => {
    const router = useRouter();
    const [toast, setToast] = useState({ message: '', visible: false });

    useEffect(() => {
        document.title = "ManifestMyStory — Account Settings";

        // Add font if it doesn't exist
        if (!document.getElementById('dm-fonts')) {
            const link = document.createElement('link');
            link.id = 'dm-fonts';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap';
            document.head.appendChild(link);
        }
    }, []);

    const queryClient = useQueryClient();
    const { data: session } = useSession();

    // Fetch user settings
    const { data: userData, isLoading } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/user/settings');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        }
    });

    // Update settings mutation
    const updateSettingsMutation = useMutation({
        mutationFn: async (newData: any) => {
            const res = await fetch('/api/user/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData),
            });
            if (!res.ok) throw new Error('Failed to update settings');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            showToast('✓ Changes saved');
            setEditingField(null);
        },
        onError: () => {
            showToast('❌ Failed to save changes');
        }
    });

    // Delete all stories mutation
    const deleteStoriesMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/user/stories', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete stories');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            showToast('✓ All stories deleted');
        },
        onError: () => {
            showToast('❌ Failed to delete stories');
        }
    });

    // Delete account mutation
    const deleteAccountMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/user/settings', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete account');
            return res.json();
        },
        onSuccess: () => {
            showToast('✓ Account deleted');
            signOut({ callbackUrl: '/' });
        },
        onError: () => {
            showToast('❌ Failed to delete account');
        }
    });

    // Edit states
    const [editingField, setEditingField] = useState<'name' | 'email' | null>(null);
    const [nameInput, setNameInput] = useState('');
    const [emailInput, setEmailInput] = useState('');

    const isEditingName = editingField === 'name';
    const isEditingEmail = editingField === 'email';

    useEffect(() => {
        if (userData) {
            setNameInput(userData.full_name || '');
            setEmailInput(userData.email || '');
        }
    }, [userData]);

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3000);
    };

    const handleEdit = (field: 'name' | 'email') => {
        setEditingField(field);
    };

    const handleSave = (field: 'name' | 'email') => {
        if (field === 'name') {
            updateSettingsMutation.mutate({ full_name: nameInput });
        } else if (field === 'email') {
            // Usually email changes require more verification, but we'll allow it for now
            updateSettingsMutation.mutate({ email: emailInput });
        }
    };

    const handleCancel = () => {
        setEditingField(null);
        if (userData) {
            setNameInput(userData.full_name || '');
            setEmailInput(userData.email || '');
        }
    };

    const handleNotificationChange = (key: string, value: boolean) => {
        const backendKeyMap: Record<string, string> = {
            morningReminder: 'morning_reminder',
            eveningReminder: 'evening_reminder',
            streakMilestones: 'streak_milestones',
            productUpdates: 'product_updates'
        };

        const backendKey = backendKeyMap[key] || key;
        updateSettingsMutation.mutate({ [backendKey]: value });
    };

    const handleNewStory = () => {
        router.push('/user/goal-intake-ai');
    };

    const handlePlaySample = () => {
        showToast('▶ Playing your voice sample...');
    };

    const handleReRecord = () => {
        router.push('/user/voice-recording');
    };

    const handleDeleteVoice = () => {
        if (confirm('Delete your voice model? Your existing audio stories will still play, but you won\'t be able to generate new ones until you re-record. This cannot be undone.')) {
            // TODO: API call to delete voice model
            showToast('Voice model deleted');
        }
    };

    const handlePasswordChange = () => {
        showToast('✉ Password reset email sent');
    };

    const handleDeleteStories = () => {
        if (confirm('Permanently delete all stories and audio files? This cannot be undone.')) {
            deleteStoriesMutation.mutate();
        }
    };

    const handleDeleteAccount = () => {
        if (confirm('Permanently delete your account? Everything — stories, audio, voice model — will be lost forever. This cannot be undone.')) {
            deleteAccountMutation.mutate();
        }
    };

    if (isLoading) return <div className={styles.container}><TopBar onNewStory={handleNewStory} userName={session?.user?.name || undefined} /><div className={styles.page}>Loading settings...</div></div>;
    if (!userData) return <div className={styles.container}><TopBar onNewStory={handleNewStory} userName={session?.user?.name || undefined} /><div className={styles.page}>Error loading settings</div></div>;

    return (
        <>
            <div className={styles.container}>
                <TopBar onNewStory={handleNewStory} userName={userData.full_name} />

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
                            value={isEditingName ? nameInput : userData.full_name}
                            onChange={(val) => setNameInput(val)}
                            isEditing={isEditingName}
                            onEdit={() => handleEdit('name')}
                            onSave={() => handleSave('name')}
                            onCancel={handleCancel}
                        />

                        <FormRow
                            label="Email"
                            value={isEditingEmail ? emailInput : userData.email}
                            onChange={(val) => setEmailInput(val)}
                            inputType="email"
                            isEditing={isEditingEmail}
                            onEdit={() => handleEdit('email')}
                            onSave={() => handleSave('email')}
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
                            value={userData.auth_provider === 'email' ? 'Email & Password' : userData.auth_provider}
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
                                    provider: 'ElevenLabs'
                                }}
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
                                        <div className={styles.voiceMeta}>Record your voice to start generating audio stories</div>
                                    </div>
                                </div>
                                <div className={styles.voiceBtns}>
                                    <button className={`${styles.vbtn} ${styles.solid}`} onClick={handleReRecord}>
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
                            onChange={(val) => handleNotificationChange('morningReminder', val)}
                        />

                        <ToggleRow
                            label="Evening listening reminder"
                            subtitle="Reminder before bed to complete your daily practice"
                            checked={userData.evening_reminder}
                            onChange={(val) => handleNotificationChange('eveningReminder', val)}
                        />

                        <ToggleRow
                            label="Streak milestones"
                            subtitle="Celebrate when you hit 7, 30, and 60-day listening streaks"
                            checked={userData.streak_milestones}
                            onChange={(val) => handleNotificationChange('streakMilestones', val)}
                        />

                        <ToggleRow
                            label="Product updates & tips"
                            subtitle="Occasional emails about new features and manifestation techniques"
                            checked={userData.product_updates}
                            onChange={(val) => handleNotificationChange('productUpdates', val)}
                        />
                    </div>

                    {/* Plan Summary Section */}
                    <div className={styles.settingsSection}>
                        <SectionHeader
                            icon={<StarIcon />}
                            title={`Current Plan — ${userData.plan.toUpperCase()}`}
                            subtitle={`${userData.plan === 'free' ? 'Free Plan' : '$9.99 / month'} · Active since ${format(new Date(userData.createdAt), 'MMMM d, yyyy')}`}
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
                            <Link href="/subscription">
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