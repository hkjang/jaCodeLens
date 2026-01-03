'use client';

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { MoreVertical, ChevronRight } from 'lucide-react';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  hidden?: boolean;
  danger?: boolean;
  divider?: boolean;
  onClick?: () => void;
  
  // 서브메뉴
  children?: ActionMenuItem[];
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  
  // 선택적
  trigger?: ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  
  // 권한 기반 필터링
  userRole?: string;
  requiredRoles?: Record<string, string[]>; // { menuId: ['admin', 'operator'] }
}

export function ActionMenu({
  items,
  trigger,
  position = 'right',
  size = 'md',
  userRole,
  requiredRoles,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // 권한 필터링
  const filterByRole = useCallback((item: ActionMenuItem): boolean => {
    if (item.hidden) return false;
    if (!userRole || !requiredRoles) return true;
    
    const required = requiredRoles[item.id];
    if (!required) return true;
    
    return required.includes(userRole);
  }, [userRole, requiredRoles]);

  const filteredItems = items.filter(filterByRole);

  // 아이템 클릭
  const handleItemClick = useCallback((item: ActionMenuItem) => {
    if (item.disabled || item.children) return;
    
    item.onClick?.();
    setIsOpen(false);
    setActiveSubmenu(null);
  }, []);

  // 사이즈별 스타일
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const triggerSizeStyles = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const iconSizeStyles = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (filteredItems.length === 0) return null;

  return (
    <div ref={menuRef} className="relative inline-block">
      {/* 트리거 버튼 */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${triggerSizeStyles[size]}`}
      >
        {trigger || <MoreVertical className={iconSizeStyles[size]} />}
      </button>

      {/* 메뉴 */}
      {isOpen && (
        <div 
          className={`absolute top-full mt-1 z-50 min-w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 animate-in fade-in slide-in-from-top-2 duration-150 ${
            position === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {filteredItems.map((item, index) => {
            // 구분선
            if (item.divider) {
              return (
                <div 
                  key={`divider-${index}`} 
                  className="my-1 border-t border-gray-200 dark:border-gray-700" 
                />
              );
            }

            const hasSubmenu = item.children && item.children.length > 0;
            const isSubmenuActive = activeSubmenu === item.id;

            return (
              <div key={item.id} className="relative">
                <button
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={() => hasSubmenu && setActiveSubmenu(item.id)}
                  disabled={item.disabled}
                  className={`w-full flex items-center justify-between gap-2 ${sizeStyles[size]} ${
                    item.disabled
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : item.danger
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon && (
                      <span className={iconSizeStyles[size]}>
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </span>
                  
                  <span className="flex items-center gap-1">
                    {item.shortcut && (
                      <kbd className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {item.shortcut}
                      </kbd>
                    )}
                    {hasSubmenu && <ChevronRight className="w-3 h-3" />}
                  </span>
                </button>

                {/* 서브메뉴 */}
                {hasSubmenu && isSubmenuActive && (
                  <div 
                    className="absolute left-full top-0 ml-1 min-w-[160px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
                    onMouseLeave={() => setActiveSubmenu(null)}
                  >
                    {item.children!.filter(filterByRole).map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleItemClick(subItem)}
                        disabled={subItem.disabled}
                        className={`w-full flex items-center gap-2 ${sizeStyles[size]} ${
                          subItem.disabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : subItem.danger
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {subItem.icon && (
                          <span className={iconSizeStyles[size]}>
                            {subItem.icon}
                          </span>
                        )}
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
