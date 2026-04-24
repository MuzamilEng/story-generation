import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBetaDay2Email, sendBetaDay7Email } from "@/lib/email";
import { appLog } from "@/lib/app-logger";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint — call daily to send Day 2 and Day 7 survey emails.
 * 
 * Vercel Cron: add to vercel.json:
 *   { "crons": [{ "path": "/api/cron/beta-emails", "schedule": "0 10 * * *" }] }
 * 
 * Or call manually / from external scheduler:
 *   GET /api/cron/beta-emails?secret=YOUR_CRON_SECRET
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

  const now = new Date();
  const results = { day2Sent: 0, day2Errors: 0, day7Sent: 0, day7Errors: 0 };

  try {
    // ── Day 2 emails: signed up >= 2 min ago (TESTING — change to 48h for prod) ──
    const twoDaysAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const day2Signups = await prisma.betaSignup.findMany({
      where: {
        created_at: { lte: twoDaysAgo },
        email_day1_sent_at: { not: null },
        email_day2_sent_at: null,
      },
      select: { id: true, first_name: true, email: true },
    });

    const siteUrl = process.env.NEXTAUTH_URL || "https://manifestmystory.com";

    for (const signup of day2Signups) {
      try {
        const token = Buffer.from(`${signup.id}:${signup.email}`).toString("base64");
        const surveyUrl = `${siteUrl}/survey/beta-day2?t=${encodeURIComponent(token)}`;

        await sendBetaDay2Email(signup.email, signup.first_name, surveyUrl);

        await prisma.betaSignup.update({
          where: { id: signup.id },
          data: { email_day2_sent_at: new Date() },
        });

        results.day2Sent++;
      } catch (err) {
        console.error(`[CRON] Day 2 email failed for ${signup.email}:`, err);
        appLog({ level: "error", source: "cron/beta-emails", message: `Day 2 email failed for ${signup.email}: ${err instanceof Error ? err.message : err}` });
        results.day2Errors++;
      }
    }

    // ── Day 7 emails: signed up >= 7 min ago (TESTING — change to 7 days for prod) ──
    const sevenDaysAgo = new Date(now.getTime() - 7 * 60 * 1000);
    const day7Signups = await prisma.betaSignup.findMany({
      where: {
        created_at: { lte: sevenDaysAgo },
        email_day2_sent_at: { not: null },
        email_day7_sent_at: null,
      },
      select: { id: true, first_name: true, email: true },
    });

    for (const signup of day7Signups) {
      try {
        const token = Buffer.from(`${signup.id}:${signup.email}`).toString("base64");
        const surveyUrl = `${siteUrl}/survey/beta-day7?t=${encodeURIComponent(token)}`;

        await sendBetaDay7Email(signup.email, signup.first_name, surveyUrl);

        await prisma.betaSignup.update({
          where: { id: signup.id },
          data: { email_day7_sent_at: new Date() },
        });

        results.day7Sent++;
      } catch (err) {
        console.error(`[CRON] Day 7 email failed for ${signup.email}:`, err);
        appLog({ level: "error", source: "cron/beta-emails", message: `Day 7 email failed for ${signup.email}: ${err instanceof Error ? err.message : err}` });
        results.day7Errors++;
      }
    }

    console.log("[CRON] Beta emails complete:", results);
    appLog({ level: "info", source: "cron/beta-emails", message: `Cron beta emails complete: Day2 sent=${results.day2Sent} errors=${results.day2Errors}, Day7 sent=${results.day7Sent} errors=${results.day7Errors}`, meta: results });
    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("[CRON_BETA_EMAILS_ERROR]", error);
    appLog({ level: "error", source: "cron/beta-emails", message: `Cron beta emails error: ${error instanceof Error ? error.message : error}` });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
