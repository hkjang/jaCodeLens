/**
 * Advanced Code Scanner - Claude/Antigravity 수준의 코드 분석
 * 
 * 기능:
 * 1. AST 기반 코드 요소 추출
 * 2. Import/Export 의존성 분석
 * 3. 함수 호출 그래프 (Call Graph)
 * 4. 복잡도 메트릭 (Cyclomatic Complexity, LOC 등)
 * 5. JSDoc/주석 추출
 * 6. React 패턴 감지 (hooks, context, state)
 * 7. 파일 간 의존성 맵
 */

import * as ts from 'typescript';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

// =============================================================================
// 타입 정의
// =============================================================================

export type ElementType = 
  | 'CLASS' 
  | 'FUNCTION' 
  | 'METHOD' 
  | 'VARIABLE' 
  | 'INTERFACE' 
  | 'TYPE' 
  | 'COMPONENT'
  | 'HOOK'
  | 'CONSTANT'
  | 'ENUM';

export interface ImportInfo {
  source: string;           // 'react', './utils', '@/lib/db'
  specifiers: string[];     // ['useState', 'useEffect']
  isDefault: boolean;
  isNamespace: boolean;     // import * as
}

export interface CallInfo {
  name: string;             // 호출되는 함수명
  line: number;
  isAsync: boolean;
  isAwait: boolean;
}

export interface ComplexityMetrics {
  loc: number;              // Lines of Code
  sloc: number;             // Source Lines of Code (주석 제외)
  cyclomaticComplexity: number;  // 분기 복잡도
  cognitiveComplexity: number;   // 인지 복잡도
  parameters: number;       // 파라미터 수
  returns: number;          // return 문 수
  depth: number;            // 최대 중첩 깊이
}

export interface ExtractedElement {
  // 기본 정보
  filePath: string;
  fileName: string;
  language: string;
  elementType: ElementType;
  name: string;
  signature?: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  
  // 컨텍스트
  parentName?: string;
  exportType?: 'default' | 'named' | 'none';
  isAsync: boolean;
  isExported: boolean;
  
  // 고급 분석
  imports: ImportInfo[];           // 이 요소가 사용하는 imports
  calls: CallInfo[];               // 호출하는 함수들
  calledBy: string[];              // 이 함수를 호출하는 곳들
  dependencies: string[];          // 의존하는 다른 요소들
  complexity: ComplexityMetrics;   // 복잡도 메트릭
  
  // 문서화
  jsdoc?: string;                  // JSDoc 주석
  description?: string;            // 첫 번째 주석에서 추출한 설명
  
  // React 관련
  reactHooks?: string[];           // 사용하는 React hooks
  reactProps?: string[];           // Props 타입의 속성들
  hasState?: boolean;              // useState 사용 여부
  hasEffect?: boolean;             // useEffect 사용 여부
  
  // 메타
  hash: string;
  tags: string[];                  // 자동 태깅 (async, exported, deprecated 등)
}

export interface FileAnalysis {
  filePath: string;
  imports: ImportInfo[];
  exports: string[];
  elements: ExtractedElement[];
  dependencies: string[];          // 의존하는 파일들
  dependents: string[];            // 이 파일에 의존하는 파일들
}

export interface ScanResult {
  projectId: string;
  filesScanned: number;
  elementsExtracted: number;
  elementsByType: Record<string, number>;
  complexityStats: {
    avgComplexity: number;
    maxComplexity: number;
    highComplexityCount: number;  // 복잡도 10 이상
  };
  importStats: {
    totalImports: number;
    externalPackages: string[];
    internalModules: string[];
  };
  errors: string[];
}

// =============================================================================
// Advanced Code Scanner
// =============================================================================

class AdvancedCodeScanner {
  private readonly SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
  private readonly SKIP_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo', 'coverage', '__tests__'];
  private readonly MAX_CONTENT_LENGTH = 8000;
  private readonly MAX_FILES = 300;

  // 파일별 분석 결과 캐시
  private fileAnalysisCache = new Map<string, FileAnalysis>();

  /**
   * 프로젝트 전체 스캔
   */
  async scanProject(projectId: string, projectPath: string): Promise<ScanResult> {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║  🔬 ADVANCED CODE SCANNER - Claude/Antigravity Level         ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    console.log(`📂 Project: ${projectPath}`);
    
    const result: ScanResult = {
      projectId,
      filesScanned: 0,
      elementsExtracted: 0,
      elementsByType: {},
      complexityStats: { avgComplexity: 0, maxComplexity: 0, highComplexityCount: 0 },
      importStats: { totalImports: 0, externalPackages: [], internalModules: [] },
      errors: []
    };

    try {
      // 1. 소스 파일 찾기
      const files = await this.findSourceFiles(projectPath);
      console.log(`\n📄 Found ${files.length} source files`);
      result.filesScanned = files.length;

      // 2. 기존 요소 삭제
      await prisma.codeElement.deleteMany({ where: { projectId } });

      // 3. 1차 패스: 파일별 분석 (imports, exports, elements)
      console.log(`\n🔍 Phase 1: Analyzing file structure...`);
      for (const file of files) {
        try {
          const analysis = await this.analyzeFile(file, projectPath);
          this.fileAnalysisCache.set(file, analysis);
        } catch (e) {
          result.errors.push(`${path.basename(file)}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // 4. 2차 패스: 파일 간 의존성 분석
      console.log(`\n🔗 Phase 2: Building dependency graph...`);
      this.buildDependencyGraph(projectPath);

      // 5. 3차 패스: 호출 그래프 분석
      console.log(`\n📊 Phase 3: Analyzing call graph...`);
      this.analyzeCallGraph();

      // 6. 모든 요소 수집
      const allElements: ExtractedElement[] = [];
      const externalPackages = new Set<string>();
      const internalModules = new Set<string>();

      for (const [, analysis] of this.fileAnalysisCache) {
        allElements.push(...analysis.elements);
        
        for (const imp of analysis.imports) {
          result.importStats.totalImports++;
          if (imp.source.startsWith('.') || imp.source.startsWith('@/')) {
            internalModules.add(imp.source);
          } else {
            externalPackages.add(imp.source.split('/')[0]);
          }
        }
      }

      result.elementsExtracted = allElements.length;
      result.importStats.externalPackages = Array.from(externalPackages);
      result.importStats.internalModules = Array.from(internalModules).slice(0, 20);

      // 7. 타입별/복잡도 통계
      let totalComplexity = 0;
      for (const el of allElements) {
        result.elementsByType[el.elementType] = (result.elementsByType[el.elementType] || 0) + 1;
        
        const cc = el.complexity.cyclomaticComplexity;
        totalComplexity += cc;
        if (cc > result.complexityStats.maxComplexity) {
          result.complexityStats.maxComplexity = cc;
        }
        if (cc >= 10) {
          result.complexityStats.highComplexityCount++;
        }
      }
      result.complexityStats.avgComplexity = allElements.length > 0 
        ? Math.round(totalComplexity / allElements.length * 10) / 10 
        : 0;

      // 8. DB 저장
      if (allElements.length > 0) {
        await this.saveElements(projectId, allElements);
      }

      // 9. 결과 출력
      console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
      console.log(`║  ✅ SCAN COMPLETE                                             ║`);
      console.log(`╚══════════════════════════════════════════════════════════════╝`);
      console.log(`📊 Results:`);
      console.log(`   Files: ${result.filesScanned}`);
      console.log(`   Elements: ${result.elementsExtracted}`);
      console.log(`   By Type:`);
      Object.entries(result.elementsByType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`);
      });
      console.log(`   Complexity:`);
      console.log(`      Average: ${result.complexityStats.avgComplexity}`);
      console.log(`      Max: ${result.complexityStats.maxComplexity}`);
      console.log(`      High (≥10): ${result.complexityStats.highComplexityCount}`);
      console.log(`   Dependencies:`);
      console.log(`      External packages: ${result.importStats.externalPackages.length}`);
      console.log(`      Internal modules: ${result.importStats.internalModules.length}`);

      // 캐시 정리
      this.fileAnalysisCache.clear();

    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      result.errors.push(error);
      console.error(`❌ Scan failed:`, error);
    }

    return result;
  }

  /**
   * 소스 파일 찾기
   */
  private async findSourceFiles(dir: string, depth = 0): Promise<string[]> {
    if (depth > 8) return [];
    
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (files.length >= this.MAX_FILES) break;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !this.SKIP_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          const subFiles = await this.findSourceFiles(fullPath, depth + 1);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.SUPPORTED_EXTENSIONS.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
    
    return files;
  }

  /**
   * 단일 파일 분석
   */
  private async analyzeFile(filePath: string, projectPath: string): Promise<FileAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const language = ['.ts', '.tsx'].includes(ext) ? 'TypeScript' : 'JavaScript';
    
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ext === '.tsx' || ext === '.jsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const analysis: FileAnalysis = {
      filePath: relativePath,
      imports: [],
      exports: [],
      elements: [],
      dependencies: [],
      dependents: []
    };

    // Import 분석
    analysis.imports = this.extractImports(sourceFile);

    // Export 분석
    analysis.exports = this.extractExports(sourceFile);

    // 코드 요소 추출
    const elements = this.extractElements(sourceFile, content, relativePath, fileName, language);
    analysis.elements = elements;

    return analysis;
  }

  /**
   * Import 추출
   */
  private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    ts.forEachChild(sourceFile, node => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
        const source = (node.moduleSpecifier as ts.StringLiteral).text;
        const specifiers: string[] = [];
        let isDefault = false;
        let isNamespace = false;

        if (node.importClause) {
          // default import
          if (node.importClause.name) {
            specifiers.push(node.importClause.name.getText());
            isDefault = true;
          }

          // named imports
          if (node.importClause.namedBindings) {
            if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              isNamespace = true;
              specifiers.push(node.importClause.namedBindings.name.getText());
            } else if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const element of node.importClause.namedBindings.elements) {
                specifiers.push(element.name.getText());
              }
            }
          }
        }

        imports.push({ source, specifiers, isDefault, isNamespace });
      }
    });

    return imports;
  }

  /**
   * Export 추출
   */
  private extractExports(sourceFile: ts.SourceFile): string[] {
    const exports: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            exports.push(element.name.getText());
          }
        }
      } else if (
        (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || 
         ts.isVariableStatement(node) || ts.isInterfaceDeclaration(node) ||
         ts.isTypeAliasDeclaration(node)) &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              exports.push(decl.name.getText());
            }
          }
        } else if ((node as any).name) {
          exports.push((node as any).name.getText());
        }
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return exports;
  }

  /**
   * 코드 요소 추출 (심층 분석)
   */
  private extractElements(
    sourceFile: ts.SourceFile,
    fullContent: string,
    filePath: string,
    fileName: string,
    language: string
  ): ExtractedElement[] {
    const elements: ExtractedElement[] = [];
    const fileImports = this.extractImports(sourceFile);

    const visit = (node: ts.Node, parentName?: string) => {
      const element = this.extractElement(node, sourceFile, fullContent, filePath, fileName, language, fileImports, parentName);
      if (element) {
        elements.push(element);
      }

      // 재귀 순회
      if (ts.isClassDeclaration(node) && node.name) {
        ts.forEachChild(node, child => visit(child, node.name?.getText()));
      } else if (!ts.isClassDeclaration(node)) {
        ts.forEachChild(node, child => visit(child, parentName));
      }
    };

    ts.forEachChild(sourceFile, node => visit(node));
    return elements;
  }

  /**
   * 단일 요소 추출
   */
  private extractElement(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    fullContent: string,
    filePath: string,
    fileName: string,
    language: string,
    fileImports: ImportInfo[],
    parentName?: string
  ): ExtractedElement | null {

    const getNodeText = (n: ts.Node) => {
      const start = n.getStart(sourceFile);
      const end = n.getEnd();
      let text = fullContent.substring(start, end);
      if (text.length > this.MAX_CONTENT_LENGTH) {
        text = text.substring(0, this.MAX_CONTENT_LENGTH) + '\n// ... [truncated]';
      }
      return text;
    };

    const getLineInfo = (n: ts.Node) => {
      const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
      const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(n.getEnd());
      return { lineStart: startLine + 1, lineEnd: endLine + 1 };
    };

    const isExported = (n: ts.Node) => {
      return (ts.getCombinedModifierFlags(n as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
    };

    const isDefault = (n: ts.Node) => {
      return (ts.getCombinedModifierFlags(n as ts.Declaration) & ts.ModifierFlags.Default) !== 0;
    };

    const getJSDoc = (n: ts.Node): string | undefined => {
      const jsDocs = (n as any).jsDoc as ts.JSDoc[] | undefined;
      if (jsDocs && jsDocs.length > 0) {
        return jsDocs.map(doc => doc.getText()).join('\n');
      }
      return undefined;
    };

    const countComplexity = (n: ts.Node): ComplexityMetrics => {
      let cyclomaticComplexity = 1; // 기본 1
      let cognitiveComplexity = 0;
      let returns = 0;
      let maxDepth = 0;
      let currentDepth = 0;

      const visitComplexity = (child: ts.Node, depth: number) => {
        if (depth > maxDepth) maxDepth = depth;

        // 분기문 카운트
        if (ts.isIfStatement(child) || ts.isConditionalExpression(child)) {
          cyclomaticComplexity++;
          cognitiveComplexity += depth + 1;
        }
        if (ts.isSwitchStatement(child)) {
          cyclomaticComplexity++;
        }
        if (ts.isCaseClause(child)) {
          cyclomaticComplexity++;
        }
        if (ts.isForStatement(child) || ts.isForInStatement(child) || 
            ts.isForOfStatement(child) || ts.isWhileStatement(child) || 
            ts.isDoStatement(child)) {
          cyclomaticComplexity++;
          cognitiveComplexity += depth + 2;
        }
        if (ts.isCatchClause(child)) {
          cyclomaticComplexity++;
        }
        if (ts.isReturnStatement(child)) {
          returns++;
        }
        if (ts.isBinaryExpression(child) && 
            (child.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
             child.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
             child.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)) {
          cyclomaticComplexity++;
        }

        ts.forEachChild(child, c => visitComplexity(c, depth + 1));
      };

      visitComplexity(n, 0);

      const text = getNodeText(n);
      const lines = text.split('\n');
      const sloc = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;

      return {
        loc: lines.length,
        sloc,
        cyclomaticComplexity,
        cognitiveComplexity,
        parameters: 0, // Will be set per element type
        returns,
        depth: maxDepth
      };
    };

    const extractCalls = (n: ts.Node): CallInfo[] => {
      const calls: CallInfo[] = [];
      
      const visitCalls = (child: ts.Node) => {
        if (ts.isCallExpression(child)) {
          let name = '';
          if (ts.isIdentifier(child.expression)) {
            name = child.expression.getText();
          } else if (ts.isPropertyAccessExpression(child.expression)) {
            name = child.expression.getText();
          }
          
          if (name) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile));
            // Check if parent is await expression
            const isAwait = child.parent && ts.isAwaitExpression(child.parent);
            calls.push({
              name,
              line: line + 1,
              isAsync: false,
              isAwait
            });
          }
        }
        ts.forEachChild(child, visitCalls);
      };
      
      visitCalls(n);
      return calls;
    };

    const detectReactPatterns = (n: ts.Node, text: string) => {
      const hooks: string[] = [];
      const reactHookPattern = /use[A-Z][a-zA-Z]*/g;
      let match;
      while ((match = reactHookPattern.exec(text)) !== null) {
        if (!hooks.includes(match[0])) {
          hooks.push(match[0]);
        }
      }
      
      return {
        hooks,
        hasState: text.includes('useState'),
        hasEffect: text.includes('useEffect')
      };
    };

    const generateTags = (el: Partial<ExtractedElement>): string[] => {
      const tags: string[] = [];
      if (el.isAsync) tags.push('async');
      if (el.isExported) tags.push('exported');
      if (el.exportType === 'default') tags.push('default-export');
      if (el.complexity && el.complexity.cyclomaticComplexity >= 10) tags.push('high-complexity');
      if (el.reactHooks && el.reactHooks.length > 0) tags.push('uses-hooks');
      if (el.hasState) tags.push('stateful');
      if (el.jsdoc) tags.push('documented');
      return tags;
    };

    const baseElement = {
      filePath,
      fileName,
      language,
      parentName,
      imports: [] as ImportInfo[],
      calls: [] as CallInfo[],
      calledBy: [] as string[],
      dependencies: [] as string[]
    };

    // 클래스
    if (ts.isClassDeclaration(node) && node.name) {
      const content = getNodeText(node);
      const { lineStart, lineEnd } = getLineInfo(node);
      const complexity = countComplexity(node);
      const calls = extractCalls(node);
      const jsdoc = getJSDoc(node);
      
      const element: ExtractedElement = {
        ...baseElement,
        elementType: 'CLASS',
        name: node.name.getText(),
        signature: `class ${node.name.getText()}`,
        lineStart,
        lineEnd,
        content,
        isAsync: false,
        isExported: isExported(node),
        exportType: isDefault(node) ? 'default' : isExported(node) ? 'named' : 'none',
        complexity,
        calls,
        jsdoc,
        hash: this.hash(content),
        tags: []
      };
      element.tags = generateTags(element);
      return element;
    }

    // 함수 선언
    if (ts.isFunctionDeclaration(node) && node.name) {
      const content = getNodeText(node);
      const { lineStart, lineEnd } = getLineInfo(node);
      const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
      const params = node.parameters.map(p => p.getText()).join(', ');
      const returnType = node.type ? `: ${node.type.getText()}` : '';
      const complexity = countComplexity(node);
      complexity.parameters = node.parameters.length;
      const calls = extractCalls(node);
      const jsdoc = getJSDoc(node);
      const react = detectReactPatterns(node, content);
      
      const element: ExtractedElement = {
        ...baseElement,
        elementType: 'FUNCTION',
        name: node.name.getText(),
        signature: `${isAsync ? 'async ' : ''}function ${node.name.getText()}(${params})${returnType}`,
        lineStart,
        lineEnd,
        content,
        isAsync,
        isExported: isExported(node),
        exportType: isDefault(node) ? 'default' : isExported(node) ? 'named' : 'none',
        complexity,
        calls,
        jsdoc,
        reactHooks: react.hooks,
        hasState: react.hasState,
        hasEffect: react.hasEffect,
        hash: this.hash(content),
        tags: []
      };
      element.tags = generateTags(element);
      return element;
    }

    // 메서드
    if (ts.isMethodDeclaration(node) && node.name && parentName) {
      const content = getNodeText(node);
      const { lineStart, lineEnd } = getLineInfo(node);
      const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
      const params = node.parameters.map(p => p.getText()).join(', ');
      const returnType = node.type ? `: ${node.type.getText()}` : '';
      const complexity = countComplexity(node);
      complexity.parameters = node.parameters.length;
      const calls = extractCalls(node);
      const jsdoc = getJSDoc(node);
      
      const element: ExtractedElement = {
        ...baseElement,
        elementType: 'METHOD',
        name: node.name.getText(),
        signature: `${isAsync ? 'async ' : ''}${node.name.getText()}(${params})${returnType}`,
        lineStart,
        lineEnd,
        content,
        parentName,
        isAsync,
        isExported: false,
        exportType: 'none',
        complexity,
        calls,
        jsdoc,
        hash: this.hash(content),
        tags: []
      };
      element.tags = generateTags(element);
      return element;
    }

    // 인터페이스
    if (ts.isInterfaceDeclaration(node)) {
      const content = getNodeText(node);
      const { lineStart, lineEnd } = getLineInfo(node);
      const jsdoc = getJSDoc(node);
      
      // Props 추출
      const props: string[] = [];
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) {
          props.push(member.name.getText());
        }
      }
      
      const element: ExtractedElement = {
        ...baseElement,
        elementType: 'INTERFACE',
        name: node.name.getText(),
        signature: `interface ${node.name.getText()}`,
        lineStart,
        lineEnd,
        content,
        isAsync: false,
        isExported: isExported(node),
        exportType: isExported(node) ? 'named' : 'none',
        complexity: { loc: content.split('\n').length, sloc: 0, cyclomaticComplexity: 0, cognitiveComplexity: 0, parameters: 0, returns: 0, depth: 0 },
        calls: [],
        jsdoc,
        reactProps: props,
        hash: this.hash(content),
        tags: []
      };
      element.tags = generateTags(element);
      return element;
    }

    // 화살표 함수 / React 컴포넌트
    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (decl && decl.initializer && ts.isArrowFunction(decl.initializer) && ts.isIdentifier(decl.name)) {
        const content = getNodeText(node);
        const { lineStart, lineEnd } = getLineInfo(node);
        const arrowFn = decl.initializer;
        const isAsync = arrowFn.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
        const params = arrowFn.parameters.map(p => p.getText()).join(', ');
        const name = decl.name.getText();
        const complexity = countComplexity(arrowFn);
        complexity.parameters = arrowFn.parameters.length;
        const calls = extractCalls(arrowFn);
        const jsdoc = getJSDoc(node);
        const react = detectReactPatterns(arrowFn, content);
        
        // Component vs Function vs Hook
        const isComponent = /^[A-Z]/.test(name) && (fileName.endsWith('.tsx') || fileName.endsWith('.jsx'));
        const isHook = name.startsWith('use') && /^use[A-Z]/.test(name);
        
        const element: ExtractedElement = {
          ...baseElement,
          elementType: isHook ? 'HOOK' : isComponent ? 'COMPONENT' : 'FUNCTION',
          name,
          signature: `const ${name} = ${isAsync ? 'async ' : ''}(${params}) => ...`,
          lineStart,
          lineEnd,
          content,
          isAsync,
          isExported: isExported(node),
          exportType: isExported(node) ? 'named' : 'none',
          complexity,
          calls,
          jsdoc,
          reactHooks: react.hooks,
          hasState: react.hasState,
          hasEffect: react.hasEffect,
          hash: this.hash(content),
          tags: []
        };
        element.tags = generateTags(element);
        return element;
      }
    }

    return null;
  }

  /**
   * 파일 간 의존성 그래프 구축
   */
  private buildDependencyGraph(projectPath: string): void {
    for (const [filePath, analysis] of this.fileAnalysisCache) {
      for (const imp of analysis.imports) {
        if (imp.source.startsWith('.') || imp.source.startsWith('@/')) {
          // 내부 모듈 의존성
          analysis.dependencies.push(imp.source);
          
          // 역방향 의존성 (dependents) 추가
          // ... (다른 파일에서 이 파일을 import하는 경우)
        }
      }
    }
  }

  /**
   * 함수 호출 그래프 분석
   */
  private analyzeCallGraph(): void {
    // 모든 함수 이름 수집
    const allFunctionNames = new Map<string, ExtractedElement>();
    
    for (const [, analysis] of this.fileAnalysisCache) {
      for (const element of analysis.elements) {
        if (['FUNCTION', 'METHOD', 'COMPONENT', 'HOOK'].includes(element.elementType)) {
          allFunctionNames.set(element.name, element);
        }
      }
    }

    // calledBy 업데이트
    for (const [, analysis] of this.fileAnalysisCache) {
      for (const element of analysis.elements) {
        for (const call of element.calls) {
          const calledFunc = allFunctionNames.get(call.name.split('.').pop() || call.name);
          if (calledFunc) {
            calledFunc.calledBy.push(`${element.filePath}:${element.name}`);
          }
        }
      }
    }
  }

  /**
   * 내용 해시 생성
   */
  private hash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 16);
  }

  /**
   * DB 저장
   */
  private async saveElements(projectId: string, elements: ExtractedElement[]): Promise<void> {
    console.log(`\n💾 Saving ${elements.length} elements to database...`);
    
    // Batch insert
    await prisma.codeElement.createMany({
      data: elements.map(el => ({
        projectId,
        filePath: el.filePath,
        fileName: el.fileName,
        language: el.language,
        elementType: el.elementType,
        name: el.name,
        signature: el.signature,
        lineStart: el.lineStart,
        lineEnd: el.lineEnd,
        content: el.content,
        parentName: el.parentName,
        exportType: el.exportType,
        isAsync: el.isAsync,
        isExported: el.isExported,
        hash: el.hash,
      }))
    });

    console.log(`   ✅ Saved successfully`);
  }
}

export const codeScanner = new AdvancedCodeScanner();
