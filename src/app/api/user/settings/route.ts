import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                full_name: true,
                email: true,
                auth_provider: true,
                plan: true,
                morning_reminder: true,
                evening_reminder: true,
                streak_milestones: true,
                product_updates: true,
                voice_model_id: true,
                createdAt: true,
                // Add plan details or counts if needed
                _count: {
                    select: {
                        stories: true
                    }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error('[SETTINGS_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const {
            full_name,
            morning_reminder,
            evening_reminder,
            streak_milestones,
            product_updates
        } = body

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(full_name !== undefined && { full_name }),
                ...(morning_reminder !== undefined && { morning_reminder }),
                ...(evening_reminder !== undefined && { evening_reminder }),
                ...(streak_milestones !== undefined && { streak_milestones }),
                ...(product_updates !== undefined && { product_updates }),
            }
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        console.error('[SETTINGS_PATCH]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Delete user (cascade delete should handle relations if defined in Prisma, 
        // but we might want to be explicit or rely on Prisma schema. 
        // In our schema, stories and sessions are related.)
        await prisma.user.delete({
            where: { id: session.user.id }
        })

        return NextResponse.json({ message: 'Account deleted' })
    } catch (error) {
        console.error('[SETTINGS_DELETE]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
