'use client';

import { useState, useCallback, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  validate?: () => boolean | Promise<boolean>;
  content: ReactNode;
}

interface CreateWizardProps {
  steps: WizardStep[];
  onComplete: () => void | Promise<void>;
  onCancel: () => void;
  
  // 선택적
  title?: string;
  showStepIndicator?: boolean;
  allowSkip?: boolean;
  
  // 버튼 텍스트
  nextText?: string;
  prevText?: string;
  completeText?: string;
  cancelText?: string;
}

export function CreateWizard({
  steps,
  onComplete,
  onCancel,
  title,
  showStepIndicator = true,
  allowSkip = false,
  nextText = '다음',
  prevText = '이전',
  completeText = '완료',
  cancelText = '취소',
}: CreateWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setValidationErrors({});

    try {
      // 현재 단계 검증
      if (currentStep.validate) {
        const isValid = await currentStep.validate();
        if (!isValid) {
          setLoading(false);
          return;
        }
      }

      if (isLastStep) {
        // 마지막 단계에서는 완료 처리
        await onComplete();
      } else {
        // 다음 단계로 이동
        setCurrentStepIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Wizard step error:', error);
      setValidationErrors({ general: '처리 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  }, [currentStep, isLastStep, loading, onComplete]);

  const handlePrev = useCallback(() => {
    if (loading || isFirstStep) return;
    setCurrentStepIndex(prev => prev - 1);
    setValidationErrors({});
  }, [isFirstStep, loading]);

  const handleStepClick = useCallback((index: number) => {
    if (loading) return;
    if (allowSkip || index < currentStepIndex) {
      setCurrentStepIndex(index);
      setValidationErrors({});
    }
  }, [allowSkip, currentStepIndex, loading]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          {title && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentStep.title}
          </p>
        </div>
        <button
          onClick={onCancel}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 진행 표시기 */}
      {showStepIndicator && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isClickable = allowSkip || index < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  {/* 단계 아이콘/번호 */}
                  <button
                    onClick={() => handleStepClick(index)}
                    disabled={!isClickable || loading}
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    } ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.icon || index + 1}
                  </button>
                  
                  {/* 연결선 */}
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isCompleted
                          ? 'bg-green-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* 단계 레이블 */}
          <div className="flex items-center justify-between mt-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex-1 last:flex-none last:w-8">
                <p className={`text-xs truncate ${
                  index === currentStepIndex
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="p-6 min-h-[300px]">
        {/* 설명 */}
        {currentStep.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {currentStep.description}
          </p>
        )}
        
        {/* 단계 콘텐츠 */}
        {currentStep.content}

        {/* 에러 메시지 */}
        {validationErrors.general && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {validationErrors.general}
          </div>
        )}
      </div>

      {/* 푸터 (네비게이션 버튼) */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          단계 {currentStepIndex + 1} / {steps.length}
        </div>
        
        <div className="flex items-center gap-3">
          {/* 취소 버튼 */}
          {isFirstStep && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          
          {/* 이전 버튼 */}
          {!isFirstStep && (
            <button
              onClick={handlePrev}
              disabled={loading}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              {prevText}
            </button>
          )}
          
          {/* 다음/완료 버튼 */}
          <button
            onClick={handleNext}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                처리 중...
              </>
            ) : isLastStep ? (
              <>
                <Check className="w-4 h-4" />
                {completeText}
              </>
            ) : (
              <>
                {nextText}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateWizard;
