'use client';

/**
 * 작업 큐 위젯
 * 
 * 분석 작업 큐 상태를 실시간으로 표시합니다.
 */

import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Activity,
  Layers,
  Shield,
  GitBranch,
  Zap,
  ListTodo,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface QueueTask {
  id: string;
  agentType: string;
  status: string;
  priority: number;
  retryCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  duration?: number;
}

interface QueueSummary {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

interface QueueResponse {
  pending: QueueTask[];
  running: QueueTask[];
  completed: QueueTask[];
  failed: QueueTask[];
  summary: QueueSummary;
  lastUpdated: string;
}

const agentIcons: Record<string, React.ReactNode> = {
  ast: <Layers className="w-3 h-3" />,
  rule: <Shield className="w-3 h-3" />,
  security: <Shield className="w-3 h-3" />,
  dependency: <GitBranch className="w-3 h-3" />,
  ai: <Zap className="w-3 h-3" />,
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  retrying: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

interface TaskQueueWidgetProps {
  refreshInterval?: number;
  maxItems?: number;
}

export function TaskQueueWidget({ 
  refreshInterval = 3000, 
  maxItems = 10 
}: TaskQueueWidgetProps) {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'running' | 'pending' | 'completed' | 'failed'>('running');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  async function loadData() {
    try {
      const res = await fetch(`/api/analysis/queue?limit=${maxItems}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // 무시
    } finally {
      setLoading(false);
    }
  }

  const renderTaskList = (tasks: QueueTask[]) => {
    if (tasks.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">작업이 없습니다</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {tasks.slice(0, maxItems).map(task => (
          <div key={task.id} className="py-2 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`p-1 rounded ${statusColors[task.status]}`}>
                  {agentIcons[task.agentType]}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {task.agentType.toUpperCase()}
                </span>
                {task.retryCount > 0 && (
                  <span className="text-xs text-orange-500">
                    재시도 {task.retryCount}회
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {task.duration && (
                  <span className="text-xs text-gray-500">
                    {Math.round(task.duration / 1000)}s
                  </span>
                )}
                {task.status === 'running' && (
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                )}
                {task.status === 'completed' && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
                {task.status === 'failed' && (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
              </div>
            </div>
            {task.error && (
              <p className="text-xs text-red-500 mt-1 truncate">{task.error}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-center h-24">
          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const tabs = [
    { key: 'running', label: '실행', count: data.summary.running, color: 'text-blue-500' },
    { key: 'pending', label: '대기', count: data.summary.pending, color: 'text-yellow-500' },
    { key: 'completed', label: '완료', count: data.summary.completed, color: 'text-green-500' },
    { key: 'failed', label: '실패', count: data.summary.failed, color: 'text-red-500' },
  ] as const;

  const currentTasks = data[activeTab];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 헤더 */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
        onClick={() => setExpanded(!expanded)}
      >
        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          작업 큐
        </h4>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-500 font-medium">{data.summary.running}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-500">{data.summary.total}</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* 확장된 상세 */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {/* 탭 */}
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 ${tab.color}`}>({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* 작업 목록 */}
          <div className="p-3 max-h-64 overflow-y-auto">
            {renderTaskList(currentTasks)}
          </div>

          {/* 푸터 */}
          <div className="p-2 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-400 text-center">
            마지막 업데이트: {new Date(data.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskQueueWidget;
