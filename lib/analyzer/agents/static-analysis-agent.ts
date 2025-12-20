import { BaseAgent, AgentResult, AgentContext } from './base-agent'
import { analyzeProjectStatic } from '../static-analyzer'

export class StaticAnalysisAgent extends BaseAgent {
  public readonly name = 'StaticAnalysisAgent'
  public readonly description = 'Performs static code analysis using regex and patterns.'

  async analyze(context: AgentContext): Promise<AgentResult> {
    const staticResult = analyzeProjectStatic(context.projectContext)
    
    // Convert to DB-compatible format
    const results = staticResult.issues.map(issue => 
      this.createResult(
        issue.category, // Map if necessary, assuming string match for now
        issue.severity, 
        issue.message,
        {
          filePath: issue.file,
          lineNumber: issue.line,
          suggestion: null // static analyzer might provide this later
        }
      )
    )

    return {
      results,
      metadata: {
        metrics: staticResult.metrics,
        summary: staticResult.summary
      }
    }
  }
}
