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
        const { goals, title, length } = body

        if (!goals || Object.keys(goals).length === 0) {
            return NextResponse.json({ error: 'Goals are required and cannot be empty' }, { status: 400 })
        }

        // Verify user exists in database (JWT may outlive deleted user record)
        const userExists = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true }
        })
        if (!userExists) {
            return NextResponse.json(
                { error: 'Your account was not found. Please sign out and sign back in.' },
                { status: 401 }
            )
        }

        const story = await prisma.story.create({
            data: {
                userId: session.user.id,
                title: title || 'My Manifestation Story',
                status: 'draft',
                goal_intake_json: goals,
                story_length_option: length || 'long',
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

        const serializedStories = stories.map(story => ({
            ...story,
            audio_file_size_bytes: story.audio_file_size_bytes != null ? Number(story.audio_file_size_bytes) : null,
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
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.story.deleteMany({
            where: {
                userId: session.user.id,
            },
        })

        return NextResponse.json({ message: 'All stories deleted' })
    } catch (error) {
        console.error('[STORY_DELETE_ALL]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
