export interface Story {
    id: string;
    title: string;
    createdAt: Date;
    wordCount: number;
    audioDuration: number; // in seconds
    plays: number;
    downloads: number;
    content: string;
    audioUrl?: string;
    voiceOnlyUrl?: string;
}

export interface StoryVersion {
    id: string;
    version: number;
    label: string;
    date: Date;
    wordCount: number;
    isCurrent?: boolean;
}

export interface AudioPlayerState {
    isPlaying: boolean;
    isLooping: boolean;
    currentTime: number;
    duration: number;
    backgroundEnabled: boolean;
}