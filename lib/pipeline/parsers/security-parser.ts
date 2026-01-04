/**
 * 보안 패턴 파서
 * 
 * SQL Injection, XSS, 시크릿 노출 등 보안 취약점 패턴 탐지
 * AI 사용 없이 룰/정규식 기반으로 분석합니다.
 */

import {
  FileInfo,
  RuleViolation,
  RuleCategory,
  Severity,
  ASTLocation
} from '../types';

interface SecurityRule {
  id: string;
  name: string;
  severity: Severity;
  pattern: RegExp;
  message: string;
  suggestion?: string;
  references?: string[];
  filePatterns?: RegExp;  // 적용 대상 파일 패턴
}

// 분석에서 제외할 파일 패턴 (룰 정의 파일 자체는 분석하지 않음)
const EXCLUDED_FILE_PATTERNS = [
  /lib[\/\\]pipeline[\/\\]parsers[\/\\]/,  // Parser definition files
  /__tests__[\/\\]/,                        // Test files
  /\.test\.(ts|tsx|js|jsx)$/,               // Test file extensions
  /\.spec\.(ts|tsx|js|jsx)$/,               // Spec file extensions
  /prisma[\/\\]seed\.ts$/,                  // Seed data file
  /prisma[\/\\]/,                           // Prisma schema/migrations
  /lib[\/\\]services[\/\\]/,               // Service files with sample data
  /lib[\/\\]pipeline[\/\\]source[\/\\]/,  // Source sync (has password interface)
];

// 보안 룰 정의
const SECURITY_RULES: SecurityRule[] = [
  // 하드코딩된 시크릿
  {
    id: 'SEC001',
    name: 'hardcoded-aws-key',
    severity: 'CRITICAL',
    pattern: /AWS_ACCESS_KEY_ID\s*[=:]\s*['"][A-Z0-9]{20}['"]/i,
    message: 'AWS Access Key가 하드코딩되어 있습니다',
    suggestion: '환경 변수나 시크릿 매니저를 사용하세요',
    references: ['https://cwe.mitre.org/data/definitions/798.html']
  },
  {
    id: 'SEC002',
    name: 'hardcoded-aws-secret',
    severity: 'CRITICAL',
    pattern: /AWS_SECRET_ACCESS_KEY\s*[=:]\s*['"][A-Za-z0-9/+=]{40}['"]/i,
    message: 'AWS Secret Key가 하드코딩되어 있습니다',
    suggestion: '환경 변수나 시크릿 매니저를 사용하세요',
    references: ['https://cwe.mitre.org/data/definitions/798.html']
  },
  {
    id: 'SEC003',
    name: 'hardcoded-password',
    severity: 'HIGH',
    // More precise pattern: must be assignment (=) with quoted string value
    // Excludes: interface fields (:), optional properties (?:), type annotations
    pattern: /(?:const|let|var)\s+(?:password|passwd|pwd)\s*=\s*['\"][^'\"]{6,}['\"]|(?:password|passwd|pwd)\s*=\s*['\"][^'\"]{6,}['\"]/i,
    message: '비밀번호가 하드코딩되어 있을 수 있습니다',
    suggestion: '환경 변수나 시크릿 매니저를 사용하세요',
    references: ['https://cwe.mitre.org/data/definitions/798.html']
  },
  {
    id: 'SEC004',
    name: 'hardcoded-api-key',
    severity: 'HIGH',
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"][A-Za-z0-9_\-]{20,}['"]/i,
    message: 'API Key가 하드코딩되어 있을 수 있습니다',
    suggestion: '환경 변수를 사용하세요',
    references: ['https://cwe.mitre.org/data/definitions/798.html']
  },
  {
    id: 'SEC005',
    name: 'jwt-secret-hardcoded',
    severity: 'HIGH',
    pattern: /(?:jwt[_-]?secret|token[_-]?secret)\s*[=:]\s*['"][^'"]{10,}['"]/i,
    message: 'JWT Secret이 하드코딩되어 있습니다',
    suggestion: '환경 변수를 사용하세요',
    references: ['https://owasp.org/Top10/A02_2021-Cryptographic_Failures/']
  },

  // SQL Injection
  {
    id: 'SEC010',
    name: 'sql-injection-string-concat',
    severity: 'HIGH',
    pattern: /(?:query|execute|raw)\s*\(\s*[`'"].*?\$\{.*?\}.*?[`'"]/,
    message: 'SQL Injection 취약점: 문자열 보간 사용',
    suggestion: '파라미터화된 쿼리를 사용하세요',
    references: ['https://owasp.org/Top10/A03_2021-Injection/']
  },
  {
    id: 'SEC011',
    name: 'sql-injection-concat',
    severity: 'HIGH',
    pattern: /(?:query|execute)\s*\([^)]*\+\s*(?:req\.|request\.|params\.|body\.)/,
    message: 'SQL Injection 취약점: 사용자 입력 직접 연결',
    suggestion: '파라미터화된 쿼리를 사용하세요',
    references: ['https://owasp.org/Top10/A03_2021-Injection/']
  },

  // XSS
  {
    id: 'SEC020',
    name: 'xss-innerhtml',
    severity: 'HIGH',
    pattern: /\.innerHTML\s*=\s*(?!['"`])/,
    message: 'XSS 취약점: innerHTML에 동적 값 할당',
    suggestion: 'textContent나 DOMPurify를 사용하세요',
    references: ['https://owasp.org/Top10/A03_2021-Injection/']
  },
  {
    id: 'SEC021',
    name: 'xss-dangerously-set',
    severity: 'MEDIUM',
    pattern: /dangerouslySetInnerHTML/,
    message: 'XSS 주의: dangerouslySetInnerHTML 사용',
    suggestion: '사용자 입력을 sanitize하세요',
    references: ['https://owasp.org/Top10/A03_2021-Injection/']
  },

  // 불안전한 함수
  {
    id: 'SEC030',
    name: 'eval-usage',
    severity: 'CRITICAL',
    pattern: /\beval\s*\(/,
    message: 'eval() 사용은 보안 위험이 있습니다',
    suggestion: 'eval 대신 안전한 대안을 사용하세요',
    references: ['https://cwe.mitre.org/data/definitions/95.html']
  },
  {
    id: 'SEC031',
    name: 'function-constructor',
    severity: 'HIGH',
    pattern: /new\s+Function\s*\(/,
    message: 'new Function()은 eval과 유사한 보안 위험이 있습니다',
    suggestion: '다른 방법을 사용하세요',
    references: ['https://cwe.mitre.org/data/definitions/95.html']
  },

  // 암호화
  {
    id: 'SEC040',
    name: 'weak-crypto-md5',
    severity: 'MEDIUM',
    pattern: /(?:createHash|crypto\.)?(?:'md5'|"md5"|`md5`)/,
    message: 'MD5는 약한 해시 알고리즘입니다',
    suggestion: 'SHA-256 이상을 사용하세요',
    references: ['https://cwe.mitre.org/data/definitions/328.html']
  },
  {
    id: 'SEC041',
    name: 'weak-crypto-sha1',
    severity: 'LOW',
    pattern: /(?:createHash|crypto\.)?(?:'sha1'|"sha1"|`sha1`)/,
    message: 'SHA-1은 권장되지 않는 해시 알고리즘입니다',
    suggestion: 'SHA-256 이상을 사용하세요',
    references: ['https://cwe.mitre.org/data/definitions/328.html']
  },

  // HTTP 보안
  {
    id: 'SEC050',
    name: 'http-no-https',
    severity: 'MEDIUM',
    pattern: /['"]http:\/\/(?!localhost|127\.0\.0\.1)/,
    message: 'HTTPS 대신 HTTP 사용',
    suggestion: 'HTTPS를 사용하세요',
    references: ['https://owasp.org/Top10/A02_2021-Cryptographic_Failures/']
  },
  {
    id: 'SEC051',
    name: 'cors-allow-all',
    severity: 'MEDIUM',
    pattern: /(?:Access-Control-Allow-Origin|cors).*?['"]?\*['"]?/i,
    message: 'CORS에서 모든 origin 허용',
    suggestion: '특정 origin만 허용하세요',
    references: ['https://owasp.org/Top10/A05_2021-Security_Misconfiguration/']
  },

  // 인증/인가
  {
    id: 'SEC060',
    name: 'disabled-auth',
    severity: 'HIGH',
    pattern: /(?:auth|authentication|authorize)\s*[=:]\s*false/i,
    message: '인증이 비활성화되어 있습니다',
    suggestion: '인증을 활성화하세요',
    references: ['https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/']
  },

  // 불안전한 역직렬화
  {
    id: 'SEC070',
    name: 'unsafe-deserialize',
    severity: 'HIGH',
    pattern: /JSON\.parse\s*\(\s*(?:req\.|request\.|body)/,
    message: '사용자 입력의 직접적인 역직렬화',
    suggestion: '입력 검증 후 파싱하세요',
    references: ['https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/']
  },

  // 로깅
  {
    id: 'SEC080',
    name: 'sensitive-data-logging',
    severity: 'MEDIUM',
    pattern: /console\.log\s*\([^)]*(?:password|secret|token|key|credential)/i,
    message: '민감한 정보가 로그에 출력될 수 있습니다',
    suggestion: '민감한 정보는 마스킹하세요',
    references: ['https://cwe.mitre.org/data/definitions/532.html']
  }
];

export class SecurityParser {
  private rules: SecurityRule[];

  constructor(customRules?: SecurityRule[]) {
    this.rules = customRules || SECURITY_RULES;
  }

  /**
   * 파일 보안 분석
   */
  parseFile(file: FileInfo): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    if (!file.content) return violations;

    // 제외 패턴 체크 - 룰 정의 파일, 테스트 파일은 분석 제외
    if (EXCLUDED_FILE_PATTERNS.some(pattern => pattern.test(file.path))) {
      return violations;
    }

    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const rule of this.rules) {
        // 파일 패턴 필터
        if (rule.filePatterns && !rule.filePatterns.test(file.path)) {
          continue;
        }

        if (rule.pattern.test(line)) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            category: 'security' as RuleCategory,
            severity: rule.severity,
            message: rule.message,
            filePath: file.path,
            location: this.createLocation(file.path, i + 1, i + 1),
            suggestion: rule.suggestion,
            references: rule.references
          });
        }
      }
    }

    return violations;
  }

  /**
   * 여러 파일 분석
   */
  parseFiles(files: FileInfo[]): RuleViolation[] {
    const allViolations: RuleViolation[] = [];

    for (const file of files) {
      const violations = this.parseFile(file);
      allViolations.push(...violations);
    }

    return allViolations;
  }

  /**
   * 사용 가능한 룰 목록
   */
  getRules(): SecurityRule[] {
    return this.rules;
  }

  /**
   * 심각도별 통계
   */
  getStatsBySeverity(violations: RuleViolation[]): Record<Severity, number> {
    const stats: Record<Severity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0
    };

    for (const v of violations) {
      stats[v.severity]++;
    }

    return stats;
  }

  /**
   * ASTLocation 생성
   */
  private createLocation(filePath: string, startLine: number, endLine: number): ASTLocation {
    return {
      start: { line: startLine, column: 0 },
      end: { line: endLine, column: 0 },
      filePath
    };
  }
}
