import prisma from '@/lib/db';

/**
 * Adds a comment to an analysis result.
 */
export async function addComment(resultId: string, authorId: string, content: string) {
  return await prisma.comment.create({
    data: { resultId, authorId, content }
  });
}

/**
 * Proposes a new architectural decision record (ADR).
 */
export async function proposeDecision(
  projectId: string, 
  title: string, 
  description: string, 
  authorId: string
) {
  return await prisma.decisionRecord.create({
    data: {
      projectId,
      title,
      description,
      status: 'PROPOSED',
      decidedBy: authorId // Initially the author proposes
    }
  });
}

/**
 * Accepts or Rejects a Decision Record.
 */
export async function updateDecisionStatus(
  decisionId: string, 
  status: 'ACCEPTED' | 'REJECTED', 
  deciderId: string
) {
  return await prisma.decisionRecord.update({
    where: { id: decisionId },
    data: {
      status,
      decidedBy: deciderId,
      decidedAt: new Date()
    }
  });
}

/**
 * Fetch all decisions for a project.
 */
export async function getDecisions(projectId: string) {
  return await prisma.decisionRecord.findMany({
    where: { projectId },
    orderBy: { decidedAt: 'desc' }
  });
}
