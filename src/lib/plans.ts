import { Plan } from "@prisma/client";

export interface PlanDetails {
    id: Plan;
    name: string;
    description: string;
    price: {
        monthly: number;
        yearly: number;
        oneTime?: number;
    };
    stripePriceId: {
        monthly?: string;
        yearly?: string;
        oneTime?: string;
    };
    features: string[];
    badge?: string;
    isPopular?: boolean;
}

export const PLAN_DETAILS: Record<Plan, PlanDetails> = {
    free: {
        id: "free",
        name: "Explorer",
        description: "Perfect for getting started",
        price: {
            monthly: 0,
            yearly: 0,
        },
        stripePriceId: {},
        features: [
            "Unlimited story creation",
            "2-minute voice sample",
            "Standard quality audio",
            "Community support"
        ],
    },
    activator: {
        id: "activator",
        name: "Activator",
        description: "One-time boost for early adopters",
        price: {
            monthly: 0, // Not applicable
            yearly: 0,  // Not applicable
            oneTime: 9.99,
        },
        stripePriceId: {
            oneTime: process.env.STRIPE_ACTIVATOR_PRICE_ID,
        },
        features: [
            "First 10,000 stories pool",
            "50% launch discount",
            "Lifetime access to core features",
            "Priority story processing"
        ],
        badge: "Launch offer — 50% off — first 10,000 stories",
    },
    manifester: {
        id: "manifester",
        name: "Manifester",
        description: "For serious storytellers",
        price: {
            monthly: 19.99,
            yearly: 15.99, // 191.88 / 12
        },
        stripePriceId: {
            monthly: process.env.STRIPE_MANIFESTER_MONTHLY_PRICE_ID,
            yearly: process.env.STRIPE_MANIFESTER_YEARLY_PRICE_ID,
        },
        features: [
            "Everything in Activator",
            "Exclusive premium voices",
            "Advanced story customization",
            "Priority support"
        ],
        isPopular: true,
    },
    amplifier: {
        id: "amplifier",
        name: "Amplifier",
        description: "The ultimate creative power",
        price: {
            monthly: 39.99,
            yearly: 31.99, // 383.88 / 12
        },
        stripePriceId: {
            monthly: process.env.STRIPE_AMPLIFIER_MONTHLY_PRICE_ID,
            yearly: process.env.STRIPE_AMPLIFIER_YEARLY_PRICE_ID,
        },
        features: [
            "Everything in Manifester",
            "White-label options",
            "API access",
            "Dedicated account manager"
        ],
    },
};

export const getPlanByPriceId = (priceId: string): PlanDetails | undefined => {
    return Object.values(PLAN_DETAILS).find(
        (plan) =>
            plan.stripePriceId.monthly === priceId ||
            plan.stripePriceId.yearly === priceId ||
            plan.stripePriceId.oneTime === priceId
    );
};
