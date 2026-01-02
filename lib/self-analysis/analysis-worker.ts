/**
 * AnalysisWorker - 에이전트 태스크 실행 Worker
 * 
 * Orchestrator가 생성한 태스크를 실제로 실행합니다.
 * 각 에이전트를 인스턴스화하고 AI 분석을 수행합니다.
 */

import { prisma } from '@/lib/db';
import { AgentTask, AgentExecution } from '@prisma/client';

// Import all agents
import { StructureAnalysisAgent } from '@/lib/agents/structure-agent';
import { QualityAnalysisAgent } from '@/lib/agents/quality-agent';
import { SecurityAnalysisAgent } from '@/lib/agents/security-agent';
import { DependencyAnalysisAgent } from '@/lib/agents/dependency-agent';
import { StyleAnalysisAgent } from '@/lib/agents/style-agent';
import { TestAnalysisAgent } from '@/lib/agents/test-agent';
import { BaseAgent } from '@/lib/agents/base-agent';

// Agent registry
const AGENT_REGISTRY: Record<string, () => BaseAgent> = {
  'StructureAnalysisAgent': () => new StructureAnalysisAgent(),
  'QualityAnalysisAgent': () => new QualityAnalysisAgent(),
  'SecurityAnalysisAgent': () => new SecurityAnalysisAgent(),
  'DependencyAnalysisAgent': () => new DependencyAnalysisAgent(),
  'StyleAnalysisAgent': () => new StyleAnalysisAgent(),
  'TestAnalysisAgent': () => new TestAnalysisAgent(),
};

export class AnalysisWorker {
  private isRunning = false;
  private currentExecutionId: string | null = null;

  /**
   * 분석 실행 시작 - 에이전트 태스크들을 병렬로 실행
   */
  async executeAnalysis(executionId: string): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ [Worker] Already running an analysis');
      return;
    }

    this.isRunning = true;
    this.currentExecutionId = executionId;
    const startTime = Date.now();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🔧 ANALYSIS WORKER STARTED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Execution ID: ${executionId}`);
    console.log('');

    try {
      // Get all agent executions for this analysis
      const agentExecutions = await prisma.agentExecution.findMany({
        where: { executeId: executionId },
        include: { tasks: true },
        orderBy: { createdAt: 'asc' }
      });

      console.log(`📋 Found ${agentExecutions.length} agents to execute`);
      agentExecutions.forEach((ae, i) => {
        console.log(`   ${i + 1}. ${ae.agentName} (${ae.status})`);
      });
      console.log('');

      // Process agents sequentially for now (can be parallelized later)
      for (const agentExecution of agentExecutions) {
        if (agentExecution.status === 'CANCELLED') {
          console.log(`⏭️ Skipping cancelled agent: ${agentExecution.agentName}`);
          continue;
        }

        await this.executeAgent(agentExecution);
      }

      // Mark analysis as completed
      const failedCount = await prisma.agentExecution.count({
        where: { executeId: executionId, status: 'FAILED' }
      });

      await prisma.analysisExecute.update({
        where: { id: executionId },
        data: {
          status: failedCount > 0 ? 'PARTIAL' : 'COMPLETED',
          completedAt: new Date()
        }
      });

      const duration = Date.now() - startTime;
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`  ✅ ANALYSIS COMPLETED in ${(duration / 1000).toFixed(1)}s`);
      console.log(`     ${agentExecutions.length - failedCount}/${agentExecutions.length} agents succeeded`);
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');

    } catch (error) {
      console.error('❌ [Worker] Analysis failed:', error);
      await prisma.analysisExecute.update({
        where: { id: executionId },
        data: { status: 'FAILED', completedAt: new Date() }
      });
    } finally {
      this.isRunning = false;
      this.currentExecutionId = null;
    }
  }

  /**
   * 단일 에이전트 실행
   */
  private async executeAgent(agentExecution: AgentExecution & { tasks: AgentTask[] }): Promise<void> {
    const agentName = agentExecution.agentName;
    const agentStart = Date.now();

    console.log('');
    console.log(`🤖 ─────────────────────────────────────────────────────────────`);
    console.log(`   Starting: ${agentName}`);
    console.log(`   Tasks: ${agentExecution.tasks.length}`);

    // Update agent status to RUNNING
    await prisma.agentExecution.update({
      where: { id: agentExecution.id },
      data: { status: 'RUNNING' }
    });

    try {
      // Get agent instance
      const createAgent = AGENT_REGISTRY[agentName];
      if (!createAgent) {
        throw new Error(`Unknown agent: ${agentName}`);
      }

      const agent = createAgent();
      console.log(`   ✓ Agent instantiated`);

      // Process each task
      for (const task of agentExecution.tasks) {
        if (task.status === 'CANCELLED') continue;
        
        try {
          await agent.processTask(task);
        } catch (taskError: any) {
          console.error(`   ❌ Task failed: ${taskError.message}`);
        }
      }

      const duration = Date.now() - agentStart;

      // Update agent as completed
      await prisma.agentExecution.update({
        where: { id: agentExecution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          durationMs: duration
        }
      });

      console.log(`   ✅ ${agentName} completed in ${duration}ms`);

    } catch (error: any) {
      console.error(`   ❌ Agent failed: ${error.message}`);
      
      await prisma.agentExecution.update({
        where: { id: agentExecution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          durationMs: Date.now() - agentStart
        }
      });
    }
  }

  /**
   * 현재 분석 취소
   */
  cancel(): void {
    console.log('🛑 [Worker] Cancellation requested');
    this.isRunning = false;
  }

  /**
   * Worker 상태 조회
   */
  getStatus(): { isRunning: boolean; executionId: string | null } {
    return {
      isRunning: this.isRunning,
      executionId: this.currentExecutionId
    };
  }
}

// Singleton instance
export const analysisWorker = new AnalysisWorker();
