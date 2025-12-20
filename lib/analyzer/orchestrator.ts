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

        const start = Date.now()
        try {
          // Execute Agent Logic
          const result = await agent.analyze({
            projectContext: context,
            previousResults: [], // For first pass, no previous results. In future, we might have tiered execution.
            config: {}
          })

          // Save Agent Results to DB
          for (const item of result.results) {
             await prisma.analysisResult.create({
               data: {
                 executeId: currentAnalysisId,
                 ...item
               }
             })
          }

          // Save Dependencies (if any)
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

          return result

        } catch (err) {
          console.error(`Agent ${agent.name} failed:`, err)
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
      })

      await Promise.all(agentPromises)

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
