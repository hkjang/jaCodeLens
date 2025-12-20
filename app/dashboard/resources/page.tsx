'use client';

import { Activity, Cpu, MemoryStick, HardDrive, Wifi, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

const mockResources = [
  { id: 'cpu', name: 'CPU', icon: Cpu, usage: 67, trend: 5, unit: '%' },
  { id: 'memory', name: 'Memory', icon: MemoryStick, usage: 42, trend: -3, unit: '%' },
  { id: 'disk', name: 'Disk I/O', icon: HardDrive, usage: 28, trend: 8, unit: '%' },
  { id: 'network', name: 'Network', icon: Wifi, usage: 15, trend: -2, unit: 'Mbps' },
];

const mockProcesses = [
  { name: 'StaticAnalysisAgent', cpu: 23.5, memory: 512, status: 'running' },
  { name: 'SecurityAgent', cpu: 18.2, memory: 384, status: 'running' },
  { name: 'Node.js (Main)', cpu: 12.8, memory: 256, status: 'running' },
  { name: 'PrismaClient', cpu: 5.4, memory: 128, status: 'idle' },
  { name: 'ArchitectureAgent', cpu: 2.1, memory: 96, status: 'idle' },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">리소스</h2>
        <p className="text-gray-500">시스템 리소스 사용량을 모니터링합니다</p>
      </header>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockResources.map((resource, index) => {
          const Icon = resource.icon;
          const isHigh = resource.usage > 70;
          const isTrendUp = resource.trend > 0;
          return (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isHigh ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    <Icon className={`w-5 h-5 ${isHigh ? 'text-red-500' : 'text-blue-500'}`} />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{resource.name}</span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${isTrendUp ? 'text-red-500' : 'text-green-500'}`}>
                  {isTrendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(resource.trend)}%
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{resource.usage}</span>
                  <span className="text-gray-500 mb-1">{resource.unit}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${isHigh ? 'bg-red-500' : resource.usage > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${resource.usage}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Process List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">프로세스</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {mockProcesses.map((process, index) => (
            <motion.div
              key={process.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-4 gap-4 p-4 items-center"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${process.status === 'running' ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="font-medium text-gray-900 dark:text-white">{process.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{process.cpu}%</span>
              </div>
              <div className="flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{process.memory} MB</span>
              </div>
              <span className={`text-sm capitalize ${process.status === 'running' ? 'text-green-500' : 'text-gray-500'}`}>
                {process.status === 'running' ? '실행 중' : '대기'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
