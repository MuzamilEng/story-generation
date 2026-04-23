import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/intake-snapshot
 * Check if user has saved intake data.
 * When includeAnswers=1 is provided, returns reusable intake answers
 * for edit-and-regenerate flows.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const includeAnswers = req.nextUrl.searchParams.get('includeAnswers') === '1';

        let snapshot = await (prisma as any).intakeSnapshot.findUnique({
            where: { userId: session.user.id },
            select: { id: true, createdAt: true, answers_json: true },
        });

        // Backfill from latest night story if snapshot is missing.
        if (!snapshot?.answers_json) {
            const latestNightStory = await prisma.story.findFirst({
                where: { userId: session.user.id, story_type: 'night' as any },
                orderBy: { createdAt: 'desc' },
                select: { goal_intake_json: true },
            });

            if (latestNightStory?.goal_intake_json) {
                snapshot = await (prisma as any).intakeSnapshot.upsert({
                    where: { userId: session.user.id },
                    update: { answers_json: latestNightStory.goal_intake_json },
                    create: {
                        userId: session.user.id,
                        answers_json: latestNightStory.goal_intake_json,
                    },
                    select: { id: true, createdAt: true, answers_json: true },
                });
            }
        }

        return NextResponse.json({
            hasIntakeData: !!snapshot,
            createdAt: snapshot?.createdAt || null,
            answers: includeAnswers ? (snapshot?.answers_json || null) : undefined,
        });
    } catch (error) {
        console.error('[INTAKE_SNAPSHOT_GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/user/intake-snapshot
 * Remove the user's saved intake snapshot for a fresh start.
 */
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await (prisma as any).intakeSnapshot.deleteMany({
            where: { userId: session.user.id },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[INTAKE_SNAPSHOT_DELETE]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
