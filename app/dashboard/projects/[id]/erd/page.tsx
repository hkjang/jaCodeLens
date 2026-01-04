'use client';

/**
 * 프로젝트별 ERD (Entity Relationship Diagram) Viewer - Enhanced Version
 * 
 * Features:
 * - 검색 자동완성
 * - 미니맵 네비게이션
 * - 키보드 단축키 (Esc, +/-, Home)
 * - 부드러운 애니메이션
 * - 통계 패널
 * - 관계선 하이라이트
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RefreshCw,
  X,
  Key,
  Link2,
  ChevronRight,
  ChevronLeft,
  Layers,
  Search,
  Move,
  Map,
  Keyboard,
  ChevronDown,
  BarChart3,
  ArrowRight,
  Download,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileText,
  Fullscreen,
  Filter,
  List,
  GitBranch
} from 'lucide-react';

interface ErdField {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isOptional: boolean;
  isArray: boolean;
  isRelation: boolean;
  defaultValue?: string;
  attributes: string[];
}

interface ErdRelation {
  from: string;
  to: string;
  fromField: string;
  toField: string;
  type: '1-1' | '1-n' | 'n-1' | 'n-n';
}

interface ErdModel {
  name: string;
  fields: ErdField[];
  category: string;
}

interface ErdData {
  models: ErdModel[];
  relations: ErdRelation[];
}

interface ModelPosition {
  x: number;
  y: number;
}

// 카테고리별 색상
const categoryColors: Record<string, { fill: string; text: string; textClass: string; lightBg: string }> = {
  'Project': { fill: '#3b82f6', text: '#2563eb', textClass: 'text-blue-600', lightBg: 'bg-blue-50' },
  'Analysis': { fill: '#a855f7', text: '#9333ea', textClass: 'text-purple-600', lightBg: 'bg-purple-50' },
  'Code': { fill: '#22c55e', text: '#16a34a', textClass: 'text-green-600', lightBg: 'bg-green-50' },
  'Agent': { fill: '#f97316', text: '#ea580c', textClass: 'text-orange-600', lightBg: 'bg-orange-50' },
  'Security': { fill: '#ef4444', text: '#dc2626', textClass: 'text-red-600', lightBg: 'bg-red-50' },
  'Architecture': { fill: '#6366f1', text: '#4f46e5', textClass: 'text-indigo-600', lightBg: 'bg-indigo-50' },
  'Self-Analysis': { fill: '#06b6d4', text: '#0891b2', textClass: 'text-cyan-600', lightBg: 'bg-cyan-50' },
  'Governance': { fill: '#f59e0b', text: '#d97706', textClass: 'text-amber-600', lightBg: 'bg-amber-50' },
  'Admin': { fill: '#64748b', text: '#475569', textClass: 'text-slate-600', lightBg: 'bg-slate-50' },
  'AI': { fill: '#ec4899', text: '#db2777', textClass: 'text-pink-600', lightBg: 'bg-pink-50' },
  'Operations': { fill: '#14b8a6', text: '#0d9488', textClass: 'text-teal-600', lightBg: 'bg-teal-50' },
  'Other': { fill: '#6b7280', text: '#4b5563', textClass: 'text-gray-600', lightBg: 'bg-gray-50' },
};

// 초기 레이아웃 계산
function calculateInitialPositions(models: ErdModel[]): Record<string, ModelPosition> {
  const positions: Record<string, ModelPosition> = {};
  const categories = [...new Set(models.map(m => m.category))];
  
  const categoryGroups: Record<string, ErdModel[]> = {};
  for (const model of models) {
    if (!categoryGroups[model.category]) {
      categoryGroups[model.category] = [];
    }
    categoryGroups[model.category].push(model);
  }
  
  let categoryY = 50;
  const modelWidth = 280;
  const modelHeight = 280;
  const gapX = 60;
  const gapY = 40;
  const modelsPerRow = 4;
  
  for (const category of categories) {
    const group = categoryGroups[category] || [];
    let x = 50;
    let y = categoryY;
    let rowCount = 0;
    
    for (const model of group) {
      positions[model.name] = { x, y };
      rowCount++;
      
      if (rowCount >= modelsPerRow) {
        x = 50;
        y += modelHeight + gapY;
        rowCount = 0;
      } else {
        x += modelWidth + gapX;
      }
    }
    
    categoryY = y + modelHeight + gapY + 60;
  }
  
  return positions;
}

export default function ProjectErdPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [erdData, setErdData] = useState<ErdData | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaInfo, setSchemaInfo] = useState<{
    type?: string;
    language?: string;
    frameworks?: string[];
    path?: string;
  }>({});
  
  const [positions, setPositions] = useState<Record<string, ModelPosition>>({});
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [selectedModel, setSelectedModel] = useState<ErdModel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // 새로운 상태들
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [highlightedRelations, setHighlightedRelations] = useState<Set<string>>(new Set());
  const [compactMode, setCompactMode] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showRelationsList, setShowRelationsList] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fieldTypeFilter, setFieldTypeFilter] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [layoutMode, setLayoutMode] = useState<'grid' | 'hierarchy' | 'circle'>('grid');
  const [showFieldFilter, setShowFieldFilter] = useState(false);
  const [fieldFilterType, setFieldFilterType] = useState<'all' | 'pk' | 'fk' | 'required'>('all');
  const [hoveredRelation, setHoveredRelation] = useState<number | null>(null);
  const [availableSchemas, setAvailableSchemas] = useState<{path: string; type: string}[]>([]);
  const [showSchemaSelector, setShowSchemaSelector] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // 검색 자동완성 제안
  const searchSuggestions = useMemo(() => {
    if (!erdData || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return erdData.models
      .filter(m => m.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [erdData, searchQuery]);

  // 통계
  const stats = useMemo(() => {
    if (!erdData) return null;
    const categoryStats = erdData.models.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalFields = erdData.models.reduce((sum, m) => sum + m.fields.length, 0);
    const avgFields = (totalFields / erdData.models.length).toFixed(1);
    
    return {
      models: erdData.models.length,
      relations: erdData.relations.length,
      categories: Object.keys(categoryStats).length,
      totalFields,
      avgFields,
      categoryStats
    };
  }, [erdData]);

  // 키보드 단축키
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Esc: 선택 해제
      if (e.key === 'Escape') {
        setSelectedModel(null);
        setShowSuggestions(false);
        setShowShortcuts(false);
      }
      // Ctrl + F: 검색 포커스
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // +/-: 줌
      if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(2, z + 0.1));
      }
      if (e.key === '-') {
        setZoom(z => Math.max(0.1, z - 0.1));
      }
      // Home: 리셋
      if (e.key === 'Home') {
        setZoom(0.5);
        setPan({ x: 20, y: 20 });
      }
      // M: 미니맵 토글
      if (e.key === 'm' && !e.ctrlKey) {
        setShowMinimap(prev => !prev);
      }
      // ?: 단축키 도움말
      if (e.key === '?') {
        setShowShortcuts(prev => !prev);
      }
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    async function loadProjectInfo() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProjectName(data.name || 'Project');
        }
      } catch (e) {
        console.error('Failed to load project info', e);
      }
    }
    if (projectId) {
      loadProjectInfo();
    }
  }, [projectId]);

  useEffect(() => {
    async function loadErdData() {
      if (!projectId) return;
      
      try {
        // 프로젝트별 ERD API 호출
        const res = await fetch(`/api/projects/${projectId}/erd`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch ERD data');
        }
        const data = await res.json();
        
        if (data.error) {
          // 스키마 없는 경우 빈 결과로 처리
          setErdData({ models: [], relations: [] });
          setError(data.message || data.error);
          if (data.language || data.frameworks) {
            setSchemaInfo({
              language: data.language,
              frameworks: data.frameworks,
            });
          }
        } else {
          setErdData(data);
          if (data.models && data.models.length > 0) {
            setPositions(calculateInitialPositions(data.models));
          }
          if (data.projectName) {
            setProjectName(data.projectName);
          }
          setSchemaInfo({
            type: data.schemaType,
            language: data.language,
            frameworks: data.frameworks,
            path: data.schemaPath,
          });
          if (data.availableSchemas) {
            setAvailableSchemas(data.availableSchemas);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadErdData();
  }, [projectId]);

  // 선택된 모델의 관계 하이라이트
  useEffect(() => {
    if (!selectedModel || !erdData) {
      setHighlightedRelations(new Set());
      return;
    }
    
    const related = new Set<string>();
    erdData.relations.forEach((rel, idx) => {
      if (rel.from === selectedModel.name || rel.to === selectedModel.name) {
        related.add(`rel-${idx}`);
      }
    });
    setHighlightedRelations(related);
  }, [selectedModel, erdData]);

  const filteredModels = useMemo(() => {
    if (!erdData) return [];
    return erdData.models.filter(model => {
      const matchesSearch = !searchQuery || 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.fields.some(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || model.category === selectedCategory;
      const notCollapsed = !collapsedCategories.has(model.category);
      return matchesSearch && matchesCategory && notCollapsed;
    });
  }, [erdData, searchQuery, selectedCategory, collapsedCategories]);

  const categories = useMemo(() => {
    if (!erdData) return [];
    const cats = [...new Set(erdData.models.map(m => m.category))];
    return cats.sort();
  }, [erdData]);

  // 카테고리 접기/펼치기 토글
  const toggleCategoryCollapse = useCallback((category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, modelName?: string) => {
    e.preventDefault();
    if (modelName && positions[modelName]) {
      setDragTarget(modelName);
      setDragStart({ 
        x: e.clientX - positions[modelName].x * zoom, 
        y: e.clientY - positions[modelName].y * zoom 
      });
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [positions, zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragTarget && positions[dragTarget]) {
      setPositions(prev => ({
        ...prev,
        [dragTarget]: {
          x: (e.clientX - dragStart.x) / zoom,
          y: (e.clientY - dragStart.y) / zoom,
        }
      }));
    } else if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [dragTarget, isDragging, dragStart, zoom, positions]);

  const handleMouseUp = useCallback(() => {
    setDragTarget(null);
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.max(0.1, Math.min(2, prev + delta)));
  }, []);

  const resetView = useCallback(() => {
    if (erdData) {
      setPositions(calculateInitialPositions(erdData.models));
      setZoom(0.5);
      setPan({ x: 20, y: 20 });
    }
  }, [erdData]);

  const fitToScreen = useCallback(() => {
    if (!erdData || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const model of erdData.models) {
      const pos = positions[model.name];
      if (pos) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + 260);
        maxY = Math.max(maxY, pos.y + 250);
      }
    }
    
    const contentWidth = maxX - minX + 100;
    const contentHeight = maxY - minY + 100;
    
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.9;
    
    setZoom(newZoom);
    setPan({ x: 20, y: 20 });
  }, [erdData, positions]);

  // 카테고리로 이동
  const navigateToCategory = useCallback((category: string | null) => {
    if (!erdData || !containerRef.current) {
      setSelectedCategory(category);
      return;
    }
    
    setSelectedCategory(category);
    
    if (!category) {
      setZoom(0.5);
      setPan({ x: 20, y: 20 });
      return;
    }
    
    const categoryModels = erdData.models.filter(m => m.category === category);
    if (categoryModels.length === 0) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const model of categoryModels) {
      const pos = positions[model.name];
      if (pos) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + 260);
        maxY = Math.max(maxY, pos.y + 280);
      }
    }
    
    if (minX === Infinity) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const contentWidth = maxX - minX + 100;
    const contentHeight = maxY - minY + 100;
    
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 0.8) * 0.85;
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const newPanX = (containerWidth / 2) - (centerX * newZoom);
    const newPanY = (containerHeight / 2) - (centerY * newZoom);
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [erdData, positions]);

  // 특정 모델로 이동
  const navigateToModel = useCallback((modelName: string) => {
    if (!erdData || !containerRef.current) return;
    
    const model = erdData.models.find(m => m.name === modelName);
    if (!model) return;
    
    const pos = positions[modelName];
    if (!pos) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const newZoom = 0.8;
    
    const centerX = pos.x + 130;
    const centerY = pos.y + 140;
    
    const newPanX = (containerWidth / 2) - (centerX * newZoom);
    const newPanY = (containerHeight / 2) - (centerY * newZoom);
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
    setSelectedModel(model);
    setShowSuggestions(false);
    setSearchQuery('');
  }, [erdData, positions]);

  // 검색 처리
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchSuggestions.length > 0) {
      navigateToModel(searchSuggestions[0].name);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [searchSuggestions, navigateToModel]);

  // 이전/다음 모델로 이동
  const navigateToPrevNext = useCallback((direction: 'prev' | 'next') => {
    if (!erdData || !selectedModel) return;
    
    const currentIndex = erdData.models.findIndex(m => m.name === selectedModel.name);
    if (currentIndex === -1) return;
    
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex === 0 ? erdData.models.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex === erdData.models.length - 1 ? 0 : currentIndex + 1;
    }
    
    navigateToModel(erdData.models[newIndex].name);
  }, [erdData, selectedModel, navigateToModel]);

  // 스키마 복사
  const copySchema = useCallback(() => {
    if (!selectedModel) return;
    
    let schema = `model ${selectedModel.name} {\n`;
    for (const field of selectedModel.fields) {
      schema += `  ${field.name} ${field.type}`;
      if (field.isOptional) schema += '?';
      if (field.isArray) schema += '[]';
      if (field.attributes.length > 0) schema += ` ${field.attributes.join(' ')}`;
      schema += '\n';
    }
    schema += '}';
    
    navigator.clipboard.writeText(schema).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [selectedModel]);

  // Mermaid ERD 내보내기
  const exportMermaid = useCallback(() => {
    if (!erdData) return;
    
    let mermaid = `erDiagram\n`;
    
    // 관계 추가
    for (const rel of erdData.relations) {
      const relSymbol = rel.type === '1-n' ? '||--o{' : rel.type === 'n-1' ? '}o--||' : '||--||';
      mermaid += `  ${rel.from} ${relSymbol} ${rel.to} : "${rel.fromField}"\n`;
    }
    
    // 엔티티 추가
    for (const model of erdData.models) {
      mermaid += `  ${model.name} {\n`;
      for (const field of model.fields.slice(0, 10)) {
        const type = field.type.replace(/[^a-zA-Z]/g, '');
        mermaid += `    ${type} ${field.name}`;
        if (field.isPrimaryKey) mermaid += ' PK';
        if (field.isRelation) mermaid += ' FK';
        mermaid += '\n';
      }
      mermaid += `  }\n`;
    }
    
    const blob = new Blob([mermaid], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'erd'}_diagram.mmd`;
    a.click();
    URL.revokeObjectURL(url);
  }, [erdData, projectName]);

  // SQL DDL 내보내기
  const exportSQL = useCallback(() => {
    if (!erdData) return;
    
    let sql = `-- Generated from Prisma Schema\n-- Project: ${projectName}\n-- Date: ${new Date().toISOString()}\n\n`;
    
    for (const model of erdData.models) {
      sql += `CREATE TABLE "${model.name}" (\n`;
      
      const columns: string[] = [];
      const constraints: string[] = [];
      
      for (const field of model.fields) {
        if (field.isRelation && !field.isPrimaryKey) continue;
        
        let sqlType = 'TEXT';
        switch (field.type.toLowerCase()) {
          case 'int': sqlType = 'INTEGER'; break;
          case 'float': sqlType = 'REAL'; break;
          case 'boolean': sqlType = 'BOOLEAN'; break;
          case 'datetime': sqlType = 'TIMESTAMP'; break;
          case 'json': sqlType = 'JSONB'; break;
          case 'string': sqlType = 'VARCHAR(255)'; break;
          default: sqlType = 'TEXT';
        }
        
        let columnDef = `  "${field.name}" ${sqlType}`;
        if (!field.isOptional) columnDef += ' NOT NULL';
        if (field.isPrimaryKey) columnDef += ' PRIMARY KEY';
        if (field.attributes.includes('@unique')) columnDef += ' UNIQUE';
        if (field.defaultValue) {
          if (field.defaultValue === 'now()') {
            columnDef += ' DEFAULT CURRENT_TIMESTAMP';
          } else if (field.defaultValue === 'uuid()') {
            columnDef += ' DEFAULT gen_random_uuid()';
          }
        }
        
        columns.push(columnDef);
      }
      
      sql += columns.join(',\n');
      if (constraints.length > 0) {
        sql += ',\n' + constraints.join(',\n');
      }
      sql += '\n);\n\n';
    }
    
    // Foreign Keys
    sql += '-- Foreign Key Constraints\n';
    for (const rel of erdData.relations) {
      sql += `ALTER TABLE "${rel.from}" ADD CONSTRAINT "fk_${rel.from}_${rel.to}" `;
      sql += `FOREIGN KEY ("${rel.fromField}") REFERENCES "${rel.to}"("${rel.toField}");\n`;
    }
    
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'schema'}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [erdData, projectName]);

  // 전체화면 토글
  const toggleFullscreen = useCallback(() => {
    if (!mainContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      mainContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error(err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.error(err));
    }
  }, []);

  // 필드 타입 목록
  const fieldTypes = useMemo(() => {
    if (!erdData) return [];
    const types = new Set<string>();
    for (const model of erdData.models) {
      for (const field of model.fields) {
        types.add(field.type);
      }
    }
    return Array.from(types).sort();
  }, [erdData]);

  // 미니맵 클릭으로 이동
  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!erdData || !containerRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    // 헤더 영역 제외 (약 24px)
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top - 24;
    
    if (clickY < 0) return; // 헤더 클릭 무시
    
    // 전체 범위 계산 (렌더링과 동일하게)
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const model of erdData.models) {
      const pos = positions[model.name];
      if (pos) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + 260);
        maxY = Math.max(maxY, pos.y + 280);
      }
    }
    
    if (minX === Infinity) return;
    
    const contentWidth = maxX - minX + 50;
    const contentHeight = maxY - minY + 50;
    const minimapWidth = 176;
    const minimapHeight = 116;
    const scale = Math.min(minimapWidth / contentWidth, minimapHeight / contentHeight);
    const offsetX = (minimapWidth - contentWidth * scale) / 2;
    const offsetY = (minimapHeight - contentHeight * scale) / 2;
    
    // 클릭 위치를 실제 좌표로 변환
    const targetX = (clickX - offsetX) / scale + minX;
    const targetY = (clickY - offsetY) / scale + minY;
    
    const container = containerRef.current;
    const newPanX = (container.clientWidth / 2) - (targetX * zoom);
    const newPanY = (container.clientHeight / 2) - (targetY * zoom);
    
    setPan({ x: newPanX, y: newPanY });
  }, [erdData, positions, zoom]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">ERD 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-red-500">
        <Database className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">스키마 로드 실패</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div 
      ref={mainContainerRef}
      className={`flex flex-col bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-6rem)]'}`}
    >
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">ERD Viewer</h1>
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <span>{projectName}</span>
                <span>•</span>
                <span>{stats?.models || 0}개 모델</span>
                <span>•</span>
                <span>{stats?.relations || 0}개 관계</span>
                {schemaInfo.type && (
                  <>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-medium uppercase">
                      {schemaInfo.type}
                    </span>
                  </>
                )}
                {schemaInfo.language && (
                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-[10px] font-medium">
                    {schemaInfo.language}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* 검색 with 자동완성 */}
          <div className="relative ml-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="모델 검색... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => searchQuery && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={handleSearchKeyDown}
              className="pl-10 pr-4 py-2 w-72 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
            
            {/* 자동완성 드롭다운 */}
            <AnimatePresence>
              {showSuggestions && searchSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                >
                  {searchSuggestions.map((model, idx) => (
                    <button
                      key={model.name}
                      onClick={() => navigateToModel(model.name)}
                      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                        idx === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                    >
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: categoryColors[model.category]?.fill || '#6b7280' }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">{model.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{model.category}</span>
                      {idx === 0 && <span className="text-xs text-blue-500">Enter</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* 컨트롤 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="확대 (+)"
          >
            <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-xs text-gray-500 w-12 text-center font-mono bg-gray-100 dark:bg-gray-700 py-1 rounded">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="축소 (-)"
          >
            <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
          <button
            onClick={fitToScreen}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="화면에 맞추기"
          >
            <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={resetView}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="뷰 리셋 (Home)"
          >
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          {/* 필드 필터 */}
          <div className="relative">
            <button
              onClick={() => setShowFieldFilter(prev => !prev)}
              className={`p-2 rounded-lg transition flex items-center gap-1 ${
                fieldFilterType !== 'all' ? 'bg-green-100 text-green-600' : 
                showFieldFilter ? 'bg-blue-100 text-blue-600' : 
                'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title="필드 필터"
            >
              <Filter className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showFieldFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 w-40"
                >
                  {[
                    { value: 'all', label: '모든 필드' },
                    { value: 'pk', label: '기본키만' },
                    { value: 'fk', label: '외래키만' },
                    { value: 'required', label: '필수 필드만' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { 
                        setFieldFilterType(opt.value as typeof fieldFilterType); 
                        setShowFieldFilter(false); 
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                        fieldFilterType === opt.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : ''
                      }`}
                    >
                      {fieldFilterType === opt.value && <Check className="w-3 h-3" />}
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
          <button
            onClick={() => setShowMinimap(prev => !prev)}
            className={`p-2 rounded-lg transition ${showMinimap ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            title="미니맵 (M)"
          >
            <Map className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCompactMode(prev => !prev)}
            className={`p-2 rounded-lg transition ${compactMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            title="필드 숨기기"
          >
            {compactMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowShortcuts(prev => !prev)}
            className={`p-2 rounded-lg transition ${showShortcuts ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            title="단축키 (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowRelationsList(prev => !prev)}
            className={`p-2 rounded-lg transition ${showRelationsList ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            title="관계 목록"
          >
            <GitBranch className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
          
          {/* 내보내기 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              className={`p-2 rounded-lg transition flex items-center gap-1 ${showExportMenu ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
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
                    onClick={exportMermaid}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-purple-500" />
                    Mermaid ERD (.mmd)
                  </button>
                  <button
                    onClick={exportSQL}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Database className="w-4 h-4 text-blue-500" />
                    SQL DDL (.sql)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="전체화면"
          >
            <Fullscreen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* 카테고리 필터 사이드바 */}
        <aside className="w-52 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0 bg-gray-50 dark:bg-gray-900">
          {/* 통계 */}
          {stats && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase">통계</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white dark:bg-gray-800 p-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.models}</div>
                  <div className="text-gray-400">모델</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.relations}</div>
                  <div className="text-gray-400">관계</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalFields}</div>
                  <div className="text-gray-400">필드</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.avgFields}</div>
                  <div className="text-gray-400">평균</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">카테고리</h3>
            <div className="space-y-1">
              <button
                onClick={() => navigateToCategory(null)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition ${
                  !selectedCategory 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                전체 ({erdData?.models.length || 0})
              </button>
              {categories.map(cat => {
                const count = erdData?.models.filter(m => m.category === cat).length || 0;
                const color = categoryColors[cat] || categoryColors['Other'];
                const isCollapsed = collapsedCategories.has(cat);
                return (
                  <div key={cat} className="flex items-center gap-1">
                    <button
                      onClick={() => navigateToCategory(cat === selectedCategory ? null : cat)}
                      className={`flex-1 text-left px-3 py-2 text-sm rounded-lg transition flex items-center gap-2 ${
                        selectedCategory === cat 
                          ? `${color.lightBg} ${color.textClass} font-medium` 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } ${isCollapsed ? 'opacity-50' : ''}`}
                    >
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: color.fill }}
                      />
                      <span className="truncate">{cat}</span>
                      <span className="ml-auto text-xs opacity-60">({count})</span>
                    </button>
                    <button
                      onClick={() => toggleCategoryCollapse(cat)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                      title={isCollapsed ? "펼치기" : "접기"}
                    >
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
        
        {/* ERD 캔버스 */}
        <div 
          ref={containerRef}
          className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden relative"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={(e) => handleMouseDown(e)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* 그리드 배경 */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(to right, #9ca3af 1px, transparent 1px),
                linear-gradient(to bottom, #9ca3af 1px, transparent 1px)
              `,
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />
          
          {/* SVG 캔버스 */}
          <svg
            className="absolute inset-0"
            width="100%"
            height="100%"
            style={{ overflow: 'visible' }}
          >
            <g style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}>
              {/* 관계선 */}
              {erdData && filteredModels.length > 0 && erdData.relations
                .filter(rel => {
                  const names = new Set(filteredModels.map(m => m.name));
                  return names.has(rel.from) && names.has(rel.to);
                })
                .map((rel, idx) => {
                  const fromPos = positions[rel.from];
                  const toPos = positions[rel.to];
                  if (!fromPos || !toPos) return null;
                  
                  const isHighlighted = highlightedRelations.has(`rel-${idx}`);
                  const fromCenter = { x: fromPos.x + 130, y: fromPos.y + 20 };
                  const toCenter = { x: toPos.x + 130, y: toPos.y + 20 };
                  
                  const dx = toCenter.x - fromCenter.x;
                  const ctrl1 = { x: fromCenter.x + dx * 0.4, y: fromCenter.y };
                  const ctrl2 = { x: toCenter.x - dx * 0.4, y: toCenter.y };
                  
                  return (
                    <g key={`rel-${idx}`}>
                      <path
                        d={`M ${fromCenter.x} ${fromCenter.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${toCenter.x} ${toCenter.y}`}
                        fill="none"
                        stroke={isHighlighted ? '#3b82f6' : '#94a3b8'}
                        strokeWidth={isHighlighted ? 3 : 2}
                        strokeDasharray={rel.type === '1-1' ? '8,4' : 'none'}
                        opacity={isHighlighted ? 1 : 0.4}
                        style={{ transition: 'all 0.3s ease' }}
                      />
                      <circle 
                        cx={toCenter.x} 
                        cy={toCenter.y} 
                        r={isHighlighted ? 6 : 5} 
                        fill={isHighlighted ? '#3b82f6' : '#64748b'} 
                        style={{ transition: 'all 0.3s ease' }}
                      />
                    </g>
                  );
                })}
              
              {/* 모델 박스들 */}
              {filteredModels.map(model => {
                const pos = positions[model.name];
                if (!pos) return null;
                
                const color = categoryColors[model.category] || categoryColors['Other'];
                const isSelected = selectedModel?.name === model.name;
                const isHovered = hoveredModel === model.name;
                
                // 필드 필터 적용
                let filteredFields = model.fields;
                if (fieldFilterType === 'pk') {
                  filteredFields = model.fields.filter(f => f.isPrimaryKey);
                } else if (fieldFilterType === 'fk') {
                  filteredFields = model.fields.filter(f => f.isRelation);
                } else if (fieldFilterType === 'required') {
                  filteredFields = model.fields.filter(f => !f.isOptional);
                }
                
                const displayFields = compactMode ? [] : filteredFields.slice(0, 8);
                const moreCount = compactMode ? filteredFields.length : filteredFields.length - displayFields.length;
                const boxHeight = compactMode ? 50 : (44 + displayFields.length * 26 + (moreCount > 0 ? 24 : 0));
                
                return (
                  <g
                    key={model.name}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, model.name); }}
                    onClick={(e) => { e.stopPropagation(); setSelectedModel(model); }}
                    onMouseEnter={() => setHoveredModel(model.name)}
                    onMouseLeave={() => setHoveredModel(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 선택 시 글로우 효과 */}
                    {isSelected && (
                      <rect
                        x="-6"
                        y="-6"
                        width="272"
                        height={boxHeight + 12}
                        rx="14"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        opacity="0.3"
                      />
                    )}
                    
                    {/* 그림자 */}
                    <rect
                      x="4"
                      y="4"
                      width="260"
                      height={boxHeight}
                      rx="10"
                      fill="rgba(0,0,0,0.15)"
                    />
                    
                    {/* 배경 */}
                    <rect
                      x="0"
                      y="0"
                      width="260"
                      height={boxHeight}
                      rx="10"
                      fill="#ffffff"
                      stroke={isSelected ? '#3b82f6' : '#d1d5db'}
                      strokeWidth={isSelected ? 3 : 1}
                    />
                    
                    {/* 헤더 배경 */}
                    <rect
                      x="0"
                      y="0"
                      width="260"
                      height="44"
                      rx="10"
                      fill={color.fill}
                    />
                    <rect
                      x="0"
                      y="34"
                      width="260"
                      height="10"
                      fill={color.fill}
                    />
                    
                    {/* 모델 이름 */}
                    <text 
                      x="14" 
                      y="28" 
                      fill="white" 
                      fontWeight="600" 
                      fontSize="14"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {model.name}
                    </text>
                    
                    {/* 관계 개수 표시 */}
                    {erdData && (
                      <g transform="translate(230, 14)">
                        <rect x="0" y="0" width="24" height="18" rx="9" fill="rgba(255,255,255,0.2)" />
                        <text x="12" y="13" textAnchor="middle" fontSize="10" fill="white">
                          {erdData.relations.filter(r => r.from === model.name || r.to === model.name).length}
                        </text>
                      </g>
                    )}
                    
                    {/* 필드들 */}
                    {displayFields.map((field, idx) => (
                      <g key={field.name} transform={`translate(0, ${44 + idx * 26})`}>
                        <text 
                          x="14" 
                          y="18" 
                          fill="#374151" 
                          fontSize="12"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {field.isPrimaryKey && '🔑 '}
                          {field.isRelation && '🔗 '}
                          {field.name}
                        </text>
                        <text 
                          x="246" 
                          y="18" 
                          textAnchor="end" 
                          fill="#9ca3af" 
                          fontSize="11"
                          fontFamily="monospace"
                        >
                          {field.type}{field.isOptional ? '?' : ''}{field.isArray ? '[]' : ''}
                        </text>
                      </g>
                    ))}
                    
                    {/* 더보기 */}
                    {moreCount > 0 && (
                      <text 
                        x="130" 
                        y={44 + displayFields.length * 26 + 16} 
                        textAnchor="middle" 
                        fill="#9ca3af"
                        fontSize="11"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        +{moreCount} more fields
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
          
          {/* 미니맵 */}
          <AnimatePresence>
            {showMinimap && erdData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 cursor-crosshair"
                onClick={handleMinimapClick}
              >
                <div className="text-xs text-gray-400 mb-1 px-1">미니맵 (클릭하여 이동)</div>
                <div className="relative w-[180px] h-[120px] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                  {/* 모델 점들 */}
                  {(() => {
                    // 전체 범위 계산 (한 번만)
                    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
                    for (const model of erdData.models) {
                      const pos = positions[model.name];
                      if (pos) {
                        minX = Math.min(minX, pos.x);
                        minY = Math.min(minY, pos.y);
                        maxX = Math.max(maxX, pos.x + 260);
                        maxY = Math.max(maxY, pos.y + 280);
                      }
                    }
                    
                    if (minX === Infinity) return null;
                    
                    const contentWidth = maxX - minX + 50;
                    const contentHeight = maxY - minY + 50;
                    const minimapWidth = 176;
                    const minimapHeight = 116;
                    const scale = Math.min(minimapWidth / contentWidth, minimapHeight / contentHeight);
                    const offsetX = (minimapWidth - contentWidth * scale) / 2;
                    const offsetY = (minimapHeight - contentHeight * scale) / 2;
                    
                    return (
                      <>
                        {erdData.models.map(model => {
                          const pos = positions[model.name];
                          if (!pos) return null;
                          
                          const x = (pos.x - minX) * scale + offsetX;
                          const y = (pos.y - minY) * scale + offsetY;
                          const w = 260 * scale;
                          const h = 40 * scale;
                          
                          const color = categoryColors[model.category]?.fill || '#6b7280';
                          const isSelected = selectedModel?.name === model.name;
                          
                          return (
                            <div
                              key={model.name}
                              className="absolute rounded-sm transition-all duration-150"
                              style={{
                                left: x,
                                top: y,
                                width: Math.max(w, 4),
                                height: Math.max(h, 3),
                                backgroundColor: color,
                                opacity: isSelected ? 1 : 0.7,
                                boxShadow: isSelected ? '0 0 0 2px #3b82f6' : 'none',
                              }}
                              title={model.name}
                            />
                          );
                        })}
                        
                        {/* 현재 뷰포트 표시 */}
                        {containerRef.current && (
                          <div
                            className="absolute border-2 border-blue-500 bg-blue-500/20 rounded-sm pointer-events-none"
                            style={{
                              left: Math.max(0, (-pan.x / zoom - minX) * scale + offsetX),
                              top: Math.max(0, (-pan.y / zoom - minY) * scale + offsetY),
                              width: Math.min(minimapWidth, containerRef.current.clientWidth / zoom * scale),
                              height: Math.min(minimapHeight, containerRef.current.clientHeight / zoom * scale),
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 줌 레벨 표시 */}
          <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-3 py-1.5 rounded-lg shadow text-sm text-gray-600 dark:text-gray-400 font-mono">
            {Math.round(zoom * 100)}%
          </div>
          
          {/* 단축키 도움말 */}
          <AnimatePresence>
            {showShortcuts && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-64"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900 dark:text-white">키보드 단축키</span>
                  <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">검색</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">확대/축소</span>
                    <span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">+</kbd> <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">-</kbd></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">뷰 리셋</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Home</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">미니맵 토글</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">M</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">선택 해제</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">단축키 도움말</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 관계 목록 패널 */}
          <AnimatePresence>
            {showRelationsList && erdData && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80 max-h-96 overflow-y-auto z-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    관계 목록 ({erdData.relations.length})
                  </span>
                  <button onClick={() => setShowRelationsList(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  {erdData.relations.map((rel, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const model = erdData.models.find(m => m.name === rel.from);
                        if (model) {
                          navigateToModel(model.name);
                          setShowRelationsList(false);
                        }
                      }}
                      className="w-full p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-600/50 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: categoryColors[erdData.models.find(m => m.name === rel.from)?.category || 'Other']?.fill || '#6b7280' }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white">{rel.from}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: categoryColors[erdData.models.find(m => m.name === rel.to)?.category || 'Other']?.fill || '#6b7280' }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white">{rel.to}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {rel.fromField} → {rel.toField} ({rel.type})
                      </div>
                    </button>
                  ))}
                  {erdData.relations.length === 0 && (
                    <p className="text-gray-400 text-center py-4">관계가 없습니다</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* 상세 정보 패널 */}
        <AnimatePresence>
          {selectedModel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0 bg-white dark:bg-gray-800"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: categoryColors[selectedModel.category]?.fill || '#6b7280' }}
                    >
                      <Layers className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{selectedModel.name}</h3>
                      <p className="text-xs text-gray-500">{selectedModel.category} • {selectedModel.fields.length} 필드</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedModel(null)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                {/* 네비게이션 및 액션 버튼 */}
                <div className="flex items-center gap-1 mt-3">
                  <button
                    onClick={() => navigateToPrevNext('prev')}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                    title="이전 모델"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    이전
                  </button>
                  <button
                    onClick={() => navigateToPrevNext('next')}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                    title="다음 모델"
                  >
                    다음
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={copySchema}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-lg transition"
                    title="스키마 복사"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  필드 ({selectedModel.fields.length})
                </h4>
                <div className="space-y-2">
                  {selectedModel.fields.map(field => (
                    <div
                      key={field.name}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {field.isPrimaryKey && <Key className="w-3 h-3 text-amber-500" />}
                        {field.isRelation && <Link2 className="w-3 h-3 text-blue-500" />}
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{field.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-mono bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                          {field.type}{field.isOptional ? '?' : ''}{field.isArray ? '[]' : ''}
                        </span>
                        {field.defaultValue && (
                          <span className="text-gray-400">= {field.defaultValue}</span>
                        )}
                      </div>
                      {field.attributes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.attributes.map(attr => (
                            <span key={attr} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded">
                              {attr}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {erdData && (
                  <div className="mt-6">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      관계 ({erdData.relations.filter(r => r.from === selectedModel.name || r.to === selectedModel.name).length})
                    </h4>
                    <div className="space-y-2">
                      {erdData.relations
                        .filter(r => r.from === selectedModel.name || r.to === selectedModel.name)
                        .map((rel, idx) => {
                          const isOutgoing = rel.from === selectedModel.name;
                          const otherModel = isOutgoing ? rel.to : rel.from;
                          return (
                            <button
                              key={idx}
                              onClick={() => navigateToModel(otherModel)}
                              className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-600/50 transition group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ArrowRight className={`w-4 h-4 ${isOutgoing ? 'text-green-500' : 'text-blue-500 rotate-180'}`} />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {otherModel}
                                  </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {rel.fromField} → {rel.toField} ({rel.type})
                              </div>
                            </button>
                          );
                        })
                      }
                      {erdData.relations.filter(r => r.from === selectedModel.name || r.to === selectedModel.name).length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-2">관계 없음</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
