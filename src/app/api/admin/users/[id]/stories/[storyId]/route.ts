import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/roles";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; storyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: userId, storyId } = await params;
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, userId: true },
    });

    if (!story || story.userId !== userId) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    await prisma.story.delete({
      where: { id: storyId },
    });

    return NextResponse.json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Error deleting user story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
