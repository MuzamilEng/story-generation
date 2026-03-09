import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { UserRole, hasPermission, hasRole, ROLE_PERMISSIONS, getRoleDisplayName } from '@/lib/roles';

export function useRole() {
  const { data: session, status } = useSession();

  const userRole = useMemo(() => {
    if (!session?.user?.role) return UserRole.USER;
    return session.user.role as UserRole;
  }, [session?.user?.role]);

  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[userRole];
  }, [userRole]);

  const roleDisplayName = useMemo(() => {
    return getRoleDisplayName(userRole);
  }, [userRole]);

  return {
    userRole,
    permissions,
    roleDisplayName,
    isLoading: status === 'loading',
    isAuthenticated: !!session?.user,
    user: session?.user,
  };
}

export function usePermission(permission: keyof typeof ROLE_PERMISSIONS[UserRole]) {
  const { permissions, isLoading } = useRole();

  return {
    hasPermission: permissions[permission],
    isLoading,
  };
}

export function useRoleCheck(requiredRole: UserRole) {
  const { userRole, isLoading } = useRole();

  return {
    hasRole: hasRole(userRole, requiredRole),
    isLoading,
  };
}

export function useRoleGuard(requiredRole: UserRole, fallback?: React.ReactNode) {
  const { hasRole, isLoading, isAuthenticated } = useRoleCheck(requiredRole);

  if (isLoading) {
    return { allowed: false, loading: true, content: null };
  }

  if (!isAuthenticated) {
    return { allowed: false, loading: false, content: fallback || <div>Please sign in to access this content.</div> };
  }

  if (!hasRole) {
    return { allowed: false, loading: false, content: fallback || <div>You don't have permission to access this content.</div> };
  }

  return { allowed: true, loading: false, content: null };
}
