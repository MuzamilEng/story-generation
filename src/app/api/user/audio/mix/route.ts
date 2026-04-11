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
 * POST /api/user/audio/mix
 * Body: { storyId, soundscapeId, backgroundVolume? }
 *
 * Sends the mixing request to the Express mixing server which:
 *   1. Downloads voice + soundscape from R2
 *   2. Mixes them with FFmpeg
 *   3. Uploads the result back to R2
 *   4. Removes the previous combined audio
 *   5. Returns the new audio URL
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { storyId, soundscapeId, backgroundVolume, binauralEnabled } = body;

  if (!storyId || (!soundscapeId && !binauralEnabled)) {
    return NextResponse.json(
      { error: 'storyId and (soundscapeId or binauralEnabled) are required' },
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
    const mixRes = await fetch(`${MIXING_SERVER}/mix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
      },
      body: JSON.stringify({ storyId, soundscapeId, backgroundVolume, binauralEnabled }),
    });

    const data = await mixRes.json();

    if (!mixRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Mixing failed' },
        { status: mixRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[api/mix] Error calling mixing server:', err);
    return NextResponse.json(
      { error: 'Mixing server unavailable' },
      { status: 502 }
    );
  }
}
