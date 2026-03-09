export type BillingPeriod = 'monthly' | 'annual';

export interface Plan {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    monthlyPrice: number;
    annualPrice: number;
    priceNote: string;
    features: PlanFeature[];
    ctaText: string;
    ctaStyle: 'outline' | 'gold' | 'primary' | 'purple';
    popular?: boolean;
    popularColor?: 'green' | 'purple';
    credits?: string;
    creditsColor?: 'standard' | 'power';
    badge?: string;
}

export interface PlanFeature {
    text: string;
    included: boolean;
    highlight?: boolean;
    powerColor?: boolean;
}

export interface FeatureComparison {
    feature: string;
    free: string | boolean;
    single: string | boolean;
    standard: string | boolean;
    power: string | boolean;
}

export interface FAQ {
    question: string;
    answer: string;
}