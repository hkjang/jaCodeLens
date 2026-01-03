'use client';

/**
 * 코드 요소 의존성 그래프 컴포넌트
 * 
 * - 코드 요소 간 관계 시각화
 * - 부모-자식 관계 (클래스-메서드)
 * - 파일별 그룹핑
 */

import { useMemo, useState } from 'react';
import { GitBranch, Maximize2, Minimize2, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface CodeElement {
  id: string;
  filePath: string;
  fileName: string;
  elementType: string;
  name: string;
  parentName?: string;
  lineStart: number;
  lineEnd: number;
}

interface DependencyGraphProps {
  elements: CodeElement[];
  onSelectElement?: (el: CodeElement) => void;
  selectedId?: string;
}

export default function DependencyGraph({ elements, onSelectElement, selectedId }: DependencyGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 노드와 엣지 생성
  const { nodes, edges, groups } = useMemo(() => {
    const nodeMap = new Map<string, CodeElement>();
    const edges: { from: string; to: string }[] = [];
    const groups = new Map<string, CodeElement[]>();

    elements.forEach(el => {
      nodeMap.set(el.id, el);
      
      // 파일별 그룹
      const fileName = el.filePath;
      if (!groups.has(fileName)) groups.set(fileName, []);
      groups.get(fileName)!.push(el);
      
      // 부모-자식 관계
      if (el.parentName) {
        const parent = elements.find(e => 
          e.name === el.parentName && 
          e.filePath === el.filePath &&
          e.elementType === 'CLASS'
        );
        if (parent) {
          edges.push({ from: parent.id, to: el.id });
        }
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
      groups: Array.from(groups.entries())
    };
  }, [elements]);

  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      CLASS: '#a855f7',
      FUNCTION: '#3b82f6',
      METHOD: '#06b6d4',
      COMPONENT: '#22c55e',
      INTERFACE: '#eab308',
      TYPE: '#f97316',
    };
    return colors[type] || '#6b7280';
  }

  // 간단한 그래프 레이아웃 계산
  const layoutNodes = useMemo(() => {
    const positioned: Array<CodeElement & { x: number; y: number }> = [];
    let groupY = 50;
    
    groups.forEach(([fileName, groupElements]) => {
      let x = 100;
      const y = groupY;
      
      // 부모(클래스) 먼저 배치
      const parents = groupElements.filter(e => e.elementType === 'CLASS' || !e.parentName);
      const children = groupElements.filter(e => e.parentName);
      
      parents.forEach(el => {
        positioned.push({ ...el, x, y });
        x += 160;
      });
      
      // 자식(메서드) 배치
      x = 140;
      let childY = y + 80;
      children.forEach((el, i) => {
        positioned.push({ ...el, x: x + (i % 4) * 120, y: childY + Math.floor(i / 4) * 60 });
      });
      
      groupY += 200 + Math.ceil(children.length / 4) * 60;
    });
    
    return positioned;
  }, [groups]);

  if (elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>그래프를 표시할 요소가 없습니다</p>
        </div>
      </div>
    );
  }

  const containerClass = isFullscreen 
    ? 'fixed inset-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl' 
    : 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700';

  return (
    <div className={containerClass}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          의존성 그래프
          <span className="text-xs text-gray-400">({nodes.length} 노드, {edges.length} 엣지)</span>
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} className="p-1 text-gray-400 hover:text-gray-600">
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-1 text-gray-400 hover:text-gray-600">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 text-gray-400 hover:text-gray-600">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 그래프 영역 */}
      <div className={`overflow-auto ${isFullscreen ? 'h-[calc(100%-3rem)]' : 'h-[400px]'}`}>
        <svg 
          width={Math.max(800, layoutNodes.length * 100)} 
          height={Math.max(400, groups.length * 250)}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {/* 파일 그룹 배경 */}
          {groups.map(([fileName], i) => {
            const groupNodes = layoutNodes.filter(n => n.filePath === fileName);
            if (groupNodes.length === 0) return null;
            const minX = Math.min(...groupNodes.map(n => n.x)) - 20;
            const maxX = Math.max(...groupNodes.map(n => n.x)) + 140;
            const minY = Math.min(...groupNodes.map(n => n.y)) - 30;
            const maxY = Math.max(...groupNodes.map(n => n.y)) + 50;
            return (
              <g key={fileName}>
                <rect
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  rx={8}
                  fill="#f3f4f6"
                  className="dark:fill-gray-900/50"
                />
                <text x={minX + 10} y={minY + 18} className="text-xs fill-gray-500 dark:fill-gray-400" fontSize={11}>
                  {fileName.split('/').pop()}
                </text>
              </g>
            );
          })}

          {/* 엣지 */}
          {edges.map(({ from, to }, i) => {
            const fromNode = layoutNodes.find(n => n.id === from);
            const toNode = layoutNodes.find(n => n.id === to);
            if (!fromNode || !toNode) return null;
            return (
              <line
                key={i}
                x1={fromNode.x + 60}
                y1={fromNode.y + 20}
                x2={toNode.x + 60}
                y2={toNode.y}
                stroke="#94a3b8"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* 화살표 마커 */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth={4} markerHeight={4} orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* 노드 */}
          {layoutNodes.map(node => (
            <g 
              key={node.id} 
              onClick={() => onSelectElement?.(node)}
              className="cursor-pointer"
              style={{ transition: 'transform 0.2s' }}
            >
              <rect
                x={node.x}
                y={node.y}
                width={120}
                height={36}
                rx={6}
                fill={selectedId === node.id ? getTypeColor(node.elementType) : '#fff'}
                stroke={getTypeColor(node.elementType)}
                strokeWidth={2}
                className={selectedId === node.id ? 'opacity-100' : 'opacity-90 hover:opacity-100'}
              />
              <text
                x={node.x + 60}
                y={node.y + 14}
                textAnchor="middle"
                fill={selectedId === node.id ? '#fff' : '#374151'}
                fontSize={10}
                fontWeight="medium"
              >
                {node.elementType}
              </text>
              <text
                x={node.x + 60}
                y={node.y + 28}
                textAnchor="middle"
                fill={selectedId === node.id ? '#fff' : '#111827'}
                fontSize={11}
                fontWeight="bold"
              >
                {node.name.length > 14 ? node.name.slice(0, 12) + '...' : node.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs">
        {['CLASS', 'FUNCTION', 'METHOD', 'COMPONENT', 'INTERFACE'].map(type => (
          <span key={type} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: getTypeColor(type) }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}
