'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
}

const TopBar: React.FC<TopBarProps> = ({ onNewStory }) => (
    <header className={styles.topbar}>
        <Link href="/" className={styles.logo}>
            Manifest<span>MyStory</span>
        </Link>

        <nav className={styles.topbarNav}>
            <Link href="/dashboard" className={styles.navLink}>
                My Stories
            </Link>
            <Link href="/account-settings" className={`${styles.navLink} ${styles.active}`}>
                Settings
            </Link>
        </nav>

        <div className={styles.topbarRight}>
            <button className={styles.newStoryBtn} onClick={onNewStory}>
                <PlusIcon />
                New Story
            </button>
            <button className={styles.avatarBtn}>MZ</button>
        </div>
    </header>
);

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

    // Edit states
    const [editingField, setEditingField] = useState<'name' | 'email' | null>(null);
    const [profile, setProfile] = useState<UserProfile>({
        name: 'Michael Ziman',
        email: 'michael@manifestmystory.com',
        signInMethod: 'Email & Password'
    });

    const [voiceModel, setVoiceModel] = useState<VoiceModel>({
        name: "Michael's Voice",
        createdDate: new Date(2026, 2, 7),
        storyCount: 3,
        provider: 'ElevenLabs'
    });

    const [notifications, setNotifications] = useState<NotificationSettings>({
        morningReminder: true,
        eveningReminder: true,
        streakMilestones: true,
        productUpdates: false
    });

    const [plan, setPlan] = useState<PlanDetails>({
        name: 'Standard',
        price: '$9.99 / month',
        nextRenewal: new Date(2026, 3, 7),
        storiesUsed: 3,
        storiesLimit: 5,
        audioMinutesUsed: 22,
        audioMinutesLimit: 60,
        storiesSaved: 3,
        slotsEarned: 15
    });

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3000);
    };

    const handleEdit = (field: 'name' | 'email') => {
        setEditingField(field);
    };

    const handleSave = (field: 'name' | 'email') => {
        setEditingField(null);
        showToast('✓ Changes saved');
    };

    const handleCancel = () => {
        setEditingField(null);
    };

    const handleNewStory = () => {
        router.push('/goal-intake-ai');
    };

    const handlePlaySample = () => {
        showToast('▶ Playing your voice sample...');
    };

    const handleReRecord = () => {
        router.push('/voice-recording');
    };

    const handleDeleteVoice = () => {
        if (confirm('Delete your voice model? Your existing audio stories will still play, but you won\'t be able to generate new ones until you re-record. This cannot be undone.')) {
            showToast('Voice model deleted');
        }
    };

    const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
        setNotifications(prev => ({ ...prev, [key]: value }));
    };

    const handlePasswordChange = () => {
        showToast('✉ Password reset email sent');
    };

    const handleDeleteStories = () => {
        if (confirm('Permanently delete all stories and audio files? This cannot be undone.')) {
            showToast('All stories deleted');
        }
    };

    const handleDeleteAccount = () => {
        if (confirm('Permanently delete your account? Everything — stories, audio, voice model — will be lost forever. This cannot be undone.')) {
            showToast('Check your email to confirm account deletion');
        }
    };

    return (
        <>
            <div className={styles.container}>
                <TopBar onNewStory={handleNewStory} />

                <main className={styles.page}>
                    {/* Back Link */}
                    <Link href="/dashboard" className={styles.backLink}>
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
                            value={profile.name}
                            isEditing={editingField === 'name'}
                            onEdit={() => handleEdit('name')}
                            onSave={() => handleSave('name')}
                            onCancel={handleCancel}
                        />

                        <FormRow
                            label="Email"
                            value={profile.email}
                            inputType="email"
                            isEditing={editingField === 'email'}
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
                            value={profile.signInMethod}
                        />
                    </div>

                    {/* Voice Model Section */}
                    <div className={styles.settingsSection}>
                        <SectionHeader
                            icon={<MicIcon />}
                            title="Your Voice Model"
                            subtitle="The cloned voice used to narrate your stories"
                        />

                        <VoiceModelCard
                            model={voiceModel}
                            onPlay={handlePlaySample}
                            onReRecord={handleReRecord}
                            onDelete={handleDeleteVoice}
                        />
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
                            checked={notifications.morningReminder}
                            onChange={(val) => handleNotificationChange('morningReminder', val)}
                        />

                        <ToggleRow
                            label="Evening listening reminder"
                            subtitle="Reminder before bed to complete your daily practice"
                            checked={notifications.eveningReminder}
                            onChange={(val) => handleNotificationChange('eveningReminder', val)}
                        />

                        <ToggleRow
                            label="Streak milestones"
                            subtitle="Celebrate when you hit 7, 30, and 60-day listening streaks"
                            checked={notifications.streakMilestones}
                            onChange={(val) => handleNotificationChange('streakMilestones', val)}
                        />

                        <ToggleRow
                            label="Product updates & tips"
                            subtitle="Occasional emails about new features and manifestation techniques"
                            checked={notifications.productUpdates}
                            onChange={(val) => handleNotificationChange('productUpdates', val)}
                        />
                    </div>

                    {/* Plan Summary Section */}
                    <div className={styles.settingsSection}>
                        <SectionHeader
                            icon={<StarIcon />}
                            title={`Current Plan — ${plan.name}`}
                            subtitle={`${plan.price} · Renews ${format(plan.nextRenewal, 'MMMM d, yyyy')}`}
                            iconColor="gold"
                        />

                        <FormRow
                            label="Stories this month"
                            value={`${plan.storiesUsed} of ${plan.storiesLimit} used`}
                        />

                        <FormRow
                            label="Audio minutes"
                            value={`${plan.audioMinutesUsed} of ${plan.audioMinutesLimit} minutes used`}
                        />

                        <FormRow
                            label="Story library"
                            value={`${plan.storiesSaved} stories saved (${plan.slotsEarned} slots earned so far)`}
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