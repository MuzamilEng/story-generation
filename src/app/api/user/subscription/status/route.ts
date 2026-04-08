import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { betaTypeToPlan } from "@/lib/beta-utils";

export const dynamic = 'force-dynamic';

const planNamesMap: Record<string, string> = {
    free: 'Explorer',
    activator: 'Activator',
    manifester: 'Manifester',
    amplifier: 'Amplifier',
};

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                betaCodes: {
                    where: { expiresAt: { gt: new Date() } },
                    orderBy: { expiresAt: 'desc' },
                    take: 1,
                    include: { betaCode: { select: { type: true } } }
                }
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        const isBetaUser = user.betaCodes.length > 0;
        const betaExpiresAt = isBetaUser ? user.betaCodes[0].expiresAt : null;
        const betaPlan = isBetaUser ? betaTypeToPlan(user.betaCodes[0].betaCode.type) : null;
        const betaPlanName = betaPlan ? (planNamesMap[betaPlan] || betaPlan) : null;

        return NextResponse.json({
            plan: user.plan,
            stripeSubscriptionId: user.stripeSubscriptionId,
            stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
            stripeCancelAtPeriodEnd: (user as any).stripeCancelAtPeriodEnd,
            isBetaUser,
            betaExpiresAt,
            betaPlanName
        });
    } catch (error) {
        console.error("[SUBSCRIPTION_STATUS_ERROR]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
