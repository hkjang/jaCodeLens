/**
 * Java AST 파서
 * 
 * Java 소스 파일을 분석하여 클래스, 메서드, 필드를 추출합니다.
 * 정규식 및 패턴 기반 파싱으로 외부 의존성 없이 동작합니다.
 */

import {
  ASTFile,
  ASTNode,
  ASTLocation,
  ASTNodeType,
  ImportInfo,
  ExportInfo
} from '../types';
import { ASTCache } from './cache';

// Java 키워드
const MODIFIERS = ['public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized', 'native', 'volatile', 'transient'];
const ACCESS_MODIFIERS = ['public', 'private', 'protected'];

export class JavaParser {
  private cache: ASTCache;

  constructor(cache?: ASTCache) {
    this.cache = cache || new ASTCache();
  }

  /**
   * Java 파일 파싱
   */
  parseFile(filePath: string, content: string): ASTFile {
    // 캐시 확인
    const contentHash = ASTCache.computeHash(content);
    const cached = this.cache.get(filePath, contentHash);
    if (cached) {
      return cached;
    }

    try {
      const lines = content.split('\n');
      const imports = this.extractImports(content, filePath);
      const root = this.parseContent(content, filePath);

      const astFile: ASTFile = {
        filePath,
        language: 'java',
        root,
        imports,
        exports: []  // Java는 export 개념이 다름 (public 클래스가 export)
      };

      this.cache.set(filePath, contentHash, astFile);
      return astFile;
    } catch (error) {
      return {
        filePath,
        language: 'java',
        root: this.createEmptyNode(filePath),
        imports: [],
        exports: [],
        parseError: error instanceof Error ? error.message : 'Unknown parse error'
      };
    }
  }

  /**
   * Import 문 추출
   */
  private extractImports(content: string, filePath: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // import 문 매칭
      const importMatch = line.match(/^import\s+(static\s+)?([a-zA-Z0-9_.]+)(\.\*)?;/);
      if (importMatch) {
        const isStatic = !!importMatch[1];
        const importPath = importMatch[2];
        const isWildcard = !!importMatch[3];
        
        imports.push({
          source: importPath + (isWildcard ? '.*' : ''),
          specifiers: [importPath.split('.').pop() || importPath],
          isDefault: !isWildcard,
          location: this.createLocation(filePath, i + 1, i + 1)
        });
      }
    }

    return imports;
  }

  /**
   * 콘텐츠 파싱
   */
  private parseContent(content: string, filePath: string): ASTNode {
    const children: ASTNode[] = [];
    const lines = content.split('\n');
    
    // 패키지 선언
    const packageMatch = content.match(/package\s+([a-zA-Z0-9_.]+)\s*;/);
    const packageName = packageMatch ? packageMatch[1] : undefined;

    // 클래스/인터페이스/enum 추출
    const classPattern = /(?:(?:public|private|protected|abstract|final|static)\s+)*(?:class|interface|enum)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/g;
    
    let match;
    while ((match = classPattern.exec(content)) !== null) {
      const className = match[1];
      const extendsClass = match[2];
      const implementsInterfaces = match[3]?.split(',').map(s => s.trim());
      
      const startLine = this.getLineNumber(content, match.index);
      const classEndIndex = this.findMatchingBrace(content, match.index + match[0].length - 1);
      const endLine = this.getLineNumber(content, classEndIndex);
      
      const classBody = content.substring(match.index + match[0].length, classEndIndex);
      const classNode: ASTNode = {
        id: `${filePath}:${className}`,
        type: 'class',
        name: className,
        location: this.createLocation(filePath, startLine, endLine),
        children: this.parseClassBody(classBody, filePath, className, startLine),
        metadata: {
          packageName,
          extends: extendsClass,
          implements: implementsInterfaces,
          isPublic: match[0].includes('public'),
          isAbstract: match[0].includes('abstract'),
          isFinal: match[0].includes('final')
        }
      };
      
      children.push(classNode);
    }

    return {
      id: `${filePath}:root`,
      type: 'other',
      name: packageName,
      location: this.createLocation(filePath, 1, lines.length),
      children,
      metadata: { packageName }
    };
  }

  /**
   * 클래스 바디 파싱 (메서드, 필드)
   */
  private parseClassBody(
    body: string, 
    filePath: string, 
    className: string,
    baseLineOffset: number
  ): ASTNode[] {
    const children: ASTNode[] = [];
    
    // 메서드 패턴
    const methodPattern = /(?:(?:public|private|protected|static|final|abstract|synchronized|native)\s+)*(?:<[^>]+>\s+)?(\w+(?:\[\])?)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[^{]+)?\s*(?:\{|;)/g;
    
    // 필드 패턴
    const fieldPattern = /(?:(?:public|private|protected|static|final|volatile|transient)\s+)+(\w+(?:<[^>]+>)?(?:\[\])?)\s+(\w+)\s*(?:=\s*[^;]+)?\s*;/g;
    
    // 메서드 추출
    let match;
    while ((match = methodPattern.exec(body)) !== null) {
      const returnType = match[1];
      const methodName = match[2];
      const params = match[3];
      
      // 생성자 확인
      const isConstructor = returnType === className || methodName === className;
      
      const lineInBody = this.getLineNumber(body, match.index);
      const startLine = baseLineOffset + lineInBody;
      
      // 메서드 끝 찾기
      let endLine = startLine;
      if (match[0].endsWith('{')) {
        const methodEndIndex = this.findMatchingBrace(body, match.index + match[0].length - 1);
        endLine = baseLineOffset + this.getLineNumber(body, methodEndIndex);
      }
      
      const modifiers = this.extractModifiers(body.substring(Math.max(0, match.index - 50), match.index));
      
      children.push({
        id: `${filePath}:${className}.${methodName}`,
        type: isConstructor ? 'function' : 'method',
        name: methodName,
        location: this.createLocation(filePath, startLine, endLine),
        children: [],
        metadata: {
          returnType: isConstructor ? undefined : returnType,
          parameters: this.parseParameters(params),
          parameterCount: params.split(',').filter(p => p.trim()).length,
          isPublic: modifiers.includes('public'),
          isPrivate: modifiers.includes('private'),
          isProtected: modifiers.includes('protected'),
          isStatic: modifiers.includes('static'),
          isAbstract: modifiers.includes('abstract'),
          isFinal: modifiers.includes('final'),
          isConstructor
        }
      });
    }
    
    // 필드 추출
    while ((match = fieldPattern.exec(body)) !== null) {
      const fieldType = match[1];
      const fieldName = match[2];
      const lineInBody = this.getLineNumber(body, match.index);
      const startLine = baseLineOffset + lineInBody;
      
      const modifiers = this.extractModifiers(match[0]);
      
      children.push({
        id: `${filePath}:${className}.${fieldName}`,
        type: 'variable',
        name: fieldName,
        location: this.createLocation(filePath, startLine, startLine),
        children: [],
        metadata: {
          fieldType,
          isPublic: modifiers.includes('public'),
          isPrivate: modifiers.includes('private'),
          isStatic: modifiers.includes('static'),
          isFinal: modifiers.includes('final')
        }
      });
    }

    return children;
  }

  /**
   * 파라미터 파싱
   */
  private parseParameters(params: string): Array<{ name: string; type: string }> {
    if (!params.trim()) return [];
    
    return params.split(',').map(p => {
      const parts = p.trim().split(/\s+/);
      const name = parts.pop() || '';
      const type = parts.filter(p => !MODIFIERS.includes(p)).join(' ');
      return { name, type };
    });
  }

  /**
   * 수정자 추출
   */
  private extractModifiers(text: string): string[] {
    return MODIFIERS.filter(mod => new RegExp(`\\b${mod}\\b`).test(text));
  }

  /**
   * 매칭되는 닫는 괄호 찾기
   */
  private findMatchingBrace(content: string, openIndex: number): number {
    let depth = 1;
    let i = openIndex + 1;
    
    while (i < content.length && depth > 0) {
      const char = content[i];
      if (char === '{') depth++;
      else if (char === '}') depth--;
      i++;
    }
    
    return i - 1;
  }

  /**
   * 문자 위치에서 줄 번호 계산
   */
  private getLineNumber(content: string, charIndex: number): number {
    return content.substring(0, charIndex).split('\n').length;
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

  /**
   * 빈 노드 생성
   */
  private createEmptyNode(filePath: string): ASTNode {
    return {
      id: `${filePath}:root`,
      type: 'other',
      location: this.createLocation(filePath, 1, 1),
      children: []
    };
  }

  /**
   * 캐시 반환
   */
  getCache(): ASTCache {
    return this.cache;
  }
}
