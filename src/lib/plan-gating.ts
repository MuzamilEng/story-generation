import { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface PlanLimits {
    maxStories: number;
    allowFullAudio: boolean;
    audioMinutesPerMonth: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
    free: {
        maxStories: 1,
        allowFullAudio: false,
        audioMinutesPerMonth: 0,
    },
    activator: {
        maxStories: 10000, // Based on the "first 10,000 stories" badge logic
        allowFullAudio: true,
        audioMinutesPerMonth: 60,
    },
    manifester: {
        maxStories: 100000, // Effectively unlimited
        allowFullAudio: true,
        audioMinutesPerMonth: 300,
    },
    amplifier: {
        maxStories: 1000000, // Effectively unlimited
        allowFullAudio: true,
        audioMinutesPerMonth: 1000,
    },
};

export async function checkPlanGating(userId: string, action: 'create_story' | 'generate_audio') {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, total_stories_ever: true, audio_mins_this_month: true }
    });

    if (!user) return { allowed: false, message: "User not found" };

    const limits = PLAN_LIMITS[user.plan];

    if (action === 'create_story') {
        if (user.total_stories_ever >= limits.maxStories) {
            return {
                allowed: false,
                message: `You have reached the story limit for your ${user.plan} plan. Please upgrade to create more.`
            };
        }
    }

    if (action === 'generate_audio') {
        if (!limits.allowFullAudio) {
            return {
                allowed: false,
                message: "Full audio generation is not available on your current plan. Please upgrade to activate this feature."
            };
        }

        // Add monthly minutes check if needed
        const currentMins = Number(user.audio_mins_this_month);
        if (currentMins >= limits.audioMinutesPerMonth) {
            return {
                allowed: false,
                message: `You have reached your monthly audio limit of ${limits.audioMinutesPerMonth} minutes.`
            };
        }
    }

    return { allowed: true };
}
