'use client';

import React from 'react';
import { Shield, Star } from 'lucide-react';

interface SelfAnalysisBadgeProps {
  variant?: 'default' | 'small' | 'large';
  showIcon?: boolean;
}

/**
 * Self Analysis 배지 컴포넌트
 * 기본 프로젝트임을 나타내는 배지
 */
export function SelfAnalysisBadge({ 
  variant = 'default', 
  showIcon = true 
}: SelfAnalysisBadgeProps) {
  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    default: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-1.5'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 
        bg-gradient-to-r from-amber-500 to-orange-500 
        text-white font-semibold rounded-full
        shadow-sm
        ${sizeClasses[variant]}
      `}
    >
      {showIcon && <Star className={`${iconSizes[variant]} fill-current`} />}
      Self Analysis
    </span>
  );
}

/**
 * Internal Core 타입 배지
 */
export function InternalCoreBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
      <Shield className="w-3 h-3" />
      internal-core
    </span>
  );
}

/**
 * 태그 배지
 */
export function TagBadge({ tag }: { tag: string }) {
  const colorMap: Record<string, string> = {
    self: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    reference: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    baseline: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colorMap[tag] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
      {tag}
    </span>
  );
}

export default SelfAnalysisBadge;
