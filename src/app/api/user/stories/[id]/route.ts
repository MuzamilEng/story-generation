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
