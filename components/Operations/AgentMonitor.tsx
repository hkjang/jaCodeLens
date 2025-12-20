'use client';

import React from 'react';
import { Activity, CheckCircle2, XCircle, Clock, Cpu, MemoryStick, HardDrive, Zap } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'error' | 'completed';
  currentTask?: string;
  tasksCompleted: number;
  avgDuration: string;
  lastActive: string;
}

interface AgentMonitorProps {
  data?: Agent[];
}

export default function AgentMonitor({ data }: AgentMonitorProps) {
  // Mock data
  const agents: Agent[] = data || [
    { id: '1', name: 'StructureAnalysisAgent', status: 'running', currentTask: 'Analyzing src/services/', tasksCompleted: 45, avgDuration: '2.3s', lastActive: '실행 중' },
    { id: '2', name: 'QualityAnalysisAgent', status: 'completed', tasksCompleted: 128, avgDuration: '1.8s', lastActive: '3분 전' },
    { id: '3', name: 'SecurityAnalysisAgent', status: 'running', currentTask: 'Scanning vulnerabilities', tasksCompleted: 89, avgDuration: '4.1s', lastActive: '실행 중' },
    { id: '4', name: 'DependencyAnalysisAgent', status: 'idle', tasksCompleted: 67, avgDuration: '1.2s', lastActive: '15분 전' },
    { id: '5', name: 'StyleAnalysisAgent', status: 'completed', tasksCompleted: 156, avgDuration: '0.8s', lastActive: '5분 전' },
    { id: '6', name: 'TestAnalysisAgent', status: 'error', tasksCompleted: 34, avgDuration: '3.5s', lastActive: '에러 발생' },
  ];

  const systemResources = {
    cpu: 67,
    memory: 42,
    disk: 28,
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'running': return { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-100 dark:bg-blue-900/30', icon: <Activity className="w-4 h-4 animate-pulse" /> };
      case 'completed': return { bg: 'bg-green-500', text: 'text-green-500', light: 'bg-green-100 dark:bg-green-900/30', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'error': return { bg: 'bg-red-500', text: 'text-red-500', light: 'bg-red-100 dark:bg-red-900/30', icon: <XCircle className="w-4 h-4" /> };
      default: return { bg: 'bg-gray-500', text: 'text-gray-500', light: 'bg-gray-100 dark:bg-gray-900/30', icon: <Clock className="w-4 h-4" /> };
    }
  };

  const runningCount = agents.filter(a => a.status === 'running').length;
  const errorCount = agents.filter(a => a.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">에이전트 모니터</h2>
          <p className="text-gray-500 dark:text-gray-400">병렬 실행 현황</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm text-gray-600 dark:text-gray-300">{runningCount} 실행 중</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-red-500">{errorCount} 에러</span>
            </div>
          )}
        </div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'CPU', value: systemResources.cpu, icon: <Cpu className="w-5 h-5" />, color: 'blue' },
          { label: 'Memory', value: systemResources.memory, icon: <MemoryStick className="w-5 h-5" />, color: 'purple' },
          { label: 'Disk I/O', value: systemResources.disk, icon: <HardDrive className="w-5 h-5" />, color: 'green' },
        ].map((resource) => (
          <div key={resource.label} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-gray-500">
                {resource.icon}
                <span className="text-sm">{resource.label}</span>
              </div>
              <span className={`font-bold ${resource.value > 80 ? 'text-red-500' : resource.value > 60 ? 'text-yellow-500' : 'text-green-500'}`}>
                {resource.value}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  resource.value > 80 ? 'bg-red-500' : resource.value > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${resource.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const styles = getStatusStyles(agent.status);
          
          return (
            <div
              key={agent.id}
              className={`p-5 rounded-xl border-2 transition-all ${
                agent.status === 'running' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                agent.status === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${styles.light}`}>
                    <Zap className={`w-5 h-5 ${styles.text}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {agent.name.replace('Agent', '')}
                    </h3>
                    <span className={`text-xs ${styles.text} flex items-center gap-1`}>
                      {styles.icon}
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {agent.currentTask && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-300 truncate">
                  📋 {agent.currentTask}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="text-gray-500">완료 작업</div>
                  <div className="font-bold text-gray-900 dark:text-white">{agent.tasksCompleted}</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="text-gray-500">평균 시간</div>
                  <div className="font-bold text-gray-900 dark:text-white">{agent.avgDuration}</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500">
                마지막 활동: {agent.lastActive}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
