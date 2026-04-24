import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { UserRole } from '@/types';

const ROLE_ACCESS: Record<UserRole, string[]> = {
  Administrator: [
    '/', '/members', '/attendance', '/giving', '/events', '/departments',
    '/communication', '/reports', '/settings', '/prayer', '/pastoral',
    '/volunteers', '/pledges',
  ],
  Pastor: [
    '/', '/members', '/attendance', '/giving', '/communication',
    '/reports', '/prayer', '/pastoral', '/volunteers', '/pledges', '/events',
  ],
  'Department Head': [
    '/', '/members', '/attendance', '/events', '/prayer', '/volunteers',
  ],
  'Data Entry': [
    '/', '/attendance', '/giving',
  ],
};

export const ROLE_ACTIONS: Record<UserRole, {
  canEditMembers: boolean;
  canDeleteMembers: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
  canAccessSettings: boolean;
  canManageGiving: boolean;
  canManageDepartments: boolean;
  canSendMessages: boolean;
  canManagePledges: boolean;
  canManageUsers: boolean;
}> = {
  Administrator: {
    canEditMembers: true, canDeleteMembers: true, canViewReports: true,
    canExportReports: true, canAccessSettings: true, canManageGiving: true,
    canManageDepartments: true, canSendMessages: true, canManagePledges: true,
    canManageUsers: true,
  },
  Pastor: {
    canEditMembers: true, canDeleteMembers: false, canViewReports: true,
    canExportReports: true, canAccessSettings: false, canManageGiving: true,
    canManageDepartments: false, canSendMessages: true, canManagePledges: true,
    canManageUsers: false,
  },
  'Department Head': {
    canEditMembers: false, canDeleteMembers: false, canViewReports: false,
    canExportReports: false, canAccessSettings: false, canManageGiving: false,
    canManageDepartments: false, canSendMessages: false, canManagePledges: false,
    canManageUsers: false,
  },
  'Data Entry': {
    canEditMembers: false, canDeleteMembers: false, canViewReports: false,
    canExportReports: false, canAccessSettings: false, canManageGiving: true,
    canManageDepartments: false, canSendMessages: false, canManagePledges: false,
    canManageUsers: false,
  },
};

// Re-export for convenience
export type { UserRole };

interface RoleContextValue {
  canAccess: (path: string) => boolean;
  actions: typeof ROLE_ACTIONS[UserRole];
  role: UserRole;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const role: UserRole = profile?.role ?? 'Data Entry';

  const canAccess = (path: string) => {
    const allowed = ROLE_ACCESS[role];
    return allowed.some(p => path === p || path.startsWith(p + '/'));
  };

  return (
    <RoleContext.Provider value={{ canAccess, actions: ROLE_ACTIONS[role], role }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
