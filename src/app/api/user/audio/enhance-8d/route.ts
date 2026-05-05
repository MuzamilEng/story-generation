import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const maxDuration = 120;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIXING_SERVER = process.env.MIXING_SERVER_URL || 'http://localhost:4000';
const API_SECRET = process.env.MIXING_API_SECRET || '';

/**
 * POST /api/user/audio/enhance-8d
 * Body: { storyId }
 *
 * Sends the 8D enhancement request to the mixing server which:
 *   1. Downloads voice from R2
 *   2. Applies 8D spatial audio processing
 *   3. Uploads the 8D version back to R2
 *   4. Deletes the old non-8D audio from R2
 *   5. Updates the story audio URL
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
    const enhanceRes = await fetch(`${MIXING_SERVER}/enhance-8d`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
      },
      body: JSON.stringify({ storyId }),
    });

    const data = await enhanceRes.json();

    if (!enhanceRes.ok) {
      return NextResponse.json(
        { error: data.error || '8D enhancement failed' },
        { status: enhanceRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[api/enhance-8d] Error calling mixing server:', err);
    return NextResponse.json(
      { error: 'Mixing server unavailable' },
      { status: 502 }
    );
  }
}
