'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, Clock, GitBranch, GitMerge, Package, Calendar, User, 
  CheckCircle, XCircle, Loader2, Square, ChevronDown, ChevronUp,
  Cpu, Zap
} from 'lucide-react';

interface AgentProgress {
  name: string;
  status: string;
  durationMs: number | null;
  tokensUsed: number | null;
  modelName: string;
  modelProvider: string;
  tasksTotal: number;
  tasksCompleted: number;
}

interface TriggerHistoryItem {
  id: string;
  type: string;
  status: string;
  triggeredAt: string;
  triggeredBy?: string;
  completedAt?: string;
  executionId?: string;
}

interface TriggerPanelProps {
  triggers: {
    push: boolean;
    merge: boolean;
    build: boolean;
    deploy: boolean;
    schedule: boolean;
  };
  history: TriggerHistoryItem[];
  onManualTrigger: () => void;
  onToggleTrigger?: (type: string, enabled: boolean) => void;
  isTriggering?: boolean;
  onRefresh?: () => void;
}

/**
 * 분석 트리거 관리 패널 (중지 기능 및 진행 상황 표시 포함)
 */
export function TriggerPanel({ 
  triggers, 
  history, 
  onManualTrigger, 
  onToggleTrigger,
  isTriggering,
  onRefresh
}: TriggerPanelProps) {
  const [expandedTriggerId, setExpandedTriggerId] = useState<string | null>(null);
  const [triggerDetails, setTriggerDetails] = useState<Record<string, { progress: any; agents: AgentProgress[] }>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const triggerTypes = [
    { key: 'push', label: 'Git Push', icon: GitBranch },
    { key: 'merge', label: 'Git Merge', icon: GitMerge },
    { key: 'build', label: 'CI Build', icon: Package },
    { key: 'deploy', label: '배포', icon: Package },
    { key: 'schedule', label: '일일 스케줄', icon: Calendar }
  ];

  // Fetch trigger details when expanded
  useEffect(() => {
    if (expandedTriggerId && !triggerDetails[expandedTriggerId]) {
      fetchTriggerDetails(expandedTriggerId);
    }
  }, [expandedTriggerId]);

  // Auto-refresh running triggers
  useEffect(() => {
    const runningTriggers = history.filter(t => t.status === 'RUNNING' || t.status === 'PENDING');
    if (runningTriggers.length > 0) {
      const interval = setInterval(() => {
        runningTriggers.forEach(t => {
          if (expandedTriggerId === t.id) {
            fetchTriggerDetails(t.id);
          }
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [history, expandedTriggerId]);

  const fetchTriggerDetails = async (triggerId: string) => {
    try {
      const res = await fetch(`/api/self-analysis/trigger/${triggerId}`);
      if (res.ok) {
        const data = await res.json();
        setTriggerDetails(prev => ({
          ...prev,
          [triggerId]: { progress: data.progress, agents: data.agents }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch trigger details:', err);
    }
  };

  const handleCancel = async (triggerId: string) => {
    try {
      setCancellingId(triggerId);
      const res = await fetch(`/api/self-analysis/trigger/${triggerId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to cancel trigger:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      'GIT_PUSH': GitBranch,
      'GIT_MERGE': GitMerge,
      'CI_BUILD': Package,
      'DEPLOY': Package,
      'SCHEDULE': Calendar,
      'MANUAL': User
    };
    const Icon = icons[type] || Play;
    return <Icon className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'RUNNING': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'COMPLETED': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'FAILED': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'CANCELLED': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    };

    const icons: Record<string, any> = {
      'PENDING': Clock,
      'RUNNING': Loader2,
      'COMPLETED': CheckCircle,
      'FAILED': XCircle,
      'CANCELLED': Square
    };
    const Icon = icons[status] || Clock;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        <Icon className={`w-3 h-3 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
        {status}
      </span>
    );
  };

  const getAgentStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'RUNNING': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'CANCELLED': return <Square className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Manual Trigger Button */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">수동 분석 실행</h3>
            <p className="text-blue-100 text-sm mt-1">
              지금 바로 Self-Analysis를 실행합니다
            </p>
          </div>
          <button
            onClick={onManualTrigger}
            disabled={isTriggering}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTriggering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                분석 시작
              </>
            )}
          </button>
        </div>
      </div>

      {/* Trigger Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          자동 트리거 설정
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {triggerTypes.map(({ key, label, icon: Icon }) => {
            const enabled = triggers[key as keyof typeof triggers];
            return (
              <label
                key={key}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition
                  ${enabled 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}
                `}
              >
                <Icon className={`w-6 h-6 ${enabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${enabled ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {label}
                </span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onToggleTrigger?.(key, e.target.checked)}
                  className="sr-only"
                />
                <span className={`w-3 h-3 rounded-full ${enabled ? 'bg-blue-500' : 'bg-gray-300'}`} />
              </label>
            );
          })}
        </div>
      </div>

      {/* Trigger History with Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          최근 트리거 히스토리
        </h3>
        
        {history.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            아직 트리거 히스토리가 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 10).map(trigger => {
              const isExpanded = expandedTriggerId === trigger.id;
              const details = triggerDetails[trigger.id];
              const canCancel = trigger.status === 'RUNNING' || trigger.status === 'PENDING';
              
              return (
                <div
                  key={trigger.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden"
                >
                  {/* Trigger Header */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedTriggerId(isExpanded ? null : trigger.id)}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <span className="text-gray-500 dark:text-gray-400">
                        {getTypeIcon(trigger.type)}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {trigger.type.replace('_', ' ')}
                        </span>
                        {trigger.triggeredBy && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            by {trigger.triggeredBy}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(trigger.status)}
                      
                      {/* Cancel Button */}
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(trigger.id)}
                          disabled={cancellingId === trigger.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition disabled:opacity-50"
                        >
                          {cancellingId === trigger.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Square className="w-3 h-3" />
                          )}
                          중지
                        </button>
                      )}
                      
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(trigger.triggeredAt)}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Agent Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-600 p-4 bg-gray-100 dark:bg-gray-800">
                      {!details ? (
                        <div className="flex items-center justify-center py-4 text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          로딩 중...
                        </div>
                      ) : details.agents.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">에이전트 정보가 없습니다</p>
                      ) : (
                        <>
                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>진행률</span>
                              <span>{details.progress.completed}/{details.progress.total} 완료</span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                                style={{ width: `${(details.progress.completed / details.progress.total) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Agent List */}
                          <div className="space-y-2">
                            {details.agents.map((agent: AgentProgress) => (
                              <div 
                                key={agent.name}
                                className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  {getAgentStatusIcon(agent.status)}
                                  <div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {agent.name.replace('Agent', '')}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Cpu className="w-3 h-3" />
                                        {agent.modelName}
                                      </span>
                                      <span className="text-gray-300 dark:text-gray-600">|</span>
                                      <span>{agent.modelProvider}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                  <div>{formatDuration(agent.durationMs)}</div>
                                  {agent.tokensUsed && (
                                    <div className="flex items-center gap-1">
                                      <Zap className="w-3 h-3" />
                                      {agent.tokensUsed} tokens
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TriggerPanel;
