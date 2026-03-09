import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip middleware for static files, API routes, and special paths
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') || // Skip files with extensions
        pathname.startsWith('/.well-known') ||
        pathname.includes('favicon.ico')
    ) {
        return NextResponse.next()
    }

    console.log('[MIDDLEWARE] Processing:', pathname)

    // Get session token - simplified version
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    })

    console.log('[AUTH DEBUG] Token:', {
        exists: !!token,
        fullToken: token,
        cookies: request.cookies.getAll().map(c => c.name),
        path: pathname
    })

    // Define dashboards for each role
    const dashboards = {
        ADMIN: '/admin/dashboard',
        AGENCY: '/agency/dashboard',
        USER: '/user/dashboard'
    }

    const userRole = token?.role as string || 'USER'

    // ✅ Handle authenticated users
    if (token) {
        console.log('[AUTH] User authenticated. Role:', userRole, 'ID:', token.sub)

        // Redirect from auth pages or home to appropriate dashboard
        if (pathname === '/' || pathname.startsWith('/auth')) {
            const dashboard = dashboards[userRole] || '/user/dashboard'
            console.log('[REDIRECT] Logged-in user →', dashboard)
            return NextResponse.redirect(new URL(dashboard, request.url))
        }

        // Role-based access control
        if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
            console.log('[BLOCKED] Non-admin trying to access admin route')
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
        if (pathname.startsWith('/agency') && userRole !== 'AGENCY') {
            console.log('[BLOCKED] Non-agency trying to access agency route')
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
        if (pathname.startsWith('/user') && userRole !== 'USER') {
            console.log('[BLOCKED] Non-user trying to access user route')
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }

        // Allow authenticated user to continue
        return NextResponse.next()
    }

    // ✅ Handle unauthenticated users
    console.log('[AUTH] No authentication token found')

    // Public paths that don't require authentication
    const publicPaths = [
        '/',
        '/auth/signin',
        '/auth/signup',
        '/auth/error',
        '/about-us',
        '/contact-us',
        '/privacy',
        '/terms',
        '/unauthorized'
    ]

    const isPublicPath = publicPaths.some(path =>
        pathname === path || (pathname.startsWith('/auth/') && !pathname.includes('/api'))
    )

    // If it's a public path, allow access
    if (isPublicPath) {
        return NextResponse.next()
    }

    // If not public and no token, redirect to signin
    console.log('[REDIRECT] Protected route without auth → /auth/signin')
    const url = new URL('/auth/signin', request.url)
    url.searchParams.set('callbackUrl', encodeURIComponent(pathname))
    return NextResponse.redirect(url)
}

export const config = {
    matcher: [
        // Match specific routes only (avoid catching everything)
        '/',
        '/auth/:path*',
        '/admin/:path*',
        '/agency/:path*',
        '/user/:path*',
        '/about-us',
        '/contact-us',
        '/privacy',
        '/terms',
        '/unauthorized'
    ],
}
