import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const story = await prisma.story.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
            include: {
                versions: {
                    orderBy: {
                        version: 'desc'
                    },
                    take: 1
                }
            }
        })

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 })
        }

        return NextResponse.json(story)
    } catch (error) {
        console.error('[STORY_GET_ID]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json();
        const { title, content } = body;

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) {
            updateData.story_text_draft = content;
            // Also update approved if it exists, or just count words
            updateData.word_count = content.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
        }

        const story = await prisma.story.update({
            where: {
                id,
                userId: session.user.id,
            },
            data: updateData
        })

        return NextResponse.json(story)
    } catch (error) {
        console.error('[STORY_PATCH_ID]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.story.delete({
            where: {
                id,
                userId: session.user.id,
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[STORY_DELETE_ID]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
