import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Pages inside /user/ that anyone can access WITHOUT being logged in
const PUBLIC_USER_PATHS = ['/user/goal-intake-ai'];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isPublicUserPath = PUBLIC_USER_PATHS.some((p) => pathname.startsWith(p));

    if (!isPublicUserPath && pathname.startsWith('/user/')) {
        const secret = process.env.NEXTAUTH_SECRET;

        if (!secret) {
            console.error('[middleware] NEXTAUTH_SECRET is not set — skipping auth check');
            return NextResponse.next();
        }

        // NextAuth stores the session JWT in one of these cookies depending on scheme
        const sessionToken =
            req.cookies.get('next-auth.session-token')?.value ??
            req.cookies.get('__Secure-next-auth.session-token')?.value;

        if (!sessionToken) {
            const signInUrl = new URL('/auth/signin', req.url);
            signInUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(signInUrl);
        }

        try {
            await jwtVerify(sessionToken, new TextEncoder().encode(secret));
        } catch {
            const signInUrl = new URL('/auth/signin', req.url);
            signInUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(signInUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/user/:path*'],
    runtime: 'nodejs',
};
