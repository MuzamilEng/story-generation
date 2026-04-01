import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getPlanByPriceId } from "@/lib/plans";

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
        console.log(`[STRIPE_WEBHOOK] Received event: ${event.type}`);
    } catch (error: any) {
        console.error(`[STRIPE_WEBHOOK_ERROR] ${error.message}`);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[STRIPE_WEBHOOK] Processing checkout.session.completed for ${session.id}`);

        if (!session?.metadata?.userId) {
            console.error("[STRIPE_WEBHOOK] No userId in metadata");
            return new NextResponse("User id is required", { status: 400 });
        }

        if (session.mode === "subscription") {
            const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string
            );

            // Handle Auto-Renew Checkbox preference
            if (session.metadata.autoRenew === "false") {
                await stripe.subscriptions.update(subscription.id, {
                    cancel_at_period_end: true,
                });
            }

            const priceId = subscription.items.data[0].price.id;
            const plan = getPlanByPriceId(priceId);

            console.log(`[STRIPE_WEBHOOK] Updating user ${session.metadata.userId} to recurring plan ${plan?.name || 'unknown'}`);

            await prisma.user.update({
                where: { id: session.metadata.userId },
                data: {
                    stripeSubscriptionId: subscription.id,
                    stripeCustomerId: subscription.customer as string,
                    stripePriceId: priceId,
                    stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                    plan: plan?.id || "free",
                },
            });
        } else if (session.mode === "payment") {
            const planId = session.metadata.planId;
            console.log(`[STRIPE_WEBHOOK] Updating user ${session.metadata.userId} to one-time plan: ${planId}`);

            await prisma.user.update({
                where: { id: session.metadata.userId },
                data: {
                    plan: (planId as any) || "activator",
                    stripeCustomerId: session.customer as string,
                },
            });
        }
        console.log(`[STRIPE_WEBHOOK] User ${session.metadata.userId} updated successfully via checkout`);
    }

    if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[STRIPE_WEBHOOK] Processing invoice.payment_succeeded for invoice: ${invoice.id}`);

        const customerId = invoice.customer as string;
        const subscriptionId = (invoice as any).subscription as string | null;

        // Find user by customer ID
        const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId }
        });

        if (user) {
            let planId = user.plan;
            let stripePriceId = user.stripePriceId;
            let currentPeriodEnd = user.stripeCurrentPeriodEnd;

            // If there's a subscription, get the latest details
            if (subscriptionId) {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const priceIdFromSub = subscription.items.data[0].price.id;
                const planFromSub = getPlanByPriceId(priceIdFromSub);

                planId = planFromSub?.id || planId;
                stripePriceId = priceIdFromSub;
                currentPeriodEnd = new Date(subscription.current_period_end * 1000);
            } else {
                // For one-time payments, use the line item to guess the plan if the user is still 'free'
                const priceIdFromInvoice = (invoice.lines.data[0] as any)?.price?.id;
                if (priceIdFromInvoice) {
                    const planFromInvoice = getPlanByPriceId(priceIdFromInvoice);
                    if (planFromInvoice) planId = planFromInvoice.id;
                    stripePriceId = priceIdFromInvoice;
                }
            }

            console.log(`[STRIPE_WEBHOOK] Updating user ${user.id} plan to: ${planId}`);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    stripeSubscriptionId: subscriptionId || undefined,
                    stripePriceId: stripePriceId,
                    stripeCurrentPeriodEnd: currentPeriodEnd,
                    plan: planId,
                },
            });
            console.log(`[STRIPE_WEBHOOK] User ${user.email} updated successfully via invoice`);
        } else {
            console.warn(`[STRIPE_WEBHOOK] No user found for customer ${customerId}`);
        }
    }

    if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[STRIPE_WEBHOOK] Subscription deleted: ${subscription.id}`);

        await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                plan: "free",
                stripeSubscriptionId: null,
                stripePriceId: null,
                stripeCurrentPeriodEnd: null,
                stripeCancelAtPeriodEnd: false,
            },
        });
        console.log(`[STRIPE_WEBHOOK] User reverted to free plan`);
    }

    if (event.type === "customer.subscription.updated") {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[STRIPE_WEBHOOK] Subscription updated: ${subscription.id}`);

        const priceId = subscription.items.data[0].price.id;
        const plan = getPlanByPriceId(priceId);

        await prisma.user.update({
            where: {
                stripeSubscriptionId: subscription.id,
            },
            data: {
                stripePriceId: priceId,
                stripeCurrentPeriodEnd: new Date(
                    (subscription as any).current_period_end * 1000
                ),
                stripeCancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
                plan: plan?.id || "free",
            },
        });
        console.log(`[STRIPE_WEBHOOK] User subscription dates synchronized`);
    }

    return new NextResponse(null, { status: 200 });
}
