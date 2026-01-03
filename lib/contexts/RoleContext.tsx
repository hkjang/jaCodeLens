'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'developer' | 'operator' | 'architect' | 'admin' | 'auditor';

// CUD 권한 타입
export type CUDAction = 'create' | 'update' | 'delete' | 'archive';
export type CUDEntity = 'projects' | 'executions' | 'results' | 'tasks' | 'rules';

// 역할별 CUD 권한 행렬
export const CUD_PERMISSIONS: Record<UserRole, Record<CUDEntity, CUDAction[]>> = {
  developer: {
    projects: [],
    executions: ['create'],
    results: ['update'],
    tasks: ['create', 'update', 'delete'],
    rules: []
  },
  operator: {
    projects: [],
    executions: ['create', 'update', 'delete'],
    results: ['update'],
    tasks: ['update'],
    rules: []
  },
  architect: {
    projects: ['update'],
    executions: ['create'],
    results: ['update'],
    tasks: ['create', 'update'],
    rules: ['create', 'update']
  },
  admin: {
    projects: ['create', 'update', 'delete', 'archive'],
    executions: ['create', 'update', 'delete'],
    results: ['create', 'update', 'delete'],
    tasks: ['create', 'update', 'delete'],
    rules: ['create', 'update', 'delete']
  },
  auditor: {
    projects: [],
    executions: [],
    results: [],
    tasks: [],
    rules: []
  }
};

interface RoleConfig {
  id: UserRole;
  name: string;
  menus: string[];
  permissions: string[];
  homeWidgets: string[];
}

interface RoleContextType {
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  roleConfig: RoleConfig;
  hasPermission: (permission: string) => boolean;
  isMenuVisible: (menuKey: string) => boolean;
  hasCUDPermission: (entity: CUDEntity, action: CUDAction) => boolean;
  getCUDPermissions: (entity: CUDEntity) => CUDAction[];
}

const roleConfigs: Record<UserRole, RoleConfig> = {
  developer: {
    id: 'developer',
    name: '개발자',
    menus: ['dashboard', 'execution', 'results', 'code-issues', 'improvements', 'history', 'notifications'],
    permissions: ['view_analysis', 'run_analysis', 'fix_issues', 'view_results'],
    homeWidgets: ['score', 'issues', 'improvements', 'recent-analyses'],
  },
  operator: {
    id: 'operator',
    name: '운영자',
    menus: ['dashboard', 'execution', 'operations', 'agents', 'queue', 'resources', 'logs', 'notifications', 'self-analysis', 'self-baseline', 'self-backlog'],
    permissions: ['view_analysis', 'view_operations', 'manage_agents', 'view_logs', 'view_self_analysis'],
    homeWidgets: ['agent-status', 'queue', 'resources', 'alerts'],
  },
  architect: {
    id: 'architect',
    name: '아키텍트',
    menus: ['dashboard', 'results', 'architecture', 'dependencies', 'risk-heatmap', 'history', 'settings-rules'],
    permissions: ['view_analysis', 'run_analysis', 'view_architecture', 'view_dependencies', 'manage_rules'],
    homeWidgets: ['architecture', 'dependencies', 'risk-heatmap', 'score'],
  },
  admin: {
    id: 'admin',
    name: '관리자',
    menus: ['dashboard', 'execution', 'results', 'operations', 'admin-roles', 'admin-policies', 'admin-agents', 'admin-models', 'admin-audit', 'self-analysis', 'self-baseline', 'self-backlog', 'self-policy', 'settings-rules'],
    permissions: ['all'],
    homeWidgets: ['score', 'system-health', 'user-activity', 'alerts'],
  },
  auditor: {
    id: 'auditor',
    name: '감사자',
    menus: ['dashboard', 'results', 'history', 'admin-audit', 'reports'],
    permissions: ['view_analysis', 'view_logs', 'view_reports'],
    homeWidgets: ['audit-summary', 'recent-changes', 'compliance'],
  },
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>('developer');

  useEffect(() => {
    // Load saved role from localStorage
    const savedRole = localStorage.getItem('userRole') as UserRole;
    if (savedRole && roleConfigs[savedRole]) {
      setCurrentRole(savedRole);
    }
  }, []);

  const setRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('userRole', role);
  };

  const roleConfig = roleConfigs[currentRole];

  const hasPermission = (permission: string): boolean => {
    if (roleConfig.permissions.includes('all')) return true;
    return roleConfig.permissions.includes(permission);
  };

  const isMenuVisible = (menuKey: string): boolean => {
    if (roleConfig.permissions.includes('all')) return true;
    return roleConfig.menus.includes(menuKey);
  };

  // CUD 권한 체크
  const hasCUDPermission = (entity: CUDEntity, action: CUDAction): boolean => {
    if (roleConfig.permissions.includes('all')) return true;
    const entityPermissions = CUD_PERMISSIONS[currentRole][entity];
    return entityPermissions.includes(action);
  };

  // 해당 엔티티에 대한 모든 CUD 권한 가져오기
  const getCUDPermissions = (entity: CUDEntity): CUDAction[] => {
    if (roleConfig.permissions.includes('all')) {
      return ['create', 'update', 'delete', 'archive'];
    }
    return CUD_PERMISSIONS[currentRole][entity];
  };

  return (
    <RoleContext.Provider value={{ 
      currentRole, 
      setRole, 
      roleConfig, 
      hasPermission, 
      isMenuVisible,
      hasCUDPermission,
      getCUDPermissions
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

export { roleConfigs };

