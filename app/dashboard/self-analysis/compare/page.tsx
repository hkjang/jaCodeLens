'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { ComparisonChart } from '@/components/SelfAnalysis';
import { prisma } from '@/lib/db';

export default function ComparePage() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string>('');
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExecutions, setLoadingExecutions] = useState(true);

  // Fetch recent executions
  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        const res = await fetch('/api/analysis/result?limit=10');
        if (res.ok) {
          const data = await res.json();
          setExecutions(data.executions || []);
        }
      } catch (err) {
        console.error('Failed to fetch executions:', err);
      } finally {
        setLoadingExecutions(false);
      }
    };
    
    fetchExecutions();
  }, []);

  const handleCompare = async () => {
    if (!selectedExecution) return;
    
    try {
      setLoading(true);
      const res = await fetch('/api/self-analysis/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId: selectedExecution })
      });
      
      if (res.ok) {
        const data = await res.json();
        setComparison(data.comparison);
      }
    } catch (err) {
      console.error('Failed to compare:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/self-analysis"
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            기준선 비교
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            분석 결과를 Self-Analysis 기준선과 비교합니다
          </p>
        </div>
      </div>

      {/* Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          비교할 분석 결과 선택
        </h2>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedExecution}
            onChange={(e) => setSelectedExecution(e.target.value)}
            disabled={loadingExecutions}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">분석 결과를 선택하세요</option>
            {executions.map(exec => (
              <option key={exec.id} value={exec.id}>
                {exec.project?.name || 'Unknown Project'} - {new Date(exec.startedAt).toLocaleDateString('ko-KR')} (점수: {exec.score?.toFixed(0) || '-'})
              </option>
            ))}
          </select>
          
          <button
            onClick={handleCompare}
            disabled={!selectedExecution || loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                비교 중...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                비교하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparison Result */}
      {comparison && (
        <ComparisonChart
          comparison={comparison.comparison}
          projectName={comparison.projectName}
          baselineVersion={comparison.baselineVersion}
          overallStatus={comparison.overallStatus}
        />
      )}

      {/* Empty State */}
      {!comparison && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            비교할 분석 결과를 선택하세요
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            분석 결과를 선택하면 Self-Analysis 기준선과 비교 결과를 확인할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}
