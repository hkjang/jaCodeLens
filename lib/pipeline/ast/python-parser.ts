/**
 * Python AST 파서
 * 
 * Python 소스 코드를 AST로 파싱합니다.
 * 정규 표현식 기반 경량 파서 (외부 도구 없이 동작)
 */

import {
  ASTFile,
  ASTNode,
  ASTLocation,
  ASTPosition,
  ImportInfo,
  ExportInfo,
  SupportedLanguage
} from '../types';
import { ASTCache } from './cache';

// ============================================================================
// Python 파서
// ============================================================================

export class PythonParser {
  private cache: ASTCache;
  private nodeCounter = 0;

  constructor(cache?: ASTCache) {
    this.cache = cache || new ASTCache();
  }

  /**
   * Python 파일 파싱
   */
  parseFile(filePath: string, content: string): ASTFile {
    // 캐시 확인
    const cached = this.cache.get(filePath, content);
    if (cached) {
      return cached;
    }

    this.nodeCounter = 0;
    const lines = content.split('\n');

    const root: ASTNode = {
      id: this.generateId(),
      type: 'block',
      name: 'module',
      location: this.createLocation(filePath, 1, lines.length, 0, 0),
      children: [],
    };

    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];

    let currentClass: ASTNode | null = null;
    let currentFunction: ASTNode | null = null;
    let classIndent = -1;
    let functionIndent = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const indent = this.getIndent(line);
      const trimmed = line.trim();

      // 빈 줄이나 주석 스킵
      if (!trimmed || trimmed.startsWith('#')) continue;

      // 클래스/함수 종료 감지 (인덴트 감소)
      if (currentFunction && indent <= functionIndent && !this.isContinuation(line)) {
        currentFunction = null;
        functionIndent = -1;
      }
      if (currentClass && indent <= classIndent && !this.isContinuation(line)) {
        currentClass = null;
        classIndent = -1;
      }

      // Import 파싱
      const importMatch = this.parseImport(trimmed, filePath, lineNum);
      if (importMatch) {
        imports.push(importMatch);
        continue;
      }

      // 클래스 파싱
      const classMatch = trimmed.match(/^class\s+(\w+)(?:\s*\([^)]*\))?:/);
      if (classMatch) {
        const classNode = this.createClassNode(classMatch[1], filePath, lineNum, indent, lines, i);
        if (currentClass) {
          currentClass.children.push(classNode);
        } else {
          root.children.push(classNode);
        }
        currentClass = classNode;
        classIndent = indent;
        
        // 내보내기 (모듈 레벨 클래스)
        if (indent === 0) {
          exports.push({
            name: classMatch[1],
            isDefault: false,
            location: classNode.location,
          });
        }
        continue;
      }

      // 함수 파싱
      const funcMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)\s*\([^)]*\)/);
      if (funcMatch) {
        const isAsync = trimmed.startsWith('async');
        const funcNode = this.createFunctionNode(funcMatch[1], filePath, lineNum, indent, lines, i, isAsync);
        
        if (currentClass) {
          // 메서드
          funcNode.type = 'method';
          currentClass.children.push(funcNode);
        } else if (currentFunction) {
          // 중첩 함수
          currentFunction.children.push(funcNode);
        } else {
          // 모듈 레벨 함수
          root.children.push(funcNode);
          
          // 내보내기 (언더스코어로 시작하지 않는 함수)
          if (!funcMatch[1].startsWith('_')) {
            exports.push({
              name: funcMatch[1],
              isDefault: false,
              location: funcNode.location,
            });
          }
        }
        
        currentFunction = funcNode;
        functionIndent = indent;
        continue;
      }

      // 모듈 레벨 변수 (상수)
      const varMatch = trimmed.match(/^([A-Z][A-Z0-9_]*)\s*=/);
      if (varMatch && indent === 0) {
        const varNode: ASTNode = {
          id: this.generateId(),
          type: 'variable',
          name: varMatch[1],
          location: this.createLocation(filePath, lineNum, lineNum, 0, line.length),
          children: [],
          metadata: { constant: true },
        };
        root.children.push(varNode);
      }
    }

    const astFile: ASTFile = {
      filePath,
      language: 'python' as SupportedLanguage,
      root,
      imports,
      exports,
    };

    this.cache.set(filePath, content, astFile);
    return astFile;
  }

  /**
   * Import 파싱
   */
  private parseImport(line: string, filePath: string, lineNum: number): ImportInfo | null {
    // import module
    const simpleImport = line.match(/^import\s+(\S+)(?:\s+as\s+\w+)?/);
    if (simpleImport) {
      return {
        source: simpleImport[1],
        specifiers: [simpleImport[1].split('.').pop() || simpleImport[1]],
        isDefault: true,
        location: this.createLocation(filePath, lineNum, lineNum, 0, line.length),
      };
    }

    // from module import ...
    const fromImport = line.match(/^from\s+(\S+)\s+import\s+(.+)/);
    if (fromImport) {
      const module = fromImport[1];
      const imports = fromImport[2].split(',').map(s => s.trim().split(' as ')[0].trim());
      return {
        source: module,
        specifiers: imports,
        isDefault: imports.length === 1,
        location: this.createLocation(filePath, lineNum, lineNum, 0, line.length),
      };
    }

    return null;
  }

  /**
   * 클래스 노드 생성
   */
  private createClassNode(
    name: string,
    filePath: string,
    startLine: number,
    indent: number,
    lines: string[],
    lineIndex: number
  ): ASTNode {
    const endLine = this.findBlockEnd(lines, lineIndex, indent);
    
    return {
      id: this.generateId(),
      type: 'class',
      name,
      location: this.createLocation(filePath, startLine, endLine, 0, 0),
      children: [],
      metadata: {
        exported: indent === 0,
      },
    };
  }

  /**
   * 함수 노드 생성
   */
  private createFunctionNode(
    name: string,
    filePath: string,
    startLine: number,
    indent: number,
    lines: string[],
    lineIndex: number,
    isAsync: boolean
  ): ASTNode {
    const endLine = this.findBlockEnd(lines, lineIndex, indent);
    const paramMatch = lines[lineIndex].match(/def\s+\w+\s*\(([^)]*)\)/);
    const params = paramMatch ? paramMatch[1].split(',').filter(p => p.trim()).length : 0;

    return {
      id: this.generateId(),
      type: 'function',
      name,
      location: this.createLocation(filePath, startLine, endLine, 0, 0),
      children: [],
      metadata: {
        async: isAsync,
        parameters: params,
        exported: indent === 0 && !name.startsWith('_'),
      },
    };
  }

  /**
   * 블록 끝 찾기 (인덴트 기반)
   */
  private findBlockEnd(lines: string[], startIndex: number, blockIndent: number): number {
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // 빈 줄이나 주석은 스킵
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const indent = this.getIndent(line);
      if (indent <= blockIndent && !this.isContinuation(line)) {
        return i;
      }
    }
    return lines.length;
  }

  /**
   * 인덴트 계산
   */
  private getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  /**
   * 줄 이어짐 확인
   */
  private isContinuation(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith(')') || trimmed.startsWith(']') || trimmed.startsWith('}');
  }

  /**
   * 위치 정보 생성
   */
  private createLocation(
    filePath: string,
    startLine: number,
    endLine: number,
    startCol: number,
    endCol: number
  ): ASTLocation {
    return {
      filePath,
      start: { line: startLine, column: startCol },
      end: { line: endLine, column: endCol },
    };
  }

  /**
   * 노드 ID 생성
   */
  private generateId(): string {
    return `py_node_${++this.nodeCounter}`;
  }
}
