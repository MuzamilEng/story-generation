import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Please enter an access code." }, { status: 400 });
    }

    const upper = code.toUpperCase().trim();

    // 1. Check BetaSignup access codes (MFST-XXXX-XXXX)
    const betaSignup = await prisma.betaSignup.findUnique({
      where: { access_code: upper },
    });

    if (betaSignup) {
      // Already activated by another user
      if (betaSignup.user_id) {
        return NextResponse.json(
          { error: "This code has already been used." },
          { status: 400 }
        );
      }
      return NextResponse.json({ valid: true, source: "signup" });
    }

    // 2. Check legacy BetaCode table
    const betaCode = await prisma.betaCode.findUnique({
      where: { code: upper },
    });

    if (!betaCode || !betaCode.isActive || betaCode.current_uses >= betaCode.max_uses) {
      return NextResponse.json(
        { error: "That code doesn't look right. Contact us if you need help." },
        { status: 404 }
      );
    }

    return NextResponse.json({ valid: true, source: "legacy" });
  } catch (error) {
    console.error("[BETA_VALIDATE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
