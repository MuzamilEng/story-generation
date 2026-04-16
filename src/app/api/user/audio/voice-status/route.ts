import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { elevenlabs_voice_id: true, voice_model_id: true },
  });

  const hasVoice = !!(user?.elevenlabs_voice_id || user?.voice_model_id);

  return NextResponse.json({ hasVoice });
}
