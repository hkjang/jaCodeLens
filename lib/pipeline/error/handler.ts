/**
 * 오류 및 실패 처리
 * 
 * 파이프라인 각 단계의 오류를 처리합니다.
 * - AST 실패: 언어 제외
 * - 룰 오류: 스킵
 * - AI 실패: 재시도
 * - 병합 오류: 경고
 * - 전체 실패: 부분 결과 반환
 */

import { PipelineStage, NormalizedResult } from '../types';

// ============================================================================
// 타입 정의
// ============================================================================

export type ErrorType = 
  | 'AST_PARSE_FAILED'
  | 'RULE_EXECUTION_FAILED'
  | 'AI_CALL_FAILED'
  | 'AI_VALIDATION_FAILED'
  | 'MERGE_FAILED'
  | 'STORAGE_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

export interface PipelineError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  stage: PipelineStage;
  message: string;
  details?: string;
  timestamp: Date;
  retryable: boolean;
  context?: ErrorContext;
}

export interface ErrorContext {
  filePath?: string;
  language?: string;
  ruleId?: string;
  nodeId?: string;
  attemptCount?: number;
  originalError?: Error;
}

export interface RecoveryResult {
  recovered: boolean;
  action: RecoveryAction;
  partialResults?: NormalizedResult[];
  warnings?: string[];
}

export type RecoveryAction = 
  | 'skip'         // 건너뛰고 계속
  | 'retry'        // 재시도
  | 'fallback'     // 대체 방법 사용
  | 'abort'        // 중단
  | 'continue';    // 무시하고 계속

export interface ErrorCollector {
  errors: PipelineError[];
  warnings: PipelineError[];
  hasBlockingError: boolean;
}

// ============================================================================
// 오류 핸들러
// ============================================================================

export class ErrorHandler {
  private errors: PipelineError[] = [];
  private errorCounter = 0;
  private maxRetries: number;

  constructor(maxRetries: number = 3) {
    this.maxRetries = maxRetries;
  }

  /**
   * 오류 기록
   */
  record(
    type: ErrorType,
    stage: PipelineStage,
    message: string,
    context?: ErrorContext
  ): PipelineError {
    const error: PipelineError = {
      id: `err_${++this.errorCounter}`,
      type,
      severity: this.determineSeverity(type, stage),
      stage,
      message,
      timestamp: new Date(),
      retryable: this.isRetryable(type),
      context,
    };

    this.errors.push(error);
    return error;
  }

  /**
   * 오류 복구 시도
   */
  async recover(
    error: PipelineError,
    retryFn?: () => Promise<any>
  ): Promise<RecoveryResult> {
    const action = this.determineRecoveryAction(error);

    switch (action) {
      case 'retry':
        if (retryFn && error.retryable) {
          const attemptCount = (error.context?.attemptCount || 0) + 1;
          
          if (attemptCount <= this.maxRetries) {
            try {
              await this.delay(attemptCount * 1000); // 점진적 지연
              await retryFn();
              return { recovered: true, action: 'retry' };
            } catch {
              error.context = { ...error.context, attemptCount };
              return { recovered: false, action: 'skip', warnings: ['재시도 실패'] };
            }
          }
        }
        return { recovered: false, action: 'skip', warnings: ['최대 재시도 횟수 초과'] };

      case 'fallback':
        return {
          recovered: true,
          action: 'fallback',
          warnings: ['대체 방법 사용됨'],
        };

      case 'skip':
        return {
          recovered: true,
          action: 'skip',
          warnings: [`${error.stage} 단계 일부 결과 건너뜀`],
        };

      case 'abort':
        return {
          recovered: false,
          action: 'abort',
        };

      default:
        return { recovered: true, action: 'continue' };
    }
  }

  /**
   * 부분 결과 수집
   */
  collectPartialResults(
    allResults: Map<PipelineStage, NormalizedResult[]>
  ): {
    results: NormalizedResult[];
    completedStages: PipelineStage[];
    failedStages: PipelineStage[];
  } {
    const results: NormalizedResult[] = [];
    const completedStages: PipelineStage[] = [];
    const failedStages: PipelineStage[] = [];

    const stageErrors = new Map<PipelineStage, boolean>();
    for (const error of this.errors) {
      if (error.severity === 'fatal' || error.severity === 'error') {
        stageErrors.set(error.stage, true);
      }
    }

    for (const [stage, stageResults] of allResults) {
      if (stageErrors.get(stage)) {
        failedStages.push(stage);
      } else {
        completedStages.push(stage);
        results.push(...stageResults);
      }
    }

    return { results, completedStages, failedStages };
  }

  /**
   * 오류 요약
   */
  getSummary(): ErrorCollector {
    const errors = this.errors.filter(e => 
      e.severity === 'fatal' || e.severity === 'error'
    );
    const warnings = this.errors.filter(e => 
      e.severity === 'warning' || e.severity === 'info'
    );
    const hasBlockingError = this.errors.some(e => e.severity === 'fatal');

    return { errors, warnings, hasBlockingError };
  }

  /**
   * 오류 초기화
   */
  clear(): void {
    this.errors = [];
    this.errorCounter = 0;
  }

  /**
   * 전체 오류 목록
   */
  getErrors(): PipelineError[] {
    return [...this.errors];
  }

  // =========== 내부 메서드 ===========

  private determineSeverity(type: ErrorType, stage: PipelineStage): ErrorSeverity {
    // 치명적 오류
    if (stage === PipelineStage.SOURCE_COLLECT) return 'fatal';

    // 오류 유형별
    switch (type) {
      case 'AST_PARSE_FAILED':
        return 'warning'; // 일부 파일 실패는 경고
      case 'RULE_EXECUTION_FAILED':
        return 'warning';
      case 'AI_CALL_FAILED':
        return 'info'; // AI 실패는 정보 수준
      case 'AI_VALIDATION_FAILED':
        return 'info';
      case 'MERGE_FAILED':
        return 'error';
      case 'STORAGE_FAILED':
        return 'error';
      case 'TIMEOUT':
        return 'error';
      default:
        return 'error';
    }
  }

  private isRetryable(type: ErrorType): boolean {
    const retryableTypes: ErrorType[] = [
      'AI_CALL_FAILED',
      'TIMEOUT',
    ];
    return retryableTypes.includes(type);
  }

  private determineRecoveryAction(error: PipelineError): RecoveryAction {
    switch (error.type) {
      case 'AST_PARSE_FAILED':
        return 'skip'; // 해당 파일 건너뜀

      case 'RULE_EXECUTION_FAILED':
        return 'skip'; // 해당 룰 건너뜀

      case 'AI_CALL_FAILED':
        return error.retryable ? 'retry' : 'fallback';

      case 'AI_VALIDATION_FAILED':
        return 'fallback'; // 정적 결과만 사용

      case 'MERGE_FAILED':
        return 'continue'; // 경고 표시 후 계속

      case 'STORAGE_FAILED':
        return 'abort'; // 저장 실패는 중단

      case 'TIMEOUT':
        return error.retryable ? 'retry' : 'skip';

      default:
        return 'continue';
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// 오류 래퍼
// ============================================================================

export class SafeExecutor {
  private errorHandler: ErrorHandler;

  constructor(errorHandler?: ErrorHandler) {
    this.errorHandler = errorHandler || new ErrorHandler();
  }

  /**
   * 안전한 실행 (오류 캡처)
   */
  async execute<T>(
    stage: PipelineStage,
    fn: () => Promise<T>,
    fallback?: T,
    context?: Partial<ErrorContext>
  ): Promise<{ success: boolean; result?: T; error?: PipelineError }> {
    try {
      const result = await fn();
      return { success: true, result };
    } catch (err) {
      const error = this.errorHandler.record(
        'UNKNOWN',
        stage,
        err instanceof Error ? err.message : String(err),
        { ...context, originalError: err instanceof Error ? err : undefined }
      );

      // 복구 시도
      const recovery = await this.errorHandler.recover(error, fn);

      if (recovery.recovered && recovery.action === 'retry') {
        // 재시도 성공
        try {
          const result = await fn();
          return { success: true, result };
        } catch {
          // 재시도도 실패
        }
      }

      if (fallback !== undefined && recovery.action !== 'abort') {
        return { success: true, result: fallback, error };
      }

      return { success: false, error };
    }
  }

  /**
   * 배열 항목 안전 처리 (오류난 항목만 스킵)
   */
  async executeForEach<T, R>(
    stage: PipelineStage,
    items: T[],
    fn: (item: T) => Promise<R>,
    getContext?: (item: T) => Partial<ErrorContext>
  ): Promise<{ results: R[]; errors: PipelineError[] }> {
    const results: R[] = [];
    const errors: PipelineError[] = [];

    for (const item of items) {
      const context = getContext ? getContext(item) : undefined;
      const { success, result, error } = await this.execute(stage, () => fn(item), undefined, context);

      if (success && result !== undefined) {
        results.push(result);
      }
      if (error) {
        errors.push(error);
      }
    }

    return { results, errors };
  }

  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }
}

// ============================================================================
// 팩토리 함수
// ============================================================================

export function createErrorHandler(maxRetries?: number): ErrorHandler {
  return new ErrorHandler(maxRetries);
}

export function createSafeExecutor(): SafeExecutor {
  return new SafeExecutor();
}
