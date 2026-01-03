/**
 * 에이전트 상태 API
 * 
 * 분석 에이전트의 실시간 상태를 조회합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentScheduler, AgentTask, AgentType, SchedulerStats } from '@/lib/pipeline/agents/scheduler';

// 글로벌 스케줄러 인스턴스 (실제로는 서비스 레이어에서 관리)
let globalScheduler: AgentScheduler | null = null;

export function getGlobalScheduler(): AgentScheduler {
  if (!globalScheduler) {
    globalScheduler = new AgentScheduler({
      maxConcurrency: 4,
      maxRetries: 3,
      retryBaseDelayMs: 1000,
      taskTimeoutMs: 60000,
    });
  }
  return globalScheduler;
}

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

// Mock 에이전트 정보 (실제 구현에서는 스케줄러에서 추적)
const agentDefinitions: Omit<AgentInfo, 'status' | 'currentTask' | 'tasksCompleted' | 'averageTime'>[] = [
  { type: 'ast', name: 'AST Agent', description: 'AST 구조 분석' },
  { type: 'rule', name: 'Rule Agent', description: '정적 룰 분석' },
  { type: 'security', name: 'Security Agent', description: '보안 취약점 분석' },
  { type: 'dependency', name: 'Dependency Agent', description: '의존성 분석' },
  { type: 'ai', name: 'AI Agent', description: 'AI 의미 분석' },
];

export async function GET(request: NextRequest) {
  try {
    const scheduler = getGlobalScheduler();
    const stats = scheduler.getStats();

    // 에이전트 상태 집계
    const agents: AgentInfo[] = agentDefinitions.map(def => {
      // 실제로는 스케줄러에서 에이전트별 상태 추적
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

// 스케줄러 제어 (시작/중지)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const scheduler = getGlobalScheduler();

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
