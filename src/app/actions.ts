'use server'

import prisma from '@/lib/db'
import { runFullAnalysis } from '@/lib/analyzer'
import { revalidatePath } from 'next/cache'

export async function createProject(path: string, name: string) {
  try {
    const project = await prisma.project.create({
      data: {
        path,
        name: name || path.split('\\').pop() || 'Untitled',
        type: 'UNKNOWN'
      }
    })
    revalidatePath('/')
    return { success: true, project }
  } catch (error) {
    console.error('Failed to create project:', error)
    return { success: false, error: 'Failed to create project' }
  }
}

export async function getProjects() {
  return await prisma.project.findMany({
    include: {
      stats: {
        orderBy: { timestamp: 'desc' },
        take: 1
      },
      analyses: {
        orderBy: { startedAt: 'desc' },
        take: 1
      }
    },
    orderBy: { updatedAt: 'desc' }
  })
}

export async function getProject(id: string) {
  return await prisma.project.findUnique({
    where: { id },
    include: {
      analyses: {
        orderBy: { startedAt: 'desc' },
        take: 5
      }
    }
  })
}

export async function analyzeProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return { success: false, error: 'Project not found' }

  // Create execution record
  const execution = await prisma.analysisExecute.create({
    data: {
      projectId,
      status: 'RUNNING',
    }
  })

  // Run analysis (in background ideally, but await for simplicity for now)
  // In a real app, this should be a job queue.
  // We'll run it here but wrap in try/catch to update status.
  
  try {
    const result = await runFullAnalysis(project.path, true) // Enable AI by default
    
    // Save results
    await prisma.$transaction(async (tx) => {
      // 1. Update Execution
      await tx.analysisExecute.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          score: result.staticAnalysis.summary.averageComplexity,
          report: result.aiReport
        }
      })

      // 2. Save Issues
      for (const issue of result.staticAnalysis.issues) {
        await tx.analysisResult.create({
          data: {
            executeId: execution.id,
            category: issue.category,
            severity: issue.severity,
            filePath: issue.file,
            lineNumber: issue.line,
            message: issue.message,
          }
        })
      }

      // 3. Update Stats
      await tx.projectStats.create({
        data: {
          projectId,
          codeQualityScore: 100 - (result.staticAnalysis.summary.criticalIssues * 5),
          securityScore: 100 - (result.staticAnalysis.issues.filter(i => i.category === 'SECURITY').length * 10),
          maintainabilityScore: 100 - result.staticAnalysis.summary.averageComplexity
        }
      })
    })

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
    
  } catch (error) {
    console.error('Analysis failed:', error)
    await prisma.analysisExecute.update({
      where: { id: execution.id },
      data: { status: 'FAILED', completedAt: new Date() }
    })
    return { success: false, error: 'Analysis failed' }
  }
}
