export interface UserAnswers {
    identity: string;
    purpose: string;
    values: string;
    location: string;
    home: string;
    morning: string;
    work: string;
    people: string;
    emotions: string;
    joy: string;
    challenges: string;
    evening: string;
    reflection: string;
    dreams: string;
    categories?: string[];
    abundance?: string;
    health?: string;
    spirit?: string;
    community?: string;
    travel?: string;
    obstacle1?: string;
    obstacle2?: string;
    obstacle3?: string;
    proof1?: string;
    proof2?: string;
    proof3?: string;
}

export interface VisionItem {
    label: string;
    value: string;
}

export interface ChecklistItem {
    id: string;
    text: string;
}

export interface GenerationStep {
    id: string;
    label: string;
    delay: number;
}