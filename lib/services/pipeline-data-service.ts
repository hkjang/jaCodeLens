/**
 * 파이프라인 데이터 서비스
 * 
 * 대시보드에서 파이프라인 분석 결과를 조회하는 통합 API
 */

import prisma from '@/lib/db';

// 결과 타입 정의
export interface DashboardStats {
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  byCategory: Record<string, number>;
  byLanguage: Record<string, number>;
  averageScore: number;
  totalExecutions: number;
}

export interface IssueItem {
  id: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  language: string;
  mainCategory: string;
  subCategory: string;
  ruleId: string;
  severity: string;
  message: string;
  suggestion?: string | null;
  aiExplanation?: string | null;
  aiSuggestion?: string | null;
  createdAt: Date;
}

export interface ArchitectureModule {
  name: string;
  path: string;
  type: string;
  issueCount: number;
  dependencies: string[];
  dependedBy: string[];
}

export interface DependencyInfo {
  from: string;
  to: string;
  type: string;
  isCircular: boolean;
}

export interface RiskData {
  module: string;
  security: number;
  quality: number;
  structure: number;
  operations: number;
  test: number;
  standards: number;
}

/**
 * 대시보드 통계 조회
 */
export async function getDashboardStats(projectId?: string): Promise<DashboardStats> {
  try {
    // 최근 실행 ID 조회
    const latestExecution = await prisma.analysisExecute.findFirst({
      where: projectId ? { projectId } : undefined,
      orderBy: { startedAt: 'desc' },
      select: { id: true, score: true }
    });

    if (!latestExecution) {
      return getEmptyStats();
    }

    // 정규화 결과 조회
    const results = await prisma.normalizedAnalysisResult.findMany({
      where: { executeId: latestExecution.id }
    });

    // 통계 계산
    const stats: DashboardStats = {
      totalIssues: results.length,
      criticalCount: results.filter(r => r.severity === 'CRITICAL').length,
      highCount: results.filter(r => r.severity === 'HIGH').length,
      mediumCount: results.filter(r => r.severity === 'MEDIUM').length,
      lowCount: results.filter(r => r.severity === 'LOW').length,
      infoCount: results.filter(r => r.severity === 'INFO').length,
      byCategory: {},
      byLanguage: {},
      averageScore: latestExecution.score || 0,
      totalExecutions: await prisma.analysisExecute.count()
    };

    // 카테고리별 집계
    for (const r of results) {
      stats.byCategory[r.mainCategory] = (stats.byCategory[r.mainCategory] || 0) + 1;
      stats.byLanguage[r.language] = (stats.byLanguage[r.language] || 0) + 1;
    }

    return stats;
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return getEmptyStats();
  }
}

/**
 * 이슈 목록 조회
 */
export async function getIssues(
  executeId?: string,
  filters?: {
    severity?: string;
    category?: string;
    language?: string;
    filePath?: string;
  },
  limit = 100,
  offset = 0
): Promise<{ items: IssueItem[]; total: number }> {
  try {
    // executeId가 없으면 최근 실행에서 조회
    let targetExecuteId = executeId;
    if (!targetExecuteId) {
      const latest = await prisma.analysisExecute.findFirst({
        orderBy: { startedAt: 'desc' },
        select: { id: true }
      });
      targetExecuteId = latest?.id;
    }

    if (!targetExecuteId) {
      return { items: [], total: 0 };
    }

    const where: any = { executeId: targetExecuteId };
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.category) where.mainCategory = filters.category;
    if (filters?.language) where.language = filters.language;
    if (filters?.filePath) where.filePath = { contains: filters.filePath };

    const [items, total] = await Promise.all([
      prisma.normalizedAnalysisResult.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [
          { severity: 'asc' },  // CRITICAL first
          { createdAt: 'desc' }
        ]
      }),
      prisma.normalizedAnalysisResult.count({ where })
    ]);

    return { items: items as IssueItem[], total };
  } catch (error) {
    console.error('Failed to get issues:', error);
    return { items: [], total: 0 };
  }
}

/**
 * 아키텍처 모듈 정보 조회
 */
export async function getArchitectureModules(executeId?: string): Promise<ArchitectureModule[]> {
  try {
    let targetExecuteId = executeId;
    if (!targetExecuteId) {
      const latest = await prisma.analysisExecute.findFirst({
        orderBy: { startedAt: 'desc' },
        select: { id: true }
      });
      targetExecuteId = latest?.id;
    }

    if (!targetExecuteId) {
      return [];
    }

    // 구조 관련 이슈 조회 (STRUCTURE 카테고리)
    const structureIssues = await prisma.normalizedAnalysisResult.findMany({
      where: {
        executeId: targetExecuteId,
        mainCategory: 'STRUCTURE'
      }
    });

    // 파일 경로에서 모듈 추출
    const moduleMap = new Map<string, ArchitectureModule>();
    
    for (const issue of structureIssues) {
      const parts = issue.filePath.split(/[/\\]/);
      const moduleName = parts.length > 1 ? parts[0] : 'root';
      
      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, {
          name: moduleName,
          path: moduleName,
          type: inferModuleType(moduleName),
          issueCount: 0,
          dependencies: [],
          dependedBy: []
        });
      }
      
      const module = moduleMap.get(moduleName)!;
      module.issueCount++;
    }

    return Array.from(moduleMap.values());
  } catch (error) {
    console.error('Failed to get architecture modules:', error);
    return [];
  }
}

/**
 * 의존성 그래프 조회
 */
export async function getDependencyGraph(executeId?: string): Promise<{
  nodes: string[];
  edges: DependencyInfo[];
  circularDeps: string[][];
}> {
  try {
    let targetExecuteId = executeId;
    if (!targetExecuteId) {
      const latest = await prisma.analysisExecute.findFirst({
        orderBy: { startedAt: 'desc' },
        select: { id: true }
      });
      targetExecuteId = latest?.id;
    }

    if (!targetExecuteId) {
      return { nodes: [], edges: [], circularDeps: [] };
    }

    // 순환 의존성 이슈 조회
    const circularIssues = await prisma.normalizedAnalysisResult.findMany({
      where: {
        executeId: targetExecuteId,
        subCategory: 'CIRCULAR'
      }
    });

    // rawResult에서 순환 참조 정보 추출
    const circularDeps: string[][] = [];
    for (const issue of circularIssues) {
      if (issue.rawResult) {
        try {
          const raw = JSON.parse(issue.rawResult as string);
          if (raw.cycle) {
            circularDeps.push(raw.cycle);
          }
        } catch {}
      }
    }

    // 기본 노드/엣지 반환 (실제로는 AST에서 추출)
    const nodes = new Set<string>();
    const edges: DependencyInfo[] = [];

    for (const cycle of circularDeps) {
      for (let i = 0; i < cycle.length; i++) {
        nodes.add(cycle[i]);
        edges.push({
          from: cycle[i],
          to: cycle[(i + 1) % cycle.length],
          type: 'import',
          isCircular: true
        });
      }
    }

    return {
      nodes: Array.from(nodes),
      edges,
      circularDeps
    };
  } catch (error) {
    console.error('Failed to get dependency graph:', error);
    return { nodes: [], edges: [], circularDeps: [] };
  }
}

/**
 * 리스크 맵 데이터 조회
 */
export async function getRiskMap(executeId?: string): Promise<RiskData[]> {
  try {
    let targetExecuteId = executeId;
    if (!targetExecuteId) {
      const latest = await prisma.analysisExecute.findFirst({
        orderBy: { startedAt: 'desc' },
        select: { id: true }
      });
      targetExecuteId = latest?.id;
    }

    if (!targetExecuteId) {
      return [];
    }

    // 모든 결과 조회
    const results = await prisma.normalizedAnalysisResult.findMany({
      where: { executeId: targetExecuteId }
    });

    // 모듈별 카테고리별 집계
    const moduleRisks = new Map<string, RiskData>();

    for (const result of results) {
      const parts = result.filePath.split(/[/\\]/);
      const moduleName = parts.length > 1 ? parts[0] : 'root';

      if (!moduleRisks.has(moduleName)) {
        moduleRisks.set(moduleName, {
          module: moduleName,
          security: 0,
          quality: 0,
          structure: 0,
          operations: 0,
          test: 0,
          standards: 0
        });
      }

      const risk = moduleRisks.get(moduleName)!;
      const severity = getSeverityWeight(result.severity);

      switch (result.mainCategory) {
        case 'SECURITY': risk.security += severity; break;
        case 'QUALITY': risk.quality += severity; break;
        case 'STRUCTURE': risk.structure += severity; break;
        case 'OPERATIONS': risk.operations += severity; break;
        case 'TEST': risk.test += severity; break;
        case 'STANDARDS': risk.standards += severity; break;
      }
    }

    // 정규화 (1-10 스케일)
    const riskArray = Array.from(moduleRisks.values());
    const maxRisk = Math.max(
      ...riskArray.flatMap(r => [r.security, r.quality, r.structure, r.operations, r.test, r.standards]),
      1
    );

    return riskArray.map(r => ({
      module: r.module,
      security: Math.min(10, Math.round((r.security / maxRisk) * 10)),
      quality: Math.min(10, Math.round((r.quality / maxRisk) * 10)),
      structure: Math.min(10, Math.round((r.structure / maxRisk) * 10)),
      operations: Math.min(10, Math.round((r.operations / maxRisk) * 10)),
      test: Math.min(10, Math.round((r.test / maxRisk) * 10)),
      standards: Math.min(10, Math.round((r.standards / maxRisk) * 10))
    }));
  } catch (error) {
    console.error('Failed to get risk map:', error);
    return [];
  }
}

/**
 * 파이프라인 실행 목록 조회
 */
export async function getPipelineExecutions(limit = 10): Promise<Array<{
  id: string;
  projectId: string;
  projectName: string;
  status: string;
  score: number | null;
  startedAt: Date;
  completedAt: Date | null;
  issueCount: number;
  stages: Array<{
    stage: string;
    status: string;
    progress: number;
  }>;
}>> {
  try {
    const executions = await prisma.analysisExecute.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } }
      }
    });

    return Promise.all(executions.map(async (exec) => {
      const [stages, issueCount] = await Promise.all([
        prisma.pipelineStageExecution.findMany({
          where: { executeId: exec.id }
        }),
        prisma.normalizedAnalysisResult.count({
          where: { executeId: exec.id }
        })
      ]);

      return {
        id: exec.id,
        projectId: exec.project.id,
        projectName: exec.project.name,
        status: exec.status,
        score: exec.score,
        startedAt: exec.startedAt,
        completedAt: exec.completedAt,
        issueCount,
        stages: stages.map(s => ({
          stage: s.stage,
          status: s.status,
          progress: s.progress
        }))
      };
    }));
  } catch (error) {
    console.error('Failed to get pipeline executions:', error);
    return [];
  }
}

/**
 * 최근 프로젝트 목록 및 통계 조회
 */
export async function getRecentProjects(limit = 5): Promise<Array<{
  id: string;
  name: string;
  path: string;
  type: string | null;
  lastAnalysis: {
    id: string;
    score: number | null;
    issueCount: number;
    date: Date;
    criticalCount: number;
    highCount: number;
  } | null;
}>> {
  try {
    const projects = await prisma.project.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        analysisExecutes: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            score: true,
            startedAt: true
          }
        }
      }
    });

    return Promise.all(projects.map(async (project) => {
      const lastExec = project.analysisExecutes[0];
      let lastAnalysis = null;

      if (lastExec) {
        const results = await prisma.normalizedAnalysisResult.findMany({
          where: { executeId: lastExec.id },
          select: { severity: true }
        });

        lastAnalysis = {
          id: lastExec.id,
          score: lastExec.score,
          issueCount: results.length,
          date: lastExec.startedAt,
          criticalCount: results.filter(r => r.severity === 'CRITICAL').length,
          highCount: results.filter(r => r.severity === 'HIGH').length
        };
      }

      return {
        id: project.id,
        name: project.name,
        path: project.path,
        type: project.type,
        lastAnalysis
      };
    }));
  } catch (error) {
    console.error('Failed to get recent projects:', error);
    return [];
  }
}

// 헬퍼 함수들
function getEmptyStats(): DashboardStats {
  return {
    totalIssues: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    infoCount: 0,
    byCategory: {},
    byLanguage: {},
    averageScore: 0,
    totalExecutions: 0
  };
}

function inferModuleType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('api') || lower.includes('route')) return 'api';
  if (lower.includes('service')) return 'service';
  if (lower.includes('component')) return 'component';
  if (lower.includes('util') || lower.includes('lib')) return 'util';
  if (lower.includes('model') || lower.includes('entity')) return 'model';
  return 'module';
}

function getSeverityWeight(severity: string): number {
  switch (severity) {
    case 'CRITICAL': return 5;
    case 'HIGH': return 3;
    case 'MEDIUM': return 2;
    case 'LOW': return 1;
    default: return 0;
  }
}
