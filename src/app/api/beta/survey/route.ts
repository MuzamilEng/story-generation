import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appLog } from "@/lib/app-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, surveyType, responses, source } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing or invalid token." }, { status: 400 });
    }
    if (!surveyType || !["day2", "day7"].includes(surveyType)) {
      return NextResponse.json({ error: "Invalid survey type." }, { status: 400 });
    }
    if (!responses || typeof responses !== "object") {
      return NextResponse.json({ error: "Invalid responses." }, { status: 400 });
    }

    // Token format: base64(signupId:email)
    let signupId: string;
    let email: string;
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      if (parts.length < 2) throw new Error("bad token");
      signupId = parts[0];
      email = parts.slice(1).join(":");
    } catch {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    // Verify signup exists
    const signup = await prisma.betaSignup.findUnique({ where: { id: signupId } });
    if (!signup || signup.email !== email) {
      return NextResponse.json({ error: "Invalid token." }, { status: 403 });
    }

    // Check if already submitted
    const timestampField = surveyType === "day2" ? "survey1_completed_at" : "survey2_completed_at";
    if (signup[timestampField]) {
      return NextResponse.json({ error: "Survey already submitted." }, { status: 409 });
    }

    // Save response & update signup timestamp
    await prisma.$transaction([
      prisma.betaSurveyResponse.create({
        data: {
          beta_signup_id: signupId,
          user_id: signup.user_id,
          survey_type: surveyType,
          responses,
          source: source || "email",
        },
      }),
      prisma.betaSignup.update({
        where: { id: signupId },
        data: { [timestampField]: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BETA_SURVEY_SUBMIT_ERROR]", error);
    appLog({ level: "error", source: "api/beta/survey", message: `Beta survey submit error: ${error instanceof Error ? error.message : error}` });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
