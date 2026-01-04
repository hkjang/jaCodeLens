/**
 * 프로젝트 코드 요소 스캔 API
 * 
 * POST - 프로젝트 파일 스캔하여 코드 요소 추출
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

interface ExtractedElement {
  filePath: string;
  fileName: string;
  language: string;
  elementType: string;
  name: string;
  signature?: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  parentName?: string;
  exportType?: string;
  isAsync: boolean;
  isExported: boolean;
}

// POST: 프로젝트 스캔
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // 프로젝트 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, path: true }
    });

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    console.log(`\n🔍 [CodeElement Scan] Starting scan for project: ${project.name}`);
    console.log(`   Path: ${project.path}`);

    // Git URL인 경우 로컬 스캔 불가
    if (project.path.startsWith('http://') || project.path.startsWith('https://') || project.path.startsWith('git@')) {
      return NextResponse.json({ 
        error: 'Git URL 프로젝트는 직접 스캔할 수 없습니다. 로컬 경로를 설정해주세요.',
        path: project.path,
        hint: '프로젝트 설정에서 로컬 클론 경로로 변경하세요'
      }, { status: 400 });
    }

    // 프로젝트 경로 존재 확인
    try {
      await fs.access(project.path);
    } catch {
      return NextResponse.json({ 
        error: '프로젝트 경로에 접근할 수 없습니다',
        path: project.path 
      }, { status: 400 });
    }

    // 파일 수집
    const files = await collectFiles(project.path);
    console.log(`   Found ${files.length} files`);

    // 코드 요소 추출
    const elements: ExtractedElement[] = [];
    for (const file of files) {
      try {
        const content = await fs.readFile(file.path, 'utf-8');
        const extracted = extractElements(file.path, file.relativePath, content);
        elements.push(...extracted);
      } catch (e) {
        console.warn(`   ⚠️ Failed to process: ${file.relativePath}`);
      }
    }

    console.log(`   Extracted ${elements.length} elements`);

    // 기존 요소 삭제 (옵션)
    const existingCount = await prisma.codeElement.count({ where: { projectId } });
    
    // 새 요소 저장
    let created = 0;
    let updated = 0;

    for (const el of elements) {
      const hash = Buffer.from(el.content).toString('base64').slice(0, 64);
      
      // 기존 요소 확인 (파일 + 이름 + 라인 기준)
      const existing = await prisma.codeElement.findFirst({
        where: {
          projectId,
          filePath: el.filePath,
          name: el.name,
          elementType: el.elementType,
        }
      });

      if (existing) {
        // 업데이트
        await prisma.codeElement.update({
          where: { id: existing.id },
          data: {
            lineStart: el.lineStart,
            lineEnd: el.lineEnd,
            content: el.content.slice(0, 5000),
            signature: el.signature,
            parentName: el.parentName,
            isAsync: el.isAsync,
            isExported: el.isExported,
            hash,
            updatedAt: new Date(),
          }
        });
        updated++;
      } else {
        // 새로 생성
        await prisma.codeElement.create({
          data: {
            projectId,
            filePath: el.filePath,
            fileName: el.fileName,
            language: el.language,
            elementType: el.elementType,
            name: el.name,
            signature: el.signature,
            lineStart: el.lineStart,
            lineEnd: el.lineEnd,
            content: el.content.slice(0, 5000),
            parentName: el.parentName,
            exportType: el.exportType,
            isAsync: el.isAsync,
            isExported: el.isExported,
            hash,
          }
        });
        created++;
      }
    }

    console.log(`   ✅ Scan complete: ${created} created, ${updated} updated`);

    return NextResponse.json({
      success: true,
      project: { id: project.id, name: project.name },
      stats: {
        filesScanned: files.length,
        elementsFound: elements.length,
        created,
        updated,
        existing: existingCount,
      }
    });

  } catch (error) {
    console.error('[CodeElement Scan] Error:', error);
    return NextResponse.json({ error: '스캔 실패' }, { status: 500 });
  }
}

// 파일 수집
async function collectFiles(basePath: string): Promise<{ path: string; relativePath: string }[]> {
  const files: { path: string; relativePath: string }[] = [];
  const excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.venv', 'target', 'out', '.idea', 'vendor', 'Pods', 'DerivedData', 'bin', 'obj', '.dart_tool', 'packages'];
  const includeExts = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts',  // TypeScript/JavaScript
    '.py',                                          // Python
    '.java', '.kt', '.scala', '.groovy',            // JVM 언어
    '.go',                                          // Go
    '.rs',                                          // Rust
    '.php',                                         // PHP  
    '.rb', '.rake',                                 // Ruby
    '.cs', '.fs',                                   // C#/F#
    '.swift',                                       // Swift
    '.c', '.h', '.cpp', '.hpp', '.cc', '.cxx',      // C/C++
    '.dart',                                        // Dart/Flutter
    '.vue', '.svelte',                              // Vue/Svelte
    '.lua',                                         // Lua
    '.r', '.R',                                     // R
    '.pl', '.pm',                                   // Perl
    '.ex', '.exs',                                  // Elixir
    '.clj', '.cljs',                                // Clojure
    '.hs',                                          // Haskell
    '.erl', '.hrl',                                 // Erlang
  ];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // Windows 경로를 Unix 스타일로 정규화 (\ -> /)
      const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (includeExts.includes(ext)) {
          files.push({ path: fullPath, relativePath });
        }
      }
    }
  }

  await walk(basePath);
  return files;
}

// 코드 요소 추출 (간단한 정규식 기반)
function extractElements(fullPath: string, relativePath: string, content: string): ExtractedElement[] {
  const elements: ExtractedElement[] = [];
  const ext = path.extname(fullPath).toLowerCase();
  const fileName = path.basename(fullPath);
  
  // 언어 감지 (확장)
  let language = 'unknown';
  const langMap: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript', '.mts': 'TypeScript',
    '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript',
    '.py': 'Python',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.groovy': 'Groovy',
    '.go': 'Go',
    '.rs': 'Rust',
    '.php': 'PHP',
    '.rb': 'Ruby', '.rake': 'Ruby',
    '.cs': 'C#',
    '.fs': 'F#',
    '.swift': 'Swift',
    '.c': 'C', '.h': 'C',
    '.cpp': 'C++', '.hpp': 'C++', '.cc': 'C++', '.cxx': 'C++',
    '.dart': 'Dart',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.lua': 'Lua',
    '.r': 'R', '.R': 'R',
    '.pl': 'Perl', '.pm': 'Perl',
    '.ex': 'Elixir', '.exs': 'Elixir',
    '.clj': 'Clojure', '.cljs': 'Clojure',
    '.hs': 'Haskell',
    '.erl': 'Erlang', '.hrl': 'Erlang',
  };
  language = langMap[ext] || 'unknown';

  const lines = content.split('\n');

  // TypeScript/JavaScript 패턴
  if (['TypeScript', 'JavaScript'].includes(language)) {
    // 함수: function name( or const name = ( or const name = async (
    const funcPattern = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/;
    // 클래스
    const classPattern = /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/;
    // 인터페이스
    const interfacePattern = /^(?:export\s+)?interface\s+(\w+)/;
    // 타입
    const typePattern = /^(?:export\s+)?type\s+(\w+)/;
    // 화살표 함수
    const arrowPattern = /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/;

    let currentClass: string | null = null;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const originalLine = lines[i];
      
      // 중괄호 카운트
      braceCount += (originalLine.match(/{/g) || []).length;
      braceCount -= (originalLine.match(/}/g) || []).length;

      if (braceCount === 0) currentClass = null;

      // 클래스
      const classMatch = line.match(classPattern);
      if (classMatch) {
        const name = classMatch[1];
        currentClass = name;
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath,
          fileName,
          language,
          elementType: 'CLASS',
          name,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false,
          isExported: line.includes('export'),
          exportType: line.startsWith('export default') ? 'default' : line.startsWith('export') ? 'named' : undefined,
        });
        continue;
      }

      // 인터페이스
      const interfaceMatch = line.match(interfacePattern);
      if (interfaceMatch) {
        const name = interfaceMatch[1];
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath,
          fileName,
          language,
          elementType: 'INTERFACE',
          name,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
          isAsync: false,
          isExported: line.includes('export'),
        });
        continue;
      }

      // 함수
      const funcMatch = line.match(funcPattern);
      if (funcMatch) {
        const name = funcMatch[1] || funcMatch[2];
        if (name && !['if', 'for', 'while', 'switch'].includes(name)) {
          const endLine = findBlockEnd(lines, i);
          elements.push({
            filePath: relativePath,
            fileName,
            language,
            elementType: currentClass ? 'METHOD' : 'FUNCTION',
            name,
            parentName: currentClass || undefined,
            lineStart: i + 1,
            lineEnd: endLine + 1,
            content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
            isAsync: line.includes('async'),
            isExported: line.includes('export'),
            signature: line.slice(0, 100),
          });
        }
        continue;
      }

      // 화살표 함수 (React 컴포넌트 등)
      const arrowMatch = line.match(arrowPattern);
      if (arrowMatch) {
        const name = arrowMatch[1];
        if (name && name[0] === name[0].toUpperCase()) {
          // 대문자로 시작하면 컴포넌트
          const endLine = findBlockEnd(lines, i);
          elements.push({
            filePath: relativePath,
            fileName,
            language,
            elementType: 'COMPONENT',
            name,
            lineStart: i + 1,
            lineEnd: endLine + 1,
            content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
            isAsync: line.includes('async'),
            isExported: line.includes('export'),
            signature: line.slice(0, 100),
          });
        }
      }
    }
  }

  // Python 패턴
  if (language === 'Python') {
    const funcPattern = /^(?:async\s+)?def\s+(\w+)\s*\(/;
    const classPattern = /^class\s+(\w+)/;

    let currentClass: string | null = null;
    let classIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const indent = line.search(/\S/);

      // 클래스
      const classMatch = line.match(classPattern);
      if (classMatch) {
        currentClass = classMatch[1];
        classIndent = indent;
        const endLine = findPythonBlockEnd(lines, i, indent);
        elements.push({
          filePath: relativePath,
          fileName,
          language,
          elementType: 'CLASS',
          name: currentClass,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false,
          isExported: false,
        });
        continue;
      }

      // 함수
      const funcMatch = line.match(funcPattern);
      if (funcMatch) {
        const name = funcMatch[1];
        const endLine = findPythonBlockEnd(lines, i, indent);
        const isMethod = currentClass && indent > classIndent;
        elements.push({
          filePath: relativePath,
          fileName,
          language,
          elementType: isMethod ? 'METHOD' : 'FUNCTION',
          name,
          parentName: isMethod && currentClass ? currentClass : undefined,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: line.includes('async'),
          isExported: false,
          signature: line.trim().slice(0, 100),
        });
      }
    }
  }

  // Java 패턴
  if (language === 'Java') {
    // 클래스/인터페이스/Enum
    const classPattern = /^(?:@\w+(?:\([^)]*\))?\s*)*(?:public\s+|private\s+|protected\s+)?(?:abstract\s+|final\s+)?(?:class|interface|enum)\s+(\w+)/;
    // 메서드
    const methodPattern = /^(?:@\w+(?:\([^)]*\))?\s*)*(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?(?:<[^>]+>\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/;
    // 생성자
    const constructorPattern = /^(?:public|private|protected)\s+(\w+)\s*\(/;
    // 어노테이션 (Spring 등)
    const annotationPattern = /^@(\w+)(?:\([^)]*\))?/;

    let currentClass: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 클래스
      const classMatch = line.match(classPattern);
      if (classMatch) {
        const name = classMatch[1];
        currentClass = name;
        const endLine = findBlockEnd(lines, i);
        
        // 어노테이션 확인
        const annotations: string[] = [];
        for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
          const prevLine = lines[j].trim();
          const annMatch = prevLine.match(annotationPattern);
          if (annMatch) {
            annotations.push('@' + annMatch[1]);
          } else if (prevLine && !prevLine.startsWith('//') && !prevLine.startsWith('/*')) {
            break;
          }
        }
        
        elements.push({
          filePath: relativePath,
          fileName,
          language,
          elementType: line.includes('interface') ? 'INTERFACE' : line.includes('enum') ? 'ENUM' : 'CLASS',
          name,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(Math.max(0, i - annotations.length), Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false,
          isExported: line.includes('public'),
          signature: annotations.join(' ') + ' ' + line.slice(0, 100),
        });
        continue;
      }

      // 메서드
      const methodMatch = line.match(methodPattern);
      if (methodMatch && currentClass) {
        const returnType = methodMatch[1];
        const name = methodMatch[2];
        if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
          const endLine = findBlockEnd(lines, i);
          
          // 어노테이션 확인
          const annotations: string[] = [];
          for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
            const prevLine = lines[j].trim();
            const annMatch = prevLine.match(annotationPattern);
            if (annMatch) {
              annotations.push('@' + annMatch[1]);
            } else if (prevLine && !prevLine.startsWith('//')) {
              break;
            }
          }
          
          elements.push({
            filePath: relativePath,
            fileName,
            language,
            elementType: 'METHOD',
            name,
            parentName: currentClass,
            lineStart: i + 1,
            lineEnd: endLine + 1,
            content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
            isAsync: line.includes('CompletableFuture') || line.includes('Mono<') || line.includes('@Async'),
            isExported: line.includes('public'),
            signature: annotations.join(' ') + ' ' + line.slice(0, 120),
          });
        }
        continue;
      }

      // 생성자
      const constructorMatch = line.match(constructorPattern);
      if (constructorMatch && currentClass && constructorMatch[1] === currentClass) {
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath,
          fileName,
          language,
          elementType: 'CONSTRUCTOR',
          name: currentClass,
          parentName: currentClass,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 20)).join('\n'),
          isAsync: false,
          isExported: line.includes('public'),
          signature: line.slice(0, 100),
        });
      }
    }
  }

  // Kotlin 패턴
  if (ext === '.kt') {
    const classPattern = /^(?:@\w+(?:\([^)]*\))?\s*)*(?:open\s+|abstract\s+|sealed\s+|data\s+)?(?:class|interface|object|enum class)\s+(\w+)/;
    const funPattern = /^(?:@\w+(?:\([^)]*\))?\s*)*(?:override\s+)?(?:suspend\s+)?(?:fun|private fun|internal fun)\s+(?:<[^>]+>\s+)?(\w+)\s*\(/;

    let currentClass: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const classMatch = line.match(classPattern);
      if (classMatch) {
        const name = classMatch[1];
        currentClass = name;
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath,
          fileName,
          language: 'Kotlin',
          elementType: line.includes('interface') ? 'INTERFACE' : line.includes('object') ? 'OBJECT' : 'CLASS',
          name,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false,
          isExported: !line.includes('private') && !line.includes('internal'),
        });
        continue;
      }

      const funMatch = line.match(funPattern);
      if (funMatch) {
        const name = funMatch[1];
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath,
          fileName,
          language: 'Kotlin',
          elementType: currentClass ? 'METHOD' : 'FUNCTION',
          name,
          parentName: currentClass || undefined,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
          isAsync: line.includes('suspend'),
          isExported: !line.includes('private'),
          signature: line.slice(0, 100),
        });
      }
    }
  }

  // Go 패턴
  if (language === 'Go') {
    const funcPattern = /^func\s+(?:\((\w+)\s+\*?(\w+)\)\s+)?(\w+)\s*\(/;
    const typePattern = /^type\s+(\w+)\s+(struct|interface)/;

    let currentStruct: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const typeMatch = line.match(typePattern);
      if (typeMatch) {
        const name = typeMatch[1];
        const kind = typeMatch[2];
        currentStruct = name;
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath,
          fileName,
          language,
          elementType: kind === 'interface' ? 'INTERFACE' : 'STRUCT',
          name,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false,
          isExported: name[0] === name[0].toUpperCase(),
        });
        continue;
      }

      const funcMatch = line.match(funcPattern);
      if (funcMatch) {
        const receiver = funcMatch[2] || null;
        const name = funcMatch[3];
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath,
          fileName,
          language,
          elementType: receiver ? 'METHOD' : 'FUNCTION',
          name,
          parentName: receiver || undefined,
          lineStart: i + 1,
          lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
          isAsync: false,
          isExported: name[0] === name[0].toUpperCase(),
          signature: line.slice(0, 100),
        });
      }
    }
  }

  // Swift 패턴
  if (language === 'Swift') {
    const classPattern = /^(?:@\w+\s+)*(?:public\s+|private\s+|internal\s+|open\s+)?(?:final\s+)?(?:class|struct|enum|actor|protocol)\s+(\w+)/;
    const funcPattern = /^(?:@\w+\s+)*(?:public\s+|private\s+|internal\s+)?(?:static\s+)?(?:override\s+)?func\s+(\w+)\s*\(/;

    let currentClass: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const classMatch = line.match(classPattern);
      if (classMatch) {
        const name = classMatch[1];
        currentClass = name;
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: line.includes('protocol') ? 'PROTOCOL' : line.includes('struct') ? 'STRUCT' : 'CLASS',
          name, lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false, isExported: !line.includes('private'),
        });
        continue;
      }

      const funcMatch = line.match(funcPattern);
      if (funcMatch) {
        const name = funcMatch[1];
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: currentClass ? 'METHOD' : 'FUNCTION',
          name, parentName: currentClass || undefined,
          lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
          isAsync: line.includes('async'), isExported: !line.includes('private'),
          signature: line.slice(0, 100),
        });
      }
    }
  }

  // Rust 패턴
  if (language === 'Rust') {
    const structPattern = /^(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/;
    const fnPattern = /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[<(]/;
    const implPattern = /^impl(?:<[^>]+>)?\s+(?:(\w+)\s+for\s+)?(\w+)/;

    let currentImpl: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const implMatch = line.match(implPattern);
      if (implMatch) {
        currentImpl = implMatch[2];
        continue;
      }

      const structMatch = line.match(structPattern);
      if (structMatch) {
        const name = structMatch[1];
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: line.includes('trait') ? 'TRAIT' : line.includes('enum') ? 'ENUM' : 'STRUCT',
          name, lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false, isExported: line.includes('pub'),
        });
        continue;
      }

      const fnMatch = line.match(fnPattern);
      if (fnMatch) {
        const name = fnMatch[1];
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: currentImpl ? 'METHOD' : 'FUNCTION',
          name, parentName: currentImpl || undefined,
          lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
          isAsync: line.includes('async'), isExported: line.includes('pub'),
          signature: line.slice(0, 100),
        });
      }
    }
  }

  // PHP 패턴
  if (language === 'PHP') {
    const classPattern = /^(?:abstract\s+|final\s+)?class\s+(\w+)/;
    const funcPattern = /^(?:public|private|protected)?\s*(?:static\s+)?function\s+(\w+)\s*\(/;
    const interfacePattern = /^interface\s+(\w+)/;

    let currentClass: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const classMatch = line.match(classPattern);
      if (classMatch) {
        const name = classMatch[1];
        currentClass = name;
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: 'CLASS', name, lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false, isExported: true,
        });
        continue;
      }

      const interfaceMatch = line.match(interfacePattern);
      if (interfaceMatch) {
        const name = interfaceMatch[1];
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: 'INTERFACE', name, lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
          isAsync: false, isExported: true,
        });
        continue;
      }

      const funcMatch = line.match(funcPattern);
      if (funcMatch) {
        const name = funcMatch[1];
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: currentClass ? 'METHOD' : 'FUNCTION',
          name, parentName: currentClass || undefined,
          lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
          isAsync: false, isExported: line.includes('public'),
          signature: line.slice(0, 100),
        });
      }
    }
  }

  // Ruby 패턴
  if (language === 'Ruby') {
    const classPattern = /^class\s+(\w+)/;
    const modulePattern = /^module\s+(\w+)/;
    const defPattern = /^def\s+(?:self\.)?(\w+[?!=]?)/;

    let currentClass: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const classMatch = line.match(classPattern);
      if (classMatch) {
        const name = classMatch[1];
        currentClass = name;
        const endLine = findRubyBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: 'CLASS', name, lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false, isExported: true,
        });
        continue;
      }

      const moduleMatch = line.match(modulePattern);
      if (moduleMatch) {
        const name = moduleMatch[1];
        const endLine = findRubyBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: 'MODULE', name, lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false, isExported: true,
        });
        continue;
      }

      const defMatch = line.match(defPattern);
      if (defMatch) {
        const name = defMatch[1];
        const endLine = findRubyBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: currentClass ? 'METHOD' : 'FUNCTION',
          name, parentName: currentClass || undefined,
          lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 20)).join('\n'),
          isAsync: false, isExported: true,
          signature: line.slice(0, 100),
        });
      }
    }
  }

  // C# 패턴
  if (language === 'C#') {
    const classPattern = /^(?:public\s+|private\s+|internal\s+)?(?:partial\s+)?(?:abstract\s+|sealed\s+)?(?:static\s+)?(?:class|interface|struct|record)\s+(\w+)/;
    const methodPattern = /^(?:public|private|protected|internal)\s+(?:static\s+)?(?:async\s+)?(?:virtual\s+|override\s+)?[\w<>\[\],\s]+\s+(\w+)\s*\(/;

    let currentClass: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const classMatch = line.match(classPattern);
      if (classMatch) {
        const name = classMatch[1];
        currentClass = name;
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: line.includes('interface') ? 'INTERFACE' : 'CLASS',
          name, lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false, isExported: line.includes('public'),
        });
        continue;
      }

      const methodMatch = line.match(methodPattern);
      if (methodMatch && currentClass) {
        const name = methodMatch[1];
        if (!['if', 'for', 'while', 'switch', 'catch', 'get', 'set'].includes(name)) {
          const endLine = findBlockEnd(lines, i);
          elements.push({
            filePath: relativePath, fileName, language,
            elementType: 'METHOD', name, parentName: currentClass,
            lineStart: i + 1, lineEnd: endLine + 1,
            content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
            isAsync: line.includes('async'), isExported: line.includes('public'),
            signature: line.slice(0, 120),
          });
        }
      }
    }
  }

  // Dart/Flutter 패턴
  if (language === 'Dart') {
    const classPattern = /^(?:abstract\s+)?class\s+(\w+)/;
    const funcPattern = /^(?:Future|void|String|int|bool|double|List|Map|dynamic|\w+)\s+(\w+)\s*\(/;

    let currentClass: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const classMatch = line.match(classPattern);
      if (classMatch) {
        const name = classMatch[1];
        currentClass = name;
        const endLine = findBlockEnd(lines, i);
        elements.push({
          filePath: relativePath, fileName, language,
          elementType: 'CLASS', name, lineStart: i + 1, lineEnd: endLine + 1,
          content: lines.slice(i, Math.min(endLine + 1, i + 50)).join('\n'),
          isAsync: false, isExported: !name.startsWith('_'),
        });
        continue;
      }

      const funcMatch = line.match(funcPattern);
      if (funcMatch) {
        const name = funcMatch[1];
        if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
          const endLine = findBlockEnd(lines, i);
          elements.push({
            filePath: relativePath, fileName, language,
            elementType: currentClass ? 'METHOD' : 'FUNCTION',
            name, parentName: currentClass || undefined,
            lineStart: i + 1, lineEnd: endLine + 1,
            content: lines.slice(i, Math.min(endLine + 1, i + 30)).join('\n'),
            isAsync: line.includes('async') || line.includes('Future'),
            isExported: !name.startsWith('_'),
            signature: line.slice(0, 100),
          });
        }
      }
    }
  }

  return elements;
}

// Ruby 블록 끝 찾기 (end 키워드 기반)
function findRubyBlockEnd(lines: string[], startLine: number): number {
  let depth = 0;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^(class|module|def|if|unless|case|while|until|for|begin|do)\b/.test(line)) {
      depth++;
    }
    if (line === 'end' || line.startsWith('end ')) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return Math.min(startLine + 50, lines.length - 1);
}

// 블록 끝 찾기 (중괄호 기반)
function findBlockEnd(lines: string[], startLine: number): number {
  let braceCount = 0;
  let started = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        started = true;
      } else if (char === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          return i;
        }
      }
    }
  }

  return Math.min(startLine + 50, lines.length - 1);
}

// Python 블록 끝 찾기 (들여쓰기 기반)
function findPythonBlockEnd(lines: string[], startLine: number, baseIndent: number): number {
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const indent = line.search(/\S/);
    if (indent <= baseIndent && line.trim() !== '') {
      return i - 1;
    }
  }
  return lines.length - 1;
}
