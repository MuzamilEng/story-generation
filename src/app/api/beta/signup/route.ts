import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBetaWelcomeEmail } from "@/lib/email";
import { appLog } from "@/lib/app-logger";

const MAX_SPOTS = 500;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateAccessCode(): string {
  const part = (len: number) =>
    Array.from({ length: len }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  return `MFST-${part(4)}-${part(4)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const firstName = (body.firstName ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const referral = (body.referral ?? "").trim() || null;
    const referralDetail = (body.referralDetail ?? "").trim() || null;

    if (!firstName || !email || !email.includes("@")) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    // Check capacity
    const count = await prisma.betaSignup.count();
    if (count >= MAX_SPOTS) {
      return NextResponse.json({ error: "spots_full" }, { status: 200 });
    }

    // Check duplicate
    const existing = await prisma.betaSignup.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "duplicate" }, { status: 200 });
    }

    // Generate unique access code
    let accessCode = generateAccessCode();
    let attempts = 0;
    while (await prisma.betaSignup.findUnique({ where: { access_code: accessCode } })) {
      accessCode = generateAccessCode();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    }

    // Create signup record + BetaCode record (manifester plan, 2 months)
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

    const signup = await prisma.$transaction(async (tx) => {
      const s = await tx.betaSignup.create({
        data: {
          access_code: accessCode,
          first_name: firstName,
          email,
          referral,
          referral_detail: referralDetail,
        },
      });

      // Also create a BetaCode so the existing validate/redeem flow works
      await tx.betaCode.create({
        data: {
          code: accessCode,
          type: "manifester_2_months",
          max_uses: 1,
          current_uses: 0,
          expires_at: twoMonthsFromNow,
          isActive: true,
        },
      });

      return s;
    });

    // Send welcome email and mark as sent
    sendBetaWelcomeEmail(email, firstName, accessCode)
      .then(() =>
        prisma.betaSignup.update({
          where: { id: signup.id },
          data: { email_day1_sent_at: new Date() },
        })
      )
      .catch((err) => {
        console.error("[BETA_WELCOME_EMAIL_ERROR]", err);
        appLog({ level: "error", source: "api/beta/signup", message: `Beta welcome email failed: ${err.message || err}`, meta: { email } });
      });

    appLog({ level: "info", source: "api/beta/signup", message: `Beta signup: ${email}`, meta: { referral } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BETA_SIGNUP_ERROR]", error);
    appLog({ level: "error", source: "api/beta/signup", message: `Beta signup error: ${error instanceof Error ? error.message : error}` });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
