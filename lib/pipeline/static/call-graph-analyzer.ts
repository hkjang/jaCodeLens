/**
 * 호출 그래프 분석기
 * 
 * 함수 호출 관계 분석 및 데드 코드 탐지
 * AI 사용 없이 결정적으로 분석합니다.
 */

import * as ts from 'typescript';
import {
  CallGraph,
  CallInfo,
  FunctionInfo,
  StaticAnalysisResult,
  StaticFinding,
  ASTLocation
} from '../types';

export class CallGraphAnalyzer {
  /**
   * 호출 그래프 생성
   */
  analyzeCallGraph(files: Array<{ content: string; filePath: string }>): {
    graph: CallGraph;
    result: StaticAnalysisResult;
  } {
    const functions: FunctionInfo[] = [];
    const calls: CallInfo[] = [];
    const findings: StaticFinding[] = [];

    // 1. 모든 파일에서 함수 및 호출 추출
    for (const file of files) {
      try {
        const sourceFile = ts.createSourceFile(
          file.filePath,
          file.content,
          ts.ScriptTarget.Latest,
          true
        );

        // 함수 추출
        const fileFunctions = this.extractFunctions(sourceFile, file.filePath);
        functions.push(...fileFunctions);

        // 호출 추출
        const fileCalls = this.extractCalls(sourceFile, file.filePath);
        calls.push(...fileCalls);
      } catch {
        // 파싱 실패 시 무시
      }
    }

    // 2. 진입점 탐지 (export된 함수)
    const entryPoints = functions
      .filter(f => f.isExported)
      .map(f => f.qualifiedName);

    // 3. 데드 코드 탐지
    const calledFunctions = new Set(calls.map(c => c.callee));
    const deadCode = functions
      .filter(f => !f.isExported && !calledFunctions.has(f.qualifiedName))
      .map(f => f.qualifiedName);

    // 4. Findings 생성
    for (const dead of deadCode) {
      const func = functions.find(f => f.qualifiedName === dead);
      if (func) {
        findings.push({
          id: `dead-code-${dead}`,
          type: 'dead-code',
          message: `사용되지 않는 함수: ${dead}`,
          severity: 'LOW',
          location: func.location,
          metadata: { functionName: dead }
        });
      }
    }

    // 5. 복잡한 호출 체인 탐지
    const deepCallChains = this.findDeepCallChains(functions, calls, 5);
    for (const chain of deepCallChains) {
      findings.push({
        id: `deep-call-chain-${chain[0]}`,
        type: 'deep-call-chain',
        message: `깊은 호출 체인 발견 (${chain.length}단계)`,
        severity: 'INFO',
        location: this.createLocation(chain[0].split(':')[0] || '', 1, 1),
        metadata: { chain, depth: chain.length }
      });
    }

    return {
      graph: {
        functions,
        calls,
        entryPoints,
        deadCode
      },
      result: {
        type: 'callgraph',
        filePath: 'project',
        findings
      }
    };
  }

  /**
   * 함수 추출
   */
  private extractFunctions(sourceFile: ts.SourceFile, filePath: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push(this.createFunctionInfo(node, filePath, sourceFile));
      }

      if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        const className = this.getParentClassName(node);
        functions.push(this.createFunctionInfo(node, filePath, sourceFile, className));
      }

      // Arrow function assigned to variable
      if (ts.isVariableDeclaration(node) && 
          ts.isIdentifier(node.name) && 
          node.initializer && 
          ts.isArrowFunction(node.initializer)) {
        functions.push(this.createArrowFunctionInfo(node, filePath, sourceFile));
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return functions;
  }

  /**
   * 호출 추출
   */
  private extractCalls(sourceFile: ts.SourceFile, filePath: string): CallInfo[] {
    const calls: CallInfo[] = [];
    let currentFunction: string | null = null;

    const visit = (node: ts.Node) => {
      // 현재 함수 컨텍스트 추적
      if (ts.isFunctionDeclaration(node) && node.name) {
        currentFunction = `${filePath}:${node.name.text}`;
      }
      if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        const className = this.getParentClassName(node);
        currentFunction = className 
          ? `${filePath}:${className}.${node.name.text}`
          : `${filePath}:${node.name.text}`;
      }

      // 호출 표현식 탐지
      if (ts.isCallExpression(node) && currentFunction) {
        const callee = this.getCalleeName(node);
        if (callee) {
          const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

          calls.push({
            caller: currentFunction,
            callee,
            location: {
              start: { line: startPos.line + 1, column: startPos.character },
              end: { line: endPos.line + 1, column: endPos.character },
              filePath
            },
            isAsync: this.isAwaitedCall(node),
            isConditional: this.isConditionalCall(node)
          });
        }
      }

      ts.forEachChild(node, visit);

      // 함수 컨텍스트 리셋
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        currentFunction = null;
      }
    };

    visit(sourceFile);
    return calls;
  }

  /**
   * FunctionInfo 생성
   */
  private createFunctionInfo(
    node: ts.FunctionDeclaration | ts.MethodDeclaration,
    filePath: string,
    sourceFile: ts.SourceFile,
    className?: string
  ): FunctionInfo {
    const name = ts.isIdentifier(node.name!) ? node.name.text : 'anonymous';
    const qualifiedName = className 
      ? `${filePath}:${className}.${name}`
      : `${filePath}:${name}`;

    const modifiers = ts.getModifiers(node);
    const isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
    const isAsync = modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;

    const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      qualifiedName,
      filePath,
      isExported,
      isAsync,
      parameters: node.parameters.length,
      location: {
        start: { line: startPos.line + 1, column: startPos.character },
        end: { line: endPos.line + 1, column: endPos.character },
        filePath
      }
    };
  }

  /**
   * Arrow Function Info 생성
   */
  private createArrowFunctionInfo(
    node: ts.VariableDeclaration,
    filePath: string,
    sourceFile: ts.SourceFile
  ): FunctionInfo {
    const name = (node.name as ts.Identifier).text;
    const arrow = node.initializer as ts.ArrowFunction;

    const parent = node.parent?.parent;
    const isExported = parent && ts.isVariableStatement(parent) &&
      ts.getModifiers(parent)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

    const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      qualifiedName: `${filePath}:${name}`,
      filePath,
      isExported: !!isExported,
      isAsync: !!ts.getModifiers(arrow)?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword),
      parameters: arrow.parameters.length,
      location: {
        start: { line: startPos.line + 1, column: startPos.character },
        end: { line: endPos.line + 1, column: endPos.character },
        filePath
      }
    };
  }

  /**
   * 부모 클래스 이름 추출
   */
  private getParentClassName(node: ts.Node): string | undefined {
    let parent = node.parent;
    while (parent) {
      if (ts.isClassDeclaration(parent) && parent.name) {
        return parent.name.text;
      }
      parent = parent.parent;
    }
    return undefined;
  }

  /**
   * 호출 대상 이름 추출
   */
  private getCalleeName(node: ts.CallExpression): string | null {
    const expr = node.expression;
    
    if (ts.isIdentifier(expr)) {
      return expr.text;
    }
    
    if (ts.isPropertyAccessExpression(expr)) {
      const obj = ts.isIdentifier(expr.expression) ? expr.expression.text : 'obj';
      return `${obj}.${expr.name.text}`;
    }
    
    return null;
  }

  /**
   * await된 호출인지 확인
   */
  private isAwaitedCall(node: ts.CallExpression): boolean {
    return node.parent && ts.isAwaitExpression(node.parent);
  }

  /**
   * 조건식 내의 호출인지 확인
   */
  private isConditionalCall(node: ts.Node): boolean {
    let parent = node.parent;
    while (parent) {
      if (ts.isIfStatement(parent) || 
          ts.isConditionalExpression(parent) ||
          ts.isBinaryExpression(parent)) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * 깊은 호출 체인 탐지
   */
  private findDeepCallChains(
    functions: FunctionInfo[], 
    calls: CallInfo[], 
    threshold: number
  ): string[][] {
    const chains: string[][] = [];
    const callMap = new Map<string, string[]>();

    // 호출 맵 생성
    for (const call of calls) {
      const targets = callMap.get(call.caller) || [];
      targets.push(call.callee);
      callMap.set(call.caller, targets);
    }

    // DFS로 체인 탐색
    const visited = new Set<string>();
    
    const dfs = (func: string, path: string[]): void => {
      if (visited.has(func)) return;
      if (path.length >= threshold) {
        chains.push([...path]);
        return;
      }

      visited.add(func);
      path.push(func);

      const callees = callMap.get(func) || [];
      for (const callee of callees) {
        dfs(callee, path);
      }

      path.pop();
      visited.delete(func);
    };

    for (const func of functions) {
      dfs(func.qualifiedName, []);
    }

    return chains.slice(0, 10); // 최대 10개만
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
