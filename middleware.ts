import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Pages inside /user/ that anyone can access WITHOUT being logged in
const PUBLIC_USER_PATHS = ['/user/goal-intake-ai'];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isPublicUserPath = PUBLIC_USER_PATHS.some((p) => pathname.startsWith(p));

    if (!isPublicUserPath && pathname.startsWith('/user/')) {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

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
