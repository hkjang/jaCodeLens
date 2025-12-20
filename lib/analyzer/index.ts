import { collectProject } from '../collector/project-collector'
import { analyzeProjectStatic } from './static-analyzer'
import { analyzeProjectWithAI } from './ai-analyzer'
import { ProjectContext } from '../collector/types'
import { StaticAnalysisResult } from './types'

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

  // 2. Static Analysis
  console.log('Running static analysis...')
  const staticAnalysis = analyzeProjectStatic(context)
  console.log(`Static analysis complete. Found ${staticAnalysis.issues.length} issues.`)

  // 3. AI Analysis
  let aiReport = 'AI Analysis Skipped'
  if (useAI) {
    console.log('Running AI analysis...')
    aiReport = await analyzeProjectWithAI(context, staticAnalysis)
    console.log('AI analysis complete.')
  }

  return {
    context,
    staticAnalysis,
    aiReport,
    timestamp: new Date()
  }
}
