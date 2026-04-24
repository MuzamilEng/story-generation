import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendFeedbackNotification } from "@/lib/email";
import { appLog } from "@/lib/app-logger";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { responses } = await req.json();
    if (!responses || typeof responses !== "object") {
      return NextResponse.json({ error: "Invalid survey responses." }, { status: 400 });
    }

    const userId = session.user.id;

    // Upsert feedback — create or update if already submitted
    await prisma.$transaction([
      prisma.betaFeedback.upsert({
        where: { userId },
        create: {
          userId,
          responses,
        },
        update: {
          responses,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { has_completed_survey: true },
      }),
    ]);

    // Notify Michael (non-blocking)
    console.log("[FEEDBACK_EMAIL] Attempting to send notification...");
    sendFeedbackNotification(
      session.user.name ?? "Unknown",
      session.user.email ?? "unknown",
      responses
    )
      .then(() => console.log("[FEEDBACK_EMAIL] Sent successfully"))
      .catch((err) => {
        console.error("[FEEDBACK_EMAIL_ERROR]", err.message, err.code, err);
        appLog({ level: "error", source: "api/feedback", message: `Feedback email notification failed: ${err.message}`, userId: session.user.id });
      });

    appLog({ level: "info", source: "api/feedback", message: `Feedback submitted`, userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FEEDBACK_ERROR]", error);
    appLog({ level: "error", source: "api/feedback", message: `Feedback submit error: ${error instanceof Error ? error.message : error}` });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user should see the survey
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        is_beta: true,
        has_completed_survey: true,
        elevenlabs_voice_id: true,
        stories: {
          where: { status: "audio_ready" },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasVoice = !!user.elevenlabs_voice_id;
    const hasCompletedStory = user.stories.length > 0;
    const shouldShowSurvey =
      user.is_beta &&
      !user.has_completed_survey &&
      hasVoice &&
      hasCompletedStory;

    return NextResponse.json({ shouldShowSurvey });
  } catch (error) {
    console.error("[FEEDBACK_CHECK_ERROR]", error);
    appLog({ level: "error", source: "api/feedback", message: `Feedback check error: ${error instanceof Error ? error.message : error}` });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
