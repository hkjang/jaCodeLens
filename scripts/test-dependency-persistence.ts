
import prisma from '../lib/db'
import { collectProject } from '../lib/collector/project-collector'
import { analysisOrchestrator } from '../lib/analyzer/orchestrator'
import path from 'path'

async function testPersistence() {
  console.log('--- Testing Dependency Persistence ---')

  // 1. Setup Project
  const projectPath = process.cwd()
  const projectName = 'JaCodeLens-Self-Test'
  
  let project = await prisma.project.findUnique({ where: { path: projectPath } })
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: projectName,
        path: projectPath,
        tier: 'ENTERPRISE'
      }
    })
  }

  console.log(`Analyzing project: ${project.name} (${project.path})`)

  // 2. Collect Context
  // Limited scope to avoid huge analysis
  // We'll filter to just 'lib/analyzer' to be fast
  const context = await collectProject(projectPath)
  // Manually filter files to speed up
  context.files = context.files.filter(f => f.path.includes('lib/analyzer') || f.path.includes('prisma'))
  console.log(`Collected ${context.files.length} files for analysis context.`)

  // 3. Run Analysis
  console.log('Starting Analysis Orchestrator...')
  const executeId = await analysisOrchestrator.analyzeProject(project.id, context)
  console.log(`Analysis complete. Execute ID: ${executeId}`)

  // 4. Verify Dependencies
  const depCount = await prisma.dependency.count({
    where: { executeId }
  })

  console.log(`Dependencies found in DB: ${depCount}`)

  if (depCount > 0) {
    console.log('✅ Dependency Persistence Verified!')
    // Show some examples
    const examples = await prisma.dependency.findMany({
        where: { executeId },
        take: 3
    })
    console.log('Examples:', examples)
  } else {
    console.error('❌ No dependencies saved. Check ArchitectureAgent or Orchestrator.')
  }
}

if (require.main === module) {
  testPersistence()
    .catch(err => console.error(err))
    .finally(async () => {
        await prisma.$disconnect()
    })
}
