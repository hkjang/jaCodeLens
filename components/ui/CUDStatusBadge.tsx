'use client';

import { ReactNode } from 'react';
import { CheckCircle, Clock, Edit3, Archive, Trash2, AlertCircle } from 'lucide-react';

export type CUDStatus = 'created' | 'active' | 'modified' | 'archived' | 'deleted' | 'pending';

interface CUDStatusBadgeProps {
  status: CUDStatus;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<CUDStatus, {
  label: string;
  icon: ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  created: {
    label: '생성됨',
    icon: <CheckCircle className="w-full h-full" />,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  active: {
    label: '활성',
    icon: <CheckCircle className="w-full h-full" />,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  modified: {
    label: '수정됨',
    icon: <Edit3 className="w-full h-full" />,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  archived: {
    label: '아카이브',
    icon: <Archive className="w-full h-full" />,
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    textColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-200 dark:border-gray-600',
  },
  deleted: {
    label: '삭제됨',
    icon: <Trash2 className="w-full h-full" />,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  pending: {
    label: '대기 중',
    icon: <Clock className="w-full h-full" />,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
};

const sizeStyles = {
  sm: {
    container: 'px-1.5 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2 py-1 text-sm gap-1.5',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-base gap-2',
    icon: 'w-4 h-4',
  },
};

export function CUDStatusBadge({
  status,
  showIcon = true,
  showLabel = true,
  size = 'md',
  className = '',
}: CUDStatusBadgeProps) {
  const config = statusConfig[status];
  const sizeStyle = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeStyle.container} ${className}`}
    >
      {showIcon && (
        <span className={sizeStyle.icon}>
          {config.icon}
        </span>
      )}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// 상태 전환 표시 컴포넌트
interface StatusTransitionProps {
  from: CUDStatus;
  to: CUDStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusTransition({ from, to, size = 'md' }: StatusTransitionProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <CUDStatusBadge status={from} size={size} />
      <span className="text-gray-400">→</span>
      <CUDStatusBadge status={to} size={size} />
    </div>
  );
}

// 상태 타임라인 컴포넌트
interface StatusTimelineItem {
  status: CUDStatus;
  timestamp: Date;
  user?: string;
  description?: string;
}

interface StatusTimelineProps {
  items: StatusTimelineItem[];
}

export function StatusTimeline({ items }: StatusTimelineProps) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const config = statusConfig[item.status];
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="relative flex gap-3">
            {/* 연결선 */}
            {!isLast && (
              <div className="absolute left-[11px] top-6 w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
            )}
            
            {/* 상태 아이콘 */}
            <div className={`relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${config.bgColor} ${config.textColor}`}>
              <span className="w-3.5 h-3.5">
                {config.icon}
              </span>
            </div>
            
            {/* 내용 */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${config.textColor}`}>
                  {config.label}
                </span>
                <span className="text-xs text-gray-400">
                  {item.timestamp.toLocaleString('ko-KR')}
                </span>
              </div>
              {item.user && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.user}
                </p>
              )}
              {item.description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CUDStatusBadge;
