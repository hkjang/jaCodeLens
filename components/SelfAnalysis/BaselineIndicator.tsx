'use client';

import React from 'react';
import { Activity, Shield, AlertTriangle, Bug, Gauge, TestTube } from 'lucide-react';

interface BaselineIndicatorProps {
  baseline: {
    version: number;
    status: string;
    isLocked: boolean;
    complexityScore?: number | null;
    debtScore?: number | null;
    riskScore?: number | null;
    qualityScore?: number | null;
    securityScore?: number | null;
    coverageScore?: number | null;
    approvedBy?: string | null;
    approvedAt?: Date | string | null;
  };
}

/**
 * 기준선 지표 표시 컴포넌트
 */
export function BaselineIndicator({ baseline }: BaselineIndicatorProps) {
  const metrics = [
    { 
      key: 'quality', 
      label: '품질', 
      value: baseline.qualityScore, 
      icon: Activity,
      color: 'blue',
      unit: '/100'
    },
    { 
      key: 'security', 
      label: '보안', 
      value: baseline.securityScore, 
      icon: Shield,
      color: 'green',
      unit: '/100'
    },
    { 
      key: 'complexity', 
      label: '복잡도', 
      value: baseline.complexityScore, 
      icon: Gauge,
      color: 'purple',
      unit: '',
      lowerIsBetter: true
    },
    { 
      key: 'risk', 
      label: '리스크', 
      value: baseline.riskScore, 
      icon: AlertTriangle,
      color: 'red',
      unit: '',
      lowerIsBetter: true
    },
    { 
      key: 'debt', 
      label: '부채', 
      value: baseline.debtScore, 
      icon: Bug,
      color: 'orange',
      unit: '',
      lowerIsBetter: true
    },
    { 
      key: 'coverage', 
      label: '커버리지', 
      value: baseline.coverageScore, 
      icon: TestTube,
      color: 'cyan',
      unit: '%'
    }
  ];

  const getColorClasses = (color: string, value: number | null | undefined, lowerIsBetter?: boolean) => {
    if (value === null || value === undefined) return 'bg-gray-100 text-gray-500';
    
    let score = value;
    if (lowerIsBetter) {
      score = Math.max(0, 100 - value * 5); // 낮을수록 좋음 변환
    }
    
    if (score >= 80) return `bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-400`;
    if (score >= 60) return `bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400`;
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            기준선 v{baseline.version}
          </h3>
          <span className={`
            px-2 py-0.5 text-xs font-medium rounded
            ${baseline.status === 'LOCKED' 
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' 
              : baseline.status === 'ACTIVE'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}
          `}>
            {baseline.status}
          </span>
          {baseline.isLocked && (
            <span className="text-xs text-gray-500">🔒 잠금됨</span>
          )}
        </div>
        {baseline.approvedBy && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            승인: {baseline.approvedBy}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map(metric => {
          const Icon = metric.icon;
          const value = metric.value;
          const displayValue = value !== null && value !== undefined ? value : '-';
          
          return (
            <div 
              key={metric.key}
              className={`
                p-3 rounded-lg text-center
                ${value !== null && value !== undefined 
                  ? 'bg-gray-50 dark:bg-gray-700/50' 
                  : 'bg-gray-100 dark:bg-gray-800'}
              `}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 text-${metric.color}-500`} />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {displayValue}{metric.unit && value !== null && <span className="text-sm">{metric.unit}</span>}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {metric.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 미니 기준선 카드
 */
export function BaselineMiniCard({ baseline }: { baseline: { version: number; qualityScore?: number | null; securityScore?: number | null } }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <div className="text-amber-600 dark:text-amber-400 text-sm font-medium">
        기준선 v{baseline.version}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span>품질: {baseline.qualityScore ?? '-'}</span>
        <span>•</span>
        <span>보안: {baseline.securityScore ?? '-'}</span>
      </div>
    </div>
  );
}

export default BaselineIndicator;
