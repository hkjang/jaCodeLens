import { runSpecializedAnalysis } from '../lib/analysis/specialized';
import { logModelExecution, detectDrift } from '../lib/mlops';
import prisma from '../lib/db';

async function main() {
  console.log('Testing Specialized Analysis & MLOps...');

  // 1. Setup
  const project = await prisma.project.create({
    data: { name: 'Special Test', path: 'special/test', tier: 'ENTERPRISE', type: 'FINANCIAL' }
  });
  const exec = await prisma.analysisExecute.create({
    data: { projectId: project.id, status: 'RUNNING' }
  });

  // 2. Test Specialized Analysis
  console.log('Running Financial Analysis...');
  await runSpecializedAnalysis('FINANCIAL', project.id, exec.id);
  
  const results = await prisma.analysisResult.findMany({ where: { executeId: exec.id } });
  console.log('Results:', results);
  
  if (!results.find(r => r.message.includes('Financial System Analysis'))) {
    throw new Error('Financial analysis failed to create result');
  }

  // 3. Test MLOps Logging
  const agentExec = await prisma.agentExecution.create({
    data: { executeId: exec.id, agentName: 'TestAgent', status: 'COMPLETED' }
  });
  
  console.log('Logging MLOps execution...');
  await logModelExecution(agentExec.id, 'TestModel-v1', { latency: 100, inputTokens: 50, outputTokens: 50 });
  
  const modelExec = await prisma.modelExecution.findFirst({ where: { agentExecId: agentExec.id } });
  if (!modelExec) throw new Error('Model execution log not found');
  console.log('Model Execution:', modelExec);

  // 4. Test Drift Detection
  console.log('Detecting drift...');
  const drift = await detectDrift(project.id, exec.id);
  console.log('Drift Score:', drift);

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
