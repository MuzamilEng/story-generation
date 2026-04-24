import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { appLog } from "@/lib/app-logger";
import { betaTypeToDurationMonths, betaTypeToPlan } from "@/lib/beta-utils";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { isActive } = await req.json();
        if (typeof isActive !== "boolean") {
            return NextResponse.json({ error: "isActive (boolean) is required" }, { status: 400 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Missing beta code id" }, { status: 400 });
        }
        const existing = await prisma.betaCode.findUnique({
            where: { id },
            include: {
                userBetaCodes: {
                    select: { userId: true, expiresAt: true },
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "Beta code not found" }, { status: 404 });
        }

        const betaPlan = betaTypeToPlan(existing.type);
        const durationMonths = betaTypeToDurationMonths(existing.type);
        const now = new Date();
        const activeUserIds = existing.userBetaCodes
            .filter((entry) => !entry.expiresAt || entry.expiresAt > now)
            .map((entry) => entry.userId);
        const redeemedUserIds = [...new Set(existing.userBetaCodes.map((entry) => entry.userId))];
        const restoredExpiry = new Date(now);
        restoredExpiry.setMonth(restoredExpiry.getMonth() + durationMonths);

        let affectedUsers = 0;

        const updatedCode = await prisma.$transaction(async (tx) => {
            const code = await tx.betaCode.update({
                where: { id },
                data: { isActive },
            });

            if (isActive && redeemedUserIds.length > 0) {
                await tx.userBetaCode.updateMany({
                    where: { codeId: id },
                    data: { expiresAt: restoredExpiry },
                });

                const restored = await tx.user.updateMany({
                    where: {
                        id: { in: redeemedUserIds },
                        stripeSubscriptionId: null,
                    },
                    data: {
                        plan: betaPlan,
                        is_beta: true,
                        beta_source: "code",
                    },
                });

                affectedUsers = restored.count;
            }

            if (!isActive && activeUserIds.length > 0) {
                await tx.userBetaCode.updateMany({
                    where: {
                        codeId: id,
                        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                    },
                    data: { expiresAt: now },
                });

                const downgraded = await tx.user.updateMany({
                    where: {
                        id: { in: activeUserIds },
                        stripeSubscriptionId: null,
                        plan: betaPlan,
                    },
                    data: {
                        plan: "free",
                        is_beta: false,
                        beta_source: null,
                    },
                });

                affectedUsers = downgraded.count;
            }

            return code;
        });

        return NextResponse.json({
            code: updatedCode,
            affectedUsers,
        });
    } catch (error) {
        console.error("[BETA_CODES_PATCH]", error);
        appLog({ level: "error", source: "api/admin/beta-codes", message: `Beta codes PATCH error: ${error instanceof Error ? error.message : error}` });
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Missing beta code id" }, { status: 400 });
        }
        const now = new Date();

        const existing = await prisma.betaCode.findUnique({
            where: { id },
        });
        if (!existing) {
            return NextResponse.json({ error: "Beta code not found" }, { status: 404 });
        }

        const betaPlan = betaTypeToPlan(existing.type);
        const redemptions = await prisma.userBetaCode.findMany({
            where: {
                codeId: id,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            select: { userId: true },
        });
        const userIds = redemptions.map((r) => r.userId);

        await prisma.$transaction(async (tx) => {
            await tx.betaCode.update({
                where: { id },
                data: { isActive: false },
            });

            await tx.userBetaCode.updateMany({
                where: {
                    codeId: id,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
                data: { expiresAt: now },
            });

            if (userIds.length > 0) {
                await tx.user.updateMany({
                    where: {
                        id: { in: userIds },
                        stripeSubscriptionId: null,
                        plan: betaPlan,
                    },
                    data: {
                        plan: "free",
                        is_beta: false,
                        beta_source: null,
                    },
                });
            }
        });

        return NextResponse.json({
            message: "Beta code deactivated (not deleted)",
            deactivated: true,
        });
    } catch (error) {
        console.error("[BETA_CODES_DELETE]", error);
        appLog({ level: "error", source: "api/admin/beta-codes", message: `Beta codes DELETE error: ${error instanceof Error ? error.message : error}` });
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
