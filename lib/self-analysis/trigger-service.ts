import { prisma } from '@/lib/db';
import { AnalysisTrigger, SelfProject } from '@prisma/client';
import { AgentOrchestrator } from '@/lib/orchestrator';

/**
 * TriggerService - 분석 트리거 이벤트 처리
 * 
 * Git, CI, 배포, 스케줄, 수동 트리거를 처리하고
 * 분석 실행을 시작합니다.
 */
export class TriggerService {
  private orchestrator: AgentOrchestrator;
  
  // 분석에 사용할 기본 에이전트 목록
  private readonly defaultAgents = [
    'StructureAnalysisAgent',
    'QualityAnalysisAgent',
    'SecurityAnalysisAgent',
    'DependencyAnalysisAgent',
    'StyleAnalysisAgent',
    'TestAnalysisAgent'
  ];
  
  constructor() {
    this.orchestrator = new AgentOrchestrator();
  }
  
  /**
   * Git Push 이벤트 트리거
   */
  async triggerOnPush(selfProjectId: string, commitSha: string, triggeredBy?: string): Promise<AnalysisTrigger> {
    return this.createAndExecuteTrigger(selfProjectId, 'GIT_PUSH', commitSha, triggeredBy);
  }
  
  /**
   * Git Merge 이벤트 트리거
   */
  async triggerOnMerge(selfProjectId: string, mergeCommitSha: string, triggeredBy?: string): Promise<AnalysisTrigger> {
    return this.createAndExecuteTrigger(selfProjectId, 'GIT_MERGE', mergeCommitSha, triggeredBy);
  }
  
  /**
   * CI Build 성공 이벤트 트리거
   */
  async triggerOnBuild(selfProjectId: string, buildId: string, triggeredBy?: string): Promise<AnalysisTrigger> {
    return this.createAndExecuteTrigger(selfProjectId, 'CI_BUILD', buildId, triggeredBy);
  }
  
  /**
   * 배포 이벤트 트리거
   */
  async triggerOnDeploy(selfProjectId: string, releaseVersion: string, triggeredBy?: string): Promise<AnalysisTrigger> {
    return this.createAndExecuteTrigger(selfProjectId, 'DEPLOY', releaseVersion, triggeredBy);
  }
  
  /**
   * 스케줄 트리거 (일 1회)
   */
  async triggerScheduled(selfProjectId: string): Promise<AnalysisTrigger> {
    return this.createAndExecuteTrigger(selfProjectId, 'SCHEDULE', new Date().toISOString(), 'SCHEDULER');
  }
  
  /**
   * 수동 트리거 (관리자)
   */
  async triggerManual(selfProjectId: string, triggeredBy: string): Promise<AnalysisTrigger> {
    return this.createAndExecuteTrigger(selfProjectId, 'MANUAL', null, triggeredBy);
  }
  
  /**
   * 트리거 생성 및 실행
   */
  private async createAndExecuteTrigger(
    selfProjectId: string,
    type: string,
    source: string | null,
    triggeredBy?: string
  ): Promise<AnalysisTrigger> {
    // 1. Self Project 확인
    const selfProject = await prisma.selfProject.findUnique({
      where: { id: selfProjectId },
      include: { project: true }
    });
    
    if (!selfProject) {
      throw new Error(`SelfProject not found: ${selfProjectId}`);
    }
    
    // 2. 트리거 설정 확인
    if (!this.isTriggerEnabled(selfProject, type)) {
      console.log(`[Trigger] ${type} is disabled for this project`);
      throw new Error(`Trigger type ${type} is disabled`);
    }
    
    // 3. 트리거 레코드 생성
    const trigger = await prisma.analysisTrigger.create({
      data: {
        selfProjectId,
        type,
        source,
        status: 'PENDING',
        triggeredBy
      }
    });
    
    console.log(`[Trigger] Created trigger: ${trigger.id} (${type})`);
    
    // 4. 분석 실행 시작 (비동기)
    this.executeAnalysis(trigger.id, selfProject.projectId).catch(err => {
      console.error(`[Trigger] Analysis execution failed:`, err);
    });
    
    return trigger;
  }
  
  /**
   * 트리거 활성화 여부 확인
   */
  private isTriggerEnabled(selfProject: SelfProject, type: string): boolean {
    switch (type) {
      case 'GIT_PUSH':
        return selfProject.triggerOnPush;
      case 'GIT_MERGE':
        return selfProject.triggerOnMerge;
      case 'CI_BUILD':
        return selfProject.triggerOnBuild;
      case 'DEPLOY':
        return selfProject.triggerOnDeploy;
      case 'SCHEDULE':
        return selfProject.scheduleDaily;
      case 'MANUAL':
        return true; // 수동 트리거는 항상 허용
      default:
        return false;
    }
  }
  
  /**
   * 분석 실행
   */
  private async executeAnalysis(triggerId: string, projectId: string): Promise<void> {
    try {
      // 1. 트리거 상태 업데이트
      await prisma.analysisTrigger.update({
        where: { id: triggerId },
        data: { status: 'RUNNING' }
      });
      
      // 2. 분석 실행 시작
      const execution = await this.orchestrator.startAnalysis(projectId, this.defaultAgents);
      
      // 3. 트리거에 실행 ID 연결
      await prisma.analysisTrigger.update({
        where: { id: triggerId },
        data: { executionId: execution.id }
      });
      
      console.log(`[Trigger] Analysis started: ${execution.id}`);
      
    } catch (error) {
      // 에러 발생 시 트리거 실패 처리
      await prisma.analysisTrigger.update({
        where: { id: triggerId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }
  
  /**
   * 트리거 완료 처리
   */
  async completeTrigger(triggerId: string, success: boolean, errorMessage?: string): Promise<AnalysisTrigger> {
    return prisma.analysisTrigger.update({
      where: { id: triggerId },
      data: {
        status: success ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
        errorMessage
      }
    });
  }
  
  /**
   * 트리거 히스토리 조회
   */
  async getTriggerHistory(selfProjectId: string, limit: number = 20): Promise<AnalysisTrigger[]> {
    return prisma.analysisTrigger.findMany({
      where: { selfProjectId },
      orderBy: { triggeredAt: 'desc' },
      take: limit
    });
  }
  
  /**
   * 대기 중인 트리거 조회
   */
  async getPendingTriggers(): Promise<AnalysisTrigger[]> {
    return prisma.analysisTrigger.findMany({
      where: { status: { in: ['PENDING', 'RUNNING'] } },
      orderBy: { triggeredAt: 'asc' }
    });
  }
  
  /**
   * 오늘 스케줄 트리거 실행 여부 확인
   */
  async hasRunScheduledToday(selfProjectId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const count = await prisma.analysisTrigger.count({
      where: {
        selfProjectId,
        type: 'SCHEDULE',
        triggeredAt: { gte: today }
      }
    });
    
    return count > 0;
  }
}

export const triggerService = new TriggerService();
