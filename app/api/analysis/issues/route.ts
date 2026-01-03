/**
 * 분석 이슈 API
 * 
 * GET /api/analysis/issues - 이슈 목록 조회 (페이지네이션)
 * PATCH /api/analysis/issues - 이슈 상태 업데이트
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface IssueFilter {
  projectId?: string;
  executeId?: string;
  severity?: string;
  category?: string;
  filePath?: string;
  resolved?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 페이지네이션
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // 필터
    const projectId = searchParams.get('projectId');
    const executeId = searchParams.get('executeId');
    const severity = searchParams.get('severity');
    const category = searchParams.get('category');
    const filePath = searchParams.get('filePath');
    const search = searchParams.get('search');
    
    // 정렬
    const sortField = searchParams.get('sortField') || 'severity';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // 쿼리 조건 빌드
    const where: Record<string, unknown> = {};
    
    if (executeId) {
      where.executeId = executeId;
    }
    
    if (projectId) {
      where.execute = { projectId };
    }
    
    if (severity) {
      where.severity = severity;
    }
    
    if (category) {
      where.mainCategory = category;
    }
    
    if (filePath) {
      where.filePath = { contains: filePath };
    }

    // 검색 조건
    if (search && search.trim()) {
      where.OR = [
        { message: { contains: search } },
        { filePath: { contains: search } },
        { suggestion: { contains: search } },
        { ruleId: { contains: search } },
      ];
    }

    // 정렬 조건 빌드
    const orderBy: Record<string, string>[] = [];
    
    if (sortField === 'severity') {
      orderBy.push({ severity: sortOrder });
    } else if (sortField === 'category') {
      orderBy.push({ mainCategory: sortOrder });
    } else if (sortField === 'file') {
      orderBy.push({ filePath: sortOrder });
    } else if (sortField === 'date') {
      orderBy.push({ createdAt: sortOrder === 'asc' ? 'asc' : 'desc' });
    } else {
      orderBy.push({ severity: 'asc' });
    }
    orderBy.push({ createdAt: 'desc' });

    // 총 개수
    const total = await prisma.normalizedAnalysisResult.count({ where });

    // 이슈 목록
    const issues = await prisma.normalizedAnalysisResult.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy,
      include: {
        execute: {
          select: {
            id: true,
            projectId: true,
            project: { select: { name: true } }
          }
        }
      }
    });

    // 심각도 우선순위
    const severityOrder: Record<string, number> = {
      'CRITICAL': 0,
      'HIGH': 1,
      'MEDIUM': 2,
      'LOW': 3,
      'INFO': 4
    };

    const sortedIssues = issues.sort((a, b) => {
      const priorityA = severityOrder[a.severity] ?? 5;
      const priorityB = severityOrder[b.severity] ?? 5;
      return priorityA - priorityB;
    });

    return NextResponse.json({
      issues: sortedIssues.map(issue => ({
        id: issue.id,
        executeId: issue.executeId,
        projectId: issue.execute.projectId,
        projectName: issue.execute.project.name,
        filePath: issue.filePath,
        lineStart: issue.lineStart,
        lineEnd: issue.lineEnd,
        severity: issue.severity,
        mainCategory: issue.mainCategory,
        subCategory: issue.subCategory,
        ruleId: issue.ruleId,
        message: issue.message,
        suggestion: issue.suggestion,
        deterministic: issue.deterministic,
        aiExplanation: issue.aiExplanation,
        createdAt: issue.createdAt.toISOString(),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    });

  } catch (error) {
    console.error('[Analysis Issues] GET Error:', error);
    return NextResponse.json(
      { error: '이슈 목록 조회 실패' },
      { status: 500 }
    );
  }
}

// 벌크 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids 배열이 필요합니다' },
        { status: 400 }
      );
    }

    // 향후 확장: 상태 업데이트, 무시 처리 등
    // 현재는 삭제만 지원
    if (action === 'delete') {
      await prisma.normalizedAnalysisResult.deleteMany({
        where: { id: { in: ids } }
      });

      return NextResponse.json({
        success: true,
        message: `${ids.length}개 이슈가 삭제되었습니다`,
        deletedCount: ids.length,
      });
    }

    return NextResponse.json(
      { error: '지원하지 않는 액션입니다' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[Analysis Issues] PATCH Error:', error);
    return NextResponse.json(
      { error: '이슈 업데이트 실패' },
      { status: 500 }
    );
  }
}
