import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PLAN_DETAILS } from "@/lib/plans";
import { Plan } from "@prisma/client";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { planId, priceId, billingCycle, autoRenew = true } = await req.json();

        if (!planId || !PLAN_DETAILS[planId as Plan]) {
            return new NextResponse("Invalid plan", { status: 400 });
        }

        const plan = PLAN_DETAILS[planId as Plan];

        // Final Price ID verification
        let resolvedPriceId = priceId;
        if (!resolvedPriceId) {
            if (planId === "activator") resolvedPriceId = plan.stripePriceId.oneTime;
            else if (billingCycle === "yearly") resolvedPriceId = plan.stripePriceId.yearly;
            else resolvedPriceId = plan.stripePriceId.monthly;
        }

        if (!resolvedPriceId) {
            return new NextResponse("Price ID not found for selection", { status: 400 });
        }

        // Get or Create Stripe Customer
        let user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        let stripeCustomerId = user.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: session.user.email,
                name: user.name || undefined,
            });
            stripeCustomerId = customer.id;
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId },
            });
        }

        // Create Checkout Session
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            line_items: [
                {
                    price: resolvedPriceId,
                    quantity: 1,
                },
            ],
            mode: planId === "activator" ? "payment" : "subscription",
            success_url: `${process.env.NEXTAUTH_URL}/user/manage-subscription?success=true`,
            cancel_url: `${process.env.NEXTAUTH_URL}/user/manage-subscription?canceled=true`,
            metadata: {
                userId: user.id,
                planId: planId,
                autoRenew: String(autoRenew),
            },
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error: any) {
        console.error("[STRIPE_ERROR]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
