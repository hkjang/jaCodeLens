import prisma from '../lib/db';

// Realistic analysis results for pipeline
const pipelineResults = {
  typescript: [
    { mainCat: 'SECURITY', subCat: 'INJECTION', ruleId: 'SEC001', severity: 'CRITICAL', msg: 'SQL Injection 취약점: 사용자 입력이 직접 쿼리에 삽입됨', suggestion: 'prisma 또는 parameterized query를 사용하세요', file: 'src/api/users.ts', line: 45 },
    { mainCat: 'SECURITY', subCat: 'XSS', ruleId: 'SEC002', severity: 'HIGH', msg: 'XSS 취약점: dangerouslySetInnerHTML에 sanitize되지 않은 데이터 전달', suggestion: 'DOMPurify.sanitize()로 먼저 정제하세요', file: 'src/components/ArticleView.tsx', line: 67 },
    { mainCat: 'SECURITY', subCat: 'SECRETS', ruleId: 'SEC003', severity: 'CRITICAL', msg: 'API 키가 코드에 하드코딩됨', suggestion: '환경 변수로 이동하고 .env.example 업데이트', file: 'src/config/api.ts', line: 12 },
    { mainCat: 'SECURITY', subCat: 'CRYPTO', ruleId: 'SEC004', severity: 'HIGH', msg: 'MD5 해시 알고리즘은 보안에 취약함', suggestion: 'bcrypt 또는 argon2로 교체하세요', file: 'src/auth/password.ts', line: 23 },
    { mainCat: 'QUALITY', subCat: 'COMPLEXITY', ruleId: 'QUA001', severity: 'HIGH', msg: 'Cyclomatic complexity가 25로 임계값(15) 초과', suggestion: '함수를 더 작은 단위로 분리하세요', file: 'src/utils/parser.ts', line: 89 },
    { mainCat: 'QUALITY', subCat: 'DUPLICATION', ruleId: 'QUA002', severity: 'MEDIUM', msg: '15줄 이상의 중복 코드 블록 발견', suggestion: '공통 함수로 추출하세요', file: 'src/services/order.ts', line: 120 },
    { mainCat: 'QUALITY', subCat: 'NAMING', ruleId: 'QUA003', severity: 'LOW', msg: '함수명이 camelCase 컨벤션을 따르지 않음', suggestion: 'process_user_data → processUserData', file: 'src/utils/helpers.ts', line: 15 },
    { mainCat: 'STRUCTURE', subCat: 'CIRCULAR', ruleId: 'STR001', severity: 'HIGH', msg: '순환 의존성 감지: auth → user → auth', suggestion: '의존성 방향을 재설계하거나 중간 레이어 도입', file: 'src/modules/auth/index.ts', line: 1 },
    { mainCat: 'STRUCTURE', subCat: 'LAYER', ruleId: 'STR002', severity: 'MEDIUM', msg: 'UI 레이어에서 직접 DB 접근', suggestion: 'Service 레이어를 통해 접근하세요', file: 'src/components/UserList.tsx', line: 34 },
    { mainCat: 'STRUCTURE', subCat: 'COUPLING', ruleId: 'STR003', severity: 'MEDIUM', msg: 'God class: 파일에 1500줄 이상의 코드', suggestion: '관심사 분리를 통해 여러 파일로 분리', file: 'src/services/DataManager.ts', line: 1 },
    { mainCat: 'OPERATIONS', subCat: 'LOGGING', ruleId: 'OPS001', severity: 'MEDIUM', msg: 'catch 블록에서 에러 로깅 없음', suggestion: 'console.error 또는 logger.error 추가', file: 'src/api/payments.ts', line: 156 },
    { mainCat: 'OPERATIONS', subCat: 'RETRY', ruleId: 'OPS002', severity: 'HIGH', msg: '외부 API 호출에 재시도 로직 없음', suggestion: 'exponential backoff 재시도 구현', file: 'src/integrations/stripe.ts', line: 45 },
    { mainCat: 'TEST', subCat: 'COVERAGE', ruleId: 'TST001', severity: 'MEDIUM', msg: '핵심 비즈니스 로직에 테스트 없음', suggestion: 'jest 테스트 케이스 추가 필요', file: 'src/services/pricing.ts', line: 1 },
    { mainCat: 'TEST', subCat: 'ASSERTION', ruleId: 'TST002', severity: 'LOW', msg: '테스트에 expect 구문이 없음 (빈 테스트)', suggestion: '실제 검증 로직 추가', file: 'src/__tests__/auth.test.ts', line: 23 },
    { mainCat: 'STANDARDS', subCat: 'FORMAT', ruleId: 'STD001', severity: 'INFO', msg: '파일 끝에 개행 문자 없음', suggestion: 'Prettier 또는 ESLint 규칙 적용', file: 'src/types/index.ts', line: 45 }
  ],
  java: [
    { mainCat: 'SECURITY', subCat: 'INJECTION', ruleId: 'SEC001', severity: 'CRITICAL', msg: 'SQL Injection: Statement 대신 PreparedStatement 사용 필요', suggestion: 'PreparedStatement로 변경하세요', file: 'src/main/java/UserRepository.java', line: 78 },
    { mainCat: 'SECURITY', subCat: 'SECRETS', ruleId: 'SEC003', severity: 'CRITICAL', msg: '민감 정보(카드번호)가 로그에 출력됨', suggestion: '마스킹 처리 적용 (xxxx-xxxx-xxxx-1234)', file: 'src/main/java/PaymentService.java', line: 156 },
    { mainCat: 'SECURITY', subCat: 'CRYPTO', ruleId: 'SEC004', severity: 'HIGH', msg: 'DES 암호화 알고리즘 사용 (취약)', suggestion: 'AES-256으로 변경', file: 'src/main/java/CryptoUtils.java', line: 34 },
    { mainCat: 'QUALITY', subCat: 'COMPLEXITY', ruleId: 'QUA001', severity: 'HIGH', msg: '메서드 복잡도 초과 (32)', suggestion: '메서드 분리 및 Strategy 패턴 고려', file: 'src/main/java/OrderProcessor.java', line: 234 },
    { mainCat: 'QUALITY', subCat: 'EXCEPTION', ruleId: 'QUA004', severity: 'MEDIUM', msg: '빈 catch 블록 - 예외 무시됨', suggestion: '로깅 또는 적절한 예외 처리 추가', file: 'src/main/java/DataLoader.java', line: 89 },
    { mainCat: 'STRUCTURE', subCat: 'LAYER', ruleId: 'STR002', severity: 'MEDIUM', msg: 'Controller에서 직접 Repository 호출', suggestion: 'Service 레이어 도입', file: 'src/main/java/UserController.java', line: 45 },
    { mainCat: 'OPERATIONS', subCat: 'RETRY', ruleId: 'OPS002', severity: 'HIGH', msg: 'HTTP 클라이언트에 타임아웃 미설정', suggestion: 'connectionTimeout, readTimeout 설정', file: 'src/main/java/ApiClient.java', line: 23 },
    { mainCat: 'TEST', subCat: 'COVERAGE', ruleId: 'TST001', severity: 'HIGH', msg: '결제 모듈 테스트 커버리지 15%', suggestion: '최소 80% 커버리지 달성 필요', file: 'src/main/java/PaymentGateway.java', line: 1 }
  ],
  python: [
    { mainCat: 'SECURITY', subCat: 'INJECTION', ruleId: 'SEC001', severity: 'CRITICAL', msg: 'eval() 사용은 보안에 위험', suggestion: 'ast.literal_eval() 또는 JSON 사용', file: 'src/utils/config.py', line: 34 },
    { mainCat: 'SECURITY', subCat: 'CRYPTO', ruleId: 'SEC005', severity: 'MEDIUM', msg: 'pickle 역직렬화는 RCE 취약점 유발 가능', suggestion: 'JSON 또는 msgpack 사용', file: 'src/cache/storage.py', line: 67 },
    { mainCat: 'QUALITY', subCat: 'TYPING', ruleId: 'QUA005', severity: 'MEDIUM', msg: 'Type hint 누락으로 IDE 지원 제한', suggestion: 'typing 모듈로 타입 힌트 추가', file: 'src/transform.py', line: 45 },
    { mainCat: 'QUALITY', subCat: 'RESOURCE', ruleId: 'QUA006', severity: 'HIGH', msg: '파일 핸들 close() 누락 (리소스 누수)', suggestion: 'with 문 또는 contextlib 사용', file: 'src/loader.py', line: 123 },
    { mainCat: 'OPERATIONS', subCat: 'LOGGING', ruleId: 'OPS001', severity: 'LOW', msg: 'print() 대신 logging 모듈 권장', suggestion: 'logging.info() 등으로 변경', file: 'src/main.py', line: 56 }
  ]
};

const pipelineStages = [
  { stage: 'SOURCE_COLLECT', msg: '소스 파일 수집 완료', duration: 1200 },
  { stage: 'LANGUAGE_DETECT', msg: '15개 파일 언어 감지 완료', duration: 850 },
  { stage: 'AST_PARSE', msg: 'AST 파싱 완료 (12/15 성공)', duration: 3500 },
  { stage: 'STATIC_ANALYZE', msg: '정적 분석 완료 (복잡도, 의존성)', duration: 2800 },
  { stage: 'RULE_PARSE', msg: '룰 기반 분석 완료 (4개 파서)', duration: 1500 },
  { stage: 'CATEGORIZE', msg: '결과 분류 완료 (6개 카테고리)', duration: 400 },
  { stage: 'NORMALIZE', msg: '정규화 완료 (28개 결과)', duration: 600 },
  { stage: 'AI_ENHANCE', msg: 'AI 보강 완료 (선택적)', duration: 0 }
];

async function main() {
  console.log('🌱 Seeding database with Prisma Client...');

  // Create projects
  const projects = [
    await prisma.project.upsert({
      where: { path: 'd:/project/jacodelens' },
      update: {},
      create: { name: 'JacodeLens Core', path: 'd:/project/jacodelens', description: '멀티 에이전트 기반 코드 분석 플랫폼', type: 'NEXTJS', tier: 'ENTERPRISE' }
    }),
    await prisma.project.upsert({
      where: { path: '/projects/ecommerce-java' },
      update: {},
      create: { name: 'E-Commerce Platform', path: '/projects/ecommerce-java', description: 'Spring Boot 전자상거래 플랫폼', type: 'JAVA', tier: 'ENTERPRISE' }
    }),
    await prisma.project.upsert({
      where: { path: '/projects/ml-pipeline' },
      update: {},
      create: { name: 'ML Data Pipeline', path: '/projects/ml-pipeline', description: 'Python 기계학습 데이터 파이프라인', type: 'PYTHON', tier: 'STANDARD' }
    }),
    await prisma.project.upsert({
      where: { path: '/projects/mobile-api' },
      update: {},
      create: { name: 'Mobile API Gateway', path: '/projects/mobile-api', description: 'React Native 앱 백엔드 API', type: 'NEXTJS', tier: 'STANDARD' }
    }),
    await prisma.project.upsert({
      where: { path: '/projects/devops' },
      update: {},
      create: { name: 'DevOps Automation', path: '/projects/devops', description: 'CI/CD 파이프라인 자동화 도구', type: 'PYTHON', tier: 'ENTERPRISE' }
    }),
  ];
  console.log(`✓ Created ${projects.length} projects`);

  // Analysis configs
  const analysisConfigs = [
    { project: projects[0], results: pipelineResults.typescript, score: 72.5 },
    { project: projects[1], results: pipelineResults.java, score: 65.8 },
    { project: projects[2], results: pipelineResults.python, score: 85.3 },
    { project: projects[3], results: pipelineResults.typescript.slice(0, 6), score: 88.5 },
    { project: projects[4], results: pipelineResults.python.slice(0, 3), score: 91.2 },
  ];

  let totalNormalizedResults = 0;
  const agentNames = ['StructureAnalysisAgent', 'QualityAnalysisAgent', 'SecurityAgent', 'TestAnalysisAgent', 'StyleAnalysisAgent', 'OpsRiskAgent'];

  for (const config of analysisConfigs) {
    const startTime = new Date(Date.now() - 180000);
    const endTime = new Date(Date.now() - 60000);

    // Create AnalysisExecute
    const execution = await prisma.analysisExecute.create({
      data: {
        projectId: config.project.id,
        status: 'COMPLETED',
        score: config.score,
        startedAt: startTime,
        completedAt: endTime,
        environment: 'PRODUCTION'
      }
    });

    // Create PipelineStageExecution
    let stageStartTime = new Date(startTime);
    for (const stage of pipelineStages) {
      const stageEndTime = new Date(stageStartTime.getTime() + stage.duration);
      await prisma.pipelineStageExecution.create({
        data: {
          executeId: execution.id,
          stage: stage.stage,
          status: 'completed',
          progress: 100,
          message: stage.msg,
          startedAt: stageStartTime,
          completedAt: stageEndTime
        }
      });
      stageStartTime = stageEndTime;
    }

    // Create NormalizedAnalysisResult
    const lang = config.project.type === 'JAVA' ? 'java' : config.project.type === 'PYTHON' ? 'python' : 'typescript';
    for (const r of config.results) {
      await prisma.normalizedAnalysisResult.create({
        data: {
          executeId: execution.id,
          filePath: r.file,
          lineStart: r.line,
          lineEnd: r.line + 5,
          language: lang,
          mainCategory: r.mainCat,
          subCategory: r.subCat,
          ruleId: r.ruleId,
          severity: r.severity,
          message: r.msg,
          suggestion: r.suggestion,
          deterministic: true
        }
      });
      totalNormalizedResults++;
    }

    // Create AgentExecution
    for (const agentName of agentNames) {
      await prisma.agentExecution.create({
        data: {
          executeId: execution.id,
          agentName,
          status: 'COMPLETED',
          durationMs: 8000 + Math.floor(Math.random() * 20000),
          tokensUsed: 2000 + Math.floor(Math.random() * 8000),
          completedAt: endTime
        }
      });
    }
  }
  console.log(`✓ Created ${analysisConfigs.length} analyses with ${totalNormalizedResults} normalized results`);

  // AI Models
  const aiModelData = [
    { name: 'qwen3:8b', provider: 'Ollama', version: 'latest', endpoint: 'http://localhost:11434', isDefault: true, isActive: true, latency: 0.35, accuracy: 82, costPerToken: 0, contextWindow: 32768, maxTokens: 8192, temperature: 0.7 },
    { name: 'llama3.1:8b', provider: 'Ollama', version: 'latest', endpoint: 'http://localhost:11434', isDefault: false, isActive: true, latency: 0.4, accuracy: 80, costPerToken: 0, contextWindow: 131072, maxTokens: 8192, temperature: 0.7 },
    { name: 'gpt-4o', provider: 'OpenAI', version: '2024-08', endpoint: 'https://api.openai.com/v1', isDefault: false, isActive: false, latency: 1.5, accuracy: 95, costPerToken: 0.015, contextWindow: 128000, maxTokens: 16384, temperature: 0.7 },
    { name: 'gpt-4o-mini', provider: 'OpenAI', version: '2024-07', endpoint: 'https://api.openai.com/v1', isDefault: false, isActive: false, latency: 0.6, accuracy: 88, costPerToken: 0.0003, contextWindow: 128000, maxTokens: 16384, temperature: 0.7 },
    { name: 'claude-3.5-sonnet', provider: 'Anthropic', version: '20241022', endpoint: 'https://api.anthropic.com/v1', isDefault: false, isActive: false, latency: 1.2, accuracy: 93, costPerToken: 0.012, contextWindow: 200000, maxTokens: 8192, temperature: 0.7 },
  ];
  
  for (const model of aiModelData) {
    await prisma.aiModel.create({ data: model }).catch(() => {});  // Ignore duplicates
  }
  console.log(`✓ Created AI models`);

  // AI Prompts
  const prompts = await Promise.all([
    prisma.aiPrompt.upsert({ where: { key: 'agent.structure' }, update: {}, create: { key: 'agent.structure', name: '구조 분석', category: 'AGENT', systemPrompt: '코드 구조를 분석하고 개선점을 제안하세요.', userPromptTemplate: '다음 코드를 분석하세요:\n{{code}}' } }),
    prisma.aiPrompt.upsert({ where: { key: 'agent.security' }, update: {}, create: { key: 'agent.security', name: '보안 분석', category: 'AGENT', systemPrompt: 'OWASP Top 10 기준으로 보안 취약점을 찾으세요.', userPromptTemplate: '다음 코드의 보안 취약점을 분석하세요:\n{{code}}' } }),
    prisma.aiPrompt.upsert({ where: { key: 'agent.quality' }, update: {}, create: { key: 'agent.quality', name: '품질 분석', category: 'AGENT', systemPrompt: '코드 냄새, 복잡도, 중복을 찾아 개선점을 제안하세요.', userPromptTemplate: '다음 코드의 품질을 분석하세요:\n{{code}}' } }),
    prisma.aiPrompt.upsert({ where: { key: 'agent.test' }, update: {}, create: { key: 'agent.test', name: '테스트 분석', category: 'AGENT', systemPrompt: '테스트 커버리지와 품질을 분석하세요.', userPromptTemplate: '다음 테스트 코드를 분석하세요:\n{{code}}' } }),
  ]);
  console.log(`✓ Created ${prompts.length} AI prompts`);

  // Agent Configs
  const agentConfigs = [
    { name: 'StructureAnalysisAgent', displayName: '구조 분석', description: '코드 구조와 아키텍처를 분석합니다', category: 'ANALYSIS', priority: 1, timeout: 120 },
    { name: 'SecurityAgent', displayName: '보안 분석', description: 'OWASP Top 10 보안 취약점을 탐지합니다', category: 'SECURITY', priority: 2, timeout: 120 },
    { name: 'QualityAnalysisAgent', displayName: '품질 분석', description: '코드 품질과 복잡도를 분석합니다', category: 'QUALITY', priority: 3, timeout: 90 },
    { name: 'TestAnalysisAgent', displayName: '테스트 분석', description: '테스트 커버리지와 품질을 분석합니다', category: 'QUALITY', priority: 4, timeout: 60 },
    { name: 'StyleAnalysisAgent', displayName: '스타일 분석', description: '코딩 스타일 컨벤션을 검사합니다', category: 'QUALITY', priority: 5, timeout: 60 },
    { name: 'OpsRiskAgent', displayName: '운영 리스크', description: '운영 관련 리스크를 분석합니다', category: 'OPERATIONS', priority: 6, timeout: 60 },
  ];

  for (const agent of agentConfigs) {
    await prisma.agentConfig.upsert({
      where: { name: agent.name },
      update: {},
      create: { ...agent, isEnabled: true, totalRuns: Math.floor(Math.random() * 100), successRuns: Math.floor(Math.random() * 95), avgDuration: 15000 + Math.random() * 30000 }
    });
  }
  console.log(`✓ Created ${agentConfigs.length} agent configs`);

  // Project Stats (30 days)
  for (const project of projects) {
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const baseScore = 65 + (30 - i) * 0.3;
      await prisma.projectStats.create({
        data: {
          projectId: project.id,
          timestamp: date,
          codeQualityScore: baseScore + Math.random() * 20,
          securityScore: baseScore - 5 + Math.random() * 25,
          maintainabilityScore: baseScore + Math.random() * 15,
          opsRiskScore: baseScore - 10 + Math.random() * 30
        }
      });
    }
  }
  console.log('✓ Created 30-day historical stats');

  console.log('\n✅ Seeding completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   📁 ${projects.length} projects`);
  console.log(`   🔬 ${analysisConfigs.length} pipeline analyses`);
  console.log(`   📊 ${totalNormalizedResults} normalized results`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
