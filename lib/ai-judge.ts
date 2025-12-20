import { prisma } from "@/lib/db";
import OpenAI from "openai";

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
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
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

    if (this.openai) {
      const aiResponse = await this.generateAISummary(results, scores);
      summary = aiResponse.summary;
      recommendations = aiResponse.recommendations;
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
    const prompt = `
You are a senior code review expert. Analyze the following code analysis results and provide:
1. A 2-3 sentence executive summary
2. Top 5 prioritized action items

Analysis Results:
${JSON.stringify(results.slice(0, 20), null, 2)}

Category Scores:
${JSON.stringify(scores, null, 2)}

Respond in JSON format:
{
  "summary": "...",
  "recommendations": ["item1", "item2", ...]
}
`;

    try {
      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content || "{}";
      return JSON.parse(content);
    } catch (e) {
      console.error("[AIJudge] OpenAI call failed, falling back to heuristics:", e);
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
