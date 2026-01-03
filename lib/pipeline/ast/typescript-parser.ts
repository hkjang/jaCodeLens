/**
 * TypeScript/JavaScript AST 파서
 * 
 * TypeScript Compiler API를 사용하여 AST를 생성합니다.
 */

import * as ts from 'typescript';
import {
  ASTFile,
  ASTNode,
  ASTLocation,
  ASTNodeType,
  ImportInfo,
  ExportInfo,
  SupportedLanguage
} from '../types';
import { ASTCache } from './cache';

export class TypeScriptParser {
  private cache: ASTCache;

  constructor(cache?: ASTCache) {
    this.cache = cache || new ASTCache();
  }

  /**
   * 파일 파싱
   */
  parseFile(
    filePath: string,
    content: string,
    language: SupportedLanguage = 'typescript'
  ): ASTFile {
    // 캐시 확인
    const contentHash = ASTCache.computeHash(content);
    const cached = this.cache.get(filePath, contentHash);
    if (cached) {
      return cached;
    }

    try {
      const scriptKind = this.getScriptKind(filePath, language);
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );

      const imports = this.extractImports(sourceFile, filePath);
      const exports = this.extractExports(sourceFile, filePath);
      const root = this.convertNode(sourceFile, filePath, content);

      const astFile: ASTFile = {
        filePath,
        language,
        root,
        imports,
        exports
      };

      // 캐시에 저장
      this.cache.set(filePath, contentHash, astFile);
      
      return astFile;
    } catch (error) {
      return {
        filePath,
        language,
        root: this.createEmptyNode(filePath),
        imports: [],
        exports: [],
        parseError: error instanceof Error ? error.message : 'Unknown parse error'
      };
    }
  }

  /**
   * TS ScriptKind 결정
   */
  private getScriptKind(filePath: string, language: SupportedLanguage): ts.ScriptKind {
    if (language === 'javascript') {
      if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
      return ts.ScriptKind.JS;
    }
    if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
    return ts.ScriptKind.TS;
  }

  /**
   * Import 문 추출
   */
  private extractImports(sourceFile: ts.SourceFile, filePath: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (!ts.isStringLiteral(moduleSpecifier)) return;

        const source = moduleSpecifier.text;
        const specifiers: string[] = [];
        let isDefault = false;

        const importClause = node.importClause;
        if (importClause) {
          // Default import
          if (importClause.name) {
            specifiers.push(importClause.name.text);
            isDefault = true;
          }
          // Named imports
          if (importClause.namedBindings) {
            if (ts.isNamedImports(importClause.namedBindings)) {
              importClause.namedBindings.elements.forEach((element) => {
                specifiers.push(element.name.text);
              });
            } else if (ts.isNamespaceImport(importClause.namedBindings)) {
              specifiers.push(`* as ${importClause.namedBindings.name.text}`);
            }
          }
        }

        imports.push({
          source,
          specifiers,
          isDefault,
          location: this.getLocation(node, sourceFile, filePath)
        });
      }
    });

    return imports;
  }

  /**
   * Export 문 추출
   */
  private extractExports(sourceFile: ts.SourceFile, filePath: string): ExportInfo[] {
    const exports: ExportInfo[] = [];

    const visit = (node: ts.Node) => {
      // export function / export class / export const
      if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isVariableStatement(node)) {
        const modifiers = ts.getModifiers(node);
        const hasExport = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
        const hasDefault = modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
        
        if (hasExport) {
          let name = 'default';
          if (ts.isFunctionDeclaration(node) && node.name) {
            name = node.name.text;
          } else if (ts.isClassDeclaration(node) && node.name) {
            name = node.name.text;
          } else if (ts.isVariableStatement(node)) {
            const declarations = node.declarationList.declarations;
            if (declarations.length > 0 && ts.isIdentifier(declarations[0].name)) {
              name = declarations[0].name.text;
            }
          }
          
          exports.push({
            name,
            isDefault: !!hasDefault,
            location: this.getLocation(node, sourceFile, filePath)
          });
        }
      }

      // export { ... }
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach((element) => {
          exports.push({
            name: element.name.text,
            isDefault: false,
            location: this.getLocation(element, sourceFile, filePath)
          });
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return exports;
  }

  /**
   * TS AST 노드를 표준 ASTNode로 변환
   */
  private convertNode(
    tsNode: ts.Node,
    filePath: string,
    content: string,
    parentId?: string
  ): ASTNode {
    const id = this.generateNodeId(tsNode, filePath);
    const nodeType = this.mapNodeType(tsNode);
    const name = this.getNodeName(tsNode);
    const sourceFile = tsNode.getSourceFile();
    
    const children: ASTNode[] = [];
    ts.forEachChild(tsNode, (child) => {
      // 주요 노드만 수집 (너무 깊이 들어가지 않도록)
      if (this.isSignificantNode(child)) {
        children.push(this.convertNode(child, filePath, content, id));
      }
    });

    return {
      id,
      type: nodeType,
      name,
      location: this.getLocation(tsNode, sourceFile, filePath),
      children,
      parent: parentId,
      metadata: this.extractMetadata(tsNode)
    };
  }

  /**
   * 위치 정보 추출
   */
  private getLocation(node: ts.Node, sourceFile: ts.SourceFile, filePath: string): ASTLocation {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    
    return {
      start: {
        line: start.line + 1,  // 1-indexed
        column: start.character,
        offset: node.getStart()
      },
      end: {
        line: end.line + 1,
        column: end.character,
        offset: node.getEnd()
      },
      filePath
    };
  }

  /**
   * TS 노드 종류를 표준 타입으로 매핑
   */
  private mapNodeType(node: ts.Node): ASTNodeType {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      return 'function';
    }
    if (ts.isClassDeclaration(node)) return 'class';
    if (ts.isMethodDeclaration(node)) return 'method';
    if (ts.isInterfaceDeclaration(node)) return 'interface';
    if (ts.isTypeAliasDeclaration(node)) return 'type';
    if (ts.isVariableDeclaration(node) || ts.isVariableStatement(node)) return 'variable';
    if (ts.isImportDeclaration(node)) return 'import';
    if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) return 'export';
    if (ts.isCallExpression(node)) return 'call';
    if (ts.isBlock(node)) return 'block';
    if (ts.isExpressionStatement(node)) return 'expression';
    return 'other';
  }

  /**
   * 노드 이름 추출
   */
  private getNodeName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
    if (ts.isClassDeclaration(node) && node.name) return node.name.text;
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
    if (ts.isInterfaceDeclaration(node)) return node.name.text;
    if (ts.isTypeAliasDeclaration(node)) return node.name.text;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
    return undefined;
  }

  /**
   * 중요 노드 여부 판단
   */
  private isSignificantNode(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) ||
           ts.isClassDeclaration(node) ||
           ts.isMethodDeclaration(node) ||
           ts.isInterfaceDeclaration(node) ||
           ts.isTypeAliasDeclaration(node) ||
           ts.isVariableStatement(node) ||
           ts.isImportDeclaration(node) ||
           ts.isExportDeclaration(node);
  }

  /**
   * 메타데이터 추출
   */
  private extractMetadata(node: ts.Node): Record<string, unknown> | undefined {
    const metadata: Record<string, unknown> = {};
    
    // Async 함수 여부
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      const modifiers = ts.getModifiers(node);
      metadata.isAsync = modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
      
      // 파라미터 수
      metadata.parameterCount = node.parameters?.length || 0;
    }

    // 클래스 관련
    if (ts.isClassDeclaration(node)) {
      metadata.isAbstract = ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.AbstractKeyword) || false;
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  /**
   * 노드 ID 생성
   */
  private generateNodeId(node: ts.Node, filePath: string): string {
    const pos = node.getStart();
    return `${filePath}:${pos}`;
  }

  /**
   * 빈 노드 생성 (파싱 실패 시)
   */
  private createEmptyNode(filePath: string): ASTNode {
    return {
      id: `${filePath}:root`,
      type: 'other',
      location: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 0 },
        filePath
      },
      children: []
    };
  }

  /**
   * 캐시 인스턴스 반환
   */
  getCache(): ASTCache {
    return this.cache;
  }
}
