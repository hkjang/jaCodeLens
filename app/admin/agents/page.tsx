'use client';

import React, { useState } from 'react';
import { Bot, Settings, ToggleLeft, ToggleRight, RefreshCw, Trash2, Plus, Activity } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  priority: number;
  timeout: number;
  maxRetries: number;
  status: 'active' | 'idle' | 'error';
}

export default function AgentsConfigPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([
    { id: '1', name: 'StructureAnalysisAgent', description: '프로젝트 구조 분석', isEnabled: true, priority: 1, timeout: 30, maxRetries: 3, status: 'active' },
    { id: '2', name: 'QualityAnalysisAgent', description: '코드 품질 분석', isEnabled: true, priority: 1, timeout: 60, maxRetries: 3, status: 'active' },
    { id: '3', name: 'SecurityAnalysisAgent', description: '보안 취약점 스캔', isEnabled: true, priority: 2, timeout: 120, maxRetries: 2, status: 'active' },
    { id: '4', name: 'DependencyAnalysisAgent', description: '의존성 분석', isEnabled: true, priority: 3, timeout: 45, maxRetries: 3, status: 'idle' },
    { id: '5', name: 'StyleAnalysisAgent', description: '코딩 스타일 검사', isEnabled: false, priority: 4, timeout: 30, maxRetries: 3, status: 'idle' },
    { id: '6', name: 'TestAnalysisAgent', description: '테스트 커버리지', isEnabled: true, priority: 3, timeout: 90, maxRetries: 2, status: 'error' },
  ]);

  const toggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, isEnabled: !a.isEnabled } : a));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">에이전트 설정</h1>
          <p className="text-gray-500 dark:text-gray-400">AI 분석 에이전트 활성화 및 설정</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors">
          <Plus className="w-4 h-4" />
          에이전트 추가
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600">{agents.filter(a => a.isEnabled).length}</div>
          <div className="text-sm text-green-600">활성화됨</div>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{agents.filter(a => !a.isEnabled).length}</div>
          <div className="text-sm text-gray-500">비활성화됨</div>
        </div>
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="text-2xl font-bold text-red-600">{agents.filter(a => a.status === 'error').length}</div>
          <div className="text-sm text-red-500">에러 발생</div>
        </div>
      </div>

      {/* Agents List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">에이전트</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">우선순위</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Timeout</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">재시도</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">활성화</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {agents.map((agent) => (
              <tr key={agent.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!agent.isEnabled ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                    <span className="text-xs text-gray-500 capitalize">{agent.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{agent.name.replace('Agent', '')}</div>
                      <div className="text-xs text-gray-500">{agent.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">P{agent.priority}</span>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-600 dark:text-gray-300">
                  {agent.timeout}s
                </td>
                <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-600 dark:text-gray-300">
                  {agent.maxRetries}회
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleAgent(agent.id)}>
                    {agent.isEnabled ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Settings className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
