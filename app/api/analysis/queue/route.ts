/**
 * 작업 큐 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScheduler } from '@/lib/services/analysis-service';
import type { TaskStatus, AgentType } from '@/lib/pipeline/agents/scheduler';

interface QueueTask {
  id: string;
  agentType: AgentType;
  status: TaskStatus;
  priority: number;
  retryCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  duration?: number;
}

interface QueueResponse {
  pending: QueueTask[];
  running: QueueTask[];
  completed: QueueTask[];
  failed: QueueTask[];
  summary: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') as TaskStatus | null;

    const scheduler = getScheduler();
    const stats = scheduler.getStats();

    const mockTasks: QueueTask[] = [];
    const agentTypes: AgentType[] = ['ast', 'rule', 'security', 'dependency', 'ai'];

    for (let i = 0; i < Math.min(stats.pendingTasks, limit); i++) {
      mockTasks.push({
        id: `pending_${i}`,
        agentType: agentTypes[i % 5],
        status: 'pending',
        priority: Math.floor(Math.random() * 10),
        retryCount: 0,
        createdAt: new Date(Date.now() - Math.random() * 60000).toISOString(),
      });
    }

    for (let i = 0; i < Math.min(stats.runningTasks, 4); i++) {
      mockTasks.push({
        id: `running_${i}`,
        agentType: agentTypes[i % 5],
        status: 'running',
        priority: 5,
        retryCount: 0,
        createdAt: new Date(Date.now() - 30000).toISOString(),
        startedAt: new Date(Date.now() - 10000).toISOString(),
      });
    }

    for (let i = 0; i < Math.min(stats.completedTasks, limit); i++) {
      mockTasks.push({
        id: `completed_${i}`,
        agentType: agentTypes[i % 5],
        status: 'completed',
        priority: 5,
        retryCount: 0,
        createdAt: new Date(Date.now() - 120000).toISOString(),
        startedAt: new Date(Date.now() - 110000).toISOString(),
        completedAt: new Date(Date.now() - 100000).toISOString(),
        duration: stats.averageExecutionTime,
      });
    }

    for (let i = 0; i < Math.min(stats.failedTasks, limit); i++) {
      mockTasks.push({
        id: `failed_${i}`,
        agentType: agentTypes[i % 5],
        status: 'failed',
        priority: 5,
        retryCount: 3,
        createdAt: new Date(Date.now() - 180000).toISOString(),
        startedAt: new Date(Date.now() - 170000).toISOString(),
        completedAt: new Date(Date.now() - 160000).toISOString(),
        error: '분석 타임아웃',
      });
    }

    let filteredTasks = mockTasks;
    if (status) {
      filteredTasks = mockTasks.filter(t => t.status === status);
    }

    const response: QueueResponse = {
      pending: filteredTasks.filter(t => t.status === 'pending'),
      running: filteredTasks.filter(t => t.status === 'running'),
      completed: filteredTasks.filter(t => t.status === 'completed').slice(0, 20),
      failed: filteredTasks.filter(t => t.status === 'failed'),
      summary: {
        total: stats.totalTasks,
        pending: stats.pendingTasks,
        running: stats.runningTasks,
        completed: stats.completedTasks,
        failed: stats.failedTasks,
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      { error: '큐 상태 조회 실패' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType, input, priority } = body;

    if (!agentType || !input) {
      return NextResponse.json(
        { error: 'agentType과 input은 필수입니다' },
        { status: 400 }
      );
    }

    const scheduler = getScheduler();
    const taskId = scheduler.addTask(agentType, input, { priority });

    return NextResponse.json({
      success: true,
      taskId,
      message: '작업이 큐에 추가되었습니다',
    });

  } catch (error) {
    console.error('Queue add error:', error);
    return NextResponse.json(
      { error: '작업 추가 실패' },
      { status: 500 }
    );
  }
}
