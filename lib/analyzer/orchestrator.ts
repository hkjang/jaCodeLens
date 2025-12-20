import prisma from '../db'
import { ProjectContext } from '../collector/types'
import { BaseAgent, AgentResult } from './agents/base-agent'

import { StaticAnalysisAgent } from './agents/static-analysis-agent'
import { ArchitectureAgent } from './agents/architecture-agent'
import { SecurityAgent } from './agents/security-agent'
import { OpsRiskAgent } from './agents/ops-risk-agent'
import { ReviewerAgent } from './agents/reviewer-agent'
import { ImprovementAgent } from './agents/improvement-agent'
import { GovernanceAgent } from './agents/governance-agent'

// ...

export class MultiAgentOrchestrator {
  private agents: BaseAgent[] = []

  constructor() {
    this.registerAgents()
  }

  private registerAgents() {
    this.agents.push(new StaticAnalysisAgent())
    this.agents.push(new ArchitectureAgent())
    this.agents.push(new SecurityAgent())
    this.agents.push(new OpsRiskAgent())
    this.agents.push(new ReviewerAgent())
    this.agents.push(new ImprovementAgent())
    this.agents.push(new GovernanceAgent())
  }

  /**
   * Registers a custom agent dynamically (useful for testing or plugins)
   */
  public registerAgent(agent: BaseAgent) {
    this.agents.push(agent)
  }

  public async analyzeProject(
    projectId: string, 
    context: ProjectContext,
    existingAnalysisId?: string
  ): Promise<string> {
    
    let analysisId = existingAnalysisId

    // 1. Create Analysis Record if not provided
    if (!analysisId) {
       const analysis = await prisma.analysisExecute.create({
        data: {
          projectId,
          status: 'RUNNING',
          startedAt: new Date()
        }
      })
      analysisId = analysis.id
      
      // Audit Start
      try {
        const { logAudit } = await import('../../audit');
        await logAudit('ANALYSIS_START', 'ANALYSIS', analysisId, 'SYSTEM');
      } catch (e) { console.error('Audit failed', e); }

    } else {
       // Update existing to RUNNING
       await prisma.analysisExecute.update({
         where: { id: analysisId },
         data: { status: 'RUNNING', startedAt: new Date() }
       })
    }

    // Capture ID for use in closures
    const currentAnalysisId = analysisId


    try {
      // 2. Run Agents
      const allResults: AgentResult[] = []

      // Run in parallel for efficiency
      const agentPromises = this.agents.map(async (agent) => {
        
        // Track agent execution start
        const agentExec = await prisma.agentExecution.create({
          data: {
            executeId: currentAnalysisId,
            agentName: agent.name,
            status: 'RUNNING',
            createdAt: new Date()
          }
        })

        const TIMEOUT_MS = 60000; // 1 minute timeout per agent
        const MAX_RETRIES = 2;

        let attempt = 0;
        let success = false;
        let result: AgentResult = { results: [] };

        while (attempt <= MAX_RETRIES && !success) {
          attempt++;
          const start = Date.now();
          
          try {
            // Execute Agent Logic with Timeout
            const agentPromise = agent.analyze({
              projectContext: context,
              previousResults: [], 
              config: {}
            });

            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Agent execution timed out')), TIMEOUT_MS)
            );

            result = await Promise.race([agentPromise, timeoutPromise]);
            success = true;

            // Save Agent Results to DB
            for (const item of result.results) {
               await prisma.analysisResult.create({
                 data: {
                   executeId: currentAnalysisId,
                   ...item
                 }
               })
            }

            // ... Dependency saving logic (omitted for brevity, assume unchanged or needs re-insertion) ...
            if (result.dependencies && result.dependencies.length > 0) {
              await prisma.dependency.createMany({
                data: result.dependencies.map(dep => ({
                  executeId: currentAnalysisId,
                  from: dep.from,
                  to: dep.to,
                  type: dep.type
                }))
              })
            }

            // Update Agent Execution Status
            await prisma.agentExecution.update({
              where: { id: agentExec.id },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                durationMs: Date.now() - start
              }
            })

            // MLOps Logging (re-inserted)
             try {
               const { logModelExecution } = await import('../../mlops');
               await logModelExecution(agentExec.id, agent.name, {
                 latency: Date.now() - start,
                 inputTokens: 0, 
                 outputTokens: 0
               });
            } catch (e) {
              console.error('MLOps logging failed', e);
            }

            return result;

          } catch (err: any) {
            console.error(`Agent ${agent.name} failed (Attempt ${attempt}):`, err);
            
            if (attempt > MAX_RETRIES) {
               await prisma.agentExecution.update({
                where: { id: agentExec.id },
                data: {
                  status: 'FAILED',
                  completedAt: new Date(),
                  durationMs: Date.now() - start
                }
              })
              return { results: [] }
            }
            // If checking for retry, maybe log a warning.
          }
        }
        return { results: [] }; // Should be unreachable if success loop works
      })

      await Promise.all(agentPromises)

      // 2.2 Run Specialized Analysis
      try {
        const { runSpecializedAnalysis } = await import('../../analysis/specialized');
        // Need to fetch project type to know what to run. 
        // For efficiency, we assume context might have it, or fetch it.
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (project && project.type) {
           await runSpecializedAnalysis(project.type as any, projectId, currentAnalysisId);
        }
      } catch (e) {
        console.error('Specialized analysis failed', e);
      }

      // 2.5 Trigger Approvals
      const { triggerApprovalsIfNeeded, isExecutionBlocked } = await import('../../workflow');
      await triggerApprovalsIfNeeded(currentAnalysisId);
      
      const blocked = await isExecutionBlocked(currentAnalysisId);

      // 3. Finalize
      await prisma.analysisExecute.update({
        where: { id: currentAnalysisId },
        data: {
          status: blocked ? 'PENDING_APPROVAL' : 'COMPLETED',
          completedAt: blocked ? null : new Date(),
          score: 0 // TODO: Calculate aggregated score
        }
      })

      return currentAnalysisId

    } catch (error) {
      console.error('Orchestrator failed:', error)
      await prisma.analysisExecute.update({
        where: { id: currentAnalysisId },
        data: {
          status: 'FAILED',
          completedAt: new Date()
        }
      })
      throw error
    }
  }
}

export const analysisOrchestrator = new MultiAgentOrchestrator()
