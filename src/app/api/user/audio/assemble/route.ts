import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanGating } from '@/lib/plan-gating';
import { appLog } from '@/lib/app-logger';
import { audioAssembleLimiter, rateLimitResponse } from '@/lib/rate-limit';

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

  // Rate limit: 3 requests/min per user
  const rl = audioAssembleLimiter.check(`user:${session.user.id}`);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

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
    // Mark story as awaited_voice_generation BEFORE calling mixing server.
    // This ensures the status is trackable even if the mixing server or Redis
    // fails mid-job. A recovery cron (/api/cron/recover-stuck) will detect
    // stories stuck in this state for >30 minutes and reset them.
    if (story.status !== 'audio_ready') {
      await prisma.story.update({
        where: { id: storyId },
        data: { status: 'awaited_voice_generation' as any },
      });
    }

    // Retry logic for mixing server communication
    const ASSEMBLE_RETRIES = 3;
    let upstream: Response | null = null;
    let lastError = '';
    for (let attempt = 1; attempt <= ASSEMBLE_RETRIES; attempt++) {
      try {
        upstream = await fetch(`${MIXING_SERVER}/assemble`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-secret': API_SECRET,
          },
          body: JSON.stringify({ storyId, userId: session.user.id }),
          signal: AbortSignal.timeout(50000), // 50s timeout per attempt
        });
        break; // success
      } catch (fetchErr: any) {
        lastError = fetchErr.message || 'Network error';
        if (attempt < ASSEMBLE_RETRIES) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.warn(`[api/assemble] Mixing server attempt ${attempt}/${ASSEMBLE_RETRIES} failed: ${lastError}. Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    if (!upstream) {
      console.error(`[api/assemble] Mixing server unreachable after ${ASSEMBLE_RETRIES} attempts: ${lastError}`);
      appLog({ level: 'error', source: 'user/audio/assemble', message: `Mixing server unreachable after ${ASSEMBLE_RETRIES} attempts: ${lastError}`, userId: session.user.id, meta: { storyId } });
      // Reset status so user can retry — don't leave stuck in awaited_voice_generation
      await prisma.story.update({
        where: { id: storyId },
        data: { status: 'approved' as any },
      }).catch(() => {});
      return NextResponse.json({ error: 'Mixing server unavailable. Please try again.' }, { status: 502 });
    }

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
      // Mixing server rejected — reset status so user can retry
      await prisma.story.update({
        where: { id: storyId },
        data: { status: 'approved' as any },
      }).catch(() => {});
      return NextResponse.json(
        { error: data.error || 'Failed to queue audio assembly' },
        { status: upstream.status }
      );
    }

    appLog({ level: 'info', source: 'user/audio/assemble', message: `Audio assembly ${data.queued ? 'queued' : 'completed'}`, userId: session.user.id, meta: { storyId, jobId: data.jobId } });

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
    appLog({ level: 'error', source: 'user/audio/assemble', message: `Mixing server error: ${err.message}`, userId: session.user.id, meta: { storyId } });
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
        signal: AbortSignal.timeout(10000), // 10s timeout for status checks
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
    console.log('[api/assemble] Error fetching status from mixing server:', err);
    appLog({ level: "error", source: "api/user/audio/assemble", message: `Mixing server status check failed: ${err.message || err}` });
    return NextResponse.json({ error: 'Mixing server unavailable' }, { status: 502 });
  }
}
