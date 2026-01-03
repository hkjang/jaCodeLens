'use client';

/**
 * 프로젝트 코드 요소 분석기 (Ultimate Version)
 * 
 * 기능:
 * - 코드 요소 목록/트리/복잡도 뷰
 * - 스캔 및 AI 분석 (배치/단일)
 * - 복잡도 대시보드
 * - 유형 분포 차트
 * - 코드 미리보기
 * - 내보내기 (CSV/JSON)
 * - 키보드 단축키
 * - 일괄 분석 진행 표시기
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Code2, RefreshCw, Search, Filter, ChevronDown,
  FileCode, CheckCircle, AlertCircle, Loader2, Play, Zap,
  BarChart3, Layers, Eye, Sparkles, ChevronRight, Folder,
  AlertTriangle, TrendingUp, GitBranch, Clock, FolderTree,
  PieChart, Activity, Star, StarOff, Copy, ExternalLink,
  Download, ChevronUp, SortAsc, SortDesc, Keyboard, FileJson,
  Table, X, Maximize2, Minimize2, FileText
} from 'lucide-react';
import DependencyGraph from '@/components/code-elements/DependencyGraph';

interface CodeElement {
  id: string;
  filePath: string;
  fileName: string;
  language: string;
  elementType: string;
  name: string;
  signature?: string;
  lineStart: number;
  lineEnd: number;
  content?: string;
  parentName?: string;
  isAsync: boolean;
  isExported: boolean;
  aiSummary?: string;
  aiAnalysis?: any;
  analyzedAt?: string;
}

interface Stats {
  total: number;
  analyzed: number;
  pending: number;
  byType: Record<string, number>;
}

export default function ProjectCodeElementsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<{ id: string; name: string; path: string } | null>(null);
  const [elements, setElements] = useState<CodeElement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });
  const [scanError, setScanError] = useState<string | null>(null);

  // 필터/검색
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [analyzedFilter, setAnalyzedFilter] = useState('');
  const [complexityFilter, setComplexityFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lines' | 'complexity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 뷰 모드
  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'complexity' | 'graph' | 'favorites'>('list');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [codePreviewFullscreen, setCodePreviewFullscreen] = useState(false);

  // 비교 모드
  const [compareMode, setCompareMode] = useState(false);
  const [compareElements, setCompareElements] = useState<CodeElement[]>([]);

  // 검색 기록
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`search-history-${projectId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // 필터 프리셋
  const [filterPresets, setFilterPresets] = useState<Array<{name: string; filters: any}>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`filter-presets-${projectId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // 페이지네이션
  const [displayLimit, setDisplayLimit] = useState(50);
  const [showAllElements, setShowAllElements] = useState(false);

  // 선택된 요소
  const [selectedElement, setSelectedElement] = useState<CodeElement | null>(null);

  // 즐겨찾기 (localStorage 연동)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`favorites-${projectId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      localStorage.setItem(`favorites-${projectId}`, JSON.stringify([...favorites]));
    }
  }, [favorites, projectId]);

  // 단축키 모달
  const [showShortcuts, setShowShortcuts] = useState(false);

  // 관련 이슈
  const [elementIssues, setElementIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // 선택된 요소 변경 시 이슈 로드
  useEffect(() => {
    if (selectedElement) {
      loadElementIssues(selectedElement.id);
    } else {
      setElementIssues([]);
    }
  }, [selectedElement?.id]);

  async function loadElementIssues(elementId: string) {
    setLoadingIssues(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/code-elements/${elementId}/issues`);
      if (res.ok) {
        const data = await res.json();
        setElementIssues(data.issues || []);
      }
    } catch (e) {
      console.error('Failed to load issues', e);
    } finally {
      setLoadingIssues(false);
    }
  }

  // 키보드 단축키
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd + shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (!scanning) handleScan();
            break;
          case 'a':
            e.preventDefault();
            if (!analyzing && stats?.pending) handleAnalyze();
            break;
          case 'e':
            e.preventDefault();
            exportToJSON();
            break;
          case 'f':
            e.preventDefault();
            document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
            break;
          case '/':
            e.preventDefault();
            setShowShortcuts(true);
            break;
        }
      }
      // ESC: 모달 닫기
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setCodePreviewFullscreen(false);
      }
      // 1, 2, 3, 4: 뷰 모드 전환
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === '1') setViewMode('list');
        if (e.key === '2') setViewMode('tree');
        if (e.key === '3') setViewMode('complexity');
        if (e.key === '4') setViewMode('graph');
        // 화살표: 요소 탐색
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const idx = filteredElements.findIndex(el => el.id === selectedElement?.id);
          const nextIdx = e.key === 'ArrowDown' 
            ? Math.min(idx + 1, filteredElements.length - 1)
            : Math.max(idx - 1, 0);
          if (filteredElements[nextIdx]) {
            setSelectedElement(filteredElements[nextIdx]);
          }
        }
        // R: 필터 초기화
        if (e.key === 'r' && document.activeElement === document.body) {
          setTypeFilter('');
          setAnalyzedFilter('');
          setComplexityFilter('');
          setSearchQuery('');
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanning, analyzing, stats]);

  useEffect(() => {
    loadData();
  }, [projectId, typeFilter, analyzedFilter]);

  async function loadData() {
    setLoading(true);
    setScanError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('elementType', typeFilter);
      if (analyzedFilter) params.set('analyzed', analyzedFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/projects/${projectId}/code-elements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setElements(data.elements || []);
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/code-elements/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        await loadData();
      } else {
        setScanError(data.error || '스캔 실패');
      }
    } catch (e: any) {
      setScanError(e.message || '스캔 실패');
    } finally {
      setScanning(false);
    }
  }

  async function handleAnalyze(analyzeAll = false) {
    if (!stats?.pending) return;
    
    const totalToAnalyze = analyzeAll ? stats.pending : Math.min(stats.pending, 20);
    const batchSize = 10;
    
    setAnalyzing(true);
    setAnalyzeProgress({ current: 0, total: totalToAnalyze });
    
    try {
      // 연속 배치 분석 (전체 또는 20개)
      let analyzed = 0;
      while (analyzed < totalToAnalyze) {
        const res = await fetch(`/api/projects/${projectId}/code-elements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'analyze-batch', limit: batchSize })
        });
        if (res.ok) {
          const result = await res.json();
          const count = result.analyzed || 0;
          if (count === 0) break; // 더 이상 분석할 요소 없음
          analyzed += count;
          setAnalyzeProgress(prev => ({ 
            ...prev, 
            current: Math.min(prev.current + count, totalToAnalyze)
          }));
        } else {
          break;
        }
        await loadData();
      }
    } catch (e) {
      console.error('Analysis failed', e);
    } finally {
      setAnalyzing(false);
      setAnalyzeProgress({ current: 0, total: 0 });
    }
  }

  async function analyzeElement(elementId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/code-elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-single', elementId })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error('Analysis failed', e);
    }
  }

  function toggleFavorite(id: string) {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // 검색 기록 추가
  function addSearchHistory(query: string) {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      localStorage.setItem(`search-history-${projectId}`, JSON.stringify(updated));
      return updated;
    });
  }

  // 비교 모드 토글
  function toggleCompareElement(el: CodeElement) {
    setCompareElements(prev => {
      if (prev.find(e => e.id === el.id)) {
        return prev.filter(e => e.id !== el.id);
      }
      if (prev.length >= 2) {
        return [prev[1], el];
      }
      return [...prev, el];
    });
  }

  // 필터 프리셋 저장
  function saveFilterPreset(name: string) {
    const preset = {
      name,
      filters: { typeFilter, analyzedFilter, complexityFilter, searchQuery, sortBy, sortOrder }
    };
    setFilterPresets(prev => {
      const updated = [...prev.filter(p => p.name !== name), preset];
      localStorage.setItem(`filter-presets-${projectId}`, JSON.stringify(updated));
      return updated;
    });
  }

  // 필터 프리셋 로드
  function loadFilterPreset(preset: any) {
    setTypeFilter(preset.filters.typeFilter || '');
    setAnalyzedFilter(preset.filters.analyzedFilter || '');
    setComplexityFilter(preset.filters.complexityFilter || '');
    setSearchQuery(preset.filters.searchQuery || '');
    setSortBy(preset.filters.sortBy || 'name');
    setSortOrder(preset.filters.sortOrder || 'asc');
  }

  // 필터 프리셋 삭제
  function deleteFilterPreset(name: string) {
    setFilterPresets(prev => {
      const updated = prev.filter(p => p.name !== name);
      localStorage.setItem(`filter-presets-${projectId}`, JSON.stringify(updated));
      return updated;
    });
  }

  // 내보내기 함수
  function exportToCSV() {
    const headers = ['이름', '유형', '파일', '줄 시작', '줄 끝', '복잡도', 'AI 요약'];
    const rows = filteredElements.map(el => [
      el.name,
      el.elementType,
      el.filePath,
      el.lineStart,
      el.lineEnd,
      getComplexity(el),
      el.aiSummary || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadFile(csv, 'code-elements.csv', 'text/csv');
  }

  function exportToJSON() {
    const data = filteredElements.map(el => ({
      name: el.name,
      type: el.elementType,
      file: el.filePath,
      lineStart: el.lineStart,
      lineEnd: el.lineEnd,
      complexity: getComplexity(el),
      aiSummary: el.aiSummary,
      aiAnalysis: el.aiAnalysis
    }));
    downloadFile(JSON.stringify(data, null, 2), 'code-elements.json', 'application/json');
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      CLASS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      FUNCTION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      METHOD: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      COMPONENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      INTERFACE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      TYPE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      VARIABLE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  }

  function getComplexity(el: CodeElement): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (el.aiAnalysis?.complexity) return el.aiAnalysis.complexity;
    const lines = el.lineEnd - el.lineStart;
    if (lines > 100) return 'HIGH';
    if (lines > 30) return 'MEDIUM';
    return 'LOW';
  }

  // 간단한 구문 하이라이팅
  function highlightSyntax(code: string, language: string): React.ReactNode[] {
    const keywords = ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'export', 'import', 'from', 'default', 'extends', 'implements'];
    const patterns: Array<{ regex: RegExp; className: string }> = [
      { regex: /\/\/.*$/gm, className: 'text-gray-500 italic' }, // 주석
      { regex: /"[^"]*"|'[^']*'|`[^`]*`/g, className: 'text-green-400' }, // 문자열
      { regex: /\b(\d+)\b/g, className: 'text-orange-400' }, // 숫자
      { regex: new RegExp(`\\b(${keywords.join('|')})\\b`, 'g'), className: 'text-purple-400 font-medium' }, // 키워드
      { regex: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: 'text-yellow-300' }, // 타입/클래스명
    ];

    let result = code;
    patterns.forEach(({ regex, className }) => {
      result = result.replace(regex, `<span class="${className}">$&</span>`);
    });
    return [<span key="code" dangerouslySetInnerHTML={{ __html: result }} />];
  }

  // 검색어 하이라이팅
  function highlightSearch(text: string): React.ReactNode {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/50 px-0.5 rounded">{part}</mark>
        : part
    );
  }

  // 필터링 및 정렬
  const filteredElements = useMemo(() => {
    let result = elements.filter(e =>
      (!searchQuery ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.filePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.aiSummary?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!complexityFilter || getComplexity(e) === complexityFilter)
    );

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'lines') cmp = (b.lineEnd - b.lineStart) - (a.lineEnd - a.lineStart);
      else if (sortBy === 'complexity') {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        cmp = order[getComplexity(a)] - order[getComplexity(b)];
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [elements, searchQuery, complexityFilter, sortBy, sortOrder]);

  // 파일별 트리 구조
  const fileTree = useMemo(() => {
    const tree: Record<string, CodeElement[]> = {};
    filteredElements.forEach(el => {
      const dir = el.filePath.split('/').slice(0, -1).join('/') || '.';
      if (!tree[dir]) tree[dir] = [];
      tree[dir].push(el);
    });
    return Object.entries(tree).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredElements]);

  // 통계
  const complexityStats = useMemo(() => {
    const analyzed = elements.filter(e => e.analyzedAt);
    return {
      high: analyzed.filter(e => getComplexity(e) === 'HIGH').length,
      medium: analyzed.filter(e => getComplexity(e) === 'MEDIUM').length,
      low: analyzed.filter(e => getComplexity(e) === 'LOW').length,
    };
  }, [elements]);

  // 유형 분포 (도넛 차트용)
  const typeDistribution = useMemo(() => {
    if (!stats) return [];
    const types = ['CLASS', 'FUNCTION', 'METHOD', 'COMPONENT', 'INTERFACE'];
    const colors = ['#a855f7', '#3b82f6', '#06b6d4', '#22c55e', '#eab308'];
    return types.map((type, i) => ({
      type,
      count: stats.byType[type] || 0,
      color: colors[i],
      percentage: stats.total > 0 ? ((stats.byType[type] || 0) / stats.total * 100).toFixed(1) : 0
    })).filter(t => t.count > 0);
  }, [stats]);

  if (loading && elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 키보드 단축키 모달 */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                키보드 단축키
              </h3>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Ctrl + S', '프로젝트 스캔'],
                ['Ctrl + A', 'AI 분석 실행'],
                ['Ctrl + E', 'JSON 내보내기'],
                ['Ctrl + F', '검색 포커스'],
                ['Ctrl + /', '단축키 보기'],
                ['1/2/3/4', '뷰 모드 전환'],
                ['↑/↓', '요소 탐색'],
                ['R', '필터 초기화'],
                ['ESC', '모달 닫기'],
              ].map(([key, desc]) => (
                <div key={key} className="flex justify-between py-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">{key}</kbd>
                  <span className="text-gray-600 dark:text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <Link 
            href={`/dashboard/projects/${projectId}`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {project?.name || '프로젝트'}로 돌아가기
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Code2 className="w-8 h-8 text-blue-500" />
            코드 요소 분석기
          </h2>
          <p className="text-gray-500 flex items-center gap-2">
            프로젝트의 코드 요소를 추출하고 AI로 분석합니다
            <button onClick={() => setShowShortcuts(true)} className="text-blue-500 hover:text-blue-600">
              <Keyboard className="w-4 h-4" />
            </button>
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 내보내기 드롭다운 */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Download className="w-4 h-4" />
              내보내기
            </button>
            <div className="absolute right-0 mt-1 py-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                <Table className="w-4 h-4" /> CSV
              </button>
              <button onClick={exportToJSON} className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                <FileJson className="w-4 h-4" /> JSON
              </button>
              <a 
                href={`/api/projects/${projectId}/report?format=html`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                <FileText className="w-4 h-4" /> HTML 리포트
              </a>
            </div>
          </div>

          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            스캔
          </button>
          
          <div className="relative group">
            <button
              onClick={() => handleAnalyze(false)}
              disabled={analyzing || !stats?.pending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-l-lg disabled:opacity-50 shadow-lg relative overflow-hidden"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI 분석 ({stats?.pending || 0}개)
              {analyzing && analyzeProgress.total > 0 && (
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-white/50 transition-all"
                  style={{ width: `${(analyzeProgress.current / analyzeProgress.total) * 100}%` }}
                />
              )}
            </button>
            <button
              onClick={() => handleAnalyze(true)}
              disabled={analyzing || !stats?.pending}
              className="px-2 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-r-lg disabled:opacity-50 border-l border-purple-500"
              title="전체 분석"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 w-48">
              <button
                onClick={() => handleAnalyze(false)}
                disabled={analyzing}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-yellow-500" />
                빠른 분석 (20개)
              </button>
              <button
                onClick={() => handleAnalyze(true)}
                disabled={analyzing}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                전체 분석 ({stats?.pending || 0}개)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 분석 진행 표시기 */}
      {analyzing && analyzeProgress.total > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI 분석 진행 중...
            </span>
            <span className="text-blue-600 dark:text-blue-400 text-sm">
              {analyzeProgress.current} / {analyzeProgress.total}
            </span>
          </div>
          <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${(analyzeProgress.current / analyzeProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 스캔 오류 */}
      {scanError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-red-700 dark:text-red-300 font-medium">{scanError}</p>
            <p className="text-sm text-red-600 dark:text-red-400">프로젝트 설정에서 로컬 경로를 확인해주세요</p>
          </div>
        </div>
      )}

      {/* 통계 및 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 통계 카드 */}
        {stats && (
          <div className="lg:col-span-2 grid grid-cols-4 md:grid-cols-8 gap-2">
            <StatCard label="전체" count={stats.total} color="bg-gray-500" icon={<Layers className="w-4 h-4" />} onClick={() => { setTypeFilter(''); setAnalyzedFilter(''); }} />
            <StatCard label="분석 완료" count={stats.analyzed} color="bg-green-500" icon={<CheckCircle className="w-4 h-4" />} onClick={() => setAnalyzedFilter('true')} />
            <StatCard label="대기 중" count={stats.pending} color="bg-yellow-500" icon={<Clock className="w-4 h-4" />} onClick={() => setAnalyzedFilter('false')} />
            <StatCard label="클래스" count={stats.byType.CLASS || 0} color="bg-purple-500" onClick={() => setTypeFilter('CLASS')} />
            <StatCard label="함수" count={stats.byType.FUNCTION || 0} color="bg-blue-500" onClick={() => setTypeFilter('FUNCTION')} />
            <StatCard label="컴포넌트" count={stats.byType.COMPONENT || 0} color="bg-green-500" onClick={() => setTypeFilter('COMPONENT')} />
            <StatCard label="메서드" count={stats.byType.METHOD || 0} color="bg-cyan-500" onClick={() => setTypeFilter('METHOD')} />
            <StatCard label="인터페이스" count={stats.byType.INTERFACE || 0} color="bg-yellow-500" onClick={() => setTypeFilter('INTERFACE')} />
          </div>
        )}

        {/* 유형 분포 차트 */}
        {typeDistribution.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              유형 분포
            </h4>
            <div className="flex items-center gap-3">
              {/* 간단한 바 차트 */}
              <div className="flex-1 space-y-1">
                {typeDistribution.map(t => (
                  <div 
                    key={t.type} 
                    onClick={() => setTypeFilter(t.type)}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded p-1 -m-1 transition-colors"
                  >
                    <span className="w-16 text-gray-500 font-medium">{t.type}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all hover:opacity-80" style={{ width: `${t.percentage}%`, backgroundColor: t.color }} />
                    </div>
                    <span className="w-8 text-right text-gray-500">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 복잡도 대시보드 */}
      {complexityStats.high + complexityStats.medium + complexityStats.low > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            복잡도 분포
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex shadow-inner">
              {complexityStats.high > 0 && (
                <div 
                  onClick={() => setComplexityFilter('HIGH')}
                  className="bg-gradient-to-r from-red-500 to-red-400 h-full flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:brightness-110 transition-all" 
                  style={{ width: `${(complexityStats.high / (complexityStats.high + complexityStats.medium + complexityStats.low)) * 100}%` }}
                >
                  {complexityStats.high > 2 && complexityStats.high}
                </div>
              )}
              {complexityStats.medium > 0 && (
                <div 
                  onClick={() => setComplexityFilter('MEDIUM')}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-full flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:brightness-110 transition-all" 
                  style={{ width: `${(complexityStats.medium / (complexityStats.high + complexityStats.medium + complexityStats.low)) * 100}%` }}
                >
                  {complexityStats.medium > 2 && complexityStats.medium}
                </div>
              )}
              {complexityStats.low > 0 && (
                <div 
                  onClick={() => setComplexityFilter('LOW')}
                  className="bg-gradient-to-r from-green-500 to-green-400 h-full flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:brightness-110 transition-all" 
                  style={{ width: `${(complexityStats.low / (complexityStats.high + complexityStats.medium + complexityStats.low)) * 100}%` }}
                >
                  {complexityStats.low > 2 && complexityStats.low}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded" />
                HIGH: {complexityStats.high}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-500 rounded" />
                MEDIUM: {complexityStats.medium}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded" />
                LOW: {complexityStats.low}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 필터/검색 바 */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex-wrap">
        {/* 뷰 모드 토글 */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {[
            { mode: 'list' as const, label: '목록', key: '1' },
            { mode: 'tree' as const, label: '트리', key: '2' },
            { mode: 'complexity' as const, label: '복잡도', key: '3' },
            { mode: 'graph' as const, label: '그래프', key: '4' },
            { mode: 'favorites' as const, label: `⭐ ${favorites.size}`, key: '5' },
          ].map(({ mode, label, key }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${viewMode === mode ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
              title={`${label} (${key})`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 비교 모드 토글 */}
        <button
          onClick={() => { setCompareMode(!compareMode); if (compareMode) setCompareElements([]); }}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${compareMode ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          <GitBranch className="w-4 h-4" />
          비교 {compareMode && compareElements.length > 0 && `(${compareElements.length}/2)`}
        </button>

        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="검색... (Ctrl+F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          />
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
          <option value="">모든 유형</option>
          <option value="CLASS">클래스</option>
          <option value="FUNCTION">함수</option>
          <option value="METHOD">메서드</option>
          <option value="COMPONENT">컴포넌트</option>
          <option value="INTERFACE">인터페이스</option>
        </select>

        <select value={complexityFilter} onChange={(e) => setComplexityFilter(e.target.value)} className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
          <option value="">모든 복잡도</option>
          <option value="HIGH">🔴 HIGH</option>
          <option value="MEDIUM">🟡 MEDIUM</option>
          <option value="LOW">🟢 LOW</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
          <option value="name">이름순</option>
          <option value="lines">크기순</option>
          <option value="complexity">복잡도순</option>
        </select>

        <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
        </button>

        {/* 코드 미리보기 토글 */}
        <button 
          onClick={() => setShowCodePreview(!showCodePreview)}
          className={`p-2.5 rounded-lg ${showCodePreview ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          title="코드 미리보기 토글"
        >
          <Eye className="w-5 h-5" />
        </button>

        <button onClick={loadData} className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* 활성 필터 배지 */}
        {(typeFilter || analyzedFilter || complexityFilter || searchQuery) && (
          <div className="flex items-center gap-2 ml-2">
            {typeFilter && (
              <span 
                onClick={() => setTypeFilter('')}
                className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs rounded-full cursor-pointer hover:bg-purple-200 flex items-center gap-1"
              >
                {typeFilter} <X className="w-3 h-3" />
              </span>
            )}
            {analyzedFilter && (
              <span 
                onClick={() => setAnalyzedFilter('')}
                className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs rounded-full cursor-pointer hover:bg-blue-200 flex items-center gap-1"
              >
                {analyzedFilter === 'true' ? '분석완료' : '대기중'} <X className="w-3 h-3" />
              </span>
            )}
            {complexityFilter && (
              <span 
                onClick={() => setComplexityFilter('')}
                className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs rounded-full cursor-pointer hover:bg-orange-200 flex items-center gap-1"
              >
                {complexityFilter} <X className="w-3 h-3" />
              </span>
            )}
            <button 
              onClick={() => { setTypeFilter(''); setAnalyzedFilter(''); setComplexityFilter(''); setSearchQuery(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              모두 초기화
            </button>
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div className={`grid gap-6 ${showCodePreview ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {/* 요소 목록 */}
        <div className={`${showCodePreview ? 'lg:col-span-2' : 'lg:col-span-2'} bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden`}>
          {viewMode === 'tree' ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {fileTree.map(([dir, items]) => (
                <div key={dir}>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 sticky top-0">
                    <Folder className="w-4 h-4" />
                    {dir}
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </div>
                  {items.map(el => (
                    <ElementRow key={el.id} el={el} selected={selectedElement?.id === el.id} onSelect={() => setSelectedElement(el)} onAnalyze={() => analyzeElement(el.id)} isFavorite={favorites.has(el.id)} onToggleFavorite={() => toggleFavorite(el.id)} getTypeColor={getTypeColor} getComplexity={getComplexity} />
                  ))}
                </div>
              ))}
            </div>
          ) : viewMode === 'complexity' ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {(['HIGH', 'MEDIUM', 'LOW'] as const).map(complexity => {
                const items = filteredElements.filter(e => getComplexity(e) === complexity);
                if (items.length === 0) return null;
                return (
                  <div key={complexity}>
                    <div className={`px-4 py-2 flex items-center gap-2 text-sm font-medium sticky top-0 ${complexity === 'HIGH' ? 'bg-red-50 dark:bg-red-900/20 text-red-700' : complexity === 'MEDIUM' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700' : 'bg-green-50 dark:bg-green-900/20 text-green-700'}`}>
                      <AlertTriangle className="w-4 h-4" />
                      {complexity} ({items.length})
                    </div>
                    {items.map(el => (
                      <ElementRow key={el.id} el={el} selected={selectedElement?.id === el.id} onSelect={() => setSelectedElement(el)} onAnalyze={() => analyzeElement(el.id)} isFavorite={favorites.has(el.id)} onToggleFavorite={() => toggleFavorite(el.id)} getTypeColor={getTypeColor} getComplexity={getComplexity} />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'graph' ? (
            <DependencyGraph 
              elements={filteredElements} 
              onSelectElement={(el: any) => setSelectedElement(el as CodeElement)}
              selectedId={selectedElement?.id}
            />
          ) : viewMode === 'favorites' ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {favorites.size > 0 ? (
                elements.filter(el => favorites.has(el.id)).map(el => (
                  <ElementRow key={el.id} el={el} selected={selectedElement?.id === el.id} onSelect={() => setSelectedElement(el)} onAnalyze={() => analyzeElement(el.id)} isFavorite={true} onToggleFavorite={() => toggleFavorite(el.id)} getTypeColor={getTypeColor} getComplexity={getComplexity} />
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">즐겨찾기가 없습니다</p>
                  <p className="text-sm mt-2">요소 옆의 ⭐을 클릭하여 즐겨찾기에 추가하세요</p>
                </div>
              )}
            </div>
          ) : filteredElements.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {(showAllElements ? filteredElements : filteredElements.slice(0, displayLimit)).map(el => (
                <ElementRow key={el.id} el={el} selected={selectedElement?.id === el.id} onSelect={() => compareMode ? toggleCompareElement(el) : setSelectedElement(el)} onAnalyze={() => analyzeElement(el.id)} isFavorite={favorites.has(el.id)} onToggleFavorite={() => toggleFavorite(el.id)} getTypeColor={getTypeColor} getComplexity={getComplexity} />
              ))}
              {!showAllElements && filteredElements.length > displayLimit && (
                <div className="p-4 text-center">
                  <button 
                    onClick={() => setShowAllElements(true)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {filteredElements.length - displayLimit}개 더 보기
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">코드 요소가 없습니다</p>
              <p className="text-sm mt-2">스캔 버튼을 클릭하여 프로젝트를 스캔하세요</p>
            </div>
          )}
        </div>

        {/* 비교 패널 */}
        {compareMode && compareElements.length === 2 && (
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              코드 요소 비교
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {compareElements.map((el, i) => (
                <div key={el.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-900 p-2 flex items-center justify-between">
                    <span className="font-medium">{el.name}</span>
                    <button onClick={() => setCompareElements(prev => prev.filter(e => e.id !== el.id))} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="p-4 text-xs text-gray-300 bg-gray-900 max-h-64 overflow-auto font-mono">
                    {el.content || el.signature || `// ${el.elementType}: ${el.name}`}
                  </pre>
                  <div className="p-2 text-xs text-gray-500 space-y-1 bg-gray-50 dark:bg-gray-900">
                    <p>📍 {el.filePath} (L{el.lineStart}-{el.lineEnd})</p>
                    <p>📊 복잡도: {getComplexity(el)} | {el.lineEnd - el.lineStart}줄</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 코드 미리보기 패널 */}
        {showCodePreview && selectedElement && (
          <div className={`bg-gray-900 rounded-xl border border-gray-700 overflow-hidden ${codePreviewFullscreen ? 'fixed inset-4 z-50' : ''}`}>
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-sm text-gray-400 font-mono">{selectedElement.filePath}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => copyToClipboard(selectedElement.signature || selectedElement.name)} className="p-1 text-gray-400 hover:text-white">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => setCodePreviewFullscreen(!codePreviewFullscreen)} className="p-1 text-gray-400 hover:text-white">
                  {codePreviewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <pre className={`p-4 text-sm text-gray-300 font-mono overflow-auto ${codePreviewFullscreen ? 'h-[calc(100%-3rem)]' : 'max-h-[500px]'}`}>
              <code>
                {(selectedElement.content || selectedElement.signature || `// ${selectedElement.elementType}: ${selectedElement.name}`).split('\n').map((line, i) => (
                  <div key={i} className="flex hover:bg-gray-800/50">
                    <span className="select-none text-gray-600 text-right w-10 mr-4 flex-shrink-0 border-r border-gray-700 pr-2">{selectedElement.lineStart + i}</span>
                    <span className="flex-1">{highlightSyntax(line, selectedElement.language)}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        )}

        {/* 상세 패널 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sticky top-4 max-h-[700px] overflow-y-auto">
          {selectedElement ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-sm font-medium ${getTypeColor(selectedElement.elementType)}`}>
                  {selectedElement.elementType}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleFavorite(selectedElement.id)} className="p-1 text-gray-400 hover:text-yellow-500">
                    {favorites.has(selectedElement.id) ? <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
                  </button>
                  {!selectedElement.analyzedAt && (
                    <button onClick={() => analyzeElement(selectedElement.id)} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm rounded shadow">
                      <Sparkles className="w-4 h-4" />
                      AI 분석
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedElement.name}</h3>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getComplexity(selectedElement) === 'HIGH' ? 'bg-red-100 text-red-700' : getComplexity(selectedElement) === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  복잡도: {getComplexity(selectedElement)}
                </span>
                <span className="text-xs text-gray-500">{selectedElement.lineEnd - selectedElement.lineStart} 줄</span>
                {selectedElement.isAsync && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">async</span>}
                {selectedElement.isExported && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">export</span>}
              </div>

              <div className="text-sm text-gray-500 space-y-1">
                <p className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  <span className="truncate">{selectedElement.filePath}</span>
                </p>
                <p>줄: {selectedElement.lineStart} - {selectedElement.lineEnd}</p>
                {selectedElement.parentName && <p>부모: {selectedElement.parentName}</p>}
                {selectedElement.signature && (
                  <pre className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">{selectedElement.signature}</pre>
                )}
              </div>

              {selectedElement.aiSummary && (
                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    AI 분석 요약
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{selectedElement.aiSummary}</p>
                </div>
              )}

              {selectedElement.aiAnalysis && (
                <div className="space-y-3">
                  {selectedElement.aiAnalysis.purpose && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">🎯 목적</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedElement.aiAnalysis.purpose}</p>
                    </div>
                  )}
                  {selectedElement.aiAnalysis.issues?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">⚠️ 발견된 이슈</h4>
                      <div className="space-y-1">
                        {selectedElement.aiAnalysis.issues.map((issue: any, i: number) => (
                          <div key={i} className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            <span className={`text-xs font-medium ${issue.severity === 'HIGH' ? 'text-red-600' : issue.severity === 'MEDIUM' ? 'text-yellow-600' : 'text-blue-600'}`}>[{issue.severity}]</span>
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{issue.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedElement.aiAnalysis.suggestions?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">💡 개선 제안</h4>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        {selectedElement.aiAnalysis.suggestions.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2"><span className="text-green-500">•</span>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 관련 이슈 */}
              {elementIssues.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    🔗 관련 분석 이슈 ({elementIssues.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {elementIssues.map((issue: any) => (
                      <div key={issue.id} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            issue.severity === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            issue.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>{issue.severity}</span>
                          {issue.lineNumber && <span className="text-xs text-gray-500">Line {issue.lineNumber}</span>}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">💡 {issue.suggestion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {loadingIssues && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> 이슈 로딩 중...
                </p>
              )}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>요소를 선택하면 상세 정보가 표시됩니다</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ElementRow({ el, selected, onSelect, onAnalyze, isFavorite, onToggleFavorite, getTypeColor, getComplexity }: { el: CodeElement; selected: boolean; onSelect: () => void; onAnalyze: () => void; isFavorite: boolean; onToggleFavorite: () => void; getTypeColor: (t: string) => string; getComplexity: (e: CodeElement) => 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const complexity = getComplexity(el);
  return (
    <div onClick={onSelect} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${selected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(el.elementType)}`}>{el.elementType}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-white">{el.name}</span>
            {el.isAsync && <span className="text-xs text-purple-500">async</span>}
            {el.isExported && <span className="text-xs text-green-500">export</span>}
            <span className={`px-1.5 py-0.5 rounded text-xs ${complexity === 'HIGH' ? 'bg-red-100 text-red-600' : complexity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>{complexity}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            <FileCode className="w-3 h-3" />
            <span className="truncate">{el.filePath}</span>
            <span>L{el.lineStart}-{el.lineEnd}</span>
          </div>
          {el.aiSummary && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-1">✨ {el.aiSummary}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className="p-1 text-gray-400 hover:text-yellow-500">
            {isFavorite ? <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
          </button>
          {el.analyzedAt ? <CheckCircle className="w-4 h-4 text-green-500" /> : (
            <button onClick={(e) => { e.stopPropagation(); onAnalyze(); }} className="p-1 text-gray-400 hover:text-blue-500" title="AI 분석">
              <Sparkles className="w-4 h-4" />
            </button>
          )}
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, count, color, icon, onClick }: { label: string; count: number; color: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick} 
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs text-gray-500 truncate">{label}</span>
        {icon && <span className="text-gray-400 ml-auto">{icon}</span>}
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">{count}</div>
    </div>
  );
}
