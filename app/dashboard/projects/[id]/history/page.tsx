'use client';

/**
 * 프로젝트 분석 이력 페이지
 * 
 * - 시간순 이력 목록
 * - 필터 (브랜치, 태그, 상태)
 * - 비교 선택 (2클릭)
 * - 드릴다운 네비게이션
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, GitBranch, GitCommit, Tag, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, ArrowRight, ChevronDown,
  BarChart3, TrendingUp, TrendingDown, Minus, Diff,
  FileText, Filter, Search, Calendar
} from 'lucide-react';

interface HistoryItem {
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
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  hasSnapshot: boolean;
  taskCount: number;
  environment?: string;
}

interface Filters {
  branches: string[];
  tags: string[];
  statuses: string[];
}

export default function ProjectHistoryPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [project, setProject] = useState<{ id: string; name: string; path: string } | null>(null);
  const [filters, setFilters] = useState<Filters>({ branches: [], tags: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // 필터 상태
  const [branchFilter, setBranchFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 비교 선택
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    loadHistory();
  }, [projectId, branchFilter, tagFilter, statusFilter]);

  async function loadHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.set('branch', branchFilter);
      if (tagFilter) params.set('tag', tagFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/projects/${projectId}/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
        setProject(data.project);
        setFilters(data.filters);
        setTotal(data.pagination.total);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoading(false);
    }
  }

  function toggleCompareSelect(id: string) {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'RUNNING':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  }

  function getScoreColor(score: number | null) {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link href="/dashboard/projects" className="hover:text-gray-700">프로젝트</Link>
            <span className="mx-2">/</span>
            <Link href={`/dashboard/projects/${projectId}`} className="hover:text-gray-700">
              {project?.name || '...'}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 dark:text-white">분석 이력</span>
          </nav>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 이력</h2>
          <p className="text-gray-500">프로젝트의 모든 분석 실행 기록</p>
        </div>
        <div className="flex items-center gap-2">
          {compareMode ? (
            <>
              <span className="text-sm text-gray-500">
                {selectedForCompare.length}/2 선택됨
              </span>
              <Link
                href={selectedForCompare.length === 2 
                  ? `/dashboard/projects/${projectId}/history/compare?base=${selectedForCompare[0]}&target=${selectedForCompare[1]}`
                  : '#'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                  selectedForCompare.length === 2 
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <Diff className="w-4 h-4" />
                비교하기
              </Link>
              <button
                onClick={() => {
                  setCompareMode(false);
                  setSelectedForCompare([]);
                }}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                취소
              </button>
            </>
          ) : (
            <button
              onClick={() => setCompareMode(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Diff className="w-4 h-4" />
              비교 모드
            </button>
          )}
        </div>
      </header>

      {/* 필터 바 */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Filter className="w-5 h-5 text-gray-400" />
        
        {/* 브랜치 필터 */}
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">모든 브랜치</option>
          {filters.branches.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* 태그 필터 */}
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">모든 태그</option>
          {filters.tags.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* 상태 필터 */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">모든 상태</option>
          {filters.statuses.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span className="ml-auto text-sm text-gray-500">
          총 {total}개 실행
        </span>
      </div>

      {/* 이력 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {history.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((item, idx) => (
              <div
                key={item.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  selectedForCompare.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* 비교 선택 체크박스 */}
                  {compareMode && (
                    <input
                      type="checkbox"
                      checked={selectedForCompare.includes(item.id)}
                      onChange={() => toggleCompareSelect(item.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}

                  {/* 상태 아이콘 */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(item.status)}
                  </div>

                  {/* 메인 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 날짜 */}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDate(item.startedAt)}
                      </span>

                      {/* 브랜치 */}
                      {item.gitBranch && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                          <GitBranch className="w-3 h-3" />
                          {item.gitBranch}
                        </span>
                      )}

                      {/* 태그 */}
                      {item.gitTag && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                          <Tag className="w-3 h-3" />
                          {item.gitTag}
                        </span>
                      )}

                      {/* 커밋 */}
                      {item.gitCommit && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <GitCommit className="w-3 h-3" />
                          {item.gitCommit.slice(0, 7)}
                        </span>
                      )}
                    </div>

                    {/* 커밋 메시지 */}
                    {item.gitMessage && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {item.gitMessage}
                      </p>
                    )}
                  </div>

                  {/* 통계 */}
                  <div className="flex items-center gap-4 text-sm">
                    {/* 점수 */}
                    <div className={`font-bold ${getScoreColor(item.score)}`}>
                      {item.score !== null ? `${Math.round(item.score)}점` : '-'}
                    </div>

                    {/* 이슈 수 */}
                    <div className="flex items-center gap-2">
                      {item.criticalCount && item.criticalCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-xs rounded">
                          C: {item.criticalCount}
                        </span>
                      )}
                      {item.highCount && item.highCount > 0 && (
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-xs rounded">
                          H: {item.highCount}
                        </span>
                      )}
                      <span className="text-gray-500">
                        총 {item.totalIssues}개
                      </span>
                    </div>

                    {/* 상세 링크 */}
                    <Link
                      href={`/dashboard/projects/${projectId}/history/${item.id}`}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      상세
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">분석 이력이 없습니다</p>
            <p className="text-sm mt-2">분석을 실행하면 여기에 기록됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
