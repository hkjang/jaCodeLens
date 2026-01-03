import { Suspense } from 'react';
import prisma from '@/lib/db';
import { Activity, Clock, CheckCircle, XCircle } from 'lucide-react';
import { AnalysisExecutionView, ParallelAgentLanes, PipelineStagesView } from '@/components/Analysis';

export const dynamic = 'force-dynamic';

// 8단계 파이프라인 스테이지 정의
const PIPELINE_STAGES = [
  'SOURCE_COLLECT',
  'LANGUAGE_DETECT', 
  'AST_PARSE',
  'STATIC_ANALYZE',
  'RULE_PARSE',
  'CATEGORIZE',
  'NORMALIZE',
  'AI_ENHANCE'
];

async function getExecutions() {
  try {
    const executions = await prisma.analysisExecute.findMany({
      take: 10,
      orderBy: { startedAt: 'desc' },
      include: {
        project: true,
      }
    });

    // 각 실행에 대한 파이프라인 스테이지 정보 조회
    const executionsWithStages = await Promise.all(
      executions.map(async (exec) => {
        // 파이프라인 스테이지 조회
        const pipelineStages = await prisma.pipelineStageExecution.findMany({
          where: { executeId: exec.id }
        });

        // 정규화된 결과 카운트
        const resultCount = await prisma.normalizedAnalysisResult.count({
          where: { executeId: exec.id }
        });

        return {
          ...exec,
          pipelineStages: pipelineStages.map(s => ({
            stage: s.stage,
            name: s.stage,
            description: s.message || '',
            status: s.status as any,
            progress: s.progress,
            message: s.message,
            error: s.error || undefined,
            duration: s.startedAt && s.completedAt 
              ? new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()
              : undefined
          })),
          resultCount,
          agentExecutions: [] as any[]
        };
      })
    );

    return executionsWithStages;
  } catch (e) {
    console.error("DB Error", e);
    return [];
  }
}

function ExecutionCard({ execution }: { execution: any }) {
  const hasStages = execution.pipelineStages && execution.pipelineStages.length > 0;
  
  // 기존 4단계 스텝 (파이프라인이 없을 때 폴백)
  const legacySteps = [
    { id: '1', name: '프로젝트 스캔', status: 'completed' as const },
    { id: '2', name: '파일 분석', status: execution.status === 'RUNNING' ? 'running' as const : execution.status === 'COMPLETED' ? 'completed' as const : 'pending' as const },
    { id: '3', name: '에이전트 실행', status: execution.status === 'RUNNING' ? 'running' as const : execution.status === 'COMPLETED' ? 'completed' as const : 'pending' as const },
    { id: '4', name: '결과 통합', status: execution.status === 'COMPLETED' ? 'completed' as const : 'pending' as const }
  ];

  // 진행률 계산
  const progress = hasStages
    ? (execution.pipelineStages.filter((s: any) => s.status === 'completed').length / PIPELINE_STAGES.length) * 100
    : execution.agentExecutions.length > 0
      ? (execution.agentExecutions.filter((a: any) => a.status === 'COMPLETED').length / execution.agentExecutions.length) * 100
      : 0;

  return (
    <div className="space-y-4">
      <AnalysisExecutionView
        executionId={execution.id}
        projectName={execution.project.name}
        status={execution.status}
        progress={progress}
        steps={legacySteps}
        startedAt={execution.startedAt}
        completedAt={execution.completedAt}
      >
        {/* 8단계 파이프라인 뷰 (새 방식) */}
        {hasStages ? (
          <div className="mt-4">
            <PipelineStagesView stages={execution.pipelineStages} />
            {execution.resultCount > 0 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  분석 결과: <span className="font-semibold text-gray-900 dark:text-white">{execution.resultCount}개</span> 발견
                </span>
              </div>
            )}
          </div>
        ) : (
          /* 기존 에이전트 레인 (폴백) */
          <ParallelAgentLanes agents={execution.agentExecutions.map((ae: any) => ({
            id: ae.id,
            name: ae.agentName,
            status: ae.status?.toLowerCase(),
            startedAt: ae.createdAt,
            completedAt: ae.completedAt,
            taskCount: ae.tasks?.length || 0,
            completedTaskCount: ae.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0
          }))} />
        )}
      </AnalysisExecutionView>
    </div>
  );
}

export default async function ExecutionPage() {
  const executions = await getExecutions();
  const latestExecution = executions[0];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 실행</h2>
        <p className="text-gray-500">실시간 분석 진행 상황을 모니터링합니다</p>
      </header>

      {latestExecution ? (
        <ExecutionCard execution={latestExecution} />
      ) : (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            실행 중인 분석이 없습니다
          </h3>
          <p className="text-gray-500 mt-2">
            프로젝트를 선택하고 분석을 시작하세요
          </p>
        </div>
      )}

      {/* Recent Executions */}
      {executions.length > 1 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            최근 실행 기록
          </h3>
          <div className="space-y-3">
            {executions.slice(1).map((execution: any) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  {execution.status === 'COMPLETED' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {execution.status === 'FAILED' && <XCircle className="w-5 h-5 text-red-500" />}
                  {execution.status === 'RUNNING' && <Activity className="w-5 h-5 text-blue-500 animate-spin" />}
                  {execution.status === 'PENDING' && <Clock className="w-5 h-5 text-gray-400" />}
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {execution.project.name}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(execution.startedAt).toLocaleString('ko-KR')}
                    </span>
                    {execution.resultCount > 0 && (
                      <span className="text-xs text-gray-400 ml-2">
                        ({execution.resultCount}개 결과)
                      </span>
                    )}
                  </div>
                </div>
                {execution.score && (
                  <span className={`text-lg font-bold ${
                    execution.score >= 80 ? 'text-green-500' :
                    execution.score >= 60 ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    {execution.score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
