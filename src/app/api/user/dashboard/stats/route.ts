import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // 1. Fetch user data for metrics
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                total_stories_ever: true,
                streak_days: true,
                total_audio_plays: true,
                total_downloads: true,
                plan: true,
                betaCodes: {
                    where: { expiresAt: { gt: new Date() } },
                    take: 1
                }
            }
        });

        const isBetaUser = (user?.betaCodes && user.betaCodes.length > 0) || false;

        // 2. Fetch recent stories to calculate used slots (basic metric)
        const storyCount = await prisma.story.count({
            where: { userId }
        });

        // 3. Fetch recent activity (PlayEvents + Story created)
        // For now, let's fetch PlayEvents and recent Stories
        const playEvents = await prisma.playEvent.findMany({
            where: { userId },
            include: {
                story: {
                    select: { title: true }
                }
            },
            orderBy: { created_at: 'desc' },
            take: 5
        });

        const recentStories = await prisma.story.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        // Combine into activities
        const activities = [
            ...playEvents.map(e => ({
                id: `play-${e.id}`,
                type: e.event_type.toLowerCase() as 'play' | 'download',
                storyTitle: e.story.title,
                timestamp: e.created_at,
            })),
            ...recentStories.map(s => ({
                id: `create-${s.id}`,
                type: 'create' as const,
                storyTitle: s.title,
                timestamp: s.createdAt,
            }))
        ]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 8);

        // 4. Get plan limits (optional for now, but good for "3 of 5 slots")
        const planLimit = await prisma.planLimit.findUnique({
            where: { plan: user?.plan || 'free' }
        });

        const stats = {
            isBetaUser,
            metrics: {
                stories_ever: storyCount || 0,
                streak_days: user?.streak_days || 0,
                total_plays: user?.total_audio_plays || 0,
                total_downloads: user?.total_downloads || 0,
            },
            activities,
            limits: {
                used: storyCount,
                total: planLimit?.max_library_stories || 5
            }
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error('[DASHBOARD_STATS_GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
