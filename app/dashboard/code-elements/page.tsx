'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Code2, RefreshCw, Search, Filter, ChevronDown, ChevronRight,
  FileCode, Folder, Clock, Zap, GitBranch, Tag, 
  CheckCircle, AlertCircle, Loader2, Eye, Play,
  BarChart3, PieChart, TrendingUp, Layers,
  Download, Copy, Sparkles, ArrowUp, ArrowDown, RotateCw,
  HelpCircle, Info, BookOpen, Lightbulb, MessageCircle
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
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  // 새로운 고급 기능 상태
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);
  const [showTagInput, setShowTagInput] = useState<string | null>(null);
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [newNote, setNewNote] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [hoverElement, setHoverElement] = useState<CodeElement | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [showStats, setShowStats] = useState(true);
  
  // 완벽한 기능 상태
  const [compareMode, setCompareMode] = useState(false);
  const [compareElements, setCompareElements] = useState<[CodeElement | null, CodeElement | null]>([null, null]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [codeSmells, setCodeSmells] = useState<Record<string, { type: string; message: string; severity: 'low' | 'medium' | 'high' }[]>>({});
  const [autoTags, setAutoTags] = useState<Record<string, string[]>>({});
  const [pinnedElements, setPinnedElements] = useState<string[]>([]);
  const [showImportExport, setShowImportExport] = useState(false);
  const [relatedElements, setRelatedElements] = useState<{ callers: CodeElement[]; callees: CodeElement[] }>({ callers: [], callees: [] });
  const [showRelated, setShowRelated] = useState(false);
  const [activeTab, setActiveTab] = useState<'detail' | 'related' | 'smells'>('detail');

  // 궁극의 기능 상태
  const [filterPresets, setFilterPresets] = useState<{ name: string; filter: any; quickFilters: any; sortBy: string }[]>([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [undoStack, setUndoStack] = useState<{ action: string; data: any }[]>([]);
  const [redoStack, setRedoStack] = useState<{ action: string; data: any }[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [printMode, setPrintMode] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; element?: CodeElement }[]>([{ label: '홈' }]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [lastActivity, setLastActivity] = useState<{ action: string; timestamp: Date; elementName?: string }[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [elementHistory, setElementHistory] = useState<Record<string, { viewedAt: Date; count: number }>>({});
  const [showRecentlyViewed, setShowRecentlyViewed] = useState(false);
  const [customColumns, setCustomColumns] = useState<string[]>(['name', 'type', 'lines', 'status']);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [showMarkdownExport, setShowMarkdownExport] = useState(false);

  // 가이드 & 툴팁 상태
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showDataSourceInfo, setShowDataSourceInfo] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);

  // 온보딩 가이드 데이터
  const onboardingSteps = [
    { title: '👋 코드 요소 분석기에 오신 것을 환영합니다!', content: '이 도구는 프로젝트의 코드를 AST(추상 구문 트리)로 파싱하여 함수, 클래스, 컴포넌트 등을 추출하고 분석합니다.' },
    { title: '🔍 1단계: 스캔 실행', content: '"스캔 실행" 버튼을 클릭하면 프로젝트의 TypeScript/JavaScript 파일을 분석하여 코드 요소를 추출합니다.' },
    { title: '⚡ 2단계: AI 분석', content: '"AI 분석" 버튼으로 각 요소에 대한 AI 기반 요약, 목적, 개선점 분석을 수행합니다.' },
    { title: '📊 3단계: 탐색 & 관리', content: '필터, 정렬, 검색, 즐겨찾기, 태그 등을 사용하여 코드 요소를 효율적으로 관리하세요.' },
    { title: '🎯 완료!', content: '이제 코드 분석을 시작할 준비가 되었습니다. 도움이 필요하면 ⓘ 아이콘을 클릭하세요.' }
  ];

  // 첫 방문 체크
  useEffect(() => {
    const visited = localStorage.getItem('code-elements-visited');
    if (!visited) {
      setShowOnboarding(true);
      localStorage.setItem('code-elements-visited', 'true');
    }
    const dismissed = localStorage.getItem('code-elements-dismissed-tips');
    if (dismissed) {
      try { setDismissedTips(JSON.parse(dismissed)); } catch {}
    }
  }, []);

  const dismissTip = (tipId: string) => {
    setDismissedTips(prev => {
      const next = [...prev, tipId];
      localStorage.setItem('code-elements-dismissed-tips', JSON.stringify(next));
      return next;
    });
  };

  // 툴팁 컴포넌트
  const Tooltip = ({ id, children, content }: { id: string; children: React.ReactNode; content: string }) => (
    <div className="relative inline-flex items-center">
      {children}
      <button
        onClick={() => setActiveTooltip(activeTooltip === id ? null : id)}
        className="ml-1 text-gray-400 hover:text-violet-500 transition"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {activeTooltip === id && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl">
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
          {content}
          <button onClick={() => setActiveTooltip(null)} className="absolute top-1 right-1 text-gray-400 hover:text-white">✕</button>
        </div>
      )}
    </div>
  );

  // 인포 배지 컴포넌트
  const InfoBadge = ({ tipId, title, content }: { tipId: string; title: string; content: string }) => {
    if (dismissedTips.includes(tipId)) return null;
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{title}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{content}</p>
          </div>
          <button onClick={() => dismissTip(tipId)} className="text-blue-400 hover:text-blue-600 text-xs">닫기</button>
        </div>
      </div>
    );
  };

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

  // 즐겨찾기 토글
  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // localStorage에 저장
      localStorage.setItem('code-elements-favorites', JSON.stringify([...next]));
      return next;
    });
  };

  // 즐겨찾기 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('code-elements-favorites');
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)));
      } catch {}
    }
  }, []);

  // 선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === elements.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(elements.map(el => el.id)));
    }
  };

  // 선택된 요소 일괄 분석
  const analyzeSelected = async () => {
    if (selectedIds.size === 0) return;
    setAnalyzing(true);
    for (const id of selectedIds) {
      try {
        await fetch('/api/code-elements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, action: 'analyze', elementId: id })
        });
      } catch {}
    }
    setSelectedIds(new Set());
    await loadData();
    setAnalyzing(false);
  };

  // === 태그 시스템 ===
  // localStorage에서 태그 로드
  useEffect(() => {
    const saved = localStorage.getItem('code-elements-tags');
    if (saved) {
      try { setTags(JSON.parse(saved)); } catch {}
    }
  }, []);

  // 태그 추가
  const addTag = (elementId: string, tag: string) => {
    if (!tag.trim()) return;
    setTags(prev => {
      const next = { ...prev, [elementId]: [...(prev[elementId] || []), tag.trim()] };
      localStorage.setItem('code-elements-tags', JSON.stringify(next));
      return next;
    });
    setNewTag('');
    setShowTagInput(null);
  };

  // 태그 삭제
  const removeTag = (elementId: string, tag: string) => {
    setTags(prev => {
      const next = { ...prev, [elementId]: (prev[elementId] || []).filter(t => t !== tag) };
      localStorage.setItem('code-elements-tags', JSON.stringify(next));
      return next;
    });
  };

  // === 메모 시스템 ===
  // localStorage에서 메모 로드
  useEffect(() => {
    const saved = localStorage.getItem('code-elements-notes');
    if (saved) {
      try { setNotes(JSON.parse(saved)); } catch {}
    }
  }, []);

  // 메모 저장
  const saveNote = (elementId: string, note: string) => {
    setNotes(prev => {
      const next = { ...prev, [elementId]: note };
      localStorage.setItem('code-elements-notes', JSON.stringify(next));
      return next;
    });
    setShowNoteInput(null);
    setNewNote('');
  };

  // === 검색 히스토리 ===
  useEffect(() => {
    const saved = localStorage.getItem('code-elements-search-history');
    if (saved) {
      try { setSearchHistory(JSON.parse(saved)); } catch {}
    }
  }, []);

  const addToSearchHistory = (term: string) => {
    if (!term.trim()) return;
    setSearchHistory(prev => {
      const next = [term, ...prev.filter(t => t !== term)].slice(0, 10);
      localStorage.setItem('code-elements-search-history', JSON.stringify(next));
      return next;
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('code-elements-search-history');
  };

  // 검색 실행
  const handleSearch = (term: string) => {
    setSearchText(term);
    if (term.trim()) {
      addToSearchHistory(term);
    }
    setShowSearchHistory(false);
  };

  // === 건강도 점수 계산 ===
  const calculateHealthScore = useCallback(() => {
    if (elements.length === 0) return { score: 0, grade: 'N/A', details: {} };
    
    // 분석 완료율 (30점)
    const analyzed = elements.filter(el => el.analyzedAt).length;
    const analyzedScore = (analyzed / elements.length) * 30;
    
    // 평균 라인수 (25점) - 50줄 이하가 이상적
    const avgLines = elements.reduce((sum, el) => sum + (el.lineEnd - el.lineStart), 0) / elements.length;
    const linesScore = Math.max(0, 25 - (avgLines - 30) * 0.3);
    
    // 문서화율 (20점) - AI 요약이 있는 요소
    const documented = elements.filter(el => el.aiSummary).length;
    const documentedScore = (documented / elements.length) * 20;
    
    // 모듈성 (15점) - export된 함수 비율
    const exported = elements.filter(el => el.isExported).length;
    const modularityScore = (exported / Math.max(1, elements.length)) * 15;
    
    // 구조화 (10점) - 클래스/인터페이스 비율
    const structured = elements.filter(el => ['CLASS', 'INTERFACE', 'TYPE'].includes(el.elementType)).length;
    const structureScore = Math.min(10, (structured / Math.max(1, elements.length)) * 20);
    
    const totalScore = Math.round(analyzedScore + linesScore + documentedScore + modularityScore + structureScore);
    
    const grade = totalScore >= 90 ? 'A+' : totalScore >= 80 ? 'A' : totalScore >= 70 ? 'B+' : 
                  totalScore >= 60 ? 'B' : totalScore >= 50 ? 'C' : totalScore >= 40 ? 'D' : 'F';
    
    return {
      score: totalScore,
      grade,
      details: {
        analyzedScore: Math.round(analyzedScore),
        linesScore: Math.round(linesScore),
        documentedScore: Math.round(documentedScore),
        modularityScore: Math.round(modularityScore),
        structureScore: Math.round(structureScore)
      }
    };
  }, [elements]);

  // === 컨텍스트 메뉴 ===
  const handleContextMenu = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, elementId });
  };

  // 클릭시 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // === 일괄 작업 ===
  const bulkAddTag = (tag: string) => {
    selectedIds.forEach(id => {
      setTags(prev => {
        const next = { ...prev, [id]: [...(prev[id] || []), tag] };
        localStorage.setItem('code-elements-tags', JSON.stringify(next));
        return next;
      });
    });
    setShowBulkActions(false);
  };

  const bulkFavorite = () => {
    selectedIds.forEach(id => {
      setFavorites(prev => {
        const next = new Set(prev);
        next.add(id);
        localStorage.setItem('code-elements-favorites', JSON.stringify([...next]));
        return next;
      });
    });
    setShowBulkActions(false);
  };

  // CSV 내보내기
  const exportCSV = useCallback(() => {
    const headers = ['Name', 'Type', 'File', 'Lines', 'Async', 'Exported', 'Analyzed', 'AI Summary'];
    const rows = elements.map(el => [
      el.name,
      el.elementType,
      el.filePath,
      `${el.lineStart}-${el.lineEnd}`,
      el.isAsync ? 'Yes' : 'No',
      el.isExported ? 'Yes' : 'No',
      el.analyzedAt ? 'Yes' : 'No',
      (el.aiSummary || '').replace(/,/g, ';')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-elements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [elements]);

  // === 코드 스멜 감지 ===
  const detectCodeSmells = useCallback((el: CodeElement) => {
    const smells: { type: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];
    const lineCount = el.lineEnd - el.lineStart + 1;
    
    // 긴 함수/메서드
    if (lineCount > 100) {
      smells.push({ type: 'LONG_FUNCTION', message: `함수가 너무 깁니다 (${lineCount}줄). 50줄 이하로 분리를 권장합니다.`, severity: 'high' });
    } else if (lineCount > 50) {
      smells.push({ type: 'LONG_FUNCTION', message: `함수가 다소 깁니다 (${lineCount}줄). 분리를 고려해보세요.`, severity: 'medium' });
    }
    
    // 내보내기 안된 함수
    if (!el.isExported && ['FUNCTION', 'COMPONENT'].includes(el.elementType)) {
      smells.push({ type: 'NOT_EXPORTED', message: '이 함수는 export되지 않았습니다. 의도적인지 확인하세요.', severity: 'low' });
    }
    
    // async 함수 체크
    if (el.isAsync && lineCount > 30) {
      smells.push({ type: 'COMPLEX_ASYNC', message: 'async 함수가 복잡합니다. 에러 처리와 타임아웃을 확인하세요.', severity: 'medium' });
    }
    
    // AI 분석 미완료
    if (!el.analyzedAt) {
      smells.push({ type: 'NOT_ANALYZED', message: 'AI 분석이 아직 수행되지 않았습니다.', severity: 'low' });
    }
    
    // 이름 컨벤션 체크
    if (el.elementType === 'FUNCTION' && el.name[0] === el.name[0].toUpperCase() && !['COMPONENT', 'CLASS'].includes(el.elementType)) {
      smells.push({ type: 'NAMING_CONVENTION', message: '함수 이름이 대문자로 시작합니다. 컴포넌트가 아니라면 camelCase를 권장합니다.', severity: 'low' });
    }
    
    return smells;
  }, []);

  // 모든 요소의 코드 스멜 계산
  useEffect(() => {
    const smells: Record<string, { type: string; message: string; severity: 'low' | 'medium' | 'high' }[]> = {};
    elements.forEach(el => {
      const detected = detectCodeSmells(el);
      if (detected.length > 0) {
        smells[el.id] = detected;
      }
    });
    setCodeSmells(smells);
  }, [elements, detectCodeSmells]);

  // === 자동 태그 추천 ===
  const generateAutoTags = useCallback((el: CodeElement) => {
    const suggestedTags: string[] = [];
    const lineCount = el.lineEnd - el.lineStart + 1;
    
    if (el.isAsync) suggestedTags.push('비동기');
    if (el.isExported) suggestedTags.push('외부공개');
    if (lineCount > 100) suggestedTags.push('리팩토링필요');
    if (lineCount <= 20) suggestedTags.push('간결함');
    if (el.elementType === 'COMPONENT') suggestedTags.push('UI컴포넌트');
    if (el.elementType === 'HOOK') suggestedTags.push('커스텀훅');
    if (el.name.startsWith('handle')) suggestedTags.push('이벤트핸들러');
    if (el.name.startsWith('use')) suggestedTags.push('훅');
    if (el.name.includes('test') || el.name.includes('Test')) suggestedTags.push('테스트');
    if (el.analyzedAt) suggestedTags.push('분석완료');
    
    return suggestedTags;
  }, []);

  // 자동 태그 계산
  useEffect(() => {
    const auto: Record<string, string[]> = {};
    elements.forEach(el => {
      auto[el.id] = generateAutoTags(el);
    });
    setAutoTags(auto);
  }, [elements, generateAutoTags]);

  // === 관련 요소 찾기 ===
  const findRelatedElements = useCallback((el: CodeElement) => {
    // 같은 파일의 다른 요소들
    const sameFile = elements.filter(e => e.filePath === el.filePath && e.id !== el.id);
    
    // 이름 기반 관련 요소 (호출 관계 추정)
    const namePattern = el.name.replace(/^(handle|use|get|set|is|has)/, '');
    const relatedByName = elements.filter(e => 
      e.id !== el.id && 
      (e.name.includes(namePattern) || el.name.includes(e.name.replace(/^(handle|use|get|set|is|has)/, '')))
    );
    
    setRelatedElements({
      callers: sameFile.slice(0, 5),
      callees: relatedByName.slice(0, 5)
    });
  }, [elements]);

  // 선택된 요소 변경시 관련 요소 업데이트
  useEffect(() => {
    if (selectedElement) {
      findRelatedElements(selectedElement);
    }
  }, [selectedElement, findRelatedElements]);

  // === 요소 비교 ===
  const addToCompare = (el: CodeElement) => {
    setCompareElements(prev => {
      if (!prev[0]) return [el, null];
      if (!prev[1]) return [prev[0], el];
      return [el, null]; // 리셋
    });
  };

  const clearCompare = () => {
    setCompareElements([null, null]);
    setShowCompareModal(false);
  };

  // === 설정 내보내기/가져오기 ===
  const exportSettings = () => {
    const settings = {
      favorites: [...favorites],
      tags,
      notes,
      searchHistory,
      pinnedElements,
      viewMode,
      sortBy,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-elements-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        if (settings.favorites) setFavorites(new Set(settings.favorites));
        if (settings.tags) setTags(settings.tags);
        if (settings.notes) setNotes(settings.notes);
        if (settings.searchHistory) setSearchHistory(settings.searchHistory);
        if (settings.pinnedElements) setPinnedElements(settings.pinnedElements);
        if (settings.viewMode) setViewMode(settings.viewMode);
        if (settings.sortBy) setSortBy(settings.sortBy);
        
        // localStorage 저장
        localStorage.setItem('code-elements-favorites', JSON.stringify(settings.favorites || []));
        localStorage.setItem('code-elements-tags', JSON.stringify(settings.tags || {}));
        localStorage.setItem('code-elements-notes', JSON.stringify(settings.notes || {}));
        localStorage.setItem('code-elements-search-history', JSON.stringify(settings.searchHistory || []));
        
        setShowImportExport(false);
        alert('설정이 성공적으로 가져와졌습니다!');
      } catch {
        alert('설정 파일을 읽는데 실패했습니다.');
      }
    };
    reader.readAsText(file);
  };

  // === 핀 고정 ===
  const togglePin = (id: string) => {
    setPinnedElements(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      localStorage.setItem('code-elements-pinned', JSON.stringify(next));
      return next;
    });
  };

  // 핀 로드
  useEffect(() => {
    const saved = localStorage.getItem('code-elements-pinned');
    if (saved) {
      try { setPinnedElements(JSON.parse(saved)); } catch {}
    }
  }, []);

  // === 필터 프리셋 ===
  useEffect(() => {
    const saved = localStorage.getItem('code-elements-presets');
    if (saved) {
      try { setFilterPresets(JSON.parse(saved)); } catch {}
    }
  }, []);

  const savePreset = (name: string) => {
    if (!name.trim()) return;
    const preset = { name, filter, quickFilters, sortBy };
    const updated = [...filterPresets.filter(p => p.name !== name), preset];
    setFilterPresets(updated);
    localStorage.setItem('code-elements-presets', JSON.stringify(updated));
    setPresetName('');
    setShowPresetModal(false);
    logActivity('프리셋 저장', name);
  };

  const loadPreset = (preset: { name: string; filter: any; quickFilters: any; sortBy: string }) => {
    setFilter(preset.filter);
    setQuickFilters(preset.quickFilters);
    setSortBy(preset.sortBy as any);
    logActivity('프리셋 로드', preset.name);
  };

  const deletePreset = (name: string) => {
    const updated = filterPresets.filter(p => p.name !== name);
    setFilterPresets(updated);
    localStorage.setItem('code-elements-presets', JSON.stringify(updated));
  };

  // === 실행 취소/다시 실행 ===
  const pushUndo = (action: string, data: any) => {
    setUndoStack(prev => [...prev.slice(-20), { action, data }]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, last]);
    
    // 실행 취소 처리
    if (last.action === 'favorite') {
      setFavorites(prev => {
        const next = new Set(prev);
        if (last.data.added) next.delete(last.data.id);
        else next.add(last.data.id);
        return next;
      });
    }
    logActivity('실행 취소', last.action);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, last]);
    
    if (last.action === 'favorite') {
      setFavorites(prev => {
        const next = new Set(prev);
        if (last.data.added) next.add(last.data.id);
        else next.delete(last.data.id);
        return next;
      });
    }
    logActivity('다시 실행', last.action);
  };

  // === 활동 로그 ===
  const logActivity = (action: string, elementName?: string) => {
    setLastActivity(prev => [
      { action, timestamp: new Date(), elementName },
      ...prev.slice(0, 49)
    ]);
  };

  // === 요소 조회 히스토리 ===
  useEffect(() => {
    if (selectedElement) {
      setElementHistory(prev => ({
        ...prev,
        [selectedElement.id]: {
          viewedAt: new Date(),
          count: (prev[selectedElement.id]?.count || 0) + 1
        }
      }));
      // 빵가루 업데이트
      setBreadcrumbs([
        { label: '홈' },
        { label: selectedElement.fileName },
        { label: selectedElement.name, element: selectedElement }
      ]);
      logActivity('요소 조회', selectedElement.name);
    }
  }, [selectedElement]);

  // === 마크다운 리포트 내보내기 ===
  const exportMarkdown = useCallback(() => {
    const health = calculateHealthScore();
    const smellCount = Object.values(codeSmells).flat().length;
    const uniqueFiles = new Set(elements.map(el => el.filePath)).size;
    
    let md = `# 코드 요소 분석 리포트\n\n`;
    md += `생성일: ${new Date().toLocaleString('ko')}\n\n`;
    md += `## 📊 요약\n\n`;
    md += `| 항목 | 값 |\n|-----|-----|\n`;
    md += `| 총 요소 | ${stats?.total || 0}개 |\n`;
    md += `| 분석 완료 | ${stats?.analyzed || 0}개 |\n`;
    md += `| 파일 수 | ${uniqueFiles}개 |\n`;
    md += `| 즐겨찾기 | ${favorites.size}개 |\n`;
    md += `| 코드 스멜 | ${smellCount}개 |\n\n`;
    
    md += `## 🏥 건강도 점수: ${health.grade} (${health.score}/100)\n\n`;
    md += `| 지표 | 점수 |\n|-----|-----|\n`;
    md += `| 분석률 | ${health.details.analyzedScore || 0}/30 |\n`;
    md += `| 간결성 | ${health.details.linesScore || 0}/25 |\n`;
    md += `| 문서화 | ${health.details.documentedScore || 0}/20 |\n`;
    md += `| 모듈성 | ${health.details.modularityScore || 0}/15 |\n`;
    md += `| 구조화 | ${health.details.structureScore || 0}/10 |\n\n`;
    
    md += `## 📈 타입별 분포\n\n`;
    if (stats?.byType) {
      Object.entries(stats.byType).forEach(([type, count]) => {
        md += `- **${type}**: ${count}개\n`;
      });
    }
    md += `\n`;
    
    md += `## ⚠️ 코드 스멜 (상위 10개)\n\n`;
    const topSmells = Object.entries(codeSmells)
      .flatMap(([id, smells]) => smells.map(s => ({ ...s, id })))
      .slice(0, 10);
    topSmells.forEach(smell => {
      const el = elements.find(e => e.id === smell.id);
      md += `- **${el?.name || 'Unknown'}**: ${smell.message}\n`;
    });
    md += `\n`;
    
    md += `## ⭐ 즐겨찾기 요소\n\n`;
    [...favorites].forEach(id => {
      const el = elements.find(e => e.id === id);
      if (el) md += `- ${el.name} (${el.elementType})\n`;
    });
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-elements-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity('마크다운 내보내기');
  }, [elements, stats, favorites, codeSmells, calculateHealthScore]);

  // === 세션 저장/복원 ===
  useEffect(() => {
    const session = {
      filter, quickFilters, sortBy, viewMode, zoomLevel,
      expandedFiles: [...expandedFiles],
      selectedElementId: selectedElement?.id
    };
    sessionStorage.setItem('code-elements-session', JSON.stringify(session));
  }, [filter, quickFilters, sortBy, viewMode, zoomLevel, expandedFiles, selectedElement]);

  useEffect(() => {
    const saved = sessionStorage.getItem('code-elements-session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.filter) setFilter(session.filter);
        if (session.quickFilters) setQuickFilters(session.quickFilters);
        if (session.sortBy) setSortBy(session.sortBy);
        if (session.viewMode) setViewMode(session.viewMode);
        if (session.zoomLevel) setZoomLevel(session.zoomLevel);
        if (session.expandedFiles) setExpandedFiles(new Set(session.expandedFiles));
      } catch {}
    }
  }, []);

  // === 줌 컨트롤 ===
  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(150, Math.max(75, prev + delta)));
  };

  // === 키보드 단축키 확장 ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 'p') { e.preventDefault(); setPrintMode(!printMode); }
        if (e.key === '+' || e.key === '=') { e.preventDefault(); handleZoom(10); }
        if (e.key === '-') { e.preventDefault(); handleZoom(-10); }
        return;
      }
      
      if (e.key === 'p') setPrintMode(!printMode);
      if (e.key === 'h') setShowActivityLog(!showActivityLog);
      if (e.key === 'r') setShowRecentlyViewed(!showRecentlyViewed);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [printMode, showActivityLog, showRecentlyViewed, undo, redo]);


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
    // 즐겨찾기 필터
    if (showOnlyFavorites && !favorites.has(el.id)) return false;
    
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

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Progress Bar */}
            <div className="h-1 bg-gray-200 dark:bg-gray-700">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
                style={{ width: `${((onboardingStep + 1) / onboardingSteps.length) * 100}%` }}
              />
            </div>
            
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mx-auto mb-4 flex items-center justify-center">
                  <Code2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {onboardingSteps[onboardingStep].title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-3">
                  {onboardingSteps[onboardingStep].content}
                </p>
              </div>
              
              {/* Step Indicators */}
              <div className="flex justify-center gap-2 mb-6">
                {onboardingSteps.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`w-2 h-2 rounded-full transition ${idx === onboardingStep ? 'bg-violet-500 w-6' : 'bg-gray-300 dark:bg-gray-600'}`}
                  />
                ))}
              </div>
              
              <div className="flex gap-3">
                {onboardingStep > 0 && (
                  <button
                    onClick={() => setOnboardingStep(prev => prev - 1)}
                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    이전
                  </button>
                )}
                {onboardingStep < onboardingSteps.length - 1 ? (
                  <button
                    onClick={() => setOnboardingStep(prev => prev + 1)}
                    className="flex-1 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                  >
                    다음
                  </button>
                ) : (
                  <button
                    onClick={() => setShowOnboarding(false)}
                    className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition"
                  >
                    시작하기 🚀
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setShowOnboarding(false)}
                className="w-full mt-3 text-center text-sm text-gray-500 hover:text-gray-700"
              >
                건너뛰기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Info Modal */}
      {showDataSourceInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowDataSourceInfo(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-500" />
              데이터 소스 & 처리 흐름
            </h3>
            
            <div className="space-y-4">
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-violet-700 dark:text-violet-300 mb-2">📁 1. 스캔 실행</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  TypeScript AST 파서를 사용하여 프로젝트의 <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">.ts</code>, 
                  <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">.tsx</code>, 
                  <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">.js</code> 파일을 분석합니다.
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  📍 lib/code-scanner/index.ts
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">🔍 2. 요소 추출</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <strong>FUNCTION</strong> - 일반 함수</li>
                  <li>• <strong>CLASS</strong> - 클래스 정의</li>
                  <li>• <strong>COMPONENT</strong> - React 컴포넌트</li>
                  <li>• <strong>HOOK</strong> - React 커스텀 훅</li>
                  <li>• <strong>INTERFACE</strong> - TypeScript 인터페이스</li>
                  <li>• <strong>TYPE</strong> - TypeScript 타입 정의</li>
                  <li>• <strong>METHOD</strong> - 클래스 메서드</li>
                </ul>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">💾 3. DB 저장</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  추출된 요소는 <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">CodeElement</code> 모델로 
                  PostgreSQL 데이터베이스에 저장됩니다.
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  📍 prisma/schema.prisma → CodeElement
                </div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">⚡ 4. AI 분석 (선택)</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  각 요소의 코드를 AI에게 전송하여 요약, 목적, 개선점 등을 분석합니다.
                  분석 결과는 <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">aiSummary</code>와 
                  <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">aiAnalysis</code> 필드에 저장됩니다.
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  📍 lib/code-element-service.ts
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowDataSourceInfo(false)}
              className="mt-6 w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
            >
              이해했습니다
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              const el = elements.find(e => e.id === contextMenu.elementId);
              if (el) setSelectedElement(el);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> 상세 보기
          </button>
          <button
            onClick={() => { toggleFavorite(contextMenu.elementId); setContextMenu(null); }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {favorites.has(contextMenu.elementId) ? '⭐ 즐겨찾기 해제' : '☆ 즐겨찾기 추가'}
          </button>
          <button
            onClick={() => { toggleSelect(contextMenu.elementId); setContextMenu(null); }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {selectedIds.has(contextMenu.elementId) ? '☑ 선택 해제' : '☐ 선택'}
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button
            onClick={() => { setShowTagInput(contextMenu.elementId); setContextMenu(null); }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Tag className="w-4 h-4" /> 태그 추가
          </button>
          <button
            onClick={() => { setShowNoteInput(contextMenu.elementId); setContextMenu(null); }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            📝 메모 추가
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button
            onClick={() => {
              const el = elements.find(e => e.id === contextMenu.elementId);
              if (el) copyCode(el.content);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> 코드 복사
          </button>
        </div>
      )}

      {/* Tag Input Modal */}
      {showTagInput && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowTagInput(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">🏷️ 태그 추가</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag(showTagInput, newTag)}
                placeholder="태그 입력..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                autoFocus
              />
              <button
                onClick={() => addTag(showTagInput, newTag)}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                추가
              </button>
            </div>
            {/* 현재 태그 */}
            <div className="flex flex-wrap gap-2">
              {(tags[showTagInput] || []).map(tag => (
                <span key={tag} className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(showTagInput, tag)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            {/* 추천 태그 */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-2">추천 태그:</p>
              <div className="flex flex-wrap gap-1">
                {['리팩토링필요', 'TODO', '버그수정', '최적화', '테스트필요', '문서화필요'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => addTag(showTagInput, tag)}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs hover:bg-violet-100"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Input Modal */}
      {showNoteInput && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowNoteInput(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-[500px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📝 메모</h3>
            <textarea
              value={newNote || notes[showNoteInput] || ''}
              onChange={e => setNewNote(e.target.value)}
              placeholder="이 요소에 대한 메모를 입력하세요..."
              className="w-full h-32 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNoteInput(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={() => saveNote(showNoteInput, newNote || notes[showNoteInput] || '')}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showCompareModal && compareElements[0] && compareElements[1] && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={clearCompare}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              ⚖️ 요소 비교
              <button onClick={clearCompare} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {[compareElements[0], compareElements[1]].map((el, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded text-xs ${getTypeColor(el.elementType)}`}>
                      {getTypeIcon(el.elementType)} {el.elementType}
                    </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">{el.name}</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-1 text-gray-500">파일</td>
                        <td className="py-1 text-gray-900 dark:text-white">{el.fileName}</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-1 text-gray-500">라인</td>
                        <td className="py-1 text-gray-900 dark:text-white">{el.lineStart} - {el.lineEnd} ({el.lineEnd - el.lineStart + 1}줄)</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-1 text-gray-500">Async</td>
                        <td className="py-1">{el.isAsync ? '✅ Yes' : '❌ No'}</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-1 text-gray-500">Exported</td>
                        <td className="py-1">{el.isExported ? '✅ Yes' : '❌ No'}</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-1 text-gray-500">분석됨</td>
                        <td className="py-1">{el.analyzedAt ? '✅ Yes' : '❌ No'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-gray-500 align-top">AI 요약</td>
                        <td className="py-1 text-gray-900 dark:text-white text-xs">{el.aiSummary || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                  {codeSmells[el.id]?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-red-500 font-medium mb-1">⚠️ 코드 스멜 ({codeSmells[el.id].length})</p>
                      {codeSmells[el.id].map((smell, i) => (
                        <p key={i} className="text-xs text-gray-600 dark:text-gray-400">• {smell.message}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Import/Export Modal */}
      {showImportExport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowImportExport(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">⚙️ 설정 관리</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">현재 설정 내보내기</p>
                <button
                  onClick={exportSettings}
                  className="w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                >
                  📤 설정 내보내기 (JSON)
                </button>
                <p className="text-[10px] text-gray-500 mt-1">
                  즐겨찾기, 태그, 메모, 검색 히스토리, 핀 고정 등
                </p>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">설정 가져오기</p>
                <label className="w-full py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer flex items-center justify-center gap-2">
                  📥 파일 선택
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && importSettings(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compare Bar */}
      {(compareElements[0] || compareElements[1]) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-40 flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">비교:</span>
          <div className="flex items-center gap-2">
            {compareElements[0] ? (
              <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-sm">
                {compareElements[0].name}
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded text-sm">선택 안됨</span>
            )}
            <span className="text-gray-400">vs</span>
            {compareElements[1] ? (
              <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-sm">
                {compareElements[1].name}
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded text-sm">선택 안됨</span>
            )}
          </div>
          <button
            onClick={() => setShowCompareModal(true)}
            disabled={!compareElements[0] || !compareElements[1]}
            className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50"
          >
            비교하기
          </button>
          <button onClick={clearCompare} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Filter Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowPresetModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📋 필터 프리셋</h3>
            
            {/* Save New Preset */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  placeholder="프리셋 이름..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
                <button
                  onClick={() => savePreset(presetName)}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                >
                  저장
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">현재 필터/정렬 설정이 저장됩니다</p>
            </div>
            
            {/* Saved Presets */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">저장된 프리셋</p>
              {filterPresets.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">저장된 프리셋이 없습니다</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filterPresets.map(preset => (
                    <div key={preset.name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span className="text-sm font-medium">{preset.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { loadPreset(preset); setShowPresetModal(false); }}
                          className="px-2 py-1 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded"
                        >
                          적용
                        </button>
                        <button
                          onClick={() => deletePreset(preset.name)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Panel */}
      {showActivityLog && (
        <div className="fixed right-6 top-20 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-40 max-h-[60vh] overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">📋 활동 로그</h3>
            <button onClick={() => setShowActivityLog(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="p-2 max-h-[calc(60vh-60px)] overflow-y-auto">
            {lastActivity.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">활동이 없습니다</p>
            ) : (
              lastActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                  <span className="text-xs text-gray-400 w-16 flex-shrink-0">
                    {activity.timestamp.toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                    {activity.elementName && (
                      <p className="text-xs text-gray-500 truncate">{activity.elementName}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="fixed left-6 bottom-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-40 flex items-center gap-2">
        <button onClick={() => handleZoom(-10)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-lg">−</button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-center">{zoomLevel}%</span>
        <button onClick={() => handleZoom(10)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-lg">+</button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
        <button onClick={() => setShowActivityLog(!showActivityLog)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200" title="활동 로그 (h)">📋</button>
        <button onClick={() => setShowPresetModal(true)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200" title="필터 프리셋">📌</button>
        <button onClick={() => setShowImportExport(true)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200" title="설정 관리">⚙️</button>
      </div>

      {/* Quick Actions FAB */}
      <div className="fixed right-6 bottom-6 z-40">
        <div className={`flex flex-col-reverse gap-2 mb-2 transition-all ${showQuickActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button onClick={exportMarkdown} className="w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition" title="마크다운 리포트">📝</button>
          <button onClick={exportJSON} className="w-12 h-12 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition" title="JSON 내보내기">📄</button>
          <button onClick={exportCSV} className="w-12 h-12 rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition" title="CSV 내보내기">📊</button>
          <button onClick={() => setPrintMode(!printMode)} className="w-12 h-12 rounded-full bg-gray-500 text-white shadow-lg hover:bg-gray-600 transition" title="인쇄 모드 (p)">🖨️</button>
          <button onClick={handleScan} disabled={scanning} className="w-12 h-12 rounded-full bg-violet-500 text-white shadow-lg hover:bg-violet-600 transition disabled:opacity-50" title="스캔">🔍</button>
        </div>
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={`w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all ${showQuickActions ? 'rotate-45' : ''}`}
        >
          <span className="text-2xl">+</span>
        </button>
      </div>

      {/* Breadcrumb Navigation */}
      {selectedElement && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full px-4 py-2 shadow-lg z-30 flex items-center gap-2">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-gray-400">/</span>}
              <button
                onClick={() => crumb.element ? setSelectedElement(crumb.element) : setSelectedElement(null)}
                className={`text-sm ${idx === breadcrumbs.length - 1 ? 'font-medium text-violet-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Undo/Redo Indicator */}
      {(undoStack.length > 0 || redoStack.length > 0) && (
        <div className="fixed top-4 right-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-30 flex items-center gap-1">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            title="Ctrl+Z"
          >
            ↩️ {undoStack.length}
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            title="Ctrl+Y"
          >
            ↪️ {redoStack.length}
          </button>
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
              <div className="relative">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  disabled={!elements.length}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
                >
                  <Download className="w-4 h-4" />
                  내보내기 ▼
                </button>
                {showBulkActions && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 min-w-[150px]">
                    <button
                      onClick={() => { exportJSON(); setShowBulkActions(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      📄 JSON 내보내기
                    </button>
                    <button
                      onClick={() => { exportCSV(); setShowBulkActions(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      📊 CSV 내보내기
                    </button>
                  </div>
                )}
              </div>
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
              placeholder="함수명, 파일명, 시그니처로 검색... (Enter로 히스토리 저장)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => setShowSearchHistory(true)}
              onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchText)}
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
            
            {/* Search History Dropdown */}
            {showSearchHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <span className="text-xs text-gray-500">최근 검색</span>
                  <button
                    onClick={clearSearchHistory}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    모두 삭제
                  </button>
                </div>
                {searchHistory.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(term)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {term}
                  </button>
                ))}
              </div>
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

        {/* Health Score Card */}
        {elements.length > 0 && (() => {
          const health = calculateHealthScore();
          const gradeColor = health.score >= 80 ? 'text-green-500' : health.score >= 60 ? 'text-yellow-500' : 'text-red-500';
          const gradeBg = health.score >= 80 ? 'from-green-500 to-emerald-600' : health.score >= 60 ? 'from-yellow-500 to-orange-600' : 'from-red-500 to-rose-600';
          
          return (
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  🏥 프로젝트 건강도 점수
                </h3>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showStats ? '접기' : '펼치기'}
                </button>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Score Circle */}
                <div className="relative">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradeBg} flex items-center justify-center`}>
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <span className={`text-2xl font-bold ${gradeColor}`}>{health.grade}</span>
                        <p className="text-[10px] text-gray-500">{health.score}/100</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Metrics */}
                {showStats && (
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    {[
                      { label: '분석률', value: health.details.analyzedScore || 0, max: 30, icon: '📊' },
                      { label: '간결성', value: health.details.linesScore || 0, max: 25, icon: '📏' },
                      { label: '문서화', value: health.details.documentedScore || 0, max: 20, icon: '📝' },
                      { label: '모듈성', value: health.details.modularityScore || 0, max: 15, icon: '📦' },
                      { label: '구조화', value: health.details.structureScore || 0, max: 10, icon: '🏗️' },
                    ].map(({ label, value, max, icon }) => (
                      <div key={label} className="text-center">
                        <div className="text-lg">{icon}</div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white">{value}/{max}</div>
                        <div className="text-[10px] text-gray-500">{label}</div>
                        <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-violet-500 transition-all"
                            style={{ width: `${(value / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  코드 요소 목록
                  {favorites.size > 0 && (
                    <span className="text-xs text-yellow-600">⭐{favorites.size}</span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {/* View Mode Tabs */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode('tree')}
                      className={`px-2 py-1 text-xs rounded ${viewMode === 'tree' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                    >
                      🌲 트리
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-2 py-1 text-xs rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                    >
                      📋 리스트
                    </button>
                  </div>
                  {/* Favorites Toggle */}
                  <button
                    onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                    className={`px-2 py-1 text-xs rounded-lg transition ${
                      showOnlyFavorites 
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    ⭐ 즐겨찾기
                  </button>
                </div>
              </div>
              
              {/* Bulk Selection Bar */}
              {selectedIds.size > 0 && (
                <div className="mt-3 flex items-center justify-between p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                  <span className="text-sm text-violet-700 dark:text-violet-300">
                    {selectedIds.size}개 선택됨
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={analyzeSelected}
                      disabled={analyzing}
                      className="px-2 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
                    >
                      {analyzing ? '분석 중...' : '✨ 일괄 분석'}
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300"
                    >
                      ✕ 취소
                    </button>
                  </div>
                </div>
              )}
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
              ) : viewMode === 'list' ? (
                /* List View */
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedElements.map(el => {
                    const lineCount = getLineCount(el);
                    const complexityColor = lineCount > 100 ? 'text-red-500' : lineCount > 50 ? 'text-yellow-500' : 'text-green-500';
                    
                    return (
                      <div
                        key={el.id}
                        className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                          selectedElement?.id === el.id ? 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-violet-500' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(el.id)}
                          onChange={() => toggleSelect(el.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(el.id); }}
                          className={`transition ${favorites.has(el.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                        >
                          {favorites.has(el.id) ? '⭐' : '☆'}
                        </button>
                        <button
                          onClick={() => setSelectedElement(el)}
                          className="flex items-center gap-2 flex-1 text-left min-w-0"
                        >
                          <span className={`px-1.5 py-0.5 rounded text-xs ${getTypeColor(el.elementType)}`}>
                            {getTypeIcon(el.elementType)}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white font-mono truncate">
                            {el.name}
                          </span>
                          <span className="text-[10px] text-gray-400 truncate">
                            {el.fileName}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {el.isAsync && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px]">async</span>}
                          {el.isExported && <span className="px-1 py-0.5 bg-green-100 text-green-600 rounded text-[10px]">exp</span>}
                          <span className={`text-[10px] ${complexityColor} font-medium w-8 text-right`}>{lineCount}L</span>
                          {el.analyzedAt ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Clock className="w-3.5 h-3.5 text-gray-300" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Tree View */
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
                          {fileElements.map(el => {
                            const lineCount = getLineCount(el);
                            const complexityColor = lineCount > 100 ? 'text-red-500' : lineCount > 50 ? 'text-yellow-500' : 'text-green-500';
                            
                            return (
                              <div
                                key={el.id}
                                className={`flex items-center gap-1 px-4 py-2 pl-8 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition ${
                                  selectedElement?.id === el.id ? 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-violet-500' : ''
                                }`}
                              >
                                {/* Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(el.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSelect(el.id);
                                  }}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                />
                                
                                {/* Favorite Star */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(el.id);
                                  }}
                                  className={`p-0.5 transition ${favorites.has(el.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                                >
                                  {favorites.has(el.id) ? '⭐' : '☆'}
                                </button>
                                
                                {/* Main Button */}
                                <button
                                  onClick={() => setSelectedElement(el)}
                                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                                >
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${getTypeColor(el.elementType)}`}>
                                    {getTypeIcon(el.elementType)}
                                  </span>
                                  <span className="text-sm text-gray-900 dark:text-white font-mono truncate flex-1">
                                    {el.name}
                                  </span>
                                </button>
                                
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
                                  {/* Complexity Color */}
                                  <span className={`text-[10px] ${complexityColor} font-medium w-8 text-right`}>
                                    {lineCount}L
                                  </span>
                                  {el.analyzedAt ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-gray-300" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
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
