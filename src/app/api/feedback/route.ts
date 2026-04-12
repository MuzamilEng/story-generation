import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Check if already submitted
    const existing = await prisma.betaFeedback.findUnique({
      where: { userId },
    });

    if (existing) {
      return NextResponse.json({ error: "You have already submitted feedback." }, { status: 400 });
    }

    // Store feedback and mark survey as completed
    await prisma.$transaction([
      prisma.betaFeedback.create({
        data: {
          userId,
          responses,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { has_completed_survey: true },
      }),
    ]);

    // TODO: Send email notification to Michael when configured

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FEEDBACK_ERROR]", error);
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
