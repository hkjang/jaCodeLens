'use client';

/**
 * 개선 태스크 관리 페이지
 * 
 * - 태스크 목록 (상태별 필터)
 * - 상태 변경
 * - 담당자 할당
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle, Clock, AlertCircle, XCircle, User,
  RefreshCw, Filter, Search, ChevronRight, FileCode,
  Edit3, ExternalLink, ArrowRight, Plus, Target
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  severity?: string;
  status: string;
  filePath?: string;
  lineStart?: number;
  assignedTo?: string;
  resolvedAt?: string;
  verifiedAt?: string;
  linkedCommit?: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  project?: { id: string; name: string };
}

interface TaskStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  verified: number;
  wontFix: number;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTasks();
  }, [statusFilter, priorityFilter]);

  async function loadTasks() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);

      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(id: string, newStatus: string) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        loadTasks();
      }
    } catch (e) {
      console.error('Failed to update task', e);
    }
  }

  const filteredTasks = tasks.filter(t =>
    !searchQuery ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.filePath?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getStatusBadge(status: string) {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      OPEN: { bg: 'bg-blue-100 text-blue-700', icon: <AlertCircle className="w-3 h-3" /> },
      IN_PROGRESS: { bg: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
      RESOLVED: { bg: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
      VERIFIED: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
      WONT_FIX: { bg: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-3 h-3" /> },
    };
    return styles[status] || styles.OPEN;
  }

  function getPriorityBadge(priority: string) {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-700',
      HIGH: 'bg-orange-100 text-orange-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      LOW: 'bg-blue-100 text-blue-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  }

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">개선 태스크</h2>
          <p className="text-gray-500">분석에서 발견된 이슈를 추적하고 관리합니다</p>
        </div>
        <button
          onClick={loadTasks}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </header>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard label="전체" count={stats.total} color="bg-gray-500" />
          <StatCard label="열림" count={stats.open} color="bg-blue-500" />
          <StatCard label="진행중" count={stats.inProgress} color="bg-yellow-500" />
          <StatCard label="해결됨" count={stats.resolved} color="bg-green-500" />
          <StatCard label="검증됨" count={stats.verified} color="bg-emerald-500" />
          <StatCard label="무시" count={stats.wontFix} color="bg-gray-400" />
        </div>
      )}

      {/* 필터 바 */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="태스크 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">모든 상태</option>
          <option value="OPEN">열림</option>
          <option value="IN_PROGRESS">진행중</option>
          <option value="RESOLVED">해결됨</option>
          <option value="VERIFIED">검증됨</option>
          <option value="WONT_FIX">무시</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">모든 우선순위</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* 태스크 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredTasks.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTasks.map((task) => {
              const statusStyle = getStatusBadge(task.status);
              
              return (
                <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start gap-4">
                    {/* 상태 */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusStyle.bg}`}>
                      {statusStyle.icon}
                      {task.status}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {task.title}
                        </h3>
                      </div>
                      
                      {task.filePath && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <FileCode className="w-3 h-3" />
                          <span className="truncate">{task.filePath}</span>
                          {task.lineStart && <span>L{task.lineStart}</span>}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        {task.project && (
                          <Link
                            href={`/dashboard/projects/${task.project.id}`}
                            className="flex items-center gap-1 hover:text-blue-500"
                          >
                            <Target className="w-3 h-3" />
                            {task.project.name}
                          </Link>
                        )}
                        {task.assignedTo && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.assignedTo}
                          </span>
                        )}
                        {task.linkedCommit && (
                          <span className="font-mono">{task.linkedCommit.slice(0, 7)}</span>
                        )}
                      </div>
                    </div>

                    {/* 액션 */}
                    <div className="flex items-center gap-2">
                      {task.status === 'OPEN' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                          className="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-sm rounded"
                        >
                          시작
                        </button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'RESOLVED')}
                          className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded"
                        >
                          해결
                        </button>
                      )}
                      {task.status === 'RESOLVED' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'VERIFIED')}
                          className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm rounded"
                        >
                          검증
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">개선 태스크가 없습니다</p>
            <p className="text-sm mt-2">분석을 실행하면 이슈에서 태스크가 자동 생성됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</div>
    </div>
  );
}
