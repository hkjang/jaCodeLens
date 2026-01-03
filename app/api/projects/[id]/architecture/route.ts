import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * 프로젝트별 아키텍처 API
 * 
 * GET /api/projects/[id]/architecture
 * - 해당 프로젝트의 모듈 구조 데이터 반환
 */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    // 프로젝트 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 최근 분석 실행 조회
    const latestExecution = await prisma.analysisExecute.findFirst({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
      select: { id: true }
    });

    if (!latestExecution) {
      return NextResponse.json({ modules: [], structureIssues: 0 });
    }

    // 코드 요소에서 모듈 구조 추출
    const codeElements = await prisma.codeElement.findMany({
      where: { projectId },
      select: {
        filePath: true,
        elementType: true,
        name: true
      }
    });

    // 구조 이슈 조회
    const structureResults = await prisma.normalizedAnalysisResult.findMany({
      where: { 
        executeId: latestExecution.id,
        mainCategory: 'STRUCTURE'
      }
    });

    // 모듈 추출 (디렉토리 기반)
    const moduleMap = new Map<string, {
      name: string;
      type: string;
      issueCount: number;
    }>();

    for (const element of codeElements) {
      const parts = element.filePath.split(/[/\\]/);
      const moduleName = parts.length > 1 ? parts[0] : 'root';
      
      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, {
          name: moduleName,
          type: inferModuleType(moduleName),
          issueCount: 0
        });
      }
    }

    // 모듈별 이슈 카운트
    for (const result of structureResults) {
      const parts = result.filePath.split(/[/\\]/);
      const moduleName = parts.length > 1 ? parts[0] : 'root';
      
      if (moduleMap.has(moduleName)) {
        const mod = moduleMap.get(moduleName)!;
        mod.issueCount++;
      }
    }

    const modules = Array.from(moduleMap.values());

    return NextResponse.json({
      modules,
      structureIssues: structureResults.length
    });

  } catch (error) {
    console.error('Failed to get project architecture:', error);
    return NextResponse.json(
      { error: 'Failed to get architecture' },
      { status: 500 }
    );
  }
}

// 모듈 타입 추론
function inferModuleType(moduleName: string): string {
  const name = moduleName.toLowerCase();
  
  if (name.includes('api') || name.includes('route')) return 'api';
  if (name.includes('service') || name.includes('lib')) return 'service';
  if (name.includes('component') || name.includes('ui')) return 'component';
  if (name.includes('core') || name.includes('common')) return 'core';
  if (name.includes('util') || name.includes('helper')) return 'util';
  if (name.includes('model') || name.includes('type')) return 'model';
  if (name.includes('app')) return 'core';
  
  return 'module';
}
