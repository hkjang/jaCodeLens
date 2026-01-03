/**
 * 복잡도 분석기
 * 
 * AST 기반 Cyclomatic / Cognitive Complexity 계산
 * AI를 사용하지 않고 결정적으로 분석합니다.
 */

import * as ts from 'typescript';
import {
  ASTFile,
  ComplexityMetric,
  ASTLocation,
  StaticAnalysisResult,
  StaticFinding,
  Severity
} from '../types';

// 복잡도 증가 연산자/키워드
const COMPLEXITY_OPERATORS = new Set(['&&', '||', '??', '?']);
const COMPLEXITY_KEYWORDS = new Set([
  'if', 'else', 'switch', 'case', 'for', 'while', 'do', 
  'catch', 'finally', 'throw'
]);

export class ComplexityAnalyzer {
  private complexityThreshold: number;
  private maxFileLengthLines: number;

  constructor(options?: { complexityThreshold?: number; maxFileLengthLines?: number }) {
    this.complexityThreshold = options?.complexityThreshold || 15;
    this.maxFileLengthLines = options?.maxFileLengthLines || 300;
  }

  /**
   * 파일 복잡도 분석
   */
  analyzeFile(content: string, filePath: string): ComplexityMetric[] {
    const metrics: ComplexityMetric[] = [];

    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      // 함수/메서드 단위 분석
      this.visitNode(sourceFile, sourceFile, filePath, metrics);

      // 파일 전체 복잡도
      const fileComplexity = this.calculateNodeComplexity(sourceFile);
      const lines = content.split('\n').length;

      metrics.push({
        filePath,
        cyclomaticComplexity: fileComplexity,
        linesOfCode: lines,
        location: {
          start: { line: 1, column: 0 },
          end: { line: lines, column: 0 },
          filePath
        }
      });
    } catch {
      // 파싱 실패 시 기본 메트릭
      metrics.push({
        filePath,
        cyclomaticComplexity: 0,
        linesOfCode: content.split('\n').length,
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 0 },
          filePath
        }
      });
    }

    return metrics;
  }

  /**
   * 여러 파일 분석
   */
  analyzeFiles(files: Array<{ content: string; filePath: string }>): StaticAnalysisResult {
    const allMetrics: ComplexityMetric[] = [];
    const findings: StaticFinding[] = [];

    for (const file of files) {
      const metrics = this.analyzeFile(file.content, file.filePath);
      allMetrics.push(...metrics);

      // 임계값 초과 검사
      for (const metric of metrics) {
        if (metric.cyclomaticComplexity > this.complexityThreshold) {
          findings.push({
            id: `complexity-${file.filePath}-${metric.functionName || 'file'}`,
            type: 'high-complexity',
            message: metric.functionName
              ? `함수 '${metric.functionName}'의 복잡도가 높습니다 (${metric.cyclomaticComplexity})`
              : `파일 복잡도가 높습니다 (${metric.cyclomaticComplexity})`,
            severity: this.getSeverity(metric.cyclomaticComplexity),
            location: metric.location,
            metadata: { complexity: metric.cyclomaticComplexity }
          });
        }

        if (metric.linesOfCode > this.maxFileLengthLines && !metric.functionName) {
          findings.push({
            id: `file-length-${file.filePath}`,
            type: 'file-too-long',
            message: `파일이 너무 깁니다 (${metric.linesOfCode} 줄)`,
            severity: 'LOW',
            location: metric.location,
            metadata: { lines: metric.linesOfCode }
          });
        }
      }
    }

    return {
      type: 'complexity',
      filePath: 'multiple',
      findings
    };
  }

  /**
   * AST 순회하며 함수/메서드 탐색
   */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
    metrics: ComplexityMetric[]
  ): void {
    if (ts.isFunctionDeclaration(node) || 
        ts.isMethodDeclaration(node) || 
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)) {
      
      const complexity = this.calculateNodeComplexity(node);
      const name = this.getFunctionName(node);
      const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

      metrics.push({
        filePath,
        functionName: name,
        cyclomaticComplexity: complexity,
        linesOfCode: endPos.line - startPos.line + 1,
        location: {
          start: { line: startPos.line + 1, column: startPos.character },
          end: { line: endPos.line + 1, column: endPos.character },
          filePath
        }
      });
    }

    ts.forEachChild(node, (child) => {
      this.visitNode(child, sourceFile, filePath, metrics);
    });
  }

  /**
   * Cyclomatic Complexity 계산
   * CC = E - N + 2P (간소화: 분기점 카운트 + 1)
   */
  private calculateNodeComplexity(node: ts.Node): number {
    let complexity = 1; // 기본값

    const visit = (n: ts.Node) => {
      // 조건문
      if (ts.isIfStatement(n)) complexity++;
      if (ts.isConditionalExpression(n)) complexity++; // 삼항 연산자
      
      // 반복문
      if (ts.isForStatement(n) || ts.isForInStatement(n) || ts.isForOfStatement(n)) complexity++;
      if (ts.isWhileStatement(n) || ts.isDoStatement(n)) complexity++;
      
      // Switch case
      if (ts.isCaseClause(n)) complexity++;
      
      // 예외 처리
      if (ts.isCatchClause(n)) complexity++;
      
      // 논리 연산자
      if (ts.isBinaryExpression(n)) {
        const op = n.operatorToken.getText();
        if (op === '&&' || op === '||' || op === '??') {
          complexity++;
        }
      }

      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }

  /**
   * 함수 이름 추출
   */
  private getFunctionName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    // Arrow function assigned to variable
    if (ts.isArrowFunction(node)) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
    }
    return undefined;
  }

  /**
   * 복잡도 기반 심각도 결정
   */
  private getSeverity(complexity: number): Severity {
    if (complexity > 30) return 'HIGH';
    if (complexity > 20) return 'MEDIUM';
    return 'LOW';
  }
}
