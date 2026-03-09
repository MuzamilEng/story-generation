import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { UserRole, hasRole } from './roles';

export interface RoleMiddlewareOptions {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export async function withRoleAuth(
  request: NextRequest,
  options: RoleMiddlewareOptions
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const userRole = session.user.role as UserRole;

  if (!hasRole(userRole, Math.min(...options.allowedRoles.map(role => {
    const hierarchy = { [UserRole.USER]: 1, [UserRole.MODERATOR]: 2, [UserRole.ADMIN]: 3 };
    return hierarchy[role];
  })) as any)) {
    const redirectTo = options.redirectTo || '/unauthorized';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return null; // Continue to the route
}

export function createRoleMiddleware(options: RoleMiddlewareOptions) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    return withRoleAuth(request, options);
  };
}

// Pre-configured middleware functions
export const requireAdmin = createRoleMiddleware({
  allowedRoles: [UserRole.ADMIN],
  redirectTo: '/unauthorized'
});

export const requireModerator = createRoleMiddleware({
  allowedRoles: [UserRole.MODERATOR, UserRole.ADMIN],
  redirectTo: '/unauthorized'
});

export const requireUser = createRoleMiddleware({
  allowedRoles: [UserRole.USER, UserRole.MODERATOR, UserRole.ADMIN],
  redirectTo: '/unauthorized'
});
