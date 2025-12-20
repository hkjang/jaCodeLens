import { calculateInputHash, createSnapshot } from '../lib/reliability';
import prisma from '../lib/db';
import path from 'path';

async function main() {
  console.log('Testing Reliability Features...');

  // 1. Test Input Hashing
  const projectPath = process.cwd();
  console.log(`Calculating hash for: ${projectPath}`);
  const hash = await calculateInputHash(projectPath);
  console.log('Input Hash:', hash);

  if (!hash || hash === 'HASH_CALCULATION_FAILED') {
    throw new Error('Hash calculation failed');
  }

  // 2. Test Snapshot Creation
  // Create a dummy project and analysis execution first
  const project = await prisma.project.create({
    data: {
      name: 'Test Project ' + Date.now(),
      path: 'test/path/' + Date.now(), // Fake path
      tier: 'ENTERPRISE',
      type: 'TEST'
    }
  });
  
  const execution = await prisma.analysisExecute.create({
    data: {
      projectId: project.id,
      status: 'RUNNING',
      inputHash: hash,
      environment: 'DEV'
    }
  });

  console.log('Created test project and execution:', project.id, execution.id);

  console.log('Creating snapshot...');
  const snapshotPath = await createSnapshot(project.id, execution.id);
  console.log('Snapshot created at:', snapshotPath);
  
  // Verify snapshot exists
  const fs = require('fs');
  if (fs.existsSync(snapshotPath)) {
    console.log('Snapshot file exists verified.');
  } else {
    throw new Error('Snapshot file not found!');
  }

  // Update execution with snapshot path
  await prisma.analysisExecute.update({
    where: { id: execution.id },
    data: { snapshotPath }
  });
  console.log('Execution updated with snapshot path.');

  // Clean up
  await prisma.project.delete({ where: { id: project.id } });
  console.log('Cleanup complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
