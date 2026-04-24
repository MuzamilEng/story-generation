import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/roles";
import { appLog } from "@/lib/app-logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "5", 10)));
    const skip = (page - 1) * limit;
    const audioStoryFilter = {
      OR: [
        { status: "audio_ready" as const },
        { audio_generated_at: { not: null } },
        { audio_url: { not: null } },
        { audio_r2_key: { not: null } },
        { combined_audio_key: { not: null } },
        { voice_only_r2_key: { not: null } },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    const userIds = users.map((user) => user.id);
    const storyCounts = userIds.length
      ? await prisma.story.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
            ...audioStoryFilter,
          },
          _count: {
            _all: true,
          },
        })
      : [];

    const countsByUserId = Object.fromEntries(
      storyCounts.map((item) => [item.userId, item._count._all]),
    );
    const now = new Date();

    const serializedUsers = users.map((user) => ({
      ...(() => {
        const latestRedemption = user.betaCodes[0];
        const hasActiveRedemption = Boolean(
          latestRedemption &&
            (!latestRedemption.expiresAt || latestRedemption.expiresAt > now) &&
            latestRedemption.betaCode?.isActive,
        );

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
          isActive: user.isActive,
          isBetaUser: hasActiveRedemption || user.is_beta,
          betaSource: user.beta_source,
          activeBetaCodeId: latestRedemption?.betaCode?.id ?? null,
          activeBetaCode: latestRedemption?.betaCode?.code ?? null,
          activeBetaCodeType: latestRedemption?.betaCode?.type ?? null,
          activeBetaCodeIsActive: latestRedemption?.betaCode?.isActive ?? null,
          betaExpiresAt: latestRedemption?.expiresAt ?? null,
          hasStripeSubscription: Boolean(user.stripeSubscriptionId),
          stripeSubscriptionId: user.stripeSubscriptionId,
          stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
          stripeCancelAtPeriodEnd: user.stripeCancelAtPeriodEnd,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          storyCount: countsByUserId[user.id] ?? 0,
        };
      })(),
    }));

    return NextResponse.json({ users: serializedUsers, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching users:", error);
    appLog({ level: "error", source: "api/admin/users", message: `Admin users fetch error: ${error instanceof Error ? error.message : error}` });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
