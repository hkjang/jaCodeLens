import { BaseAgent, AgentResult, AgentContext } from './base-agent'

export class GovernanceAgent extends BaseAgent {
  public readonly name = 'GovernanceAgent'
  public readonly description = 'Enforces project rules, calculates quality scores, and determines pass/fail status.'

  async analyze(context: AgentContext): Promise<AgentResult> {
    const results: any[] = []
    const previousResults = context.previousResults

    // 1. Calculate Overall Quality Score (0-100)
    // Formula: Start at 100. Deduct for issues.
    // Critical: -25, High: -10, Medium: -5, Low: -1
    let qualityScore = 100
    
    // Safety clamp
    const deduct = (amount: number) => { qualityScore = Math.max(0, qualityScore - amount) }

    let criticalCount = 0
    let highCount = 0

    for (const res of previousResults) {
       if (res.severity === 'CRITICAL') { deduct(25); criticalCount++ }
       if (res.severity === 'HIGH') { deduct(10); highCount++ }
       if (res.severity === 'MEDIUM') { deduct(5) }
       if (res.severity === 'LOW') { deduct(1) }
    }

    // 2. Enforce Rules (Hard Gates)
    // Default Rule: No Critical Issues allowed.
    const rules = [
      { name: 'No Critical Issues', check: () => criticalCount === 0, failMessage: `Found ${criticalCount} Critical issues.` },
      { name: 'Min Score 60', check: () => qualityScore >= 60, failMessage: `Quality Score ${qualityScore} is below threshold 60.` }
    ]

    const failedRules = []
    for (const rule of rules) {
       if (!rule.check()) {
          failedRules.push(rule)
          results.push(this.createResult(
            'GOVERNANCE',
            'CRITICAL',
            `Policy Violation: ${rule.name}`,
            {
               confidenceScore: 1.0,
               reasoning: rule.failMessage,
               suggestion: 'Fix blocking issues to pass governance gate.'
            } as any
          ))
       }
    }

    // 3. Output Score
    results.push(this.createResult(
      'GOVERNANCE',
      'INFO',
      `Project Quality Score: ${qualityScore}/100`,
      {
         confidenceScore: 1.0,
         reasoning: `Deductions: ${criticalCount} Critical, ${highCount} High.`,
         suggestion: qualityScore < 80 ? 'Improve code quality to increase score.' : 'Great job!'
      } as any
    ))

    return {
      results,
      metadata: {
        qualityScore,
        passedGovernance: failedRules.length === 0,
        failedRules: failedRules.map(r => r.name)
      }
    }
  }
}
