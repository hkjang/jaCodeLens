'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Code2, AlertTriangle, CheckCircle, Clock, ArrowRight, Filter, Search, FileCode } from 'lucide-react';
import { motion } from 'framer-motion';

// 심각도/상태 설정
const severityConfig: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  HIGH: { color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
  MEDIUM: { color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
  LOW: { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  INFO: { color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800' },
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  open: { icon: AlertTriangle, color: 'text-red-500', label: '열림' },
  'in-progress': { icon: Clock, color: 'text-yellow-500', label: '진행 중' },
  fixed: { icon: CheckCircle, color: 'text-green-500', label: '해결됨' },
};

interface Issue {
  id: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  mainCategory: string;
  subCategory: string;
  severity: string;
  message: string;
  suggestion?: string | null;
  ruleId: string;
  status?: string;
}

export default function AnalysisPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ severity: '', category: '', search: '' });
  const [groupByFile, setGroupByFile] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  async function fetchIssues() {
    try {
      const res = await fetch('/api/pipeline/issues');
      if (res.ok) {
        const data = await res.json();
        setIssues(data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch issues:', e);
    } finally {
      setLoading(false);
    }
  }

  // 필터링
  const filteredIssues = issues.filter(issue => {
    if (filter.severity && issue.severity !== filter.severity) return false;
    if (filter.category && issue.mainCategory !== filter.category) return false;
    if (filter.search && !issue.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  // 파일별 그룹핑
  const groupedByFile = groupByFile
    ? filteredIssues.reduce((acc, issue) => {
        const file = issue.filePath;
        if (!acc[file]) acc[file] = [];
        acc[file].push(issue);
        return acc;
      }, {} as Record<string, Issue[]>)
    : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">코드 이슈</h2>
          <p className="text-gray-500">파일별 코드 이슈를 확인하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupByFile(!groupByFile)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              groupByFile 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            파일별 그룹
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이슈 검색..."
            value={filter.search}
            onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          />
        </div>
        <select
          value={filter.severity}
          onChange={(e) => setFilter(f => ({ ...f, severity: e.target.value }))}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">전체 심각도</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select
          value={filter.category}
          onChange={(e) => setFilter(f => ({ ...f, category: e.target.value }))}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">전체 카테고리</option>
          <option value="SECURITY">보안</option>
          <option value="QUALITY">품질</option>
          <option value="STRUCTURE">구조</option>
          <option value="STANDARDS">표준</option>
        </select>
      </div>

      {/* Issue List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-4">이슈 로딩 중...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FileCode className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">이슈가 없습니다</h3>
          <p className="text-gray-500 mt-2">분석을 실행하면 코드 이슈가 여기에 표시됩니다</p>
        </div>
      ) : groupByFile && groupedByFile ? (
        <div className="space-y-4">
          {Object.entries(groupedByFile).map(([file, fileIssues]) => (
            <motion.div
              key={file}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{file}</span>
                </div>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                  {fileIssues.length}개
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {fileIssues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const severity = severityConfig[issue.severity] || severityConfig.INFO;
  
  return (
    <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="flex items-start gap-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${severity.bg} ${severity.color}`}>
          {issue.severity}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-white">{issue.message}</p>
          {issue.suggestion && (
            <p className="text-xs text-gray-500 mt-1">💡 {issue.suggestion}</p>
          )}
        </div>
        <span className="text-xs text-gray-400">L{issue.lineStart}</span>
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const severity = severityConfig[issue.severity] || severityConfig.INFO;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-lg border ${severity.border} ${severity.bg}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${severity.color}`}>
              {issue.severity}
            </span>
            <span className="text-xs text-gray-500">{issue.mainCategory}</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white">{issue.message}</p>
          <p className="text-xs text-gray-500 mt-1 font-mono">{issue.filePath}:{issue.lineStart}</p>
        </div>
      </div>
    </motion.div>
  );
}
