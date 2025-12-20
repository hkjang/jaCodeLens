'use client';

import { Code2, AlertTriangle, CheckCircle, Clock, ArrowRight, Filter, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

const mockIssues = [
  { id: '1', title: 'SQL Injection 취약점', severity: 'CRITICAL', category: 'SECURITY', file: 'src/api/users.ts', line: 45, status: 'open' },
  { id: '2', title: 'XSS 취약점', severity: 'HIGH', category: 'SECURITY', file: 'src/components/Comment.tsx', line: 23, status: 'open' },
  { id: '3', title: '함수 복잡도 높음', severity: 'MEDIUM', category: 'QUALITY', file: 'src/utils/parser.ts', line: 89, status: 'in-progress' },
  { id: '4', title: '순환 의존성', severity: 'HIGH', category: 'ARCHITECTURE', file: 'src/modules/auth', line: null, status: 'open' },
  { id: '5', title: 'N+1 쿼리', severity: 'HIGH', category: 'PERFORMANCE', file: 'src/api/orders.ts', line: 67, status: 'fixed' },
  { id: '6', title: '민감 정보 로그 노출', severity: 'CRITICAL', category: 'SECURITY', file: 'PaymentService.java', line: 156, status: 'open' },
  { id: '7', title: '암호화되지 않은 통신', severity: 'CRITICAL', category: 'SECURITY', file: 'ApiClient.java', line: 89, status: 'in-progress' },
  { id: '8', title: '취약한 해시 알고리즘', severity: 'HIGH', category: 'SECURITY', file: 'CryptoUtils.java', line: 34, status: 'open' },
  { id: '9', title: '메모리 누수 가능성', severity: 'HIGH', category: 'PERFORMANCE', file: 'loader.py', line: 123, status: 'open' },
  { id: '10', title: '로깅 부족', severity: 'MEDIUM', category: 'OPERATIONS', file: 'src/services/payment.ts', line: null, status: 'open' },
];

const severityConfig = {
  CRITICAL: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  HIGH: { color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
  MEDIUM: { color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
  LOW: { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  INFO: { color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800' },
};

const statusConfig = {
  open: { icon: AlertTriangle, color: 'text-red-500', label: '열림' },
  'in-progress': { icon: Clock, color: 'text-yellow-500', label: '진행 중' },
  fixed: { icon: CheckCircle, color: 'text-green-500', label: '해결됨' },
};

export default function AnalysisPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredIssues = mockIssues.filter(issue => {
    if (filter !== 'all' && issue.status !== filter) return false;
    if (search && !issue.title.toLowerCase().includes(search.toLowerCase()) && !issue.file.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const criticalCount = mockIssues.filter(i => i.severity === 'CRITICAL').length;
  const highCount = mockIssues.filter(i => i.severity === 'HIGH').length;
  const openCount = mockIssues.filter(i => i.status === 'open').length;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">코드 이슈</h2>
        <p className="text-gray-500">발견된 코드 이슈를 관리합니다</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Code2 className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockIssues.length}</p>
              <p className="text-sm text-gray-500">전체 이슈</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{criticalCount}</p>
              <p className="text-sm text-gray-500">심각</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{highCount}</p>
              <p className="text-sm text-gray-500">높음</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{openCount}</p>
              <p className="text-sm text-gray-500">미해결</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이슈 또는 파일 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'open', 'in-progress', 'fixed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === status 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {status === 'all' ? '전체' : status === 'open' ? '열림' : status === 'in-progress' ? '진행 중' : '해결됨'}
            </button>
          ))}
        </div>
      </div>

      {/* Issue List */}
      <div className="space-y-3">
        {filteredIssues.map((issue, index) => {
          const sevConfig = severityConfig[issue.severity as keyof typeof severityConfig];
          const statConfig = statusConfig[issue.status as keyof typeof statusConfig];
          const StatusIcon = statConfig.icon;
          return (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                href={`/dashboard/analysis/${issue.id}`}
                className={`block bg-white dark:bg-gray-800 rounded-xl p-4 border ${sevConfig.border} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${sevConfig.bg}`}>
                      <AlertTriangle className={`w-5 h-5 ${sevConfig.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{issue.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${sevConfig.bg} ${sevConfig.color}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {issue.file}{issue.line ? `:${issue.line}` : ''} • {issue.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-sm ${statConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statConfig.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
