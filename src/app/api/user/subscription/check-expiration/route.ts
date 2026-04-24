import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { appLog } from "@/lib/app-logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                plan: true,
                stripeSubscriptionId: true,
                stripeCustomerId: true,
                stripeCurrentPeriodEnd: true,
                stripeCancelAtPeriodEnd: true,
                soundscape: true,
                binaural_enabled: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Free plan users don't expire
        if (user.plan === "free") {
            return NextResponse.json({
                status: "active",
                plan: "free",
                message: "Explorer plan does not expire.",
            });
        }

        // Check if the plan period has ended
        const now = new Date();
        const periodEnd = user.stripeCurrentPeriodEnd;

        if (!periodEnd || periodEnd > now) {
            // Plan is still active
            return NextResponse.json({
                status: "active",
                plan: user.plan,
                periodEnd: periodEnd?.toISOString() || null,
            });
        }

        // ── Plan has expired — attempt auto-renewal via Stripe ──────────────
        console.log(`[PLAN_EXPIRY] Plan expired for user ${user.id}. Attempting renewal...`);

        if (user.stripeSubscriptionId) {
            try {
                // Retrieve the subscription from Stripe to get its real status
                const subscription = await stripe.subscriptions.retrieve(
                    user.stripeSubscriptionId
                );

                if (subscription.status === "active" || subscription.status === "trialing") {
                    // Stripe already renewed it — sync the new period end to our DB
                    const newPeriodEnd = new Date(
                        (subscription as any).current_period_end * 1000
                    );

                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            stripeCurrentPeriodEnd: newPeriodEnd,
                            stripeCancelAtPeriodEnd:
                                (subscription as any).cancel_at_period_end ?? false,
                        },
                    });

                    console.log(
                        `[PLAN_EXPIRY] Subscription still active on Stripe. Synced new period end: ${newPeriodEnd.toISOString()}`
                    );

                    return NextResponse.json({
                        status: "renewed",
                        plan: user.plan,
                        periodEnd: newPeriodEnd.toISOString(),
                        message: "Subscription renewed successfully.",
                    });
                }

                if (subscription.status === "past_due" || subscription.status === "unpaid") {
                    // Payment failed — try to create an invoice and pay it
                    try {
                        const latestInvoice =
                            typeof subscription.latest_invoice === "string"
                                ? await stripe.invoices.retrieve(subscription.latest_invoice)
                                : subscription.latest_invoice;

                        if (latestInvoice && latestInvoice.status === "open") {
                            // Attempt to pay the open invoice
                            await stripe.invoices.pay(latestInvoice.id);

                            // Re-fetch subscription after payment attempt
                            const updatedSub = await stripe.subscriptions.retrieve(
                                user.stripeSubscriptionId
                            );

                            if (
                                updatedSub.status === "active" ||
                                updatedSub.status === "trialing"
                            ) {
                                const newPeriodEnd = new Date(
                                    (updatedSub as any).current_period_end * 1000
                                );

                                await prisma.user.update({
                                    where: { id: user.id },
                                    data: {
                                        stripeCurrentPeriodEnd: newPeriodEnd,
                                        stripeCancelAtPeriodEnd:
                                            (updatedSub as any).cancel_at_period_end ?? false,
                                    },
                                });

                                console.log(
                                    `[PLAN_EXPIRY] Invoice payment succeeded. Renewed for user ${user.id}`
                                );

                                return NextResponse.json({
                                    status: "renewed",
                                    plan: user.plan,
                                    periodEnd: newPeriodEnd.toISOString(),
                                    message: "Payment succeeded. Subscription renewed.",
                                });
                            }
                        }
                    } catch (payError: any) {
                        console.error(
                            `[PLAN_EXPIRY] Invoice payment failed for user ${user.id}:`,
                            payError.message
                        );
                        appLog({ level: "error", source: "api/user/subscription/check-expiration", message: `Invoice payment failed for user ${user.id}: ${payError.message}`, userId: user.id });
                    }

                    // Payment failed — downgrade to Explorer
                    console.log(
                        `[PLAN_EXPIRY] Payment failed. Downgrading user ${user.id} to Explorer.`
                    );
                    await downgradeToExplorer(user.id);

                    return NextResponse.json({
                        status: "expired",
                        plan: "free",
                        message:
                            "Payment failed. Your plan has been downgraded to Explorer.",
                        paymentFailed: true,
                    });
                }

                if (
                    subscription.status === "canceled" ||
                    subscription.status === "incomplete_expired"
                ) {
                    // Subscription is fully canceled on Stripe
                    console.log(
                        `[PLAN_EXPIRY] Subscription canceled on Stripe. Downgrading user ${user.id}`
                    );
                    await downgradeToExplorer(user.id);

                    return NextResponse.json({
                        status: "expired",
                        plan: "free",
                        message:
                            "Your subscription has ended. You have been moved to the Explorer plan.",
                        paymentFailed: false,
                    });
                }
            } catch (stripeError: any) {
                console.error(
                    `[PLAN_EXPIRY] Stripe API error for user ${user.id}:`,
                    stripeError.message
                );
                appLog({ level: "error", source: "api/user/subscription/check-expiration", message: `Stripe API error for user ${user.id}: ${stripeError.message}`, userId: user.id });

                // Stripe API itself failed — downgrade to be safe
                await downgradeToExplorer(user.id);

                return NextResponse.json({
                    status: "expired",
                    plan: "free",
                    message:
                        "Unable to renew your subscription. You have been moved to the Explorer plan.",
                    paymentFailed: true,
                });
            }
        }

        // No stripe subscription ID — just downgrade
        console.log(
            `[PLAN_EXPIRY] No subscription ID. Downgrading user ${user.id} to Explorer.`
        );
        await downgradeToExplorer(user.id);

        return NextResponse.json({
            status: "expired",
            plan: "free",
            message: "Your plan has expired. You are now on the Explorer plan.",
            paymentFailed: false,
        });
    } catch (error: any) {
        console.error("[CHECK_EXPIRATION_ERROR]", error);
        appLog({ level: "error", source: "api/user/subscription/check-expiration", message: `Check expiration error: ${error.message || error}` });
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/**
 * Downgrade a user to the Explorer (free) plan and disable premium audio features.
 */
async function downgradeToExplorer(userId: string) {
    await prisma.user.update({
        where: { id: userId },
        data: {
            plan: "free",
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
            stripeCancelAtPeriodEnd: false,
            // Disable premium audio features
            soundscape: "none",
            binaural_enabled: false,
        },
    });

    console.log(
        `[PLAN_EXPIRY] User ${userId} downgraded to Explorer. Soundscape and binaural disabled.`
    );
}
