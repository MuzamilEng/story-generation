export type PlanType = 'free' | 'activator' | 'manifester' | 'amplifier';

export interface Plan {
    id: PlanType;
    name: string;
    price: string;
    priceOriginal?: string;
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
    status: 'paid' | 'pending' | 'failed' | string;
    receiptUrl?: string;
}

export interface CurrentPlan {
    name: string;
    price: string;
    nextRenewal?: Date | null;
    status: 'active' | 'canceled' | 'past_due' | string;
}