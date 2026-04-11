import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIXING_SERVER = process.env.MIXING_SERVER_URL || 'http://localhost:4000';
const API_SECRET = process.env.MIXING_API_SECRET || '';

/**
 * POST /api/user/audio/unmix
 * Body: { storyId }
 *
 * Reverts a story to voice-only audio by removing the mixed combined file.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { storyId } = body;

  if (!storyId) {
    return NextResponse.json(
      { error: 'storyId is required' },
      { status: 400 }
    );
  }

  // Verify the user owns this story
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { userId: true },
  });
  if (!story || story.userId !== session.user.id) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  try {
    const res = await fetch(`${MIXING_SERVER}/unmix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
      },
      body: JSON.stringify({ storyId }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || 'Unmix failed' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[api/unmix] Error calling mixing server:', err);
    return NextResponse.json(
      { error: 'Mixing server unavailable' },
      { status: 502 }
    );
  }
}
