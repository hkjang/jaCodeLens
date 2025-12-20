import { prisma } from '@/lib/db';
import { BacklogItem, AnalysisResult } from '@prisma/client';
import { policyService, PolicyValidationResult } from './policy-service';
import { baselineService } from './baseline-service';

/**
 * AutomationService - 결과 기반 자동화
 * 
 * 분석 결과를 바탕으로 백로그 생성, 기술 부채 추적,
 * 릴리즈 차단 판단 등을 자동화합니다.
 */
export class AutomationService {
  
  /**
   * 분석 결과에서 백로그 아이템 자동 생성
   */
  async generateBacklogItems(selfProjectId: string, executionId: string): Promise<BacklogItem[]> {
    const execution = await prisma.analysisExecute.findUnique({
      where: { id: executionId },
      include: { results: true }
    });
    
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    const createdItems: BacklogItem[] = [];
    
    // HIGH, CRITICAL 이슈만 자동 백로그 생성
    const importantResults = execution.results.filter(
      r => r.severity === 'CRITICAL' || r.severity === 'HIGH'
    );
    
    for (const result of importantResults) {
      // 이미 존재하는 백로그 아이템 확인
      const existing = await prisma.backlogItem.findFirst({
        where: { selfProjectId, sourceResultId: result.id }
      });
      
      if (existing) continue;
      
      const item = await prisma.backlogItem.create({
        data: {
          selfProjectId,
          title: this.generateBacklogTitle(result),
          description: this.generateBacklogDescription(result),
          category: this.mapToBacklogCategory(result.category),
          priority: this.mapToPriority(result.severity),
          status: 'OPEN',
          sourceResultId: result.id,
          estimatedHours: this.estimateHours(result)
        }
      });
      
      createdItems.push(item);
    }
    
    console.log(`[Automation] Created ${createdItems.length} backlog items`);
    return createdItems;
  }
  
  /**
   * 백로그 목록 조회
   */
  async getBacklogItems(selfProjectId: string, filter?: {
    status?: string;
    category?: string;
    priority?: string;
  }): Promise<BacklogItem[]> {
    const where: any = { selfProjectId };
    
    if (filter?.status) where.status = filter.status;
    if (filter?.category) where.category = filter.category;
    if (filter?.priority) where.priority = filter.priority;
    
    return prisma.backlogItem.findMany({
      where,
      orderBy: [
        { priority: 'asc' }, // CRITICAL first
        { createdAt: 'desc' }
      ]
    });
  }
  
  /**
   * 백로그 아이템 상태 업데이트
   */
  async updateBacklogStatus(id: string, status: string, assignedTo?: string): Promise<BacklogItem> {
    const data: any = { status };
    
    if (assignedTo) data.assignedTo = assignedTo;
    if (status === 'RESOLVED') data.resolvedAt = new Date();
    
    return prisma.backlogItem.update({
      where: { id },
      data
    });
  }
  
  /**
   * 기술 부채 갱신
   */
  async updateTechDebt(selfProjectId: string, executionId: string): Promise<void> {
    const selfProject = await prisma.selfProject.findUnique({
      where: { id: selfProjectId },
      include: { project: true }
    });
    
    if (!selfProject) {
      throw new Error(`SelfProject not found: ${selfProjectId}`);
    }
    
    // 기존 debt.ts의 aggregateTechDebt 호출
    const { aggregateTechDebt } = await import('@/lib/debt');
    await aggregateTechDebt(selfProject.projectId);
    
    console.log(`[Automation] Tech debt updated for project: ${selfProject.project.name}`);
  }
  
  /**
   * 릴리즈 차단 여부 판단
   */
  async shouldBlockRelease(selfProjectId: string, executionId: string): Promise<ReleaseDecision> {
    const execution = await prisma.analysisExecute.findUnique({
      where: { id: executionId },
      include: { results: true }
    });
    
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    // 정책 검증
    const validation = await policyService.validateResults(selfProjectId, execution.results);
    
    // 기준선 비교
    const baseline = await baselineService.getActiveBaseline(selfProjectId);
    let baselineComparison = null;
    
    if (baseline) {
      baselineComparison = await baselineService.compareWithBaseline(baseline.id, executionId);
    }
    
    const shouldBlock = validation.shouldBlockRelease || 
      (baselineComparison?.overallStatus === 'failing');
    
    return {
      blocked: shouldBlock,
      reason: shouldBlock ? this.getReleaseBlockReason(validation, baselineComparison) : null,
      validation,
      baselineComparison,
      requiresApproval: validation.requiresApproval,
      canOverride: !shouldBlock || validation.violations.length <= 1
    };
  }
  
  /**
   * 아키텍처 문서 갱신 요청 생성
   */
  async requestArchitectureUpdate(selfProjectId: string, executionId: string): Promise<BacklogItem | null> {
    const execution = await prisma.analysisExecute.findUnique({
      where: { id: executionId },
      include: { results: true }
    });
    
    if (!execution) return null;
    
    // ARCHITECTURE 카테고리 이슈가 있으면 문서 갱신 요청
    const archIssues = execution.results.filter(r => r.category === 'ARCHITECTURE');
    
    if (archIssues.length === 0) return null;
    
    // 기존 문서 갱신 요청 확인
    const existing = await prisma.backlogItem.findFirst({
      where: {
        selfProjectId,
        category: 'IMPROVEMENT',
        title: { contains: '아키텍처 문서 갱신' },
        status: 'OPEN'
      }
    });
    
    if (existing) {
      // 기존 아이템 업데이트
      return prisma.backlogItem.update({
        where: { id: existing.id },
        data: {
          description: this.generateArchDocDescription(archIssues)
        }
      });
    }
    
    // 새 백로그 아이템 생성
    return prisma.backlogItem.create({
      data: {
        selfProjectId,
        title: '아키텍처 문서 갱신 필요',
        description: this.generateArchDocDescription(archIssues),
        category: 'IMPROVEMENT',
        priority: 'MEDIUM',
        status: 'OPEN',
        estimatedHours: 4
      }
    });
  }
  
  // === Helper Methods ===
  
  private generateBacklogTitle(result: AnalysisResult): string {
    const prefix = result.severity === 'CRITICAL' ? '🚨' : '⚠️';
    const file = result.filePath ? ` in ${result.filePath}` : '';
    return `${prefix} [${result.category}] ${result.message.slice(0, 50)}${file}`;
  }
  
  private generateBacklogDescription(result: AnalysisResult): string {
    let desc = `## 문제\n${result.message}\n\n`;
    
    if (result.filePath) {
      desc += `## 위치\n- 파일: \`${result.filePath}\`\n`;
      if (result.lineNumber) {
        desc += `- 라인: ${result.lineNumber}\n`;
      }
    }
    
    if (result.suggestion) {
      desc += `\n## 제안된 해결책\n${result.suggestion}\n`;
    }
    
    if (result.reasoning) {
      desc += `\n## AI 분석 근거\n${result.reasoning}\n`;
    }
    
    return desc;
  }
  
  private mapToBacklogCategory(resultCategory: string): string {
    const mapping: Record<string, string> = {
      'SECURITY': 'SECURITY',
      'QUALITY': 'BUG',
      'ARCHITECTURE': 'TECH_DEBT',
      'PERFORMANCE': 'IMPROVEMENT',
      'OPERATIONS': 'IMPROVEMENT'
    };
    return mapping[resultCategory] || 'IMPROVEMENT';
  }
  
  private mapToPriority(severity: string): string {
    const mapping: Record<string, string> = {
      'CRITICAL': 'CRITICAL',
      'HIGH': 'HIGH',
      'MEDIUM': 'MEDIUM',
      'LOW': 'LOW',
      'INFO': 'LOW'
    };
    return mapping[severity] || 'MEDIUM';
  }
  
  private estimateHours(result: AnalysisResult): number {
    const baseHours: Record<string, number> = {
      'CRITICAL': 8,
      'HIGH': 4,
      'MEDIUM': 2,
      'LOW': 1,
      'INFO': 0.5
    };
    
    let hours = baseHours[result.severity] || 2;
    
    // 카테고리별 가중치
    if (result.category === 'ARCHITECTURE') hours *= 2;
    if (result.category === 'SECURITY') hours *= 1.5;
    
    return Math.ceil(hours);
  }
  
  private getReleaseBlockReason(
    validation: PolicyValidationResult, 
    comparison: any
  ): string {
    const reasons: string[] = [];
    
    if (validation.violations.length > 0) {
      reasons.push(`정책 위반: ${validation.violations.map(v => v.message).join(', ')}`);
    }
    
    if (comparison?.overallStatus === 'failing') {
      reasons.push('기준선 대비 품질 저하');
    }
    
    return reasons.join('; ');
  }
  
  private generateArchDocDescription(issues: AnalysisResult[]): string {
    let desc = '## 아키텍처 이슈 요약\n\n';
    
    for (const issue of issues.slice(0, 5)) {
      desc += `- **${issue.message}**\n`;
      if (issue.suggestion) {
        desc += `  - 제안: ${issue.suggestion}\n`;
      }
    }
    
    if (issues.length > 5) {
      desc += `\n외 ${issues.length - 5}개 이슈...\n`;
    }
    
    desc += '\n## 작업 내용\n';
    desc += '- [ ] 영향받는 컴포넌트 문서화\n';
    desc += '- [ ] 다이어그램 갱신\n';
    desc += '- [ ] README 업데이트\n';
    
    return desc;
  }
}

export interface ReleaseDecision {
  blocked: boolean;
  reason: string | null;
  validation: PolicyValidationResult;
  baselineComparison: any;
  requiresApproval: boolean;
  canOverride: boolean;
}

export const automationService = new AutomationService();
