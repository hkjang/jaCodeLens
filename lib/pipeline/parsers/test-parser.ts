/**
 * 테스트 분석 파서
 * 
 * 테스트 파일 존재 여부, 테스트 패턴, 커버리지 추정
 * AI 사용 없이 룰/정규식 기반으로 분석합니다.
 */

import * as path from 'path';
import {
  FileInfo,
  RuleViolation,
  RuleCategory,
  Severity,
  ASTLocation
} from '../types';

interface TestCoverageInfo {
  sourceFile: string;
  testFile: string | null;
  hasTest: boolean;
  testCount: number;
}

export class TestParser {
  // 테스트 파일 패턴
  private testPatterns = [
    /\.test\.\w+$/,
    /\.spec\.\w+$/,
    /_test\.\w+$/,
    /tests?\//i,
    /__tests__\//
  ];

  // 소스 파일 패턴 (테스트 대상)
  private sourcePatterns = [
    /\.tsx?$/,
    /\.jsx?$/,
    /\.py$/
  ];

  // 제외 패턴
  private excludePatterns = [
    /node_modules/,
    /\.d\.ts$/,
    /index\.\w+$/
  ];

  /**
   * 테스트 분석
   */
  parseFiles(files: FileInfo[]): {
    violations: RuleViolation[];
    coverage: TestCoverageInfo[];
  } {
    const violations: RuleViolation[] = [];
    const coverage: TestCoverageInfo[] = [];

    // 파일 분류
    const sourceFiles = files.filter(f => this.isSourceFile(f.path));
    const testFiles = files.filter(f => this.isTestFile(f.path));
    const testFileSet = new Set(testFiles.map(f => f.path));

    // 각 소스 파일에 대한 테스트 존재 여부 확인
    for (const source of sourceFiles) {
      const expectedTestFile = this.getExpectedTestFile(source.path);
      const hasTest = testFileSet.has(expectedTestFile) || 
                      this.findMatchingTest(source.path, testFiles);
      
      coverage.push({
        sourceFile: source.path,
        testFile: hasTest ? expectedTestFile : null,
        hasTest,
        testCount: 0  // 테스트 파일 내용 분석 후 업데이트
      });

      if (!hasTest && this.isSignificantFile(source)) {
        violations.push({
          ruleId: 'TEST001',
          ruleName: 'missing-test',
          category: 'test' as RuleCategory,
          severity: 'MEDIUM',
          message: `테스트 파일이 없습니다: ${path.basename(source.path)}`,
          filePath: source.path,
          location: this.createLocation(source.path, 1, 1),
          suggestion: `${expectedTestFile} 파일을 생성하세요`
        });
      }
    }

    // 테스트 파일 품질 검사
    for (const testFile of testFiles) {
      if (!testFile.content) continue;

      const testViolations = this.analyzeTestFile(testFile);
      violations.push(...testViolations);

      // 테스트 개수 업데이트
      const testCount = this.countTests(testFile.content);
      const covEntry = coverage.find(c => 
        c.testFile === testFile.path || 
        this.isTestFor(testFile.path, c.sourceFile)
      );
      if (covEntry) {
        covEntry.testCount = testCount;
      }
    }

    return { violations, coverage };
  }

  /**
   * 테스트 파일 분석 - 실제 테스트 파일만 검사 (setup/config 제외)
   */
  private analyzeTestFile(file: FileInfo): RuleViolation[] {
    const violations: RuleViolation[] = [];
    if (!file.content) return violations;

    // 실제 테스트 파일만 검사 (.test. 또는 .spec. 포함 파일)
    // setup.ts, config.ts, helper.ts 등은 테스트 구조 검사에서 제외
    const isActualTestFile = /\.(test|spec)\.\w+$/.test(file.path);
    if (!isActualTestFile) {
      return violations;  // setup, config, helper 파일은 검사 안함
    }

    const lines = file.content.split('\n');
    let hasDescribe = false;
    let hasIt = false;
    let hasExpect = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 테스트 구조 검사
      if (/\bdescribe\s*\(/.test(line)) hasDescribe = true;
      if (/\b(?:it|test)\s*\(/.test(line)) hasIt = true;
      if (/\bexpect\s*\(/.test(line)) hasExpect = true;

      // skip된 테스트
      if (/\b(?:it|test|describe)\.skip\s*\(/.test(line)) {
        violations.push({
          ruleId: 'TEST010',
          ruleName: 'skipped-test',
          category: 'test' as RuleCategory,
          severity: 'LOW',
          message: '스킵된 테스트가 있습니다',
          filePath: file.path,
          location: this.createLocation(file.path, i + 1, i + 1),
          suggestion: '스킵 이유를 확인하고 해결하세요'
        });
      }

      // only 테스트 (CI에서 문제)
      if (/\b(?:it|test|describe)\.only\s*\(/.test(line)) {
        violations.push({
          ruleId: 'TEST011',
          ruleName: 'focused-test',
          category: 'test' as RuleCategory,
          severity: 'HIGH',
          message: '.only가 있는 테스트 (다른 테스트가 실행되지 않음)',
          filePath: file.path,
          location: this.createLocation(file.path, i + 1, i + 1),
          suggestion: '커밋 전에 .only를 제거하세요'
        });
      }

      // 빈 테스트
      if (/\b(?:it|test)\s*\(\s*['"][^'"]+['"]\s*,\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(line)) {
        violations.push({
          ruleId: 'TEST012',
          ruleName: 'empty-test',
          category: 'test' as RuleCategory,
          severity: 'MEDIUM',
          message: '빈 테스트 케이스',
          filePath: file.path,
          location: this.createLocation(file.path, i + 1, i + 1),
          suggestion: '테스트 내용을 구현하세요'
        });
      }

      // console.log in test
      if (/console\.log\s*\(/.test(line)) {
        violations.push({
          ruleId: 'TEST013',
          ruleName: 'console-in-test',
          category: 'test' as RuleCategory,
          severity: 'INFO',
          message: '테스트에 console.log가 있습니다',
          filePath: file.path,
          location: this.createLocation(file.path, i + 1, i + 1),
          suggestion: '디버깅 후 제거하세요'
        });
      }
    }

    // 테스트 구조 검사
    if (!hasIt && !hasDescribe) {
      violations.push({
        ruleId: 'TEST020',
        ruleName: 'no-test-structure',
        category: 'test' as RuleCategory,
        severity: 'HIGH',
        message: '테스트 구조가 없습니다 (describe/it/test)',
        filePath: file.path,
        location: this.createLocation(file.path, 1, 1),
        suggestion: '적절한 테스트 구조를 추가하세요'
      });
    }

    if (hasIt && !hasExpect) {
      violations.push({
        ruleId: 'TEST021',
        ruleName: 'no-assertions',
        category: 'test' as RuleCategory,
        severity: 'MEDIUM',
        message: 'assertion (expect)이 없습니다',
        filePath: file.path,
        location: this.createLocation(file.path, 1, 1),
        suggestion: 'expect 문을 추가하세요'
      });
    }

    return violations;
  }

  /**
   * 테스트 개수 카운트
   */
  private countTests(content: string): number {
    const matches = content.match(/\b(?:it|test)\s*\(/g);
    return matches ? matches.length : 0;
  }

  /**
   * 소스 파일인지 확인
   */
  private isSourceFile(filePath: string): boolean {
    if (this.isTestFile(filePath)) return false;
    if (this.excludePatterns.some(p => p.test(filePath))) return false;
    return this.sourcePatterns.some(p => p.test(filePath));
  }

  /**
   * 테스트 파일인지 확인
   */
  private isTestFile(filePath: string): boolean {
    return this.testPatterns.some(p => p.test(filePath));
  }

  /**
   * 중요 파일인지 확인 (테스트 필요성)
   */
  private isSignificantFile(file: FileInfo): boolean {
    if (!file.content) return false;
    
    // 최소 라인 수
    const lines = file.content.split('\n').length;
    if (lines < 20) return false;

    // 함수/클래스 포함 여부
    const hasLogic = /(?:function|class|const\s+\w+\s*=\s*(?:async\s*)?\(|export\s+(?:async\s+)?function)/.test(file.content);
    
    return hasLogic;
  }

  /**
   * 예상 테스트 파일 경로
   */
  private getExpectedTestFile(sourcePath: string): string {
    const dir = path.dirname(sourcePath);
    const ext = path.extname(sourcePath);
    const base = path.basename(sourcePath, ext);
    
    return path.join(dir, `${base}.test${ext}`);
  }

  /**
   * 매칭되는 테스트 파일 찾기
   */
  private findMatchingTest(sourcePath: string, testFiles: FileInfo[]): boolean {
    const sourceBase = path.basename(sourcePath, path.extname(sourcePath));
    
    return testFiles.some(test => {
      const testBase = path.basename(test.path)
        .replace(/\.(test|spec)/, '')
        .replace(path.extname(test.path), '');
      return testBase === sourceBase;
    });
  }

  /**
   * 테스트 파일이 소스 파일용인지 확인
   */
  private isTestFor(testPath: string, sourcePath: string): boolean {
    const sourceBase = path.basename(sourcePath, path.extname(sourcePath));
    return testPath.includes(sourceBase);
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
