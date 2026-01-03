/**
 * 프로젝트 분석 트렌드 API
 * 
 * GET /api/projects/[id]/trends - 프로젝트 분석 추이
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);

    const days = parseInt(searchParams.get('days') || '30');
    const branch = searchParams.get('branch');

    // 기간 계산
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 쿼리 조건
    const where: Record<string, unknown> = {
      projectId,
      status: 'COMPLETED',
      startedAt: { gte: startDate }
    };

    if (branch) {
      where.gitBranch = branch;
    }

    // 완료된 분석 조회
    const executions = await prisma.analysisExecute.findMany({
      where,
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        startedAt: true,
        score: true,
        totalIssues: true,
        criticalCount: true,
        highCount: true,
        mediumCount: true,
        lowCount: true,
        gitBranch: true,
        gitCommit: true,
        gitTag: true,
      }
    });

    // 일별 집계
    const dailyTrends: Record<string, any> = {};
    
    for (const exec of executions) {
      const dateKey = exec.startedAt?.toISOString().split('T')[0] || '';
      
      if (!dailyTrends[dateKey]) {
        dailyTrends[dateKey] = {
          date: dateKey,
          executions: [],
          avgScore: 0,
          totalIssues: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
        };
      }
      
      dailyTrends[dateKey].executions.push(exec);
      dailyTrends[dateKey].totalIssues += exec.totalIssues || 0;
      dailyTrends[dateKey].criticalCount += exec.criticalCount || 0;
      dailyTrends[dateKey].highCount += exec.highCount || 0;
      dailyTrends[dateKey].mediumCount += exec.mediumCount || 0;
      dailyTrends[dateKey].lowCount += exec.lowCount || 0;
    }

    // 평균 점수 계산
    for (const day of Object.values(dailyTrends)) {
      const scores = day.executions.map((e: any) => e.score).filter(Boolean);
      day.avgScore = scores.length > 0 
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length 
        : 0;
      day.executionCount = day.executions.length;
      delete day.executions;
    }

    const trendData = Object.values(dailyTrends).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );

    // 전체 통계
    const latestExec = executions[executions.length - 1];
    const firstExec = executions[0];

    const overallStats = {
      totalExecutions: executions.length,
      currentScore: latestExec?.score || 0,
      scoreChange: latestExec && firstExec 
        ? (latestExec.score || 0) - (firstExec.score || 0)
        : 0,
      issuesChange: latestExec && firstExec
        ? (latestExec.totalIssues || 0) - (firstExec.totalIssues || 0)
        : 0,
      latestExecution: latestExec ? {
        id: latestExec.id,
        date: latestExec.startedAt?.toISOString(),
        score: latestExec.score,
        totalIssues: latestExec.totalIssues,
      } : null,
    };

    // 카테고리별 추이 (최근 5개 실행)
    const recentExecutions = executions.slice(-5);
    const categoryTrends = recentExecutions.map((e: any) => ({
      date: e.startedAt?.toISOString().split('T')[0],
      critical: e.criticalCount || 0,
      high: e.highCount || 0,
      medium: e.mediumCount || 0,
      low: e.lowCount || 0,
    }));

    return NextResponse.json({
      trends: trendData,
      categoryTrends,
      stats: overallStats,
      
      summary: {
        period: `${days}일`,
        improvement: overallStats.issuesChange < 0,
        trend: overallStats.issuesChange < 0 
          ? '개선 중' 
          : overallStats.issuesChange > 0 
          ? '악화 중' 
          : '유지'
      }
    });

  } catch (error) {
    console.error('[Project Trends] GET Error:', error);
    return NextResponse.json(
      { error: '트렌드 조회 실패' },
      { status: 500 }
    );
  }
}
