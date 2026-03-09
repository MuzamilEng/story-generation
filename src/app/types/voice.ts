export type RecordingState = 'idle' | 'recording' | 'stopped';

export interface TipItem {
    icon: React.ReactNode;
    title: string;
    description: string;
}

export interface WaveformBar {
    height: number;
    active: boolean;
    recorded: boolean;
}