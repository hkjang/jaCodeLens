import { collectProject } from '../collector/project-collector'
import { analysisOrchestrator } from './orchestrator'
import { ProjectContext } from '../collector/types'
import { StaticAnalysisResult } from './types'
import prisma from '../db' // We need prisma to fetch results

export interface FullAnalysisResult {
  context: ProjectContext
  staticAnalysis: StaticAnalysisResult
  aiReport: string
  timestamp: Date
}

export async function runFullAnalysis(projectPath: string, useAI = true): Promise<FullAnalysisResult> {
  console.log(`Starting analysis for: ${projectPath}`)
  
  // 1. Collect
  console.log('Collecting files...')
  const context = await collectProject(projectPath)
  console.log(`Collected ${context.files.length} files.`)

  // 2. Run Analysis Orchestrator
  console.log('Running Multi-Agent analysis...')
  // We need a dummy project ID for the orchestrator if we are running from CLI/Script with no DB project
  // But wait, the orchestrator writes to DB. The Project MUST exist.
  // For the script, we might fail if we don't have a project record.
  // We should create a temp project or find existing?
  
  // Let's assume for "test-analysis", we find or create a project based on path.
  const projectName = projectPath.split(/[\\/]/).pop() || 'CLI Project'
  
  let project = await prisma.project.findUnique({ where: { path: projectPath } })
  if (!project) {
     project = await prisma.project.create({
       data: { path: projectPath, name: projectName }
     })
  }
  
  const executeId = await analysisOrchestrator.analyzeProject(project.id, context)
  console.log(`Analysis complete. Execution ID: ${executeId}`)

  // 3. Reconstruct Legacy Result Format (for backward compatibility / logging)
  // Fetch results from DB
  const results = await prisma.analysisResult.findMany({
    where: { executeId }
  })
  
  const staticIssues = results.map(r => ({
      file: r.filePath || '',
      line: r.lineNumber || 0,
      message: r.message,
      severity: r.severity as any,
      category: r.category as any
  }))

  const staticAnalysis: StaticAnalysisResult = {
      issues: staticIssues,
      metrics: [], // We might not have saved metrics to DB in detail yet, or we need to fetch them from agent metadata
      dependencies: {},
      summary: {
          totalFiles: context.files.length,
          totalLines: 0, // TODO
          averageComplexity: 0,
          criticalIssues: staticIssues.filter(i => i.severity === 'CRITICAL').length
      }
  }

  return {
    context,
    staticAnalysis,
    aiReport: 'Analysis completed via Agents.', 
    timestamp: new Date()
  }
}
