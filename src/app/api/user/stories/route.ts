import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStoryTitle } from '@/lib/story-utils'
import type { StoryType } from '@/lib/story-utils'
import { appLog } from '@/lib/app-logger'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { goals, title, length, storyType } = body
        const type: StoryType = storyType === 'morning' ? 'morning' : 'night';

        if (!goals || Object.keys(goals).length === 0) {
            return NextResponse.json({ error: 'Goals are required and cannot be empty' }, { status: 400 })
        }

        // Verify user exists and check plan limits
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, plan: true, total_stories_ever: true }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Your account was not found. Please sign out and sign back in.' },
                { status: 401 }
            )
        }

        // Plan Gating Check
        const { checkPlanGating } = await import('@/lib/plan-gating');
        const gating = await checkPlanGating(user.id, 'create_story');
        if (!gating.allowed) {
            return NextResponse.json({ error: gating.message }, { status: 403 });
        }

        // Calculate the next story number for this type
        const existingCount = await prisma.story.count({
            where: { userId: session.user.id, story_type: type },
        });
        const storyNumber = existingCount + 1;
        const systemTitle = title || getStoryTitle(type, storyNumber);

        const story = await prisma.story.create({
            data: {
                userId: session.user.id,
                title: systemTitle,
                story_type: type,
                story_number: storyNumber,
                status: 'draft',
                goal_intake_json: goals,
                story_length_option: length || 'medium',
            },
        } as any)

        // Increment count
        await prisma.user.update({
            where: { id: user.id },
            data: {
                total_stories_ever: { increment: 1 },
                stories_this_month: { increment: 1 }
            }
        });

        appLog({ level: 'info', source: 'user/stories', message: `Story created: ${systemTitle}`, userId: session.user.id, meta: { storyId: story.id, type, length: length || 'medium' } });

        return NextResponse.json({ storyId: story.id })
    } catch (error) {
        console.error('[STORY_POST]', error)
        appLog({ level: 'error', source: 'user/stories', message: `Story creation failed: ${(error as Error).message}`, userId: undefined });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const stories = await prisma.story.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        const serializedStories = stories.map((story: any) => ({
            ...story,
            audio_file_size_bytes: story.audio_file_size_bytes != null ? Number(story.audio_file_size_bytes) : null,
            voice_only_url: story.voice_only_r2_key ? `/api/user/audio/stream?key=${encodeURIComponent(story.voice_only_r2_key)}` : null,
            story_type: story.story_type || 'night',
            story_number: story.story_number || 1,
        }))

        return NextResponse.json(serializedStories)
    } catch (error) {
        console.error('[STORY_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user?.id) {
            console.error('[STORY_DELETE_ALL] Unauthorized — no session or user id')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const result = await prisma.story.deleteMany({
            where: {
                userId: session.user.id,
            },
        })

        console.log('[STORY_DELETE_ALL] Deleted', result.count, 'stories for user', session.user.id)

        // Reset story counters
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                stories_this_month: 0,
            }
        })

        return NextResponse.json({ message: 'All stories deleted', count: result.count })
    } catch (error) {
        console.error('[STORY_DELETE_ALL]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
