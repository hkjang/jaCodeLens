/**
 * AI 프롬프트 구조화
 * 
 * AI 분석을 위한 입력 데이터 정제 및 프롬프트 구조화
 * - 최소화된 입력
 * - AST 링크 근거
 * - 길이 제한
 * - 민감 정보 제거
 * - 컨텍스트 포함
 */

import { NormalizedResult, ASTFile, ASTNode, Severity, MainCategory } from '../types';

// ============================================================================
// 타입 정의
// ============================================================================

export interface PromptContext {
  result: NormalizedResult;
  codeSnippet?: string;
  astContext?: ASTContext;
  relatedIssues?: NormalizedResult[];
  projectContext?: ProjectContext;
}

export interface ASTContext {
  nodeType: string;
  nodeName: string;
  parentNode?: string;
  childrenCount: number;
  imports: string[];
  exports: string[];
}

export interface ProjectContext {
  language: string;
  framework?: string;
  fileCount: number;
  averageComplexity?: number;
}

export interface PromptConfig {
  maxCodeLength: number;        // 최대 코드 길이
  maxContextLength: number;     // 최대 컨텍스트 길이
  includeSuggestion: boolean;   // 제안 포함
  includeRelated: boolean;      // 관련 이슈 포함
  language: 'ko' | 'en';        // 응답 언어
  removeSensitive: boolean;     // 민감 정보 제거
}

export type PromptType = 
  | 'explanation'    // 설명 생성
  | 'suggestion'     // 개선 제안
  | 'security'       // 보안 조언
  | 'summary';       // 요약

const DEFAULT_CONFIG: PromptConfig = {
  maxCodeLength: 500,
  maxContextLength: 200,
  includeSuggestion: true,
  includeRelated: false,
  language: 'ko',
  removeSensitive: true,
};

// ============================================================================
// 프롬프트 빌더
// ============================================================================

export class PromptBuilder {
  private config: PromptConfig;

  constructor(config?: Partial<PromptConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 설명 생성 프롬프트
   */
  buildExplanationPrompt(context: PromptContext): string {
    const { result, codeSnippet, astContext } = context;

    const sections: string[] = [];

    // 역할 정의
    sections.push(this.buildSystemRole('explanation'));

    // 분석 결과
    sections.push(this.buildResultSection(result));

    // 코드 스니펫
    if (codeSnippet) {
      sections.push(this.buildCodeSection(codeSnippet));
    }

    // AST 컨텍스트
    if (astContext) {
      sections.push(this.buildASTContextSection(astContext));
    }

    // 요청
    sections.push(this.buildExplanationRequest());

    return sections.join('\n\n');
  }

  /**
   * 개선 제안 프롬프트
   */
  buildSuggestionPrompt(context: PromptContext): string {
    const { result, codeSnippet, relatedIssues } = context;

    const sections: string[] = [];

    sections.push(this.buildSystemRole('suggestion'));
    sections.push(this.buildResultSection(result));

    if (codeSnippet) {
      sections.push(this.buildCodeSection(codeSnippet));
    }

    if (relatedIssues && relatedIssues.length > 0) {
      sections.push(this.buildRelatedIssuesSection(relatedIssues));
    }

    sections.push(this.buildSuggestionRequest());

    return sections.join('\n\n');
  }

  /**
   * 보안 조언 프롬프트
   */
  buildSecurityPrompt(context: PromptContext): string {
    const { result, codeSnippet } = context;

    const sections: string[] = [];

    sections.push(this.buildSystemRole('security'));
    sections.push(this.buildResultSection(result));

    if (codeSnippet) {
      sections.push(this.buildCodeSection(codeSnippet, true)); // 민감정보 마스킹
    }

    sections.push(this.buildSecurityRequest());

    return sections.join('\n\n');
  }

  /**
   * 요약 프롬프트 (다중 결과)
   */
  buildSummaryPrompt(results: NormalizedResult[], projectContext?: ProjectContext): string {
    const sections: string[] = [];

    sections.push(this.buildSystemRole('summary'));
    sections.push(this.buildMultiResultSection(results));

    if (projectContext) {
      sections.push(this.buildProjectContextSection(projectContext));
    }

    sections.push(this.buildSummaryRequest());

    return sections.join('\n\n');
  }

  // =========== 프롬프트 섹션 빌더 ===========

  private buildSystemRole(type: PromptType): string {
    const roles: Record<PromptType, string> = {
      explanation: `당신은 코드 분석 전문가입니다. 분석 결과를 개발자가 이해하기 쉽게 설명하세요.`,
      suggestion: `당신은 시니어 소프트웨어 엔지니어입니다. 코드 개선 방향을 구체적으로 제안하세요.`,
      security: `당신은 보안 전문가입니다. 취약점을 분석하고 완화 방법을 제시하세요.`,
      summary: `당신은 기술 리더입니다. 분석 결과를 요약하고 우선순위를 제시하세요.`,
    };

    return `## 역할\n${roles[type]}`;
  }

  private buildResultSection(result: NormalizedResult): string {
    const severityKo: Record<Severity, string> = {
      CRITICAL: '치명적',
      HIGH: '높음',
      MEDIUM: '중간',
      LOW: '낮음',
      INFO: '정보',
    };

    const categoryKo: Record<MainCategory, string> = {
      STRUCTURE: '구조',
      QUALITY: '품질',
      SECURITY: '보안',
      OPERATIONS: '운영',
      TEST: '테스트',
      STANDARDS: '표준',
    };

    return `## 분석 결과
- **메시지**: ${result.message}
- **심각도**: ${severityKo[result.severity]} (${result.severity})
- **카테고리**: ${categoryKo[result.mainCategory]} > ${result.subCategory}
- **파일**: ${result.filePath}
- **위치**: ${result.lineStart}~${result.lineEnd}번째 줄
- **규칙 ID**: ${result.ruleId}${result.suggestion ? `\n- **기존 제안**: ${result.suggestion}` : ''}`;
  }

  private buildCodeSection(code: string, maskSensitive: boolean = false): string {
    let processedCode = code;

    // 길이 제한
    if (processedCode.length > this.config.maxCodeLength) {
      processedCode = processedCode.slice(0, this.config.maxCodeLength) + '\n... (생략됨)';
    }

    // 민감정보 마스킹
    if (maskSensitive || this.config.removeSensitive) {
      processedCode = this.maskSensitiveData(processedCode);
    }

    return `## 관련 코드
\`\`\`
${processedCode}
\`\`\``;
  }

  private buildASTContextSection(context: ASTContext): string {
    return `## AST 컨텍스트
- **노드 타입**: ${context.nodeType}
- **노드 이름**: ${context.nodeName}
- **부모 노드**: ${context.parentNode || '없음'}
- **자식 수**: ${context.childrenCount}
- **가져오기**: ${context.imports.slice(0, 5).join(', ') || '없음'}
- **내보내기**: ${context.exports.slice(0, 5).join(', ') || '없음'}`;
  }

  private buildRelatedIssuesSection(issues: NormalizedResult[]): string {
    const limited = issues.slice(0, 3);
    const items = limited.map(i => `- [${i.severity}] ${i.message} (${i.filePath}:${i.lineStart})`);
    
    return `## 관련 이슈
${items.join('\n')}`;
  }

  private buildProjectContextSection(context: ProjectContext): string {
    return `## 프로젝트 정보
- **주요 언어**: ${context.language}
- **프레임워크**: ${context.framework || '없음'}
- **파일 수**: ${context.fileCount}개
- **평균 복잡도**: ${context.averageComplexity?.toFixed(1) || 'N/A'}`;
  }

  private buildMultiResultSection(results: NormalizedResult[]): string {
    const bySeverity: Record<Severity, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0,
    };
    const byCategory: Record<string, number> = {};

    for (const r of results) {
      bySeverity[r.severity]++;
      byCategory[r.mainCategory] = (byCategory[r.mainCategory] || 0) + 1;
    }

    const severityLines = Object.entries(bySeverity)
      .filter(([, count]) => count > 0)
      .map(([sev, count]) => `- ${sev}: ${count}개`);

    const categoryLines = Object.entries(byCategory)
      .map(([cat, count]) => `- ${cat}: ${count}개`);

    return `## 분석 결과 통계
**총 ${results.length}개 이슈**

### 심각도별
${severityLines.join('\n')}

### 카테고리별
${categoryLines.join('\n')}`;
  }

  private buildExplanationRequest(): string {
    const lang = this.config.language === 'ko' ? '한국어' : 'English';
    
    return `## 요청
다음 형식으로 ${lang}로 응답하세요:

\`\`\`json
{
  "explanation": "이 문제에 대한 상세 설명 (100-300자)",
  "rootCause": "근본 원인",
  "impact": "해결하지 않을 경우 영향",
  "confidence": 0.0~1.0 사이의 신뢰도,
  "nodeIds": ["관련 AST 노드 ID 배열 (있는 경우)"]
}
\`\`\``;
  }

  private buildSuggestionRequest(): string {
    return `## 요청
다음 형식으로 응답하세요:

\`\`\`json
{
  "direction": "구체적인 개선 방향 (100-300자)",
  "codeSnippet": "예시 코드 (선택사항)",
  "effort": "LOW | MEDIUM | HIGH",
  "priority": "IMMEDIATE | SHORT_TERM | LONG_TERM",
  "confidence": 0.0~1.0 사이의 신뢰도
}
\`\`\``;
  }

  private buildSecurityRequest(): string {
    return `## 요청
다음 형식으로 응답하세요:

\`\`\`json
{
  "recommendation": "보안 권고 (100-400자)",
  "vulnerabilityType": "취약점 유형",
  "cweId": "CWE-XXX (해당되는 경우)",
  "owaspCategory": "OWASP 카테고리 (해당되는 경우)",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "confidence": 0.0~1.0 사이의 신뢰도,
  "mitigationSteps": ["완화 단계 배열"]
}
\`\`\``;
  }

  private buildSummaryRequest(): string {
    return `## 요청
다음 형식으로 요약을 작성하세요:

\`\`\`json
{
  "summary": "전체 분석 결과 요약 (200-500자)",
  "topPriorities": ["우선 해결해야 할 상위 3개 이슈"],
  "riskLevel": "HIGH | MEDIUM | LOW",
  "recommendations": ["전반적인 개선 권고 사항"]
}
\`\`\``;
  }

  // =========== 유틸리티 ===========

  private maskSensitiveData(code: string): string {
    // API 키 패턴
    let masked = code.replace(
      /(api[_-]?key|api[_-]?secret|password|secret|token|credential)\s*[=:]\s*["'`]?[^"'`\s]+["'`]?/gi,
      '$1 = "[MASKED]"'
    );

    // 이메일
    masked = masked.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[EMAIL_MASKED]'
    );

    // IP 주소
    masked = masked.replace(
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      '[IP_MASKED]'
    );

    return masked;
  }
}

// ============================================================================
// 프롬프트 캐시
// ============================================================================

export class PromptCache {
  private cache: Map<string, { prompt: string; createdAt: Date }> = new Map();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number = 1000, ttlMs: number = 3600000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.createdAt.getTime() > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.prompt;
  }

  set(key: string, prompt: string): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { prompt, createdAt: new Date() });
  }

  generateKey(result: NormalizedResult, type: PromptType): string {
    return `${type}:${result.id}:${result.filePath}:${result.lineStart}`;
  }
}

// ============================================================================
// 팩토리 함수
// ============================================================================

export function createPromptBuilder(options?: Partial<PromptConfig>): PromptBuilder {
  return new PromptBuilder(options);
}
