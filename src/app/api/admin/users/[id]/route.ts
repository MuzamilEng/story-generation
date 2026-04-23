import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/roles";
import { Plan } from "@prisma/client";
import { betaTypeToPlan } from "@/lib/beta-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { role, isActive, plan, revokeBeta, assignBetaTwoMonths } = await request.json();

    // Prevent admin from modifying their own admin status
    if (userId === session.user.id && role && role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Cannot modify your own admin privileges" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (role !== undefined) {
      updateData.role = role;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    if (assignBetaTwoMonths && plan !== undefined) {
      return NextResponse.json(
        { error: "Cannot assign beta plan and direct plan in the same request" },
        { status: 400 },
      );
    }
    if (plan !== undefined) {
      updateData.plan = plan as Plan;
      updateData.plan_renewed_at = new Date();
      updateData.plan_started_at = plan === "free" ? null : new Date();
    }

    const now = new Date();
    const shouldRevokeBeta = Boolean(revokeBeta || plan !== undefined);

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (assignBetaTwoMonths) {
        const nowDate = new Date();
        const expiresAt = new Date(nowDate);
        expiresAt.setMonth(expiresAt.getMonth() + 2);

        const latestRedemption = await tx.userBetaCode.findFirst({
          where: { userId },
          orderBy: { activatedAt: "desc" },
          include: {
            betaCode: {
              select: {
                id: true,
                type: true,
              },
            },
          },
        });

        let targetBetaType = "amplifier_2_months";

        if (latestRedemption?.betaCode) {
          targetBetaType = latestRedemption.betaCode.type || "amplifier_2_months";

          await tx.betaCode.update({
            where: { id: latestRedemption.betaCode.id },
            data: { isActive: true },
          });

          await tx.userBetaCode.update({
            where: { id: latestRedemption.id },
            data: {
              activatedAt: nowDate,
              expiresAt,
            },
          });
        } else {
          const generatedCode = `ADMIN-${userId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

          const createdCode = await tx.betaCode.create({
            data: {
              code: generatedCode,
              type: targetBetaType,
              max_uses: 1,
              current_uses: 1,
              isActive: true,
            },
            select: { id: true, type: true },
          });

          targetBetaType = createdCode.type;

          await tx.userBetaCode.create({
            data: {
              userId,
              codeId: createdCode.id,
              activatedAt: nowDate,
              expiresAt,
            },
          });
        }

        const betaPlan = betaTypeToPlan(targetBetaType);
        updateData.plan = betaPlan;
        updateData.plan_started_at = nowDate;
        updateData.plan_renewed_at = nowDate;
        updateData.is_beta = true;
        updateData.beta_source = "code";
      }

      if (shouldRevokeBeta) {
        await tx.userBetaCode.updateMany({
          where: {
            userId: userId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          data: { expiresAt: now },
        });

        updateData.is_beta = false;
        updateData.beta_source = null;

        if (revokeBeta && plan === undefined) {
          updateData.plan = "free";
          updateData.plan_started_at = null;
          updateData.plan_renewed_at = new Date();
        }
      }

      if (isActive === false) {
        await tx.session.deleteMany({
          where: { userId },
        });
      }

      return tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          isActive: true,
          is_beta: true,
          beta_source: true,
          stripeSubscriptionId: true,
          stripeCurrentPeriodEnd: true,
          stripeCancelAtPeriodEnd: true,
          createdAt: true,
          lastLogin: true,
          betaCodes: {
            orderBy: { activatedAt: "desc" },
            take: 1,
            select: {
              activatedAt: true,
              expiresAt: true,
              betaCode: {
                select: {
                  id: true,
                  code: true,
                  type: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });
    });

    const nowForStatus = new Date();
    const latestRedemption = updatedUser.betaCodes[0];
    const hasActiveRedemption = Boolean(
      latestRedemption &&
        (!latestRedemption.expiresAt || latestRedemption.expiresAt > nowForStatus) &&
        latestRedemption.betaCode?.isActive,
    );

    const serializedUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      plan: updatedUser.plan,
      isActive: updatedUser.isActive,
      isBetaUser: hasActiveRedemption || updatedUser.is_beta,
      betaSource: updatedUser.beta_source,
      activeBetaCodeId: latestRedemption?.betaCode?.id ?? null,
      activeBetaCode: latestRedemption?.betaCode?.code ?? null,
      activeBetaCodeType: latestRedemption?.betaCode?.type ?? null,
      activeBetaCodeIsActive: latestRedemption?.betaCode?.isActive ?? null,
      betaExpiresAt: latestRedemption?.expiresAt ?? null,
      hasStripeSubscription: Boolean(updatedUser.stripeSubscriptionId),
      stripeSubscriptionId: updatedUser.stripeSubscriptionId,
      stripeCurrentPeriodEnd: updatedUser.stripeCurrentPeriodEnd,
      stripeCancelAtPeriodEnd: updatedUser.stripeCancelAtPeriodEnd,
      createdAt: updatedUser.createdAt,
      lastLogin: updatedUser.lastLogin,
    };

    return NextResponse.json({ user: serializedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
