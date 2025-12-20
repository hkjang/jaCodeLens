'use client';

import React, { useState } from 'react';
import { Layers, ArrowRight, AlertTriangle, CheckCircle2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Module {
  id: string;
  name: string;
  type: 'core' | 'service' | 'api' | 'util' | 'component';
  dependencies: string[];
  issues: number;
}

interface ArchitectureViewProps {
  data?: Module[];
}

export default function ArchitectureView({ data }: ArchitectureViewProps) {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [zoom, setZoom] = useState(1);

  // Mock data
  const modules: Module[] = data || [
    { id: 'api', name: 'API Layer', type: 'api', dependencies: ['services'], issues: 3 },
    { id: 'services', name: 'Services', type: 'service', dependencies: ['core', 'utils'], issues: 5 },
    { id: 'core', name: 'Core', type: 'core', dependencies: [], issues: 1 },
    { id: 'utils', name: 'Utilities', type: 'util', dependencies: [], issues: 2 },
    { id: 'components', name: 'Components', type: 'component', dependencies: ['hooks', 'utils'], issues: 4 },
    { id: 'hooks', name: 'Hooks', type: 'util', dependencies: ['services'], issues: 0 },
    { id: 'pages', name: 'Pages', type: 'component', dependencies: ['components', 'hooks'], issues: 2 },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'core': return 'bg-purple-500 border-purple-400';
      case 'service': return 'bg-blue-500 border-blue-400';
      case 'api': return 'bg-green-500 border-green-400';
      case 'util': return 'bg-yellow-500 border-yellow-400';
      case 'component': return 'bg-pink-500 border-pink-400';
      default: return 'bg-gray-500 border-gray-400';
    }
  };

  const layers = {
    presentation: modules.filter(m => ['pages', 'components'].includes(m.id)),
    application: modules.filter(m => ['hooks', 'services'].includes(m.id)),
    domain: modules.filter(m => ['core'].includes(m.id)),
    infrastructure: modules.filter(m => ['api', 'utils'].includes(m.id)),
  };

  // Check for circular dependencies (simplified)
  const hasCircular = modules.some(m => 
    m.dependencies.some(dep => 
      modules.find(d => d.id === dep)?.dependencies.includes(m.id)
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">아키텍처 뷰</h2>
          <p className="text-gray-500 dark:text-gray-400">모듈 구조 및 의존성 그래프</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setZoom(1)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {hasCircular && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 dark:text-red-300">순환 의존성이 감지되었습니다. 아키텍처 리팩토링이 필요합니다.</span>
        </div>
      )}

      {/* Layered Architecture View */}
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 overflow-auto"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
      >
        <div className="space-y-4 min-w-[600px]">
          {Object.entries(layers).map(([layerName, layerModules]) => (
            <div key={layerName} className="relative">
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-400 uppercase tracking-wider whitespace-nowrap">
                {layerName}
              </div>
              <div className="ml-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 border-dashed">
                <div className="flex flex-wrap gap-4 justify-center">
                  {layerModules.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => setSelectedModule(selectedModule?.id === module.id ? null : module)}
                      className={`
                        relative px-6 py-4 rounded-xl text-white font-medium shadow-lg transition-all
                        ${getTypeColor(module.type)}
                        ${selectedModule?.id === module.id ? 'ring-4 ring-offset-2 ring-blue-500 scale-105' : 'hover:scale-105'}
                      `}
                    >
                      <Layers className="w-5 h-5 mb-1 mx-auto opacity-80" />
                      <div>{module.name}</div>
                      {module.issues > 0 && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                          {module.issues}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dependency Lines (simplified representation) */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">의존성 관계</h4>
          <div className="flex flex-wrap gap-2">
            {modules.filter(m => m.dependencies.length > 0).map(m => (
              <div key={m.id} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">{m.name}</span>
                <ArrowRight className="w-3 h-3" />
                <span>{m.dependencies.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Module Details */}
      {selectedModule && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5" />
                {selectedModule.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">Type: {selectedModule.type}</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedModule.issues === 0 ? (
                <span className="flex items-center gap-1 text-green-500 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  이슈 없음
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {selectedModule.issues} 이슈
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">의존하는 모듈</h4>
              {selectedModule.dependencies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedModule.dependencies.map(dep => (
                    <span key={dep} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm">
                      {modules.find(m => m.id === dep)?.name || dep}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">없음</span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">의존되는 모듈</h4>
              {(() => {
                const dependents = modules.filter(m => m.dependencies.includes(selectedModule.id));
                return dependents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dependents.map(dep => (
                      <span key={dep.id} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm">
                        {dep.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">없음</span>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        {[
          { type: 'core', label: 'Core' },
          { type: 'service', label: 'Service' },
          { type: 'api', label: 'API' },
          { type: 'util', label: 'Utility' },
          { type: 'component', label: 'Component' },
        ].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${getTypeColor(type)}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
