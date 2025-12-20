import { prisma } from '@/lib/db';
import { SelfAnalysisPolicy, AnalysisResult } from '@prisma/client';

/**
 * PolicyService - Self-Analysis 전용 분석 정책 관리
 * 
 * 실패 허용 Zero, 엄격한 경고 임계치, 휴먼 승인 필수 등
 * 내부 프로젝트에 적용되는 엄격한 정책을 관리합니다.
 */
export class PolicyService {
  
  /**
   * 분석 정책 조회
   */
  async getActivePolicy(selfProjectId: string): Promise<SelfAnalysisPolicy | null> {
    return prisma.selfAnalysisPolicy.findFirst({
      where: { selfProjectId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  /**
   * 모든 정책 조회
   */
  async getAllPolicies(selfProjectId: string): Promise<SelfAnalysisPolicy[]> {
    return prisma.selfAnalysisPolicy.findMany({
      where: { selfProjectId },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  /**
   * 정책 생성
   */
  async createPolicy(selfProjectId: string, data: {
    name: string;
    failureTolerance?: number;
    warningThreshold?: number;
    confidenceWeight?: number;
    requireExplanation?: boolean;
    requireHumanApproval?: boolean;
    blockOnThresholdExceeded?: boolean;
    agentSettings?: Record<string, any>;
  }): Promise<SelfAnalysisPolicy> {
    return prisma.selfAnalysisPolicy.create({
      data: {
        selfProjectId,
        name: data.name,
        failureTolerance: data.failureTolerance ?? 0,
        warningThreshold: data.warningThreshold ?? 0.8,
        confidenceWeight: data.confidenceWeight ?? 1.0,
        requireExplanation: data.requireExplanation ?? true,
        requireHumanApproval: data.requireHumanApproval ?? true,
        blockOnThresholdExceeded: data.blockOnThresholdExceeded ?? true,
        agentSettings: data.agentSettings ? JSON.stringify(data.agentSettings) : null
      }
    });
  }
  
  /**
   * 정책 업데이트
   */
  async updatePolicy(id: string, data: Partial<{
    name: string;
    isActive: boolean;
    failureTolerance: number;
    warningThreshold: number;
    confidenceWeight: number;
    requireExplanation: boolean;
    requireHumanApproval: boolean;
    blockOnThresholdExceeded: boolean;
    agentSettings: Record<string, any>;
  }>): Promise<SelfAnalysisPolicy> {
    const updateData: any = { ...data };
    if (data.agentSettings) {
      updateData.agentSettings = JSON.stringify(data.agentSettings);
    }
    
    return prisma.selfAnalysisPolicy.update({
      where: { id },
      data: updateData
    });
  }
  
  /**
   * 정책 활성화/비활성화
   */
  async setActivePolicy(selfProjectId: string, policyId: string): Promise<void> {
    // 모든 정책 비활성화
    await prisma.selfAnalysisPolicy.updateMany({
      where: { selfProjectId },
      data: { isActive: false }
    });
    
    // 선택된 정책 활성화
    await prisma.selfAnalysisPolicy.update({
      where: { id: policyId },
      data: { isActive: true }
    });
  }
  
  /**
   * 분석 결과 정책 검증
   * 정책 위반 시 상세 결과 반환
   */
  async validateResults(selfProjectId: string, results: AnalysisResult[]): Promise<PolicyValidationResult> {
    const policy = await this.getActivePolicy(selfProjectId);
    
    if (!policy) {
      return {
        passed: true,
        violations: [],
        warnings: [],
        requiresApproval: false,
        shouldBlockRelease: false
      };
    }
    
    const violations: PolicyViolation[] = [];
    const warnings: PolicyWarning[] = [];
    
    // 1. 실패 허용 검사
    const failedResults = results.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH');
    if (failedResults.length > policy.failureTolerance) {
      violations.push({
        rule: 'failureTolerance',
        message: `심각한 이슈가 ${failedResults.length}개 발견됨 (허용: ${policy.failureTolerance})`,
        count: failedResults.length,
        threshold: policy.failureTolerance
      });
    }
    
    // 2. 경고 임계치 검사
    const warningResults = results.filter(r => r.severity === 'MEDIUM');
    const warningRatio = results.length > 0 ? warningResults.length / results.length : 0;
    if (warningRatio > (1 - policy.warningThreshold)) {
      warnings.push({
        rule: 'warningThreshold',
        message: `경고 비율이 높음: ${(warningRatio * 100).toFixed(1)}%`,
        ratio: warningRatio
      });
    }
    
    // 3. 신뢰도 검사
    const lowConfidenceResults = results.filter(r => r.confidenceScore < policy.confidenceWeight);
    if (lowConfidenceResults.length > 0) {
      warnings.push({
        rule: 'confidenceWeight',
        message: `신뢰도가 낮은 분석 결과: ${lowConfidenceResults.length}개`,
        count: lowConfidenceResults.length
      });
    }
    
    // 4. 설명 필수 검사
    if (policy.requireExplanation) {
      const noReasoningResults = results.filter(r => 
        (r.severity === 'HIGH' || r.severity === 'CRITICAL') && !r.reasoning
      );
      if (noReasoningResults.length > 0) {
        warnings.push({
          rule: 'requireExplanation',
          message: `설명이 누락된 중요 이슈: ${noReasoningResults.length}개`,
          count: noReasoningResults.length
        });
      }
    }
    
    const passed = violations.length === 0;
    const shouldBlockRelease = policy.blockOnThresholdExceeded && !passed;
    
    return {
      passed,
      violations,
      warnings,
      requiresApproval: policy.requireHumanApproval,
      shouldBlockRelease,
      policy: {
        id: policy.id,
        name: policy.name
      }
    };
  }
  
  /**
   * 에이전트별 설정 파싱
   */
  parseAgentSettings(policy: SelfAnalysisPolicy): Record<string, any> {
    try {
      return policy.agentSettings ? JSON.parse(policy.agentSettings) : {};
    } catch {
      return {};
    }
  }
  
  /**
   * 특정 에이전트 설정 조회
   */
  async getAgentSettings(selfProjectId: string, agentName: string): Promise<Record<string, any>> {
    const policy = await this.getActivePolicy(selfProjectId);
    if (!policy) return {};
    
    const settings = this.parseAgentSettings(policy);
    
    // 에이전트 이름에서 키 추출 (e.g., "SecurityAnalysisAgent" -> "security")
    const key = agentName.replace('AnalysisAgent', '').toLowerCase();
    return settings[key] || {};
  }
}

export interface PolicyViolation {
  rule: string;
  message: string;
  count?: number;
  threshold?: number;
}

export interface PolicyWarning {
  rule: string;
  message: string;
  ratio?: number;
  count?: number;
}

export interface PolicyValidationResult {
  passed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  requiresApproval: boolean;
  shouldBlockRelease: boolean;
  policy?: {
    id: string;
    name: string;
  };
}

export const policyService = new PolicyService();
