import { BaseAgent } from "./base-agent";
import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";

export class QualityAnalysisAgent extends BaseAgent {
  name = "QualityAnalysisAgent";
  description = "Analyzes code complexity (Cyclomatic), duplication, and maintainability index.";

  protected async execute(task: AgentTask): Promise<any> {
    // In a real implementation, we would spawn a tool like 'eslint' or 'sonarqube-scanner' here.
    // For now, we simulate finding complex functions.
    
    const results = [
      { file: "lib/utils.ts", function: "complexAlgo", complexity: 15, severity: "MEDIUM" },
      { file: "app/page.tsx", function: "Home", complexity: 5, severity: "LOW" },
    ];

    const agentExecution = await prisma.agentExecution.findUnique({ where: { id: task.agentExecutionId } });

    if (agentExecution) {
      for (const res of results) {
        if (res.severity === "MEDIUM" || res.severity === "HIGH") {
           await prisma.analysisResult.create({
            data: {
              executeId: agentExecution.executeId,
              category: "QUALITY",
              severity: res.severity,
              filePath: res.file,
              message: `High cyclomatic complexity in function ${res.function} (${res.complexity})`,
              suggestion: "Refactor into smaller functions",
              confidenceScore: 0.9,
            }
          });
        }
      }
    }

    return results;
  }
}
