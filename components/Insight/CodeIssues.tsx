'use client';

import React, { useState } from 'react';
import { Search, Filter, ChevronDown, FileCode, AlertTriangle, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

interface CodeIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line: number;
  message: string;
  suggestion: string;
  status: 'open' | 'fixed' | 'ignored';
}

interface CodeIssuesProps {
  data?: CodeIssue[];
}

export default function CodeIssues({ data }: CodeIssuesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  // Mock data
  const issues: CodeIssue[] = data || [
    { id: '1', severity: 'critical', category: 'Security', file: 'src/api/auth.ts', line: 42, message: 'SQL Injection 취약점: 사용자 입력이 직접 쿼리에 사용됨', suggestion: 'Parameterized query 또는 ORM을 사용하세요.', status: 'open' },
    { id: '2', severity: 'high', category: 'Architecture', file: 'src/services/userService.ts', line: 156, message: '순환 의존성: UserService → OrderService → UserService', suggestion: '인터페이스를 통한 의존성 역전(DIP)을 적용하세요.', status: 'open' },
    { id: '3', severity: 'high', category: 'Security', file: 'src/api/payment.ts', line: 89, message: 'API 키가 하드코딩됨', suggestion: '환경 변수 또는 시크릿 관리자를 사용하세요.', status: 'fixed' },
    { id: '4', severity: 'medium', category: 'Quality', file: 'src/utils/parser.ts', line: 23, message: '함수 복잡도가 높음 (Cyclomatic: 15)', suggestion: '함수를 작은 단위로 분리하세요.', status: 'open' },
    { id: '5', severity: 'medium', category: 'Quality', file: 'src/utils/helpers.ts', line: 78, message: '중복 코드 감지: calculateTotal()과 유사', suggestion: '공통 함수로 추출하세요.', status: 'ignored' },
    { id: '6', severity: 'low', category: 'Style', file: 'src/components/Button.tsx', line: 12, message: '네이밍 컨벤션 위반: handleclick', suggestion: 'handleClick (camelCase)으로 변경하세요.', status: 'open' },
    { id: '7', severity: 'low', category: 'Style', file: 'src/hooks/useAuth.ts', line: 5, message: '미사용 import: React', suggestion: '사용하지 않는 import를 제거하세요.', status: 'open' },
  ];

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-500', text: 'text-red-500', light: 'bg-red-50 dark:bg-red-900/20' };
      case 'high': return { bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50 dark:bg-orange-900/20' };
      case 'medium': return { bg: 'bg-yellow-500', text: 'text-yellow-500', light: 'bg-yellow-50 dark:bg-yellow-900/20' };
      case 'low': return { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50 dark:bg-blue-900/20' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-500', light: 'bg-gray-50 dark:bg-gray-900/20' };
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'fixed': return { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, text: 'text-green-500' };
      case 'ignored': return { icon: <Clock className="w-4 h-4 text-gray-400" />, text: 'text-gray-400' };
      default: return { icon: <AlertTriangle className="w-4 h-4 text-orange-500" />, text: 'text-orange-500' };
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = searchQuery === '' || 
      issue.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.file.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const severityCounts = {
    critical: issues.filter(i => i.severity === 'critical' && i.status === 'open').length,
    high: issues.filter(i => i.severity === 'high' && i.status === 'open').length,
    medium: issues.filter(i => i.severity === 'medium' && i.status === 'open').length,
    low: issues.filter(i => i.severity === 'low' && i.status === 'open').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">코드 이슈</h2>
        <p className="text-gray-500 dark:text-gray-400">파일별 발견된 문제점</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(severityCounts).map(([severity, count]) => {
          const styles = getSeverityStyles(severity);
          return (
            <div 
              key={severity}
              onClick={() => setSeverityFilter(severityFilter === severity ? 'all' : severity)}
              className={`p-4 rounded-xl cursor-pointer transition-all ${styles.light} border-2 ${
                severityFilter === severity ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <div className={`text-2xl font-bold ${styles.text}`}>{count}</div>
              <div className="text-sm text-gray-500 capitalize">{severity}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="파일명 또는 메시지 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <option value="all">모든 상태</option>
          <option value="open">미해결</option>
          <option value="fixed">해결됨</option>
          <option value="ignored">무시됨</option>
        </select>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const severityStyles = getSeverityStyles(issue.severity);
            const statusStyles = getStatusStyles(issue.status);
            const isExpanded = expandedIssue === issue.id;

            return (
              <div
                key={issue.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all ${
                  issue.status === 'fixed' ? 'opacity-60' : ''
                }`}
              >
                <button
                  onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                  className="w-full p-4 flex items-start gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className={`w-1.5 h-16 rounded-full ${severityStyles.bg}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${severityStyles.bg}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{issue.category}</span>
                      <span className={`flex items-center gap-1 text-xs ${statusStyles.text}`}>
                        {statusStyles.icon}
                        {issue.status}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{issue.message}</p>
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                      <FileCode className="w-4 h-4" />
                      <span className="font-mono">{issue.file}:{issue.line}</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700">
                    <div className="ml-5 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-300">
                          <ArrowRight className="w-4 h-4" />
                          <span className="font-medium">개선 제안</span>
                        </div>
                        <p className="text-green-600 dark:text-green-400 text-sm">{issue.suggestion}</p>
                      </div>
                      {issue.status === 'open' && (
                        <div className="mt-3 flex gap-2">
                          <button className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">
                            수정하기
                          </button>
                          <button className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
                            무시
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
