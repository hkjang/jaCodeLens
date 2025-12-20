import { BaseAgent } from "./base-agent";
import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";

export class TestAnalysisAgent extends BaseAgent {
  name = "TestAnalysisAgent";
  description = "Analyzes test coverage, test gaps, and flakiness.";

  protected async execute(task: AgentTask): Promise<any> {
    // Mock test coverage
    const coverage = {
      global: 65,
      files: [
        { file: "lib/utils.ts", coverage: 80 },
        { file: "lib/orchestrator.ts", coverage: 0 },
      ]
    };

    const agentExecution = await prisma.agentExecution.findUnique({ where: { id: task.agentExecutionId } });

    if (agentExecution) {
        if (coverage.global < 70) {
             await prisma.analysisResult.create({
                data: {
                    executeId: agentExecution.executeId,
                    category: "QUALITY", 
                    severity: "MEDIUM",
                    message: `Global test coverage is low (${coverage.global}%)`,
                    suggestion: "Write more tests for critical paths",
                    confidenceScore: 1.0,
                }
            });
        }
    }

    return coverage;
  }
}
