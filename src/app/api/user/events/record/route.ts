import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { storyId, eventType, duration } = body;

        if (!storyId || !eventType) {
            return NextResponse.json({ error: 'storyId and eventType are required' }, { status: 400 });
        }

        const userId = session.user.id;

        // 1. Record the play event
        await prisma.playEvent.create({
            data: {
                userId,
                storyId,
                event_type: eventType, // 'play', 'download', or 'sample_play'
                duration_secs: duration || null,
            }
        });

        // 2. Increment user metrics
        if (eventType === 'play') {
            await prisma.user.update({
                where: { id: userId },
                data: { total_audio_plays: { increment: 1 } }
            });
            await prisma.story.update({
                where: { id: storyId },
                data: { play_count: { increment: 1 } }
            });
        } else if (eventType === 'download') {
            await prisma.user.update({
                where: { id: userId },
                data: { total_downloads: { increment: 1 } }
            });
            await prisma.story.update({
                where: { id: storyId },
                data: { download_count: { increment: 1 } }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[EVENT_RECORD_POST]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
