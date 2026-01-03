'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { X, Undo2, Check } from 'lucide-react';

interface UndoToastProps {
  isOpen: boolean;
  onClose: () => void;
  onUndo: () => void;
  
  // 내용
  message: string;
  description?: string;
  icon?: ReactNode;
  
  // 타이머
  duration?: number; // 밀리초, 기본 5000ms
  showProgress?: boolean;
  
  // 스타일
  variant?: 'default' | 'success' | 'warning' | 'error';
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left';
}

const variantStyles = {
  default: {
    bg: 'bg-gray-800 dark:bg-gray-700',
    text: 'text-white',
    progress: 'bg-blue-500',
  },
  success: {
    bg: 'bg-green-600 dark:bg-green-700',
    text: 'text-white',
    progress: 'bg-green-300',
  },
  warning: {
    bg: 'bg-yellow-500 dark:bg-yellow-600',
    text: 'text-white',
    progress: 'bg-yellow-300',
  },
  error: {
    bg: 'bg-red-600 dark:bg-red-700',
    text: 'text-white',
    progress: 'bg-red-300',
  },
};

const positionStyles = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-left': 'top-4 left-4',
};

export function UndoToast({
  isOpen,
  onClose,
  onUndo,
  message,
  description,
  icon,
  duration = 5000,
  showProgress = true,
  variant = 'default',
  position = 'bottom-right',
}: UndoToastProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingTimeRef = useRef<number>(duration);

  const style = variantStyles[variant];

  // 타이머 시작
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    
    timerRef.current = setTimeout(() => {
      onClose();
    }, remainingTimeRef.current);
  }, [onClose]);

  // 타이머 정지
  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  }, []);

  // 진행률 업데이트
  useEffect(() => {
    if (!isOpen || !showProgress) return;

    const progressInterval = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          const newProgress = prev - (100 / (duration / 100));
          return Math.max(0, newProgress);
        });
      }
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isOpen, duration, isPaused, showProgress]);

  // 토스트 열림/닫힘 처리
  useEffect(() => {
    if (isOpen) {
      setProgress(100);
      remainingTimeRef.current = duration;
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOpen, duration, startTimer]);

  // 마우스 호버 시 타이머 정지
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
    pauseTimer();
  }, [pauseTimer]);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
    startTimer();
  }, [startTimer]);

  // 실행취소
  const handleUndo = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onUndo();
  }, [onUndo]);

  // 확정 (닫기)
  const handleConfirm = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed ${positionStyles[position]} z-50 animate-in slide-in-from-bottom-2 fade-in duration-300`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`${style.bg} ${style.text} rounded-lg shadow-lg overflow-hidden min-w-[300px] max-w-md`}>
        {/* 진행률 바 */}
        {showProgress && (
          <div className="h-1 bg-black/20">
            <div
              className={`h-full ${style.progress} transition-all duration-100`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* 아이콘 */}
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <p className="font-medium">{message}</p>
              {description && (
                <p className="mt-1 text-sm opacity-80">{description}</p>
              )}
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={handleConfirm}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 액션 버튼 */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
            >
              <Undo2 className="w-4 h-4" />
              실행취소
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4" />
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 토스트 매니저 훅
export function useUndoToast() {
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    description?: string;
    onUndo: () => void;
    onConfirm?: () => void;
    variant?: UndoToastProps['variant'];
  }>({
    isOpen: false,
    message: '',
    onUndo: () => {},
  });

  const show = useCallback((options: {
    message: string;
    description?: string;
    onUndo: () => void;
    onConfirm?: () => void;
    variant?: UndoToastProps['variant'];
  }) => {
    setToast({
      isOpen: true,
      ...options,
    });
  }, []);

  const hide = useCallback(() => {
    setToast(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleUndo = useCallback(() => {
    toast.onUndo();
    hide();
  }, [toast, hide]);

  const handleClose = useCallback(() => {
    toast.onConfirm?.();
    hide();
  }, [toast, hide]);

  return {
    toast,
    show,
    hide,
    UndoToastComponent: () => (
      <UndoToast
        isOpen={toast.isOpen}
        onClose={handleClose}
        onUndo={handleUndo}
        message={toast.message}
        description={toast.description}
        variant={toast.variant}
      />
    ),
  };
}

export default UndoToast;
