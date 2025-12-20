import { prisma } from "@/lib/db";
import { AgentTask, AnalysisExecute, AgentExecution } from "@prisma/client";

/**
 * DB-backed Task Queue Manager.
 * Handles adding tasks and claiming them for processing.
 */
export class TaskQueue {
  
  /**
   * Adds a task to the queue.
   * In our schema, creating an AgentTask with status 'QUEUED' IS enqueuing.
   */
  async enqueue(agentExecutionId: string, target: string = "ROOT"): Promise<AgentTask> {
    return prisma.agentTask.create({
      data: {
        agentExecutionId,
        status: "QUEUED",
        target,
      },
    });
  }

  /**
   * Claims the next available task.
   * Uses an atomic update to prevent race conditions (mostly).
   * For SQLite, strictly serial execution is common, but this pattern works for Postgres too.
   */
  async dequeue(): Promise<AgentTask & { agentExecution: AgentExecution & { execute: AnalysisExecute } } | null> {
    
    // 1. Find a candidate task
    const candidate = await prisma.agentTask.findFirst({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
      include: { 
          agentExecution: {
              include: { execute: true }
          } 
      }
    });

    if (!candidate) return null;

    // 2. Try to lock it
    // In a real high-concurrency DB we'd use 'SELECT FOR UPDATE' or optimistic locking.
    // Here we just update and check count.
    try {
      const lockedTask = await prisma.agentTask.update({
        where: { id: candidate.id, status: "QUEUED" }, // Ensure it's still queued
        data: { 
            status: "RUNNING",
            startedAt: new Date()
        },
        include: { 
            agentExecution: {
                include: { execute: true }
            } 
        }
      });
      return lockedTask;
    } catch (e) {
      // Race condition hit: someone else claimed it.
      return null;
    }
  }

  /**
   * Marks a task as completed.
   */
  async complete(taskId: string, resultSummary?: string): Promise<AgentTask> {
    return prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        resultSummary
      }
    });
  }

  /**
   * Marks a task as failed.
   */
  async fail(taskId: string, error: any): Promise<AgentTask> {
    return prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        resultSummary: error instanceof Error ? error.message : String(error)
      }
    });
  }
}

export const taskQueue = new TaskQueue();
