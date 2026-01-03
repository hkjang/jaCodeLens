/**
 * AI 개선점 도출기
 * 
 * 룰 위반 결과를 기반으로 수정 방향 제안
 * 정규화 이후에만 AI를 사용합니다.
 */

import { NormalizedResult, Severity, MainCategory } from '../types';

interface ImprovementSuggestion {
  resultId: string;
  priority: 'high' | 'medium' | 'low';
  direction: string;
  codeExample?: string;
  risk: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

export class ImprovementSuggester {
  private aiEnabled: boolean;

  constructor(options?: { aiEnabled?: boolean }) {
    this.aiEnabled = options?.aiEnabled ?? false;
  }

  /**
   * 개선점 도출
   */
  async suggestImprovement(result: NormalizedResult): Promise<ImprovementSuggestion> {
    if (this.aiEnabled) {
      // AI 기반 제안 (추후 구현)
      const prompt = this.buildImprovementPrompt(result);
      // AI 호출...
    }

    // 템플릿 기반 제안
    return this.generateTemplateSuggestion(result);
  }

  /**
   * 여러 결과에 대한 개선점 일괄 도출
   */
  async suggestBatch(results: NormalizedResult[]): Promise<ImprovementSuggestion[]> {
    const suggestions: ImprovementSuggestion[] = [];
    
    for (const result of results) {
      const suggestion = await this.suggestImprovement(result);
      suggestions.push(suggestion);
    }

    // 우선순위로 정렬
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 템플릿 기반 제안 생성
   */
  private generateTemplateSuggestion(result: NormalizedResult): ImprovementSuggestion {
    const priority = this.calculatePriority(result.severity);
    const direction = this.getDirection(result);
    const codeExample = this.getCodeExample(result);
    const risk = this.assessRisk(result);
    const effort = this.estimateEffort(result);

    return {
      resultId: result.id,
      priority,
      direction,
      codeExample,
      risk,
      effort
    };
  }

  /**
   * 우선순위 계산
   */
  private calculatePriority(severity: Severity): 'high' | 'medium' | 'low' {
    if (severity === 'CRITICAL' || severity === 'HIGH') return 'high';
    if (severity === 'MEDIUM') return 'medium';
    return 'low';
  }

  /**
   * 수정 방향 제안
   */
  private getDirection(result: NormalizedResult): string {
    const directions: Record<string, Record<string, string>> = {
      SECURITY: {
        SECRET: '시크릿을 환경 변수나 Vault로 이동하세요',
        INJECTION: '파라미터화된 쿼리를 사용하세요',
        XSS: 'DOMPurify 등으로 입력을 sanitize하세요',
        INPUT_VALIDATION: '입력 검증 로직을 추가하세요'
      },
      QUALITY: {
        COMPLEXITY: '함수를 작은 단위로 분리하세요',
        DUPLICATION: '공통 로직을 추출하여 재사용하세요'
      },
      STRUCTURE: {
        LAYER: '의존성 방향을 확인하고 인터페이스로 추상화하세요',
        CIRCULAR: '순환 의존성을 끊기 위해 중개 모듈을 도입하세요'
      },
      TEST: {
        MISSING_TEST: '단위 테스트를 작성하세요',
        COVERAGE: '테스트 커버리지를 높이세요'
      },
      STANDARDS: {
        NAMING: '네이밍 컨벤션을 따르세요',
        FORMAT: '코드 포맷팅을 정리하세요',
        CONVENTION: '프로젝트 컨벤션을 따르세요'
      },
      OPERATIONS: {
        LOGGING: '적절한 로깅 레벨을 사용하세요',
        EXCEPTION: '예외 처리를 추가하세요'
      }
    };

    const categoryDirections = directions[result.mainCategory];
    if (categoryDirections && categoryDirections[result.subCategory]) {
      return categoryDirections[result.subCategory];
    }

    return result.suggestion || '코드를 검토하고 수정하세요';
  }

  /**
   * 코드 예시 제공
   */
  private getCodeExample(result: NormalizedResult): string | undefined {
    // 보안 관련 예시
    if (result.mainCategory === 'SECURITY' && result.subCategory === 'SECRET') {
      return `// Before
const API_KEY = 'hardcoded-key';

// After
const API_KEY = process.env.API_KEY;`;
    }

    if (result.mainCategory === 'SECURITY' && result.subCategory === 'INJECTION') {
      return `// Before
const query = \`SELECT * FROM users WHERE id = \${userId}\`;

// After
const query = 'SELECT * FROM users WHERE id = ?';
db.execute(query, [userId]);`;
    }

    return undefined;
  }

  /**
   * 변경 위험도 평가
   */
  private assessRisk(result: NormalizedResult): 'high' | 'medium' | 'low' {
    // 구조 변경은 위험도 높음
    if (result.mainCategory === 'STRUCTURE') return 'high';
    
    // 보안 수정은 중간 위험
    if (result.mainCategory === 'SECURITY') return 'medium';
    
    // 스타일/테스트는 낮은 위험
    if (result.mainCategory === 'STANDARDS' || result.mainCategory === 'TEST') return 'low';
    
    return 'medium';
  }

  /**
   * 수정 노력도 추정
   */
  private estimateEffort(result: NormalizedResult): 'high' | 'medium' | 'low' {
    // 순환 의존성 해결은 높은 노력
    if (result.subCategory === 'CIRCULAR') return 'high';
    
    // 레이어 위반 수정은 높은 노력
    if (result.subCategory === 'LAYER') return 'high';
    
    // 테스트 작성은 중간 노력
    if (result.mainCategory === 'TEST') return 'medium';
    
    // 네이밍/포맷은 낮은 노력
    if (result.subCategory === 'NAMING' || result.subCategory === 'FORMAT') return 'low';
    
    return 'medium';
  }

  /**
   * AI 프롬프트 생성
   */
  private buildImprovementPrompt(result: NormalizedResult): string {
    return `다음 코드 분석 결과에 대한 개선 방향을 제안해주세요.

## 분석 결과
- 메시지: ${result.message}
- 심각도: ${result.severity}
- 카테고리: ${result.mainCategory} > ${result.subCategory}
- 파일: ${result.filePath}
- 줄: ${result.lineStart}-${result.lineEnd}

## 요청
1. 구체적인 수정 방향 제안
2. 가능하다면 수정 전/후 코드 예시
3. 변경 시 주의할 점

한국어로 답변해주세요.`;
  }

  /**
   * AI 활성화 상태
   */
  isAIEnabled(): boolean {
    return this.aiEnabled;
  }

  setAIEnabled(enabled: boolean): void {
    this.aiEnabled = enabled;
  }
}
