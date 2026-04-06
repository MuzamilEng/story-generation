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
            "10 personalized night stories",
            "Full audio generation",
            "AI voice cloning",
            "Standard quality audio",
            "Community support"
        ],
    },
    activator: {
        id: "activator",
        name: "Activator",
        description: "Open your subconscious before the vision begins.",
        price: {
            monthly: 9.99,
            yearly: 6.99,
        },
        stripePriceId: {
            monthly: process.env.STRIPE_ACTIVATOR_MONTHLY_PRICE_ID,
            yearly: process.env.STRIPE_ACTIVATOR_YEARLY_PRICE_ID,
        },
        features: [
            "Everything in Explorer",
            "Full hypnotic induction",
            "Story focused on up to 3 life areas",
            "Advanced story customization",
            "Downloadable MP3"
        ],
        badge: "Founding member pricing — 50% off",
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
