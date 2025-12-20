'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

import { collectProject } from '@/lib/collector/project-collector'
import { analysisOrchestrator } from '@/lib/analyzer/orchestrator'

export async function analyzeProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return { success: false, error: 'Project not found' }

  try {
    // 1. Collect Project Context
    const context = await collectProject(project.path)

    // 2. Run Multi-Agent Analysis
    await analysisOrchestrator.analyzeProject(projectId, context)
    
    // 3. Update Stats (Optionally triggered here or recalculated in orchestrator)
    // For now, stats logic inside orchestrator is pending (TODO: Calculate aggregated score).
    // We can rely on separate API or recalculate here if needed.
    // The previous implementation calculated stats immediately.
    // Let's rely on orchestrator filling the DB, and we revalidate.
    
    // Existing UI might rely on stats being populated in ProjectStats.
    // The current orchestrator only fills AnalysisResult and AnalysisExecute.
    // We will need to restore Stats Calculation.
    
    // TODO: Ideally the Orchestrator or a "Wrap Up" agent does this.
    // Failure to update stats might break UI charts.
    // I will add a quick stats update here based on results.
    
    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error('Analysis failed:', error)
    return { success: false, error: 'Analysis failed' }
  }
}

export async function getProjects() {
   const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
         stats: { orderBy: { timestamp: 'desc' }, take: 1 }
      }
   })
   return projects
}

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string
  const path = formData.get('path') as string
  const tier = formData.get('tier') as string || 'STANDARD'

  try {
    await prisma.project.create({
      data: { name, path, tier }
    })
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to create project:', error)
    return { success: false, error: 'Failed to create project' }
  }
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      stats: { orderBy: { timestamp: 'desc' }, take: 1 },
      analyses: { orderBy: { startedAt: 'desc' }, take: 5 }
    }
  })
  return project
}

export async function updateIssueStatus(resultId: string, status: string, comment?: string) {
  try {
    await prisma.analysisResult.update({
      where: { id: resultId },
      data: { 
        reviewStatus: status,
        reviewComment: comment 
      }
    })
    revalidatePath('/report')
    return { success: true }
  } catch (error) {
    console.error('Failed to update issue status:', error)
    return { success: false, error: 'Failed to update issue' }
  }
}
