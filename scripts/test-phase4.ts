import { generateComplianceReport } from '../lib/reporting';
import { logAudit, getAuditReport } from '../lib/audit';
import prisma from '../lib/db';

async function main() {
  console.log('Testing Phase 4: Operations & Audit...');

  // 1. Setup Data
  const project = await prisma.project.create({
    data: { name: 'Audit Test', path: 'ops/audit', type: 'LEGACY' }
  });

  // 2. Test Audit Logging
  console.log('Logging audit events...');
  await logAudit('ANALYSIS_START', 'PROJECT', project.id, 'admin');
  await logAudit('EXPORTED', 'PROJECT', project.id, 'admin', { format: 'PDF' });

  // 3. Test Reporting
  console.log('Generating report...');
  const report = await generateComplianceReport(project.id);
  console.log('Report Output:\n', report);

  if (!report.includes('Compliance Report')) throw new Error('Report generation failed');
  if (!report.includes('Audit Summary')) throw new Error('Report missing audit summary');

  // 4. Verify Audit Retrieval
  const audits = await getAuditReport(project.id, new Date(Date.now() - 10000), new Date());
  console.log(`Found ${audits.length} audit logs`);
  if (audits.length < 2) throw new Error('Audit logs not retrieved correctly');

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
