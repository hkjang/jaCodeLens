'use client';

import React, { useState, useEffect } from 'react';
import { 
  Code2, RefreshCw, Search, Filter, ChevronDown, ChevronRight,
  FileCode, Folder, Clock, Zap, GitBranch, Tag, 
  CheckCircle, AlertCircle, Loader2, Eye, Play,
  BarChart3, PieChart, TrendingUp, Layers
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

        {/* Type Distribution */}
        {stats?.byType && Object.keys(stats.byType).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">요소 타입별 분포</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setFilter(f => ({ ...f, type: f.type === type ? undefined : type }))}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition ${
                    filter.type === type 
                      ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-gray-800' 
                      : ''
                  } ${getTypeColor(type)}`}
                >
                  <span>{getTypeIcon(type)}</span>
                  <span>{type}</span>
                  <span className="font-bold">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
                              className={`w-full flex items-center gap-3 px-4 py-2 pl-10 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition text-left ${
                                selectedElement?.id === el.id ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                              }`}
                            >
                              <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(el.elementType)}`}>
                                {getTypeIcon(el.elementType)} {el.elementType}
                              </span>
                              <span className="text-sm text-gray-900 dark:text-white font-mono truncate">
                                {el.name}
                              </span>
                              {el.analyzedAt && (
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto flex-shrink-0" />
                              )}
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

                {/* AI Summary */}
                {selectedElement.aiSummary && (
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-violet-200 dark:border-violet-800">
                    <h5 className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      AI 분석 요약
                    </h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedElement.aiSummary}
                    </p>
                  </div>
                )}

                {/* Code */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">소스 코드</h5>
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
