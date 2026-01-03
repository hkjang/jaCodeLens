/**
 * Go AST 파서
 * 
 * Go 소스 코드를 AST로 파싱합니다.
 * 정규 표현식 기반 경량 파서 (외부 도구 없이 동작)
 */

import {
  ASTFile,
  ASTNode,
  ASTLocation,
  ImportInfo,
  ExportInfo,
  SupportedLanguage
} from '../types';
import { ASTCache } from './cache';

// ============================================================================
// Go 파서
// ============================================================================

export class GoParser {
  private cache: ASTCache;
  private nodeCounter = 0;

  constructor(cache?: ASTCache) {
    this.cache = cache || new ASTCache();
  }

  /**
   * Go 파일 파싱
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
      name: 'package',
      location: this.createLocation(filePath, 1, lines.length, 0, 0),
      children: [],
    };

    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];

    let packageName = '';
    let inImportBlock = false;
    let importBlockStart = 0;
    let currentStruct: ASTNode | null = null;
    let currentFunc: ASTNode | null = null;
    let braceDepth = 0;
    let structBraceDepth = 0;
    let funcBraceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      // 빈 줄이나 주석 스킵
      if (!trimmed || trimmed.startsWith('//')) continue;

      // 중괄호 추적
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceDepth += openBraces - closeBraces;

      // 구조체/함수 종료 감지
      if (currentStruct && braceDepth < structBraceDepth) {
        currentStruct = null;
      }
      if (currentFunc && braceDepth < funcBraceDepth) {
        currentFunc = null;
      }

      // Package 선언
      const packageMatch = trimmed.match(/^package\s+(\w+)/);
      if (packageMatch) {
        packageName = packageMatch[1];
        root.name = packageName;
        continue;
      }

      // Import 블록 시작
      if (trimmed === 'import (') {
        inImportBlock = true;
        importBlockStart = lineNum;
        continue;
      }

      // Import 블록 종료
      if (inImportBlock && trimmed === ')') {
        inImportBlock = false;
        continue;
      }

      // Import 처리
      if (inImportBlock) {
        const importStr = trimmed.replace(/"/g, '').trim();
        if (importStr) {
          imports.push({
            source: importStr,
            specifiers: [importStr.split('/').pop() || importStr],
            isDefault: false,
            location: this.createLocation(filePath, lineNum, lineNum, 0, line.length),
          });
        }
        continue;
      }

      // 단일 import
      const singleImport = trimmed.match(/^import\s+"([^"]+)"/);
      if (singleImport) {
        imports.push({
          source: singleImport[1],
          specifiers: [singleImport[1].split('/').pop() || singleImport[1]],
          isDefault: true,
          location: this.createLocation(filePath, lineNum, lineNum, 0, line.length),
        });
        continue;
      }

      // Struct 정의
      const structMatch = trimmed.match(/^type\s+(\w+)\s+struct\s*{?/);
      if (structMatch) {
        const structName = structMatch[1];
        const endLine = this.findBlockEnd(lines, i);
        
        const structNode: ASTNode = {
          id: this.generateId(),
          type: 'class', // Go struct는 class로 매핑
          name: structName,
          location: this.createLocation(filePath, lineNum, endLine, 0, 0),
          children: [],
          metadata: {
            exported: this.isExported(structName),
          },
        };

        root.children.push(structNode);
        currentStruct = structNode;
        structBraceDepth = braceDepth;

        // 내보내기 (대문자 시작)
        if (this.isExported(structName)) {
          exports.push({
            name: structName,
            isDefault: false,
            location: structNode.location,
          });
        }
        continue;
      }

      // Interface 정의
      const interfaceMatch = trimmed.match(/^type\s+(\w+)\s+interface\s*{?/);
      if (interfaceMatch) {
        const interfaceName = interfaceMatch[1];
        const endLine = this.findBlockEnd(lines, i);

        const interfaceNode: ASTNode = {
          id: this.generateId(),
          type: 'interface',
          name: interfaceName,
          location: this.createLocation(filePath, lineNum, endLine, 0, 0),
          children: [],
          metadata: {
            exported: this.isExported(interfaceName),
          },
        };

        root.children.push(interfaceNode);

        if (this.isExported(interfaceName)) {
          exports.push({
            name: interfaceName,
            isDefault: false,
            location: interfaceNode.location,
          });
        }
        continue;
      }

      // Function 정의
      const funcMatch = trimmed.match(/^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\([^)]*\)/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const endLine = this.findBlockEnd(lines, i);
        const paramMatch = trimmed.match(/\(([^)]*)\)/);
        const params = paramMatch ? paramMatch[1].split(',').filter(p => p.trim()).length : 0;

        // 메서드 리시버 확인
        const receiverMatch = trimmed.match(/^func\s+\((\w+)\s+\*?(\w+)\)/);
        const isMethod = !!receiverMatch;

        const funcNode: ASTNode = {
          id: this.generateId(),
          type: isMethod ? 'method' : 'function',
          name: funcName,
          location: this.createLocation(filePath, lineNum, endLine, 0, 0),
          children: [],
          metadata: {
            exported: this.isExported(funcName),
            parameters: params,
            receiver: receiverMatch ? receiverMatch[2] : undefined,
          },
        };

        // 메서드인 경우 해당 구조체 찾아서 추가
        if (isMethod && receiverMatch) {
          const structNode = root.children.find(
            c => c.type === 'class' && c.name === receiverMatch[2]
          );
          if (structNode) {
            structNode.children.push(funcNode);
          } else {
            root.children.push(funcNode);
          }
        } else {
          root.children.push(funcNode);
        }

        currentFunc = funcNode;
        funcBraceDepth = braceDepth;

        if (this.isExported(funcName) && !isMethod) {
          exports.push({
            name: funcName,
            isDefault: false,
            location: funcNode.location,
          });
        }
        continue;
      }

      // 상수/변수 정의
      const constMatch = trimmed.match(/^(?:const|var)\s+(\w+)/);
      if (constMatch) {
        const varName = constMatch[1];
        const isConst = trimmed.startsWith('const');
        
        const varNode: ASTNode = {
          id: this.generateId(),
          type: 'variable',
          name: varName,
          location: this.createLocation(filePath, lineNum, lineNum, 0, line.length),
          children: [],
          metadata: {
            constant: isConst,
            exported: this.isExported(varName),
          },
        };

        root.children.push(varNode);
      }
    }

    const astFile: ASTFile = {
      filePath,
      language: 'go' as SupportedLanguage,
      root,
      imports,
      exports,
    };

    this.cache.set(filePath, content, astFile);
    return astFile;
  }

  /**
   * Go에서 내보내기 여부 확인 (대문자로 시작)
   */
  private isExported(name: string): boolean {
    return /^[A-Z]/.test(name);
  }

  /**
   * 블록 끝 찾기 (중괄호 기반)
   */
  private findBlockEnd(lines: string[], startIndex: number): number {
    let depth = 0;
    let started = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          depth++;
          started = true;
        } else if (char === '}') {
          depth--;
          if (started && depth === 0) {
            return i + 1;
          }
        }
      }
    }

    return lines.length;
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
    return `go_node_${++this.nodeCounter}`;
  }
}
