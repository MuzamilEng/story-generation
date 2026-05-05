import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIXING_SERVER = process.env.MIXING_SERVER_URL || 'http://localhost:4000';
const API_SECRET = process.env.MIXING_API_SECRET || '';

/**
 * POST /api/user/audio/enhance-8d
 * Body: { storyId }
 *
 * Fire-and-forget: sends the 8D enhancement request to the mixing server
 * and returns immediately with 202 Accepted. The mixing server processes
 * in the background and updates the DB when done. The client polls
 * GET /api/user/stories/:id to detect when audio_url changes.
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
    select: { userId: true, audio_r2_key: true },
  });
  if (!story || story.userId !== session.user.id) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  // Check if already 8D enhanced
  if (story.audio_r2_key && /binaural_8d/i.test(story.audio_r2_key)) {
    return NextResponse.json({ error: 'Audio is already 8D enhanced' }, { status: 400 });
  }

  try {
    // Mixing server validates and returns 202 instantly, then processes in background
    const enhanceRes = await fetch(`${MIXING_SERVER}/enhance-8d`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
      },
      body: JSON.stringify({ storyId }),
      signal: AbortSignal.timeout(10000), // 10s — only waiting for validation, not processing
    });

    const data = await enhanceRes.json();

    if (!enhanceRes.ok && enhanceRes.status !== 202) {
      return NextResponse.json(
        { error: data.error || '8D enhancement failed' },
        { status: enhanceRes.status }
      );
    }

    return NextResponse.json(data, { status: 202 });
  } catch (err: any) {
    console.error('[api/enhance-8d] Error calling mixing server:', err);
    return NextResponse.json(
      { error: 'Mixing server unavailable. Please try again.' },
      { status: 502 }
    );
  }
}
