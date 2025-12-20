import { BaseAgent, AgentResult, AgentContext } from './base-agent'
import { AnalysisResult } from '@prisma/client'

export class ReviewerAgent extends BaseAgent {
  public readonly name = 'ReviewerAgent'
  public readonly description = 'Synthesizes analysis results, calculates aggregated scores, and generates XAI reasoning.'

  async analyze(context: AgentContext): Promise<AgentResult> {
    const previousResults = context.previousResults
    const results: any[] = []

    // 1. Category Aggregation
    const scores = {
      SECURITY: { total: 0, count: 0, weights: 0 },
      QUALITY: { total: 0, count: 0, weights: 0 },
      ARCHITECTURE: { total: 0, count: 0, weights: 0 },
      OPERATIONS: { total: 0, count: 0, weights: 0 }
    }

    // 2. Synthesize & Rescore
    // This agent doesn't just read; it "reviews". 
    // If a high-sev security issue has low confidence, we might downgrade it or flag for manual review.
    
    for (const result of previousResults) {
      // Heuristic: Weighted Score Calculation
      // Severity: CRITICAL=100, HIGH=80, MEDIUM=50, LOW=20, INFO=0
      let severityScore = 0
      switch(result.severity) {
        case 'CRITICAL': severityScore = 100; break;
        case 'HIGH': severityScore = 80; break;
        case 'MEDIUM': severityScore = 50; break;
        case 'LOW': severityScore = 20; break;
        default: severityScore = 0;
      }

      // XAI: Add Reasoning if missing
      let explanation = result.reasoning
      if (!explanation) {
         explanation = `Automated finding based on static pattern matching with ${Math.round(result.confidenceScore * 100)}% confidence.`
      }

      // If confidence is low (< 0.5) but severity is HIGH/CRITICAL, we add a "Review" suggestion
      if (result.confidenceScore < 0.5 && severityScore >= 80) {
         explanation += ` [CAUTION: Low Confidence - Manual Verification Recommended]`
      }

      // Re-emit the result with potentially enhanced reasoning (Reviewer "Pass-through" with annotation)
      // Note: In a real system, we might merge duplicates or inhibit noise here.
      // For now, we are just annotating.
      
      // We don't want to duplicate raw results in the DB? 
      // The Orchestrator saves specific agent results. The Reviewer might produce a "Summary" result?
      // Or we assume the Reviewer runs LAST and generates a "Meta-Analysis" result.
    }

    // 3. Generate High-Level Insights
    // "Based on 4 agents, the biggest risk area is Architecture (Circular Deps)."
    
    const highSevIssues = previousResults.filter(r => r.severity === 'HIGH' || r.severity === 'CRITICAL')
    const architectureIssues = highSevIssues.filter(r => r.category === 'ARCHITECTURE')
    const securityIssues = highSevIssues.filter(r => r.category === 'SECURITY')

    if (architectureIssues.length > securityIssues.length) {
       results.push(this.createResult(
         'SUMMARY',
         'HIGH',
         'Primary Risk Area: Architecture',
         {
           confidenceScore: 0.9,
           reasoning: `Found ${architectureIssues.length} architectural violations compared to ${securityIssues.length} security issues. Prioritize refactoring dependency cycles.`,
           suggestion: 'Schedule a "Architecture Sprints" to resolve circular dependencies.'
         } as any
       ))
    }

    if (securityIssues.length > 0) {
       results.push(this.createResult(
         'SUMMARY',
         'CRITICAL',
         'Security Gate Failed',
         {
           confidenceScore: 1.0,
           reasoning: `Blocking vulnerabilities detected: ${securityIssues.map(i => i.message).join(', ').slice(0, 100)}...`,
           suggestion: 'Immediate hotfix required for security compliance.'
         } as any
       ))
    }

    return {
      results,
      metadata: {
        totalIssuesReviewed: previousResults.length,
        aggregatedScores: scores
      }
    }
  }
}
