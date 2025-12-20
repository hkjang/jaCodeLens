import { prisma } from '@/lib/db';
import { SelfProject, Project } from '@prisma/client';
import path from 'path';

/**
 * SelfProjectService - 기본 프로젝트 자동 등록 및 관리
 * 
 * 시스템 초기화 시 현재 서비스 자체를 자동으로 등록하고
 * 삭제 불가 정책을 적용합니다.
 */
export class SelfProjectService {
  
  /**
   * 시스템 초기화 시 자동 등록
   * 현재 서비스 경로를 자동으로 감지하여 등록
   */
  async initializeSelfProject(): Promise<SelfProject> {
    const servicePath = process.cwd();
    const serviceName = 'JacodeLens';
    
    console.log(`[SelfProject] Initializing self-analysis for: ${servicePath}`);
    
    // 1. 기존 Self Project 확인
    const existingSelf = await this.getSelfProject();
    if (existingSelf) {
      console.log(`[SelfProject] Already registered: ${existingSelf.id}`);
      return existingSelf;
    }
    
    // 2. Project 확인 또는 생성
    let project = await prisma.project.findUnique({
      where: { path: servicePath }
    });
    
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: serviceName,
          path: servicePath,
          description: 'JacodeLens 서비스 자체 분석용 기본 프로젝트',
          type: 'NEXTJS',
          tier: 'ENTERPRISE'
        }
      });
      console.log(`[SelfProject] Created project: ${project.id}`);
    }
    
    // 3. SelfProject 생성
    const selfProject = await prisma.selfProject.create({
      data: {
        projectId: project.id,
        type: 'internal-core',
        undeletable: true,
        tags: JSON.stringify(['self', 'reference', 'baseline']),
        visibility: 'admin-only',
        registeredBy: 'SYSTEM',
        triggerOnPush: true,
        triggerOnMerge: true,
        triggerOnBuild: true,
        triggerOnDeploy: true,
        scheduleDaily: true
      }
    });
    
    console.log(`[SelfProject] Self-Analysis project registered: ${selfProject.id}`);
    
    // 4. 기본 정책 생성
    await this.createDefaultPolicy(selfProject.id);
    
    return selfProject;
  }
  
  /**
   * Self Project 조회
   */
  async getSelfProject(): Promise<SelfProject | null> {
    return prisma.selfProject.findFirst({
      where: { type: 'internal-core' }
    });
  }
  
  /**
   * Self Project 상세 조회 (Project, Baseline 포함)
   */
  async getSelfProjectWithDetails() {
    return prisma.selfProject.findFirst({
      where: { type: 'internal-core' },
      include: {
        project: true,
        baselines: {
          where: { status: 'ACTIVE' },
          orderBy: { version: 'desc' },
          take: 1
        },
        policies: {
          where: { isActive: true }
        }
      }
    });
  }
  
  /**
   * 삭제 시도 방지
   */
  async deleteSelfProject(id: string): Promise<{ success: boolean; error?: string }> {
    const selfProject = await prisma.selfProject.findUnique({
      where: { id }
    });
    
    if (!selfProject) {
      return { success: false, error: 'SelfProject not found' };
    }
    
    if (selfProject.undeletable) {
      return { success: false, error: 'Self-Analysis 기본 프로젝트는 삭제할 수 없습니다.' };
    }
    
    // 실제로 삭제 불가능하도록 항상 실패 반환
    return { success: false, error: 'Internal core project cannot be deleted' };
  }
  
  /**
   * 태그 업데이트 (제한적)
   */
  async updateTags(id: string, newTags: string[]): Promise<SelfProject> {
    // 필수 태그는 항상 유지
    const requiredTags = ['self', 'reference', 'baseline'];
    const allTags = [...new Set([...requiredTags, ...newTags])];
    
    return prisma.selfProject.update({
      where: { id },
      data: { tags: JSON.stringify(allTags) }
    });
  }
  
  /**
   * 트리거 설정 업데이트
   */
  async updateTriggerSettings(id: string, settings: {
    triggerOnPush?: boolean;
    triggerOnMerge?: boolean;
    triggerOnBuild?: boolean;
    triggerOnDeploy?: boolean;
    scheduleDaily?: boolean;
  }): Promise<SelfProject> {
    return prisma.selfProject.update({
      where: { id },
      data: settings
    });
  }
  
  /**
   * 가시성 업데이트 (관리자 전용)
   */
  async updateVisibility(id: string, visibility: 'admin-only' | 'operator' | 'all'): Promise<SelfProject> {
    return prisma.selfProject.update({
      where: { id },
      data: { visibility }
    });
  }
  
  /**
   * 기본 분석 정책 생성
   */
  private async createDefaultPolicy(selfProjectId: string) {
    const existingPolicy = await prisma.selfAnalysisPolicy.findFirst({
      where: { selfProjectId, name: 'Default Strict Policy' }
    });
    
    if (existingPolicy) {
      return existingPolicy;
    }
    
    return prisma.selfAnalysisPolicy.create({
      data: {
        selfProjectId,
        name: 'Default Strict Policy',
        isActive: true,
        failureTolerance: 0,          // 실패 허용 Zero
        warningThreshold: 0.8,        // 엄격한 임계치
        confidenceWeight: 1.0,        // 최고 신뢰도
        requireExplanation: true,     // 설명 필수
        requireHumanApproval: true,   // 휴먼 승인 필수
        blockOnThresholdExceeded: true, // 임계 초과 시 배포 차단
        agentSettings: JSON.stringify({
          structure: { baseline: true, strict: true },
          quality: { threshold: 90, zeroWarnings: false },
          security: { maxSeverity: 'LOW', zeroVulnerabilities: true },
          dependency: { zeroCycles: true, outdatedDays: 30 },
          test: { coverageTarget: 80, required: true },
          history: { riskTracking: true }
        })
      }
    });
  }
  
  /**
   * 파싱된 태그 배열 반환
   */
  parseTags(selfProject: SelfProject): string[] {
    try {
      return JSON.parse(selfProject.tags);
    } catch {
      return ['self', 'reference', 'baseline'];
    }
  }
}

export const selfProjectService = new SelfProjectService();
