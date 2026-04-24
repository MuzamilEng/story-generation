import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { betaTypeToPlan } from "@/lib/beta-utils";
import { appLog } from "@/lib/app-logger";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { code } = await req.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "Invalid code provided" }, { status: 400 });
        }

        const userId = session.user.id;

        // 0. Check if user is already on a paid plan
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { plan: true }
        });

        if (currentUser && currentUser.plan !== 'free') {
            return NextResponse.json({ error: "Beta codes can only be used on free accounts." }, { status: 400 });
        }

        const upper = code.toUpperCase().trim();

        // 1a. Check BetaSignup access codes (MFST-XXXX-XXXX)
        const betaSignup = await prisma.betaSignup.findUnique({
            where: { access_code: upper }
        });

        if (betaSignup) {
            // Already activated by another user
            if (betaSignup.user_id) {
                return NextResponse.json({ error: "This code has already been used." }, { status: 400 });
            }

            // Check if user already redeemed any code
            const existingRedemption = await prisma.userBetaCode.findFirst({
                where: { userId }
            });
            if (existingRedemption) {
                return NextResponse.json({ error: "You have already redeemed a beta code." }, { status: 400 });
            }

            // Grant manifester plan (beta, not paid) for beta signup codes
            const twoMonthsFromNow = new Date();
            twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

            await prisma.$transaction([
                prisma.user.update({
                    where: { id: userId },
                    data: {
                        plan: "manifester",
                        is_beta: true,
                        beta_source: "signup",
                    }
                }),
                prisma.betaSignup.update({
                    where: { id: betaSignup.id },
                    data: {
                        user_id: userId,
                        status: "activated",
                        activated_at: new Date(),
                    }
                }),
            ]);

            return NextResponse.json({ success: true, expiresAt: twoMonthsFromNow });
        }

        // 1b. Check legacy BetaCode table
        const betaCode = await prisma.betaCode.findUnique({
            where: { code: upper }
        });

        if (!betaCode) {
            return NextResponse.json({ error: "Invalid or expired beta code." }, { status: 404 });
        }
        if (!betaCode.isActive || betaCode.current_uses >= betaCode.max_uses) {
            return NextResponse.json({ error: "Beta code is inactive or has reached its usage limit." }, { status: 400 });
        }

        // 2. Check if user already redeemed a code
        const existingRedemption = await prisma.userBetaCode.findFirst({
            where: { userId }
        });

        if (existingRedemption) {
            return NextResponse.json({ error: "You have already redeemed a beta code." }, { status: 400 });
        }

        // 3. Redeem the legacy code
        const twoMonthsFromNow = new Date();
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

        // Derive plan from beta code type (e.g. "manifester_2_months" → manifester)
        const betaPlan = betaTypeToPlan(betaCode.type);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { plan: betaPlan }
            }),
            prisma.userBetaCode.create({
                data: {
                    userId,
                    codeId: betaCode.id,
                    expiresAt: twoMonthsFromNow
                }
            }),
            prisma.betaCode.update({
                where: { id: betaCode.id },
                data: { current_uses: { increment: 1 } }
            })
        ]);

        appLog({ level: "info", source: "api/beta/redeem", message: `Beta code redeemed`, userId, meta: { codeId: betaCode.id, expiresAt: twoMonthsFromNow } });

        return NextResponse.json({ success: true, expiresAt: twoMonthsFromNow });
    } catch (error) {
        console.error("[BETA_REDEEM_ERROR]", error);
        appLog({ level: "error", source: "api/beta/redeem", message: `Beta redeem error: ${error instanceof Error ? error.message : error}` });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
