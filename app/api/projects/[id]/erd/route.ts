import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { prisma } from '@/lib/db';

interface ErdField {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isOptional: boolean;
  isArray: boolean;
  isRelation: boolean;
  defaultValue?: string;
  attributes: string[];
}

interface ErdRelation {
  from: string;
  to: string;
  fromField: string;
  toField: string;
  type: '1-1' | '1-n' | 'n-1' | 'n-n';
}

interface ErdModel {
  name: string;
  fields: ErdField[];
  category: string;
}

interface ErdData {
  models: ErdModel[];
  relations: ErdRelation[];
  schemaPath?: string;
}

// 모델 카테고리 분류 (이름 기반 추론)
function categorizeModel(name: string): string {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('user') || lowerName.includes('account') || lowerName.includes('auth')) {
    return 'User';
  }
  if (lowerName.includes('project') || lowerName.includes('workspace')) {
    return 'Project';
  }
  if (lowerName.includes('analysis') || lowerName.includes('result') || lowerName.includes('metric')) {
    return 'Analysis';
  }
  if (lowerName.includes('code') || lowerName.includes('file') || lowerName.includes('element')) {
    return 'Code';
  }
  if (lowerName.includes('agent') || lowerName.includes('task')) {
    return 'Agent';
  }
  if (lowerName.includes('security') || lowerName.includes('vulnerability') || lowerName.includes('risk')) {
    return 'Security';
  }
  if (lowerName.includes('arch') || lowerName.includes('service') || lowerName.includes('module')) {
    return 'Architecture';
  }
  if (lowerName.includes('admin') || lowerName.includes('role') || lowerName.includes('permission')) {
    return 'Admin';
  }
  if (lowerName.includes('ai') || lowerName.includes('model') || lowerName.includes('prompt')) {
    return 'AI';
  }
  if (lowerName.includes('log') || lowerName.includes('audit') || lowerName.includes('history')) {
    return 'Logging';
  }
  if (lowerName.includes('config') || lowerName.includes('setting')) {
    return 'Config';
  }
  if (lowerName.includes('order') || lowerName.includes('product') || lowerName.includes('cart') || lowerName.includes('payment')) {
    return 'Commerce';
  }
  if (lowerName.includes('post') || lowerName.includes('comment') || lowerName.includes('blog') || lowerName.includes('article')) {
    return 'Content';
  }
  
  return 'Other';
}

// Prisma 스키마 파싱
function parsePrismaSchema(content: string): Omit<ErdData, 'schemaPath'> {
  const models: ErdModel[] = [];
  const relations: ErdRelation[] = [];
  
  // 모델 블록 추출
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    const fields: ErdField[] = [];
    
    // 필드 파싱
    const lines = modelBody.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      
      // 필드 패턴: fieldName Type? @attributes
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
      if (fieldMatch) {
        const [, fieldName, fieldType, isArray, isOptional, rest] = fieldMatch;
        
        const isPrimaryKey = rest.includes('@id');
        const isRelation = rest.includes('@relation');
        const defaultMatch = rest.match(/@default\(([^)]+)\)/);
        const defaultValue = defaultMatch ? defaultMatch[1] : undefined;
        
        // 속성 추출
        const attributes: string[] = [];
        if (isPrimaryKey) attributes.push('@id');
        if (rest.includes('@unique')) attributes.push('@unique');
        if (rest.includes('@default')) attributes.push('@default');
        if (rest.includes('@updatedAt')) attributes.push('@updatedAt');
        if (rest.includes('@map')) attributes.push('@map');
        
        fields.push({
          name: fieldName,
          type: fieldType,
          isPrimaryKey,
          isOptional: !!isOptional,
          isArray: !!isArray,
          isRelation,
          defaultValue,
          attributes,
        });
        
        // 관계 추출
        if (isRelation) {
          const relationMatch = rest.match(/@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/);
          if (relationMatch) {
            const [, fromField, toField] = relationMatch;
            relations.push({
              from: modelName,
              to: fieldType,
              fromField,
              toField,
              type: isArray ? '1-n' : 'n-1',
            });
          }
        }
      }
    }
    
    models.push({
      name: modelName,
      fields,
      category: categorizeModel(modelName),
    });
  }
  
  return { models, relations };
}

// 프로젝트 경로에서 Prisma 스키마 파일 찾기
function findPrismaSchema(projectPath: string): string | null {
  // 일반적인 Prisma 스키마 위치들
  const commonPaths = [
    'prisma/schema.prisma',
    'schema.prisma',
    'db/schema.prisma',
    'database/schema.prisma',
    'src/prisma/schema.prisma',
  ];
  
  for (const relativePath of commonPaths) {
    const fullPath = join(projectPath, relativePath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  // 재귀적으로 schema.prisma 파일 찾기 (최대 3단계)
  function searchDir(dir: string, depth: number): string | null {
    if (depth > 3) return null;
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        // node_modules, .git 등 제외
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') {
          continue;
        }
        
        const fullPath = join(dir, entry);
        
        try {
          const stat = statSync(fullPath);
          
          if (stat.isFile() && entry === 'schema.prisma') {
            return fullPath;
          }
          
          if (stat.isDirectory()) {
            const found = searchDir(fullPath, depth + 1);
            if (found) return found;
          }
        } catch (e) {
          // 접근 권한 없는 파일/폴더 무시
          continue;
        }
      }
    } catch (e) {
      // 디렉토리 읽기 실패 무시
    }
    
    return null;
  }
  
  return searchDir(projectPath, 0);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 프로젝트 정보 가져오기
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, path: true }
    });
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // 프로젝트 경로 확인
    if (!project.path || !existsSync(project.path)) {
      return NextResponse.json(
        { error: 'Project path not found', projectPath: project.path },
        { status: 404 }
      );
    }
    
    // Prisma 스키마 파일 찾기
    const schemaPath = findPrismaSchema(project.path);
    
    if (!schemaPath) {
      return NextResponse.json(
        { 
          error: 'Prisma schema not found in project',
          searchedPath: project.path,
          models: [],
          relations: []
        },
        { status: 200 } // 스키마 없어도 빈 결과 반환
      );
    }
    
    // 스키마 파일 읽기 및 파싱
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    const erdData = parsePrismaSchema(schemaContent);
    
    return NextResponse.json({
      ...erdData,
      schemaPath: schemaPath.replace(project.path, ''),
      projectName: project.name,
      projectPath: project.path
    });
    
  } catch (error) {
    console.error('Failed to parse Prisma schema:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: 'Failed to parse Prisma schema', 
        details: errorMessage,
        stack: errorStack,
        models: [],
        relations: []
      },
      { status: 200 } // 오류여도 빈 결과 반환하여 UI가 깨지지 않도록
    );
  }
}
