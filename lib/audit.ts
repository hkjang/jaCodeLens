import prisma from '@/lib/db';
// Auth integration pending - session tracking will be added later

export type AuditAction = 'ANALYSIS_START' | 'RESULT_MODIFIED' | 'APPROVED' | 'EXPORTED' | 'LOGIN' | 'LOGOUT';
export type TargetType = 'PROJECT' | 'ANALYSIS' | 'RESULT' | 'USER';

/**
 * Logs a system or user action.
 */
export async function logAudit(
  action: AuditAction, 
  targetType: TargetType, 
  targetId: string, 
  actorId: string = 'SYSTEM',
  details?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId,
        actorId,
        details: details ? JSON.stringify(details) : undefined,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Audit logging failure should not crash the main threat, but should be alerted in a real system.
  }
}

/**
 * Generates an audit report for a specific time range.
 */
export async function getAuditReport(projectId: string, startDate: Date, endDate: Date) {
  // Find all analyses for the project
  const executions = await prisma.analysisExecute.findMany({
    where: { projectId },
    select: { id: true }
  });
  
  const ids = executions.map(e => e.id);
  
  // Find logs related to project, analyses, or results
  // This is a simplified query. In reality we'd need better linking or a recursive query.
  // For now, we fetch logs where targetType is PROJECT and targetId is projectId
  // OR targetType is ANALYSIS and targetId is in execution list.
  
  const logs = await prisma.auditLog.findMany({
    where: {
      timestamp: { gte: startDate, lte: endDate },
      OR: [
        { targetType: 'PROJECT', targetId: projectId },
        { targetType: 'ANALYSIS', targetId: { in: ids } }
      ]
    },
    orderBy: { timestamp: 'desc' }
  });
  
  return logs;
}
