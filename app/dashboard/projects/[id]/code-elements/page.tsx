'use client';

/**
 * 프로젝트 코드 요소 분석기
 * 
 * - 코드 요소 목록 조회
 * - 스캔 및 AI 분석
 * - 통계 및 검색
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Code2, RefreshCw, Search, Filter, ChevronDown,
  FileCode, CheckCircle, AlertCircle, Loader2, Play, Zap,
  BarChart3, Layers, Eye, Sparkles, ChevronRight
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

  // 필터/검색
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [analyzedFilter, setAnalyzedFilter] = useState('');

  // 선택된 요소 (상세 보기)
  const [selectedElement, setSelectedElement] = useState<CodeElement | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId, typeFilter, analyzedFilter]);

  async function loadData() {
    setLoading(true);
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
    try {
      const res = await fetch(`/api/projects/${projectId}/code-elements/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Scan result:', data);
        await loadData();
      }
    } catch (e) {
      console.error('Scan failed', e);
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

  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      CLASS: 'bg-purple-100 text-purple-700',
      FUNCTION: 'bg-blue-100 text-blue-700',
      METHOD: 'bg-cyan-100 text-cyan-700',
      COMPONENT: 'bg-green-100 text-green-700',
      INTERFACE: 'bg-yellow-100 text-yellow-700',
      TYPE: 'bg-orange-100 text-orange-700',
      VARIABLE: 'bg-gray-100 text-gray-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  }

  const filteredElements = elements.filter(e =>
    !searchQuery ||
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.filePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.aiSummary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
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

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard label="전체" count={stats.total} color="bg-gray-500" />
          <StatCard label="분석 완료" count={stats.analyzed} color="bg-green-500" />
          <StatCard label="대기 중" count={stats.pending} color="bg-yellow-500" />
          <StatCard label="클래스" count={stats.byType.CLASS || 0} color="bg-purple-500" />
          <StatCard label="함수" count={stats.byType.FUNCTION || 0} color="bg-blue-500" />
          <StatCard label="컴포넌트" count={stats.byType.COMPONENT || 0} color="bg-green-500" />
        </div>
      )}

      {/* 필터/검색 바 */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
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
          value={analyzedFilter}
          onChange={(e) => setAnalyzedFilter(e.target.value)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">전체</option>
          <option value="true">분석 완료</option>
          <option value="false">분석 대기</option>
        </select>

        <button
          onClick={loadData}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* 요소 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 목록 */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredElements.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {filteredElements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElement(el)}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                    selectedElement?.id === el.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
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
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <FileCode className="w-3 h-3" />
                        <span className="truncate">{el.filePath}</span>
                        <span>L{el.lineStart}-{el.lineEnd}</span>
                      </div>
                      {el.aiSummary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          ✨ {el.aiSummary}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {el.analyzedAt ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); analyzeElement(el.id); }}
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
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">코드 요소가 없습니다</p>
              <p className="text-sm mt-2">스캔 버튼을 클릭하여 프로젝트를 스캔하세요</p>
            </div>
          )}
        </div>

        {/* 상세 패널 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          {selectedElement ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-sm font-medium ${getTypeColor(selectedElement.elementType)}`}>
                  {selectedElement.elementType}
                </span>
                {!selectedElement.analyzedAt && (
                  <button
                    onClick={() => analyzeElement(selectedElement.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI 분석
                  </button>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedElement.name}
              </h3>

              <div className="text-sm text-gray-500 space-y-1">
                <p className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  {selectedElement.filePath}
                </p>
                <p>줄: {selectedElement.lineStart} - {selectedElement.lineEnd}</p>
                {selectedElement.parentName && (
                  <p>부모: {selectedElement.parentName}</p>
                )}
                {selectedElement.signature && (
                  <p className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded">
                    {selectedElement.signature}
                  </p>
                )}
              </div>

              {selectedElement.aiSummary && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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
                <div className="space-y-2">
                  {selectedElement.aiAnalysis.purpose && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500">목적</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {selectedElement.aiAnalysis.purpose}
                      </p>
                    </div>
                  )}
                  {selectedElement.aiAnalysis.complexity && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500">복잡도</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedElement.aiAnalysis.complexity === 'HIGH' ? 'bg-red-100 text-red-700' :
                        selectedElement.aiAnalysis.complexity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {selectedElement.aiAnalysis.complexity}
                      </span>
                    </div>
                  )}
                  {selectedElement.aiAnalysis.suggestions?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500">개선 제안</h4>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                        {selectedElement.aiAnalysis.suggestions.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
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

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</div>
    </div>
  );
}
