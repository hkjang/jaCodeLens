'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Activity, Clock, CheckCircle, XCircle, PlayCircle,
  FolderGit2, ChevronDown, Zap, AlertTriangle, 
  RefreshCw, ArrowRight, Settings, BarChart3,
  FileCode, Shield, Layers, TestTube, BookOpen,
  Pause, Square, Calendar, RotateCcw, Timer
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UndoToast, useUndoToast } from '@/components/ui/UndoToast';

interface Project {
  id: string;
  name: string;
  path: string;
  type: string | null;
}

interface PipelineStage {
  stage: string;
  status: string;
  progress: number;
  message: string | null;
  duration?: number;
}

interface Execution {
  id: string;
  projectId: string;
  projectName: string;
  status: string;
  score: number | null;
  startedAt: string;
  completedAt?: string;
  pipelineStages: PipelineStage[];
  resultCount: number;
}

const STAGE_INFO: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  SOURCE_COLLECT: { name: '소스 수집', icon: <FolderGit2 className="w-4 h-4" />, color: 'text-blue-500' },
  LANGUAGE_DETECT: { name: '언어 감지', icon: <FileCode className="w-4 h-4" />, color: 'text-indigo-500' },
  AST_PARSE: { name: 'AST 파싱', icon: <BookOpen className="w-4 h-4" />, color: 'text-purple-500' },
  STATIC_ANALYZE: { name: '정적 분석', icon: <BarChart3 className="w-4 h-4" />, color: 'text-cyan-500' },
  RULE_PARSE: { name: '룰 분석', icon: <Shield className="w-4 h-4" />, color: 'text-orange-500' },
  CATEGORIZE: { name: '분류', icon: <Layers className="w-4 h-4" />, color: 'text-green-500' },
  NORMALIZE: { name: '정규화', icon: <Activity className="w-4 h-4" />, color: 'text-teal-500' },
  AI_ENHANCE: { name: 'AI 보강', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-500' }
};

type ExecutionMode = 'immediate' | 'scheduled';

export default function ExecutionPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // 실행 모드 (즉시/예약)
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('immediate');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // CUD 상태
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [executionToCancel, setExecutionToCancel] = useState<Execution | null>(null);
  const [keepResults, setKeepResults] = useState(true);
  
  const [options, setOptions] = useState({
    enableAI: true,
    deepScan: false,
    includeTests: true
  });

  // Undo Toast
  const undoToast = useUndoToast();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadExecutions, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadProjects(), loadExecutions()]);
    setLoading(false);
  }

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load projects', e);
    }
  }

  async function loadExecutions() {
    try {
      const res = await fetch('/api/analysis/executions');
      if (res.ok) {
        const data = await res.json();
        setExecutions(data);
      }
    } catch (e) {
      console.error('Failed to load executions', e);
    }
  }

  async function startAnalysis() {
    if (!selectedProject) return;
    setStarting(true);
    try {
      const res = await fetch('/api/analysis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: selectedProject,
          options,
          mode: executionMode,
          scheduledTime: executionMode === 'scheduled' ? scheduledTime : undefined
        })
      });
      if (res.ok) {
        await loadExecutions();
      }
    } catch (e) {
      console.error('Failed to start analysis', e);
    } finally {
      setStarting(false);
    }
  }

  // 분석 일시정지
  async function pauseExecution(executionId: string) {
    try {
      const res = await fetch('/api/analysis/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId })
      });
      if (res.ok) {
        await loadExecutions();
        undoToast.show({
          message: '분석이 일시정지되었습니다',
          variant: 'default',
          onUndo: () => resumeExecution(executionId)
        });
      }
    } catch (e) {
      console.error('Failed to pause execution', e);
    }
  }

  // 분석 재개
  async function resumeExecution(executionId: string) {
    try {
      const res = await fetch('/api/analysis/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId })
      });
      if (res.ok) {
        await loadExecutions();
      }
    } catch (e) {
      console.error('Failed to resume execution', e);
    }
  }

  // 분석 취소 (안전 종료)
  async function cancelExecution(execution: Execution) {
    try {
      const res = await fetch('/api/analysis/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          executionId: execution.id,
          keepResults
        })
      });
      if (res.ok) {
        await loadExecutions();
        setShowCancelDialog(false);
        setExecutionToCancel(null);
      }
    } catch (e) {
      console.error('Failed to cancel execution', e);
    }
  }

  // 예상 시간 계산 (더미)
  function getEstimatedTime(): string {
    let minutes = 5;
    if (options.deepScan) minutes += 10;
    if (options.enableAI) minutes += 3;
    if (options.includeTests) minutes += 2;
    return `약 ${minutes}분`;
  }

  const latestExecution = executions[0];
  const selectedProjectInfo = projects.find(p => p.id === selectedProject);
  const isRunning = latestExecution?.status === 'RUNNING';
  const isPaused = latestExecution?.status === 'PAUSED';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 실행</h2>
          <p className="text-gray-500">프로젝트를 선택하고 분석을 시작하세요</p>
        </div>
      </header>

      {/* Start Analysis Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">새 분석 시작</h3>
        
        {/* 실행 모드 선택 */}
        <div className="flex items-center gap-4 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="executionMode"
              checked={executionMode === 'immediate'}
              onChange={() => setExecutionMode('immediate')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <PlayCircle className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">즉시 실행</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="executionMode"
              checked={executionMode === 'scheduled'}
              onChange={() => setExecutionMode('scheduled')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">예약 실행</span>
          </label>
        </div>

        {/* 예약 시간 선택 */}
        {executionMode === 'scheduled' && (
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
              실행 예약 시간
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="px-4 py-2 border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Project Selector */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              분석 대상 프로젝트
            </label>
            {projects.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.path}
                    </option>
                  ))}
                </select>
                <FolderGit2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-gray-500 mb-3">등록된 프로젝트가 없습니다</p>
                <Link 
                  href="/dashboard/projects/new"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <FolderGit2 className="w-4 h-4" />
                  프로젝트 추가하기
                </Link>
              </div>
            )}
          </div>

          {/* Start Button & Estimated Time */}
          <div className="flex flex-col justify-end gap-2">
            {/* 예상 시간 */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Timer className="w-4 h-4" />
              <span>예상 소요: {getEstimatedTime()}</span>
            </div>
            
            <button
              onClick={startAnalysis}
              disabled={!selectedProject || starting || (executionMode === 'scheduled' && !scheduledTime)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:shadow-none transition-all"
            >
              {starting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  시작 중...
                </>
              ) : executionMode === 'scheduled' ? (
                <>
                  <Calendar className="w-5 h-5" />
                  예약 등록
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  분석 시작
                </>
              )}
            </button>
          </div>
        </div>

        {/* Analysis Options */}
        <div className="mt-4">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Settings className="w-4 h-4" />
            분석 옵션
            <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
          </button>
          
          {showOptions && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid md:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.enableAI}
                  onChange={(e) => setOptions({ ...options, enableAI: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">AI 보강</span>
                  <p className="text-xs text-gray-500">AI로 상세 설명 및 제안 생성</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.deepScan}
                  onChange={(e) => setOptions({ ...options, deepScan: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">심층 분석</span>
                  <p className="text-xs text-gray-500">더 정밀한 분석 (시간 소요↑)</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeTests}
                  onChange={(e) => setOptions({ ...options, includeTests: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">테스트 포함</span>
                  <p className="text-xs text-gray-500">테스트 파일도 분석에 포함</p>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Current/Latest Execution */}
      {latestExecution && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={latestExecution.status} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {latestExecution.projectName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(latestExecution.startedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
              
              {/* 실행 제어 버튼 */}
              <div className="flex items-center gap-2">
                {isRunning && (
                  <>
                    <button
                      onClick={() => pauseExecution(latestExecution.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded-lg transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      일시정지
                    </button>
                    <button
                      onClick={() => {
                        setExecutionToCancel(latestExecution);
                        setShowCancelDialog(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-colors"
                    >
                      <Square className="w-4 h-4" />
                      중단
                    </button>
                  </>
                )}
                {isPaused && (
                  <>
                    <button
                      onClick={() => resumeExecution(latestExecution.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg transition-colors"
                    >
                      <PlayCircle className="w-4 h-4" />
                      재개
                    </button>
                    <button
                      onClick={() => {
                        setExecutionToCancel(latestExecution);
                        setShowCancelDialog(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-colors"
                    >
                      <Square className="w-4 h-4" />
                      중단
                    </button>
                  </>
                )}
                {latestExecution.score !== null && (
                  <div className="text-right ml-4">
                    <div className={`text-3xl font-bold ${
                      latestExecution.score >= 80 ? 'text-green-500' :
                      latestExecution.score >= 60 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {latestExecution.score}
                    </div>
                    <p className="text-sm text-gray-500">분석 점수</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pipeline Stages Visualization */}
          {latestExecution.pipelineStages.length > 0 && (
            <div className="p-6">
              <h4 className="text-sm font-medium text-gray-500 mb-4">파이프라인 진행 상황</h4>
              <div className="grid grid-cols-8 gap-2">
                {Object.keys(STAGE_INFO).map((stageKey, idx) => {
                  const stage = latestExecution.pipelineStages.find(s => s.stage === stageKey);
                  const info = STAGE_INFO[stageKey];
                  const status = stage?.status || 'pending';

                  return (
                    <div key={stageKey} className="text-center">
                      <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 transition-all ${
                        status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                        status === 'running' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 animate-pulse' :
                        status === 'paused' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                        status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-400'
                      }`}>
                        {status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                         status === 'running' ? <RefreshCw className="w-5 h-5 animate-spin" /> :
                         status === 'paused' ? <Pause className="w-5 h-5" /> :
                         status === 'failed' ? <XCircle className="w-5 h-5" /> :
                         info.icon}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {info.name}
                      </p>
                      {stage?.duration && (
                        <p className="text-[10px] text-gray-400">
                          {(stage.duration / 1000).toFixed(1)}s
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>전체 진행률</span>
                  <span>
                    {latestExecution.pipelineStages.filter(s => s.status === 'completed').length} / {Object.keys(STAGE_INFO).length} 완료
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      isPaused 
                        ? 'bg-yellow-500' 
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    }`}
                    style={{ 
                      width: `${(latestExecution.pipelineStages.filter(s => s.status === 'completed').length / Object.keys(STAGE_INFO).length) * 100}%` 
                    }}
                  />
                </div>
              </div>

              {/* Results Summary */}
              {latestExecution.status === 'COMPLETED' && latestExecution.resultCount > 0 && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong>{latestExecution.resultCount}개</strong>의 분석 결과가 발견되었습니다
                    </span>
                  </div>
                  <Link
                    href="/dashboard/results"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    결과 보기
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!latestExecution && projects.length === 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6">
            <Zap className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            첫 분석을 시작해 보세요
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            프로젝트를 추가하고 AI 기반 8단계 파이프라인으로 코드를 분석하세요.
            보안 취약점, 품질 문제, 아키텍처 결함을 자동으로 탐지합니다.
          </p>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
          >
            <FolderGit2 className="w-5 h-5" />
            프로젝트 추가
          </Link>
        </div>
      )}

      {/* Recent Executions */}
      {executions.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">최근 실행 기록</h3>
            <Link 
              href="/dashboard/history"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              전체 보기
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {executions.slice(1, 6).map((exec) => (
              <div key={exec.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center gap-3">
                  <StatusIcon status={exec.status} />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{exec.projectName}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(exec.startedAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {exec.resultCount > 0 && (
                    <span className="text-sm text-gray-500">{exec.resultCount}개 결과</span>
                  )}
                  {exec.score !== null && (
                    <span className={`text-lg font-bold ${
                      exec.score >= 80 ? 'text-green-500' :
                      exec.score >= 60 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {exec.score}
                    </span>
                  )}
                  {/* 재실행 버튼 */}
                  <button
                    onClick={() => {
                      setSelectedProject(exec.projectId);
                      startAnalysis();
                    }}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="재실행"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 취소 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => {
          setShowCancelDialog(false);
          setExecutionToCancel(null);
        }}
        onConfirm={() => executionToCancel && cancelExecution(executionToCancel)}
        title="분석 중단"
        message={`진행 중인 분석을 중단하시겠습니까?${keepResults ? ' (현재까지의 결과는 유지됩니다)' : ''}`}
        variant="warning"
        recoverable={false}
        confirmText="중단"
      />

      {/* Undo Toast */}
      <undoToast.UndoToastComponent />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: '대기 중', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: <Clock className="w-4 h-4" /> },
    RUNNING: { label: '실행 중', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30', icon: <RefreshCw className="w-4 h-4 animate-spin" /> },
    PAUSED: { label: '일시정지', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30', icon: <Pause className="w-4 h-4" /> },
    COMPLETED: { label: '완료', color: 'bg-green-100 text-green-600 dark:bg-green-900/30', icon: <CheckCircle className="w-4 h-4" /> },
    FAILED: { label: '실패', color: 'bg-red-100 text-red-600 dark:bg-red-900/30', icon: <XCircle className="w-4 h-4" /> },
    CANCELLED: { label: '취소됨', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700', icon: <Square className="w-4 h-4" /> }
  };
  const config = configs[status] || configs.PENDING;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'FAILED':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'RUNNING':
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'PAUSED':
      return <Pause className="w-5 h-5 text-yellow-500" />;
    case 'CANCELLED':
      return <Square className="w-5 h-5 text-gray-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
}
