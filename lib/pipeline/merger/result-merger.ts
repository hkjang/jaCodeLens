/**
 * 결과 병합 엔진
 * 
 * 정적 분석 및 AI 분석 결과를 통합합니다.
 * - 룰 결과 우선
 * - AI 결과 보조
 * - 중복 통합
 * - 충돌 표시
 * - 요약 생성
 */

import { 
  NormalizedResult, 
  Severity, 
  MainCategory,
  StaticFinding,
  RuleViolation
} from '../types';

// ============================================================================
// 타입 정의
// ============================================================================

export interface MergeSource {
  type: 'static' | 'rule' | 'ai';
  priority: number;       // 높을수록 우선
  results: NormalizedResult[];
}

export interface ConflictInfo {
  resultIds: string[];
  field: string;
  values: any[];
  resolution: 'first' | 'highest' | 'merged' | 'manual';
  resolvedValue: any;
}

export interface MergeResult {
  merged: NormalizedResult[];
  conflicts: ConflictInfo[];
  duplicatesRemoved: number;
  aiEnhanced: number;
  summary: MergeSummary;
}

export interface MergeSummary {
  totalIssues: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<MainCategory, number>;
  bySource: Record<'static' | 'rule' | 'ai', number>;
  confidenceAverage: number;
  criticalCount: number;
  actionRequired: number;
}

export interface MergeConfig {
  duplicateThreshold: number;     // 중복 판정 유사도 (0-1)
  aiConfidenceThreshold: number;  // AI 결과 포함 최소 신뢰도
  preferStaticForConflict: boolean;
  generateSummary: boolean;
  maxResults?: number;
}

const DEFAULT_CONFIG: MergeConfig = {
  duplicateThreshold: 0.8,
  aiConfidenceThreshold: 0.6,
  preferStaticForConflict: true,
  generateSummary: true,
};

// ============================================================================
// 결과 병합 엔진
// ============================================================================

export class ResultMerger {
  private config: MergeConfig;

  constructor(config?: Partial<MergeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 여러 소스의 결과 병합
   */
  merge(sources: MergeSource[]): MergeResult {
    // 우선순위로 정렬 (높은 것 먼저)
    const sortedSources = [...sources].sort((a, b) => b.priority - a.priority);

    const merged: NormalizedResult[] = [];
    const conflicts: ConflictInfo[] = [];
    let duplicatesRemoved = 0;
    let aiEnhanced = 0;

    // 소스별 처리
    for (const source of sortedSources) {
      for (const result of source.results) {
        // AI 결과 신뢰도 체크
        if (source.type === 'ai') {
          const confidence = this.extractConfidence(result);
          if (confidence < this.config.aiConfidenceThreshold) {
            continue;
          }
        }

        // 중복 체크
        const duplicate = this.findDuplicate(merged, result);

        if (duplicate) {
          // 병합 또는 스킵
          const mergeResult = this.mergeResults(duplicate.existing, result, source.type);
          
          if (mergeResult.conflict) {
            conflicts.push(mergeResult.conflict);
          }
          
          if (mergeResult.enhanced) {
            aiEnhanced++;
          }

          // 기존 결과 업데이트
          const index = merged.indexOf(duplicate.existing);
          merged[index] = mergeResult.merged;
          duplicatesRemoved++;
        } else {
          // 새 결과 추가
          merged.push({
            ...result,
            rawResult: {
              ...result.rawResult,
              _source: source.type,
              _priority: source.priority,
            },
          });
        }
      }
    }

    // 심각도 정렬
    merged.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));

    // 최대 결과 수 제한
    const limited = this.config.maxResults 
      ? merged.slice(0, this.config.maxResults) 
      : merged;

    return {
      merged: limited,
      conflicts,
      duplicatesRemoved,
      aiEnhanced,
      summary: this.config.generateSummary ? this.generateSummary(limited, sources) : {} as MergeSummary,
    };
  }

  /**
   * 정적 분석 + AI 결과 병합 (편의 메서드)
   */
  mergeStaticAndAI(
    staticResults: NormalizedResult[],
    ruleResults: NormalizedResult[],
    aiResults: NormalizedResult[]
  ): MergeResult {
    return this.merge([
      { type: 'static', priority: 100, results: staticResults },
      { type: 'rule', priority: 90, results: ruleResults },
      { type: 'ai', priority: 50, results: aiResults },
    ]);
  }

  /**
   * 중복 찾기
   */
  private findDuplicate(
    existing: NormalizedResult[],
    candidate: NormalizedResult
  ): { existing: NormalizedResult; similarity: number } | null {
    for (const result of existing) {
      const similarity = this.calculateSimilarity(result, candidate);
      if (similarity >= this.config.duplicateThreshold) {
        return { existing: result, similarity };
      }
    }
    return null;
  }

  /**
   * 유사도 계산
   */
  private calculateSimilarity(a: NormalizedResult, b: NormalizedResult): number {
    let score = 0;
    let total = 0;

    // 파일 경로 (필수 일치)
    if (a.filePath === b.filePath) {
      score += 3;
    }
    total += 3;

    // 줄 번호 (근접)
    const lineDiff = Math.abs(a.lineStart - b.lineStart);
    if (lineDiff === 0) score += 2;
    else if (lineDiff <= 3) score += 1;
    total += 2;

    // 카테고리
    if (a.mainCategory === b.mainCategory) score += 2;
    if (a.subCategory === b.subCategory) score += 1;
    total += 3;

    // 룰 ID
    if (a.ruleId === b.ruleId) score += 2;
    total += 2;

    // 메시지 유사도 (간단 비교)
    const messageSim = this.textSimilarity(a.message, b.message);
    score += messageSim * 2;
    total += 2;

    return score / total;
  }

  /**
   * 텍스트 유사도 (Jaccard)
   */
  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return intersection.size / union.size;
  }

  /**
   * 두 결과 병합
   */
  private mergeResults(
    existing: NormalizedResult,
    incoming: NormalizedResult,
    incomingSource: 'static' | 'rule' | 'ai'
  ): { merged: NormalizedResult; conflict?: ConflictInfo; enhanced?: boolean } {
    const merged = { ...existing };
    let conflict: ConflictInfo | undefined;
    let enhanced = false;

    // AI 결과인 경우 보강
    if (incomingSource === 'ai') {
      if (incoming.aiExplanation && !merged.aiExplanation) {
        merged.aiExplanation = incoming.aiExplanation;
        enhanced = true;
      }
      if (incoming.aiSuggestion && !merged.aiSuggestion) {
        merged.aiSuggestion = incoming.aiSuggestion;
        enhanced = true;
      }
      if (incoming.aiSecurityAdvice && !merged.aiSecurityAdvice) {
        merged.aiSecurityAdvice = incoming.aiSecurityAdvice;
        enhanced = true;
      }
    }

    // 심각도 충돌 감지
    if (existing.severity !== incoming.severity) {
      if (this.config.preferStaticForConflict && incomingSource === 'ai') {
        // 정적 분석 결과 유지
      } else {
        // 더 높은 심각도 선택
        const existingWeight = this.getSeverityWeight(existing.severity);
        const incomingWeight = this.getSeverityWeight(incoming.severity);
        
        if (incomingWeight > existingWeight) {
          merged.severity = incoming.severity;
        }

        conflict = {
          resultIds: [existing.id, incoming.id],
          field: 'severity',
          values: [existing.severity, incoming.severity],
          resolution: 'highest',
          resolvedValue: merged.severity,
        };
      }
    }

    // 제안 병합
    if (incoming.suggestion && !merged.suggestion) {
      merged.suggestion = incoming.suggestion;
    }

    return { merged, conflict, enhanced };
  }

  /**
   * 신뢰도 추출
   */
  private extractConfidence(result: NormalizedResult): number {
    const raw = result.rawResult as Record<string, unknown>;
    return (raw?.confidence as number) ?? 1;
  }

  /**
   * 심각도 가중치
   */
  private getSeverityWeight(severity: Severity): number {
    const weights: Record<Severity, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };
    return weights[severity];
  }

  /**
   * 요약 생성
   */
  private generateSummary(results: NormalizedResult[], sources: MergeSource[]): MergeSummary {
    const bySeverity: Record<Severity, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0,
    };
    const byCategory: Record<MainCategory, number> = {
      STRUCTURE: 0, QUALITY: 0, SECURITY: 0, OPERATIONS: 0, TEST: 0, STANDARDS: 0,
    };
    const bySource: Record<'static' | 'rule' | 'ai', number> = {
      static: 0, rule: 0, ai: 0,
    };

    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const result of results) {
      bySeverity[result.severity]++;
      byCategory[result.mainCategory]++;

      const source = (result.rawResult as any)?._source;
      if (source && bySource[source as keyof typeof bySource] !== undefined) {
        bySource[source as keyof typeof bySource]++;
      }

      const confidence = this.extractConfidence(result);
      if (confidence > 0) {
        totalConfidence += confidence;
        confidenceCount++;
      }
    }

    return {
      totalIssues: results.length,
      bySeverity,
      byCategory,
      bySource,
      confidenceAverage: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      criticalCount: bySeverity.CRITICAL,
      actionRequired: bySeverity.CRITICAL + bySeverity.HIGH,
    };
  }
}

// ============================================================================
// 충돌 해결기
// ============================================================================

export class ConflictResolver {
  /**
   * 충돌 자동 해결
   */
  resolveAuto(conflicts: ConflictInfo[]): ConflictInfo[] {
    return conflicts.map(conflict => {
      switch (conflict.field) {
        case 'severity':
          // 가장 높은 심각도 선택
          return {
            ...conflict,
            resolution: 'highest' as const,
            resolvedValue: this.getHighestSeverity(conflict.values as Severity[]),
          };
        
        case 'message':
          // 첫 번째 (정적 분석) 선택
          return {
            ...conflict,
            resolution: 'first' as const,
            resolvedValue: conflict.values[0],
          };
        
        default:
          return {
            ...conflict,
            resolution: 'first' as const,
            resolvedValue: conflict.values[0],
          };
      }
    });
  }

  private getHighestSeverity(severities: Severity[]): Severity {
    const order: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    for (const sev of order) {
      if (severities.includes(sev)) return sev;
    }
    return 'INFO';
  }
}
