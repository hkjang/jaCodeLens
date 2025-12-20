import { aggregateTechDebt } from '../lib/debt';
import prisma from '../lib/db';

async function main() {
  console.log('Testing Tech Debt Calculation...');

  // 1. Create Mock Project & Analysis
  const project = await prisma.project.create({
    data: {
      name: `Debt Test ${Date.now()}`,
      path: `debt/test/${Date.now()}`,
      tier: 'ENTERPRISE'
    }
  });

  const exec = await prisma.analysisExecute.create({
    data: {
      projectId: project.id,
      status: 'COMPLETED',
      completedAt: new Date(),
    }
  });

  // 2. Create Mock Results
  await prisma.analysisResult.createMany({
    data: [
      {
        executeId: exec.id,
        category: 'SECURITY',
        severity: 'CRITICAL',
        message: 'SQL Injection Vulnerability'
      },
      {
        executeId: exec.id,
        category: 'ARCHITECTURE',
        severity: 'HIGH',
        message: 'Circular Dependency'
      },
      {
        executeId: exec.id,
        category: 'QUALITY',
        severity: 'MEDIUM',
        message: 'Complex Function'
      }
    ]
  });

  // 3. Run Calculation
  console.log('Aggregating debt...');
  const debtMap = await aggregateTechDebt(project.id);
  console.log('Debt Map:', debtMap);

  // 4. Verify DB Records
  const debts = await prisma.techDebt.findMany({
    where: { projectId: project.id }
  });
  console.log('Debt Records:', debts);

  // Checks
  const sec = debts.find(d => d.category === 'SECURITY');
  if (sec && sec.issueCount === 1) {
    console.log('Security debt recorded correctly.');
  } else {
    throw new Error('Security debt missing or incorrect');
  }

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
