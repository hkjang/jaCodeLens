import { prisma } from '@/lib/db';
import { AnalysisTrigger, SelfProject } from '@prisma/client';
import { AgentOrchestrator } from '@/lib/orchestrator';
import { agentConfigService } from '@/lib/agent-config-service';

/**
 * TriggerService - 분석 트리거 이벤트 처리
 * 
 * Git, CI, 배포, 스케줄, 수동 트리거를 처리하고
 * 분석 실행을 시작합니다.
 */
export class TriggerService {
  private orchestrator: AgentOrchestrator;
  
  constructor() {
    this.orchestrator = new AgentOrchestrator();
  }
  
  /**
   * 활성화된 에이전트 목록 조회 (Admin에서 설정)
   */
  private async getActiveAgentNames(): Promise<string[]> {
    const agents = await agentConfigService.getActiveAgentNames();
    console.log(`[TriggerService] Active agents from config: ${agents.join(', ')}`);
    return agents;
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
    const startTime = Date.now();
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🔬 SELF-ANALYSIS STARTED                                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    
    try {
      // Get project info for logging
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      console.log(`📂 Project: ${project?.name || projectId}`);
      console.log(`📍 Path: ${project?.path || 'unknown'}`);
      
      // 1. 트리거 상태 업데이트
      await prisma.analysisTrigger.update({
        where: { id: triggerId },
        data: { status: 'RUNNING' }
      });
      console.log('✓ Trigger status: RUNNING');
      
      // 2. 활성 에이전트 목록 조회 (Admin에서 설정)
      const activeAgents = await this.getActiveAgentNames();
      if (activeAgents.length === 0) {
        throw new Error('No active agents configured. Please enable agents in Admin > Agents.');
      }
      console.log(`🤖 Active Agents (${activeAgents.length}):`);
      activeAgents.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));
      
      // 3. 분석 실행 시작
      console.log('');
      console.log('🚀 Starting analysis execution...');
      const execution = await this.orchestrator.startAnalysis(projectId, activeAgents);
      
      // 4. 트리거에 실행 ID 연결
      await prisma.analysisTrigger.update({
        where: { id: triggerId },
        data: { executionId: execution.id }
      });
      
      const elapsed = Date.now() - startTime;
      console.log('');
      console.log(`✅ Analysis dispatched in ${elapsed}ms`);
      console.log(`   Execution ID: ${execution.id}`);
      console.log('   Agents are now processing in parallel...');
      console.log('');
      
      
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
  
  /**
   * 트리거 취소
   */
  async cancelTrigger(triggerId: string): Promise<AnalysisTrigger> {
    const trigger = await prisma.analysisTrigger.findUnique({
      where: { id: triggerId }
    });
    
    if (!trigger) {
      throw new Error(`Trigger not found: ${triggerId}`);
    }
    
    if (trigger.status === 'COMPLETED' || trigger.status === 'FAILED') {
      throw new Error('Cannot cancel a completed or failed trigger');
    }
    
    // Cancel the analysis execution if it exists
    if (trigger.executionId) {
      await this.orchestrator.cancelAnalysis(trigger.executionId);
    }
    
    return prisma.analysisTrigger.update({
      where: { id: triggerId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        errorMessage: 'Cancelled by user'
      }
    });
  }
  
  /**
   * 트리거 상세 조회 (에이전트 실행 정보 포함)
   */
  async getTriggerDetails(triggerId: string): Promise<TriggerDetails | null> {
    const trigger = await prisma.analysisTrigger.findUnique({
      where: { id: triggerId },
      include: {
        selfProject: {
          include: { project: true }
        }
      }
    });
    
    if (!trigger) return null;
    
    let agentProgress: AgentProgress[] = [];
    
    if (trigger.executionId) {
      const agentExecutions = await prisma.agentExecution.findMany({
        where: { executeId: trigger.executionId },
        include: { tasks: { orderBy: { startedAt: 'desc' } } },
        orderBy: { createdAt: 'asc' }
      });
      
      agentProgress = agentExecutions.map(ae => {
        // Get current running task (for file being analyzed)
        const runningTask = ae.tasks.find(t => t.status === 'RUNNING');
        // Get completed tasks for recent files
        const completedTasks = ae.tasks.filter(t => t.status === 'COMPLETED');
        // Get recent file targets (last 5)
        const recentFiles = completedTasks.slice(0, 5).map(t => t.target || '');
        
        return {
          name: ae.agentName,
          status: ae.status,
          durationMs: ae.durationMs,
          tokensUsed: ae.tokensUsed,
          modelName: this.getAgentModelName(ae.agentName),
          modelProvider: this.getAgentModelProvider(ae.agentName),
          tasksTotal: ae.tasks.length,
          tasksCompleted: completedTasks.length,
          currentFile: runningTask?.target?.split('/').pop() || null,
          currentFilePath: runningTask?.target || null,
          recentFiles: recentFiles.map(f => f.split('/').pop() || f),
          taskProgress: ae.tasks.length > 0 
            ? Math.round((completedTasks.length / ae.tasks.length) * 100)
            : 0
        };
      });
    }
    
    // Calculate overall progress more granularly
    const totalTasks = agentProgress.reduce((s, a) => s + (a.tasksTotal || 1), 0);
    const completedTasks = agentProgress.reduce((s, a) => s + (a.tasksCompleted || (a.status === 'COMPLETED' ? 1 : 0)), 0);
    
    // Get estimated file count from project (if available)
    let estimatedFileCount = 0;
    let projectName = '';
    try {
      if (trigger.selfProject?.project) {
        const project = trigger.selfProject.project;
        projectName = project.name;
        // Calculate estimated file count from project stats or use default
        // Try to get fileCount from project summary or use estimate
        const stats = project.summary ? JSON.parse(project.summary) : null;
        estimatedFileCount = stats?.fileCount || stats?.totalFiles || 50; // Default estimate
      }
    } catch (e) {
      estimatedFileCount = 50; // Fallback
    }
    
    // Calculate simulated file progress based on elapsed time and agent status
    const completedAgents = agentProgress.filter(a => a.status === 'COMPLETED').length;
    const runningAgents = agentProgress.filter(a => a.status === 'RUNNING').length;
    const totalAgents = agentProgress.length;
    
    // Estimate: each agent processes ~= total_files files
    // Completed agents = their file portion complete
    // Running agent = partially complete based on simulated time
    const elapsedMs = trigger.triggeredAt 
      ? Date.now() - new Date(trigger.triggeredAt).getTime() 
      : 0;
    
    // Simulate file progress for running agents (assume 2 files/second average)
    const filesPerAgent = Math.ceil(estimatedFileCount / Math.max(totalAgents, 1));
    const simulatedFilesInProgress = Math.min(
      Math.floor(elapsedMs / 500) % filesPerAgent, // Reset every agent
      filesPerAgent
    );
    
    const estimatedFilesCompleted = (completedAgents * filesPerAgent) + 
      (runningAgents > 0 ? simulatedFilesInProgress : 0);
    
    const progress = {
      total: agentProgress.length,
      completed: completedAgents,
      running: runningAgents,
      pending: agentProgress.filter(a => a.status === 'PENDING').length,
      failed: agentProgress.filter(a => a.status === 'FAILED').length,
      // Task-level progress
      totalTasks,
      completedTasks,
      taskPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      // File-level estimate for UI
      estimatedTotalFiles: estimatedFileCount,
      estimatedFilesCompleted: Math.min(estimatedFilesCompleted, estimatedFileCount),
      filePercent: estimatedFileCount > 0 
        ? Math.round((estimatedFilesCompleted / estimatedFileCount) * 100)
        : 0,
      projectName
    };
    
    return {
      trigger,
      progress,
      agents: agentProgress
    };
  }
  
  /**
   * 에이전트별 AI 모델 이름 반환 (DB에서 기본 모델 조회)
   */
  private async getDefaultModelInfo(): Promise<{ name: string; provider: string }> {
    const defaultModel = await prisma.aiModel.findFirst({
      where: { isDefault: true, isActive: true }
    });
    
    if (defaultModel) {
      return { name: defaultModel.name, provider: defaultModel.provider };
    }
    
    // 기본 모델이 없으면 활성화된 첫 번째 모델 사용
    const activeModel = await prisma.aiModel.findFirst({
      where: { isActive: true }
    });
    
    if (activeModel) {
      return { name: activeModel.name, provider: activeModel.provider };
    }
    
    return { name: 'unknown', provider: 'unknown' };
  }
  
  /**
   * 에이전트별 AI 모델 이름 반환 (현재 모든 에이전트가 동일한 기본 모델 사용)
   */
  private getAgentModelName(agentName: string): string {
    // 캐시된 기본 모델 이름 반환 (실제 값은 getTriggerDetails에서 비동기로 조회)
    return this.cachedDefaultModelName || 'qwen3:8b';
  }
  
  /**
   * 에이전트별 AI 프로바이더 반환
   */
  private getAgentModelProvider(agentName: string): string {
    return this.cachedDefaultModelProvider || 'Ollama';
  }
  
  // 캐시된 기본 모델 정보
  private cachedDefaultModelName: string = '';
  private cachedDefaultModelProvider: string = '';
  
  /**
   * 기본 모델 정보 캐시 갱신
   */
  async refreshModelCache(): Promise<void> {
    const info = await this.getDefaultModelInfo();
    this.cachedDefaultModelName = info.name;
    this.cachedDefaultModelProvider = info.provider;
  }
}

export const triggerService = new TriggerService();

// Type definitions
export interface AgentProgress {
  name: string;
  status: string;
  durationMs: number | null;
  tokensUsed: number | null;
  modelName: string;
  modelProvider: string;
  tasksTotal: number;
  tasksCompleted: number;
}

export interface TriggerDetails {
  trigger: any;
  progress: {
    total: number;
    completed: number;
    running: number;
    pending: number;
    failed: number;
  };
  agents: AgentProgress[];
}
