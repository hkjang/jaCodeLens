import prisma from '../lib/db';

async function quickSeed() {
  console.log('Quick seeding...');
  
  // Create project
  const project = await prisma.project.create({
    data: {
      name: 'JacodeLens',
      path: 'd:/project/jacodelens',
      description: '멀티 에이전트 기반 코드 분석 플랫폼',
      type: 'NEXTJS',
      tier: 'ENTERPRISE'
    }
  });
  console.log('Created project:', project.id);

  // Create execution
  const execution = await prisma.analysisExecute.create({
    data: {
      projectId: project.id,
      status: 'COMPLETED',
      score: 92,
      startedAt: new Date(Date.now() - 60000),
      completedAt: new Date(),
      environment: 'PRODUCTION'
    }
  });
  console.log('Created execution:', execution.id);

  // Create minimal analysis results - only LOW/INFO severity
  const results = [
    { mainCat: 'QUALITY', subCat: 'NAMING', ruleId: 'QUA003', severity: 'LOW', msg: '일부 변수명 개선 권장', file: 'src/utils.ts', line: 15 },
    { mainCat: 'STANDARDS', subCat: 'FORMAT', ruleId: 'STD001', severity: 'INFO', msg: '포맷팅 일관성 체크', file: 'src/index.ts', line: 1 },
  ];

  for (const r of results) {
    await prisma.normalizedAnalysisResult.create({
      data: {
        executeId: execution.id,
        filePath: r.file,
        lineStart: r.line,
        lineEnd: r.line + 5,
        language: 'typescript',
        mainCategory: r.mainCat,
        subCategory: r.subCat,
        ruleId: r.ruleId,
        severity: r.severity,
        message: r.msg,
        deterministic: true
      }
    });
  }
  console.log('Created', results.length, 'analysis results');
  console.log('Done!');
}

quickSeed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
