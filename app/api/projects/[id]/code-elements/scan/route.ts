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
  const excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.venv'];
  const includeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.vue'];

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
  
  // 언어 감지
  let language = 'unknown';
  if (['.ts', '.tsx'].includes(ext)) language = 'TypeScript';
  else if (['.js', '.jsx'].includes(ext)) language = 'JavaScript';
  else if (ext === '.py') language = 'Python';
  else if (ext === '.java') language = 'Java';
  else if (ext === '.go') language = 'Go';
  else if (ext === '.vue') language = 'Vue';

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

  return elements;
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
