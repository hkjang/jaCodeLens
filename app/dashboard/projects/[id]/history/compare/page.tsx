'use client';

/**
 * 프로젝트 분석 비교 페이지
 * 
 * - 두 분석 실행 간 diff 시각화
 * - 신규/해소 이슈 목록
 * - 변화 차트
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, GitBranch, GitCommit, ArrowRight, ArrowDown,
  Plus, Minus, Equal, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, BarChart3, FileCode, RefreshCw
} from 'lucide-react';

interface CompareResult {
  base: {
    id: string;
    startedAt: string;
    gitBranch?: string;
    gitCommit?: string;
    score: number | null;
    totalIssues: number;
  };
  target: {
    id: string;
    startedAt: string;
    gitBranch?: string;
    gitCommit?: string;
    score: number | null;
    totalIssues: number;
  };
  comparison: {
    added: any[];
    removed: any[];
    addedCount: number;
    removedCount: number;
    unchangedCount: number;
  };
  changes: {
    scoreChange: number;
    severityChange: Record<string, number>;
    issuesDelta: number;
    improvement: boolean;
  };
  summary: {
    text: string;
  };
}

export default function CompareHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const baseId = searchParams.get('base');
  const targetId = searchParams.get('target');

  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'added' | 'removed'>('added');

  useEffect(() => {
    if (baseId && targetId) {
      loadComparison();
    }
  }, [baseId, targetId]);

  async function loadComparison() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/compare?base=${baseId}&target=${targetId}`
      );
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      console.error('Failed to load comparison', e);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getScoreColor(score: number | null) {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  }

  function getSeverityBadge(severity: string) {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-700',
      HIGH: 'bg-orange-100 text-orange-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      LOW: 'bg-blue-100 text-blue-700',
      INFO: 'bg-gray-100 text-gray-700',
    };
    return colors[severity] || 'bg-gray-100 text-gray-700';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center p-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <p>비교 데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header>
        <Link 
          href={`/dashboard/projects/${projectId}/history`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          이력으로 돌아가기
        </Link>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 비교</h2>
        <p className="text-gray-500">두 분석 실행 간의 변화를 비교합니다</p>
      </header>

      {/* 비교 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Base */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 mb-2">기준 (Base)</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatDate(result.base.startedAt)}
          </div>
          {result.base.gitBranch && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <GitBranch className="w-3 h-3" />
              {result.base.gitBranch}
            </div>
          )}
          {result.base.gitCommit && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <GitCommit className="w-3 h-3" />
              {result.base.gitCommit.slice(0, 7)}
            </div>
          )}
          <div className="mt-3 flex items-center gap-4">
            <span className={`text-2xl font-bold ${getScoreColor(result.base.score)}`}>
              {result.base.score !== null ? `${Math.round(result.base.score)}점` : '-'}
            </span>
            <span className="text-sm text-gray-500">
              {result.base.totalIssues}개 이슈
            </span>
          </div>
        </div>

        {/* 화살표 및 변화 */}
        <div className="flex flex-col items-center justify-center">
          <ArrowRight className="w-8 h-8 text-gray-400 hidden md:block" />
          <ArrowDown className="w-8 h-8 text-gray-400 md:hidden" />
          
          <div className={`mt-2 px-4 py-2 rounded-lg font-medium ${
            result.changes.improvement 
              ? 'bg-green-100 text-green-700' 
              : result.changes.issuesDelta > 0
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {result.summary.text}
          </div>
        </div>

        {/* Target */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 mb-2">대상 (Target)</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatDate(result.target.startedAt)}
          </div>
          {result.target.gitBranch && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <GitBranch className="w-3 h-3" />
              {result.target.gitBranch}
            </div>
          )}
          {result.target.gitCommit && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <GitCommit className="w-3 h-3" />
              {result.target.gitCommit.slice(0, 7)}
            </div>
          )}
          <div className="mt-3 flex items-center gap-4">
            <span className={`text-2xl font-bold ${getScoreColor(result.target.score)}`}>
              {result.target.score !== null ? `${Math.round(result.target.score)}점` : '-'}
            </span>
            <span className="text-sm text-gray-500">
              {result.target.totalIssues}개 이슈
            </span>
          </div>
        </div>
      </div>

      {/* 변화 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Plus className="w-5 h-5 text-red-500" />}
          label="신규 이슈"
          value={result.comparison.addedCount}
          color="text-red-600"
        />
        <StatCard 
          icon={<Minus className="w-5 h-5 text-green-500" />}
          label="해소된 이슈"
          value={result.comparison.removedCount}
          color="text-green-600"
        />
        <StatCard 
          icon={<Equal className="w-5 h-5 text-gray-500" />}
          label="변경 없음"
          value={result.comparison.unchangedCount}
          color="text-gray-600"
        />
        <StatCard 
          icon={result.changes.scoreChange >= 0 
            ? <TrendingUp className="w-5 h-5 text-green-500" />
            : <TrendingDown className="w-5 h-5 text-red-500" />
          }
          label="점수 변화"
          value={`${result.changes.scoreChange >= 0 ? '+' : ''}${result.changes.scoreChange.toFixed(1)}`}
          color={result.changes.scoreChange >= 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      {/* 심각도별 변화 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          심각도별 변화
        </h3>
        <div className="flex items-center gap-6 flex-wrap">
          {Object.entries(result.changes.severityChange).map(([severity, change]) => (
            <div key={severity} className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBadge(severity)}`}>
                {severity}
              </span>
              <span className={`font-medium ${
                change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {change > 0 ? '+' : ''}{change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 이슈 목록 탭 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* 탭 헤더 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('added')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'added'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            신규 이슈 ({result.comparison.addedCount})
          </button>
          <button
            onClick={() => setActiveTab('removed')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'removed'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            해소된 이슈 ({result.comparison.removedCount})
          </button>
        </div>

        {/* 이슈 목록 */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {(activeTab === 'added' ? result.comparison.added : result.comparison.removed).map((issue, idx) => (
            <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityBadge(issue.severity)}`}>
                  {issue.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {issue.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <FileCode className="w-3 h-3" />
                    <span className="truncate">{issue.filePath}</span>
                    <span>L{issue.lineStart}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {(activeTab === 'added' ? result.comparison.added : result.comparison.removed).length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {activeTab === 'added' ? '신규 이슈가 없습니다' : '해소된 이슈가 없습니다'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number | string; 
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}
