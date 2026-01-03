/**
 * 에이전트 상태 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScheduler } from '@/lib/services/analysis-service';
import type { SchedulerStats } from '@/lib/pipeline/agents/scheduler';

type AgentType = 'ast' | 'rule' | 'security' | 'dependency' | 'ai';

interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'error';
  currentTask?: string;
  tasksCompleted: number;
  averageTime: number;
}

interface AgentStatusResponse {
  agents: AgentInfo[];
  stats: SchedulerStats;
  isRunning: boolean;
  lastUpdated: string;
}

const agentDefinitions: Omit<AgentInfo, 'status' | 'currentTask' | 'tasksCompleted' | 'averageTime'>[] = [
  { type: 'ast', name: 'AST Agent', description: 'AST 구조 분석' },
  { type: 'rule', name: 'Rule Agent', description: '정적 룰 분석' },
  { type: 'security', name: 'Security Agent', description: '보안 취약점 분석' },
  { type: 'dependency', name: 'Dependency Agent', description: '의존성 분석' },
  { type: 'ai', name: 'AI Agent', description: 'AI 의미 분석' },
];

export async function GET() {
  try {
    const scheduler = getScheduler();
    const stats = scheduler.getStats();

    const agents: AgentInfo[] = agentDefinitions.map(def => {
      const isRunning = stats.runningTasks > 0;
      
      return {
        ...def,
        status: isRunning ? 'running' : 'idle',
        currentTask: undefined,
        tasksCompleted: Math.floor(stats.completedTasks / agentDefinitions.length),
        averageTime: stats.averageExecutionTime,
      };
    });

    const response: AgentStatusResponse = {
      agents,
      stats,
      isRunning: stats.runningTasks > 0 || stats.pendingTasks > 0,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Agent status error:', error);
    return NextResponse.json(
      { error: '에이전트 상태 조회 실패' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const scheduler = getScheduler();

    switch (action) {
      case 'start':
        scheduler.start();
        return NextResponse.json({ success: true, message: '스케줄러 시작됨' });
      
      case 'stop':
        scheduler.stop();
        return NextResponse.json({ success: true, message: '스케줄러 중지됨' });
      
      case 'clear':
        scheduler.clear();
        return NextResponse.json({ success: true, message: '큐 초기화됨' });
      
      default:
        return NextResponse.json(
          { error: '알 수 없는 액션' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Agent control error:', error);
    return NextResponse.json(
      { error: '에이전트 제어 실패' },
      { status: 500 }
    );
  }
}
