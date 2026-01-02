'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, Clock, GitBranch, GitMerge, Package, Calendar, User, 
  CheckCircle, XCircle, Loader2, Square, ChevronDown, ChevronUp,
  Cpu, Zap, Activity, Timer, AlertCircle, TrendingUp
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
  const [elapsedTime, setElapsedTime] = useState(0);

  // Get currently running trigger
  const runningTrigger = history.find(t => t.status === 'RUNNING' || t.status === 'PENDING');
  const runningDetails = runningTrigger ? triggerDetails[runningTrigger.id] : null;
  const runningAgent = runningDetails?.agents.find(a => a.status === 'RUNNING');

  const triggerTypes = [
    { key: 'push', label: 'Git Push', icon: GitBranch },
    { key: 'merge', label: 'Git Merge', icon: GitMerge },
    { key: 'build', label: 'CI Build', icon: Package },
    { key: 'deploy', label: '배포', icon: Package },
    { key: 'schedule', label: '일일 스케줄', icon: Calendar }
  ];

  // Auto-expand running trigger
  useEffect(() => {
    if (runningTrigger && !expandedTriggerId) {
      setExpandedTriggerId(runningTrigger.id);
    }
  }, [runningTrigger?.id]);

  // Fetch trigger details when expanded
  useEffect(() => {
    if (expandedTriggerId && !triggerDetails[expandedTriggerId]) {
      fetchTriggerDetails(expandedTriggerId);
    }
  }, [expandedTriggerId]);

  // Auto-refresh running triggers + elapsed time
  useEffect(() => {
    if (runningTrigger) {
      const interval = setInterval(() => {
        fetchTriggerDetails(runningTrigger.id);
        const started = new Date(runningTrigger.triggeredAt).getTime();
        setElapsedTime(Math.floor((Date.now() - started) / 1000));
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [runningTrigger?.id]);

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

    const labels: Record<string, string> = {
      'PENDING': '대기 중',
      'RUNNING': '실행 중',
      'COMPLETED': '완료',
      'FAILED': '실패',
      'CANCELLED': '취소됨'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        <Icon className={`w-3 h-3 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
        {labels[status] || status}
      </span>
    );
  };

  const getAgentStatusIcon = (status: string) => {
    if (status === 'RUNNING') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (status === 'COMPLETED') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'FAILED') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}분 ${seconds % 60}초`;
  };

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}초`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초`;
  };

  // Get progress percentage
  const getProgress = () => {
    if (!runningDetails?.progress) return 0;
    if (runningDetails.progress.total === 0) return 0;
    return Math.round((runningDetails.progress.completed / runningDetails.progress.total) * 100);
  };

  return (
    <div className="space-y-4">
      {/* 🔥 LIVE PROGRESS BANNER - Shows when analysis is running */}
      {runningTrigger && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-5 text-white shadow-lg">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_linear_infinite]" />
          </div>
          
          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur rounded-full">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">분석 진행 중</h3>
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Timer className="w-3.5 h-3.5" />
                    <span>경과 시간: {formatElapsed(elapsedTime)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCancel(runningTrigger.id)}
                disabled={cancellingId === runningTrigger.id}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition disabled:opacity-50"
              >
                {cancellingId === runningTrigger.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                중지
              </button>
            </div>

            {/* Current Agent Highlight */}
            {runningAgent && (
              <div className="mb-4 p-3 bg-white/10 backdrop-blur rounded-lg">
                <div className="flex items-center gap-2 text-sm text-white/70 mb-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  현재 실행 중:
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold">{runningAgent.name.replace('Agent', '').replace('Analysis', ' 분석')}</span>
                    <div className="flex items-center gap-2 text-sm text-white/70 mt-0.5">
                      <Cpu className="w-3.5 h-3.5" />
                      {runningAgent.modelName} ({runningAgent.modelProvider})
                    </div>
                  </div>
                  {runningAgent.tokensUsed && (
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        <span className="text-lg font-bold">{runningAgent.tokensUsed.toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-white/60">tokens 사용</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">전체 진행률</span>
                <span className="font-bold">{getProgress()}%</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500 relative"
                  style={{ width: `${getProgress()}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                </div>
              </div>
            </div>

            {/* Agent Status Pills */}
            {runningDetails?.agents && (
              <div className="flex flex-wrap gap-2">
                {runningDetails.agents.map(agent => (
                  <div 
                    key={agent.name}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm backdrop-blur ${
                      agent.status === 'COMPLETED' ? 'bg-green-500/30' :
                      agent.status === 'RUNNING' ? 'bg-white/30 ring-2 ring-white/50' :
                      agent.status === 'FAILED' ? 'bg-red-500/30' :
                      'bg-white/10'
                    }`}
                  >
                    {agent.status === 'RUNNING' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {agent.status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />}
                    {agent.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                    {agent.status === 'PENDING' && <Clock className="w-3 h-3 opacity-50" />}
                    <span className={agent.status === 'PENDING' ? 'opacity-50' : ''}>
                      {agent.name.replace('Analysis', '').replace('Agent', '')}
                    </span>
                    {agent.status === 'COMPLETED' && agent.durationMs && (
                      <span className="text-xs opacity-70">
                        {formatDuration(agent.durationMs)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Trigger Button */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Play className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">수동 분석 실행</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                전체 프로젝트에 대해 즉시 분석을 실행합니다
              </p>
            </div>
          </div>
          <button
            onClick={onManualTrigger}
            disabled={isTriggering || !!runningTrigger}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
          >
            {isTriggering || runningTrigger ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {runningTrigger ? '분석 중...' : '시작 중...'}
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
          분석 히스토리
        </h3>
        
        {history.length === 0 ? (
          <div className="text-center py-10">
            <TrendingUp className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">아직 분석 히스토리가 없습니다</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">분석을 시작하면 여기에 기록됩니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 10).map(trigger => {
              const isExpanded = expandedTriggerId === trigger.id;
              const details = triggerDetails[trigger.id];
              const canCancel = trigger.status === 'RUNNING' || trigger.status === 'PENDING';
              const isRunning = trigger.status === 'RUNNING';
              
              return (
                <div
                  key={trigger.id}
                  className={`rounded-lg overflow-hidden transition ${
                    isRunning 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                      : 'bg-gray-50 dark:bg-gray-700/50'
                  }`}
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
                    <div className="border-t border-gray-200 dark:border-gray-600 p-4 bg-white dark:bg-gray-800">
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
                                className={`flex items-center justify-between p-3 rounded-lg transition ${
                                  agent.status === 'RUNNING' 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' 
                                    : 'bg-gray-50 dark:bg-gray-700/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {getAgentStatusIcon(agent.status)}
                                  <div>
                                    <span className={`text-sm font-medium ${
                                      agent.status === 'RUNNING' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                                    }`}>
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
                                      {agent.tokensUsed.toLocaleString()} tokens
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
