'use client';

import { FileText, Filter, Search, Clock, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const mockLogs = [
  { id: '1', timestamp: '2024-12-20 13:50:23', level: 'info', source: 'SecurityAgent', message: 'Started analysis on JacodeLens Core' },
  { id: '2', timestamp: '2024-12-20 13:50:24', level: 'info', source: 'SecurityAgent', message: 'Scanning 156 files...' },
  { id: '3', timestamp: '2024-12-20 13:50:45', level: 'warning', source: 'SecurityAgent', message: 'Found potential SQL injection in users.ts:45' },
  { id: '4', timestamp: '2024-12-20 13:50:46', level: 'error', source: 'ReviewerAgent', message: 'Connection timeout to analysis service' },
  { id: '5', timestamp: '2024-12-20 13:50:48', level: 'info', source: 'OpsRiskAgent', message: 'Completed risk assessment' },
  { id: '6', timestamp: '2024-12-20 13:51:00', level: 'warning', source: 'StaticAnalysisAgent', message: 'High cyclomatic complexity detected in parser.ts' },
  { id: '7', timestamp: '2024-12-20 13:51:15', level: 'info', source: 'ArchitectureAgent', message: 'Dependency analysis completed' },
  { id: '8', timestamp: '2024-12-20 13:51:30', level: 'success', source: 'SecurityAgent', message: 'Analysis completed. Score: 78.5' },
];

const levelConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
};

export default function LogsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredLogs = mockLogs.filter(log => {
    if (filter !== 'all' && log.level !== filter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">로그</h2>
        <p className="text-gray-500">시스템 및 분석 로그를 확인합니다</p>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="로그 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'info', 'warning', 'error', 'success'].map(level => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === level 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {level === 'all' ? '전체' : level}
            </button>
          ))}
        </div>
      </div>

      {/* Log List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700 font-mono text-sm">
          {filteredLogs.map((log, index) => {
            const config = levelConfig[log.level as keyof typeof levelConfig];
            const Icon = config.icon;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <span className="text-gray-400 whitespace-nowrap">{log.timestamp}</span>
                <div className={`p-1 rounded ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <span className="text-blue-600 dark:text-blue-400 w-32 shrink-0">[{log.source}]</span>
                <span className="text-gray-900 dark:text-white">{log.message}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
