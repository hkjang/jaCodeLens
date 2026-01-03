'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BarChart3, AlertCircle, AlertTriangle, Info, CheckCircle,
  RefreshCw, Download, Search, FileCode, Layers, FolderOpen, List,
  ChevronDown, ChevronRight, X, ExternalLink, Copy, Eye
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
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  // URL 쿼리 파라미터로 초기 필터 값 설정
  const initialSeverity = searchParams.get('severity') || '';
  const initialCategory = searchParams.get('category') || '';

  const [project, setProject] = useState<{ id: string; name: string; path: string } | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState(initialSeverity);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [projectId]);


  async function loadData() {
    setLoading(true);
    try {
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }

      const issuesRes = await fetch(`/api/analysis/issues?projectId=${projectId}`);
      if (issuesRes.ok) {
        const data = await issuesRes.json();
        setIssues(data.items || []);
      }

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

  const filteredIssues = useMemo(() => issues.filter(issue => {
    if (severityFilter && issue.severity !== severityFilter) return false;
    if (categoryFilter && issue.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return issue.message.toLowerCase().includes(q) || 
             issue.filePath.toLowerCase().includes(q) ||
             issue.category.toLowerCase().includes(q);
    }
    return true;
  }), [issues, severityFilter, categoryFilter, searchQuery]);

  // 파일별 그룹화
  const groupedByFile = useMemo(() => {
    const groups: Record<string, Issue[]> = {};
    filteredIssues.forEach(issue => {
      if (!groups[issue.filePath]) groups[issue.filePath] = [];
      groups[issue.filePath].push(issue);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredIssues]);

  // 카테고리별 통계
  const categoryStats = useMemo(() => {
    const cats: Record<string, number> = {};
    issues.forEach(i => {
      cats[i.category] = (cats[i.category] || 0) + 1;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [issues]);

  const categories = [...new Set(issues.map(i => i.category))];

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

  const toggleFileExpand = (file: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      next.has(file) ? next.delete(file) : next.add(file);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 이슈 상세 모달 */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedIssue(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(selectedIssue.severity)}`}>
                {getSeverityIcon(selectedIssue.severity)}
                {selectedIssue.severity}
              </span>
              <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{selectedIssue.message}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <FileCode className="w-4 h-4" />
                {selectedIssue.filePath}:{selectedIssue.lineNumber}
              </span>
              <button onClick={() => copyToClipboard(`${selectedIssue.filePath}:${selectedIssue.lineNumber}`)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="경로 복사">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
              <span className="text-xs text-gray-500">카테고리</span>
              <p className="font-medium text-gray-900 dark:text-white">{selectedIssue.category}</p>
            </div>
            {selectedIssue.suggestion && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-xs text-blue-500">💡 제안</span>
                <p className="text-blue-700 dark:text-blue-300">{selectedIssue.suggestion}</p>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Link href={`/dashboard/projects/${projectId}/code-elements`} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                <ExternalLink className="w-4 h-4" />
                코드 요소에서 보기
              </Link>
            </div>
          </div>
        </div>
      )}

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
            리포트
          </a>
        </div>
      </header>

      {/* 통계 카드 - 클릭 필터 */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { key: '', label: '전체', count: stats.total, color: 'gray', Icon: Layers },
            { key: 'CRITICAL', label: 'Critical', count: stats.critical, color: 'red', Icon: AlertCircle },
            { key: 'HIGH', label: 'High', count: stats.high, color: 'orange', Icon: AlertTriangle },
            { key: 'MEDIUM', label: 'Medium', count: stats.medium, color: 'yellow', Icon: Info },
            { key: 'LOW', label: 'Low', count: stats.low, color: 'blue', Icon: CheckCircle },
            { key: 'INFO', label: 'Info', count: stats.info, color: 'gray', Icon: Info }
          ].map(({ key, label, count, color, Icon }) => (
            <button
              key={label}
              onClick={() => setSeverityFilter(key)}
              className={`bg-white dark:bg-gray-800 rounded-xl p-3 border-2 transition hover:scale-105 ${
                severityFilter === key ? `border-${color}-500 ring-2 ring-${color}-200` : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className={`flex items-center gap-1.5 text-${color}-500 text-xs mb-1`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <div className={`text-xl font-bold text-${color}-600`}>{count}</div>
            </button>
          ))}
        </div>
      )}

      {/* 카테고리별 차트 */}
      {categoryStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">카테고리별 이슈</h3>
          <div className="space-y-2">
            {categoryStats.slice(0, 8).map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  categoryFilter === cat ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{cat}</span>
                    <span className="text-sm text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(count / issues.length) * 100}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 필터 바 */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
          />
        </div>

        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
          >
            <List className="w-4 h-4" />
            목록
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${viewMode === 'grouped' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
          >
            <FolderOpen className="w-4 h-4" />
            파일별
          </button>
        </div>

        {(severityFilter || categoryFilter) && (
          <button
            onClick={() => { setSeverityFilter(''); setCategoryFilter(''); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm"
          >
            <X className="w-4 h-4" />
            필터 초기화
          </button>
        )}
      </div>

      {/* 이슈 목록 - 목록 뷰 */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              발견된 이슈 ({filteredIssues.length})
            </h2>
          </div>
          {filteredIssues.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {filteredIssues.map(issue => (
                <div 
                  key={issue.id} 
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => setSelectedIssue(issue)}
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                      {getSeverityIcon(issue.severity)}
                      {issue.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">{issue.message}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1 truncate">
                          <FileCode className="w-3 h-3" />
                          {issue.filePath}:{issue.lineNumber}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {issue.category}
                        </span>
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">이슈가 없습니다!</p>
            </div>
          )}
        </div>
      )}

      {/* 이슈 목록 - 파일별 그룹 뷰 */}
      {viewMode === 'grouped' && (
        <div className="space-y-3">
          {groupedByFile.map(([filePath, fileIssues]) => (
            <div key={filePath} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleFileExpand(filePath)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  {expandedFiles.has(filePath) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <FileCode className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{filePath}</span>
                </div>
                <div className="flex items-center gap-2">
                  {fileIssues.filter(i => i.severity === 'CRITICAL').length > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-xs">
                      {fileIssues.filter(i => i.severity === 'CRITICAL').length} Critical
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                    {fileIssues.length}건
                  </span>
                </div>
              </button>
              {expandedFiles.has(filePath) && (
                <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                  {fileIssues.map(issue => (
                    <div 
                      key={issue.id} 
                      className="p-3 pl-12 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSelectedIssue(issue)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <span className="text-sm text-gray-500">L{issue.lineNumber}</span>
                        <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">{issue.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {groupedByFile.length === 0 && (
            <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">이슈가 없습니다!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
