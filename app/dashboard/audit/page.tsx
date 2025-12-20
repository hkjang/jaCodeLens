'use client';

import { ClipboardList, User, Clock, Filter, Search, FileText, Settings, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const mockAuditLogs = [
  { id: '1', action: 'ANALYSIS_START', actor: 'admin', target: 'JacodeLens Core', timestamp: '2024-12-20 13:45:23', ip: '192.168.1.100' },
  { id: '2', action: 'ANALYSIS_COMPLETE', actor: 'SYSTEM', target: 'JacodeLens Core', timestamp: '2024-12-20 13:50:45', ip: '192.168.1.1' },
  { id: '3', action: 'RESULT_REVIEWED', actor: 'dev1', target: '보안 이슈 #3', timestamp: '2024-12-20 12:30:00', ip: '192.168.1.105' },
  { id: '4', action: 'APPROVED', actor: 'ops1', target: 'Security Review', timestamp: '2024-12-20 11:15:00', ip: '192.168.1.110' },
  { id: '5', action: 'SETTINGS_CHANGED', actor: 'admin', target: '분석 정책', timestamp: '2024-12-20 10:00:00', ip: '192.168.1.100' },
  { id: '6', action: 'USER_LOGIN', actor: 'dev1', target: '-', timestamp: '2024-12-20 09:30:00', ip: '192.168.1.105' },
  { id: '7', action: 'ANALYSIS_START', actor: 'admin', target: 'Payment Gateway', timestamp: '2024-12-19 16:45:00', ip: '192.168.1.100' },
  { id: '8', action: 'EXPORT', actor: 'auditor1', target: '주간 리포트', timestamp: '2024-12-19 14:20:00', ip: '192.168.1.120' },
];

const actionConfig: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  ANALYSIS_START: { icon: Activity, color: 'text-blue-500', label: '분석 시작' },
  ANALYSIS_COMPLETE: { icon: Activity, color: 'text-green-500', label: '분석 완료' },
  RESULT_REVIEWED: { icon: FileText, color: 'text-purple-500', label: '결과 검토' },
  APPROVED: { icon: ClipboardList, color: 'text-green-500', label: '승인' },
  SETTINGS_CHANGED: { icon: Settings, color: 'text-yellow-500', label: '설정 변경' },
  USER_LOGIN: { icon: User, color: 'text-gray-500', label: '로그인' },
  EXPORT: { icon: FileText, color: 'text-blue-500', label: '내보내기' },
};

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = mockAuditLogs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (search && !log.target.toLowerCase().includes(search.toLowerCase()) && !log.actor.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">감사 로그</h2>
        <p className="text-gray-500">시스템 활동 기록을 확인합니다</p>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="사용자 또는 대상 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">전체 액션</option>
            {Object.entries(actionConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500">
          <span>액션</span>
          <span>사용자</span>
          <span>대상</span>
          <span>시간</span>
          <span>IP</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {filteredLogs.map((log, index) => {
            const config = actionConfig[log.action] || { icon: Activity, color: 'text-gray-500', label: log.action };
            const Icon = config.icon;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="grid grid-cols-5 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <span className={`flex items-center gap-2 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                  {config.label}
                </span>
                <span className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <User className="w-4 h-4 text-gray-400" />
                  {log.actor}
                </span>
                <span className="text-gray-600 dark:text-gray-400 truncate">{log.target}</span>
                <span className="flex items-center gap-2 text-gray-500 text-sm">
                  <Clock className="w-4 h-4" />
                  {log.timestamp}
                </span>
                <span className="text-gray-400 text-sm font-mono">{log.ip}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
