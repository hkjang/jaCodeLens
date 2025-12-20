import { BaseAgent, AgentResult, AgentContext } from './base-agent'

export class ImprovementAgent extends BaseAgent {
  public readonly name = 'ImprovementAgent'
  public readonly description = 'Generates automated code fixes and improvement plans for detected issues.'

  async analyze(context: AgentContext): Promise<AgentResult> {
    const results = []
    const highSevIssues = context.previousResults.filter(r => r.severity === 'HIGH' || r.severity === 'CRITICAL')

    for (const issue of highSevIssues) {
       // 1. Security Fixes
       if (issue.category === 'SECURITY' && issue.message.includes('Secret Exposed')) {
          results.push(this.createResult(
             'IMPROVEMENT',
             'INFO',
             `Proposed Fix for Secret at ${issue.filePath}`,
             {
               confidenceScore: 0.9,
               reasoning: 'Secrets should be moved to environment variables.',
               suggestion: `
// 1. Add to .env:
// ${issue.message.split(': ')[1]?.slice(0, 10)}...=REDACTED

// 2. Modify ${issue.filePath}:
// const secret = process.env.MY_SECRET_KEY
               `
             } as any
          ))
       }

       // 2. Architecture Fixes
       if (issue.category === 'ARCHITECTURE' && issue.message.includes('Circular Dependency')) {
         results.push(this.createResult(
            'IMPROVEMENT',
            'INFO',
            `Refactoring Plan for Cycle: ${issue.filePath}`,
            {
               confidenceScore: 0.7,
               reasoning: 'Circular dependencies prevent proper tree shaking and testing. Dependency Inversion Principle (DIP) recommended.',
               suggestion: `Create a shared 'interface' or 'types' file that both components depend on, rather than depending on each other directly.`
            } as any
         ))
       }
    }

    return {
      results,
      metadata: {
        fixesGenerated: results.length
      }
    }
  }
}
