import { BaseAgent, AgentResult, AgentContext } from './base-agent'

export class OpsRiskAgent extends BaseAgent {
  public readonly name = 'OpsRiskAgent'
  public readonly description = 'Estimates operational risk and MTTR based on reliability patterns.'

  async analyze(context: AgentContext): Promise<AgentResult> {
    const files = context.projectContext.files
    let totalFiles = 0
    let filesWithLogs = 0
    let filesWithErrorHandling = 0
    let filesWithRetry = 0

    const RELIABILITY_KEYWORDS = ['retry', 'backoff', 'circuitbreaker', 'timeout', 'ratelimit']
    const LOGGING_KEYWORDS = ['log.', 'logger.', 'console.error', 'console.warn', 'winston', 'pino']
    const ERROR_KEYWORDS = ['try', 'catch', 'errorhandler', '.catch']

    for (const file of files) {
      if (!file.content) continue
      totalFiles++
      const contentLower = file.content.toLowerCase()

      if (LOGGING_KEYWORDS.some(kw => contentLower.includes(kw))) filesWithLogs++
      if (ERROR_KEYWORDS.some(kw => contentLower.includes(kw))) filesWithErrorHandling++
      if (RELIABILITY_KEYWORDS.some(kw => contentLower.includes(kw))) filesWithRetry++
    }

    // Heuristic Calculation
    const logCoverage = totalFiles > 0 ? filesWithLogs / totalFiles : 0
    const riskScore = 100 - (logCoverage * 40) - (filesWithRetry > 0 ? 20 : 0) - (filesWithErrorHandling > 0 ? 20 : 0)
    
    // MTTR Estimate (Hours)
    // Baseline 4h. +4h if poor logging. +2h if complex (not checked here yet).
    let mttr = 4
    if (logCoverage < 0.5) mttr += 4
    if (filesWithRetry === 0) mttr += 2

    const results = []
    
    results.push(this.createResult(
      'OPERATIONS',
      riskScore < 50 ? 'HIGH' : 'LOW',
      `Operational Risk Score: ${Math.round(riskScore)}/100`,
      {
        confidenceScore: 0.6,
        suggestion: `Improve logging (current coverage: ${Math.round(logCoverage * 100)}%) and add reliability patterns.`
      } as any
    ))

    results.push(this.createResult(
      'OPERATIONS',
      'INFO',
      `Estimated MTTR: ${mttr} hours`,
      {
        confidenceScore: 0.5,
        suggestion: 'Reduce MTTR by adding structured logging and comprehensive error handling.'
      } as any
    ))

    return {
      results,
      metadata: {
        riskScore,
        mttr,
        stats: {
          logCoverage,
          filesWithRetry
        }
      }
    }
  }
}
