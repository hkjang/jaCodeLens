import { addComment, proposeDecision, updateDecisionStatus, getDecisions } from '../lib/collaboration';
import { generateRemediationRoadmap } from '../lib/roadmap';
import prisma from '../lib/db';

async function main() {
  console.log('Testing Phase 5: Collaboration & Automation...');

  // 1. Setup Data
  const project = await prisma.project.create({
    data: { name: 'Collab Test', path: 'collab/test', type: 'NEXTJS' }
  });

  const exec = await prisma.analysisExecute.create({
    data: { projectId: project.id, status: 'COMPLETED' }
  });

  const result = await prisma.analysisResult.create({
    data: {
      executeId: exec.id,
      category: 'SECURITY',
      severity: 'HIGH',
      message: 'SQL Injection'
    }
  });

  // 2. Test Collaboration (Comments)
  console.log('Testing Comments...');
  await addComment(result.id, 'dev-1', 'Investigating this.');
  
  // 3. Test Decisions
  console.log('Testing Decisions...');
  const decision = await proposeDecision(project.id, 'Use ORM', 'To prevent SQLi', 'arch-1');
  await updateDecisionStatus(decision.id, 'ACCEPTED', 'cto');
  
  const decisions = await getDecisions(project.id);
  console.log('Decisions:', decisions);
  if (decisions.length === 0 || decisions[0].status !== 'ACCEPTED') {
    throw new Error('Decision workflow failed');
  }

  // 4. Test Roadmap
  console.log('Testing Roadmap...');
  // Add some tech debt first
  await prisma.techDebt.create({
    data: {
      projectId: project.id,
      category: 'SECURITY',
      issueCount: 1,
      remediationCostHours: 5,
      riskFactor: 0.9
    }
  });
  
  const roadmap = await generateRemediationRoadmap(project.id, 1000); // $1000 budget
  console.log('Roadmap:', roadmap);
  
  if (roadmap.roadmapItems.length === 0) throw new Error('Roadmap generation failed');

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
