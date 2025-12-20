import { Suspense } from 'react';
import { Activity, Cpu } from 'lucide-react';
import { OperationsMonitor } from '@/components/Operations';

export const dynamic = 'force-dynamic';

// Mock data for operations monitoring
const mockAgents = [
  { 
    id: '1', 
    name: 'StructureAnalysisAgent', 
    status: 'healthy' as const, 
    lastHeartbeat: new Date(),
    throughput: 12,
    avgLatency: 1200,
    failureRate: 0.5,
    cpuUsage: 35,
    memoryUsage: 42
  },
  { 
    id: '2', 
    name: 'QualityAnalysisAgent', 
    status: 'healthy' as const, 
    lastHeartbeat: new Date(),
    throughput: 8,
    avgLatency: 2500,
    failureRate: 1.2,
    cpuUsage: 45,
    memoryUsage: 38
  },
  { 
    id: '3', 
    name: 'SecurityAnalysisAgent', 
    status: 'degraded' as const, 
    lastHeartbeat: new Date(Date.now() - 60000),
    throughput: 3,
    avgLatency: 8000,
    failureRate: 5.5,
    cpuUsage: 78,
    memoryUsage: 65
  },
  { 
    id: '4', 
    name: 'DependencyAnalysisAgent', 
    status: 'healthy' as const, 
    lastHeartbeat: new Date(),
    throughput: 15,
    avgLatency: 800,
    failureRate: 0.2,
    cpuUsage: 25,
    memoryUsage: 30
  },
  { 
    id: '5', 
    name: 'StyleAnalysisAgent', 
    status: 'healthy' as const, 
    lastHeartbeat: new Date(),
    throughput: 20,
    avgLatency: 500,
    failureRate: 0.1,
    cpuUsage: 18,
    memoryUsage: 22
  },
  { 
    id: '6', 
    name: 'TestAnalysisAgent', 
    status: 'unhealthy' as const, 
    lastHeartbeat: new Date(Date.now() - 300000),
    throughput: 0,
    avgLatency: 0,
    failureRate: 100,
    errorCount: 5,
    cpuUsage: 0,
    memoryUsage: 0
  }
];

const mockSystemStats = {
  totalCpuUsage: 45,
  totalMemoryUsage: 62,
  gpuUsage: 28,
  queueSize: 23
};

export default function OperationsPage() {
  const handleRestartAgent = (agentId: string) => {
    console.log('Restarting agent:', agentId);
    // In real implementation, call API to restart agent
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">운영 모니터링</h2>
        <p className="text-gray-500">시스템 리소스 및 에이전트 상태를 모니터링합니다</p>
      </header>

      <OperationsMonitor
        agents={mockAgents}
        systemStats={mockSystemStats}
        onRestartAgent={handleRestartAgent}
      />
    </div>
  );
}
