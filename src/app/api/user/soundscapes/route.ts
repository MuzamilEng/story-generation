import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Track metadata from the ManifestMyStory Music Track Guide
// Keyed by lowercase title prefix for fuzzy matching against DB titles
const TRACK_META: Record<string, { mood: string; description: string; bestFor: string; isDefault?: boolean }> = {
    'ascension': {
        mood: 'Uplifting · Expansive · Serene',
        description: 'A rare blend of calm and inspiration — this track quietly elevates your state of mind without pulling your attention away from your story. Warm, luminous tones that rise gently and stay there.',
        bestFor: 'Goal-focused sessions, abundance mindset, morning intention setting',
    },
    'adrift': {
        mood: 'Dreamy · Weightless · Still',
        description: 'Designed from the ground up as a background track — no sudden shifts, no melody fighting for attention. Soft, floating pad sounds that let your mind drift effortlessly into your story.',
        bestFor: 'Deep relaxation, sleep-time listening, subconscious reprogramming',
        isDefault: true,
    },
    'crystal rain': {
        mood: 'Cleansing · Spacious · Refreshing',
        description: 'An open, airy soundscape with a quietly cleansing energy. The gentle tones create a sense of mental clarity — like a reset button for the mind before your story begins.',
        bestFor: 'Releasing limiting beliefs, clarity-focused sessions, fresh-start intentions',
    },
    'enlighten me': {
        mood: 'Grounded · Rich · Resonant',
        description: 'Layered with the warm resonance of singing bowls, bells, and chimes — each sound placed with care and space. Deep, hypnotic tones that anchor your focus without demanding it.',
        bestFor: 'Deep focus, mindfulness, self-awareness and personal growth sessions',
    },
    'etherea': {
        mood: 'Ethereal · Soft · Otherworldly',
        description: 'Feather-light and deeply immersive. Gentle voices, twinkling chimes, and soft atmospheric textures create a dream-like space perfectly suited to absorbing your story at a subconscious level.',
        bestFor: 'Sleep sessions, vivid visualization, deep subconscious work',
    },
    'om mantra': {
        mood: 'Centering · Warm · Ancient',
        description: 'A rich, enveloping Om chant — one of the most universally grounding sounds in existence. Big, warm resonance with a steady sense of presence. Calming to the nervous system and deeply focusing.',
        bestFor: 'Centering before sleep, stress release, grounding and presence',
    },
    'tribal eve': {
        mood: 'Rhythmic · Soothing · Hypnotic',
        description: 'Slow, steady percussion woven with soft Gregorian choirs. The gentle rhythm creates a natural hypnotic cadence that supports deep mental absorption — your story lands with more ease.',
        bestFor: 'Rhythm-sensitive listeners, confidence and identity sessions, body-mind connection',
    },
};

function findTrackMeta(title: string) {
    const lower = title.toLowerCase();
    for (const [key, meta] of Object.entries(TRACK_META)) {
        if (lower.includes(key)) return meta;
    }
    return null;
}

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

        return NextResponse.json({
            assets: assets.map((a: any) => {
                const meta = findTrackMeta(a.title);
                return {
                    id: a.id,
                    title: a.title,
                    image_url: a.image_url,
                    preview_url: `/api/user/audio/stream?key=${encodeURIComponent(a.r2_key)}`,
                    duration_s: a.duration_s,
                    value: a.title.toLowerCase(),
                    is_dynamic: true,
                    mood: meta?.mood || null,
                    description: meta?.description || null,
                    bestFor: meta?.bestFor || null,
                    isDefault: meta?.isDefault || false,
                };
            }),
        });
    } catch (error: any) {
        console.error('[user_soundscapes_get] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
