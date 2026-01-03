'use client';

/**
 * 프로젝트 코드 요소 분석기 (고도화)
 * 
 * - 코드 요소 목록 조회
 * - 스캔 및 AI 분석
 * - 통계 및 검색
 * - 복잡도 대시보드
 * - 파일 트리 뷰
 * - 고급 필터
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Code2, RefreshCw, Search, Filter, ChevronDown,
  FileCode, CheckCircle, AlertCircle, Loader2, Play, Zap,
  BarChart3, Layers, Eye, Sparkles, ChevronRight, Folder,
  AlertTriangle, TrendingUp, GitBranch, Clock, FolderTree,
  PieChart, Activity, Star, StarOff, Copy, ExternalLink,
  Download, ChevronUp, SortAsc, SortDesc
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
  const [scanError, setScanError] = useState<string | null>(null);

  // 필터/검색
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [analyzedFilter, setAnalyzedFilter] = useState('');
  const [complexityFilter, setComplexityFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lines' | 'complexity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 뷰 모드
  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'complexity'>('list');

  // 선택된 요소 (상세 보기)
  const [selectedElement, setSelectedElement] = useState<CodeElement | null>(null);

  // 즐겨찾기
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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
        console.log('Scan result:', data);
        await loadData();
      } else {
        setScanError(data.error || '스캔 실패');
      }
    } catch (e: any) {
      console.error('Scan failed', e);
      setScanError(e.message || '스캔 실패');
    } finally {
      setScanning(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/code-elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-batch', limit: 5 })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error('Analysis failed', e);
    } finally {
      setAnalyzing(false);
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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

  // 필터링 및 정렬
  const filteredElements = useMemo(() => {
    let result = elements.filter(e =>
      (!searchQuery ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.filePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.aiSummary?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!complexityFilter || getComplexity(e) === complexityFilter)
    );

    // 정렬
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'lines') {
        cmp = (b.lineEnd - b.lineStart) - (a.lineEnd - a.lineStart);
      } else if (sortBy === 'complexity') {
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

  // 복잡도 통계
  const complexityStats = useMemo(() => {
    const analyzed = elements.filter(e => e.analyzedAt);
    return {
      high: analyzed.filter(e => getComplexity(e) === 'HIGH').length,
      medium: analyzed.filter(e => getComplexity(e) === 'MEDIUM').length,
      low: analyzed.filter(e => getComplexity(e) === 'LOW').length,
    };
  }, [elements]);

  if (loading && elements.length === 0) {
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
          <p className="text-gray-500">프로젝트의 코드 요소를 추출하고 AI로 분석합니다</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            스캔
          </button>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !stats?.pending}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg disabled:opacity-50 shadow-lg"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            AI 분석 ({stats?.pending || 0}개 대기)
          </button>
        </div>
      </header>

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

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
          <StatCard label="전체" count={stats.total} color="bg-gray-500" icon={<Layers className="w-4 h-4" />} />
          <StatCard label="분석 완료" count={stats.analyzed} color="bg-green-500" icon={<CheckCircle className="w-4 h-4" />} />
          <StatCard label="대기 중" count={stats.pending} color="bg-yellow-500" icon={<Clock className="w-4 h-4" />} />
          <StatCard label="클래스" count={stats.byType.CLASS || 0} color="bg-purple-500" />
          <StatCard label="함수" count={stats.byType.FUNCTION || 0} color="bg-blue-500" />
          <StatCard label="컴포넌트" count={stats.byType.COMPONENT || 0} color="bg-green-500" />
          <StatCard label="메서드" count={stats.byType.METHOD || 0} color="bg-cyan-500" />
          <StatCard label="인터페이스" count={stats.byType.INTERFACE || 0} color="bg-yellow-500" />
        </div>
      )}

      {/* 복잡도 대시보드 */}
      {complexityStats.high + complexityStats.medium + complexityStats.low > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            복잡도 분포
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
              {complexityStats.high > 0 && (
                <div 
                  className="bg-red-500 h-full" 
                  style={{ width: `${(complexityStats.high / (complexityStats.high + complexityStats.medium + complexityStats.low)) * 100}%` }}
                />
              )}
              {complexityStats.medium > 0 && (
                <div 
                  className="bg-yellow-500 h-full" 
                  style={{ width: `${(complexityStats.medium / (complexityStats.high + complexityStats.medium + complexityStats.low)) * 100}%` }}
                />
              )}
              {complexityStats.low > 0 && (
                <div 
                  className="bg-green-500 h-full" 
                  style={{ width: `${(complexityStats.low / (complexityStats.high + complexityStats.medium + complexityStats.low)) * 100}%` }}
                />
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
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* 뷰 모드 토글 */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
          >
            목록
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'tree' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
          >
            트리
          </button>
          <button
            onClick={() => setViewMode('complexity')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'complexity' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
          >
            복잡도
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 파일 경로, AI 요약 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">모든 유형</option>
          <option value="CLASS">클래스</option>
          <option value="FUNCTION">함수</option>
          <option value="METHOD">메서드</option>
          <option value="COMPONENT">컴포넌트</option>
          <option value="INTERFACE">인터페이스</option>
        </select>

        <select
          value={complexityFilter}
          onChange={(e) => setComplexityFilter(e.target.value)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">모든 복잡도</option>
          <option value="HIGH">🔴 HIGH</option>
          <option value="MEDIUM">🟡 MEDIUM</option>
          <option value="LOW">🟢 LOW</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="name">이름순</option>
          <option value="lines">크기순</option>
          <option value="complexity">복잡도순</option>
        </select>

        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
        </button>

        <button
          onClick={loadData}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* 요소 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 목록/트리 */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {viewMode === 'tree' ? (
            // 트리 뷰
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {fileTree.map(([dir, items]) => (
                <div key={dir}>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Folder className="w-4 h-4" />
                    {dir}
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </div>
                  {items.map(el => (
                    <ElementRow 
                      key={el.id} 
                      el={el} 
                      selected={selectedElement?.id === el.id}
                      onSelect={() => setSelectedElement(el)}
                      onAnalyze={() => analyzeElement(el.id)}
                      isFavorite={favorites.has(el.id)}
                      onToggleFavorite={() => toggleFavorite(el.id)}
                      getTypeColor={getTypeColor}
                      getComplexity={getComplexity}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : viewMode === 'complexity' ? (
            // 복잡도 뷰
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {['HIGH', 'MEDIUM', 'LOW'].map(complexity => {
                const items = filteredElements.filter(e => getComplexity(e) === complexity);
                if (items.length === 0) return null;
                return (
                  <div key={complexity}>
                    <div className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${
                      complexity === 'HIGH' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                      complexity === 'MEDIUM' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                      'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                      {complexity} ({items.length})
                    </div>
                    {items.map(el => (
                      <ElementRow 
                        key={el.id} 
                        el={el} 
                        selected={selectedElement?.id === el.id}
                        onSelect={() => setSelectedElement(el)}
                        onAnalyze={() => analyzeElement(el.id)}
                        isFavorite={favorites.has(el.id)}
                        onToggleFavorite={() => toggleFavorite(el.id)}
                        getTypeColor={getTypeColor}
                        getComplexity={getComplexity}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            // 일반 목록
            filteredElements.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                {filteredElements.map((el) => (
                  <ElementRow 
                    key={el.id} 
                    el={el} 
                    selected={selectedElement?.id === el.id}
                    onSelect={() => setSelectedElement(el)}
                    onAnalyze={() => analyzeElement(el.id)}
                    isFavorite={favorites.has(el.id)}
                    onToggleFavorite={() => toggleFavorite(el.id)}
                    getTypeColor={getTypeColor}
                    getComplexity={getComplexity}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">코드 요소가 없습니다</p>
                <p className="text-sm mt-2">스캔 버튼을 클릭하여 프로젝트를 스캔하세요</p>
              </div>
            )
          )}
        </div>

        {/* 상세 패널 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
          {selectedElement ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-sm font-medium ${getTypeColor(selectedElement.elementType)}`}>
                  {selectedElement.elementType}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFavorite(selectedElement.id)}
                    className="p-1 text-gray-400 hover:text-yellow-500"
                  >
                    {favorites.has(selectedElement.id) ? <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
                  </button>
                  {!selectedElement.analyzedAt && (
                    <button
                      onClick={() => analyzeElement(selectedElement.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm rounded shadow"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI 분석
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedElement.name}
              </h3>

              {/* 복잡도 배지 */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  getComplexity(selectedElement) === 'HIGH' ? 'bg-red-100 text-red-700' :
                  getComplexity(selectedElement) === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  복잡도: {getComplexity(selectedElement)}
                </span>
                <span className="text-xs text-gray-500">
                  {selectedElement.lineEnd - selectedElement.lineStart} 줄
                </span>
              </div>

              <div className="text-sm text-gray-500 space-y-1">
                <p className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  <span className="truncate">{selectedElement.filePath}</span>
                </p>
                <p>줄: {selectedElement.lineStart} - {selectedElement.lineEnd}</p>
                {selectedElement.parentName && (
                  <p>부모: {selectedElement.parentName}</p>
                )}
                {selectedElement.signature && (
                  <pre className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                    {selectedElement.signature}
                  </pre>
                )}
              </div>

              {selectedElement.aiSummary && (
                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    AI 분석 요약
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {selectedElement.aiSummary}
                  </p>
                </div>
              )}

              {selectedElement.aiAnalysis && (
                <div className="space-y-3">
                  {selectedElement.aiAnalysis.purpose && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">🎯 목적</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {selectedElement.aiAnalysis.purpose}
                      </p>
                    </div>
                  )}
                  {selectedElement.aiAnalysis.issues?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">⚠️ 발견된 이슈</h4>
                      <div className="space-y-1">
                        {selectedElement.aiAnalysis.issues.map((issue: any, i: number) => (
                          <div key={i} className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            <span className={`text-xs font-medium ${
                              issue.severity === 'HIGH' ? 'text-red-600' : 
                              issue.severity === 'MEDIUM' ? 'text-yellow-600' : 'text-blue-600'
                            }`}>
                              [{issue.severity}]
                            </span>
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
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
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

function ElementRow({ 
  el, 
  selected, 
  onSelect, 
  onAnalyze,
  isFavorite,
  onToggleFavorite,
  getTypeColor,
  getComplexity
}: { 
  el: CodeElement; 
  selected: boolean;
  onSelect: () => void;
  onAnalyze: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  getTypeColor: (type: string) => string;
  getComplexity: (el: CodeElement) => 'LOW' | 'MEDIUM' | 'HIGH';
}) {
  const complexity = getComplexity(el);
  
  return (
    <div
      onClick={onSelect}
      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
        selected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(el.elementType)}`}>
          {el.elementType}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{el.name}</span>
            {el.isAsync && <span className="text-xs text-purple-500">async</span>}
            {el.isExported && <span className="text-xs text-green-500">export</span>}
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              complexity === 'HIGH' ? 'bg-red-100 text-red-600' :
              complexity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' :
              'bg-green-100 text-green-600'
            }`}>
              {complexity}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            <FileCode className="w-3 h-3" />
            <span className="truncate">{el.filePath}</span>
            <span>L{el.lineStart}-{el.lineEnd}</span>
          </div>
          {el.aiSummary && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-1">
              ✨ {el.aiSummary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="p-1 text-gray-400 hover:text-yellow-500"
          >
            {isFavorite ? <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
          </button>
          {el.analyzedAt ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
              className="p-1 text-gray-400 hover:text-blue-500"
              title="AI 분석"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, count, color, icon }: { label: string; count: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm text-gray-500">{label}</span>
        {icon && <span className="text-gray-400 ml-auto">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</div>
    </div>
  );
}
