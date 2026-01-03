/**
 * 분석 실행 상세 조회 API
 * 
 * GET /api/projects/[id]/history/[runId] - 특정 실행 상세
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id: projectId, runId } = await params;

    const execution = await prisma.analysisExecute.findFirst({
      where: { id: runId, projectId },
      include: {
        project: {
          select: { id: true, name: true, path: true }
        },
        snapshot: true,
        metrics: true,
        tasks: true,
        normalizedResults: {
          take: 100,
          orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }]
        },
        _count: {
          select: {
            normalizedResults: true,
            tasks: true,
          }
        }
      }
    });

    if (!execution) {
      return NextResponse.json(
        { error: '분석 실행을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이전/다음 실행 찾기
    const [prevExec, nextExec] = await Promise.all([
      prisma.analysisExecute.findFirst({
        where: {
          projectId,
          startedAt: { lt: execution.startedAt || new Date() }
        },
        orderBy: { startedAt: 'desc' },
        select: { id: true, startedAt: true }
      }),
      prisma.analysisExecute.findFirst({
        where: {
          projectId,
          startedAt: { gt: execution.startedAt || new Date() }
        },
        orderBy: { startedAt: 'asc' },
        select: { id: true, startedAt: true }
      })
    ]);

    // 심각도별 통계
    const severityStats = execution.normalizedResults.reduce((acc: Record<string, number>, r: any) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {});

    // 카테고리별 통계
    const categoryStats = execution.normalizedResults.reduce((acc: Record<string, number>, r: any) => {
      acc[r.mainCategory] = (acc[r.mainCategory] || 0) + 1;
      return acc;
    }, {});

    // 파일별 통계
    const fileStats = execution.normalizedResults.reduce((acc: Record<string, number>, r: any) => {
      acc[r.filePath] = (acc[r.filePath] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      execution: {
        id: execution.id,
        projectId: execution.projectId,
        project: execution.project,
        status: execution.status,
        score: execution.score,
        startedAt: execution.startedAt?.toISOString(),
        completedAt: execution.completedAt?.toISOString(),
        
        // Git 정보
        gitBranch: execution.gitBranch,
        gitCommit: execution.gitCommit,
        gitTag: execution.gitTag,
        gitMessage: execution.gitMessage,
        
        // 환경
        environment: execution.environment,
        analysisConfig: execution.analysisConfig ? JSON.parse(execution.analysisConfig) : null,
        
        // 통계
        totalIssues: execution._count.normalizedResults,
        criticalCount: execution.criticalCount || severityStats['CRITICAL'] || 0,
        highCount: execution.highCount || severityStats['HIGH'] || 0,
        mediumCount: execution.mediumCount || severityStats['MEDIUM'] || 0,
        lowCount: execution.lowCount || severityStats['LOW'] || 0,
        
        // 스냅샷
        snapshot: execution.snapshot ? {
          id: execution.snapshot.id,
          snapshotHash: execution.snapshot.snapshotHash,
          fileCount: execution.snapshot.fileCount,
          totalLines: execution.snapshot.totalLines,
          languageStats: execution.snapshot.languageStats ? JSON.parse(execution.snapshot.languageStats) : null,
        } : null,
        
        // 메트릭
        metrics: execution.metrics.map((m: any) => ({
          id: m.id,
          type: m.metricType,
          name: m.metricName,
          value: m.value,
          unit: m.unit,
          target: m.target,
        })),
        
        // 태스크
        taskCount: execution._count.tasks,
        tasks: execution.tasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
        })),
      },
      
      // 이슈 (상위 100개)
      issues: execution.normalizedResults.map((r: any) => ({
        id: r.id,
        filePath: r.filePath,
        lineStart: r.lineStart,
        lineEnd: r.lineEnd,
        severity: r.severity,
        mainCategory: r.mainCategory,
        subCategory: r.subCategory,
        ruleId: r.ruleId,
        message: r.message,
        suggestion: r.suggestion,
      })),
      
      // 통계
      stats: {
        bySeverity: severityStats,
        byCategory: categoryStats,
        byFile: Object.entries(fileStats)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 10)
          .map(([file, count]) => ({ file, count })),
      },
      
      // 네비게이션
      navigation: {
        prev: prevExec ? { id: prevExec.id, date: prevExec.startedAt?.toISOString() } : null,
        next: nextExec ? { id: nextExec.id, date: nextExec.startedAt?.toISOString() } : null,
      }
    });

  } catch (error) {
    console.error('[History Detail] GET Error:', error);
    return NextResponse.json(
      { error: '상세 조회 실패' },
      { status: 500 }
    );
  }
}
