import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const memberCount = await prisma.user.count();
    return NextResponse.json({ memberCount });
  } catch (error) {
    console.error('[waitlist/stats] Error:', error);
    return NextResponse.json({ memberCount: 0 }, { status: 500 });
  }
}
