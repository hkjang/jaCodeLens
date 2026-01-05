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
  Zap,
  // v3 icons
  Shield,
  FileText,
  Gauge,
  Activity,
  GitBranch,
  Layers,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Heart,
  TrendingUp,
  Box,
  Link2,
  // v6 new icons
  Eye,
  RotateCcw,
  Sparkles,
  Send,
  Settings,
  Target,
  MoreVertical,
  Bookmark,
  CheckSquare,
  Square,
  ArrowUp,
  Shuffle,
  Server
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
  // v1 분석 필드
  complexity?: {
    score: number;
    factors: string[];
    cyclomaticComplexity?: number;
  };
  documentationScore?: {
    score: number;
    hasDescription: boolean;
    hasParameterDocs: boolean;
    hasResponseDocs: boolean;
    hasExamples: boolean;
  };
  securityAnalysis?: {
    issues: { severity: 'low' | 'medium' | 'high' | 'critical'; message: string; recommendation: string }[];
    hasAuth: boolean;
    hasRateLimit: boolean;
    hasInputValidation: boolean;
    hasSanitization: boolean;
  };
  performance?: {
    hasCaching: boolean;
    hasCompression: boolean;
    hasPagination: boolean;
    estimatedLatency?: 'low' | 'medium' | 'high';
  };
  // v2 분석 필드
  namingConvention?: {
    followsRESTful: boolean;
    usesKebabCase: boolean;
    usesCamelCase: boolean;
    usesSnakeCase: boolean;
    issues: string[];
    score: number;
  };
  consistency?: {
    responseFormat: string;
    errorHandling: string;
    versioningStyle: string;
  };
  healthScore?: {
    overall: number;
    security: number;
    documentation: number;
    performance: number;
    naming: number;
  };
  changeRisk?: {
    level: 'low' | 'medium' | 'high';
    breakingChangeRisk: boolean;
    dependentEndpoints: string[];
  };
  // v3 분석 필드
  similarity?: {
    similarEndpoints: { path: string; method: string; score: number }[];
    potentialDuplicate: boolean;
  };
  mockData?: {
    responseExample: string;
    requestExample?: string;
    generatedAt?: string;
  };
  sdkSnippets?: {
    typescript?: string;
    python?: string;
    curl?: string;
    javascript?: string;
  };
  dependencies?: {
    callsEndpoints: string[];
    calledByEndpoints: string[];
    externalApis: string[];
  };
  usageHints?: {
    recommendedHeaders: { name: string; value: string; description: string }[];
    commonErrors: { code: number; message: string; solution: string }[];
    bestPractices: string[];
  };
}

interface ApiGroup {
  prefix: string;
  endpoints: ApiEndpoint[];
}

// v6 새로운 인터페이스
interface RequestHistoryItem {
  id: string;
  endpointId: string;
  method: string;
  path: string;
  timestamp: Date;
  status: number;
  responseTime: number;
  request: { headers: string; body: string; queryParams: string };
  response: string;
}

interface Environment {
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
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
  const [detailTab, setDetailTab] = useState<'info' | 'analysis' | 'sdk' | 'mock' | 'deps' | 'test'>('info');
  
  // v4 추가 기능
  const [showTryIt, setShowTryIt] = useState(false);
  const [testRequest, setTestRequest] = useState({ 
    headers: '{\n  "Content-Type": "application/json"\n}',
    body: '{}',
    queryParams: ''
  });
  const [testResponse, setTestResponse] = useState<{ status: number; body: string; time: number } | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [showSimilarityPanel, setShowSimilarityPanel] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  
  // v5 추가 기능
  const [quickFilter, setQuickFilter] = useState<string | null>(null); // 'auth', 'deprecated', 'complex', 'lowHealth'
  const [selectedEndpoints, setSelectedEndpoints] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [compareEndpoints, setCompareEndpoints] = useState<[ApiEndpoint | null, ApiEndpoint | null]>([null, null]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
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
  
  // v6 추가 기능
  const [requestHistory, setRequestHistory] = useState<RequestHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`api-request-history-${projectId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [environments, setEnvironments] = useState<Environment[]>([
    { name: 'Local', baseUrl: 'http://localhost:3000', variables: {} },
    { name: 'Staging', baseUrl: 'https://staging.api.example.com', variables: { 'API_KEY': 'stg_key' } },
    { name: 'Production', baseUrl: 'https://api.example.com', variables: { 'API_KEY': 'prod_key' } },
  ]);
  const [selectedEnv, setSelectedEnv] = useState(0);
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<string>>(new Set());
  const [showFab, setShowFab] = useState(true);
  const [showRadarChart, setShowRadarChart] = useState(false);
  const [showRequestHistory, setShowRequestHistory] = useState(false);
  const [showEnvSettings, setShowEnvSettings] = useState(false);
  
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
      
      // 빠른 필터
      let matchesQuickFilter = true;
      if (quickFilter === 'auth') {
        matchesQuickFilter = !!(ep.auth && ep.auth !== 'none');
      } else if (quickFilter === 'noAuth') {
        matchesQuickFilter = !ep.auth || ep.auth === 'none';
      } else if (quickFilter === 'deprecated') {
        matchesQuickFilter = !!ep.deprecated;
      } else if (quickFilter === 'complex') {
        matchesQuickFilter = !!(ep.complexity && ep.complexity.score >= 7);
      } else if (quickFilter === 'lowHealth') {
        matchesQuickFilter = !!(ep.healthScore && ep.healthScore.overall < 50);
      } else if (quickFilter === 'favorites') {
        matchesQuickFilter = favorites.has(ep.id);
      } else if (quickFilter === 'duplicate') {
        matchesQuickFilter = !!ep.similarity?.potentialDuplicate;
      }
      
      return matchesSearch && matchesMethod && matchesQuickFilter;
    });
  }, [endpoints, searchQuery, selectedMethod, quickFilter, favorites]);
  
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
  
  // 엔드포인트 선택 핸들러 (비교 모드 지원)
  const handleEndpointSelect = useCallback((ep: ApiEndpoint) => {
    if (batchSelectMode) {
      // 배치 선택 모드: 선택 토글
      setBatchSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(ep.id)) {
          next.delete(ep.id);
        } else {
          next.add(ep.id);
        }
        return next;
      });
    } else if (compareMode) {
      // 비교 모드: 비교 패널에 추가
      setCompareEndpoints(prev => {
        if (!prev[0]) return [ep, prev[1]];
        if (!prev[1]) return [prev[0], ep];
        return [ep, prev[1]]; // 첫 번째 교체
      });
    } else {
      // 일반 모드: 상세 패널에 표시
      setSelectedEndpoint(ep);
      setRecentlyViewed(prev => [ep.id, ...prev.filter(id => id !== ep.id)].slice(0, 10));
      setDetailTab('info');
    }
  }, [compareMode, batchSelectMode]);
  
  // v6: 요청 기록 추가
  const addRequestHistory = useCallback((item: Omit<RequestHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: RequestHistoryItem = {
      ...item,
      id: `req-${Date.now()}`,
      timestamp: new Date(),
    };
    setRequestHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 20);
      localStorage.setItem(`api-request-history-${projectId}`, JSON.stringify(updated));
      return updated;
    });
  }, [projectId]);
  
  // v6: 배치 선택 토글
  const toggleBatchSelect = useCallback((id: string) => {
    setBatchSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  // v6: 전체 선택/해제
  const toggleSelectAll = useCallback(() => {
    if (batchSelectedIds.size === filteredEndpoints.length) {
      setBatchSelectedIds(new Set());
    } else {
      setBatchSelectedIds(new Set(filteredEndpoints.map(ep => ep.id)));
    }
  }, [batchSelectedIds.size, filteredEndpoints]);
  
  // v6: 선택된 엔드포인트 일괄 내보내기
  const exportSelectedEndpoints = useCallback(() => {
    const selected = endpoints.filter(ep => batchSelectedIds.has(ep.id));
    if (selected.length === 0) return;
    
    let md = `# Selected API Endpoints\n\n`;
    md += `> Exported ${selected.length} endpoints on ${new Date().toLocaleDateString()}\n\n`;
    md += `| Method | Path | Handler |\n`;
    md += `|--------|------|--------|\n`;
    
    for (const ep of selected) {
      md += `| \`${ep.method}\` | \`${ep.path}\` | ${ep.handler} |\n`;
    }
    
    downloadFile(md, `selected-endpoints.md`, 'text/markdown');
    setBatchSelectMode(false);
    setBatchSelectedIds(new Set());
  }, [endpoints, batchSelectedIds]);
  
  // v6: 선택된 엔드포인트 경로 일괄 복사
  const copySelectedPaths = useCallback(() => {
    const selected = endpoints.filter(ep => batchSelectedIds.has(ep.id));
    const paths = selected.map(ep => `${ep.method} ${ep.path}`).join('\n');
    navigator.clipboard.writeText(paths);
    setCopied('batch-paths');
    setTimeout(() => setCopied(null), 2000);
  }, [endpoints, batchSelectedIds]);
  
  // v6: 맨 위로 스크롤
  const scrollToTop = useCallback(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // v6: 랜덤 엔드포인트 선택
  const selectRandomEndpoint = useCallback(() => {
    if (filteredEndpoints.length === 0) return;
    const random = filteredEndpoints[Math.floor(Math.random() * filteredEndpoints.length)];
    setSelectedEndpoint(random);
    setDetailTab('info');
  }, [filteredEndpoints]);

  
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
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm relative">
      {/* v6: 애니메이션 그라데이션 오버레이 */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 animate-pulse pointer-events-none" />
      
      {/* v6: 배치 선택 모드 액션바 */}
      <AnimatePresence>
        {batchSelectMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 flex items-center justify-between flex-shrink-0 z-10"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition"
              >
                {batchSelectedIds.size === filteredEndpoints.length ? (
                  <><CheckSquare className="w-4 h-4" /> 전체 해제</>
                ) : (
                  <><Square className="w-4 h-4" /> 전체 선택</>
                )}
              </button>
              <span className="text-sm opacity-80">
                {batchSelectedIds.size}개 선택됨
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copySelectedPaths}
                disabled={batchSelectedIds.size === 0}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition disabled:opacity-50"
              >
                {copied === 'batch-paths' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                경로 복사
              </button>
              <button
                onClick={exportSelectedEndpoints}
                disabled={batchSelectedIds.size === 0}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                내보내기
              </button>
              <button
                onClick={() => { setBatchSelectMode(false); setBatchSelectedIds(new Set()); }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 헤더 - v6: glassmorphism 효과 */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/projects/${projectId}/code-elements`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="코드 요소로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25 animate-pulse">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                API Endpoints Map
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </h1>
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
          
          {/* v6: 환경 선택기 */}
          <div className="relative ml-4">
            <select
              value={selectedEnv}
              onChange={e => setSelectedEnv(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none pr-8"
            >
              {environments.map((env, idx) => (
                <option key={env.name} value={idx}>
                  🌐 {env.name}
                </option>
              ))}
            </select>
            <Server className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          
          {/* 검색 */}
          <div className="relative ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="엔드포인트 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-56 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* v6: 배치 선택 모드 버튼 */}
          <button
            onClick={() => { setBatchSelectMode(!batchSelectMode); if (batchSelectMode) setBatchSelectedIds(new Set()); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1 ${
              batchSelectMode
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="일괄 선택"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            일괄
          </button>
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          
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
          
          {/* 빠른 필터 */}
          <div className="flex items-center gap-1">
            {[
              { key: 'favorites', label: '⭐', title: '즐겨찾기' },
              { key: 'auth', label: '🔒', title: '인증 있음' },
              { key: 'noAuth', label: '🔓', title: '인증 없음' },
              { key: 'deprecated', label: '⚠️', title: 'Deprecated' },
              { key: 'complex', label: '🔴', title: '복잡도 높음' },
              { key: 'lowHealth', label: '💔', title: '헬스 낮음' },
              { key: 'duplicate', label: '👯', title: '중복 가능성' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setQuickFilter(quickFilter === f.key ? null : f.key)}
                className={`px-2 py-1 text-xs rounded transition ${
                  quickFilter === f.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={f.title}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
          
          {/* 비교 모드 */}
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) {
                setCompareEndpoints([null, null]);
                setSelectedEndpoints(new Set());
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1 ${
              compareMode
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="비교 모드"
          >
            <Layers className="w-3.5 h-3.5" />
            {compareMode ? '비교 중' : '비교'}
          </button>
          
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
              animate={{ width: 420, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex-shrink-0 flex flex-col"
            >
              {/* Header with Health Score */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm font-bold rounded ${methodColors[selectedEndpoint.method].bg} ${methodColors[selectedEndpoint.method].text}`}>
                      {selectedEndpoint.method}
                    </span>
                    {selectedEndpoint.healthScore && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        selectedEndpoint.healthScore.overall >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        selectedEndpoint.healthScore.overall >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        selectedEndpoint.healthScore.overall >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        <Heart className="w-3 h-3" />
                        {selectedEndpoint.healthScore.overall}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedEndpoint(null)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                  {selectedEndpoint.path}
                </p>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
                {[
                  { key: 'info', label: '정보', icon: Info },
                  { key: 'analysis', label: '분석', icon: Activity },
                  { key: 'sdk', label: 'SDK', icon: Code2 },
                  { key: 'mock', label: 'Mock', icon: Box },
                  { key: 'deps', label: '의존성', icon: GitBranch },
                  { key: 'test', label: 'Test', icon: Play },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key as typeof detailTab)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition whitespace-nowrap border-b-2 ${
                      detailTab === tab.key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 정보 탭 */}
                {detailTab === 'info' && (
                  <>
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
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-xs rounded">
                            {selectedEndpoint.apiVersion}
                          </span>
                        )}
                        {selectedEndpoint.deprecated && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 text-xs rounded">
                            Deprecated
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {selectedEndpoint.auth && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">인증</h4>
                        <span className={`px-2 py-1 text-xs rounded flex items-center gap-1 w-fit ${
                          selectedEndpoint.auth === 'none' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                        }`}>
                          <Lock className="w-3 h-3" />
                          {selectedEndpoint.auth.toUpperCase()}
                        </span>
                      </div>
                    )}
                    
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
                  </>
                )}
                
                {/* 분석 탭 - v7: Enhanced Analysis */}
                {detailTab === 'analysis' && (
                  <>
                    {/* v7: Radar Chart for Health Scores */}
                    {selectedEndpoint.healthScore && (
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" /> API 헬스 레이더
                        </h4>
                        
                        {/* SVG Radar Chart */}
                        <div className="flex items-center justify-center mb-4">
                          <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
                            {/* Background circles */}
                            {[1, 2, 3, 4].map(level => (
                              <circle key={level} cx="80" cy="80" r={level * 18} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" />
                            ))}
                            
                            {/* Radar polygon */}
                            <polygon
                              points={(() => {
                                const scores = [
                                  selectedEndpoint.healthScore?.overall ?? 0,
                                  selectedEndpoint.healthScore?.security ?? 0,
                                  selectedEndpoint.healthScore?.documentation ?? 0,
                                  selectedEndpoint.healthScore?.performance ?? 0,
                                  selectedEndpoint.healthScore?.naming ?? 0,
                                ];
                                return scores.map((score, i) => {
                                  const angle = (i / 5) * Math.PI * 2;
                                  const r = (score / 100) * 72;
                                  const x = 80 + Math.cos(angle) * r;
                                  const y = 80 + Math.sin(angle) * r;
                                  return `${x},${y}`;
                                }).join(' ');
                              })()}
                              fill="rgba(20, 184, 166, 0.3)"
                              stroke="rgb(20, 184, 166)"
                              strokeWidth="2"
                            />
                            
                            {/* Data points */}
                            {[
                              selectedEndpoint.healthScore?.overall ?? 0,
                              selectedEndpoint.healthScore?.security ?? 0,
                              selectedEndpoint.healthScore?.documentation ?? 0,
                              selectedEndpoint.healthScore?.performance ?? 0,
                              selectedEndpoint.healthScore?.naming ?? 0,
                            ].map((score, i) => {
                              const angle = (i / 5) * Math.PI * 2;
                              const r = (score / 100) * 72;
                              const x = 80 + Math.cos(angle) * r;
                              const y = 80 + Math.sin(angle) * r;
                              return (
                                <circle key={i} cx={x} cy={y} r="4" fill="rgb(20, 184, 166)" />
                              );
                            })}
                          </svg>
                        </div>
                        
                        {/* Score Labels with Progress Bars */}
                        <div className="space-y-2">
                          {[
                            { label: '전체 헬스', value: selectedEndpoint.healthScore.overall, icon: '❤️' },
                            { label: '보안', value: selectedEndpoint.healthScore.security, icon: '🔒' },
                            { label: '문서화', value: selectedEndpoint.healthScore.documentation, icon: '📚' },
                            { label: '성능', value: selectedEndpoint.healthScore.performance, icon: '⚡' },
                            { label: '네이밍', value: selectedEndpoint.healthScore.naming, icon: '🏷️' },
                          ].map(item => (
                            <div key={item.label} className="flex items-center gap-2">
                              <span className="text-xs w-20 flex items-center gap-1">
                                <span>{item.icon}</span>
                                <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                              </span>
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.value}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${
                                    item.value >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                    item.value >= 60 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                                    item.value >= 40 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                    'bg-gradient-to-r from-red-400 to-red-500'
                                  }`}
                                />
                              </div>
                              <span className={`text-xs font-bold w-8 text-right ${
                                item.value >= 80 ? 'text-green-600' :
                                item.value >= 60 ? 'text-blue-600' :
                                item.value >= 40 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* v7: Improvement Recommendations */}
                        {selectedEndpoint.healthScore.overall < 80 && (
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <h5 className="text-[10px] font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> 개선 추천
                            </h5>
                            <div className="space-y-1">
                              {selectedEndpoint.healthScore.security < 60 && (
                                <div className="text-[10px] text-orange-600 dark:text-orange-400 flex items-start gap-1">
                                  <span>•</span> 인증 및 Rate Limiting 추가 필요
                                </div>
                              )}
                              {selectedEndpoint.healthScore.documentation < 60 && (
                                <div className="text-[10px] text-orange-600 dark:text-orange-400 flex items-start gap-1">
                                  <span>•</span> JSDoc/OpenAPI 문서 추가 권장
                                </div>
                              )}
                              {selectedEndpoint.healthScore.performance < 60 && (
                                <div className="text-[10px] text-orange-600 dark:text-orange-400 flex items-start gap-1">
                                  <span>•</span> 캐싱 또는 페이지네이션 고려
                                </div>
                              )}
                              {selectedEndpoint.healthScore.naming < 60 && (
                                <div className="text-[10px] text-orange-600 dark:text-orange-400 flex items-start gap-1">
                                  <span>•</span> RESTful 네이밍 규칙 검토 필요
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* v7: Documentation Score Breakdown */}
                    {selectedEndpoint.documentationScore && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-3 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> 문서화 분석
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: '설명', value: selectedEndpoint.documentationScore.hasDescription, icon: '📝' },
                            { label: '파라미터 문서', value: selectedEndpoint.documentationScore.hasParameterDocs, icon: '📋' },
                            { label: '응답 문서', value: selectedEndpoint.documentationScore.hasResponseDocs, icon: '📤' },
                            { label: '예제', value: selectedEndpoint.documentationScore.hasExamples, icon: '💡' },
                          ].map(item => (
                            <div key={item.label} className={`flex items-center gap-2 text-xs p-2 rounded ${
                              item.value ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                              {item.value ? <CheckCircle className="w-3 h-3 ml-auto" /> : <XCircle className="w-3 h-3 ml-auto opacity-50" />}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-center">
                          <span className={`text-2xl font-bold ${
                            selectedEndpoint.documentationScore.score >= 80 ? 'text-green-600' :
                            selectedEndpoint.documentationScore.score >= 50 ? 'text-blue-600' :
                            'text-red-600'
                          }`}>{selectedEndpoint.documentationScore.score}</span>
                          <span className="text-xs text-gray-400">/100 문서화 점수</span>
                        </div>
                      </div>
                    )}
                    
                    {/* v7: Performance Analysis */}
                    {selectedEndpoint.performance && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase mb-3 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" /> 성능 분석
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className={`p-2 rounded-lg ${selectedEndpoint.performance.hasCaching ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <div className="text-lg">{selectedEndpoint.performance.hasCaching ? '✅' : '❌'}</div>
                            <div className="text-[10px] text-gray-500">캐싱</div>
                          </div>
                          <div className={`p-2 rounded-lg ${selectedEndpoint.performance.hasCompression ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <div className="text-lg">{selectedEndpoint.performance.hasCompression ? '✅' : '❌'}</div>
                            <div className="text-[10px] text-gray-500">압축</div>
                          </div>
                          <div className={`p-2 rounded-lg ${selectedEndpoint.performance.hasPagination ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <div className="text-lg">{selectedEndpoint.performance.hasPagination ? '✅' : '❌'}</div>
                            <div className="text-[10px] text-gray-500">페이징</div>
                          </div>
                        </div>
                        {selectedEndpoint.performance.estimatedLatency && (
                          <div className="mt-3 flex items-center justify-center gap-2">
                            <span className="text-xs text-gray-500">예상 지연:</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              selectedEndpoint.performance.estimatedLatency === 'low' ? 'bg-green-100 text-green-700' :
                              selectedEndpoint.performance.estimatedLatency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {selectedEndpoint.performance.estimatedLatency === 'low' ? '🚀 빠름' :
                               selectedEndpoint.performance.estimatedLatency === 'medium' ? '⚡ 보통' : '🐢 느림'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* v7: Enhanced Naming Convention */}
                    {selectedEndpoint.namingConvention && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-3 flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" /> 네이밍 규칙
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-2 py-1 text-[10px] rounded ${selectedEndpoint.namingConvention.followsRESTful ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {selectedEndpoint.namingConvention.followsRESTful ? '✓' : '✗'} RESTful
                          </span>
                          <span className={`px-2 py-1 text-[10px] rounded ${selectedEndpoint.namingConvention.usesKebabCase ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            kebab-case
                          </span>
                          <span className={`px-2 py-1 text-[10px] rounded ${selectedEndpoint.namingConvention.usesSnakeCase ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            snake_case
                          </span>
                          <span className={`px-2 py-1 text-[10px] rounded ${selectedEndpoint.namingConvention.usesCamelCase ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            camelCase
                          </span>
                        </div>
                        {selectedEndpoint.namingConvention.issues.length > 0 && (
                          <div className="space-y-1">
                            {selectedEndpoint.namingConvention.issues.map((issue, i) => (
                              <div key={i} className="text-[10px] text-orange-600 flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                {issue}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 복잡도 - v7: Enhanced visualization */}
                    {selectedEndpoint.complexity && (
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700/50 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5" /> 복잡도 분석
                        </h4>
                        <div className="flex items-center gap-4">
                          {/* Circular gauge */}
                          <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90">
                              <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-gray-700" />
                              <circle
                                cx="40" cy="40" r="34"
                                fill="none"
                                strokeWidth="6"
                                strokeLinecap="round"
                                stroke={selectedEndpoint.complexity.score <= 3 ? '#22c55e' : selectedEndpoint.complexity.score <= 6 ? '#eab308' : '#ef4444'}
                                strokeDasharray={`${(selectedEndpoint.complexity.score / 10) * 213.6} 213.6`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`text-xl font-bold ${
                                selectedEndpoint.complexity.score <= 3 ? 'text-green-600' :
                                selectedEndpoint.complexity.score <= 6 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>{selectedEndpoint.complexity.score}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-medium mb-1 ${
                              selectedEndpoint.complexity.score <= 3 ? 'text-green-600' :
                              selectedEndpoint.complexity.score <= 6 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {selectedEndpoint.complexity.score <= 3 ? '간단함' :
                               selectedEndpoint.complexity.score <= 6 ? '보통' : '복잡함'}
                            </div>
                            {selectedEndpoint.complexity.cyclomaticComplexity && (
                              <div className="text-[10px] text-gray-400">
                                순환 복잡도: {selectedEndpoint.complexity.cyclomaticComplexity}
                              </div>
                            )}
                            {selectedEndpoint.complexity.factors.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {selectedEndpoint.complexity.factors.slice(0, 3).map((f, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-[9px] rounded">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 보안 분석 - v7: Enhanced */}
                    {selectedEndpoint.securityAnalysis && (
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-3 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" /> 보안 분석
                        </h4>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {[
                            { label: '인증', value: selectedEndpoint.securityAnalysis.hasAuth, critical: true },
                            { label: 'Rate Limit', value: selectedEndpoint.securityAnalysis.hasRateLimit, critical: false },
                            { label: '입력 검증', value: selectedEndpoint.securityAnalysis.hasInputValidation, critical: false },
                            { label: '데이터 정화', value: selectedEndpoint.securityAnalysis.hasSanitization, critical: false },
                          ].map(item => (
                            <div key={item.label} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                              item.value ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              item.critical ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            }`}>
                              {item.value ? <CheckCircle className="w-4 h-4" /> : item.critical ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                              <span className="font-medium">{item.label}</span>
                            </div>
                          ))}
                        </div>
                        {selectedEndpoint.securityAnalysis.issues.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-[10px] font-semibold text-gray-500 uppercase">보안 이슈</h5>
                            {selectedEndpoint.securityAnalysis.issues.slice(0, 4).map((issue, i) => (
                              <div key={i} className={`text-xs p-2 rounded-lg border-l-4 ${
                                issue.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-300' :
                                issue.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/20 border-orange-500 text-orange-800 dark:text-orange-300' :
                                issue.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-300' :
                                'bg-blue-100 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300'
                              }`}>
                                <div className="flex items-center gap-1 font-medium">
                                  <span className="uppercase text-[10px]">{issue.severity}</span>
                                </div>
                                <div className="mt-0.5">{issue.message}</div>
                                {issue.recommendation && (
                                  <div className="text-[10px] mt-1 opacity-75">💡 {issue.recommendation}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 변경 위험도 - v7: Enhanced */}
                    {selectedEndpoint.changeRisk && (
                      <div className={`rounded-xl p-4 ${
                        selectedEndpoint.changeRisk.level === 'high' ? 'bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20' :
                        selectedEndpoint.changeRisk.level === 'medium' ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-800/20' :
                        'bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20'
                      }`}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> 변경 위험도
                        </h4>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                            selectedEndpoint.changeRisk.level === 'high' ? 'bg-red-500 text-white' :
                            selectedEndpoint.changeRisk.level === 'medium' ? 'bg-yellow-500 text-white' :
                            'bg-green-500 text-white'
                          }`}>
                            {selectedEndpoint.changeRisk.level === 'high' ? '⚠️ HIGH' :
                             selectedEndpoint.changeRisk.level === 'medium' ? '⚡ MEDIUM' : '✅ LOW'}
                          </div>
                          {selectedEndpoint.changeRisk.breakingChangeRisk && (
                            <span className="px-2 py-1 bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300 text-[10px] font-medium rounded flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Breaking Change 위험
                            </span>
                          )}
                        </div>
                        {selectedEndpoint.changeRisk.dependentEndpoints && selectedEndpoint.changeRisk.dependentEndpoints.length > 0 && (
                          <div className="text-[10px] text-gray-500">
                            의존 엔드포인트: {selectedEndpoint.changeRisk.dependentEndpoints.length}개
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* v7: 분석 데이터 없음 표시 */}
                    {!selectedEndpoint.healthScore && !selectedEndpoint.complexity && !selectedEndpoint.securityAnalysis && (
                      <div className="text-center py-12 text-gray-400">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">분석 데이터가 없습니다</p>
                        <p className="text-xs mt-1">엔드포인트 분석을 실행해 주세요</p>
                      </div>
                    )}
                  </>
                )}
                
                {/* SDK 탭 */}
                {detailTab === 'sdk' && selectedEndpoint.sdkSnippets && (
                  <div className="space-y-4">
                    {[
                      { key: 'curl', label: 'cURL', code: selectedEndpoint.sdkSnippets.curl },
                      { key: 'typescript', label: 'TypeScript', code: selectedEndpoint.sdkSnippets.typescript },
                      { key: 'python', label: 'Python', code: selectedEndpoint.sdkSnippets.python },
                      { key: 'javascript', label: 'JavaScript (Axios)', code: selectedEndpoint.sdkSnippets.javascript },
                    ].map(snippet => snippet.code && (
                      <div key={snippet.key}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase">{snippet.label}</h4>
                          <button
                            onClick={() => copyToClipboard(snippet.code || '', `sdk-${snippet.key}`)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            {copied === `sdk-${snippet.key}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            복사
                          </button>
                        </div>
                        <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto max-h-40">
                          {snippet.code}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Mock 탭 */}
                {detailTab === 'mock' && selectedEndpoint.mockData && (
                  <div className="space-y-4">
                    {selectedEndpoint.mockData.requestExample && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase">요청 예시</h4>
                          <button
                            onClick={() => copyToClipboard(selectedEndpoint.mockData?.requestExample || '', 'mock-req')}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            {copied === 'mock-req' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            복사
                          </button>
                        </div>
                        <pre className="bg-blue-900 text-blue-200 text-xs p-3 rounded-lg overflow-x-auto max-h-48">
                          {selectedEndpoint.mockData.requestExample}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase">응답 예시</h4>
                        <button
                          onClick={() => copyToClipboard(selectedEndpoint.mockData?.responseExample || '', 'mock-res')}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          {copied === 'mock-res' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          복사
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto max-h-60">
                        {selectedEndpoint.mockData.responseExample}
                      </pre>
                    </div>
                    <p className="text-[10px] text-gray-400 text-right">
                      생성: {selectedEndpoint.mockData.generatedAt ? new Date(selectedEndpoint.mockData.generatedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                )}
                
                {/* 의존성 탭 */}
                {detailTab === 'deps' && (
                  <div className="space-y-4">
                    {selectedEndpoint.dependencies && (
                      <>
                        {selectedEndpoint.dependencies.callsEndpoints.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" /> 호출하는 엔드포인트
                            </h4>
                            <div className="space-y-1">
                              {selectedEndpoint.dependencies.callsEndpoints.map((ep, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                  <Link2 className="w-3 h-3 text-blue-500" />
                                  <code className="text-blue-700 dark:text-blue-400">{ep}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedEndpoint.dependencies.calledByEndpoints.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                              <GitBranch className="w-3.5 h-3.5" /> 호출되는 곳
                            </h4>
                            <div className="space-y-1">
                              {selectedEndpoint.dependencies.calledByEndpoints.map((ep, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                  <Link2 className="w-3 h-3 text-green-500" />
                                  <code className="text-green-700 dark:text-green-400">{ep}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedEndpoint.dependencies.externalApis.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" /> 외부 API
                            </h4>
                            <div className="space-y-1">
                              {selectedEndpoint.dependencies.externalApis.map((api, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                                  <Globe className="w-3 h-3 text-purple-500" />
                                  <span className="text-purple-700 dark:text-purple-400">{api}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedEndpoint.dependencies.callsEndpoints.length === 0 && 
                         selectedEndpoint.dependencies.calledByEndpoints.length === 0 && 
                         selectedEndpoint.dependencies.externalApis.length === 0 && (
                          <div className="text-center py-8 text-gray-400">
                            <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">의존성 정보가 없습니다</p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* 사용 힌트 */}
                    {selectedEndpoint.usageHints && (
                      <>
                        {selectedEndpoint.usageHints.recommendedHeaders.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">권장 헤더</h4>
                            <div className="space-y-1">
                              {selectedEndpoint.usageHints.recommendedHeaders.map((h, i) => (
                                <div key={i} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                  <code className="text-blue-600">{h.name}</code>: <span className="text-gray-500">{h.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedEndpoint.usageHints.commonErrors.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">일반적인 에러</h4>
                            <div className="space-y-1">
                              {selectedEndpoint.usageHints.commonErrors.slice(0, 3).map((e, i) => (
                                <div key={i} className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                  <span className="font-mono text-red-600">{e.code}</span> - {e.message}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedEndpoint.usageHints.bestPractices.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">베스트 프랙티스</h4>
                            <ul className="space-y-1">
                              {selectedEndpoint.usageHints.bestPractices.slice(0, 3).map((p, i) => (
                                <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                {/* Test 탭 (Try It Now) */}
                {detailTab === 'test' && (
                  <div className="space-y-4">
                    {/* 요청 URL 미리보기 - v6: 환경 표시 */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded">
                          {environments[selectedEnv]?.name || 'Local'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${methodColors[selectedEndpoint.method].bg} ${methodColors[selectedEndpoint.method].text}`}>
                          {selectedEndpoint.method}
                        </span>
                        <code className="text-sm text-gray-700 dark:text-gray-300 break-all">
                          {environments[selectedEnv]?.baseUrl || 'http://localhost:3000'}{selectedEndpoint.path}{testRequest.queryParams ? `?${testRequest.queryParams}` : ''}
                        </code>
                      </div>
                    </div>
                    
                    {/* Query Parameters */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Query Parameters</h4>
                      <input
                        type="text"
                        placeholder="key1=value1&key2=value2"
                        value={testRequest.queryParams}
                        onChange={e => setTestRequest(prev => ({ ...prev, queryParams: e.target.value }))}
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    {/* Headers */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Headers (JSON)</h4>
                      <textarea
                        value={testRequest.headers}
                        onChange={e => setTestRequest(prev => ({ ...prev, headers: e.target.value }))}
                        className="w-full h-20 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                      />
                    </div>
                    
                    {/* Request Body */}
                    {['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Request Body (JSON)</h4>
                        <textarea
                          value={testRequest.body}
                          onChange={e => setTestRequest(prev => ({ ...prev, body: e.target.value }))}
                          className="w-full h-24 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                          placeholder="{}"
                        />
                      </div>
                    )}
                    
                    {/* Execute Button */}
                    <button
                      onClick={async () => {
                        if (!selectedEndpoint) return;
                        setIsTestLoading(true);
                        setTestResponse(null);
                        const startTime = Date.now();
                        try {
                          // v6: Use selected environment's baseUrl
                          const baseUrl = environments[selectedEnv]?.baseUrl || 'http://localhost:3000';
                          const url = `${baseUrl}${selectedEndpoint.path}${testRequest.queryParams ? `?${testRequest.queryParams}` : ''}`;
                          const headers = JSON.parse(testRequest.headers);
                          const options: RequestInit = {
                            method: selectedEndpoint.method,
                            headers,
                          };
                          if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && testRequest.body) {
                            options.body = testRequest.body;
                          }
                          const res = await fetch(url, options);
                          const body = await res.text();
                          const responseTime = Date.now() - startTime;
                          
                          setTestResponse({
                            status: res.status,
                            body: body,
                            time: responseTime,
                          });
                          
                          // v6: Save to request history
                          addRequestHistory({
                            endpointId: selectedEndpoint.id,
                            method: selectedEndpoint.method,
                            path: selectedEndpoint.path,
                            status: res.status,
                            responseTime: responseTime,
                            request: testRequest,
                            response: body.substring(0, 500),
                          });
                        } catch (err) {
                          const responseTime = Date.now() - startTime;
                          setTestResponse({
                            status: 0,
                            body: err instanceof Error ? err.message : 'Request failed',
                            time: responseTime,
                          });
                        } finally {
                          setIsTestLoading(false);
                        }
                      }}
                      disabled={isTestLoading}
                      className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isTestLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          요청 중...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          요청 실행
                        </>
                      )}
                    </button>
                    
                    {/* Response */}
                    {testResponse && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase">Response</h4>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-mono rounded ${
                              testResponse.status >= 200 && testResponse.status < 300 ? 'bg-green-100 text-green-700' :
                              testResponse.status >= 400 && testResponse.status < 500 ? 'bg-yellow-100 text-yellow-700' :
                              testResponse.status >= 500 ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {testResponse.status || 'Error'}
                            </span>
                            <span className="text-[10px] text-gray-400">{testResponse.time}ms</span>
                          </div>
                        </div>
                        <pre className={`text-xs p-3 rounded-lg overflow-x-auto max-h-60 ${
                          testResponse.status >= 200 && testResponse.status < 300 
                            ? 'bg-gray-900 text-green-400' 
                            : 'bg-red-900/50 text-red-300'
                        }`}>
                          {(() => {
                            try {
                              return JSON.stringify(JSON.parse(testResponse.body), null, 2);
                            } catch {
                              return testResponse.body;
                            }
                          })()}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(testResponse.body, 'test-response')}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          {copied === 'test-response' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          응답 복사
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
            className="fixed right-4 top-20 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 max-h-[calc(100vh-8rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-500" />
                API 통계 대시보드
              </h3>
              <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {/* 총 엔드포인트 */}
              <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                <div className="text-3xl font-bold">{stats.total}</div>
                <div className="text-sm opacity-80">총 엔드포인트</div>
              </div>
              
              {/* 메서드별 분포 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">메서드 분포</h4>
                <div className="space-y-2">
                  {Object.entries(stats.byMethod).map(([method, count]) => (
                    <div key={method} className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${methodColors[method]?.bg} ${methodColors[method]?.text}`}>
                        {method}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            method === 'GET' ? 'bg-green-500' :
                            method === 'POST' ? 'bg-blue-500' :
                            method === 'PUT' ? 'bg-yellow-500' :
                            method === 'PATCH' ? 'bg-orange-500' :
                            method === 'DELETE' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 헬스 스코어 분포 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">헬스 스코어 분포</h4>
                <div className="grid grid-cols-4 gap-1">
                  <div className="text-center p-2 rounded bg-green-100 dark:bg-green-900/30">
                    <div className="text-sm font-bold text-green-600">{endpoints.filter(e => e.healthScore && e.healthScore.overall >= 80).length}</div>
                    <div className="text-[9px] text-green-700">우수</div>
                  </div>
                  <div className="text-center p-2 rounded bg-blue-100 dark:bg-blue-900/30">
                    <div className="text-sm font-bold text-blue-600">{endpoints.filter(e => e.healthScore && e.healthScore.overall >= 60 && e.healthScore.overall < 80).length}</div>
                    <div className="text-[9px] text-blue-700">양호</div>
                  </div>
                  <div className="text-center p-2 rounded bg-yellow-100 dark:bg-yellow-900/30">
                    <div className="text-sm font-bold text-yellow-600">{endpoints.filter(e => e.healthScore && e.healthScore.overall >= 40 && e.healthScore.overall < 60).length}</div>
                    <div className="text-[9px] text-yellow-700">보통</div>
                  </div>
                  <div className="text-center p-2 rounded bg-red-100 dark:bg-red-900/30">
                    <div className="text-sm font-bold text-red-600">{endpoints.filter(e => e.healthScore && e.healthScore.overall < 40).length}</div>
                    <div className="text-[9px] text-red-700">개선필요</div>
                  </div>
                </div>
              </div>
              
              {/* 보안 현황 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">보안 현황</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    <Shield className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-700 dark:text-green-400">인증 적용: {endpoints.filter(e => e.auth && e.auth !== 'none').length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <Zap className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-700 dark:text-blue-400">Rate Limit: {endpoints.filter(e => e.rateLimit).length}</span>
                  </div>
                </div>
              </div>
              
              {/* 유사 엔드포인트 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">중복 가능성</h4>
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">{endpoints.filter(e => e.similarity?.potentialDuplicate).length}</div>
                  <div className="text-[10px] text-orange-700">잠재적 중복 엔드포인트</div>
                </div>
              </div>
              
              {/* 프레임워크 */}
              <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
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
      
      {/* 비교 모달 */}
      {compareMode && (compareEndpoints[0] || compareEndpoints[1]) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 w-[800px] max-w-[90vw]"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              엔드포인트 비교 ({(compareEndpoints[0] ? 1 : 0) + (compareEndpoints[1] ? 1 : 0)}/2)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setCompareEndpoints([null, null]); }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                초기화
              </button>
              <button
                onClick={() => { setCompareMode(false); setCompareEndpoints([null, null]); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map(idx => {
              const ep = compareEndpoints[idx];
              return (
                <div key={idx} className={`rounded-lg p-3 ${ep ? 'bg-gray-50 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-750 border-2 border-dashed border-gray-300 dark:border-gray-600'}`}>
                  {ep ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${methodColors[ep.method].bg} ${methodColors[ep.method].text}`}>
                            {ep.method}
                          </span>
                          <code className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{ep.path}</code>
                        </div>
                        <button onClick={() => setCompareEndpoints(prev => { const n = [...prev] as [ApiEndpoint | null, ApiEndpoint | null]; n[idx] = null; return n; })} className="text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {[
                          { label: '헬스', value: ep.healthScore?.overall ?? '-', color: (ep.healthScore?.overall ?? 0) >= 60 ? 'text-green-600' : 'text-red-600' },
                          { label: '보안', value: ep.healthScore?.security ?? '-', color: (ep.healthScore?.security ?? 0) >= 60 ? 'text-green-600' : 'text-red-600' },
                          { label: '복잡도', value: ep.complexity?.score ?? '-', color: (ep.complexity?.score ?? 0) <= 5 ? 'text-green-600' : 'text-red-600' },
                          { label: '인증', value: ep.auth !== 'none' && ep.auth ? '✓' : '✗', color: ep.auth && ep.auth !== 'none' ? 'text-green-600' : 'text-yellow-600' },
                          { label: '문서', value: ep.documentationScore?.score ?? '-', color: (ep.documentationScore?.score ?? 0) >= 50 ? 'text-green-600' : 'text-red-600' },
                        ].map(m => (
                          <div key={m.label} className="bg-white dark:bg-gray-800 rounded p-1">
                            <div className={`text-sm font-bold ${m.color}`}>{m.value}</div>
                            <div className="text-[8px] text-gray-400">{m.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      리스트에서 엔드포인트를 클릭하여 추가
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {compareEndpoints[0] && compareEndpoints[1] && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-center">
              <span className="text-xs text-gray-500">
                헬스 차이: <span className={`font-bold ${Math.abs((compareEndpoints[0].healthScore?.overall ?? 0) - (compareEndpoints[1].healthScore?.overall ?? 0)) > 20 ? 'text-red-500' : 'text-green-500'}`}>
                  {Math.abs((compareEndpoints[0].healthScore?.overall ?? 0) - (compareEndpoints[1].healthScore?.overall ?? 0))}점
                </span>
              </span>
            </div>
          )}
        </motion.div>
      )}
      
      {/* v6: Floating Action Button (FAB) */}
      <AnimatePresence>
        {showFab && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-center gap-2"
          >
            {/* Main FAB */}
            <button
              onClick={() => setShowFab(true)}
              className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-full shadow-lg shadow-teal-500/25 flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Sparkles className="w-6 h-6" />
            </button>
            
            {/* FAB Actions */}
            <div className="flex flex-col gap-2">
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                onClick={scrollToTop}
                className="w-10 h-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-200 dark:border-gray-700"
                title="맨 위로"
              >
                <ArrowUp className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15 }}
                onClick={selectRandomEndpoint}
                className="w-10 h-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-200 dark:border-gray-700"
                title="랜덤 엔드포인트"
              >
                <Shuffle className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                onClick={() => setShowStats(!showStats)}
                className="w-10 h-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-200 dark:border-gray-700"
                title="통계 토글"
              >
                <PieChart className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25 }}
                onClick={() => setShowRequestHistory(true)}
                className="w-10 h-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-200 dark:border-gray-700"
                title="요청 기록"
              >
                <History className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* v6: Request History Modal */}
      <AnimatePresence>
        {showRequestHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowRequestHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-500" />
                  요청 기록
                </h3>
                <button onClick={() => setShowRequestHistory(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {requestHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>아직 요청 기록이 없습니다</p>
                    <p className="text-sm mt-1">Test 탭에서 API를 테스트해보세요</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requestHistory.map(item => (
                      <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${methodColors[item.method]?.bg || 'bg-gray-100'} ${methodColors[item.method]?.text || 'text-gray-700'}`}>
                              {item.method}
                            </span>
                            <code className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[300px]">{item.path}</code>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded font-mono ${
                              item.status >= 200 && item.status < 300 ? 'bg-green-100 text-green-700' :
                              item.status >= 400 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {item.status}
                            </span>
                            <span className="text-gray-400">{item.responseTime}ms</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {requestHistory.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <button
                    onClick={() => {
                      setRequestHistory([]);
                      localStorage.removeItem(`api-request-history-${projectId}`);
                    }}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    기록 삭제
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
