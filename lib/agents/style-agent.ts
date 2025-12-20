import { BaseAgent } from "./base-agent";
import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";

export class StyleAnalysisAgent extends BaseAgent {
  name = "StyleAnalysisAgent";
  description = "Analyzes coding style, naming conventions, and formatting consistency.";

  protected async execute(task: AgentTask): Promise<any> {
    // Mock style check
    const issues = [
        { file: "lib/db.ts", line: 10, message: "Variable name 'x' is too short", severity: "INFO" }
    ];

    const agentExecution = await prisma.agentExecution.findUnique({ where: { id: task.agentExecutionId } });

    if (agentExecution) {
        for (const issue of issues) {
             await prisma.analysisResult.create({
                data: {
                    executeId: agentExecution.executeId,
                    category: "QUALITY", 
                    severity: issue.severity,
                    filePath: issue.file,
                    lineNumber: issue.line,
                    message: issue.message,
                    suggestion: "Rename to something descriptive",
                    confidenceScore: 0.8,
                }
            });
        }
    }

    return issues;
  }
}
