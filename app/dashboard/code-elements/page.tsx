'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Code2, RefreshCw, Search, Filter, ChevronDown, ChevronRight,
  FileCode, Folder, Clock, Zap, GitBranch, Tag, 
  CheckCircle, AlertCircle, Loader2, Eye, Play,
  BarChart3, PieChart, TrendingUp, Layers,
  Download, Copy, Sparkles, ArrowUp, ArrowDown, RotateCw
} from 'lucide-react';

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
  content: string;
  parentName?: string;
  exportType?: string;
  isAsync: boolean;
  isExported: boolean;
  aiSummary?: string;
  aiAnalysis?: string;
  analyzedAt?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  analyzed: number;
  pending: number;
  byType: Record<string, number>;
}

export default function CodeElementsPage() {
  const [elements, setElements] = useState<CodeElement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedElement, setSelectedElement] = useState<CodeElement | null>(null);
  const [filter, setFilter] = useState<{ type?: string; analyzed?: boolean; search?: string }>({});
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [projectId, setProjectId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'name' | 'lines' | 'type'>('name');
  const [quickFilters, setQuickFilters] = useState<{ async?: boolean; exported?: boolean; analyzed?: boolean }>({});
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [analyzingElement, setAnalyzingElement] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // 프로젝트 ID 가져오기
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch('/api/self-analysis/project');
        const data = await res.json();
        if (data.project?.id) {
          setProjectId(data.project.id);
        }
      } catch (e) {
        console.error('Failed to fetch project:', e);
      }
    };
    fetchProject();
  }, []);

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 중이면 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'j': // 다음
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = Math.min(prev + 1, elements.length - 1);
            if (elements[next]) setSelectedElement(elements[next]);
            return next;
          });
          break;
        case 'k': // 이전
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = Math.max(prev - 1, 0);
            if (elements[next]) setSelectedElement(elements[next]);
            return next;
          });
          break;
        case 'c': // 복사
          if (selectedElement) {
            navigator.clipboard.writeText(selectedElement.content);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
          }
          break;
        case 'e': // 전체 펼치기/접기
          setExpandedFiles(prev => prev.size > 0 ? new Set() : new Set(Object.keys(
            elements.reduce((acc, el) => { acc[el.filePath] = true; return acc; }, {} as Record<string, boolean>)
          )));
          break;
        case '/': // 검색
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
          break;
        case '?': // 단축키 도움말
          setShowShortcuts(prev => !prev);
          break;
        case 'Escape':
          setShowShortcuts(false);
          setSearchText('');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [elements, selectedElement]);

  // 분석 중 자동 새로고침
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (analyzing) {
      interval = setInterval(() => {
        loadData();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  // 데이터 로드
  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId, filter]);

  const loadData = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({ projectId });
      if (filter.type) params.append('type', filter.type);
      if (filter.analyzed !== undefined) params.append('analyzed', String(filter.analyzed));
      
      const [elementsRes, statsRes] = await Promise.all([
        fetch(`/api/code-elements?${params}`),
        fetch(`/api/code-elements?projectId=${projectId}&action=stats`)
      ]);
      
      const elementsData = await elementsRes.json();
      const statsData = await statsRes.json();
      
      setElements(elementsData.elements || []);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  // 스캔 실행
  const handleScan = async () => {
    if (!projectId) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/code-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, action: 'scan' })
      });
      const data = await res.json();
      console.log('Scan result:', data);
      setScanResult(data.result);
      await loadData();
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setScanning(false);
    }
  };

  // AI 분석 실행
  const handleAnalyze = async () => {
    if (!projectId) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/code-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, action: 'analyze' })
      });
      const data = await res.json();
      console.log('Analysis result:', data);
      await loadData();
    } catch (e) {
      console.error('Analysis failed:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  // 코드 복사
  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, []);

  // JSON 내보내기
  const exportJSON = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      projectId,
      stats,
      elements: elements.map(el => ({
        name: el.name,
        type: el.elementType,
        file: el.filePath,
        lines: `${el.lineStart}-${el.lineEnd}`,
        signature: el.signature,
        aiSummary: el.aiSummary,
        isAsync: el.isAsync,
        isExported: el.isExported
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-elements-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [elements, stats, projectId]);

  // 단일 요소 AI 분석
  const analyzeElement = useCallback(async (elementId: string) => {
    setAnalyzingElement(elementId);
    try {
      // Note: This would need a dedicated API endpoint
      const res = await fetch('/api/code-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, action: 'analyze', elementId })
      });
      await res.json();
      await loadData();
    } catch (e) {
      console.error('Element analysis failed:', e);
    } finally {
      setAnalyzingElement(null);
    }
  }, [projectId]);

  // 검색 및 빠른 필터 적용
  const filteredElements = elements.filter(el => {
    // 검색 필터
    if (searchText) {
      const search = searchText.toLowerCase();
      const matchSearch = el.name.toLowerCase().includes(search) || 
             el.filePath.toLowerCase().includes(search) ||
             el.signature?.toLowerCase().includes(search) ||
             el.aiSummary?.toLowerCase().includes(search);
      if (!matchSearch) return false;
    }
    
    // 빠른 필터
    if (quickFilters.async && !el.isAsync) return false;
    if (quickFilters.exported && !el.isExported) return false;
    if (quickFilters.analyzed !== undefined) {
      if (quickFilters.analyzed && !el.analyzedAt) return false;
      if (!quickFilters.analyzed && el.analyzedAt) return false;
    }
    
    return true;
  });

  // 정렬 적용
  const sortedElements = [...filteredElements].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'lines':
        return (b.lineEnd - b.lineStart) - (a.lineEnd - a.lineStart);
      case 'type':
        return a.elementType.localeCompare(b.elementType);
      default:
        return 0;
    }
  });

  // 파일별 그룹핑
  const groupedElements = sortedElements.reduce((acc, el) => {
    if (!acc[el.filePath]) {
      acc[el.filePath] = [];
    }
    acc[el.filePath].push(el);
    return acc;
  }, {} as Record<string, CodeElement[]>);

  const toggleFile = (filePath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    setExpandedFiles(newExpanded);
  };

  const expandAll = () => {
    setExpandedFiles(new Set(Object.keys(groupedElements)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  const toggleQuickFilter = (key: 'async' | 'exported' | 'analyzed') => {
    setQuickFilters(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? true : prev[key] ? false : undefined
    }));
  };

  const getLineCount = (el: CodeElement) => el.lineEnd - el.lineStart + 1;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLASS': return '🏛️';
      case 'FUNCTION': return '⚡';
      case 'METHOD': return '🔧';
      case 'COMPONENT': return '⚛️';
      case 'HOOK': return '🪝';
      case 'INTERFACE': return '📋';
      case 'TYPE': return '📝';
      default: return '📦';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CLASS': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'FUNCTION': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'METHOD': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'COMPONENT': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
      case 'HOOK': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
      case 'INTERFACE': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              ⌨️ 키보드 단축키
            </h3>
            <div className="space-y-2">
              {[
                { key: 'j', desc: '다음 요소 선택' },
                { key: 'k', desc: '이전 요소 선택' },
                { key: 'c', desc: '선택된 코드 복사' },
                { key: 'e', desc: '전체 펼치기/접기 토글' },
                { key: '/', desc: '검색창으로 이동' },
                { key: '?', desc: '이 도움말 열기/닫기' },
                { key: 'Esc', desc: '검색 초기화 / 닫기' },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-gray-600 dark:text-gray-400">{desc}</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-4 w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  코드 요소 분석기
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Code Intelligence Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleScan}
                disabled={scanning || !projectId}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                스캔 실행
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !projectId || !stats?.pending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                AI 분석 ({stats?.pending || 0})
              </button>
              <button
                onClick={exportJSON}
                disabled={!elements.length}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
                title="JSON으로 내보내기"
              >
                <Download className="w-4 h-4" />
                내보내기
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title="새로고침"
              >
                <RotateCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="함수명, 파일명, 시그니처로 검색..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          {searchText && (
            <p className="mt-2 text-sm text-gray-500">
              "{searchText}" 검색 결과: {filteredElements.length}개
            </p>
          )}
        </div>

        {/* Scan Result Banner */}
        {scanResult && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              스캔 완료!
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">스캔 파일:</span>
                <span className="ml-2 font-bold text-gray-900 dark:text-white">{scanResult.filesScanned}개</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">추출 요소:</span>
                <span className="ml-2 font-bold text-gray-900 dark:text-white">{scanResult.elementsExtracted}개</span>
              </div>
              {scanResult.complexityStats && (
                <>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">평균 복잡도:</span>
                    <span className="ml-2 font-bold text-gray-900 dark:text-white">{scanResult.complexityStats.avgComplexity}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">고복잡도:</span>
                    <span className="ml-2 font-bold text-red-600 dark:text-red-400">{scanResult.complexityStats.highComplexityCount}개</span>
                  </div>
                </>
              )}
            </div>
            {scanResult.elementsByType && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(scanResult.elementsByType).map(([type, count]) => (
                  <span key={type} className={`px-2 py-1 rounded-full text-xs ${getTypeColor(type)}`}>
                    {getTypeIcon(type)} {type}: {count as number}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analysis Progress */}
        {stats && stats.total > 0 && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">AI 분석 진행률</span>
              <span className="text-gray-500">{stats.analyzed} / {stats.total} ({Math.round(stats.analyzed / stats.total * 100)}%)</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
                style={{ width: `${(stats.analyzed / stats.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">총 요소</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.analyzed}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">분석 완료</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">분석 대기</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(groupedElements).length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">파일</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Type Distribution with Chart & Recent Activity */}
        {stats?.byType && Object.keys(stats.byType).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Donut Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">타입 분포 차트</h3>
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-32 h-32">
                  {(() => {
                    const entries = Object.entries(stats.byType);
                    const total = entries.reduce((sum, [, count]) => sum + count, 0);
                    let currentAngle = 0;
                    const colors: Record<string, string> = {
                      CLASS: '#8B5CF6',
                      FUNCTION: '#3B82F6',
                      METHOD: '#10B981',
                      COMPONENT: '#06B6D4',
                      HOOK: '#EC4899',
                      INTERFACE: '#F59E0B',
                      TYPE: '#F97316',
                      DEFAULT: '#6B7280'
                    };
                    
                    return entries.map(([type, count], idx) => {
                      const angle = (count / total) * 360;
                      const startAngle = currentAngle;
                      currentAngle += angle;
                      
                      const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
                      const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
                      const x2 = 50 + 40 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
                      const y2 = 50 + 40 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
                      const largeArc = angle > 180 ? 1 : 0;
                      
                      return (
                        <path
                          key={type}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={colors[type] || colors.DEFAULT}
                          stroke="#fff"
                          strokeWidth="0.5"
                          className="hover:opacity-80 transition cursor-pointer"
                          onClick={() => setFilter(f => ({ ...f, type: f.type === type ? undefined : type }))}
                        >
                          <title>{type}: {count} ({Math.round(count / total * 100)}%)</title>
                        </path>
                      );
                    });
                  })()}
                  <circle cx="50" cy="50" r="20" fill="white" className="dark:fill-gray-800" />
                  <text x="50" y="50" textAnchor="middle" dy="0.35em" className="text-xs font-bold fill-gray-900 dark:fill-white">
                    {stats.total}
                  </text>
                </svg>
              </div>
              <div className="flex flex-wrap gap-1 mt-3 justify-center">
                {Object.entries(stats.byType).slice(0, 5).map(([type, count]) => (
                  <span key={type} className="text-[10px] text-gray-500 dark:text-gray-400">
                    {getTypeIcon(type)} {Math.round(count / stats.total * 100)}%
                  </span>
                ))}
              </div>
            </div>

            {/* Type Buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">타입별 필터</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => setFilter(f => ({ ...f, type: f.type === type ? undefined : type }))}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition ${
                      filter.type === type 
                        ? 'ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-gray-800' 
                        : ''
                    } ${getTypeColor(type)}`}
                  >
                    <span>{getTypeIcon(type)}</span>
                    <span className="font-bold">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">최근 분석</h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {elements
                  .filter(el => el.analyzedAt)
                  .sort((a, b) => new Date(b.analyzedAt!).getTime() - new Date(a.analyzedAt!).getTime())
                  .slice(0, 5)
                  .map(el => (
                    <button
                      key={el.id}
                      onClick={() => setSelectedElement(el)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                    >
                      <span className="text-lg">{getTypeIcon(el.elementType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{el.name}</p>
                        <p className="text-[10px] text-gray-500">{new Date(el.analyzedAt!).toLocaleString('ko')}</p>
                      </div>
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    </button>
                  ))}
                {elements.filter(el => el.analyzedAt).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    아직 분석된 요소가 없습니다
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Filters & Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">빠른 필터:</span>
            <button
              onClick={() => toggleQuickFilter('async')}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                quickFilters.async 
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 ring-2 ring-orange-500' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🔄 async
            </button>
            <button
              onClick={() => toggleQuickFilter('exported')}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                quickFilters.exported 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-2 ring-green-500' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              📤 exported
            </button>
            <button
              onClick={() => toggleQuickFilter('analyzed')}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                quickFilters.analyzed === true
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-2 ring-violet-500' 
                  : quickFilters.analyzed === false
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 ring-2 ring-yellow-500'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {quickFilters.analyzed === true ? '✅ 분석됨' : quickFilters.analyzed === false ? '⏳ 미분석' : '🔍 분석상태'}
            </button>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">정렬:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'lines' | 'type')}
              className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <option value="name">이름순</option>
              <option value="lines">라인수순 (큰거 먼저)</option>
              <option value="type">타입순</option>
            </select>
          </div>

          {/* Expand/Collapse */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              📂 전체 펼치기
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              📁 전체 접기
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Elements List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Folder className="w-4 h-4" />
                코드 요소 목록
              </h3>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : Object.keys(groupedElements).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Code2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>코드 요소가 없습니다</p>
                  <p className="text-sm">스캔을 실행하여 코드를 분석하세요</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(groupedElements).map(([filePath, fileElements]) => (
                    <div key={filePath}>
                      <button
                        onClick={() => toggleFile(filePath)}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                      >
                        {expandedFiles.has(filePath) ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        <FileCode className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {filePath}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {fileElements.length}개
                        </span>
                      </button>
                      
                      {expandedFiles.has(filePath) && (
                        <div className="bg-gray-50 dark:bg-gray-900/50">
                          {fileElements.map(el => (
                            <button
                              key={el.id}
                              onClick={() => setSelectedElement(el)}
                              className={`w-full flex items-center gap-2 px-4 py-2 pl-10 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition text-left ${
                                selectedElement?.id === el.id ? 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-violet-500' : ''
                              }`}
                            >
                              <span className={`px-1.5 py-0.5 rounded text-xs ${getTypeColor(el.elementType)}`}>
                                {getTypeIcon(el.elementType)}
                              </span>
                              <span className="text-sm text-gray-900 dark:text-white font-mono truncate flex-1">
                                {el.name}
                              </span>
                              {/* Badges */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {el.isAsync && (
                                  <span className="px-1 py-0.5 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded text-[10px]">
                                    async
                                  </span>
                                )}
                                {el.isExported && (
                                  <span className="px-1 py-0.5 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded text-[10px]">
                                    exp
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400 w-8 text-right">
                                  {getLineCount(el)}L
                                </span>
                                {el.analyzedAt ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-gray-300" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Element Detail */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4" />
                요소 상세 정보
              </h3>
            </div>
            
            {selectedElement ? (
              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-sm ${getTypeColor(selectedElement.elementType)}`}>
                        {getTypeIcon(selectedElement.elementType)} {selectedElement.elementType}
                      </span>
                      {selectedElement.isAsync && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded text-xs">
                          async
                        </span>
                      )}
                      {selectedElement.isExported && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded text-xs">
                          exported
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                      {selectedElement.name}
                    </h4>
                    {selectedElement.parentName && (
                      <p className="text-sm text-gray-500">
                        in <span className="font-medium">{selectedElement.parentName}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileCode className="w-4 h-4" />
                    {selectedElement.fileName}
                  </span>
                  <span>
                    L{selectedElement.lineStart}-{selectedElement.lineEnd}
                  </span>
                </div>

                {/* Signature */}
                {selectedElement.signature && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">시그니처</h5>
                    <code className="block text-sm bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto font-mono">
                      {selectedElement.signature}
                    </code>
                  </div>
                )}

                {/* AI Summary or Analyze Button */}
                {selectedElement.aiSummary ? (
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-violet-200 dark:border-violet-800">
                    <h5 className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI 분석 요약
                    </h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedElement.aiSummary}
                    </p>
                    {selectedElement.aiAnalysis && (
                      <details className="mt-2">
                        <summary className="text-xs text-violet-500 cursor-pointer hover:underline">상세 분석 보기</summary>
                        <pre className="mt-2 text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(JSON.parse(selectedElement.aiAnalysis), null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => analyzeElement(selectedElement.id)}
                    disabled={analyzingElement === selectedElement.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {analyzingElement === selectedElement.id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> AI 분석 중...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> AI로 이 요소 분석하기</>
                    )}
                  </button>
                )}

                {/* Code with Copy Button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      소스 코드 ({getLineCount(selectedElement)}줄)
                    </h5>
                    <button
                      onClick={() => copyCode(selectedElement.content)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      {copyFeedback ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copyFeedback ? '복사됨!' : '복사'}
                    </button>
                  </div>
                  <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto max-h-[300px] overflow-y-auto">
                    <code>{selectedElement.content}</code>
                  </pre>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">언어:</span>
                    <span className="ml-2 font-medium">{selectedElement.language}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">내보내기:</span>
                    <span className="ml-2 font-medium">{selectedElement.exportType || 'none'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">생성:</span>
                    <span className="ml-2 font-medium">{new Date(selectedElement.createdAt).toLocaleString('ko')}</span>
                  </div>
                  {selectedElement.analyzedAt && (
                    <div>
                      <span className="text-gray-500">분석:</span>
                      <span className="ml-2 font-medium">{new Date(selectedElement.analyzedAt).toLocaleString('ko')}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-gray-500">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>요소를 선택하여 상세 정보를 확인하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
