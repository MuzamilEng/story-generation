import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/roles";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
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

    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where: {
          userId,
          ...audioStoryFilter,
        },
        select: {
          id: true,
          title: true,
          status: true,
          story_type: true,
          createdAt: true,
          updatedAt: true,
          word_count: true,
          story_text_approved: true,
          story_text_draft: true,
          combined_audio_key: true,
          voice_only_r2_key: true,
          audio_r2_key: true,
          audio_url: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.story.count({
        where: {
          userId,
          ...audioStoryFilter,
        },
      }),
    ]);

    const serializedStories = stories.map((story) => ({
      ...story,
      audioKey: story.combined_audio_key || story.voice_only_r2_key || story.audio_r2_key || null,
    }));

    return NextResponse.json({
      stories: serializedStories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching user stories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
