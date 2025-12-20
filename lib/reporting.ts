import prisma from '@/lib/db';
import { getAuditReport } from './audit';

export async function generateComplianceReport(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    // include: { miscStats: true } // Removed as per schema/lint feedback if relation missing
  });

  const audits = await getAuditReport(projectId, new Date(Date.now() - 30*24*60*60*1000), new Date());
  
  const report = `
# Compliance Report: ${project?.name}
Date: ${new Date().toISOString()}

## Project Summary
- Type: ${project?.type}
- Tier: ${project?.tier}

## Audit Summary (Last 30 Days)
Total Actions: ${audits.length}
  `;

  return report;
}
