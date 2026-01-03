/**
 * 프로젝트 분석 이력 API
 * 
 * GET /api/projects/[id]/history - 분석 이력 목록
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface HistoryFilters {
  branch?: string;
  status?: string;
  tag?: string;
  fromDate?: string;
  toDate?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);

    // 페이지네이션
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 필터
    const branch = searchParams.get('branch');
    const status = searchParams.get('status');
    const tag = searchParams.get('tag');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // 쿼리 조건
    const where: Record<string, unknown> = { projectId };

    if (branch) {
      where.gitBranch = branch;
    }

    if (status) {
      where.status = status;
    }

    if (tag) {
      where.gitTag = tag;
    }

    if (fromDate) {
      where.startedAt = { ...(where.startedAt as object || {}), gte: new Date(fromDate) };
    }

    if (toDate) {
      where.startedAt = { ...(where.startedAt as object || {}), lte: new Date(toDate) };
    }

    // 총 개수
    const total = await prisma.analysisExecute.count({ where });

    // 이력 조회
    const executions = await prisma.analysisExecute.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { startedAt: 'desc' },
      include: {
        snapshot: true,
        _count: {
          select: {
            normalizedResults: true,
            tasks: true,
          }
        }
      }
    });

    // 프로젝트 정보
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, path: true }
    });

    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 브랜치 목록 (필터용)
    const branches = await prisma.analysisExecute.findMany({
      where: { projectId, gitBranch: { not: null } },
      select: { gitBranch: true },
      distinct: ['gitBranch']
    });

    // 태그 목록 (필터용)
    const tags = await prisma.analysisExecute.findMany({
      where: { projectId, gitTag: { not: null } },
      select: { gitTag: true },
      distinct: ['gitTag']
    });

    return NextResponse.json({
      project,
      history: executions.map((e: any) => ({
        id: e.id,
        status: e.status,
        score: e.score,
        startedAt: e.startedAt?.toISOString(),
        completedAt: e.completedAt?.toISOString(),
        
        // Git 정보
        gitBranch: e.gitBranch,
        gitCommit: e.gitCommit,
        gitTag: e.gitTag,
        gitMessage: e.gitMessage,
        
        // 통계
        totalIssues: e.totalIssues || e._count.normalizedResults,
        criticalCount: e.criticalCount,
        highCount: e.highCount,
        mediumCount: e.mediumCount,
        lowCount: e.lowCount,
        
        // 스냅샷
        hasSnapshot: !!e.snapshot,
        fileCount: e.snapshot?.fileCount,
        
        // 태스크
        taskCount: e._count.tasks,
        
        // 환경
        environment: e.environment,
      })),
      
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      
      filters: {
        branches: branches.map((b: any) => b.gitBranch).filter(Boolean),
        tags: tags.map((t: any) => t.gitTag).filter(Boolean),
        statuses: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
      }
    });

  } catch (error) {
    console.error('[Project History] GET Error:', error);
    return NextResponse.json(
      { error: '이력 조회 실패' },
      { status: 500 }
    );
  }
}
