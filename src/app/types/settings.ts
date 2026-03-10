export interface UserProfile {
    name: string;
    email: string;
    signInMethod: string;
}

export interface VoiceModel {
    name: string;
    createdDate: Date;
    storyCount: number;
    provider: string;
}

export interface NotificationSettings {
    morningReminder: boolean;
    eveningReminder: boolean;
    streakMilestones: boolean;
    productUpdates: boolean;
}

export interface PlanDetails {
    name: string;
    price: string;
    nextRenewal: Date;
    storiesUsed: number;
    storiesLimit: number;
    audioMinutesUsed: number;
    audioMinutesLimit: number;
    storiesSaved: number;
    slotsEarned: number;
}