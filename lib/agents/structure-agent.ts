import { BaseAgent } from "./base-agent";
import { AgentTask, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export class StructureAnalysisAgent extends BaseAgent {
  name = "StructureAnalysisAgent";
  description = "Analyzes the directory structure, module organization, and architectural layers.";

  protected async execute(task: AgentTask): Promise<any> {
    const project = await prisma.project.findFirst({
      where: { analyses: { some: { agentExecutions: { some: { id: task.agentExecutionId } } } } },
    });

    if (!project) throw new Error("Project not found");

    // Mocking structure analysis - in real life this would scan the FS
    const structure = {
      root: project.path,
      modules: [
        { name: "lib", type: "mixed", depth: 1 },
        { name: "components", type: "ui", depth: 1 },
        { name: "pages", type: "routing", depth: 1 },
      ],
      issues: [
        { type: "LAYER_VIOLATION", description: "UI component importing from database directly", severity: "HIGH" }
      ]
    };

    // Save result to Database
    const agentExecution = await prisma.agentExecution.findUnique({ where: { id: task.agentExecutionId } });
    if(agentExecution) {
        await prisma.analysisResult.create({
            data: {
                executeId: agentExecution.executeId,
                category: "ARCHITECTURE",
                severity: "HIGH",
                message: "UI component importing from database directly",
                suggestion: "Move DB logic to 'lib' or 'services'",
                confidenceScore: 0.95,
            }
        });
    }

    return structure;
  }
}
