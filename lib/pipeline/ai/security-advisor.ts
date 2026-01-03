/**
 * AI 보안 개선 도출기
 * 
 * 보안 파서 결과를 기반으로 OWASP 가이드 대응 방안 제시
 * 정규화 이후에만 AI를 사용합니다.
 */

import { NormalizedResult } from '../types';

interface SecurityAdvice {
  resultId: string;
  owaspCategory?: string;
  cweId?: string;
  risk: string;
  recommendation: string;
  remediationSteps: string[];
  references: string[];
}

// OWASP Top 10 2021 매핑
const OWASP_MAP: Record<string, { category: string; cwe: string; risk: string }> = {
  SECRET: {
    category: 'A02:2021 – Cryptographic Failures',
    cwe: 'CWE-798',
    risk: '하드코딩된 자격 증명은 쉽게 노출됩니다'
  },
  INJECTION: {
    category: 'A03:2021 – Injection',
    cwe: 'CWE-89',
    risk: 'SQL Injection으로 데이터 유출/변조 가능'
  },
  XSS: {
    category: 'A03:2021 – Injection',
    cwe: 'CWE-79',
    risk: '사용자 세션 탈취, 피싱 공격 가능'
  },
  INPUT_VALIDATION: {
    category: 'A03:2021 – Injection',
    cwe: 'CWE-20',
    risk: '다양한 인젝션 공격에 취약'
  }
};

// 중분류별 권장사항
const RECOMMENDATIONS: Record<string, { recommendation: string; steps: string[] }> = {
  SECRET: {
    recommendation: '시크릿을 코드에서 분리하세요',
    steps: [
      '1. 하드코딩된 값을 환경 변수로 이동',
      '2. .env 파일을 .gitignore에 추가',
      '3. 프로덕션에서는 시크릿 매니저 사용 (AWS Secrets Manager, HashiCorp Vault 등)',
      '4. 기존 노출된 키는 폐기하고 새로 발급'
    ]
  },
  INJECTION: {
    recommendation: '파라미터화된 쿼리를 사용하세요',
    steps: [
      '1. 문자열 연결 대신 파라미터 바인딩 사용',
      '2. ORM을 활용하면 자동으로 이스케이프 처리됨',
      '3. 입력 검증을 추가로 수행',
      '4. 최소 권한 원칙으로 DB 계정 설정'
    ]
  },
  XSS: {
    recommendation: '출력 시 이스케이프 처리를 하세요',
    steps: [
      '1. innerHTML 대신 textContent 사용',
      '2. React에서는 dangerouslySetInnerHTML 피하기',
      '3. DOMPurify 등 라이브러리로 sanitize',
      '4. CSP(Content Security Policy) 헤더 설정'
    ]
  },
  INPUT_VALIDATION: {
    recommendation: '모든 입력을 검증하세요',
    steps: [
      '1. 화이트리스트 기반 검증 (허용 패턴 정의)',
      '2. 스키마 검증 라이브러리 사용 (Zod, Joi 등)',
      '3. 길이 제한, 타입 검사 필수',
      '4. 서버 측에서도 반드시 검증'
    ]
  }
};

export class SecurityAdvisor {
  private aiEnabled: boolean;

  constructor(options?: { aiEnabled?: boolean }) {
    this.aiEnabled = options?.aiEnabled ?? false;
  }

  /**
   * 보안 조언 생성
   */
  async advise(result: NormalizedResult): Promise<SecurityAdvice> {
    // 보안 카테고리가 아니면 기본 조언
    if (result.mainCategory !== 'SECURITY') {
      return this.createDefaultAdvice(result);
    }

    if (this.aiEnabled) {
      // AI 기반 조언 (추후 구현)
      const prompt = this.buildSecurityPrompt(result);
      // AI 호출...
    }

    return this.createOWASPBasedAdvice(result);
  }

  /**
   * 여러 보안 결과에 대한 조언 일괄 생성
   */
  async adviseBatch(results: NormalizedResult[]): Promise<SecurityAdvice[]> {
    const securityResults = results.filter(r => r.mainCategory === 'SECURITY');
    const advices: SecurityAdvice[] = [];

    for (const result of securityResults) {
      const advice = await this.advise(result);
      advices.push(advice);
    }

    return advices;
  }

  /**
   * OWASP 기반 조언 생성
   */
  private createOWASPBasedAdvice(result: NormalizedResult): SecurityAdvice {
    const subCategory = result.subCategory;
    const owaspInfo = OWASP_MAP[subCategory];
    const recommendationInfo = RECOMMENDATIONS[subCategory];

    return {
      resultId: result.id,
      owaspCategory: owaspInfo?.category,
      cweId: owaspInfo?.cwe,
      risk: owaspInfo?.risk || '보안 위험이 있습니다',
      recommendation: recommendationInfo?.recommendation || result.suggestion || '보안 검토가 필요합니다',
      remediationSteps: recommendationInfo?.steps || ['코드를 검토하고 보안 취약점을 수정하세요'],
      references: this.getReferences(subCategory, owaspInfo?.cwe)
    };
  }

  /**
   * 기본 조언 생성
   */
  private createDefaultAdvice(result: NormalizedResult): SecurityAdvice {
    return {
      resultId: result.id,
      risk: result.message,
      recommendation: result.suggestion || '코드 검토가 필요합니다',
      remediationSteps: ['해당 코드를 검토하세요'],
      references: []
    };
  }

  /**
   * 참고 자료 링크
   */
  private getReferences(subCategory: string, cweId?: string): string[] {
    const refs: string[] = [];
    
    // OWASP
    if (subCategory === 'INJECTION' || subCategory === 'XSS') {
      refs.push('https://owasp.org/Top10/A03_2021-Injection/');
    }
    if (subCategory === 'SECRET') {
      refs.push('https://owasp.org/Top10/A02_2021-Cryptographic_Failures/');
    }
    
    // CWE
    if (cweId) {
      const cweNum = cweId.replace('CWE-', '');
      refs.push(`https://cwe.mitre.org/data/definitions/${cweNum}.html`);
    }

    return refs;
  }

  /**
   * AI 프롬프트 생성
   */
  private buildSecurityPrompt(result: NormalizedResult): string {
    const owaspInfo = OWASP_MAP[result.subCategory];
    
    return `다음 보안 취약점에 대한 상세 분석과 대응 방안을 제공해주세요.

## 취약점 정보
- 메시지: ${result.message}
- 심각도: ${result.severity}
- 카테고리: ${result.subCategory}
- 파일: ${result.filePath}
- 줄: ${result.lineStart}-${result.lineEnd}
${owaspInfo ? `- OWASP: ${owaspInfo.category}` : ''}
${owaspInfo?.cwe ? `- CWE: ${owaspInfo.cwe}` : ''}

## 요청
1. 이 취약점의 실제 위험 시나리오
2. 구체적인 수정 방법 (코드 예시 포함)
3. 테스트 방법
4. 유사 취약점 예방 방법

한국어로 답변해주세요.`;
  }

  /**
   * OWASP 카테고리 조회
   */
  getOWASPCategory(subCategory: string): string | undefined {
    return OWASP_MAP[subCategory]?.category;
  }

  /**
   * 보안 심각도 기반 우선순위
   */
  static prioritize(advices: SecurityAdvice[]): SecurityAdvice[] {
    // CWE 점수 기반 (간소화된 버전)
    const criticality: Record<string, number> = {
      'CWE-89': 10,   // SQL Injection
      'CWE-798': 9,   // Hardcoded Credentials
      'CWE-79': 8,    // XSS
      'CWE-20': 7     // Input Validation
    };

    return advices.sort((a, b) => {
      const aScore = a.cweId ? (criticality[a.cweId] || 5) : 5;
      const bScore = b.cweId ? (criticality[b.cweId] || 5) : 5;
      return bScore - aScore;
    });
  }

  isAIEnabled(): boolean {
    return this.aiEnabled;
  }

  setAIEnabled(enabled: boolean): void {
    this.aiEnabled = enabled;
  }
}
