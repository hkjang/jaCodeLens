import { Suspense } from 'react';
import prisma from '@/lib/db';
import { Activity, Clock, CheckCircle, XCircle, PlayCircle, AlertTriangle } from 'lucide-react';
import { AnalysisExecutionView } from '@/components/Analysis';
import { ParallelAgentLanes } from '@/components/Analysis';

export const dynamic = 'force-dynamic';

async function getExecutions() {
  try {
    const executions = await prisma.analysisExecute.findMany({
      take: 10,
      orderBy: { startedAt: 'desc' },
      include: {
        project: true,
      }
    });

    // Return with empty agent executions - will be populated in real implementation
    return executions.map(exec => ({
      ...exec,
      agentExecutions: [] as any[]
    }));
  } catch (e) {
    console.error("DB Error", e);
    return [];
  }
}

function ExecutionCard({ execution }: { execution: any }) {
  const progress = execution.agentExecutions.length > 0
    ? (execution.agentExecutions.filter((a: any) => a.status === 'COMPLETED').length / execution.agentExecutions.length) * 100
    : 0;

  const agents = execution.agentExecutions.map((ae: any) => ({
    id: ae.id,
    name: ae.agentName,
    status: ae.status.toLowerCase(),
    startedAt: ae.createdAt,
    completedAt: ae.completedAt,
    taskCount: ae.tasks.length,
    completedTaskCount: ae.tasks.filter((t: any) => t.status === 'COMPLETED').length
  }));

  return (
    <div className="space-y-4">
      <AnalysisExecutionView
        executionId={execution.id}
        projectName={execution.project.name}
        status={execution.status}
        progress={progress}
        steps={[
          { id: '1', name: '프로젝트 스캔', status: 'completed' },
          { id: '2', name: '파일 분석', status: execution.status === 'RUNNING' ? 'running' : execution.status === 'COMPLETED' ? 'completed' : 'pending' },
          { id: '3', name: '에이전트 실행', status: execution.status === 'RUNNING' ? 'running' : execution.status === 'COMPLETED' ? 'completed' : 'pending' },
          { id: '4', name: '결과 통합', status: execution.status === 'COMPLETED' ? 'completed' : 'pending' }
        ]}
        startedAt={execution.startedAt}
        completedAt={execution.completedAt}
      >
        <ParallelAgentLanes agents={agents} />
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
