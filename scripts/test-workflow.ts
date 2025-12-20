import { createApprovalStep, approveStep, rejectStep, isExecutionBlocked, triggerApprovalsIfNeeded } from '../lib/workflow';
import prisma from '../lib/db';

async function main() {
  console.log('Testing Workflow Logic...');

  // 1. Setup Data
  const project = await prisma.project.create({
    data: { name: 'Workflow Test', path: 'wf/test', tier: 'ENTERPRISE' }
  });

  const exec = await prisma.analysisExecute.create({
    data: { projectId: project.id, status: 'RUNNING' }
  });

  // 2. Test Triggering (Simulate Critical Issue)
  await prisma.analysisResult.create({
    data: {
      executeId: exec.id,
      category: 'SECURITY',
      severity: 'CRITICAL',
      message: 'Critical Bug'
    }
  });

  console.log('Triggering approvals...');
  await triggerApprovalsIfNeeded(exec.id);

  const blocked = await isExecutionBlocked(exec.id);
  console.log('Is Execution Blocked?', blocked);
  if (!blocked) throw new Error('Execution should be blocked by critical issue');

  // 3. Approve Step
  const step = await prisma.approvalWorkflow.findFirst({ where: { executeId: exec.id } });
  if (!step) throw new Error('No approval step created');

  console.log('Approving step...');
  await approveStep(step.id, 'admin-user', 'LGTM');

  const blockedAfter = await isExecutionBlocked(exec.id);
  console.log('Is Execution Blocked After Approval?', blockedAfter);
  if (blockedAfter) throw new Error('Execution should NOT be blocked after approval');

  // Cleanup
  await prisma.project.delete({ where: { id: project.id } });
  console.log('Cleanup Done');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
