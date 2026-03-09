export interface ScienceCard {
    id: string;
    icon: React.ReactNode;
    title: string;
    body: string;
    gold?: boolean;
}

export interface ResearchItem {
    icon: React.ReactNode;
    title: string;
    body: string;
}

export interface HowItWorksStep {
    number: number;
    title: string;
    text: string;
}

export interface Illusion {
    id: string;
    title: string;
    description: string;
    type: 'rubin' | 'duck';
}