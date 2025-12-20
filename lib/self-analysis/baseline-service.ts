import { prisma } from '@/lib/db';
import { Baseline, SelfProject, AnalysisExecute } from '@prisma/client';

/**
 * BaselineService - 기준선 관리
 * 
 * 분석 결과를 기반으로 기준선을 생성하고
 * 다른 프로젝트와의 비교 기준으로 활용합니다.
 */
export class BaselineService {
  
  /**
   * 현재 활성 기준선 조회
   */
  async getActiveBaseline(selfProjectId: string): Promise<Baseline | null> {
    return prisma.baseline.findFirst({
      where: { selfProjectId, status: 'ACTIVE' },
      orderBy: { version: 'desc' }
    });
  }
  
  /**
   * 모든 기준선 조회
   */
  async getAllBaselines(selfProjectId: string): Promise<Baseline[]> {
    return prisma.baseline.findMany({
      where: { selfProjectId },
      orderBy: { version: 'desc' }
    });
  }
  
  /**
   * 분석 결과 기반 기준선 생성
   */
  async createBaseline(selfProjectId: string, executionId: string): Promise<Baseline> {
    // 1. 분석 결과 조회
    const execution = await prisma.analysisExecute.findUnique({
      where: { id: executionId },
      include: { results: true }
    });
    
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    if (execution.status !== 'COMPLETED') {
      throw new Error('분석이 완료되지 않았습니다.');
    }
    
    // 2. 현재 최신 버전 확인
    const latestBaseline = await prisma.baseline.findFirst({
      where: { selfProjectId },
      orderBy: { version: 'desc' }
    });
    
    const nextVersion = latestBaseline ? latestBaseline.version + 1 : 1;
    
    // 3. 지표 계산
    const metrics = this.calculateMetrics(execution.results);
    
    // 4. 이전 기준선 SUPERSEDED 처리
    if (latestBaseline && latestBaseline.status === 'ACTIVE') {
      await prisma.baseline.update({
        where: { id: latestBaseline.id },
        data: { status: 'SUPERSEDED' }
      });
    }
    
    // 5. 새 기준선 생성
    const baseline = await prisma.baseline.create({
      data: {
        selfProjectId,
        version: nextVersion,
        status: 'ACTIVE',
        complexityScore: metrics.complexity,
        debtScore: metrics.debt,
        riskScore: metrics.risk,
        qualityScore: metrics.quality,
        securityScore: metrics.security,
        coverageScore: metrics.coverage,
        metrics: JSON.stringify(metrics.details)
      }
    });
    
    console.log(`[Baseline] Created baseline v${nextVersion}: ${baseline.id}`);
    return baseline;
  }
  
  /**
   * 기준선 잠금
   */
  async lockBaseline(id: string, lockedBy: string): Promise<Baseline> {
    return prisma.baseline.update({
      where: { id },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy,
        status: 'LOCKED'
      }
    });
  }
  
  /**
   * 기준선 승인
   */
  async approveBaseline(id: string, approvedBy: string): Promise<Baseline> {
    return prisma.baseline.update({
      where: { id },
      data: {
        approvedBy,
        approvedAt: new Date()
      }
    });
  }
  
  /**
   * 프로젝트와 기준선 비교
   */
  async compareWithBaseline(baselineId: string, projectExecutionId: string): Promise<ComparisonResult> {
    const baseline = await prisma.baseline.findUnique({
      where: { id: baselineId }
    });
    
    if (!baseline) {
      throw new Error(`Baseline not found: ${baselineId}`);
    }
    
    const execution = await prisma.analysisExecute.findUnique({
      where: { id: projectExecutionId },
      include: { results: true, project: true }
    });
    
    if (!execution) {
      throw new Error(`Execution not found: ${projectExecutionId}`);
    }
    
    const projectMetrics = this.calculateMetrics(execution.results);
    
    return {
      baselineId,
      baselineVersion: baseline.version,
      projectId: execution.projectId,
      projectName: execution.project.name,
      executionId: projectExecutionId,
      comparison: {
        complexity: {
          baseline: baseline.complexityScore || 0,
          project: projectMetrics.complexity,
          difference: projectMetrics.complexity - (baseline.complexityScore || 0),
          status: this.getComparisonStatus(projectMetrics.complexity, baseline.complexityScore || 0, true)
        },
        debt: {
          baseline: baseline.debtScore || 0,
          project: projectMetrics.debt,
          difference: projectMetrics.debt - (baseline.debtScore || 0),
          status: this.getComparisonStatus(projectMetrics.debt, baseline.debtScore || 0, true)
        },
        risk: {
          baseline: baseline.riskScore || 0,
          project: projectMetrics.risk,
          difference: projectMetrics.risk - (baseline.riskScore || 0),
          status: this.getComparisonStatus(projectMetrics.risk, baseline.riskScore || 0, true)
        },
        quality: {
          baseline: baseline.qualityScore || 0,
          project: projectMetrics.quality,
          difference: projectMetrics.quality - (baseline.qualityScore || 0),
          status: this.getComparisonStatus(projectMetrics.quality, baseline.qualityScore || 0)
        },
        security: {
          baseline: baseline.securityScore || 0,
          project: projectMetrics.security,
          difference: projectMetrics.security - (baseline.securityScore || 0),
          status: this.getComparisonStatus(projectMetrics.security, baseline.securityScore || 0)
        },
        coverage: {
          baseline: baseline.coverageScore || 0,
          project: projectMetrics.coverage,
          difference: projectMetrics.coverage - (baseline.coverageScore || 0),
          status: this.getComparisonStatus(projectMetrics.coverage, baseline.coverageScore || 0)
        }
      },
      overallStatus: this.calculateOverallStatus(projectMetrics, baseline),
      comparedAt: new Date()
    };
  }
  
  /**
   * 지표 계산
   */
  private calculateMetrics(results: any[]): MetricsData {
    const severityWeights = { CRITICAL: 25, HIGH: 15, MEDIUM: 5, LOW: 2, INFO: 0 };
    
    const categoryResults: Record<string, any[]> = {
      QUALITY: [],
      SECURITY: [],
      ARCHITECTURE: [],
      PERFORMANCE: [],
      OPERATIONS: []
    };
    
    // 카테고리별 분류
    for (const result of results) {
      const cat = result.category || 'QUALITY';
      if (categoryResults[cat]) {
        categoryResults[cat].push(result);
      }
    }
    
    // 점수 계산 (100점 기준, 이슈 발생 시 감점)
    const calculateScore = (items: any[]): number => {
      let penalty = 0;
      for (const item of items) {
        penalty += severityWeights[item.severity as keyof typeof severityWeights] || 0;
      }
      return Math.max(0, 100 - penalty);
    };
    
    const quality = calculateScore(categoryResults.QUALITY);
    const security = calculateScore(categoryResults.SECURITY);
    const architecture = calculateScore(categoryResults.ARCHITECTURE);
    
    // 복잡도: 아키텍처 이슈 기반
    const complexity = categoryResults.ARCHITECTURE.length;
    
    // 부채: 전체 이슈 수 기반
    const debt = results.length;
    
    // 리스크: CRITICAL + HIGH 이슈 수
    const risk = results.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length;
    
    // 커버리지는 테스트 에이전트에서 추출 (현재는 추정값)
    const coverage = 75; // TODO: 실제 테스트 커버리지 연동
    
    return {
      complexity,
      debt,
      risk,
      quality,
      security,
      coverage,
      details: {
        totalIssues: results.length,
        byCategory: {
          quality: categoryResults.QUALITY.length,
          security: categoryResults.SECURITY.length,
          architecture: categoryResults.ARCHITECTURE.length,
          performance: categoryResults.PERFORMANCE.length,
          operations: categoryResults.OPERATIONS.length
        },
        bySeverity: {
          critical: results.filter(r => r.severity === 'CRITICAL').length,
          high: results.filter(r => r.severity === 'HIGH').length,
          medium: results.filter(r => r.severity === 'MEDIUM').length,
          low: results.filter(r => r.severity === 'LOW').length,
          info: results.filter(r => r.severity === 'INFO').length
        }
      }
    };
  }
  
  /**
   * 비교 상태 결정
   */
  private getComparisonStatus(project: number, baseline: number, lowerIsBetter: boolean = false): 'better' | 'same' | 'worse' {
    const diff = project - baseline;
    const threshold = baseline * 0.05; // 5% 허용
    
    if (Math.abs(diff) < threshold) return 'same';
    
    if (lowerIsBetter) {
      return diff < 0 ? 'better' : 'worse';
    } else {
      return diff > 0 ? 'better' : 'worse';
    }
  }
  
  /**
   * 전체 상태 계산
   */
  private calculateOverallStatus(metrics: MetricsData, baseline: Baseline): 'passing' | 'warning' | 'failing' {
    const baselineQuality = baseline.qualityScore || 0;
    const baselineSecurity = baseline.securityScore || 0;
    
    // 보안 점수가 기준선보다 10점 이상 낮으면 failing
    if (metrics.security < baselineSecurity - 10) return 'failing';
    
    // 품질 점수가 기준선보다 20점 이상 낮으면 failing
    if (metrics.quality < baselineQuality - 20) return 'failing';
    
    // 경고 수준
    if (metrics.security < baselineSecurity - 5 || metrics.quality < baselineQuality - 10) {
      return 'warning';
    }
    
    return 'passing';
  }
}

interface MetricsData {
  complexity: number;
  debt: number;
  risk: number;
  quality: number;
  security: number;
  coverage: number;
  details: {
    totalIssues: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

interface MetricComparison {
  baseline: number;
  project: number;
  difference: number;
  status: 'better' | 'same' | 'worse';
}

export interface ComparisonResult {
  baselineId: string;
  baselineVersion: number;
  projectId: string;
  projectName: string;
  executionId: string;
  comparison: {
    complexity: MetricComparison;
    debt: MetricComparison;
    risk: MetricComparison;
    quality: MetricComparison;
    security: MetricComparison;
    coverage: MetricComparison;
  };
  overallStatus: 'passing' | 'warning' | 'failing';
  comparedAt: Date;
}

export const baselineService = new BaselineService();
