'use client';

import { Layers, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const mockModules = [
  { id: 'api', name: 'API Layer', type: 'api', dependencies: ['services'], issues: 3 },
  { id: 'services', name: 'Services', type: 'service', dependencies: ['core', 'utils'], issues: 5 },
  { id: 'core', name: 'Core', type: 'core', dependencies: [], issues: 1 },
  { id: 'utils', name: 'Utilities', type: 'util', dependencies: [], issues: 2 },
  { id: 'auth', name: 'Auth Module', type: 'service', dependencies: ['core'], issues: 0 },
  { id: 'payments', name: 'Payments', type: 'service', dependencies: ['api', 'core'], issues: 4 },
];

const typeColors: Record<string, string> = {
  api: 'bg-blue-500',
  service: 'bg-purple-500',
  core: 'bg-green-500',
  util: 'bg-yellow-500',
};

export default function ArchitecturePage() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">아키텍처</h2>
          <p className="text-gray-500">시스템 구조와 모듈 의존성을 시각화합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Architecture Diagram */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 min-h-[400px]">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} className="transition-transform">
            <div className="flex flex-col items-center gap-8 py-8">
              {/* API Layer */}
              <div className="flex gap-4">
                {mockModules.filter(m => m.type === 'api').map(module => (
                  <motion.button
                    key={module.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedModule(module.id)}
                    className={`px-6 py-4 rounded-xl text-white font-medium shadow-lg ${typeColors[module.type]} ${selectedModule === module.id ? 'ring-4 ring-blue-300' : ''}`}
                  >
                    {module.name}
                    {module.issues > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{module.issues}</span>
                    )}
                  </motion.button>
                ))}
              </div>
              
              {/* Arrow */}
              <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
              
              {/* Services Layer */}
              <div className="flex gap-4 flex-wrap justify-center">
                {mockModules.filter(m => m.type === 'service').map(module => (
                  <motion.button
                    key={module.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedModule(module.id)}
                    className={`px-6 py-4 rounded-xl text-white font-medium shadow-lg ${typeColors[module.type]} ${selectedModule === module.id ? 'ring-4 ring-purple-300' : ''}`}
                  >
                    {module.name}
                    {module.issues > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{module.issues}</span>
                    )}
                  </motion.button>
                ))}
              </div>
              
              {/* Arrow */}
              <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
              
              {/* Core & Utils */}
              <div className="flex gap-4">
                {mockModules.filter(m => m.type === 'core' || m.type === 'util').map(module => (
                  <motion.button
                    key={module.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedModule(module.id)}
                    className={`px-6 py-4 rounded-xl text-white font-medium shadow-lg ${typeColors[module.type]} ${selectedModule === module.id ? 'ring-4 ring-green-300' : ''}`}
                  >
                    {module.name}
                    {module.issues > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{module.issues}</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Module Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">모듈 상세</h3>
          {selectedModule ? (
            <div className="space-y-4">
              {(() => {
                const module = mockModules.find(m => m.id === selectedModule);
                if (!module) return null;
                return (
                  <>
                    <div>
                      <span className="text-sm text-gray-500">이름</span>
                      <p className="font-medium text-gray-900 dark:text-white">{module.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">타입</span>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{module.type}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">의존성</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {module.dependencies.length > 0 ? module.dependencies.join(', ') : '없음'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">이슈</span>
                      <p className={`font-medium ${module.issues > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {module.issues}개
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">모듈을 선택하면 상세 정보가 표시됩니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
