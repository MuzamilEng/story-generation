import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

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
                    take: 1
                }
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        const isBetaUser = user.betaCodes.length > 0;
        const betaExpiresAt = isBetaUser ? user.betaCodes[0].expiresAt : null;

        return NextResponse.json({
            plan: user.plan,
            stripeSubscriptionId: user.stripeSubscriptionId,
            stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
            stripeCancelAtPeriodEnd: (user as any).stripeCancelAtPeriodEnd,
            isBetaUser,
            betaExpiresAt
        });
    } catch (error) {
        console.error("[SUBSCRIPTION_STATUS_ERROR]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
