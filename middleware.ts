import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Pages inside /user/ that anyone can access WITHOUT being logged in
const PUBLIC_USER_PATHS = ['/user/goal-intake-ai'];

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl;
        const token = req.nextauth.token;

        // Allow unauthenticated access to the Goal Intake AI page
        const isPublicUserPath = PUBLIC_USER_PATHS.some((p) => pathname.startsWith(p));

        if (!token && pathname.startsWith('/user/') && !isPublicUserPath) {
            // Redirect to sign-in, preserving the intended destination
            const signInUrl = new URL('/auth/signin', req.url);
            signInUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(signInUrl);
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            // Let the middleware function handle all logic above
            authorized: () => true,
        },
    }
);

export const config = {
    matcher: ['/user/:path*'],
};
