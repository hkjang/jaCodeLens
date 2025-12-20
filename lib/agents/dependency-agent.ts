import { BaseAgent } from "./base-agent";
import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";

export class DependencyAnalysisAgent extends BaseAgent {
  name = "DependencyAnalysisAgent";
  description = "Analyzes external libraries, versions, and potential license issues.";

  protected async execute(task: AgentTask): Promise<any> {
    // Mock dependency check
    const dependencies = [
      { name: "react", version: "18.2.0", license: "MIT" },
      { name: "next", version: "14.1.0", license: "MIT" },
      { name: "evil-lib", version: "6.6.6", license: "GPL-3.0" }, // Risky for proprietary software
    ];

    const agentExecution = await prisma.agentExecution.findUnique({ where: { id: task.agentExecutionId } });

    if (agentExecution) {
        // Log risky dependency
        const risky = dependencies.find(d => d.license === "GPL-3.0");
        if (risky) {
             await prisma.analysisResult.create({
                data: {
                    executeId: agentExecution.executeId,
                    category: "SECURITY", // or LEGAL/COMPLIANCE if we had it
                    severity: "HIGH",
                    message: `Restrictive license found: ${risky.name} (${risky.license})`,
                    suggestion: "Replace with permissive alternative",
                    confidenceScore: 1.0,
                }
            });
        }
    }

    return dependencies;
  }
}
