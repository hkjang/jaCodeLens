import prisma from './db';
import { ApprovalWorkflow, AnalysisExecute } from '@prisma/client';

export type WorkflowStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type WorkflowStep = 'SECURITY_REVIEW' | 'ARCH_REVIEW' | 'OPS_REVIEW';

/**
 * Creates a required approval step for an analysis execution.
 */
export async function createApprovalStep(
  executeId: string, 
  stepName: WorkflowStep, 
  description?: string
): Promise<ApprovalWorkflow> {
  return await prisma.approvalWorkflow.create({
    data: {
      executeId,
      stepName,
      status: 'PENDING',
      comment: description
    }
  });
}

/**
 * Approves a workflow step.
 */
export async function approveStep(
  workflowId: string, 
  approverId: string, 
  comment?: string
): Promise<ApprovalWorkflow> {
  return await prisma.approvalWorkflow.update({
    where: { id: workflowId },
    data: {
      status: 'APPROVED',
      approverId,
      comment,
      updatedAt: new Date()
    }
  });
}

/**
 * Rejects a workflow step.
 */
export async function rejectStep(
  workflowId: string, 
  approverId: string, 
  comment?: string
): Promise<ApprovalWorkflow> {
  return await prisma.approvalWorkflow.update({
    where: { id: workflowId },
    data: {
      status: 'REJECTED',
      approverId,
      comment,
      updatedAt: new Date()
    }
  });
}

/**
 * Checks if an analysis execution is blocked by pending approvals.
 */
export async function isExecutionBlocked(executeId: string): Promise<boolean> {
  const pendingSteps = await prisma.approvalWorkflow.count({
    where: {
      executeId,
      status: { in: ['PENDING', 'REJECTED'] }
    }
  });
  return pendingSteps > 0;
}

/**
 * Auto-triggers approval steps based on analysis results severity.
 * e.g., if Critical Security Issue found -> Require Security Review.
 */
export async function triggerApprovalsIfNeeded(executeId: string): Promise<void> {
  const execute = await prisma.analysisExecute.findUnique({
    where: { id: executeId },
    include: { results: true }
  });

  if (!execute) return;

  const hasCriticalSecurity = execute.results.some(r => r.category === 'SECURITY' && r.severity === 'CRITICAL');
  const hasCriticalArch = execute.results.some(r => r.category === 'ARCHITECTURE' && r.severity === 'CRITICAL');

  if (hasCriticalSecurity) {
    await createApprovalStep(executeId, 'SECURITY_REVIEW', 'Critical security vulnerabilities detected.');
  }

  if (hasCriticalArch) {
    await createApprovalStep(executeId, 'ARCH_REVIEW', 'Critical architectural issues detected.');
  }
}
