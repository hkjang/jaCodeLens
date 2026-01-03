/**
 * 프로젝트 분석 비교 API
 * 
 * GET /api/projects/[id]/compare - 두 분석 실행 비교
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface IssueComparison {
  added: any[];
  removed: any[];
  unchanged: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);

    const baseId = searchParams.get('base');
    const targetId = searchParams.get('target');

    if (!baseId || !targetId) {
      return NextResponse.json(
        { error: 'base와 target 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    // 두 실행 조회
    const [baseExec, targetExec] = await Promise.all([
      prisma.analysisExecute.findFirst({
        where: { id: baseId, projectId },
        include: {
          normalizedResults: true,
          snapshot: true,
          _count: { select: { normalizedResults: true } }
        }
      }),
      prisma.analysisExecute.findFirst({
        where: { id: targetId, projectId },
        include: {
          normalizedResults: true,
          snapshot: true,
          _count: { select: { normalizedResults: true } }
        }
      })
    ]);

    if (!baseExec || !targetExec) {
      return NextResponse.json(
        { error: '분석 실행을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이슈 핑거프린트 생성 (파일+라인+룰ID 조합)
    const createFingerprint = (issue: any) => 
      `${issue.filePath}:${issue.lineStart}:${issue.ruleId}`;

    const baseFingerprints = new Map(
      baseExec.normalizedResults.map((r: any) => [createFingerprint(r), r])
    );
    const targetFingerprints = new Map(
      targetExec.normalizedResults.map((r: any) => [createFingerprint(r), r])
    );

    // 비교 분석
    const added: any[] = [];
    const removed: any[] = [];
    let unchanged = 0;

    // 타겟에서 새로 추가된 이슈
    for (const [fp, issue] of targetFingerprints) {
      if (!baseFingerprints.has(fp)) {
        added.push({
          ...issue,
          createdAt: issue.createdAt?.toISOString?.() || issue.createdAt
        });
      } else {
        unchanged++;
      }
    }

    // 베이스에서 제거된 이슈
    for (const [fp, issue] of baseFingerprints) {
      if (!targetFingerprints.has(fp)) {
        removed.push({
          ...issue,
          createdAt: issue.createdAt?.toISOString?.() || issue.createdAt
        });
      }
    }

    // 점수 변화
    const scoreChange = (targetExec.score || 0) - (baseExec.score || 0);

    // 심각도별 변화
    const severityChange = {
      CRITICAL: (targetExec.criticalCount || 0) - (baseExec.criticalCount || 0),
      HIGH: (targetExec.highCount || 0) - (baseExec.highCount || 0),
      MEDIUM: (targetExec.mediumCount || 0) - (baseExec.mediumCount || 0),
      LOW: (targetExec.lowCount || 0) - (baseExec.lowCount || 0),
    };

    return NextResponse.json({
      base: {
        id: baseExec.id,
        startedAt: baseExec.startedAt?.toISOString(),
        gitBranch: baseExec.gitBranch,
        gitCommit: baseExec.gitCommit,
        score: baseExec.score,
        totalIssues: baseExec._count.normalizedResults,
      },
      target: {
        id: targetExec.id,
        startedAt: targetExec.startedAt?.toISOString(),
        gitBranch: targetExec.gitBranch,
        gitCommit: targetExec.gitCommit,
        score: targetExec.score,
        totalIssues: targetExec._count.normalizedResults,
      },
      
      comparison: {
        added: added.slice(0, 50), // 최대 50개
        removed: removed.slice(0, 50),
        addedCount: added.length,
        removedCount: removed.length,
        unchangedCount: unchanged,
      },
      
      changes: {
        scoreChange,
        severityChange,
        issuesDelta: added.length - removed.length,
        improvement: removed.length > added.length,
      },
      
      summary: {
        text: added.length > removed.length
          ? `${added.length - removed.length}개 이슈 증가`
          : added.length < removed.length
          ? `${removed.length - added.length}개 이슈 감소 (개선)`
          : '이슈 수 변화 없음'
      }
    });

  } catch (error) {
    console.error('[Project Compare] GET Error:', error);
    return NextResponse.json(
      { error: '비교 분석 실패' },
      { status: 500 }
    );
  }
}
