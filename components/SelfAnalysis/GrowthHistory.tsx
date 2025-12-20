'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

interface GrowthHistoryProps {
  history: {
    version: number;
    qualityScore?: number | null;
    securityScore?: number | null;
    createdAt: string;
  }[];
}

/**
 * 성장 히스토리 그래프
 */
export function GrowthHistory({ history }: GrowthHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          기준선 성장 히스토리
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          아직 기준선 히스토리가 없습니다
        </p>
      </div>
    );
  }

  const sortedHistory = [...history].sort((a, b) => a.version - b.version);
  const latestQuality = sortedHistory[sortedHistory.length - 1]?.qualityScore || 0;
  const firstQuality = sortedHistory[0]?.qualityScore || 0;
  const qualityChange = latestQuality - firstQuality;

  const latestSecurity = sortedHistory[sortedHistory.length - 1]?.securityScore || 0;
  const firstSecurity = sortedHistory[0]?.securityScore || 0;
  const securityChange = latestSecurity - firstSecurity;

  const maxScore = 100;
  
  const getTrend = (change: number) => {
    if (change > 0) return { icon: TrendingUp, color: 'text-green-500', label: '상승' };
    if (change < 0) return { icon: TrendingDown, color: 'text-red-500', label: '하락' };
    return { icon: Minus, color: 'text-gray-400', label: '유지' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        기준선 성장 히스토리
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: '품질 점수', change: qualityChange, current: latestQuality },
          { label: '보안 점수', change: securityChange, current: latestSecurity }
        ].map(({ label, change, current }) => {
          const trend = getTrend(change);
          const TrendIcon = trend.icon;
          
          return (
            <div key={label} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                <div className={`flex items-center gap-1 text-sm ${trend.color}`}>
                  <TrendIcon className="w-4 h-4" />
                  {change > 0 ? '+' : ''}{change.toFixed(0)}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {current?.toFixed(0) || '-'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          버전 히스토리
        </h4>
        
        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
          
          <div className="space-y-4">
            {sortedHistory.map((baseline, index) => {
              const prevBaseline = sortedHistory[index - 1];
              const qualityDiff = prevBaseline 
                ? (baseline.qualityScore || 0) - (prevBaseline.qualityScore || 0)
                : 0;
              
              return (
                <div key={baseline.version} className="relative flex items-start gap-4 pl-4">
                  {/* Dot */}
                  <div className={`
                    absolute left-2.5 -translate-x-1/2 w-3 h-3 rounded-full border-2
                    ${index === sortedHistory.length - 1 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}
                  `} />
                  
                  <div className="flex-1 ml-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        v{baseline.version}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(baseline.createdAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        품질: {baseline.qualityScore?.toFixed(0) || '-'}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        보안: {baseline.securityScore?.toFixed(0) || '-'}
                      </span>
                      {index > 0 && qualityDiff !== 0 && (
                        <span className={qualityDiff > 0 ? 'text-green-500' : 'text-red-500'}>
                          {qualityDiff > 0 ? '+' : ''}{qualityDiff.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Graph visualization */}
      {sortedHistory.length > 1 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            점수 추이
          </h4>
          <div className="h-32 flex items-end gap-2">
            {sortedHistory.map((baseline, index) => {
              const qualityHeight = ((baseline.qualityScore || 0) / maxScore) * 100;
              const securityHeight = ((baseline.securityScore || 0) / maxScore) * 100;
              
              return (
                <div key={baseline.version} className="flex-1 flex gap-1">
                  <div 
                    className="flex-1 bg-blue-400 dark:bg-blue-500 rounded-t transition-all hover:bg-blue-500"
                    style={{ height: `${qualityHeight}%` }}
                    title={`품질: ${baseline.qualityScore?.toFixed(0) || '-'}`}
                  />
                  <div 
                    className="flex-1 bg-green-400 dark:bg-green-500 rounded-t transition-all hover:bg-green-500"
                    style={{ height: `${securityHeight}%` }}
                    title={`보안: ${baseline.securityScore?.toFixed(0) || '-'}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">v{sortedHistory[0]?.version}</span>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded" /> 품질
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded" /> 보안
              </span>
            </div>
            <span className="text-xs text-gray-500">v{sortedHistory[sortedHistory.length - 1]?.version}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default GrowthHistory;
