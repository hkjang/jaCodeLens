'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, Trash2, Archive, Info } from 'lucide-react';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface ImpactItem {
  label: string;
  count?: number;
  description?: string;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  
  // 기본 정보
  title: string;
  message: string;
  
  // 변형 (색상/아이콘)
  variant?: ConfirmDialogVariant;
  
  // 영향 범위 표시
  impactItems?: ImpactItem[];
  
  // 삭제 옵션
  showArchiveOption?: boolean;
  onArchive?: () => void;
  
  // 복구 가능 여부
  recoverable?: boolean;
  recoverableDays?: number;
  
  // 확인 입력 (완전 삭제 시)
  requireConfirmText?: string;
  
  // 로딩 상태
  loading?: boolean;
  
  // 버튼 텍스트
  confirmText?: string;
  cancelText?: string;
}

const variantConfig: Record<ConfirmDialogVariant, {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  buttonBg: string;
  buttonHover: string;
}> = {
  danger: {
    icon: <Trash2 className="w-6 h-6" />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    buttonBg: 'bg-yellow-600',
    buttonHover: 'hover:bg-yellow-700',
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  impactItems,
  showArchiveOption = false,
  onArchive,
  recoverable = true,
  recoverableDays = 30,
  requireConfirmText,
  loading = false,
  confirmText = '확인',
  cancelText = '취소',
}: ConfirmDialogProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const config = variantConfig[variant];

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  // 모달 열릴 때 포커스
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
    if (!isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = requireConfirmText 
    ? confirmInput !== requireConfirmText 
    : false;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 백드롭 */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={!loading ? onClose : undefined}
      />
      
      {/* 다이얼로그 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={dialogRef}
          tabIndex={-1}
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full transform transition-all animate-in fade-in zoom-in-95 duration-200"
        >
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 내용 */}
          <div className="p-6">
            {/* 아이콘 */}
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${config.iconBg} ${config.iconColor}`}>
              {config.icon}
            </div>

            {/* 제목 & 메시지 */}
            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {message}
              </p>
            </div>

            {/* 영향 범위 */}
            {impactItems && impactItems.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  영향 범위
                </p>
                <ul className="space-y-1">
                  {impactItems.map((item, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                      {item.count !== undefined && (
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.count}개
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 복구 가능 안내 */}
            {recoverable && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Archive className="w-4 h-4" />
                <span>{recoverableDays}일 내 복구 가능</span>
              </div>
            )}
            {!recoverable && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>이 작업은 되돌릴 수 없습니다</span>
              </div>
            )}

            {/* 확인 텍스트 입력 */}
            {requireConfirmText && (
              <div className="mt-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  확인하려면 <strong className="text-gray-900 dark:text-white">{requireConfirmText}</strong>을(를) 입력하세요
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={requireConfirmText}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* 버튼 영역 */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl flex items-center justify-end gap-3">
            {/* 아카이브 옵션 */}
            {showArchiveOption && onArchive && (
              <button
                onClick={onArchive}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50"
              >
                <Archive className="w-4 h-4 inline mr-1" />
                아카이브
              </button>
            )}
            
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50"
            >
              {cancelText}
            </button>
            
            <button
              onClick={onConfirm}
              disabled={loading || isConfirmDisabled}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonBg} ${config.buttonHover}`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  처리 중...
                </span>
              ) : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
