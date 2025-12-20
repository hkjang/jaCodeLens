'use client';

import { Activity, CheckCircle, XCircle, Clock, Cpu, MemoryStick, Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const mockAgents = [
  { id: '1', name: 'StaticAnalysisAgent', status: 'running', tasks: 12, completed: 156, avgLatency: 234, cpu: 45, memory: 32 },
  { id: '2', name: 'SecurityAgent', status: 'running', tasks: 8, completed: 189, avgLatency: 456, cpu: 62, memory: 48 },
  { id: '3', name: 'ArchitectureAgent', status: 'idle', tasks: 0, completed: 134, avgLatency: 567, cpu: 5, memory: 15 },
  { id: '4', name: 'OpsRiskAgent', status: 'running', tasks: 5, completed: 98, avgLatency: 123, cpu: 28, memory: 22 },
  { id: '5', name: 'ReviewerAgent', status: 'error', tasks: 0, completed: 87, avgLatency: 789, cpu: 0, memory: 8 },
  { id: '6', name: 'ImprovementAgent', status: 'idle', tasks: 0, completed: 145, avgLatency: 345, cpu: 3, memory: 12 },
];

const statusConfig = {
  running: { icon: Activity, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: '실행 중' },
  idle: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20', label: '대기' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: '오류' },
};

export default function AgentsPage() {
  const runningCount = mockAgents.filter(a => a.status === 'running').length;
  const errorCount = mockAgents.filter(a => a.status === 'error').length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">에이전트</h2>
          <p className="text-gray-500">AI 분석 에이전트 상태를 관리합니다</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockAgents.length}</p>
              <p className="text-sm text-gray-500">전체 에이전트</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{runningCount}</p>
              <p className="text-sm text-gray-500">실행 중</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{errorCount}</p>
              <p className="text-sm text-gray-500">오류</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockAgents.reduce((a, b) => a + b.tasks, 0)}</p>
              <p className="text-sm text-gray-500">활성 작업</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockAgents.map((agent, index) => {
          const config = statusConfig[agent.status as keyof typeof statusConfig];
          const StatusIcon = config.icon;
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {config.label}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">활성 작업</span>
                  <span className="font-medium text-gray-900 dark:text-white">{agent.tasks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">완료</span>
                  <span className="font-medium text-gray-900 dark:text-white">{agent.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">평균 지연</span>
                  <span className="font-medium text-gray-900 dark:text-white">{agent.avgLatency}ms</span>
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">CPU {agent.cpu}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MemoryStick className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">MEM {agent.memory}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
