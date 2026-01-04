'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Filter,
  FileCode,
  Loader2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Download,
  Code2,
  BarChart3,
  List,
  Grid3X3,
  FolderTree,
  Terminal,
  FileJson,
  Share2,
  PieChart,
  Play,
  X,
  Keyboard,
  Star,
  StarOff,
  Lock,
  Unlock,
  Clock,
  History,
  Zap
} from 'lucide-react';

interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
  in: 'path' | 'query' | 'body' | 'header';
}

interface ApiRequestBody {
  contentType: string;
  schema?: string;
  example?: string;
  required: boolean;
}

interface ApiResponse {
  statusCode: number;
  contentType?: string;
  schema?: string;
  description?: string;
}

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  path: string;
  filePath: string;
  fileName: string;
  handler: string;
  params: string[];
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses?: ApiResponse[];
  middleware?: string[];
  description?: string;
  summary?: string;
  isAsync: boolean;
  lineNumber: number;
  framework: string;
  auth?: string;
  deprecated?: boolean;
  tags?: string[];
  contentType?: string;
  validation?: {
    rules: { field: string; rule: string; message?: string }[];
    schema?: string;
  };
  rateLimit?: {
    limit: number;
    window: string;
  };
  cache?: {
    ttl?: number;
    strategy?: string;
  };
  apiVersion?: string;
}

interface ApiGroup {
  prefix: string;
  endpoints: ApiEndpoint[];
}

const methodColors: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
  POST: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700' },
  PUT: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700' },
  PATCH: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
  DELETE: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
  OPTIONS: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700' },
  HEAD: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-700' },
};

export default function ApiEndpointsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [framework, setFramework] = useState('');
  const [stats, setStats] = useState<{ total: number; byMethod: Record<string, number> } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'tree'>('list');
  const [copied, setCopied] = useState<string | null>(null);
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // 즐겨찾기 (localStorage)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`api-favorites-${projectId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  
  // 검색 기록
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`api-search-history-${projectId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  
  // 최근 본 엔드포인트
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  
  // 데이터 로드
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/endpoints`);
        const data = await res.json();
        
        if (data.error && data.endpoints.length === 0) {
          setError(data.error);
        }
        
        setEndpoints(data.endpoints || []);
        setGroups(data.groups || []);
        setStats(data.stats || null);
        setFramework(data.framework || '');
        setProjectName(data.projectName || '');
        
        // 모든 그룹 펼치기
        const allGroups = new Set<string>((data.groups || []).map((g: ApiGroup) => g.prefix));
        setExpandedGroups(allGroups);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load endpoints');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectId]);
  
  // 필터링된 엔드포인트
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter(ep => {
      const matchesSearch = !searchQuery || 
        ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.handler.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.filePath.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMethod = !selectedMethod || ep.method === selectedMethod;
      return matchesSearch && matchesMethod;
    });
  }, [endpoints, searchQuery, selectedMethod]);
  
  // 필터링된 그룹
  const filteredGroups = useMemo(() => {
    return groups.map(group => ({
      ...group,
      endpoints: group.endpoints.filter(ep => {
        const matchesSearch = !searchQuery || 
          ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ep.handler.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMethod = !selectedMethod || ep.method === selectedMethod;
        return matchesSearch && matchesMethod;
      })
    })).filter(g => g.endpoints.length > 0);
  }, [groups, searchQuery, selectedMethod]);
  
  const toggleGroup = useCallback((prefix: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
      }
      return next;
    });
  }, []);
  
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);
  
  const navigateToCodeElement = useCallback((ep: ApiEndpoint) => {
    // 코드 요소 페이지로 이동
    router.push(`/dashboard/projects/${projectId}/code-elements?file=${encodeURIComponent(ep.filePath)}&line=${ep.lineNumber}`);
  }, [projectId, router]);
  
  // 즐겨찾기 토글
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(`api-favorites-${projectId}`, JSON.stringify([...next]));
      return next;
    });
  }, [projectId]);
  
  // 엔드포인트 선택 시 최근 본 목록에 추가
  const selectEndpoint = useCallback((ep: ApiEndpoint) => {
    setSelectedEndpoint(ep);
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== ep.id);
      return [ep.id, ...filtered].slice(0, 10);
    });
  }, []);
  
  // 검색 기록 추가
  const addSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      localStorage.setItem(`api-search-history-${projectId}`, JSON.stringify(updated));
      return updated;
    });
    setShowSearchHistory(false);
  }, [projectId]);
  
  // 검색 실행
  const executeSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      addSearchHistory(query);
    }
    setShowSearchHistory(false);
  }, [addSearchHistory]);
  
  // curl 명령어 생성
  const generateCurl = useCallback((ep: ApiEndpoint) => {
    let curl = `curl -X ${ep.method}`;
    curl += ` 'http://localhost:3000${ep.path}'`;
    if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      curl += ` \\\n  -H 'Content-Type: application/json'`;
      curl += ` \\\n  -d '{}'`;
    }
    return curl;
  }, []);
  
  // OpenAPI 3.0 내보내기
  const exportToOpenAPI = useCallback(() => {
    const paths: Record<string, any> = {};
    
    for (const ep of endpoints) {
      const path = ep.path.replace(/:(\w+)/g, '{$1}');
      if (!paths[path]) paths[path] = {};
      
      paths[path][ep.method.toLowerCase()] = {
        summary: ep.handler,
        operationId: `${ep.method.toLowerCase()}${path.replace(/[{}\/]/g, '_')}`,
        parameters: ep.params.map(p => ({
          name: p,
          in: 'path',
          required: true,
          schema: { type: 'string' }
        })),
        responses: {
          '200': { description: 'Successful response' }
        }
      };
    }
    
    const openapi = {
      openapi: '3.0.0',
      info: {
        title: `${projectName} API`,
        version: '1.0.0'
      },
      paths
    };
    
    const yaml = JSON.stringify(openapi, null, 2)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, "'");
    
    downloadFile(yaml, `${projectName}-openapi.yaml`, 'text/yaml');
  }, [endpoints, projectName]);
  
  // Postman Collection 내보내기
  const exportToPostman = useCallback(() => {
    const collection = {
      info: {
        name: `${projectName} API`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: groups.map(group => ({
        name: group.prefix,
        item: group.endpoints.map(ep => ({
          name: `${ep.method} ${ep.path}`,
          request: {
            method: ep.method,
            header: [],
            url: {
              raw: `{{base_url}}${ep.path}`,
              host: ['{{base_url}}'],
              path: ep.path.split('/').filter(Boolean)
            }
          }
        }))
      }))
    };
    
    downloadFile(JSON.stringify(collection, null, 2), `${projectName}-postman.json`, 'application/json');
  }, [groups, projectName]);
  
  // Markdown 내보내기
  const exportToMarkdown = useCallback(() => {
    let md = `# ${projectName} API Documentation\n\n`;
    md += `> Generated on ${new Date().toLocaleDateString()}\n\n`;
    md += `## Overview\n\n`;
    md += `- Total Endpoints: ${endpoints.length}\n`;
    md += `- Framework: ${framework}\n\n`;
    md += `## Endpoints\n\n`;
    
    for (const group of groups) {
      md += `### ${group.prefix}\n\n`;
      md += `| Method | Path | Handler |\n`;
      md += `|--------|------|--------|\n`;
      
      for (const ep of group.endpoints) {
        md += `| \`${ep.method}\` | \`${ep.path}\` | ${ep.handler} |\n`;
      }
      md += `\n`;
    }
    
    downloadFile(md, `${projectName}-api.md`, 'text/markdown');
  }, [endpoints, groups, projectName, framework]);
  
  // 파일 다운로드 헬퍼
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // 트리 구조 생성
  const endpointTree = useMemo(() => {
    const tree: Record<string, { children: Record<string, any>; endpoints: ApiEndpoint[] }> = {};
    
    for (const ep of filteredEndpoints) {
      const parts = ep.path.split('/').filter(Boolean);
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = { children: {}, endpoints: [] };
        }
        if (i === parts.length - 1) {
          current[part].endpoints.push(ep);
        }
        current = current[part].children;
      }
    }
    
    return tree;
  }, [filteredEndpoints]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">API 엔드포인트 분석 중...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/projects/${projectId}/code-elements`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="코드 요소로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">API Endpoints Map</h1>
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <span>{projectName}</span>
                <span>•</span>
                <span>{stats?.total || 0}개 엔드포인트</span>
                {framework && (
                  <>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-medium uppercase">
                      {framework}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          {/* 검색 */}
          <div className="relative ml-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="엔드포인트 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 메서드 필터 */}
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => (
            <button
              key={method}
              onClick={() => setSelectedMethod(selectedMethod === method ? null : method)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                selectedMethod === method
                  ? `${methodColors[method].bg} ${methodColors[method].text}`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {method}
            </button>
          ))}
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
          
          {/* 뷰 모드 */}
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="리스트 뷰"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="그리드 뷰"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`p-2 rounded-lg transition ${viewMode === 'tree' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="트리 뷰"
          >
            <FolderTree className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
          
          {/* 통계 */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-lg transition ${showStats ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="통계"
          >
            <PieChart className="w-4 h-4" />
          </button>
          
          {/* 내보내기 */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`p-2 rounded-lg transition flex items-center gap-1 ${showExportMenu ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="내보내기"
            >
              <Download className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 w-48"
                >
                  <button
                    onClick={() => { exportToOpenAPI(); setShowExportMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileJson className="w-4 h-4 text-orange-500" />
                    OpenAPI 3.0 (.yaml)
                  </button>
                  <button
                    onClick={() => { exportToPostman(); setShowExportMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4 text-orange-500" />
                    Postman Collection
                  </button>
                  <button
                    onClick={() => { exportToMarkdown(); setShowExportMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileCode className="w-4 h-4 text-blue-500" />
                    Markdown (.md)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* 단축키 */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="단축키 (Ctrl+/)"
          >
            <Keyboard className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-6">
          {error && endpoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                API 엔드포인트를 찾을 수 없습니다
              </h2>
              <p className="text-gray-500 mb-4">{error}</p>
              <p className="text-sm text-gray-400">
                지원 프레임워크: Next.js, Express, FastAPI, Spring
              </p>
            </div>
          ) : viewMode === 'list' ? (
            /* 리스트 뷰 */
            <div className="space-y-4">
              {filteredGroups.map(group => (
                <motion.div
                  key={group.prefix}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleGroup(group.prefix)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition"
                  >
                    {expandedGroups.has(group.prefix) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                      {group.prefix}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({group.endpoints.length} endpoints)
                    </span>
                    <div className="ml-auto flex gap-1">
                      {Array.from(new Set(group.endpoints.map(e => e.method))).map(method => (
                        <span
                          key={method}
                          className={`px-2 py-0.5 text-[10px] font-medium rounded ${methodColors[method].bg} ${methodColors[method].text}`}
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedGroups.has(group.prefix) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-200 dark:border-gray-600"
                      >
                        {group.endpoints.map(ep => (
                          <div
                            key={ep.id}
                            onClick={() => setSelectedEndpoint(ep)}
                            className={`flex items-center gap-4 px-4 py-3 hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition border-b border-gray-100 dark:border-gray-600/50 last:border-b-0 ${
                              selectedEndpoint?.id === ep.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <span className={`px-3 py-1 text-xs font-bold rounded ${methodColors[ep.method].bg} ${methodColors[ep.method].text}`}>
                              {ep.method}
                            </span>
                            <span className="font-mono text-sm text-gray-900 dark:text-white flex-1">
                              {ep.path}
                              {ep.params.length > 0 && (
                                <span className="text-blue-500 ml-2">
                                  {ep.params.map(p => `{${p}}`).join(', ')}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-gray-400">{ep.handler}</span>
                            {ep.isAsync && (
                              <span className="px-2 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded">
                                async
                              </span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(ep.path, ep.id); }}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                              title="경로 복사"
                            >
                              {copied === ep.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigateToCodeElement(ep); }}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                              title="코드 보기"
                            >
                              <Code2 className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            /* 그리드 뷰 */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEndpoints.map(ep => (
                <motion.div
                  key={ep.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedEndpoint(ep)}
                  className={`bg-white dark:bg-gray-700 rounded-xl border-2 p-4 cursor-pointer transition hover:shadow-lg ${
                    methodColors[ep.method].border
                  } ${selectedEndpoint?.id === ep.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 text-xs font-bold rounded ${methodColors[ep.method].bg} ${methodColors[ep.method].text}`}>
                      {ep.method}
                    </span>
                    {ep.isAsync && (
                      <span className="px-2 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded">
                        async
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-sm text-gray-900 dark:text-white mb-2 break-all">
                    {ep.path}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{ep.filePath}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(ep.path, ep.id); }}
                      className="flex-1 py-1.5 text-xs bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition flex items-center justify-center gap-1"
                    >
                      {copied === ep.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      복사
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigateToCodeElement(ep); }}
                      className="flex-1 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition flex items-center justify-center gap-1"
                    >
                      <Code2 className="w-3 h-3" />
                      코드
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : viewMode === 'tree' ? (
            /* 트리 뷰 */
            <div className="space-y-2">
              {Object.entries(endpointTree).map(([segment, node]) => (
                <TreeNode 
                  key={segment} 
                  segment={segment} 
                  node={node} 
                  level={0}
                  onSelect={setSelectedEndpoint}
                  selectedId={selectedEndpoint?.id || null}
                  methodColors={methodColors}
                />
              ))}
            </div>
          ) : null}
        </main>
        
        {/* 상세 패널 */}
        <AnimatePresence>
          {selectedEndpoint && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 350, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex-shrink-0"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">엔드포인트 상세</h3>
                <button
                  onClick={() => setSelectedEndpoint(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 text-sm font-bold rounded ${methodColors[selectedEndpoint.method].bg} ${methodColors[selectedEndpoint.method].text}`}>
                      {selectedEndpoint.method}
                    </span>
                    {selectedEndpoint.isAsync && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded">
                        async
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-lg text-gray-900 dark:text-white break-all">
                    {selectedEndpoint.path}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">파일</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-mono break-all">
                    {selectedEndpoint.filePath}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Line {selectedEndpoint.lineNumber}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">핸들러</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                    {selectedEndpoint.handler}
                  </p>
                </div>
                
                {selectedEndpoint.params.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">경로 파라미터</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEndpoint.params.map(param => (
                        <span key={param} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-sm rounded font-mono">
                          {param}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedEndpoint.description && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">설명</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedEndpoint.description}
                    </p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">프레임워크</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded uppercase">
                      {selectedEndpoint.framework}
                    </span>
                    {selectedEndpoint.apiVersion && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded">
                        {selectedEndpoint.apiVersion}
                      </span>
                    )}
                    {selectedEndpoint.deprecated && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded">
                        Deprecated
                      </span>
                    )}
                  </div>
                </div>
                
                {/* 인증 정보 */}
                {selectedEndpoint.auth && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">인증</h4>
                    <span className={`px-2 py-1 text-xs rounded ${
                      selectedEndpoint.auth === 'none' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                    }`}>
                      <Lock className="w-3 h-3 inline mr-1" />
                      {selectedEndpoint.auth.toUpperCase()}
                    </span>
                  </div>
                )}
                
                {/* 상세 파라미터 테이블 */}
                {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">파라미터 상세</h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">이름</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">타입</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">위치</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500">필수</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {selectedEndpoint.parameters.map((param, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-2 py-1.5 font-mono text-blue-600 dark:text-blue-400">{param.name}</td>
                              <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{param.type}</td>
                              <td className="px-2 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  param.in === 'path' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  param.in === 'query' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                  param.in === 'header' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                  {param.in}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                {param.required ? (
                                  <span className="text-red-500">✓</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* 요청 바디 */}
                {selectedEndpoint.requestBody && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">요청 바디</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Content-Type:</span>
                        <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {selectedEndpoint.requestBody.contentType}
                        </code>
                        {selectedEndpoint.requestBody.required && (
                          <span className="text-xs text-red-500">필수</span>
                        )}
                      </div>
                      {selectedEndpoint.requestBody.schema && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">스키마:</span>
                          <code className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                            {selectedEndpoint.requestBody.schema}
                          </code>
                        </div>
                      )}
                      {selectedEndpoint.requestBody.example && (
                        <div>
                          <span className="text-xs text-gray-500">예제:</span>
                          <pre className="mt-1 text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
                            {selectedEndpoint.requestBody.example}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 응답 정보 */}
                {selectedEndpoint.responses && selectedEndpoint.responses.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">응답</h4>
                    <div className="space-y-1">
                      {selectedEndpoint.responses.map((resp, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded font-mono ${
                            resp.statusCode >= 200 && resp.statusCode < 300 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            resp.statusCode >= 400 && resp.statusCode < 500 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            resp.statusCode >= 500 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {resp.statusCode}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">{resp.description}</span>
                          {resp.contentType && (
                            <code className="text-gray-400">{resp.contentType}</code>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 유효성 검증 */}
                {selectedEndpoint.validation && selectedEndpoint.validation.rules.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">유효성 검증</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 space-y-1">
                      {selectedEndpoint.validation.schema && (
                        <div className="text-xs text-gray-500 mb-2">
                          스키마: <code className="text-purple-600">{selectedEndpoint.validation.schema}</code>
                        </div>
                      )}
                      {selectedEndpoint.validation.rules.slice(0, 5).map((rule, idx) => (
                        <div key={idx} className="text-xs flex items-center gap-2">
                          <span className="font-mono text-blue-600 dark:text-blue-400">{rule.field}</span>
                          <span className="text-gray-400">→</span>
                          <code className="text-gray-600 dark:text-gray-400">{rule.rule}</code>
                        </div>
                      ))}
                      {selectedEndpoint.validation.rules.length > 5 && (
                        <div className="text-xs text-gray-400">
                          +{selectedEndpoint.validation.rules.length - 5}개 더...
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 레이트 리밋 & 캐시 */}
                {(selectedEndpoint.rateLimit || selectedEndpoint.cache) && (
                  <div className="flex gap-4">
                    {selectedEndpoint.rateLimit && (
                      <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">레이트 리밋</div>
                        <div className="text-sm text-orange-800 dark:text-orange-300">
                          {selectedEndpoint.rateLimit.limit}/{selectedEndpoint.rateLimit.window}
                        </div>
                      </div>
                    )}
                    {selectedEndpoint.cache && (
                      <div className="flex-1 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-2">
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">캐시</div>
                        <div className="text-sm text-cyan-800 dark:text-cyan-300">
                          {selectedEndpoint.cache.ttl ? `TTL: ${selectedEndpoint.cache.ttl}s` : selectedEndpoint.cache.strategy}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 미들웨어 */}
                {selectedEndpoint.middleware && selectedEndpoint.middleware.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">미들웨어</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedEndpoint.middleware.map((mw, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded">
                          {mw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 태그 */}
                {selectedEndpoint.tags && selectedEndpoint.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">태그</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedEndpoint.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <button
                    onClick={() => copyToClipboard(selectedEndpoint.path, 'detail')}
                    className="w-full py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
                  >
                    {copied === 'detail' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    경로 복사
                  </button>
                  <button
                    onClick={() => navigateToCodeElement(selectedEndpoint)}
                    className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition flex items-center justify-center gap-2"
                  >
                    <Code2 className="w-4 h-4" />
                    코드 요소에서 보기
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      
      {/* 통계 바 */}
      {stats && (
        <footer className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center gap-6">
          <span className="text-sm text-gray-500">총 {stats.total}개 엔드포인트</span>
          <div className="flex items-center gap-4">
            {Object.entries(stats.byMethod).map(([method, count]) => (
              <span key={method} className="text-xs flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${methodColors[method]?.bg || 'bg-gray-300'}`} />
                <span className="text-gray-600 dark:text-gray-400">{method}: {count}</span>
              </span>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400">
            필터: {filteredEndpoints.length}개 표시
          </span>
        </footer>
      )}
      
      {/* 통계 패널 */}
      <AnimatePresence>
        {showStats && stats && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed right-4 top-20 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-500" />
                API 통계
              </h3>
              <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                <div className="text-3xl font-bold">{stats.total}</div>
                <div className="text-sm opacity-80">총 엔드포인트</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(stats.byMethod).map(([method, count]) => (
                  <div key={method} className={`text-center p-2 rounded-lg ${methodColors[method]?.bg || 'bg-gray-100'}`}>
                    <div className={`text-lg font-bold ${methodColors[method]?.text || 'text-gray-700'}`}>{count}</div>
                    <div className="text-[10px] opacity-70">{method}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400 text-center">
                Framework: <span className="font-medium text-gray-600 dark:text-gray-300 uppercase">{framework}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 단축키 모달 */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
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
                ['1 / 2 / 3', '리스트 / 그리드 / 트리 뷰'],
                ['G / P / D', 'GET / POST / DELETE 필터'],
                ['S', '통계 토글'],
                ['Ctrl + /', '단축키 보기'],
                ['ESC', '모달 닫기'],
              ].map(([key, desc]) => (
                <div key={key as string} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">{key}</kbd>
                  <span className="text-gray-600 dark:text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Curl 모달 */}
      {showCurlModal && selectedEndpoint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCurlModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-xl w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-green-500" />
                cURL 명령어
              </h3>
              <button onClick={() => setShowCurlModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto font-mono">
              {generateCurl(selectedEndpoint)}
            </pre>
            <button
              onClick={() => { copyToClipboard(generateCurl(selectedEndpoint), 'curl'); }}
              className="mt-4 w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
            >
              {copied === 'curl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              복사하기
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// 트리 노드 컴포넌트
function TreeNode({ 
  segment, 
  node, 
  level,
  onSelect,
  selectedId,
  methodColors
}: { 
  segment: string; 
  node: { children: Record<string, any>; endpoints: ApiEndpoint[] };
  level: number;
  onSelect: (ep: ApiEndpoint) => void;
  selectedId: string | null;
  methodColors: Record<string, { bg: string; text: string; border: string }>;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Object.keys(node.children).length > 0 || node.endpoints.length > 0;
  
  return (
    <div style={{ marginLeft: level * 16 }}>
      <div 
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition"
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
        ) : <div className="w-4" />}
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">/{segment}</span>
        {node.endpoints.length > 0 && (
          <div className="flex gap-1 ml-auto">
            {node.endpoints.map(ep => (
              <span
                key={ep.id}
                onClick={(e) => { e.stopPropagation(); onSelect(ep); }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded cursor-pointer hover:ring-2 hover:ring-blue-300 transition ${
                  methodColors[ep.method]?.bg || 'bg-gray-100'
                } ${methodColors[ep.method]?.text || 'text-gray-700'} ${
                  selectedId === ep.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {ep.method}
              </span>
            ))}
          </div>
        )}
      </div>
      {expanded && Object.entries(node.children).map(([childSegment, childNode]) => (
        <TreeNode
          key={childSegment}
          segment={childSegment}
          node={childNode}
          level={level + 1}
          onSelect={onSelect}
          selectedId={selectedId}
          methodColors={methodColors}
        />
      ))}
    </div>
  );
}
