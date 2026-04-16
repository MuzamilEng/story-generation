import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/intake-snapshot
 * Check if user has saved intake data (required for morning story generation)
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const snapshot = await (prisma as any).intakeSnapshot.findUnique({
            where: { userId: session.user.id },
            select: { id: true, createdAt: true },
        });

        return NextResponse.json({
            hasIntakeData: !!snapshot,
            createdAt: snapshot?.createdAt || null,
        });
    } catch (error) {
        console.error('[INTAKE_SNAPSHOT_GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
