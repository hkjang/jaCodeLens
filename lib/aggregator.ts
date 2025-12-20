import { prisma } from "@/lib/db";
import { AnalysisExecute } from "@prisma/client";

export class ResultAggregator {
  
  /**
   * Aggregates results for a given execution ID.
   * This is called when all agents have completed.
   */
  async aggregateResults(executeId: string): Promise<void> {
    console.log(`[ResultAggregator] Aggregating results for execution ${executeId}`);

    const execution = await prisma.analysisExecute.findUnique({
      where: { id: executeId },
      include: {
        agentExecutions: {
            // we could include results if we want to process them in memory
        },
        results: true, 
      },
    });

    if (!execution) throw new Error("Execution not found");

    // 1. Deduplication (Group by file + line + type)
    // In a real system, we might merge similar findings from different agents.
    // Here we just count stats.

    const totalIssues = execution.results.length;
    const criticalIssues = execution.results.filter(r => r.severity === "CRITICAL").length;
    const highIssues = execution.results.filter(r => r.severity === "HIGH").length;

    // 2. Scoring logic (Simple weighted average)
    let score = 100;
    score -= (criticalIssues * 20);
    score -= (highIssues * 5);
    score = Math.max(0, score);

    // 3. Generate Report (Markdown)
    const report = this.generateMarkdownReport(execution, score, totalIssues, criticalIssues);

    // 4. Update Execution Record
    await prisma.analysisExecute.update({
      where: { id: executeId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        score: score,
        report: report,
      },
    });

    console.log(`[ResultAggregator] Aggregation complete. Score: ${score}`);
  }

  private generateMarkdownReport(execution: AnalysisExecute & { results: any[] }, score: number, total: number, critical: number): string {
    return `
# Analysis Report

**Execution ID**: ${execution.id}
**Date**: ${new Date().toISOString()}
**Overall Score**: ${score}/100

## Summary
- **Total Issues**: ${total}
- **Critical Issues**: ${critical}

## Detailed Findings

${execution.results.map(r => `
### [${r.category}] ${r.severity} - ${r.filePath || "General"}
**Message**: ${r.message}
**Suggestion**: ${r.suggestion}
`).join("\n")}
    `;
  }
}
