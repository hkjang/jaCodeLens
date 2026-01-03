'use client';

/**
 * 에이전트 상태 모니터링 위젯
 * 
 * 분석 에이전트들의 실시간 상태를 표시합니다.
 */

import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Cpu,
  Layers,
  Shield,
  GitBranch,
  Zap
} from 'lucide-react';

interface AgentInfo {
  type: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'error';
  currentTask?: string;
  tasksCompleted: number;
  averageTime: number;
}

interface SchedulerStats {
  totalTasks: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
}

interface AgentStatusResponse {
  agents: AgentInfo[];
  stats: SchedulerStats;
  isRunning: boolean;
  lastUpdated: string;
}

const agentIcons: Record<string, React.ReactNode> = {
  ast: <Layers className="w-4 h-4" />,
  rule: <Shield className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  dependency: <GitBranch className="w-4 h-4" />,
  ai: <Zap className="w-4 h-4" />,
};

const statusColors: Record<string, string> = {
  idle: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  running: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  error: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

interface AgentMonitorProps {
  refreshInterval?: number;
  compact?: boolean;
}

export function AgentMonitor({ refreshInterval = 5000, compact = false }: AgentMonitorProps) {
  const [data, setData] = useState<AgentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  async function loadData() {
    try {
      const res = await fetch('/api/analysis/agents');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        setError('에이전트 상태 조회 실패');
      }
    } catch {
      setError('연결 실패');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32 text-gray-500">
          <XCircle className="w-5 h-5 mr-2" />
          {error || '데이터 없음'}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-500" />
            에이전트 상태
          </h4>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            data.isRunning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {data.isRunning ? '실행 중' : '대기'}
          </span>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {data.agents.map(agent => (
            <div
              key={agent.type}
              className={`flex flex-col items-center p-2 rounded-lg ${statusColors[agent.status]}`}
              title={agent.description}
            >
              {agentIcons[agent.type]}
              <span className="text-xs mt-1 truncate w-full text-center">
                {agent.name.replace(' Agent', '')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-500" />
          에이전트 모니터
        </h3>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            data.isRunning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {data.isRunning ? '실행 중' : '대기'}
          </span>
          <button
            onClick={loadData}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="대기" 
          value={data.stats.pendingTasks} 
          icon={<Clock className="w-4 h-4" />}
          color="text-yellow-500"
        />
        <StatCard 
          label="실행" 
          value={data.stats.runningTasks} 
          icon={<Activity className="w-4 h-4" />}
          color="text-blue-500"
        />
        <StatCard 
          label="완료" 
          value={data.stats.completedTasks} 
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-green-500"
        />
        <StatCard 
          label="실패" 
          value={data.stats.failedTasks} 
          icon={<XCircle className="w-4 h-4" />}
          color="text-red-500"
        />
      </div>

      {/* 에이전트 목록 */}
      <div className="space-y-3">
        {data.agents.map(agent => (
          <div
            key={agent.type}
            className={`flex items-center justify-between p-3 rounded-lg ${statusColors[agent.status]}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                {agentIcons[agent.type]}
              </div>
              <div>
                <div className="font-medium">{agent.name}</div>
                <div className="text-xs opacity-75">{agent.description}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{agent.tasksCompleted} 완료</div>
              <div className="text-xs opacity-75">
                평균 {Math.round(agent.averageTime / 1000)}초
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-400 text-right">
        마지막 업데이트: {new Date(data.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  color 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string; 
}) {
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

export default AgentMonitor;
