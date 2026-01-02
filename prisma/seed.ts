import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const libsql = createClient({
  url: 'file:./prisma/dev.db',
});

// SQL to create tables
const createTablesSql = `
-- Projects
CREATE TABLE IF NOT EXISTS Project (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT,
  tier TEXT DEFAULT 'STANDARD',
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- Analysis Executions
CREATE TABLE IF NOT EXISTS AnalysisExecute (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  status TEXT NOT NULL,
  score REAL,
  report TEXT,
  startedAt TEXT DEFAULT (datetime('now')),
  completedAt TEXT,
  inputHash TEXT,
  snapshotPath TEXT,
  environment TEXT,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

-- Analysis Results
CREATE TABLE IF NOT EXISTS AnalysisResult (
  id TEXT PRIMARY KEY,
  executeId TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  filePath TEXT,
  lineNumber INTEGER,
  message TEXT NOT NULL,
  suggestion TEXT,
  confidenceScore REAL DEFAULT 1.0,
  reasoning TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  reviewStatus TEXT DEFAULT 'OPEN',
  reviewComment TEXT,
  humanCorrection TEXT,
  isFlagged INTEGER DEFAULT 0,
  FOREIGN KEY (executeId) REFERENCES AnalysisExecute(id) ON DELETE CASCADE
);

-- Agent Execution
CREATE TABLE IF NOT EXISTS AgentExecution (
  id TEXT PRIMARY KEY,
  executeId TEXT NOT NULL,
  agentName TEXT NOT NULL,
  status TEXT NOT NULL,
  durationMs INTEGER,
  tokensUsed INTEGER,
  createdAt TEXT DEFAULT (datetime('now')),
  completedAt TEXT,
  FOREIGN KEY (executeId) REFERENCES AnalysisExecute(id) ON DELETE CASCADE
);

-- Project Stats
CREATE TABLE IF NOT EXISTS ProjectStats (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  codeQualityScore REAL,
  securityScore REAL,
  maintainabilityScore REAL,
  opsRiskScore REAL,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

-- Approval Workflow
CREATE TABLE IF NOT EXISTS ApprovalWorkflow (
  id TEXT PRIMARY KEY,
  executeId TEXT NOT NULL,
  stepName TEXT NOT NULL,
  status TEXT NOT NULL,
  approverId TEXT,
  comment TEXT,
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (executeId) REFERENCES AnalysisExecute(id) ON DELETE CASCADE
);

-- Audit Log
CREATE TABLE IF NOT EXISTS AuditLog (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actorId TEXT,
  targetType TEXT NOT NULL,
  targetId TEXT NOT NULL,
  details TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  ipAddress TEXT
);

-- AI Models
CREATE TABLE IF NOT EXISTS AiModel (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  version TEXT,
  endpoint TEXT,
  apiKey TEXT,
  isDefault INTEGER DEFAULT 0,
  isActive INTEGER DEFAULT 1,
  latency REAL DEFAULT 0,
  accuracy REAL DEFAULT 0,
  costPerToken REAL DEFAULT 0,
  usageToday INTEGER DEFAULT 0,
  usageTotal INTEGER DEFAULT 0,
  contextWindow INTEGER,
  maxTokens INTEGER,
  temperature REAL DEFAULT 0.7,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);
`;

async function main() {
  console.log('🌱 Seeding database...');

  // Create tables
  for (const sql of createTablesSql.split(';').filter(s => s.trim())) {
    await libsql.execute(sql);
  }
  console.log('✓ Created tables');

  // Clear existing data
  await libsql.execute('DELETE FROM AuditLog');
  await libsql.execute('DELETE FROM ApprovalWorkflow');
  await libsql.execute('DELETE FROM ProjectStats');
  await libsql.execute('DELETE FROM AnalysisResult');
  await libsql.execute('DELETE FROM AgentExecution');
  await libsql.execute('DELETE FROM AnalysisExecute');
  await libsql.execute('DELETE FROM Project');
  console.log('✓ Cleared existing data');

  // Create projects
  const projects = [
    { id: randomUUID(), name: 'JacodeLens Core', path: '/projects/jacodelens-core', description: '멀티 에이전트 기반 코드 분석 플랫폼 핵심 백엔드', type: 'NEXTJS', tier: 'ENTERPRISE' },
    { id: randomUUID(), name: 'Payment Gateway', path: '/projects/payment-gateway', description: '결제 처리 마이크로서비스', type: 'JAVA', tier: 'ENTERPRISE' },
    { id: randomUUID(), name: 'ML Pipeline', path: '/projects/ml-pipeline', description: '기계학습 데이터 파이프라인', type: 'PYTHON', tier: 'STANDARD' },
    { id: randomUUID(), name: 'Mobile App API', path: '/projects/mobile-api', description: '모바일 앱 백엔드 REST API', type: 'NEXTJS', tier: 'STANDARD' },
    { id: randomUUID(), name: 'DevOps Automation', path: '/projects/devops-automation', description: 'CI/CD 파이프라인 및 인프라 자동화', type: 'PYTHON', tier: 'ENTERPRISE' },
  ];

  for (const p of projects) {
    await libsql.execute({
      sql: 'INSERT INTO Project (id, name, path, description, type, tier) VALUES (?, ?, ?, ?, ?, ?)',
      args: [p.id, p.name, p.path, p.description, p.type, p.tier],
    });
  }
  console.log(`✓ Created ${projects.length} projects`);

  // Analysis data
  const analysisData = [
    {
      projectId: projects[0].id,
      score: 78.5,
      results: [
        { category: 'SECURITY', severity: 'CRITICAL', message: 'SQL Injection 취약점이 발견되었습니다', filePath: 'src/api/users.ts', lineNumber: 45, suggestion: 'parameterized query를 사용하세요' },
        { category: 'SECURITY', severity: 'HIGH', message: 'XSS 취약점이 발견되었습니다', filePath: 'src/components/Comment.tsx', lineNumber: 23, suggestion: 'DOMPurify로 sanitize 하세요' },
        { category: 'QUALITY', severity: 'MEDIUM', message: '함수 복잡도가 높습니다 (Cyclomatic: 15)', filePath: 'src/utils/parser.ts', lineNumber: 89, suggestion: '함수를 분리하여 복잡도를 낮추세요' },
        { category: 'ARCHITECTURE', severity: 'HIGH', message: '순환 의존성이 발견되었습니다', filePath: 'src/modules/auth', lineNumber: null, suggestion: '의존성 방향을 재설계하세요' },
        { category: 'PERFORMANCE', severity: 'HIGH', message: 'N+1 쿼리 문제가 발견되었습니다', filePath: 'src/api/orders.ts', lineNumber: 67, suggestion: 'eager loading을 사용하세요' },
        { category: 'OPERATIONS', severity: 'MEDIUM', message: '로깅이 부족합니다', filePath: 'src/services/payment.ts', lineNumber: null, suggestion: '로깅 커버리지를 높이세요' },
      ],
    },
    {
      projectId: projects[1].id,
      score: 65.2,
      results: [
        { category: 'SECURITY', severity: 'CRITICAL', message: '민감 정보가 로그에 노출됩니다', filePath: 'PaymentService.java', lineNumber: 156, suggestion: '민감 정보 마스킹 적용' },
        { category: 'SECURITY', severity: 'CRITICAL', message: '암호화되지 않은 데이터 전송', filePath: 'ApiClient.java', lineNumber: 89, suggestion: 'TLS 적용 필수' },
        { category: 'SECURITY', severity: 'HIGH', message: '취약한 해시 알고리즘 사용 (MD5)', filePath: 'CryptoUtils.java', lineNumber: 34, suggestion: 'SHA-256 이상 사용' },
        { category: 'QUALITY', severity: 'HIGH', message: '중복 코드 블록 발견', filePath: 'OrderProcessor.java', lineNumber: null, suggestion: '공통 메서드로 추출하세요' },
        { category: 'OPERATIONS', severity: 'HIGH', message: '재시도 로직 없음', filePath: 'PaymentGateway.java', lineNumber: null, suggestion: 'Circuit breaker 패턴 적용' },
      ],
    },
    {
      projectId: projects[2].id,
      score: 82.1,
      results: [
        { category: 'QUALITY', severity: 'MEDIUM', message: '타입 힌트 누락', filePath: 'transform.py', lineNumber: 45, suggestion: '타입 힌트를 추가하세요' },
        { category: 'SECURITY', severity: 'MEDIUM', message: 'Pickle 역직렬화 사용', filePath: 'cache.py', lineNumber: 67, suggestion: 'JSON 또는 안전한 직렬화 사용' },
        { category: 'PERFORMANCE', severity: 'HIGH', message: '메모리 누수 가능성', filePath: 'loader.py', lineNumber: 123, suggestion: 'context manager 사용' },
      ],
    },
    {
      projectId: projects[3].id,
      score: 91.3,
      results: [
        { category: 'QUALITY', severity: 'LOW', message: '미사용 import', filePath: 'users.ts', lineNumber: 5, suggestion: '정리하세요' },
        { category: 'PERFORMANCE', severity: 'LOW', message: '캐싱 적용 권장', filePath: 'products.ts', lineNumber: null, suggestion: 'Redis 캐싱 적용' },
      ],
    },
    {
      projectId: projects[4].id,
      score: 85.7,
      results: [
        { category: 'SECURITY', severity: 'MEDIUM', message: 'API 키가 코드에 하드코딩됨', filePath: 'config.py', lineNumber: 23, suggestion: '환경변수 사용' },
        { category: 'OPERATIONS', severity: 'LOW', message: '헬스체크 엔드포인트 없음', filePath: null, lineNumber: null, suggestion: '/health 엔드포인트 추가' },
      ],
    },
  ];

  let totalResults = 0;
  const agentNames = ['StaticAnalysisAgent', 'ArchitectureAgent', 'SecurityAgent', 'OpsRiskAgent', 'ReviewerAgent', 'ImprovementAgent'];

  for (const data of analysisData) {
    const execId = randomUUID();
    const now = new Date().toISOString();
    const startedAt = new Date(Date.now() - 120000).toISOString();

    await libsql.execute({
      sql: 'INSERT INTO AnalysisExecute (id, projectId, status, score, startedAt, completedAt, environment) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [execId, data.projectId, 'COMPLETED', data.score, startedAt, now, 'DEV'],
    });

    for (const r of data.results) {
      await libsql.execute({
        sql: 'INSERT INTO AnalysisResult (id, executeId, category, severity, filePath, lineNumber, message, suggestion, confidenceScore, reviewStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [randomUUID(), execId, r.category, r.severity, r.filePath, r.lineNumber, r.message, r.suggestion, 0.75 + Math.random() * 0.25, r.severity === 'CRITICAL' ? 'IN_PROGRESS' : 'OPEN'],
      });
      totalResults++;
    }

    for (const agentName of agentNames) {
      await libsql.execute({
        sql: 'INSERT INTO AgentExecution (id, executeId, agentName, status, durationMs, tokensUsed, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [randomUUID(), execId, agentName, 'COMPLETED', 5000 + Math.floor(Math.random() * 25000), 1000 + Math.floor(Math.random() * 5000), now],
      });
    }

    // Add approval workflow for enterprise projects
    const project = projects.find(p => p.id === data.projectId);
    if (project?.tier === 'ENTERPRISE') {
      await libsql.execute({
        sql: 'INSERT INTO ApprovalWorkflow (id, executeId, stepName, status) VALUES (?, ?, ?, ?)',
        args: [randomUUID(), execId, 'Security Review', data.results.some(r => r.severity === 'CRITICAL') ? 'PENDING' : 'APPROVED'],
      });
    }
  }
  console.log(`✓ Created ${analysisData.length} analyses with ${totalResults} results`);

  // Project Stats (historical)
  for (const project of projects) {
    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      await libsql.execute({
        sql: 'INSERT INTO ProjectStats (id, projectId, timestamp, codeQualityScore, securityScore, maintainabilityScore, opsRiskScore) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [randomUUID(), project.id, date.toISOString(), 70 + Math.random() * 25, 60 + Math.random() * 35, 65 + Math.random() * 30, 50 + Math.random() * 40],
      });
    }
  }
  console.log('✓ Created historical project stats');

  // Audit logs
  const auditActions = ['ANALYSIS_START', 'ANALYSIS_COMPLETE', 'RESULT_REVIEWED', 'APPROVED'];
  for (let i = 0; i < 15; i++) {
    const date = new Date();
    date.setHours(date.getHours() - i);
    await libsql.execute({
      sql: 'INSERT INTO AuditLog (id, action, actorId, targetType, targetId, details, timestamp, ipAddress) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [randomUUID(), auditActions[Math.floor(Math.random() * auditActions.length)], ['admin', 'dev1', 'ops1', 'SYSTEM'][Math.floor(Math.random() * 4)], 'ANALYSIS', projects[Math.floor(Math.random() * projects.length)].id, JSON.stringify({ source: 'dashboard' }), date.toISOString(), '192.168.1.' + Math.floor(Math.random() * 255)],
    });
  }
  console.log('✓ Created audit logs');

  // AI Models - Clear and seed
  await libsql.execute('DELETE FROM AiModel');
  
  const aiModels = [
    { 
      id: randomUUID(), 
      name: 'qwen3:8b', 
      provider: 'Ollama', 
      version: 'latest',
      endpoint: 'http://localhost:11434',
      apiKey: null,
      isDefault: 1, 
      isActive: 1, 
      latency: 0.3, 
      accuracy: 85, 
      costPerToken: 0,  // Free local model
      usageToday: 0,
      usageTotal: 0,
      contextWindow: 32768,
      maxTokens: 8192,
      temperature: 0.7
    },
    { 
      id: randomUUID(), 
      name: 'gpt-4o', 
      provider: 'OpenAI', 
      version: '2024-05',
      endpoint: 'https://api.openai.com/v1',
      apiKey: null, // Set in .env
      isDefault: 0, 
      isActive: 0,  // Disabled by default 
      latency: 1.2, 
      accuracy: 95, 
      costPerToken: 0.015,
      usageToday: 0,
      usageTotal: 0,
      contextWindow: 128000,
      maxTokens: 4096,
      temperature: 0.7
    },
    { 
      id: randomUUID(), 
      name: 'gpt-4o-mini', 
      provider: 'OpenAI', 
      version: '2024-07',
      endpoint: 'https://api.openai.com/v1',
      apiKey: null,
      isDefault: 0, 
      isActive: 0, 
      latency: 0.5, 
      accuracy: 88, 
      costPerToken: 0.0003,
      usageToday: 0,
      usageTotal: 0,
      contextWindow: 128000,
      maxTokens: 16384,
      temperature: 0.7
    }
  ];

  for (const model of aiModels) {
    await libsql.execute({
      sql: `INSERT INTO AiModel (id, name, provider, version, endpoint, apiKey, isDefault, isActive, latency, accuracy, costPerToken, usageToday, usageTotal, contextWindow, maxTokens, temperature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [model.id, model.name, model.provider, model.version, model.endpoint, model.apiKey, model.isDefault, model.isActive, model.latency, model.accuracy, model.costPerToken, model.usageToday, model.usageTotal, model.contextWindow, model.maxTokens, model.temperature]
    });
  }
  console.log(`✓ Created ${aiModels.length} AI models (Ollama qwen3:8b as default)`);

  console.log('\n✅ Database seeding completed!');
  console.log(`   - ${projects.length} projects`);
  console.log(`   - ${analysisData.length} analyses`);
  console.log(`   - ${totalResults} analysis results`);
  console.log(`   - ${aiModels.length} AI models`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  });

