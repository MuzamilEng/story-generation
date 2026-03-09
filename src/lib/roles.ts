export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export interface RolePermissions {
  canViewDashboard: boolean;
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canDeleteContent: boolean;
  canAccessAdminPanel: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.USER]: {
    canViewDashboard: true,
    canManageUsers: false,
    canManageContent: true,
    canViewAnalytics: false,
    canManageSettings: false,
    canDeleteContent: false,
    canAccessAdminPanel: false,
  },
  [UserRole.MODERATOR]: {
    canViewDashboard: true,
    canManageUsers: false,
    canManageContent: true,
    canViewAnalytics: true,
    canManageSettings: false,
    canDeleteContent: true,
    canAccessAdminPanel: false,
  },
  [UserRole.ADMIN]: {
    canViewDashboard: true,
    canManageUsers: true,
    canManageContent: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canDeleteContent: true,
    canAccessAdminPanel: true,
  },
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.MODERATOR]: 2,
  [UserRole.ADMIN]: 3,
};

export function hasPermission(userRole: UserRole, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[userRole][permission];
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function getRoleDisplayName(role: UserRole): string {
  const displayNames = {
    [UserRole.USER]: 'User',
    [UserRole.MODERATOR]: 'Moderator',
    [UserRole.ADMIN]: 'Administrator',
  };
  return displayNames[role];
}
