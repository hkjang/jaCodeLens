import { prisma } from "@/lib/db";
import { AgentOrchestrator } from "@/lib/orchestrator";
import { StructureAnalysisAgent } from "@/lib/agents/structure-agent";
import { QualityAnalysisAgent } from "@/lib/agents/quality-agent";
import { SecurityAnalysisAgent } from "@/lib/agents/security-agent";
import { DependencyAnalysisAgent } from "@/lib/agents/dependency-agent";
import { StyleAnalysisAgent } from "@/lib/agents/style-agent";
import { TestAnalysisAgent } from "@/lib/agents/test-agent";
import { ResultAggregator } from "@/lib/aggregator";
import { AgentExecution } from "@prisma/client";

async function main() {
  console.log("Starting Integration Test...");

  // 1. Setup Mock Project
  const projectName = `Test Project ${Date.now()}`;
  const project = await prisma.project.create({
    data: {
      name: projectName,
      path: `/tmp/test-project-${Date.now()}`,
      type: "NEXTJS",
    },
  });
  console.log(`Created test project: ${project.id}`);

  // 2. Initialize Orchestrator and Start Analysis
  const orchestrator = new AgentOrchestrator();
  const agentNames = [
    "StructureAnalysisAgent",
    "QualityAnalysisAgent",
    "SecurityAnalysisAgent",
    "DependencyAnalysisAgent",
    "StyleAnalysisAgent",
    "TestAnalysisAgent"
  ];
  
  const execution = await orchestrator.startAnalysis(project.id, agentNames);
  console.log(`Started execution: ${execution.id}`);

  // 3. Simulate Worker Loop (Process Tasks)
  // In a real app, this would be a separate process.
  await orchestrator.dispatchPendingAgents(execution.id);

  // We need to access the helper methods for execution logic, but strictly speaking
  // the Orchestrator prepares the tasks. We need to manually invoke the Agent classes
  // to process those tasks.
  
  const agents = {
    "StructureAnalysisAgent": new StructureAnalysisAgent(),
    "QualityAnalysisAgent": new QualityAnalysisAgent(),
    "SecurityAnalysisAgent": new SecurityAnalysisAgent(),
    "DependencyAnalysisAgent": new DependencyAnalysisAgent(),
    "StyleAnalysisAgent": new StyleAnalysisAgent(),
    "TestAnalysisAgent": new TestAnalysisAgent(),
  };

  // Poll for tasks
  const agentExecutions = await prisma.agentExecution.findMany({
    where: { executeId: execution.id }
  });

  for (const agentExec of agentExecutions) {
    const tasks = await prisma.agentTask.findMany({
      where: { agentExecutionId: agentExec.id, status: "QUEUED" }
    });

    for (const task of tasks) {
      const agentInstance = agents[agentExec.agentName as keyof typeof agents];
      if (agentInstance) {
          try {
            await agentInstance.processTask(task);
            console.log(`Processed task for ${agentExec.agentName}`);
            // Update task completion in orchestrator (mostly status check)
            await orchestrator.completeTask(task.id, "COMPLETED");
          } catch (e: any) {
              console.error(`Error processing task for ${agentExec.agentName}: ${e.message}`);
              await orchestrator.completeTask(task.id, "FAILED", e.message);
          }
      }
    }
  }

  // 4. Aggregation
  const aggregator = new ResultAggregator();
  await aggregator.aggregateResults(execution.id);

  // 5. Verification
  const finalExecution = await prisma.analysisExecute.findUnique({
    where: { id: execution.id },
    include: { results: true }
  });

  console.log("-----------------------------------------");
  console.log("Final Status:", finalExecution?.status);
  console.log("Score:", finalExecution?.score);
  console.log("Result Count:", finalExecution?.results.length);
  console.log("Report Preview:", finalExecution?.report?.substring(0, 100) + "...");
  console.log("-----------------------------------------");

  if (finalExecution?.status === "COMPLETED" && finalExecution.results.length > 0) {
      console.log("TEST PASSED");
  } else {
      console.log("TEST FAILED");
      process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
