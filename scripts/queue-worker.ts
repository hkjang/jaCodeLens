
import 'dotenv/config'
import prisma from '../lib/db'
import { collectProject } from '../lib/collector/project-collector'
import { analysisOrchestrator } from '../lib/analyzer/orchestrator'

// Simple Queue Worker for Scalability
// In production, this would be a separate service or container.
// It polls the DB for 'PENDING' jobs and executes them.

const POLL_INTERVAL_MS = 5000

async function processJob(executeId: string, projectId: string) {
  console.log(`[Worker] Picking up job ${executeId} for project ${projectId}`)
  
  try {
    // 1. Update status to RUNNING
    // (Note: The orchestrator creates the record as RUNNING in analyzeProject, 
    // but here we are simulating a "Queue" where jobs start as PENDING in DB)
    
    // Fetch project path
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) throw new Error('Project not found')

    // 2. Run Analysis
    console.log(`[Worker] Collecting files from ${project.path}...`)
    const context = await collectProject(project.path)
    
    console.log(`[Worker] Starting Orchestrator...`)
    // The orchestrator currently creates a NEW AnalysisExecute. 
    // We should refactor Orchestrator to accept an existing ID or we just let it create one and link it?
    // For "Enterprise" queue, we ideally want to create the record FIRST as PENDING, then update it.
    
    // To avoid refactoring entire Orchestrator right now, let's just count on the Orchestrator doing its thing
    // and we just mark the "Queue Item" as processed. 
    // BUT wait, `AnalysisExecute` IS the queue item essentially.
    
    // Let's modify Orchestrator to optionally accept an `executionId`? 
    // Or we just update the wrapper here.
    
    // For this scalability MVP: 
    // We assume the web UI created `AnalysisExecute` with status='PENDING'.
    // We pass that ID to orchestrator.
    
    // *Wait*, `orchestrator.analyzeProject` creates a *new* record. 
    // I should tweak `orchestrator.analyzeProject` to support taking an existing `analysisId`.
    
    // Temporary Hack: Let Orchestrator create a new one, but we link it or just log it.
    // Better: Update Orchestrator.
    
    // Actually, let's look at `orchestrator.ts`. It creates `AnalysisExecute`.
    // I'll update it to take optional ID.
    
    await analysisOrchestrator.analyzeProject(projectId, context, executeId)
    
    console.log(`[Worker] Job ${executeId} completed successfully.`)

  } catch (error) {
    console.error(`[Worker] Job ${executeId} failed:`, error)
    await prisma.analysisExecute.update({
        where: { id: executeId },
        data: { status: 'FAILED', completedAt: new Date() }
    })
  }
}

async function startWorker() {
  console.log('[Worker] Starting Queue Worker...')
  
  while (true) {
    try {
      // Find one PENDING job
      const job = await prisma.analysisExecute.findFirst({
        where: { status: 'PENDING' },
        orderBy: { startedAt: 'asc' }
      })

      if (job) {
        await processJob(job.id, job.projectId)
      } else {
        // No jobs, sleep
        // console.log('[Worker] No jobs, sleeping...')
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
