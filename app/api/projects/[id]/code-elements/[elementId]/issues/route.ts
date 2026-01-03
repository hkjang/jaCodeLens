/**
 * 코드 요소별 이슈 조회 API
 * 
 * GET - 특정 코드 요소의 파일/라인 범위에 해당하는 이슈 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; elementId: string }> }
) {
  try {
    const { id: projectId, elementId } = await params;

    // 코드 요소 조회
    const element = await prisma.codeElement.findUnique({
      where: { id: elementId }
    });

    if (!element) {
      return NextResponse.json({ error: '코드 요소를 찾을 수 없습니다' }, { status: 404 });
    }

    // 해당 프로젝트의 최근 분석에서 해당 파일의 이슈 조회
    const latestExecution = await prisma.analysisExecute.findFirst({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
      select: { id: true }
    });

    if (!latestExecution) {
      return NextResponse.json({
        element: {
          id: element.id,
          name: element.name,
          filePath: element.filePath,
        },
        issues: [],
        count: 0
      });
    }

    // 해당 파일의 이슈 조회
    const issues = await prisma.analysisResult.findMany({
      where: {
        executeId: latestExecution.id,
        filePath: { contains: element.filePath },
      },
      select: {
        id: true,
        filePath: true,
        lineNumber: true,
        severity: true,
        message: true,
        suggestion: true,
        category: true,
        createdAt: true,
      },
      orderBy: { severity: 'asc' },
      take: 20
    });

    return NextResponse.json({
      element: {
        id: element.id,
        name: element.name,
        filePath: element.filePath,
        lineStart: element.lineStart,
        lineEnd: element.lineEnd,
      },
      issues: issues.map(i => ({
        ...i,
        createdAt: i.createdAt.toISOString()
      })),
      count: issues.length
    });

  } catch (error) {
    console.error('[Element Issues] GET Error:', error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}
