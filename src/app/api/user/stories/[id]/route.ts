import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: storyId } = await params;
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const story = await prisma.story.findUnique({
            where: {
                id: storyId,
                userId: session.user.id,
            },
            include: {
                versions: {
                    orderBy: { version: 'desc' },
                    take: 1
                },
                user: {
                    select: {
                        soundscape: true,
                        binaural_enabled: true,
                        plan: true
                    } as any
                }
            }
        })

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 })
        }

        const serializedStory = {
            ...story,
            audio_file_size_bytes: story.audio_file_size_bytes != null ? Number(story.audio_file_size_bytes) : null,
            voice_only_url: (story as any).voice_only_r2_key ? `/api/user/audio/stream?key=${encodeURIComponent((story as any).voice_only_r2_key)}` : null
        }

        return NextResponse.json(serializedStory)
    } catch (error) {
        console.error('[STORY_SINGLE_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: storyId } = await params;
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.story.delete({
            where: {
                id: storyId,
                userId: session.user.id,
            },
        })

        return NextResponse.json({ message: 'Story deleted' })
    } catch (error) {
        console.error('[STORY_SINGLE_DELETE]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
