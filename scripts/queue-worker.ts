
import 'dotenv/config'
import prisma from '../lib/db'
import { collectProject } from '../lib/collector/project-collector'
import { analysisOrchestrator } from '../lib/analyzer/orchestrator'

// Simple Queue Worker for Scalability
// In production, this would be a separate service or container.
// It polls the DB for 'PENDING' jobs and executes them.

import 'dotenv/config'
import { taskQueue } from '../lib/queue'
import { AgentOrchestrator } from '../lib/orchestrator'
import { StructureAnalysisAgent } from '../lib/agents/structure-agent'
import { QualityAnalysisAgent } from '../lib/agents/quality-agent'
import { SecurityAnalysisAgent } from '../lib/agents/security-agent'
import { DependencyAnalysisAgent } from '../lib/agents/dependency-agent'
import { StyleAnalysisAgent } from '../lib/agents/style-agent'
import { TestAnalysisAgent } from '../lib/agents/test-agent'

const POLL_INTERVAL_MS = 2000

// Map Agent Names to Instances
const agents = {
  "StructureAnalysisAgent": new StructureAnalysisAgent(),
  "QualityAnalysisAgent": new QualityAnalysisAgent(),
  "SecurityAnalysisAgent": new SecurityAnalysisAgent(),
  "DependencyAnalysisAgent": new DependencyAnalysisAgent(),
  "StyleAnalysisAgent": new StyleAnalysisAgent(),
  "TestAnalysisAgent": new TestAnalysisAgent(),
};

const orchestrator = new AgentOrchestrator();

async function startWorker() {
  console.log('[Worker] Starting DB-backed Queue Worker...')
  
  while (true) {
    try {
      // 1. Dequeue Next Task
      const task = await taskQueue.dequeue();

      if (task) {
        console.log(`[Worker] Picked up task ${task.id} for agent ${task.agentExecution.agentName}`);
        
        const agentName = task.agentExecution.agentName;
        const agent = agents[agentName as keyof typeof agents];

        if (!agent) {
            console.error(`[Worker] Unknown agent: ${agentName}`);
            await taskQueue.fail(task.id, `Unknown agent: ${agentName}`);
            continue;
        }

        try {
            // 2. Execute Agent Logic
            await agent.processTask(task);
            
            // 3. Mark Complete (and trigger orchestrator update)
            // Note: Orchestrator.completeTask also updates the parent AgentExecution status
            await orchestrator.completeTask(task.id, "COMPLETED");
            console.log(`[Worker] Task ${task.id} completed.`);

        } catch (err) {
            console.error(`[Worker] Task ${task.id} failed:`, err);
            await orchestrator.completeTask(task.id, "FAILED", err instanceof Error ? err.message : String(err));
        }

      } else {
        // No jobs, sleep small amount
      }

    } catch (err) {
      console.error('[Worker] Error in loop:', err)
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}

// Check if running directly
if (require.main === module) {
  startWorker()
}

// Check if running directly
if (require.main === module) {
  startWorker()
}
