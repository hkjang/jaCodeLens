/**
 * 분석 신뢰도 산정 로직 (명세 19 준수)
 * 
 * 신뢰도 = 룰기반(0.5) + AST근거(0.2) + 재현성(0.2) + AI감점(-0.1) + 변경량감점(-0.1)
 */

import { NormalizedResult, Severity, MainCategory } from '../types';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ConfidenceScore {
  overall: number;          // 종합 신뢰도 (0-1)
  components: {
    ruleBased: number;      // 룰 기반 점수 (명세 19: 가중치 0.5)
    astEvidence: number;    // AST 근거 점수 (명세 19: 가중치 0.2)
    reproducibility: number; // 재현성 점수 (명세 19: 가중치 0.2)
    aiPenalty: number;      // AI 개입 감점 (명세 19: 가중치 -0.1)
    changePenalty: number;  // 변경량 감점 (명세 19: 가중치 -0.1)
  };
  details: string[];        // 상세 설명
}

export interface ConfidenceConfig {
  weights: {
    ruleBased: number;      // 룰 기반 가중치 (0.5)
    astEvidence: number;    // AST 근거 가중치 (0.2)
    reproducibility: number; // 재현성 가중치 (0.2)
    aiPenalty: number;      // AI 감점 가중치 (-0.1)
    changePenalty: number;  // 변경량 감점 가중치 (-0.1)
  };
  thresholds: {
    high: number;           // 높은 신뢰도 기준
    medium: number;         // 중간 신뢰도 기준
    low: number;            // 낮은 신뢰도 기준
  };
  evidenceMinCount: number; // 최소 근거 수
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

// 명세 19 가중치 적용
const DEFAULT_CONFIG: ConfidenceConfig = {
  weights: {
    ruleBased: 0.50,        // 룰 기반 (가장 높음)
    astEvidence: 0.20,      // AST 근거
    reproducibility: 0.20,  // 재현성
    aiPenalty: -0.10,       // AI 개입 감점
    changePenalty: -0.10,   // 변경량 감점
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
   * 단일 결과 신뢰도 산정 (명세 19 공식)
   */
  calculate(result: NormalizedResult, context?: {
    previousResults?: NormalizedResult[];
    codeChanged?: boolean;
  }): ConfidenceScore {
    const components = {
      ruleBased: this.calculateRuleBased(result),
      astEvidence: this.calculateASTEvidence(result),
      reproducibility: this.calculateReproducibility(result, context?.previousResults),
      aiPenalty: this.calculateAIPenalty(result),
      changePenalty: this.calculateChangePenalty(result, context?.codeChanged),
    };

    // 명세 19 공식: 룰(0.5) + AST(0.2) + 재현(0.2) + AI감점(-0.1) + 변경감점(-0.1)
    const overall = Math.max(0, Math.min(1,
      components.ruleBased * this.config.weights.ruleBased +
      components.astEvidence * this.config.weights.astEvidence +
      components.reproducibility * this.config.weights.reproducibility +
      components.aiPenalty * this.config.weights.aiPenalty + // 감점
      components.changePenalty * this.config.weights.changePenalty // 감점
    ));

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
   * 룰 기반 점수 (명세 19: 가중치 0.5)
   */
  private calculateRuleBased(result: NormalizedResult): number {
    // 룰 ID가 있으면 룰 기반 결과
    if (result.ruleId && result.ruleId.length > 0) {
      return 1.0; // 룰 기반 100%
    }

    // deterministic 플래그 확인
    if (result.deterministic) {
      return 0.8; // 결정적 결과
    }

    // AI 전용 결과
    return 0.3;
  }

  /**
   * AST 근거 점수 (명세 19: 가중치 0.2)
   */
  private calculateASTEvidence(result: NormalizedResult): number {
    let evidenceCount = 0;

    // 위치 정보 (AST 노드 링크)
    if (result.lineStart > 0) evidenceCount++;
    if (result.lineEnd > result.lineStart) evidenceCount++;

    // 제안
    if (result.suggestion) evidenceCount++;

    // 참조
    const rawResult = result.rawResult as Record<string, unknown>;
    if (Array.isArray(rawResult?.nodeIds)) {
      evidenceCount += (rawResult.nodeIds as string[]).length;
    }

    // 정규화 (최소 3개 기준)
    return Math.min(1, evidenceCount / this.config.evidenceMinCount);
  }

  /**
   * AI 개입 감점 (명세 19: 가중치 -0.1)
   * 반환값이 클수록 감점이 큼
   */
  private calculateAIPenalty(result: NormalizedResult): number {
    // AI 보강이 없으면 감점 없음
    if (!result.aiExplanation && !result.aiSuggestion && !result.aiSecurityAdvice) {
      return 0; // 감점 없음
    }

    // AI 신뢰도가 높으면 감점 적음
    const rawResult = result.rawResult as Record<string, unknown>;
    if (typeof rawResult?.confidence === 'number') {
      return 1 - (rawResult.confidence as number); // 신뢰도가 낮을수록 감점
    }

    // 기본 AI 감점
    return 0.5;
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
   * 변경량 감점 (명세 19: 가중치 -0.1)
   * 반환값이 클수록 감점이 큼
   */
  private calculateChangePenalty(
    result: NormalizedResult,
    codeChanged?: boolean
  ): number {
    if (codeChanged === undefined) {
      return 0; // 정보 없음, 감점 없음
    }

    if (codeChanged) {
      // 코드가 변경된 경우 감점 적용
      return 0.5;
    }

    // 코드 변경 없으면 감점 없음
    return 0;
  }

  /**
   * 상세 설명 생성 (명세 19 기준)
   */
  private generateDetails(
    components: ConfidenceScore['components'],
    result: NormalizedResult
  ): string[] {
    const details: string[] = [];

    // 룰 기반 분석
    if (components.ruleBased >= 0.8) {
      details.push('룰 기반 정적 분석 결과');
    } else if (components.ruleBased >= 0.5) {
      details.push('준정적 분석 결과');
    } else {
      details.push('AI 주도 분석 결과');
    }

    // AST 근거 부족
    if (components.astEvidence < 0.5) {
      details.push('AST 근거가 부족함');
    }

    // AI 감점
    if (components.aiPenalty > 0.3) {
      details.push('AI 개입으로 신뢰도 감소');
    }

    // 재현성 문제
    if (components.reproducibility < 0.6) {
      details.push('재현성 검증 필요');
    }

    // 변경량 감점
    if (components.changePenalty > 0.3) {
      details.push('최근 코드 변경으로 불안정');
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
