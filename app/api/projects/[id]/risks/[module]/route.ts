import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * 프로젝트 모듈별 이슈 API
 * 
 * GET /api/projects/[id]/risks/[module]
 * - 해당 프로젝트의 특정 모듈(폴더)의 세부 이슈 목록 반환
 */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; module: string }> }
) {
  const { id: projectId, module: moduleName } = await params;

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
      return NextResponse.json({ issues: [] });
    }

    // 해당 모듈의 이슈 조회
    const decodedModule = decodeURIComponent(moduleName);
    
    const results = await prisma.normalizedAnalysisResult.findMany({
      where: { 
        executeId: latestExecution.id,
        filePath: {
          startsWith: decodedModule === 'root' ? '' : decodedModule
        }
      },
      orderBy: [
        { severity: 'asc' }, // CRITICAL first (alphabetically)
        { filePath: 'asc' }
      ],
      take: 100 // 최대 100개
    });

    // root 모듈 처리: 최상위 파일만 필터링
    let filteredResults = results;
    if (decodedModule === 'root') {
      filteredResults = results.filter(r => !r.filePath.includes('/') && !r.filePath.includes('\\'));
    } else {
      // 해당 모듈로 시작하는 파일만 필터링
      filteredResults = results.filter(r => {
        const parts = r.filePath.split(/[/\\]/);
        return parts[0] === decodedModule;
      });
    }

    const issues = filteredResults.map(r => ({
      id: r.id,
      filePath: r.filePath,
      message: r.message,
      severity: r.severity,
      category: r.mainCategory,
      lineStart: r.lineStart,
      lineEnd: r.lineEnd,
      suggestion: r.suggestion
    }));

    return NextResponse.json({
      module: decodedModule,
      issues,
      total: issues.length
    });

  } catch (error) {
    console.error('Failed to get module issues:', error);
    return NextResponse.json(
      { error: 'Failed to get module issues' },
      { status: 500 }
    );
  }
}
