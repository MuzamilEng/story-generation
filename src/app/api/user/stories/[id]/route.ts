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
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: storyId } = await params;
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json();
        const { title, content } = body;

        // Enforce 3000-word hard cap on manual edits
        if (content !== undefined) {
            const wordCount = content.split(/\s+/).filter(Boolean).length;
            if (wordCount > 3000) {
                return NextResponse.json({ error: 'Story exceeds the 3000-word limit. Please shorten it before saving.' }, { status: 400 });
            }
        }

        // Perform update — ensure ownership
        const updatedStory = await prisma.story.update({
            where: {
                id: storyId,
                userId: session.user.id,
            },
            data: {
                title: title !== undefined ? title : undefined,
                story_text_approved: content !== undefined ? content : undefined,
                word_count: content !== undefined ? content.split(/\s+/).filter(Boolean).length : undefined,
            },
        });

        const serializedStory = {
            ...updatedStory,
            audio_file_size_bytes: updatedStory.audio_file_size_bytes != null ? Number(updatedStory.audio_file_size_bytes) : null,
        }

        return NextResponse.json(serializedStory);
    } catch (error) {
        console.error('[STORY_SINGLE_PATCH]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
