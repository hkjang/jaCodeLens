/**
 * 스타일 컨벤션 파서
 * 
 * 네이밍 규칙, 포맷팅, 코드 스타일 검사
 * AI 사용 없이 룰/정규식 기반으로 분석합니다.
 */

import {
  FileInfo,
  RuleViolation,
  RuleCategory,
  Severity,
  ASTLocation
} from '../types';

interface StyleRule {
  id: string;
  name: string;
  severity: Severity;
  pattern: RegExp;
  message: string;
  suggestion?: string;
  fileExtensions?: string[];
}

// 스타일 룰 정의
const STYLE_RULES: StyleRule[] = [
  // 네이밍 컨벤션
  {
    id: 'STY001',
    name: 'camelCase-variable',
    severity: 'LOW',
    pattern: /(?:const|let|var)\s+([A-Z][a-z]+[A-Z])/,
    message: '변수명은 camelCase를 권장합니다',
    suggestion: '첫 글자를 소문자로 변경하세요'
  },
  {
    id: 'STY002',
    name: 'PascalCase-class',
    severity: 'LOW',
    pattern: /class\s+([a-z][a-zA-Z]*)/,
    message: '클래스명은 PascalCase를 권장합니다',
    suggestion: '첫 글자를 대문자로 변경하세요'
  },
  {
    id: 'STY003',
    name: 'constant-uppercase',
    severity: 'INFO',
    pattern: /const\s+([a-z][A-Z_]+)\s*=/,
    message: '상수는 UPPER_SNAKE_CASE를 권장합니다',
    suggestion: '대문자와 언더스코어 사용을 고려하세요'
  },
  {
    id: 'STY004',
    name: 'interface-I-prefix',
    severity: 'INFO',
    pattern: /interface\s+I[A-Z]/,
    message: 'TypeScript에서는 I 접두사가 권장되지 않습니다',
    suggestion: 'I 접두사를 제거하세요',
    fileExtensions: ['.ts', '.tsx']
  },

  // 함수 관련
  {
    id: 'STY010',
    name: 'long-function',
    severity: 'LOW',
    pattern: /^(?:(?!function|const|let|var).)*$/,  // 플레이스홀더 - 실제 분석은 별도
    message: '함수가 너무 깁니다',
    suggestion: '함수를 분리하세요'
  },
  {
    id: 'STY011',
    name: 'too-many-parameters',
    severity: 'MEDIUM',
    pattern: /function\s+\w+\s*\([^)]{100,}\)/,
    message: '파라미터가 너무 많습니다',
    suggestion: '객체 파라미터 사용을 고려하세요'
  },

  // 코멘트
  {
    id: 'STY020',
    name: 'todo-comment',
    severity: 'INFO',
    pattern: /\/\/\s*TODO\b/i,
    message: 'TODO 주석이 있습니다',
    suggestion: 'TODO 항목을 처리하세요'
  },
  {
    id: 'STY021',
    name: 'fixme-comment',
    severity: 'LOW',
    pattern: /\/\/\s*FIXME\b/i,
    message: 'FIXME 주석이 있습니다',
    suggestion: 'FIXME 항목을 처리하세요'
  },
  {
    id: 'STY022',
    name: 'hack-comment',
    severity: 'LOW',
    pattern: /\/\/\s*HACK\b/i,
    message: 'HACK 주석이 있습니다',
    suggestion: '더 나은 해결책을 찾아보세요'
  },

  // 디버그 코드
  {
    id: 'STY030',
    name: 'console-log',
    severity: 'INFO',
    pattern: /console\.log\s*\(/,
    message: 'console.log가 남아있습니다',
    suggestion: '프로덕션 코드에서는 적절한 로거를 사용하세요'
  },
  {
    id: 'STY031',
    name: 'debugger-statement',
    severity: 'MEDIUM',
    pattern: /\bdebugger\b/,
    message: 'debugger 문이 남아있습니다',
    suggestion: '프로덕션 전에 제거하세요'
  },

  // 코드 스멜
  {
    id: 'STY040',
    name: 'magic-number',
    severity: 'INFO',
    pattern: /(?:if|while|for|return)\s*\([^)]*\b(?:[2-9]|[1-9]\d+)\b[^)]*\)/,
    message: '매직 넘버 사용',
    suggestion: '상수로 추출하세요'
  },
  {
    id: 'STY041',
    name: 'nested-ternary',
    severity: 'LOW',
    pattern: /\?[^:]+\?[^:]+:/,
    message: '중첩된 삼항 연산자',
    suggestion: 'if-else나 함수로 분리하세요'
  },
  {
    id: 'STY042',
    name: 'long-line',
    severity: 'INFO',
    pattern: /.{120,}/,
    message: '줄이 너무 깁니다 (120자 초과)',
    suggestion: '줄을 나누세요'
  },

  // Import 순서
  {
    id: 'STY050',
    name: 'unsorted-imports',
    severity: 'INFO',
    pattern: /import.*from.*\nimport.*from/,  // 기본 패턴
    message: 'import 순서를 정리하세요',
    suggestion: '외부/내부 모듈을 분리하고 알파벳 순으로 정렬하세요'
  },

  // 타입스크립트 관련
  {
    id: 'STY060',
    name: 'any-type',
    severity: 'MEDIUM',
    pattern: /:\s*any\b/,
    message: 'any 타입 사용',
    suggestion: '구체적인 타입을 정의하세요',
    fileExtensions: ['.ts', '.tsx']
  },
  {
    id: 'STY061',
    name: 'ts-ignore',
    severity: 'LOW',
    pattern: /@ts-ignore/,
    message: '@ts-ignore 사용',
    suggestion: '타입 오류를 수정하세요',
    fileExtensions: ['.ts', '.tsx']
  },
  {
    id: 'STY062',
    name: 'non-null-assertion',
    severity: 'INFO',
    pattern: /!\./,
    message: 'Non-null assertion (!) 사용',
    suggestion: '적절한 null 체크를 추가하세요',
    fileExtensions: ['.ts', '.tsx']
  }
];

export class StyleParser {
  private rules: StyleRule[];

  constructor(customRules?: StyleRule[]) {
    this.rules = customRules || STYLE_RULES;
  }

  /**
   * 파일 스타일 분석
   */
  parseFile(file: FileInfo): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    if (!file.content) return violations;

    const lines = file.content.split('\n');
    const fileExt = '.' + (file.extension || '');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const rule of this.rules) {
        // 확장자 필터
        if (rule.fileExtensions && !rule.fileExtensions.includes(fileExt)) {
          continue;
        }

        if (rule.pattern.test(line)) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            category: 'style' as RuleCategory,
            severity: rule.severity,
            message: rule.message,
            filePath: file.path,
            location: this.createLocation(file.path, i + 1, i + 1),
            suggestion: rule.suggestion
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
  getRules(): StyleRule[] {
    return this.rules;
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
