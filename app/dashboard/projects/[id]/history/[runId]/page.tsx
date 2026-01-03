'use client';

/**
 * 분석 실행 상세 페이지
 * 
 * - 실행 메타 정보
 * - 이슈 목록
 * - 통계
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Clock, GitBranch, GitCommit, Tag,
  FileCode, AlertTriangle, BarChart3, RefreshCw, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, Layers, Target
} from 'lucide-react';

interface ExecutionDetail {
  id: string;
  status: string;
  score: number | null;
  startedAt: string;
  completedAt?: string;
  gitBranch?: string;
  gitCommit?: string;
  gitTag?: string;
  gitMessage?: string;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  project: { id: string; name: string };
  snapshot?: { fileCount: number; totalLines: number };
}

interface Issue {
  id: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  severity: string;
  mainCategory: string;
  message: string;
  suggestion?: string;
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const runId = params.runId as string;

  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [navigation, setNavigation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetail();
  }, [runId]);

  async function loadDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/history/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setExecution(data.execution);
        setIssues(data.issues);
        setStats(data.stats);
        setNavigation(data.navigation);
      }
    } catch (e) {
      console.error('Failed to load detail', e);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      COMPLETED: { bg: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      FAILED: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
      RUNNING: { bg: 'bg-blue-100 text-blue-700', icon: <RefreshCw className="w-4 h-4 animate-spin" /> },
      PENDING: { bg: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4" /> },
    };
    return styles[status] || styles.PENDING;
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

  if (!execution) {
    return (
      <div className="text-center p-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <p>분석 실행을 찾을 수 없습니다</p>
      </div>
    );
  }

  const statusStyle = getStatusBadge(execution.status);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <Link 
            href={`/dashboard/projects/${projectId}/history`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            이력으로 돌아가기
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            분석 실행 상세
          </h2>
          <p className="text-gray-500">
            {formatDate(execution.startedAt)}
          </p>
        </div>

        {/* 이전/다음 네비게이션 */}
        <div className="flex items-center gap-2">
          {navigation?.prev && (
            <Link
              href={`/dashboard/projects/${projectId}/history/${navigation.prev.id}`}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </Link>
          )}
          {navigation?.next && (
            <Link
              href={`/dashboard/projects/${projectId}/history/${navigation.next.id}`}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* 메타 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 상태 및 점수 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${statusStyle.bg}`}>
              {statusStyle.icon}
              {execution.status}
            </span>
          </div>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            {execution.score !== null ? `${Math.round(execution.score)}점` : '-'}
          </div>
          <p className="text-sm text-gray-500 mt-1">품질 점수</p>
        </div>

        {/* Git 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm text-gray-500 mb-3">Git 정보</h3>
          <div className="space-y-2">
            {execution.gitBranch && (
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{execution.gitBranch}</span>
              </div>
            )}
            {execution.gitCommit && (
              <div className="flex items-center gap-2 text-sm">
                <GitCommit className="w-4 h-4 text-gray-400" />
                <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                  {execution.gitCommit.slice(0, 7)}
                </code>
              </div>
            )}
            {execution.gitTag && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-green-500" />
                <span className="font-medium">{execution.gitTag}</span>
              </div>
            )}
            {execution.gitMessage && (
              <p className="text-sm text-gray-500 truncate mt-2">
                {execution.gitMessage}
              </p>
            )}
          </div>
        </div>

        {/* 통계 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm text-gray-500 mb-3">이슈 요약</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {execution.criticalCount > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                Critical: {execution.criticalCount}
              </span>
            )}
            {execution.highCount > 0 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium">
                High: {execution.highCount}
              </span>
            )}
            {execution.mediumCount > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-medium">
                Medium: {execution.mediumCount}
              </span>
            )}
            {execution.lowCount > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                Low: {execution.lowCount}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
            총 {execution.totalIssues}개 이슈
          </p>
        </div>
      </div>

      {/* 카테고리별 통계 */}
      {stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            카테고리별 분포
          </h3>
          <div className="flex items-center gap-4 flex-wrap">
            {Object.entries(stats.byCategory).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{cat}:</span>
                <span className="font-medium">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 이슈 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            이슈 목록 (상위 100개)
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {issues.map((issue) => (
            <div key={issue.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                    <span className="truncate" title={issue.filePath}>{issue.filePath}</span>
                    <span>L{issue.lineStart}-{issue.lineEnd}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                      {issue.mainCategory}
                    </span>
                  </div>
                  {issue.suggestion && (
                    <p className="text-xs text-gray-500 mt-2 italic">
                      💡 {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {issues.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              이슈가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
