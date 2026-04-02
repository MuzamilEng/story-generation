import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch active soundscape assets from the DB
        const assets = await (prisma as any).soundscapeAsset.findMany({
            where: { isActive: true },
            orderBy: { title: 'asc' }
        });

        // Combine with legacy defaults if necessary, or just rely on these
        // If we want to keep the legacy ones always available:
        const legacyDefaults = [
            { id: 'legacy-ocean', title: 'Ocean Waves', emoji: '🌊', value: 'ocean' },
            { id: 'legacy-river', title: 'Running River', emoji: '💧', value: 'river' },
            { id: 'legacy-rain', title: 'Soft Rain', emoji: '🌧️', value: 'rain' },
            { id: 'legacy-uplifting', title: 'Uplifting Music', emoji: '🎵', value: 'uplifting' },
        ];

        return NextResponse.json({
            assets: assets.map((a: any) => ({
                id: a.id,
                title: a.title,
                image_url: a.image_url,
                value: a.title.toLowerCase(), // Store as title for simplicity
                is_dynamic: true
            })),
            defaults: legacyDefaults
        });
    } catch (error: any) {
        console.error('[user_soundscapes_get] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
