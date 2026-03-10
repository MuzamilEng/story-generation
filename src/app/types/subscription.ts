export type PlanType = 'free' | 'single' | 'standard' | 'power';

export interface Plan {
    id: PlanType;
    name: string;
    price: string;
    priceSub: string;
    features: Array<{ text: string; included: boolean }>;
    isCurrent?: boolean;
    isHighlighted?: boolean;
    badge?: string;
    buttonText: string;
    buttonStyle: 'current' | 'upgrade' | 'power' | 'downgrade';
}

export interface UsageMetric {
    name: string;
    current: number;
    limit: number;
    unit: string;
    warn?: boolean;
}

export interface BillingRecord {
    date: Date;
    description: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
}

export interface CurrentPlan {
    name: string;
    price: string;
    nextRenewal: Date;
    status: 'active' | 'canceled' | 'past_due';
}