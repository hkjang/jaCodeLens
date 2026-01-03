'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Check, X, Pencil, Loader2 } from 'lucide-react';

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void | Promise<void>;
  
  // 선택적
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  maxLength?: number;
  minLength?: number;
  
  // 스타일
  className?: string;
  inputClassName?: string;
  
  // 검증
  validate?: (value: string) => string | null; // null이면 유효, 문자열이면 에러 메시지
  
  // 콜백
  onCancel?: () => void;
  onEditStart?: () => void;
}

export function InlineEdit({
  value,
  onSave,
  placeholder = '클릭하여 편집',
  disabled = false,
  multiline = false,
  maxLength,
  minLength,
  className = '',
  inputClassName = '',
  validate,
  onCancel,
  onEditStart,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // 편집 모드 시작
  const startEdit = useCallback(() => {
    if (disabled || loading) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
    onEditStart?.();
  }, [disabled, loading, value, onEditStart]);

  // 저장
  const handleSave = useCallback(async () => {
    if (loading) return;
    
    // 값이 변경되지 않았으면 취소
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    // 길이 검증
    if (minLength && editValue.length < minLength) {
      setError(`최소 ${minLength}자 이상 입력해주세요`);
      return;
    }

    // 커스텀 검증
    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다');
      console.error('InlineEdit save error:', err);
    } finally {
      setLoading(false);
    }
  }, [editValue, loading, minLength, onSave, validate, value]);

  // 취소
  const handleCancel = useCallback(() => {
    if (loading) return;
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    onCancel?.();
  }, [loading, onCancel, value]);

  // 키보드 이벤트
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleCancel, handleSave, multiline]);

  // 포커스 처리
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 값 변경 시 동기화
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // 읽기 모드
  if (!isEditing) {
    return (
      <div 
        className={`group inline-flex items-center gap-2 cursor-pointer ${className}`}
        onClick={startEdit}
      >
        <span className={`${!value ? 'text-gray-400 italic' : ''}`}>
          {value || placeholder}
        </span>
        {!disabled && (
          <Pencil className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  }

  // 편집 모드
  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div className="inline-flex items-center gap-2">
        <InputComponent
          ref={inputRef as any}
          type="text"
          value={editValue}
          onChange={(e) => {
            const newValue = maxLength 
              ? e.target.value.slice(0, maxLength) 
              : e.target.value;
            setEditValue(newValue);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // 버튼 클릭 시 blur가 먼저 발생하므로 약간의 지연
            setTimeout(() => {
              if (!loading && isEditing) {
                handleCancel();
              }
            }, 150);
          }}
          disabled={loading}
          placeholder={placeholder}
          className={`px-2 py-1 border border-blue-500 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 ${
            error ? 'border-red-500' : ''
          } ${inputClassName}`}
          rows={multiline ? 3 : undefined}
        />
        
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="p-1 text-white bg-green-500 hover:bg-green-600 rounded disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="p-1 text-white bg-gray-500 hover:bg-gray-600 rounded disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
      
      {/* 길이 표시 */}
      {maxLength && (
        <span className="text-xs text-gray-400">
          {editValue.length} / {maxLength}
        </span>
      )}
    </div>
  );
}

export default InlineEdit;
