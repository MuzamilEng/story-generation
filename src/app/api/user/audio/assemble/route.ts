import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanGating } from '@/lib/plan-gating';

export const maxDuration = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIXING_SERVER = process.env.MIXING_SERVER_URL || 'http://localhost:4000';
const API_SECRET = process.env.MIXING_API_SECRET || '';

/**
 * POST /api/user/audio/assemble
 * Body: { storyId }
 *
 * Queues full audio assembly in the mixing server (BullMQ worker).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const planCheck = await checkPlanGating(session.user.id, 'generate_audio');
  if (!planCheck.allowed) {
    return NextResponse.json({ error: planCheck.message }, { status: 403 });
  }

  const body = await req.json();
  const { storyId } = body;

  if (!storyId) {
    return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, userId: true, status: true },
  });

  if (!story || story.userId !== session.user.id) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  try {
    const upstream = await fetch(`${MIXING_SERVER}/assemble`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
      },
      body: JSON.stringify({ storyId, userId: session.user.id }),
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await upstream.text();
      console.error(`[api/assemble] Mixing server returned non-JSON (${upstream.status}):`, text.slice(0, 200));
      return NextResponse.json(
        { error: 'Mixing server returned an unexpected response. Check MIXING_SERVER_URL.' },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to queue audio assembly' },
        { status: upstream.status }
      );
    }

    if (!data.completed && story.status !== 'audio_ready') {
      await prisma.story.update({
        where: { id: storyId },
        data: { status: 'awaited_voice_generation' as any },
      });
    }

    return NextResponse.json({
      success: true,
      queued: !!data.queued,
      completed: !!data.completed,
      jobId: data.jobId || null,
      message: data.message || (data.queued ? 'Audio generation queued' : 'Audio generated'),
      ...(data.result ? data.result : {}),
    });
  } catch (err: any) {
    console.error('[api/assemble] Error calling mixing server:', err);
    return NextResponse.json({ error: 'Mixing server unavailable' }, { status: 502 });
  }
}

/**
 * GET /api/user/audio/assemble?storyId=...
 *
 * Returns BullMQ status for the story's assemble job.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const storyId = req.nextUrl.searchParams.get('storyId');
  if (!storyId) {
    return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, userId: true, status: true, audio_url: true },
  });

  if (!story || story.userId !== session.user.id) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  // If story is already ready in DB, short-circuit.
  if (story.status === 'audio_ready' && story.audio_url) {
    return NextResponse.json({
      storyId,
      state: 'completed',
      queuePosition: null,
      message: 'Audio assembly completed',
    });
  }

  try {
    const upstream = await fetch(
      `${MIXING_SERVER}/assemble/status?storyId=${encodeURIComponent(storyId)}`,
      {
        method: 'GET',
        headers: {
          'x-api-secret': API_SECRET,
        },
      }
    );

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await upstream.text();
      console.error(`[api/assemble GET] Mixing server returned non-JSON (${upstream.status}):`, text.slice(0, 200));
      return NextResponse.json(
        { error: 'Mixing server returned an unexpected response. Check MIXING_SERVER_URL.' },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to get assemble queue status' },
        { status: upstream.status }
      );
    }

    // If no queue job is found but story isn't ready yet, treat as processing fallback.
    if (data.state === 'not_found') {
      return NextResponse.json({
        storyId,
        state: 'processing',
        queuePosition: null,
        message: 'Preparing your audio',
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[api/assemble] Error fetching status from mixing server:', err);
    return NextResponse.json({ error: 'Mixing server unavailable' }, { status: 502 });
  }
}
