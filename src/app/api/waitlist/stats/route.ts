import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { appLog } from '@/lib/app-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const memberCount = await prisma.user.count();
    return NextResponse.json({ memberCount });
  } catch (error) {
    console.error('[waitlist/stats] Error:', error);
    appLog({ level: "error", source: "api/waitlist/stats", message: `Waitlist stats error: ${error instanceof Error ? error.message : error}` });
    return NextResponse.json({ memberCount: 0 }, { status: 500 });
  }
}
