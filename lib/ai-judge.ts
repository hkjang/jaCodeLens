import { prisma } from "@/lib/db";
import { aiModelService } from "@/lib/ai-model-service";

/**
 * ComprehensiveAIJudge - Final Synthesis Layer
 * 
 * Takes aggregated results from all agents and produces:
 * 1. A unified quality score
 * 2. Prioritized action items
 * 3. Risk assessment
 * 4. Executive summary
 */
export class ComprehensiveAIJudge {
  private aiAvailable: boolean = false;

  constructor() {
    // AI availability will be checked at runtime
    this.checkAIAvailability();
  }

  private async checkAIAvailability(): Promise<void> {
    try {
      const model = await aiModelService.getDefaultModel();
      this.aiAvailable = model !== null;
    } catch {
      this.aiAvailable = false;
    }
  }

  /**
   * Synthesizes all analysis results into a final judgment.
   */
  async synthesize(executionId: string): Promise<JudgmentResult> {
    console.log(`[AIJudge] Synthesizing results for execution ${executionId}`);

    // 1. Fetch all results
    const execution = await prisma.analysisExecute.findUnique({
      where: { id: executionId },
      include: { results: true },
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const results = execution.results;

    // 2. Categorize and count
    const categories = this.categorizeResults(results);

    // 3. Calculate scores per category
    const scores = this.calculateCategoryScores(categories);

    // 4. Generate AI summary if available, otherwise use heuristics
    let summary: string;
    let recommendations: string[];

    // Check if AI model is available
    const defaultModel = await aiModelService.getDefaultModel();
    
    if (defaultModel) {
      try {
        const aiResponse = await this.generateAISummary(results, scores);
        summary = aiResponse.summary;
        recommendations = aiResponse.recommendations;
      } catch (error) {
        console.error("[AIJudge] AI summary failed, using heuristics:", error);
        const heuristicResponse = this.generateHeuristicSummary(categories, scores);
        summary = heuristicResponse.summary;
        recommendations = heuristicResponse.recommendations;
      }
    } else {
      const heuristicResponse = this.generateHeuristicSummary(categories, scores);
      summary = heuristicResponse.summary;
      recommendations = heuristicResponse.recommendations;
    }

    // 5. Compute final score
    const overallScore = this.computeOverallScore(scores);

    // 6. Build final judgment
    const judgment: JudgmentResult = {
      executionId,
      overallScore,
      categoryScores: scores,
      summary,
      recommendations,
      riskLevel: this.determineRiskLevel(overallScore, categories),
      generatedAt: new Date(),
    };

    // 7. Persist judgment (update execution)
    await prisma.analysisExecute.update({
      where: { id: executionId },
      data: {
        score: overallScore,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    console.log(`[AIJudge] Synthesis complete. Score: ${overallScore}`);
    return judgment;
  }

  private categorizeResults(results: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {
      SECURITY: [],
      QUALITY: [],
      ARCHITECTURE: [],
      PERFORMANCE: [],
      OTHER: [],
    };

    for (const r of results) {
      const cat = r.category || "OTHER";
      if (categories[cat]) {
        categories[cat].push(r);
      } else {
        categories.OTHER.push(r);
      }
    }

    return categories;
  }

  private calculateCategoryScores(categories: Record<string, any[]>): Record<string, number> {
    const scores: Record<string, number> = {};
    const severityWeights = { CRITICAL: 25, HIGH: 15, MEDIUM: 5, LOW: 2, INFO: 0 };

    for (const [cat, items] of Object.entries(categories)) {
      let penalty = 0;
      for (const item of items) {
        penalty += severityWeights[item.severity as keyof typeof severityWeights] || 0;
      }
      // Score starts at 100 and decreases
      scores[cat] = Math.max(0, 100 - penalty);
    }

    return scores;
  }

  private computeOverallScore(categoryScores: Record<string, number>): number {
    const weights: Record<string, number> = {
      SECURITY: 0.35,
      QUALITY: 0.25,
      ARCHITECTURE: 0.20,
      PERFORMANCE: 0.15,
      OTHER: 0.05,
    };

    let weighted = 0;
    let totalWeight = 0;

    for (const [cat, score] of Object.entries(categoryScores)) {
      const w = weights[cat] || 0.05;
      weighted += score * w;
      totalWeight += w;
    }

    return Math.round(weighted / totalWeight);
  }

  private determineRiskLevel(
    score: number,
    categories: Record<string, any[]>
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    const criticalCount = categories.SECURITY?.filter((r) => r.severity === "CRITICAL").length || 0;

    if (criticalCount > 0) return "CRITICAL";
    if (score < 40) return "HIGH";
    if (score < 70) return "MEDIUM";
    return "LOW";
  }

  private async generateAISummary(
    results: any[],
    scores: Record<string, number>
  ): Promise<{ summary: string; recommendations: string[] }> {
    try {
      // 프롬프트 레지스트리에서 프롬프트 조회 및 렌더링
      const { promptRegistry } = await import('@/lib/prompt-registry');
      const { system, user } = await promptRegistry.render('ai-judge.synthesis', {
        results: JSON.stringify(results.slice(0, 20), null, 2),
        scores: JSON.stringify(scores, null, 2)
      });

      const response = await aiModelService.chatCompletion({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      });

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If not valid JSON, use heuristics
      console.warn("[AIJudge] Could not parse AI response as JSON");
      return this.generateHeuristicSummary({ SECURITY: results }, scores);
    } catch (e) {
      console.error("[AIJudge] AI call failed, falling back to heuristics:", e);
      return this.generateHeuristicSummary({ SECURITY: results }, scores);
    }
  }

  private generateHeuristicSummary(
    categories: Record<string, any[]>,
    scores: Record<string, number>
  ): { summary: string; recommendations: string[] } {
    const securityIssues = categories.SECURITY?.length || 0;
    const qualityIssues = categories.QUALITY?.length || 0;
    const lowestCategory = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];

    const summary = `Analysis detected ${securityIssues} security issues and ${qualityIssues} quality concerns. The weakest area is ${lowestCategory[0]} with a score of ${lowestCategory[1]}/100.`;

    const recommendations: string[] = [];

    if (securityIssues > 0) {
      recommendations.push("Address all CRITICAL and HIGH severity security vulnerabilities immediately.");
    }
    if (qualityIssues > 5) {
      recommendations.push("Refactor complex functions to improve maintainability.");
    }
    if (scores.ARCHITECTURE < 70) {
      recommendations.push("Review and document the overall system architecture.");
    }
    recommendations.push("Set up automated CI checks to prevent regression.");
    recommendations.push("Schedule regular code review sessions for the team.");

    return { summary, recommendations: recommendations.slice(0, 5) };
  }
}

export interface JudgmentResult {
  executionId: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  summary: string;
  recommendations: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  generatedAt: Date;
}

export const comprehensiveAIJudge = new ComprehensiveAIJudge();
