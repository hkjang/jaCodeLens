'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BarChart3, AlertCircle, AlertTriangle, Info, CheckCircle,
  RefreshCw, Download, Filter, Search, ChevronDown, FileCode,
  TrendingUp, TrendingDown, Minus, Layers, Clock, Zap
} from 'lucide-react';

interface Issue {
  id: string;
  severity: string;
  category: string;
  message: string;
  filePath: string;
  lineNumber: number;
  suggestion?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export default function ProjectResultsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<{ id: string; name: string; path: string } | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    try {
      // 프로젝트 정보
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }

      // 이슈 목록
      const issuesRes = await fetch(`/api/analysis/issues?projectId=${projectId}`);
      if (issuesRes.ok) {
        const data = await issuesRes.json();
        setIssues(data.items || []);
      }

      // 통계
      const statsRes = await fetch(`/api/analysis/stats?projectId=${projectId}`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredIssues = issues.filter(issue => {
    if (severityFilter && issue.severity !== severityFilter) return false;
    if (categoryFilter && issue.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return issue.message.toLowerCase().includes(q) || 
             issue.filePath.toLowerCase().includes(q) ||
             issue.category.toLowerCase().includes(q);
    }
    return true;
  });

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      INFO: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[severity] || colors.INFO;
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'CRITICAL') return <AlertCircle className="w-4 h-4" />;
    if (severity === 'HIGH') return <AlertTriangle className="w-4 h-4" />;
    if (severity === 'MEDIUM') return <Info className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const categories = [...new Set(issues.map(i => i.category))];

  if (loading) {
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
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${projectId}`} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              분석 결과
            </h1>
            <p className="text-gray-500">{project?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <RefreshCw className="w-5 h-5" />
          </button>
          <a 
            href={`/api/projects/${projectId}/report?format=html`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Download className="w-4 h-4" />
            리포트 다운로드
          </a>
        </div>
      </header>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Layers className="w-4 h-4" />
              전체
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
              <AlertCircle className="w-4 h-4" />
              Critical
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 text-orange-500 text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              High
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-yellow-500 text-sm mb-1">
              <Info className="w-4 h-4" />
              Medium
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Low
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.low}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Info className="w-4 h-4" />
              Info
            </div>
            <div className="text-2xl font-bold text-gray-600">{stats.info}</div>
          </div>
        </div>
      )}

      {/* 필터 바 */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
          />
        </div>
        <select 
          value={severityFilter} 
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <option value="">모든 심각도</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </select>
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <option value="">모든 카테고리</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* 이슈 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            발견된 이슈 ({filteredIssues.length})
          </h2>
        </div>
        {filteredIssues.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {filteredIssues.map(issue => (
              <div key={issue.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start gap-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                    {getSeverityIcon(issue.severity)}
                    {issue.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{issue.message}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileCode className="w-3 h-3" />
                        {issue.filePath}:{issue.lineNumber}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                        {issue.category}
                      </span>
                    </div>
                    {issue.suggestion && (
                      <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                        💡 {issue.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">이슈가 없습니다!</p>
            <p className="text-sm mt-2">코드 분석이 완료되었으나 발견된 이슈가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
