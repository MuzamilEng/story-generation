import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { appLog } from "@/lib/app-logger";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { stripeCustomerId: true }
        });

        if (!user?.stripeCustomerId) {
            return NextResponse.json([]);
        }

        const invoices = await stripe.invoices.list({
            customer: user.stripeCustomerId,
            limit: 20,
        });

        const billingRecords = invoices.data.map((invoice) => ({
            date: new Date(invoice.created * 1000),
            amount: invoice.amount_paid / 100,
            status: invoice.status === 'paid' ? 'paid' : (invoice.status || 'open'),
            description: invoice.lines.data[0]?.description || "Subscription update",
            receiptUrl: invoice.hosted_invoice_url,
        }));

        return NextResponse.json(billingRecords);
    } catch (error) {
        console.error("[BILLING_HISTORY_ERROR]", error);
        appLog({ level: "error", source: "api/user/subscription/history", message: `Billing history error: ${error instanceof Error ? error.message : error}` });
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
