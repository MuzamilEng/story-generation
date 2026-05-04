import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appLog } from "@/lib/app-logger";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint — detects stories stuck in 'awaited_voice_generation' for too long
 * and resets them to 'approved' so users can retry.
 *
 * This handles edge cases where:
 *   - Redis goes down mid-job and BullMQ never completes/fails
 *   - The mixing server crashes without updating the DB
 *   - Network issues prevent the completion callback from reaching the DB
 *
 * Vercel Cron: runs every 10 minutes
 *   { "path": "/api/cron/recover-stuck", "schedule": "&#42;/10 * * * *" }
 *
 * Or call manually:
 *   GET /api/cron/recover-stuck?secret=YOUR_CRON_SECRET
 */
export async function GET(req: NextRequest) {
  // Auth: require CRON_SECRET (skip if not set, for dev)
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    const token = authHeader?.replace("Bearer ", "") || querySecret;

    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Stories stuck in 'awaited_voice_generation' for more than 30 minutes
    // are almost certainly abandoned jobs (normal assembly takes 2-5 min).
    const STUCK_THRESHOLD_MINUTES = 30;
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

    const stuckStories = await prisma.story.findMany({
      where: {
        status: "awaited_voice_generation",
        updatedAt: { lt: cutoff },
      },
      select: {
        id: true,
        userId: true,
        updatedAt: true,
      },
    });

    if (stuckStories.length === 0) {
      return NextResponse.json({
        recovered: 0,
        message: "No stuck stories found",
      });
    }

    // Reset all stuck stories to 'approved' so users can retry generation
    const stuckIds = stuckStories.map((s) => s.id);

    const result = await prisma.story.updateMany({
      where: { id: { in: stuckIds } },
      data: { status: "approved" },
    });

    const stuckDetails = stuckStories.map((s) => ({
      storyId: s.id,
      userId: s.userId,
      stuckSince: s.updatedAt.toISOString(),
      stuckMinutes: Math.round((Date.now() - s.updatedAt.getTime()) / 60000),
    }));

    const msg = `Recovered ${result.count} stuck stories: ${stuckIds.join(", ")}`;
    console.log(`[CRON] ${msg}`);

    await appLog({
      level: "warn",
      source: "cron/recover-stuck",
      message: msg,
      meta: { stories: stuckDetails },
    });

    return NextResponse.json({
      recovered: result.count,
      stories: stuckDetails,
      message: msg,
    });
  } catch (err: any) {
    console.error("[CRON] recover-stuck error:", err);
    await appLog({
      level: "error",
      source: "cron/recover-stuck",
      message: `Recovery cron failed: ${err.message}`,
      meta: { stack: err.stack },
    });
    return NextResponse.json(
      { error: err.message || "Recovery failed" },
      { status: 500 }
    );
  }
}
