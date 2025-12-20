import { prisma } from "@/lib/db";
import { AgentExecution, AgentTask, AnalysisExecute, Project } from "@prisma/client";

/**
 * Orchestrates the execution of multiple analysis agents in parallel.
 * Handles task creation, dispatching, and monitoring.
 */
export class AgentOrchestrator {
  
  /**
   * Starts a new parallel analysis execution.
   */
  async startAnalysis(projectId: String, agentNames: string[]): Promise<AnalysisExecute> {
    const project = await prisma.project.findUnique({
      where: { id: projectId as string },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Create the main execution record
    const execution = await prisma.analysisExecute.create({
      data: {
        projectId: projectId as string,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    // Create granular agent execution records
    for (const agentName of agentNames) {
      await prisma.agentExecution.create({
        data: {
          executeId: execution.id,
          agentName: agentName,
          status: "PENDING",
        },
      });
    }

    // Trigger the initial dispatch (in a real system this might be event-driven)
    // For now, we assume a separate worker or the caller initiates the next step.
    console.log(`Analysis started for project ${project.name} (Execution ID: ${execution.id})`);
    
    return execution;
  }

  /**
   * Dispatches tasks for valid pending agents.
   * This would typically be called by a worker loop.
   */
  async dispatchPendingAgents(executionId: string) {
    const pendingAgents = await prisma.agentExecution.findMany({
      where: {
        executeId: executionId,
        status: "PENDING",
      },
    });

    for (const agent of pendingAgents) {
      await this.initializeAgentTasks(agent);
    }
  }

  /**
   * Initializes tasks for a specific agent.
   * This is where we look at the file system or project structure to create granular tasks.
   */
  private async initializeAgentTasks(agent: AgentExecution) {
    // mark agent as running
    await prisma.agentExecution.update({
      where: { id: agent.id },
      data: { status: "RUNNING" },
    });

    // Strategy: For now, we create one big task per agent for the whole project.
    // In the future, this is where "File Sharding" would happen.
    
    await prisma.agentTask.create({
      data: {
        agentExecutionId: agent.id,
        status: "QUEUED",
        target: "ROOT", // Indicates the entire project
      },
    });
    
    console.log(`Initialized tasks for agent ${agent.agentName}`);
  }

  /**
   * Updates the status of a task and checks if the parent agent is complete.
   */
  async completeTask(taskId: string, status: "COMPLETED" | "FAILED", summary?: string) {
    const task = await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: status,
        completedAt: new Date(),
        resultSummary: summary,
      },
      include: { agentExecution: true },
    });

    // Check if all tasks for this agent are done
    const remainingTasks = await prisma.agentTask.count({
      where: {
        agentExecutionId: task.agentExecutionId,
        status: { in: ["QUEUED", "RUNNING"] },
      },
    });

    if (remainingTasks === 0) {
      // Determine overall status
      const failedTasks = await prisma.agentTask.count({
        where: {
          agentExecutionId: task.agentExecutionId,
          status: "FAILED",
        },
      });

      await prisma.agentExecution.update({
        where: { id: task.agentExecutionId },
        data: {
          status: failedTasks > 0 ? "FAILED" : "COMPLETED",
          completedAt: new Date(),
        },
      });
    }
  }
}
