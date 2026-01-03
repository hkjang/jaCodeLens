/**
 * 분석 신뢰도 산정 로직
 * 
 * 분석 결과의 신뢰도를 다차원으로 산정합니다.
 * - 정적 분석 비율
 * - AI 개입 가중치
 * - 근거 수
 * - 재현성
 * - 변경 민감도
 */

import { NormalizedResult, Severity, MainCategory } from '../types';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ConfidenceScore {
  overall: number;          // 종합 신뢰도 (0-1)
  components: {
    staticRatio: number;    // 정적 분석 비율
    aiWeight: number;       // AI 신뢰도 가중치
    evidenceCount: number;  // 근거 기반 점수
    reproducibility: number; // 재현성 점수
    sensitivity: number;    // 변경 민감도
  };
  details: string[];        // 상세 설명
}

export interface ConfidenceConfig {
  weights: {
    staticRatio: number;
    aiWeight: number;
    evidenceCount: number;
    reproducibility: number;
    sensitivity: number;
  };
  thresholds: {
    high: number;           // 높은 신뢰도 기준
    medium: number;         // 중간 신뢰도 기준
    low: number;            // 낮은 신뢰도 기준
  };
  evidenceMinCount: number; // 최소 근거 수
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

const DEFAULT_CONFIG: ConfidenceConfig = {
  weights: {
    staticRatio: 0.30,
    aiWeight: 0.25,
    evidenceCount: 0.20,
    reproducibility: 0.15,
    sensitivity: 0.10,
  },
  thresholds: {
    high: 0.8,
    medium: 0.6,
    low: 0.4,
  },
  evidenceMinCount: 3,
};

// ============================================================================
// 신뢰도 산정기
// ============================================================================

export class ConfidenceCalculator {
  private config: ConfidenceConfig;

  constructor(config?: Partial<ConfidenceConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      weights: { ...DEFAULT_CONFIG.weights, ...config?.weights },
      thresholds: { ...DEFAULT_CONFIG.thresholds, ...config?.thresholds },
    };
  }

  /**
   * 단일 결과 신뢰도 산정
   */
  calculate(result: NormalizedResult, context?: {
    previousResults?: NormalizedResult[];
    codeChanged?: boolean;
  }): ConfidenceScore {
    const components = {
      staticRatio: this.calculateStaticRatio(result),
      aiWeight: this.calculateAIWeight(result),
      evidenceCount: this.calculateEvidenceScore(result),
      reproducibility: this.calculateReproducibility(result, context?.previousResults),
      sensitivity: this.calculateSensitivity(result, context?.codeChanged),
    };

    const overall = 
      components.staticRatio * this.config.weights.staticRatio +
      components.aiWeight * this.config.weights.aiWeight +
      components.evidenceCount * this.config.weights.evidenceCount +
      components.reproducibility * this.config.weights.reproducibility +
      components.sensitivity * this.config.weights.sensitivity;

    const details = this.generateDetails(components, result);

    return { overall, components, details };
  }

  /**
   * 신뢰도 수준 판정
   */
  getLevel(score: number): ConfidenceLevel {
    if (score >= this.config.thresholds.high) return 'HIGH';
    if (score >= this.config.thresholds.medium) return 'MEDIUM';
    if (score >= this.config.thresholds.low) return 'LOW';
    return 'VERY_LOW';
  }

  /**
   * 전체 결과 집합 신뢰도
   */
  calculateBatch(results: NormalizedResult[]): {
    average: number;
    distribution: Record<ConfidenceLevel, number>;
    lowConfidenceResults: NormalizedResult[];
  } {
    if (results.length === 0) {
      return {
        average: 0,
        distribution: { HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0 },
        lowConfidenceResults: [],
      };
    }

    const scores = results.map(r => this.calculate(r));
    const average = scores.reduce((sum, s) => sum + s.overall, 0) / scores.length;

    const distribution: Record<ConfidenceLevel, number> = {
      HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0,
    };

    for (const score of scores) {
      distribution[this.getLevel(score.overall)]++;
    }

    const lowConfidenceResults = results.filter((_, i) => 
      scores[i].overall < this.config.thresholds.low
    );

    return { average, distribution, lowConfidenceResults };
  }

  /**
   * 정적 분석 비율 계산
   */
  private calculateStaticRatio(result: NormalizedResult): number {
    // AI 보강이 없으면 100% 정적
    if (!result.aiExplanation && !result.aiSuggestion && !result.aiSecurityAdvice) {
      return 1.0;
    }

    // AI 보강이 있으면 deterministic 플래그 확인
    if (result.deterministic) {
      return 0.8; // 정적 결과 + AI 보강
    }

    // 순수 AI 결과
    return 0.3;
  }

  /**
   * AI 신뢰도 가중치 계산
   */
  private calculateAIWeight(result: NormalizedResult): number {
    const rawResult = result.rawResult as Record<string, unknown>;
    
    // AI 신뢰도가 명시된 경우
    if (typeof rawResult?.confidence === 'number') {
      return rawResult.confidence as number;
    }

    // AI 보강이 없으면 정적 분석이므로 높은 신뢰도
    if (!result.aiExplanation) {
      return 1.0;
    }

    // 기본 AI 신뢰도
    return 0.7;
  }

  /**
   * 근거 점수 계산
   */
  private calculateEvidenceScore(result: NormalizedResult): number {
    let evidenceCount = 0;

    // 위치 정보
    if (result.lineStart > 0) evidenceCount++;
    if (result.lineEnd > result.lineStart) evidenceCount++;

    // 제안
    if (result.suggestion) evidenceCount++;

    // 참조
    const rawResult = result.rawResult as Record<string, unknown>;
    if (Array.isArray(rawResult?.references)) {
      evidenceCount += (rawResult.references as string[]).length;
    }

    // AST 노드 참조
    if (Array.isArray(rawResult?.nodeIds)) {
      evidenceCount += (rawResult.nodeIds as string[]).length;
    }

    // 정규화 (최소 3개 기준)
    return Math.min(1, evidenceCount / this.config.evidenceMinCount);
  }

  /**
   * 재현성 점수 계산
   */
  private calculateReproducibility(
    result: NormalizedResult,
    previousResults?: NormalizedResult[]
  ): number {
    if (!previousResults || previousResults.length === 0) {
      return 0.7; // 비교 대상 없음, 기본값
    }

    // 이전 결과에서 동일 위치, 동일 룰의 결과 찾기
    const matching = previousResults.find(
      prev =>
        prev.filePath === result.filePath &&
        prev.ruleId === result.ruleId &&
        Math.abs(prev.lineStart - result.lineStart) <= 3
    );

    if (!matching) {
      return 0.5; // 새로운 결과
    }

    // 심각도와 메시지가 일치하면 높은 재현성
    if (matching.severity === result.severity && matching.message === result.message) {
      return 1.0;
    }

    // 부분 일치
    return 0.8;
  }

  /**
   * 변경 민감도 계산
   */
  private calculateSensitivity(
    result: NormalizedResult,
    codeChanged?: boolean
  ): number {
    if (codeChanged === undefined) {
      return 0.8; // 정보 없음, 기본값
    }

    if (codeChanged) {
      // 코드가 변경된 경우, 결과가 해당 변경과 관련있을 수 있음
      return 0.6;
    }

    // 코드 변경 없이 동일한 결과면 높은 안정성
    return 1.0;
  }

  /**
   * 상세 설명 생성
   */
  private generateDetails(
    components: ConfidenceScore['components'],
    result: NormalizedResult
  ): string[] {
    const details: string[] = [];

    if (components.staticRatio >= 0.8) {
      details.push('정적 분석 기반 결과');
    } else if (components.staticRatio >= 0.5) {
      details.push('정적 + AI 하이브리드 결과');
    } else {
      details.push('AI 분석 주도 결과');
    }

    if (components.aiWeight < 0.6) {
      details.push('AI 신뢰도가 낮음');
    }

    if (components.evidenceCount < 0.5) {
      details.push('근거가 부족함');
    }

    if (components.reproducibility < 0.6) {
      details.push('재현성 검증 필요');
    }

    if (components.sensitivity < 0.7) {
      details.push('최근 코드 변경에 민감');
    }

    return details;
  }
}

// ============================================================================
// 신뢰도 기반 필터
// ============================================================================

export class ConfidenceFilter {
  private calculator: ConfidenceCalculator;
  private minConfidence: number;

  constructor(minConfidence: number = 0.5, config?: Partial<ConfidenceConfig>) {
    this.calculator = new ConfidenceCalculator(config);
    this.minConfidence = minConfidence;
  }

  /**
   * 신뢰도 기준 필터링
   */
  filter(results: NormalizedResult[]): {
    accepted: NormalizedResult[];
    rejected: NormalizedResult[];
    scores: Map<string, ConfidenceScore>;
  } {
    const accepted: NormalizedResult[] = [];
    const rejected: NormalizedResult[] = [];
    const scores = new Map<string, ConfidenceScore>();

    for (const result of results) {
      const score = this.calculator.calculate(result);
      scores.set(result.id, score);

      if (score.overall >= this.minConfidence) {
        accepted.push(result);
      } else {
        rejected.push(result);
      }
    }

    return { accepted, rejected, scores };
  }

  /**
   * 심각도별 최소 신뢰도 적용
   */
  filterBySeverity(
    results: NormalizedResult[],
    thresholds: Partial<Record<Severity, number>>
  ): NormalizedResult[] {
    const defaults: Record<Severity, number> = {
      CRITICAL: 0.3,  // 중요한 건 낮은 신뢰도도 포함
      HIGH: 0.4,
      MEDIUM: 0.5,
      LOW: 0.6,
      INFO: 0.7,
    };

    const applied = { ...defaults, ...thresholds };

    return results.filter(result => {
      const score = this.calculator.calculate(result);
      return score.overall >= applied[result.severity];
    });
  }
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 신뢰도 등급별 색상
 */
export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'HIGH': return '#22C55E';
    case 'MEDIUM': return '#EAB308';
    case 'LOW': return '#F97316';
    case 'VERY_LOW': return '#EF4444';
  }
}

/**
 * 신뢰도 등급 설명
 */
export function getConfidenceDescription(level: ConfidenceLevel): string {
  switch (level) {
    case 'HIGH': return '높은 신뢰도 - 운영에 즉시 반영 가능';
    case 'MEDIUM': return '중간 신뢰도 - 검토 후 반영 권장';
    case 'LOW': return '낮은 신뢰도 - 추가 검증 필요';
    case 'VERY_LOW': return '매우 낮은 신뢰도 - 참고용으로만 사용';
  }
}
