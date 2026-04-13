import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { betaTypeToPlan } from '@/lib/beta-utils'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                name: true,
                email: true,
                auth_provider: true,
                plan: true,
                morning_reminder: true,
                evening_reminder: true,
                streak_milestones: true,
                product_updates: true,
                voice_model_id: true,
                voice_sample_url: true,
                soundscape: true,
                binaural_enabled: true,
                createdAt: true,
                _count: {
                    select: {
                        stories: true
                    }
                },
                betaCodes: {
                    where: { expiresAt: { gt: new Date() } },
                    orderBy: { expiresAt: 'desc' },
                    take: 1,
                    select: { expiresAt: true, betaCode: { select: { type: true } } }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const betaCodes = (user as any).betaCodes || [];
        const isBetaUser = betaCodes.length > 0;
        const betaCodeType = isBetaUser ? betaCodes[0]?.betaCode?.type : null;
        const betaPlan = betaCodeType ? betaTypeToPlan(betaCodeType) : null;
        const betaPlanName = betaPlan ? ({ free: 'Explorer', activator: 'Activator', manifester: 'Manifester', amplifier: 'Amplifier' }[betaPlan] || betaPlan) : null;

        const responseData = {
            ...user,
            isBetaUser,
            betaExpiresAt: isBetaUser ? betaCodes[0].expiresAt : null,
            betaPlanName
        };

        return NextResponse.json(responseData)
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
            name,
            morning_reminder,
            evening_reminder,
            streak_milestones,
            product_updates,
            soundscape,
            binaural_enabled,
        } = body

        // ── Plan gating for premium audio features ────────────────────────────
        // Fetch the user's current plan before allowing premium field updates.
        if (soundscape !== undefined || binaural_enabled !== undefined) {
            const currentUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { plan: true, is_beta: true, stripeSubscriptionId: true },
            })
            const plan = currentUser?.plan ?? 'free'
            const isBetaUser = currentUser?.is_beta && !currentUser?.stripeSubscriptionId;

            const SOUNDSCAPE_PLANS = ['manifester', 'amplifier']
            const BINAURAL_PLANS = ['amplifier']

            if (soundscape !== undefined && !isBetaUser && !SOUNDSCAPE_PLANS.includes(plan)) {
                return NextResponse.json(
                    { error: 'Background soundscapes require the Manifester or Amplifier plan.' },
                    { status: 403 }
                )
            }

            if (binaural_enabled !== undefined && !isBetaUser && !BINAURAL_PLANS.includes(plan)) {
                return NextResponse.json(
                    { error: 'Binaural beats require the Amplifier plan.' },
                    { status: 403 }
                )
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(name !== undefined && { name }),
                ...(morning_reminder !== undefined && { morning_reminder }),
                ...(evening_reminder !== undefined && { evening_reminder }),
                ...(streak_milestones !== undefined && { streak_milestones }),
                ...(product_updates !== undefined && { product_updates }),
                ...(soundscape !== undefined && { soundscape }),
                ...(binaural_enabled !== undefined && { binaural_enabled }),
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
