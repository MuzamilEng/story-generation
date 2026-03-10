import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Pages inside /user/ that anyone can access WITHOUT being logged in
const PUBLIC_USER_PATHS = ['/user/goal-intake-ai'];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isPublicUserPath = PUBLIC_USER_PATHS.some((p) => pathname.startsWith(p));

    if (!isPublicUserPath && pathname.startsWith('/user/')) {
        // Safety guard: if secret is missing on Vercel, don't crash the edge function
        if (!process.env.NEXTAUTH_SECRET) {
            console.error('[middleware] NEXTAUTH_SECRET is not set — skipping auth check');
            return NextResponse.next();
        }

        // Let getToken auto-read NEXTAUTH_SECRET from env
        const token = await getToken({ req });

        if (!token) {
            const signInUrl = new URL('/auth/signin', req.url);
            signInUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(signInUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/user/:path*'],
};
