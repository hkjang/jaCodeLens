'use client';

import React, { useState } from 'react';
import { Search, Filter, Calendar, User, FileText, Settings, Shield, ChevronRight } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  targetType: string;
  details: string;
  ipAddress: string;
}

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('7d');

  const logs: AuditLogEntry[] = [
    { id: '1', timestamp: '2024-12-20 10:30:15', actor: 'admin@company.com', action: 'ANALYSIS_START', target: 'project-alpha', targetType: 'PROJECT', details: 'Started full analysis', ipAddress: '192.168.1.100' },
    { id: '2', timestamp: '2024-12-20 10:25:00', actor: 'dev@company.com', action: 'ISSUE_FIXED', target: 'issue-123', targetType: 'RESULT', details: 'Marked as fixed', ipAddress: '192.168.1.101' },
    { id: '3', timestamp: '2024-12-20 09:45:30', actor: 'admin@company.com', action: 'POLICY_UPDATED', target: 'security-policy', targetType: 'POLICY', details: 'Updated SQL injection threshold', ipAddress: '192.168.1.100' },
    { id: '4', timestamp: '2024-12-20 09:30:00', actor: 'system', action: 'AGENT_ERROR', target: 'TestAnalysisAgent', targetType: 'AGENT', details: 'Timeout after 30s', ipAddress: 'localhost' },
    { id: '5', timestamp: '2024-12-19 18:00:00', actor: 'admin@company.com', action: 'USER_ADDED', target: 'newuser@company.com', targetType: 'USER', details: 'Added as Developer role', ipAddress: '192.168.1.100' },
    { id: '6', timestamp: '2024-12-19 16:30:00', actor: 'architect@company.com', action: 'REPORT_EXPORTED', target: 'report-2024-12', targetType: 'REPORT', details: 'Exported as PDF', ipAddress: '192.168.1.102' },
    { id: '7', timestamp: '2024-12-19 14:00:00', actor: 'admin@company.com', action: 'MODEL_CHANGED', target: 'GPT-4o', targetType: 'MODEL', details: 'Set as default model', ipAddress: '192.168.1.100' },
  ];

  const getActionColor = (action: string) => {
    if (action.includes('ERROR') || action.includes('DELETE')) return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    if (action.includes('ADD') || action.includes('CREATE') || action.includes('START')) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'PROJECT': return <FileText className="w-4 h-4" />;
      case 'USER': return <User className="w-4 h-4" />;
      case 'POLICY': return <Shield className="w-4 h-4" />;
      case 'AGENT': return <Settings className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredLogs = logs.filter(log => 
    searchQuery === '' ||
    log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.target.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">감사 로그</h1>
        <p className="text-gray-500 dark:text-gray-400">시스템 변경 이력</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="사용자, 액션, 대상 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <option value="1d">최근 1일</option>
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
            <option value="90d">최근 90일</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시간</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">대상</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">상세</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{log.actor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      {getTargetIcon(log.targetType)}
                      <span>{log.target}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-500 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-400 font-mono">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
