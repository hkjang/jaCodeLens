'use client';

import { ClipboardList, Clock, Play, CheckCircle, XCircle, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

const mockQueue = [
  { id: '1', name: 'JacodeLens Core 분석', status: 'running', progress: 67, startedAt: '13:45:23', agent: 'SecurityAgent' },
  { id: '2', name: 'Payment Gateway 스캔', status: 'running', progress: 34, startedAt: '13:48:15', agent: 'StaticAnalysisAgent' },
  { id: '3', name: 'ML Pipeline 검사', status: 'queued', progress: 0, startedAt: null, agent: null },
  { id: '4', name: 'DevOps Automation 분석', status: 'queued', progress: 0, startedAt: null, agent: null },
  { id: '5', name: 'Mobile API 스캔', status: 'completed', progress: 100, startedAt: '13:30:00', agent: 'ArchitectureAgent' },
  { id: '6', name: 'Auth Service 검사', status: 'completed', progress: 100, startedAt: '13:15:00', agent: 'OpsRiskAgent' },
  { id: '7', name: 'Legacy Module 분석', status: 'failed', progress: 45, startedAt: '13:10:00', agent: 'ReviewerAgent' },
];

const statusConfig = {
  running: { icon: Play, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: '실행 중' },
  queued: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', label: '대기' },
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: '완료' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: '실패' },
  paused: { icon: Pause, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20', label: '일시정지' },
};

export default function QueuePage() {
  const runningCount = mockQueue.filter(t => t.status === 'running').length;
  const queuedCount = mockQueue.filter(t => t.status === 'queued').length;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">작업 큐</h2>
        <p className="text-gray-500">분석 작업 대기열을 관리합니다</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockQueue.length}</p>
              <p className="text-sm text-gray-500">전체 작업</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Play className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{runningCount}</p>
              <p className="text-sm text-gray-500">실행 중</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{queuedCount}</p>
              <p className="text-sm text-gray-500">대기 중</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockQueue.filter(t => t.status === 'completed').length}</p>
              <p className="text-sm text-gray-500">완료</p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500">
          <span>작업명</span>
          <span>상태</span>
          <span>진행률</span>
          <span>에이전트</span>
          <span>시작 시간</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {mockQueue.map((task, index) => {
            const config = statusConfig[task.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-5 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <span className="font-medium text-gray-900 dark:text-white">{task.name}</span>
                <span className={`flex items-center gap-1 ${config.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  <span className="text-sm">{config.label}</span>
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${task.status === 'completed' ? 'bg-green-500' : task.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10">{task.progress}%</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{task.agent || '-'}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{task.startedAt || '-'}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
