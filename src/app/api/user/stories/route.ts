import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { goals, title } = body

        if (!goals) {
            return NextResponse.json({ error: 'Goals are required' }, { status: 400 })
        }

        const story = await prisma.story.create({
            data: {
                userId: session.user.id,
                title: title || 'My Manifestation Story',
                status: 'draft',
                goal_intake_json: goals,
            },
        })

        return NextResponse.json({ storyId: story.id })
    } catch (error) {
        console.error('[STORY_POST]', error)
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

        return NextResponse.json(stories)
    } catch (error) {
        console.error('[STORY_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
