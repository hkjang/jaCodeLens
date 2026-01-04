'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BarChart3, AlertCircle, AlertTriangle, Info, CheckCircle,
  RefreshCw, Download, Search, FileCode, Layers, FolderOpen, List,
  ChevronDown, ChevronRight, X, ExternalLink, Copy, Eye, ArrowUpDown, Keyboard,
  ChevronUp, ArrowUp
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

// API 응답 타입
interface ApiIssue {
  id: string;
  severity: string;
  mainCategory: string;
  subCategory?: string;
  message: string;
  filePath: string;
  lineStart: number;
  lineEnd?: number;
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [severityFilter, setSeverityFilter] = useState(initialSeverity);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  
  // 페이지네이션 상태
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const PAGE_SIZE = 50;
  
  // 정렬 상태
  const [sortBy, setSortBy] = useState<'severity' | 'date' | 'file'>('severity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // 스크롤 및 키보드 상태
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    loadData();
  }, [projectId]);

  // 무한 스크롤 - IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasMore, loadingMore]);

  // 스크롤 감지 - 맨 위로 버튼 표시
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      
      switch (e.key) {
        case 'j': // 다음 이슈
          setSelectedIndex(prev => Math.min(prev + 1, filteredIssues.length - 1));
          break;
        case 'k': // 이전 이슈
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter': // 선택된 이슈 열기
          if (selectedIndex >= 0 && issues[selectedIndex]) {
            setSelectedIssue(issues[selectedIndex]);
          }
          break;
        case 'Escape': // 선택 해제
          setSelectedIssue(null);
          setSelectedIndex(-1);
          break;
        case 'r': // 새로고침
          if (!e.ctrlKey && !e.metaKey) loadData();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [issues, selectedIndex]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  async function loadData() {
    setLoading(true);
    setCurrentOffset(0);
    try {
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }

      const issuesRes = await fetch(`/api/analysis/issues?projectId=${projectId}&limit=${PAGE_SIZE}&offset=0`);
      if (issuesRes.ok) {
        const data = await issuesRes.json();
        // API 필드를 UI 필드로 매핑
        const mappedIssues = (data.issues || []).map((item: ApiIssue) => ({
          id: item.id,
          severity: item.severity,
          category: item.mainCategory,  // mainCategory -> category
          message: item.message,
          filePath: item.filePath,
          lineNumber: item.lineStart,   // lineStart -> lineNumber
          suggestion: item.suggestion,
          createdAt: item.createdAt
        }));
        setIssues(mappedIssues);
        setTotalCount(data.pagination?.total || 0);
        setHasMore(data.pagination?.hasMore || false);
        setCurrentOffset(PAGE_SIZE);
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

  // 더 보기 기능
  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const issuesRes = await fetch(`/api/analysis/issues?projectId=${projectId}&limit=${PAGE_SIZE}&offset=${currentOffset}`);
      if (issuesRes.ok) {
        const data = await issuesRes.json();
        const mappedIssues = (data.issues || []).map((item: ApiIssue) => ({
          id: item.id,
          severity: item.severity,
          category: item.mainCategory,
          message: item.message,
          filePath: item.filePath,
          lineNumber: item.lineStart,
          suggestion: item.suggestion,
          createdAt: item.createdAt
        }));
        setIssues(prev => [...prev, ...mappedIssues]);
        setHasMore(data.pagination?.hasMore || false);
        setCurrentOffset(prev => prev + PAGE_SIZE);
      }
    } catch (e) {
      console.error('Failed to load more', e);
    } finally {
      setLoadingMore(false);
    }
  }

  // CSV 내보내기 기능
  function exportToCSV() {
    if (filteredIssues.length === 0) return;
    
    const headers = ['심각도', '카테고리', '메시지', '파일 경로', '라인', '제안'];
    const rows = filteredIssues.map(issue => [
      issue.severity,
      issue.category,
      issue.message.replace(/"/g, '""'),
      issue.filePath,
      issue.lineNumber,
      issue.suggestion?.replace(/"/g, '""') || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // BOM for Korean support in Excel
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project?.name || 'issues'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      {/* 이슈 상세 모달 - 개선된 버전 */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedIssue(null)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-slideUp" 
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 - 심각도 배너 */}
            <div className={`px-6 py-4 ${
              selectedIssue.severity === 'CRITICAL' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
              selectedIssue.severity === 'HIGH' ? 'bg-gradient-to-r from-orange-500 to-amber-600' :
              selectedIssue.severity === 'MEDIUM' ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
              'bg-gradient-to-r from-blue-500 to-indigo-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getSeverityIcon(selectedIssue.severity)}
                  <span className="font-bold text-lg">{selectedIssue.severity}</span>
                  <span className="px-2 py-0.5 bg-white/20 rounded text-sm">{selectedIssue.category}</span>
                </div>
                <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-white/10 rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* 본문 */}
            <div className="p-6 space-y-4">
              {/* 메시지 */}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed">
                {selectedIssue.message}
              </h3>
              
              {/* 파일 경로 */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <FileCode className="w-5 h-5 text-gray-400" />
                <code className="flex-1 text-sm font-mono text-gray-700 dark:text-gray-300">
                  {selectedIssue.filePath}:{selectedIssue.lineNumber}
                </code>
                <button 
                  onClick={() => {
                    copyToClipboard(`${selectedIssue.filePath}:${selectedIssue.lineNumber}`);
                    // 간단한 토스트 효과
                    const btn = document.activeElement as HTMLButtonElement;
                    btn.classList.add('text-green-500');
                    setTimeout(() => btn.classList.remove('text-green-500'), 1000);
                  }} 
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition" 
                  title="경로 복사"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              
              {/* 제안 */}
              {selectedIssue.suggestion && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">💡</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">수정 제안</span>
                  </div>
                  <p className="text-blue-800 dark:text-blue-200 leading-relaxed">{selectedIssue.suggestion}</p>
                </div>
              )}
              
              {/* 메타 정보 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-gray-500">발견 일시</span>
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    {new Date(selectedIssue.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-gray-500">이슈 ID</span>
                  <p className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {selectedIssue.id}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 액션 버튼 */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Keyboard className="w-4 h-4" />
                <span>ESC로 닫기</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => copyToClipboard(selectedIssue.message)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  <Copy className="w-4 h-4" />
                  메시지 복사
                </button>
                <Link 
                  href={`/dashboard/projects/${projectId}/code-elements?file=${encodeURIComponent(selectedIssue.filePath)}`} 
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  코드 보기
                </Link>
              </div>
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
          <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="새로고침">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={exportToCSV}
            disabled={filteredIssues.length === 0}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            title="현재 로드된 이슈를 CSV로 내보내기"
          >
            <Download className="w-4 h-4" />
            CSV
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

      {/* 로드 진행률 프로그레스 바 */}
      {totalCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              로드 진행률: {issues.length.toLocaleString()} / {totalCount.toLocaleString()}개
            </span>
            <span className="text-sm text-gray-500">
              {((issues.length / totalCount) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${(issues.length / totalCount) * 100}%` }}
            />
          </div>
          {hasMore && (
            <p className="text-xs text-gray-500 mt-2">
              💡 &quot;더 보기&quot; 버튼을 클릭하거나 스크롤을 내려 더 많은 이슈를 로드할 수 있습니다.
            </p>
          )}
        </div>
      )}

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

        {/* 정렬 드롭다운 */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'severity' | 'date' | 'file')}
            className="px-2 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="severity">심각도순</option>
            <option value="date">날짜순</option>
            <option value="file">파일순</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
          >
            {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
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

        {/* 키보드 단축키 힌트 */}
        <button
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          title="단축키: J(다음) K(이전) Enter(열기) Esc(닫기) R(새로고침)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

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
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              발견된 이슈 
              <span className="text-sm font-normal text-gray-500">
                ({filteredIssues.length.toLocaleString()} / {totalCount.toLocaleString()}개)
              </span>
            </h2>
            {totalCount > 0 && (
              <span className="text-xs text-gray-500">
                {((filteredIssues.length / totalCount) * 100).toFixed(1)}% 로드됨
              </span>
            )}
          </div>
          {filteredIssues.length > 0 ? (
            <div ref={listRef} className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {filteredIssues.map((issue, index) => (
                <div 
                  key={issue.id} 
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all ${
                    selectedIndex === index ? 'ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => {
                    setSelectedIssue(issue);
                    setSelectedIndex(index);
                  }}
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
          
          {/* 더 보기 버튼 */}
          {hasMore && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    로딩 중...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    더 보기 ({(totalCount - issues.length).toLocaleString()}개 남음)
                  </>
                )}
              </button>
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

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-10" />

      {/* 맨 위로 스크롤 버튼 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all animate-bounce z-50"
          title="맨 위로"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
