'use client';

import React, { useState } from 'react';
import { Clock, PlayCircle, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Pause, RotateCcw } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  agent: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'retrying';
  priority: 'high' | 'normal' | 'low';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  error?: string;
}

interface TaskQueueProps {
  data?: Task[];
}

export default function TaskQueue({ data }: TaskQueueProps) {
  const [filter, setFilter] = useState<string>('all');

  // Mock data
  const tasks: Task[] = data || [
    { id: '1', name: 'Analyze src/api/', agent: 'SecurityAgent', status: 'running', priority: 'high', createdAt: '10:30:15', startedAt: '10:30:45', retryCount: 0 },
    { id: '2', name: 'Check dependencies', agent: 'DependencyAgent', status: 'running', priority: 'normal', createdAt: '10:30:16', startedAt: '10:30:50', retryCount: 0 },
    { id: '3', name: 'Scan vulnerabilities', agent: 'SecurityAgent', status: 'queued', priority: 'high', createdAt: '10:30:17', retryCount: 0 },
    { id: '4', name: 'Analyze patterns', agent: 'ArchitectureAgent', status: 'queued', priority: 'normal', createdAt: '10:30:18', retryCount: 0 },
    { id: '5', name: 'Check code style', agent: 'StyleAgent', status: 'completed', priority: 'low', createdAt: '10:29:00', startedAt: '10:29:05', completedAt: '10:29:30', retryCount: 0 },
    { id: '6', name: 'Run quality metrics', agent: 'QualityAgent', status: 'completed', priority: 'normal', createdAt: '10:28:00', startedAt: '10:28:10', completedAt: '10:29:00', retryCount: 0 },
    { id: '7', name: 'Test coverage analysis', agent: 'TestAgent', status: 'failed', priority: 'high', createdAt: '10:27:00', startedAt: '10:27:10', retryCount: 2, error: 'Timeout after 30s' },
    { id: '8', name: 'Retrying: Test analysis', agent: 'TestAgent', status: 'retrying', priority: 'high', createdAt: '10:30:20', retryCount: 1 },
  ];

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'running': return { bg: 'bg-blue-500', icon: <PlayCircle className="w-4 h-4 animate-spin-slow" />, text: 'text-blue-500' };
      case 'completed': return { bg: 'bg-green-500', icon: <CheckCircle2 className="w-4 h-4" />, text: 'text-green-500' };
      case 'failed': return { bg: 'bg-red-500', icon: <XCircle className="w-4 h-4" />, text: 'text-red-500' };
      case 'retrying': return { bg: 'bg-yellow-500', icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: 'text-yellow-500' };
      default: return { bg: 'bg-gray-500', icon: <Clock className="w-4 h-4" />, text: 'text-gray-500' };
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'low': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const stats = {
    queued: tasks.filter(t => t.status === 'queued').length,
    running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">작업 큐</h2>
          <p className="text-gray-500 dark:text-gray-400">대기 · 실행 · 완료 현황</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
            <Pause className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
            <RotateCcw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: 'queued', label: '대기', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
          { key: 'running', label: '실행중', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
          { key: 'completed', label: '완료', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
          { key: 'failed', label: '실패', color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setFilter(filter === stat.key ? 'all' : stat.key)}
            className={`p-4 rounded-xl transition-all ${stat.bgColor} ${
              filter === stat.key ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stats[stat.key as keyof typeof stats]}
            </div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">에이전트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">우선순위</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">시간</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredTasks.map((task) => {
                const statusStyles = getStatusStyles(task.status);
                
                return (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-2 ${statusStyles.text}`}>
                        {statusStyles.icon}
                        <span className="text-sm capitalize">{task.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{task.name}</div>
                      {task.error && (
                        <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          {task.error}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{task.agent}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyles(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                      <div>생성: {task.createdAt}</div>
                      {task.startedAt && <div>시작: {task.startedAt}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {task.status === 'failed' && (
                        <button className="px-2 py-1 rounded bg-blue-500 text-white text-xs hover:bg-blue-600">
                          재시도
                        </button>
                      )}
                      {task.status === 'queued' && (
                        <button className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                          취소
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
