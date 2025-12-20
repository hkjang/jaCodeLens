import { Suspense } from 'react';
import { AgentMonitor, TaskQueue } from '@/components/Operations';

export const dynamic = 'force-dynamic';

export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">운영 모니터링</h2>
        <p className="text-gray-500">시스템 리소스 및 에이전트 상태를 모니터링합니다</p>
      </header>

      <Suspense fallback={<div>Loading...</div>}>
        <AgentMonitor />
      </Suspense>
      
      <Suspense fallback={<div>Loading...</div>}>
        <TaskQueue />
      </Suspense>
    </div>
  );
}

