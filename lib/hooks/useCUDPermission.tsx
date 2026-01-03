'use client';

import { useRole, CUDEntity, CUDAction } from '@/lib/contexts/RoleContext';

/**
 * CUD 권한 체크 훅
 * 역할 기반으로 Create/Update/Delete 권한을 확인합니다.
 */
export function useCUDPermission(entity: CUDEntity) {
  const { hasCUDPermission, getCUDPermissions, currentRole } = useRole();

  return {
    // 개별 권한 체크
    canCreate: hasCUDPermission(entity, 'create'),
    canUpdate: hasCUDPermission(entity, 'update'),
    canDelete: hasCUDPermission(entity, 'delete'),
    canArchive: hasCUDPermission(entity, 'archive'),
    
    // 권한 체크 함수
    can: (action: CUDAction) => hasCUDPermission(entity, action),
    
    // 모든 허용 권한
    permissions: getCUDPermissions(entity),
    
    // 현재 역할
    role: currentRole
  };
}

/**
 * 권한 없음 표시 컴포넌트
 */
export function NoPermission({ 
  message = '이 작업을 수행할 권한이 없습니다',
  action
}: { 
  message?: string;
  action?: string;
}) {
  return (
    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-sm text-gray-500">
        {action ? `${action}할 권한이 없습니다` : message}
      </p>
    </div>
  );
}

/**
 * 권한 기반 조건부 렌더링 컴포넌트
 */
export function PermissionGate({
  entity,
  action,
  children,
  fallback = null
}: {
  entity: CUDEntity;
  action: CUDAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasCUDPermission } = useRole();
  
  if (hasCUDPermission(entity, action)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * 권한 기반 버튼 비활성화 래퍼
 */
export function PermissionButton({
  entity,
  action,
  children,
  onClick,
  className = '',
  disabledClassName = 'opacity-50 cursor-not-allowed',
  showTooltip = true
}: {
  entity: CUDEntity;
  action: CUDAction;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabledClassName?: string;
  showTooltip?: boolean;
}) {
  const { hasCUDPermission, currentRole } = useRole();
  const hasPermission = hasCUDPermission(entity, action);
  
  return (
    <button
      onClick={hasPermission ? onClick : undefined}
      disabled={!hasPermission}
      className={`${className} ${!hasPermission ? disabledClassName : ''}`}
      title={!hasPermission && showTooltip ? `${currentRole} 역할에는 이 권한이 없습니다` : undefined}
    >
      {children}
    </button>
  );
}
