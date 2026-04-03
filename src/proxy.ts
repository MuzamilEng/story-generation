import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Skip middleware for static files, API routes, and special paths
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') ||
        pathname.startsWith('/.well-known') ||
        pathname.includes('favicon.ico')
    ) {
        return NextResponse.next()
    }

    console.log('[MIDDLEWARE] Processing:', pathname)

    // 2. Get the user token with resilience for production cookie naming
    let token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: 'next-auth.session-token',
        secureCookie: process.env.NODE_ENV === 'production'
    })

    // Fallback: try default secure cookie name if the first one failed in production
    if (!token && process.env.NODE_ENV === 'production') {
        token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET,
            cookieName: '__Secure-next-auth.session-token',
            secureCookie: true
        })
    }

    console.log('[AUTH DEBUG] Token exists:', !!token, 'Path:', pathname)

    // 3. Define path categories
    const isAuthPage = pathname.startsWith('/auth')

    // Public paths that are allowed for everyone (Landing page, marketing, legal)
    const publicPaths = [
        '/',
        '/about-us',
        '/contact-us',
        '/privacy',
        '/terms',
        '/pricing',
        '/unauthorized'
    ]
    const isPublicPath = publicPaths.includes(pathname)

    // Specific user dashboard/app pages to protect
    const userAppPages = [
        '/user/dashboard',
        '/user/stories',
        '/user/story-detail',
        '/user/goal-intake-ai',
        '/user/voice-recording',
        '/user/audio-download',
        '/user/account-setting',
        '/user/manage-subscription',
        '/user/story',
        '/science' // Matches the 'science' folder under (authenticated)
    ]

    // Check if the current pathname is one of the user app pages or starts with /user/
    const isProtectedUserPage = userAppPages.some(page => pathname === page || pathname.startsWith(page + '/'))

    // 4. Handle Authenticated Users
    if (token) {
        const userRole = token.role || 'USER';
        console.log('[AUTH] User authenticated as:', userRole);

        // If Admin tries to access Home, Auth, or standard User pages, redirect to Admin Dashboard
        if (userRole === 'ADMIN') {
            if (isAuthPage || pathname === '/' || isProtectedUserPage) {
                console.log('[REDIRECT] Admin user → /admin');
                return NextResponse.redirect(new URL('/admin', request.url));
            }
        } else {
            // If standard User tries to access Auth pages or home, redirect to User Dashboard
            if (isAuthPage || pathname === '/') {
                console.log('[REDIRECT] Regular user → /user/dashboard');
                return NextResponse.redirect(new URL('/user/dashboard', request.url));
            }
        }

        return NextResponse.next();
    }

    // 5. Handle Unauthenticated Users
    // If user is trying to access a protected user page and is not logged in
    if (isProtectedUserPage) {
        console.log('[REDIRECT] Protected user page (%s) without auth → /auth/signin', pathname)
        const signinUrl = new URL('/auth/signin', request.url)
        signinUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signinUrl)
    }

    // Allow access to public paths and anything else not explicitly protected
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
