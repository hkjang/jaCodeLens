'use client';

/**
 * 의존성 그래프 시각화 컴포넌트 (Interactive Version)
 * 
 * - Force-directed 레이아웃
 * - 줌/팬 컨트롤
 * - 노드 클릭 시 상세 정보
 * - 순환 의존성 하이라이트
 * - 검색 및 필터
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Minimize2, Search, 
  GitBranch, AlertTriangle, ArrowRight, X, RefreshCw,
  Package, Link2
} from 'lucide-react';

interface DependencyNode {
  id: string;
  name: string;
  type: string;
  issueCount?: number;
}

interface DependencyEdge {
  from: string;
  to: string;
  type: string;
  isCircular: boolean;
}

interface DependencyGraphViewerProps {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  circularDeps: string[][];
  onRefresh?: () => void;
  loading?: boolean;
}

interface PositionedNode extends DependencyNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function DependencyGraphViewer({
  nodes,
  edges,
  circularDeps,
  onRefresh,
  loading = false
}: DependencyGraphViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // 순환 의존성에 포함된 노드 ID Set
  const circularNodeIds = useMemo(() => {
    const ids = new Set<string>();
    circularDeps.forEach(cycle => cycle.forEach(id => ids.add(id)));
    return ids;
  }, [circularDeps]);

  // Force-directed 레이아웃 계산
  const positionedNodes = useMemo(() => {
    if (nodes.length === 0) return [];

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    // 초기 위치 (원형 배치)
    const positioned: PositionedNode[] = nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0
      };
    });

    // 간단한 Force simulation (몇 번의 iteration)
    const iterations = 50;
    const repulsion = 5000;
    const attraction = 0.01;
    const damping = 0.9;

    for (let iter = 0; iter < iterations; iter++) {
      // 노드 간 반발력
      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const dx = positioned[j].x - positioned[i].x;
          const dy = positioned[j].y - positioned[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          positioned[i].vx -= fx;
          positioned[i].vy -= fy;
          positioned[j].vx += fx;
          positioned[j].vy += fy;
        }
      }

      // 엣지에 의한 인력
      edges.forEach(edge => {
        const source = positioned.find(n => n.id === edge.from || n.name === edge.from);
        const target = positioned.find(n => n.id === edge.to || n.name === edge.to);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = dist * attraction;
          const fx = dx * force;
          const fy = dy * force;
          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // 중심으로 당기기
      positioned.forEach(node => {
        node.vx += (centerX - node.x) * 0.001;
        node.vy += (centerY - node.y) * 0.001;
      });

      // 속도 적용 및 감쇠
      positioned.forEach(node => {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
        // 경계 제한
        node.x = Math.max(60, Math.min(width - 60, node.x));
        node.y = Math.max(40, Math.min(height - 40, node.y));
      });
    }

    return positioned;
  }, [nodes, edges]);

  // 검색 필터링
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return positionedNodes;
    const q = searchQuery.toLowerCase();
    return positionedNodes.filter(node => 
      node.name.toLowerCase().includes(q) || 
      node.id.toLowerCase().includes(q)
    );
  }, [positionedNodes, searchQuery]);

  // 선택된 노드의 연결된 엣지
  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return edges.filter(e => 
      e.from === selectedNode.id || e.to === selectedNode.id ||
      e.from === selectedNode.name || e.to === selectedNode.name
    );
  }, [selectedNode, edges]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.3, Math.min(3, z * delta)));
  }, []);

  // 줌 컨트롤
  const zoomIn = () => setZoom(z => Math.min(3, z * 1.2));
  const zoomOut = () => setZoom(z => Math.max(0.3, z / 1.2));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  // 노드 타입에 따른 색상
  const getNodeColor = (node: PositionedNode) => {
    if (circularNodeIds.has(node.id) || circularNodeIds.has(node.name)) {
      return { fill: '#fef2f2', stroke: '#ef4444' }; // 순환 의존성: 빨간색
    }
    const colors: Record<string, { fill: string; stroke: string }> = {
      api: { fill: '#eff6ff', stroke: '#3b82f6' },
      service: { fill: '#f0fdf4', stroke: '#22c55e' },
      component: { fill: '#faf5ff', stroke: '#a855f7' },
      util: { fill: '#fefce8', stroke: '#eab308' },
      model: { fill: '#fff7ed', stroke: '#f97316' },
      module: { fill: '#f1f5f9', stroke: '#64748b' }
    };
    return colors[node.type] || colors.module;
  };

  // 빈 상태
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <GitBranch className="w-16 h-16 mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">의존성 정보가 없습니다</h3>
        <p className="text-sm mt-2">분석을 실행하면 의존성 그래프가 여기에 표시됩니다</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            분석 실행
          </button>
        )}
      </div>
    );
  }

  const containerClass = isFullscreen
    ? 'fixed inset-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl'
    : 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700';

  return (
    <div className={containerClass}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            의존성 그래프
          </h3>
          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
            {nodes.length}개 모듈, {edges.length}개 연결
          </span>
          {circularDeps.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {circularDeps.length}개 순환
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="모듈 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg w-40 focus:w-56 transition-all"
            />
          </div>
          
          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button onClick={zoomOut} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="축소">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="확대">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* 리프레시 */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* 풀스크린 */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title={isFullscreen ? '창 모드' : '전체 화면'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 그래프 영역 */}
      <div className={`relative overflow-hidden ${isFullscreen ? 'h-[calc(100%-8rem)]' : 'h-[500px]'}`}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <defs>
            {/* 화살표 마커 */}
            <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth={4} markerHeight={4} orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
            <marker id="arrowhead-circular" viewBox="0 0 10 10" refX="8" refY="5" markerWidth={4} markerHeight={4} orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* 엣지 */}
            {edges.map((edge, idx) => {
              const source = positionedNodes.find(n => n.id === edge.from || n.name === edge.from);
              const target = positionedNodes.find(n => n.id === edge.to || n.name === edge.to);
              if (!source || !target) return null;

              const isHighlighted = selectedNode && (
                edge.from === selectedNode.id || edge.from === selectedNode.name ||
                edge.to === selectedNode.id || edge.to === selectedNode.name
              );

              return (
                <line
                  key={idx}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={edge.isCircular ? '#ef4444' : isHighlighted ? '#3b82f6' : '#cbd5e1'}
                  strokeWidth={edge.isCircular ? 2.5 : isHighlighted ? 2 : 1.5}
                  strokeDasharray={edge.isCircular ? '6,3' : 'none'}
                  markerEnd={edge.isCircular ? 'url(#arrowhead-circular)' : 'url(#arrowhead)'}
                  opacity={selectedNode && !isHighlighted ? 0.2 : 1}
                  className="transition-opacity"
                />
              );
            })}

            {/* 노드 */}
            {(searchQuery ? filteredNodes : positionedNodes).map(node => {
              const colors = getNodeColor(node);
              const isSelected = selectedNode?.id === node.id || selectedNode?.name === node.name;
              const isConnected = selectedNode && connectedEdges.some(e =>
                e.from === node.id || e.from === node.name ||
                e.to === node.id || e.to === node.name
              );
              const isHovered = hoveredNode === node.id;
              const shouldFade = selectedNode && !isSelected && !isConnected;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode(isSelected ? null : node)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                  style={{ opacity: shouldFade ? 0.3 : 1, transition: 'opacity 0.2s' }}
                >
                  {/* 노드 배경 */}
                  <rect
                    x={-50}
                    y={-18}
                    width={100}
                    height={36}
                    rx={6}
                    fill={isSelected ? colors.stroke : colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected || isHovered ? 3 : 2}
                    className="transition-all"
                  />
                  {/* 노드 타입 */}
                  <text
                    y={-4}
                    textAnchor="middle"
                    fill={isSelected ? '#fff' : colors.stroke}
                    fontSize={9}
                    fontWeight="medium"
                  >
                    {node.type.toUpperCase()}
                  </text>
                  {/* 노드 이름 */}
                  <text
                    y={10}
                    textAnchor="middle"
                    fill={isSelected ? '#fff' : '#374151'}
                    fontSize={11}
                    fontWeight="bold"
                  >
                    {node.name.length > 12 ? node.name.slice(0, 10) + '...' : node.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* 로딩 오버레이 */}
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}
      </div>

      {/* 선택된 노드 상세 패널 */}
      {selectedNode && (
        <div className="absolute right-4 top-16 w-72 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4" />
              {selectedNode.name}
            </h4>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <span className="text-xs text-gray-500">타입</span>
              <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedNode.type}</p>
            </div>
            {selectedNode.issueCount !== undefined && (
              <div>
                <span className="text-xs text-gray-500">관련 이슈</span>
                <p className="font-medium text-gray-900 dark:text-white">{selectedNode.issueCount}개</p>
              </div>
            )}
            {circularNodeIds.has(selectedNode.id) || circularNodeIds.has(selectedNode.name) ? (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  순환 의존성에 포함됨
                </div>
              </div>
            ) : null}
            
            {/* 연결된 의존성 */}
            {connectedEdges.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 mb-2 block">연결된 모듈</span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {connectedEdges.map((edge, idx) => {
                    const isOutgoing = edge.from === selectedNode.id || edge.from === selectedNode.name;
                    const otherNode = isOutgoing ? edge.to : edge.from;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <ArrowRight className={`w-3 h-3 ${isOutgoing ? '' : 'rotate-180'}`} />
                        <span>{otherNode}</span>
                        {edge.isCircular && (
                          <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs">
                            순환
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-50" />
            API
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-green-500 bg-green-50" />
            Service
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-purple-500 bg-purple-50" />
            Component
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-red-500 bg-red-50" />
            순환 의존성
          </span>
        </div>
        <button
          onClick={resetView}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          뷰 초기화
        </button>
      </div>
    </div>
  );
}
