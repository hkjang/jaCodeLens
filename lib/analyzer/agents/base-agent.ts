import { ProjectContext } from '../../collector/types'
import { AnalysisResult } from '@prisma/client'

export interface AgentContext {
  projectContext: ProjectContext
  previousResults: AnalysisResult[]
  config: Record<string, any>
}

export interface AgentResult {
  results: Omit<AnalysisResult, 'id' | 'executeId' | 'createdAt'>[]
  dependencies?: { from: string; to: string; type: string }[]
  metadata?: Record<string, any>
}

export abstract class BaseAgent {
  public abstract readonly name: string
  public abstract readonly description: string
  
  constructor(protected config: Record<string, any> = {}) {}

  /**
   * Main analysis method.
   * Can be overridden to run parallel or sequential logic.
   */
  abstract analyze(context: AgentContext): Promise<AgentResult>

  protected createResult(
    category: string,
    severity: string,
    message: string,
    defaults: Partial<Omit<AnalysisResult, 'id' | 'executeId' | 'createdAt'>> = {}
  ): Omit<AnalysisResult, 'id' | 'executeId' | 'createdAt'> {
    return {
      category,
      severity,
      message,
      filePath: null,
      lineNumber: null,
      suggestion: null,
      confidenceScore: 1.0,
      reasoning: null,
      ...(defaults as any)
    } as Omit<AnalysisResult, 'id' | 'executeId' | 'createdAt'>
  }
}
