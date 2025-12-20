'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricComparison {
  baseline: number;
  project: number;
  difference: number;
  status: 'better' | 'same' | 'worse';
}

interface ComparisonChartProps {
  comparison: {
    complexity: MetricComparison;
    debt: MetricComparison;
    risk: MetricComparison;
    quality: MetricComparison;
    security: MetricComparison;
    coverage: MetricComparison;
  };
  projectName: string;
  baselineVersion: number;
  overallStatus: 'passing' | 'warning' | 'failing';
}

/**
 * 프로젝트와 기준선 비교 차트
 */
export function ComparisonChart({ 
  comparison, 
  projectName, 
  baselineVersion,
  overallStatus 
}: ComparisonChartProps) {
  const metrics = [
    { key: 'quality', label: '품질', lowerIsBetter: false },
    { key: 'security', label: '보안', lowerIsBetter: false },
    { key: 'coverage', label: '커버리지', lowerIsBetter: false },
    { key: 'complexity', label: '복잡도', lowerIsBetter: true },
    { key: 'risk', label: '리스크', lowerIsBetter: true },
    { key: 'debt', label: '부채', lowerIsBetter: true }
  ];

  const statusColors = {
    passing: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    failing: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  const statusLabels = {
    passing: '통과',
    warning: '경고',
    failing: '실패'
  };

  const getStatusIcon = (status: 'better' | 'same' | 'worse') => {
    switch (status) {
      case 'better':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'worse':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDifferenceDisplay = (diff: number, lowerIsBetter: boolean) => {
    const sign = diff > 0 ? '+' : '';
    const color = lowerIsBetter 
      ? (diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-500')
      : (diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500');
    
    return (
      <span className={`text-sm font-medium ${color}`}>
        {sign}{diff.toFixed(1)}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {projectName} vs 기준선 v{baselineVersion}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            기준선과의 비교 결과
          </p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[overallStatus]}`}>
          {statusLabels[overallStatus]}
        </span>
      </div>

      <div className="space-y-4">
        {metrics.map(({ key, label, lowerIsBetter }) => {
          const metric = comparison[key as keyof typeof comparison];
          const maxValue = Math.max(metric.baseline, metric.project, 100);
          const baselineWidth = (metric.baseline / maxValue) * 100;
          const projectWidth = (metric.project / maxValue) * 100;
          
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  {getDifferenceDisplay(metric.difference, lowerIsBetter)}
                  {getStatusIcon(metric.status)}
                </div>
              </div>
              
              <div className="space-y-1">
                {/* Baseline bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">기준선</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${baselineWidth}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">
                    {metric.baseline.toFixed(0)}
                  </span>
                </div>
                
                {/* Project bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">프로젝트</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        metric.status === 'better' ? 'bg-green-500' :
                        metric.status === 'worse' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${projectWidth}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">
                    {metric.project.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ComparisonChart;
