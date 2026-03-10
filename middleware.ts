import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Pages inside /user/ that anyone can access WITHOUT being logged in
const PUBLIC_USER_PATHS = ['/user/goal-intake-ai'];

export async function middleware(req: NextRequest) {
    return NextResponse.next();
}

export const config = {
    matcher: ['/user/:path*'],
    runtime: 'nodejs',
};
