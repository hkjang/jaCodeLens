/**
 * AI 설명 생성기
 * 
 * 정규화된 분석 결과에 대한 자연어 설명 생성
 * 정규화 이후에만 AI를 사용합니다.
 */

import { NormalizedResult, MainCategory, Severity } from '../types';

interface ExplanationConfig {
  language: 'ko' | 'en';
  includeCode: boolean;
  verbose: boolean;
}

export class ExplanationGenerator {
  private aiEnabled: boolean;
  private config: ExplanationConfig;

  constructor(options?: { 
    aiEnabled?: boolean; 
    config?: Partial<ExplanationConfig>;
  }) {
    this.aiEnabled = options?.aiEnabled ?? false;
    this.config = {
      language: 'ko',
      includeCode: true,
      verbose: false,
      ...options?.config
    };
  }

  /**
   * 분석 결과에 대한 설명 생성
   * AI가 비활성화된 경우 템플릿 기반 설명 반환
   */
  async generateExplanation(result: NormalizedResult): Promise<string> {
    if (!this.aiEnabled) {
      return this.generateTemplateExplanation(result);
    }

    // AI 호출 - 여기서는 프롬프트 정의만
    // 실제 AI 호출은 외부에서 주입받거나 별도 서비스 사용
    const prompt = this.buildExplanationPrompt(result);
    
    // AI 서비스가 없으면 템플릿 사용
    return this.generateTemplateExplanation(result);
  }

  /**
   * 여러 결과에 대한 설명 일괄 생성
   */
  async generateBatch(results: NormalizedResult[]): Promise<Map<string, string>> {
    const explanations = new Map<string, string>();
    
    for (const result of results) {
      const explanation = await this.generateExplanation(result);
      explanations.set(result.id, explanation);
    }
    
    return explanations;
  }

  /**
   * 템플릿 기반 설명 생성 (AI 없이)
   */
  private generateTemplateExplanation(result: NormalizedResult): string {
    const categoryDesc = this.getCategoryDescription(result.mainCategory);
    const severityDesc = this.getSeverityDescription(result.severity);
    
    let explanation = `[${severityDesc}] ${result.message}`;
    explanation += `\n\n📁 파일: ${result.filePath}`;
    explanation += `\n📍 위치: ${result.lineStart}번째 줄`;
    explanation += `\n📂 분류: ${categoryDesc} > ${result.subCategory}`;
    
    if (result.suggestion) {
      explanation += `\n\n💡 제안: ${result.suggestion}`;
    }

    if (result.rawResult?.references) {
      const refs = result.rawResult.references as string[];
      if (refs.length > 0) {
        explanation += `\n\n🔗 참고: ${refs.join(', ')}`;
      }
    }

    return explanation;
  }

  /**
   * AI 프롬프트 생성
   */
  private buildExplanationPrompt(result: NormalizedResult): string {
    return `다음 코드 분석 결과에 대해 개발자가 이해하기 쉽게 설명해주세요.

## 분석 결과
- 메시지: ${result.message}
- 심각도: ${result.severity}
- 카테고리: ${result.mainCategory} > ${result.subCategory}
- 파일: ${result.filePath}
- 줄: ${result.lineStart}-${result.lineEnd}

## 요청
1. 이 문제가 왜 발생했는지 설명
2. 이 문제가 왜 중요한지 설명
3. 수정하지 않으면 어떤 위험이 있는지 설명

한국어로 간결하게 답변해주세요.`;
  }

  /**
   * 카테고리 설명
   */
  private getCategoryDescription(category: MainCategory): string {
    const desc: Record<MainCategory, string> = {
      STRUCTURE: '구조',
      QUALITY: '품질',
      SECURITY: '보안',
      OPERATIONS: '운영',
      TEST: '테스트',
      STANDARDS: '표준'
    };
    return desc[category];
  }

  /**
   * 심각도 설명
   */
  private getSeverityDescription(severity: Severity): string {
    const desc: Record<Severity, string> = {
      CRITICAL: '🔴 치명적',
      HIGH: '🟠 높음',
      MEDIUM: '🟡 중간',
      LOW: '🔵 낮음',
      INFO: '⚪ 정보'
    };
    return desc[severity];
  }

  /**
   * AI 활성화 상태 확인
   */
  isAIEnabled(): boolean {
    return this.aiEnabled;
  }

  /**
   * AI 활성화/비활성화
   */
  setAIEnabled(enabled: boolean): void {
    this.aiEnabled = enabled;
  }
}
