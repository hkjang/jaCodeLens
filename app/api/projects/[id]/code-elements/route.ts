/**
 * 프로젝트별 코드 요소 API
 * 
 * GET - 코드 요소 목록 조회
 * POST - 코드 요소 스캔/분석
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { codeElementService } from '@/lib/code-element-service';

// GET: 코드 요소 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);

    const elementType = searchParams.get('elementType');
    const analyzed = searchParams.get('analyzed');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 프로젝트 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, path: true }
    });

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    // 검색 또는 조회
    let elements;
    if (search) {
      elements = await codeElementService.searchElements(projectId, search, limit);
    } else {
      elements = await codeElementService.getElementsByProject(projectId, {
        elementType: elementType || undefined,
        analyzed: analyzed ? analyzed === 'true' : undefined,
        limit,
        offset,
      });
    }

    // 통계
    const stats = await codeElementService.getProjectStats(projectId);

    // 총 개수
    const total = await prisma.codeElement.count({
      where: { projectId }
    });

    return NextResponse.json({
      project,
      elements: elements.map((e: any) => ({
        id: e.id,
        filePath: e.filePath,
        fileName: e.fileName,
        language: e.language,
        elementType: e.elementType,
        name: e.name,
        signature: e.signature,
        lineStart: e.lineStart,
        lineEnd: e.lineEnd,
        parentName: e.parentName,
        exportType: e.exportType,
        isAsync: e.isAsync,
        isExported: e.isExported,
        aiSummary: e.aiSummary,
        aiAnalysis: e.aiAnalysis ? JSON.parse(e.aiAnalysis) : null,
        analyzedAt: e.analyzedAt?.toISOString(),
        createdAt: e.createdAt?.toISOString(),
      })),
      stats,
      pagination: { total, limit, offset }
    });

  } catch (error) {
    console.error('[Project CodeElements] GET Error:', error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}

// POST: 다양한 액션 처리
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { action, elementId, limit } = body;

    // 프로젝트 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, path: true }
    });

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    switch (action) {
      case 'analyze-single': {
        // 단일 요소 분석
        if (!elementId) {
          return NextResponse.json({ error: 'elementId 필요' }, { status: 400 });
        }
        const result = await codeElementService.analyzeElement(elementId);
        return NextResponse.json({ success: true, result });
      }

      case 'analyze-batch': {
        // 배치 분석
        const batchResult = await codeElementService.analyzeElements(projectId, limit || 5);
        return NextResponse.json({ success: true, ...batchResult });
      }

      case 'generate-summary': {
        // 프로젝트 요약 생성
        const summary = await codeElementService.generateProjectSummary(projectId);
        return NextResponse.json({ success: true, summary });
      }

      default:
        return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 });
    }

  } catch (error) {
    console.error('[Project CodeElements] POST Error:', error);
    return NextResponse.json({ error: '액션 실패' }, { status: 500 });
  }
}
