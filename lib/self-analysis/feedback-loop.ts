import { prisma } from '@/lib/db';
import { selfProjectService } from './self-project-service';
import { triggerService } from './trigger-service';
import { baselineService } from './baseline-service';
import { policyService } from './policy-service';
import { automationService } from './automation-service';

/**
 * FeedbackLoop - 학습 피드백 루프
 * 
 * 분석 결과를 학습하고, 품질 상승 시 기준선을 갱신하며,
 * 다른 프로젝트에 개선 사항을 전파합니다.
 */
export class FeedbackLoop {
  
  /**
   * 분석 완료 후 피드백 루프 실행
   */
  async processAnalysisCompletion(selfProjectId: string, executionId: string): Promise<FeedbackResult> {
    console.log(`[FeedbackLoop] Processing completion for execution: ${executionId}`);
    
    const result: FeedbackResult = {
      executionId,
      actions: [],
      baselineUpdated: false,
      backlogItemsCreated: 0,
      propagatedToProjects: 0
    };
    
    try {
      // 1. 백로그 자동 생성
      const backlogItems = await automationService.generateBacklogItems(selfProjectId, executionId);
      result.backlogItemsCreated = backlogItems.length;
      result.actions.push(`Created ${backlogItems.length} backlog items`);
      
      // 2. 기술 부채 업데이트
      await automationService.updateTechDebt(selfProjectId, executionId);
      result.actions.push('Updated tech debt metrics');
      
      // 3. 기준선 갱신 여부 평가
      const shouldUpdateBaseline = await this.evaluateBaselineUpdate(selfProjectId, executionId);
      if (shouldUpdateBaseline) {
        result.baselineUpdateRecommended = true;
        result.actions.push('Baseline update recommended');
      }
      
      // 4. 아키텍처 문서 갱신 요청
      const archUpdate = await automationService.requestArchitectureUpdate(selfProjectId, executionId);
      if (archUpdate) {
        result.actions.push('Architecture documentation update requested');
      }
      
      // 5. 분석 트리거 완료 처리
      await this.completeTriggerForExecution(executionId);
      
      console.log(`[FeedbackLoop] Completed processing: ${JSON.stringify(result)}`);
      
    } catch (error) {
      console.error('[FeedbackLoop] Error processing completion:', error);
      result.error = error instanceof Error ? error.message : String(error);
    }
    
    return result;
  }
  
  /**
   * 기준선 갱신 필요 여부 평가
   */
  async evaluateBaselineUpdate(selfProjectId: string, executionId: string): Promise<boolean> {
    const currentBaseline = await baselineService.getActiveBaseline(selfProjectId);
    
    if (!currentBaseline) {
      // 기준선이 없으면 생성 권장
      return true;
    }
    
    // 현재 실행과 기준선 비교
    const comparison = await baselineService.compareWithBaseline(currentBaseline.id, executionId);
    
    // 품질이 향상되었고, 승인되었다면 갱신 권장
    if (comparison.overallStatus === 'passing') {
      const improved = 
        comparison.comparison.quality.status === 'better' ||
        comparison.comparison.security.status === 'better';
      
      if (improved) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 관리자 승인 후 기준선 갱신
   */
  async approveBaselineUpdate(selfProjectId: string, executionId: string, approvedBy: string): Promise<void> {
    const newBaseline = await baselineService.createBaseline(selfProjectId, executionId);
    await baselineService.approveBaseline(newBaseline.id, approvedBy);
    
    console.log(`[FeedbackLoop] Baseline updated to v${newBaseline.version} by ${approvedBy}`);
    
    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        action: 'BASELINE_UPDATED',
        actorId: approvedBy,
        targetType: 'BASELINE',
        targetId: newBaseline.id,
        details: JSON.stringify({
          version: newBaseline.version,
          executionId
        })
      }
    });
  }
  
  /**
   * 다른 프로젝트에 개선 사항 전파
   */
  async propagateImprovements(selfProjectId: string): Promise<number> {
    const selfProject = await selfProjectService.getSelfProjectWithDetails();
    
    if (!selfProject) {
      throw new Error('Self project not found');
    }
    
    const activeBaseline = selfProject.baselines[0];
    if (!activeBaseline) {
      console.log('[FeedbackLoop] No active baseline to propagate');
      return 0;
    }
    
    // 다른 모든 프로젝트 조회
    const otherProjects = await prisma.project.findMany({
      where: {
        id: { not: selfProject.projectId }
      }
    });
    
    // 각 프로젝트의 RuleSet 업데이트
    let propagatedCount = 0;
    for (const project of otherProjects) {
      try {
        await this.propagateRulesToProject(project.id, activeBaseline);
        propagatedCount++;
      } catch (error) {
        console.error(`[FeedbackLoop] Failed to propagate to project ${project.id}:`, error);
      }
    }
    
    console.log(`[FeedbackLoop] Propagated improvements to ${propagatedCount} projects`);
    return propagatedCount;
  }
  
  /**
   * 특정 프로젝트에 규칙 전파
   */
  private async propagateRulesToProject(projectId: string, baseline: any): Promise<void> {
    // 기준선의 설정을 기반으로 RuleSet 생성/업데이트
    const metrics = baseline.metrics ? JSON.parse(baseline.metrics) : {};
    
    // 기존 "Self-Analysis Baseline" RuleSet 찾기 또는 생성
    let ruleSet = await prisma.ruleSet.findFirst({
      where: {
        projectId,
        name: 'Self-Analysis Baseline Rules'
      }
    });
    
    if (!ruleSet) {
      ruleSet = await prisma.ruleSet.create({
        data: {
          projectId,
          name: 'Self-Analysis Baseline Rules',
          description: `Self-Analysis 기준선 v${baseline.version}에서 전파된 규칙`,
          isActive: true
        }
      });
    }
    
    // 기본 규칙 추가 (품질 기준)
    const rules = [
      { key: 'max-complexity', config: JSON.stringify({ threshold: metrics.details?.byCategory?.architecture || 5 }), severity: 'MEDIUM', category: 'ARCHITECTURE' },
      { key: 'security-score', config: JSON.stringify({ minScore: baseline.securityScore || 80 }), severity: 'HIGH', category: 'SECURITY' },
      { key: 'quality-score', config: JSON.stringify({ minScore: baseline.qualityScore || 80 }), severity: 'MEDIUM', category: 'QUALITY' }
    ];
    
    for (const rule of rules) {
      const existingRule = await prisma.rule.findFirst({
        where: { ruleSetId: ruleSet.id, key: rule.key }
      });
      
      if (existingRule) {
        await prisma.rule.update({
          where: { id: existingRule.id },
          data: { config: rule.config }
        });
      } else {
        await prisma.rule.create({
          data: {
            ruleSetId: ruleSet.id,
            ...rule
          }
        });
      }
    }
  }
  
  /**
   * 실행에 연결된 트리거 완료 처리
   */
  private async completeTriggerForExecution(executionId: string): Promise<void> {
    const trigger = await prisma.analysisTrigger.findFirst({
      where: { executionId }
    });
    
    if (trigger) {
      await triggerService.completeTrigger(trigger.id, true);
    }
  }
  
  /**
   * 일일 스케줄 체크 및 실행
   */
  async runDailySchedule(): Promise<void> {
    const selfProject = await selfProjectService.getSelfProject();
    
    if (!selfProject) {
      console.log('[FeedbackLoop] No self project configured');
      return;
    }
    
    if (!selfProject.scheduleDaily) {
      console.log('[FeedbackLoop] Daily schedule is disabled');
      return;
    }
    
    // 오늘 이미 실행했는지 확인
    const alreadyRan = await triggerService.hasRunScheduledToday(selfProject.id);
    
    if (alreadyRan) {
      console.log('[FeedbackLoop] Daily analysis already ran today');
      return;
    }
    
    // 스케줄 트리거 실행
    await triggerService.triggerScheduled(selfProject.id);
    console.log('[FeedbackLoop] Daily scheduled analysis triggered');
  }
}

export interface FeedbackResult {
  executionId: string;
  actions: string[];
  baselineUpdated: boolean;
  baselineUpdateRecommended?: boolean;
  backlogItemsCreated: number;
  propagatedToProjects: number;
  error?: string;
}

export const feedbackLoop = new FeedbackLoop();
