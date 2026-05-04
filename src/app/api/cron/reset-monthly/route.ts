import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appLog } from "@/lib/app-logger";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint — call on the 1st of every month to reset per-user monthly counters.
 *
 * Resets: stories_this_month, audio_mins_this_month
 *
 * Vercel Cron (add to vercel.json):
 *   { "path": "/api/cron/reset-monthly", "schedule": "0 0 1 * *" }
 *
 * Or call manually:
 *   GET /api/cron/reset-monthly?secret=YOUR_CRON_SECRET
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
    const result = await prisma.user.updateMany({
      data: {
        stories_this_month: 0,
        audio_mins_this_month: 0,
      },
    });

    const msg = `Monthly counters reset for ${result.count} users`;
    console.log(`[CRON] ${msg}`);
    appLog({
      level: "info",
      source: "cron/reset-monthly",
      message: msg,
      meta: { usersAffected: result.count },
    });

    return NextResponse.json({ success: true, usersReset: result.count });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[CRON] Monthly reset failed:", errMsg);
    appLog({
      level: "error",
      source: "cron/reset-monthly",
      message: `Monthly reset failed: ${errMsg}`,
    });
    return NextResponse.json(
      { error: "Monthly reset failed" },
      { status: 500 }
    );
  }
}
