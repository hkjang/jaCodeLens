/**
 * AI 출력 검증기
 * 
 * AI 응답의 품질과 신뢰성을 검증합니다.
 * - 구조 검증 (JSON Schema)
 * - 근거 필수 검증 (AST 노드 ID 확인)
 * - 신뢰도 점수 검증
 * - 중복 제거
 * - 오류 차단
 */

import { z } from 'zod';
import { NormalizedResult, Severity, MainCategory, SubCategory } from '../types';

// ============================================================================
// AI 출력 스키마 정의
// ============================================================================

/**
 * AI 설명 응답 스키마
 */
export const AIExplanationSchema = z.object({
  explanation: z.string().min(10).max(2000),
  rootCause: z.string().optional(),
  impact: z.string().optional(),
  confidence: z.number().min(0).max(1),
  references: z.array(z.string()).optional(),
  nodeIds: z.array(z.string()).optional(), // AST 노드 참조
});

export type AIExplanation = z.infer<typeof AIExplanationSchema>;

/**
 * AI 개선 제안 스키마
 */
export const AIImprovementSchema = z.object({
  direction: z.string().min(10).max(1000),
  codeSnippet: z.string().optional(),
  effort: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  priority: z.enum(['IMMEDIATE', 'SHORT_TERM', 'LONG_TERM']),
  confidence: z.number().min(0).max(1),
  relatedIssues: z.array(z.string()).optional(),
});

export type AIImprovement = z.infer<typeof AIImprovementSchema>;

/**
 * AI 보안 권고 스키마
 */
export const AISecurityAdviceSchema = z.object({
  recommendation: z.string().min(10).max(1500),
  vulnerabilityType: z.string().optional(),
  cweId: z.string().regex(/^CWE-\d+$/).optional(),
  owaspCategory: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  confidence: z.number().min(0).max(1),
  mitigationSteps: z.array(z.string()).min(1).optional(),
});

export type AISecurityAdvice = z.infer<typeof AISecurityAdviceSchema>;

// ============================================================================
// 검증 결과 타입
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  confidenceScore: number;
}

export interface ValidatorConfig {
  minConfidence: number;         // 최소 신뢰도 (기본 0.6)
  requireNodeReference: boolean; // AST 노드 참조 필수
  maxDuplicateRatio: number;    // 최대 중복 비율 (기본 0.3)
  strictMode: boolean;          // 엄격 모드
}

const DEFAULT_CONFIG: ValidatorConfig = {
  minConfidence: 0.6,
  requireNodeReference: false,
  maxDuplicateRatio: 0.3,
  strictMode: false,
};

// ============================================================================
// AI 출력 검증기 클래스
// ============================================================================

export class AIOutputValidator {
  private config: ValidatorConfig;
  private seenHashes: Set<string> = new Set();

  constructor(config?: Partial<ValidatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * AI 설명 검증
   */
  validateExplanation(
    input: unknown,
    context?: { nodeIds?: string[] }
  ): ValidationResult<AIExplanation> {
    try {
      // 스키마 검증
      const parsed = AIExplanationSchema.parse(input);
      
      const warnings: string[] = [];
      
      // 신뢰도 검증
      if (parsed.confidence < this.config.minConfidence) {
        return {
          success: false,
          error: `신뢰도가 너무 낮습니다 (${parsed.confidence} < ${this.config.minConfidence})`,
          confidenceScore: parsed.confidence,
        };
      }

      // AST 노드 참조 검증
      if (this.config.requireNodeReference) {
        if (!parsed.nodeIds || parsed.nodeIds.length === 0) {
          warnings.push('AST 노드 참조가 없습니다');
          if (this.config.strictMode) {
            return {
              success: false,
              error: 'AST 노드 참조 필수 (strictMode)',
              confidenceScore: parsed.confidence,
            };
          }
        } else if (context?.nodeIds) {
          // 실제 노드 존재 여부 확인
          const invalidNodes = parsed.nodeIds.filter(id => !context.nodeIds!.includes(id));
          if (invalidNodes.length > 0) {
            warnings.push(`존재하지 않는 노드 참조: ${invalidNodes.join(', ')}`);
          }
        }
      }

      // 중복 검증
      const hash = this.hashContent(parsed.explanation);
      if (this.seenHashes.has(hash)) {
        warnings.push('중복된 설명이 감지되었습니다');
      }
      this.seenHashes.add(hash);

      return {
        success: true,
        data: parsed,
        warnings: warnings.length > 0 ? warnings : undefined,
        confidenceScore: parsed.confidence,
      };

    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `스키마 검증 실패: ${error.issues.map(e => e.message).join(', ')}`,
          confidenceScore: 0,
        };
      }
      return {
        success: false,
        error: `알 수 없는 오류: ${String(error)}`,
        confidenceScore: 0,
      };
    }
  }

  /**
   * AI 개선 제안 검증
   */
  validateImprovement(input: unknown): ValidationResult<AIImprovement> {
    try {
      const parsed = AIImprovementSchema.parse(input);

      if (parsed.confidence < this.config.minConfidence) {
        return {
          success: false,
          error: `신뢰도가 너무 낮습니다 (${parsed.confidence} < ${this.config.minConfidence})`,
          confidenceScore: parsed.confidence,
        };
      }

      // 중복 검증
      const hash = this.hashContent(parsed.direction);
      const warnings: string[] = [];
      if (this.seenHashes.has(hash)) {
        warnings.push('중복된 제안이 감지되었습니다');
      }
      this.seenHashes.add(hash);

      return {
        success: true,
        data: parsed,
        warnings: warnings.length > 0 ? warnings : undefined,
        confidenceScore: parsed.confidence,
      };

    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `스키마 검증 실패: ${error.issues.map(e => e.message).join(', ')}`,
          confidenceScore: 0,
        };
      }
      return {
        success: false,
        error: `알 수 없는 오류: ${String(error)}`,
        confidenceScore: 0,
      };
    }
  }

  /**
   * AI 보안 권고 검증
   */
  validateSecurityAdvice(input: unknown): ValidationResult<AISecurityAdvice> {
    try {
      const parsed = AISecurityAdviceSchema.parse(input);

      if (parsed.confidence < this.config.minConfidence) {
        return {
          success: false,
          error: `신뢰도가 너무 낮습니다 (${parsed.confidence} < ${this.config.minConfidence})`,
          confidenceScore: parsed.confidence,
        };
      }

      const warnings: string[] = [];

      // CWE/OWASP 참조 권장
      if (!parsed.cweId && !parsed.owaspCategory) {
        warnings.push('CWE 또는 OWASP 참조가 없습니다');
      }

      // 중복 검증
      const hash = this.hashContent(parsed.recommendation);
      if (this.seenHashes.has(hash)) {
        warnings.push('중복된 권고가 감지되었습니다');
      }
      this.seenHashes.add(hash);

      return {
        success: true,
        data: parsed,
        warnings: warnings.length > 0 ? warnings : undefined,
        confidenceScore: parsed.confidence,
      };

    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `스키마 검증 실패: ${error.issues.map(e => e.message).join(', ')}`,
          confidenceScore: 0,
        };
      }
      return {
        success: false,
        error: `알 수 없는 오류: ${String(error)}`,
        confidenceScore: 0,
      };
    }
  }

  /**
   * 일괄 검증 (중복 감지 포함)
   */
  validateBatch<T>(
    inputs: unknown[],
    validator: (input: unknown) => ValidationResult<T>
  ): { valid: ValidationResult<T>[]; invalid: ValidationResult<T>[] } {
    const valid: ValidationResult<T>[] = [];
    const invalid: ValidationResult<T>[] = [];

    for (const input of inputs) {
      const result = validator(input);
      if (result.success) {
        valid.push(result);
      } else {
        invalid.push(result);
      }
    }

    return { valid, invalid };
  }

  /**
   * 해시 캐시 초기화
   */
  clearCache(): void {
    this.seenHashes.clear();
  }

  /**
   * 통계 반환
   */
  getStats(): { cacheSize: number } {
    return { cacheSize: this.seenHashes.size };
  }

  /**
   * 컨텐츠 해시 생성 (중복 감지용)
   */
  private hashContent(content: string): string {
    // 간단한 해시: 공백 제거 후 첫 100자 + 길이
    const normalized = content.replace(/\s+/g, '').toLowerCase();
    return `${normalized.slice(0, 100)}_${normalized.length}`;
  }
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * AI 응답을 파싱하고 검증
 */
export function parseAndValidateAIResponse<T>(
  rawResponse: string,
  validator: (input: unknown) => ValidationResult<T>
): ValidationResult<T> {
  try {
    const parsed = JSON.parse(rawResponse);
    return validator(parsed);
  } catch {
    return {
      success: false,
      error: 'JSON 파싱 실패',
      confidenceScore: 0,
    };
  }
}

/**
 * Fallback 생성 (AI 실패 시)
 */
export function createFallbackExplanation(result: NormalizedResult): AIExplanation {
  return {
    explanation: `[${result.severity}] ${result.message}`,
    rootCause: undefined,
    impact: undefined,
    confidence: 0, // AI 없이 생성됨을 표시
    references: undefined,
    nodeIds: undefined,
  };
}

/**
 * 기본 검증기 인스턴스
 */
export const defaultValidator = new AIOutputValidator();
