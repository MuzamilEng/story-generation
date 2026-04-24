import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { appLog } from "@/lib/app-logger";

export async function POST(req: Request) {
    let sessionUserId: string | undefined;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }
        sessionUserId = session.user.id;

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { stripeSubscriptionId: true }
        });

        if (!user?.stripeSubscriptionId) {
            return new NextResponse("No active subscription found", { status: 400 });
        }

        // DELETING the subscription makes it cancel IMMEDIATELY
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);

        // Revert database user immediately to Free
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                plan: "free",
                stripeSubscriptionId: null,
                stripePriceId: null,
                stripeCurrentPeriodEnd: null,
                stripeCancelAtPeriodEnd: false
            }
        });

        appLog({ level: "warn", source: "api/user/subscription/cancel", message: `Subscription canceled immediately`, userId: sessionUserId });

        return NextResponse.json({
            message: "Subscription canceled immediately. Your plan has been reverted to Free.",
        });
    } catch (error: any) {
        console.error("[CANCEL_ERROR]", error);
        appLog({ level: "error", source: "api/user/subscription/cancel", message: `Subscription cancel failed: ${error.message}`, userId: sessionUserId });
        return new NextResponse(error.message || "Internal Server Error", { status: 500 });
    }
}
