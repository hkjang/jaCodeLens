/**
 * 분석 통계 API
 * 
 * GET /api/analysis/stats - 분석 결과 통계
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface AnalysisStats {
  totalIssues: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  recentExecutions: {
    id: string;
    projectName: string;
    status: string;
    score: number | null;
    issueCount: number;
    createdAt: string;
  }[];
  trends: {
    date: string;
    issues: number;
    score: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '7');

    // 기본 필터
    const whereClause: Record<string, unknown> = {};
    if (projectId) {
      whereClause.execute = { projectId };
    }

    // 심각도별 통계
    const severityCounts = await prisma.normalizedAnalysisResult.groupBy({
      by: ['severity'],
      where: whereClause,
      _count: { id: true }
    });

    // 카테고리별 통계
    const categoryCounts = await prisma.normalizedAnalysisResult.groupBy({
      by: ['mainCategory'],
      where: whereClause,
      _count: { id: true }
    });

    // 총 이슈 수
    const totalIssues = await prisma.normalizedAnalysisResult.count({
      where: whereClause
    });

    // 최근 실행 목록
    const recentExecutions = await prisma.analysisExecute.findMany({
      where: projectId ? { projectId } : {},
      take: 10,
      orderBy: { startedAt: 'desc' },
      include: {
        project: { select: { name: true } },
        _count: { select: { normalizedResults: true } }
      }
    });

    // 트렌드 데이터 (일별 집계)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trendsData = await prisma.normalizedAnalysisResult.groupBy({
      by: ['createdAt'],
      where: {
        ...whereClause,
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });

    // 일별로 집계
    const trendsByDay = new Map<string, { issues: number; score: number }>();
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendsByDay.set(dateStr, { issues: 0, score: 80 });
    }

    for (const item of trendsData) {
      const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
      const existing = trendsByDay.get(dateStr);
      if (existing) {
        existing.issues += item._count.id;
      }
    }

    const response: AnalysisStats = {
      totalIssues,
      bySeverity: Object.fromEntries(
        severityCounts.map(s => [s.severity, s._count.id])
      ),
      byCategory: Object.fromEntries(
        categoryCounts.map(c => [c.mainCategory, c._count.id])
      ),
      recentExecutions: recentExecutions.map(e => ({
        id: e.id,
        projectName: e.project.name,
        status: e.status,
        score: e.score,
        issueCount: e._count.normalizedResults,
        createdAt: e.startedAt?.toISOString() || '',
      })),
      trends: Array.from(trendsByDay.entries())
        .map(([date, data]) => ({
          date,
          issues: data.issues,
          score: data.score,
        }))
        .reverse(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Analysis Stats] Error:', error);
    return NextResponse.json(
      { error: '통계 조회 실패' },
      { status: 500 }
    );
  }
}
