/**
 * 분석 시작 API
 * 
 * 실제 8단계 파이프라인을 실행합니다.
 * 
 * POST /api/analysis/start
 * Body: { projectId, options }
 * 
 * 흐름:
 * 1. 프로젝트 검증
 * 2. 실행 레코드 생성
 * 3. 파이프라인 스테이지 레코드 생성
 * 4. 실제 파이프라인 비동기 실행 시작
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getPipelineService } from '@/lib/services/pipeline-execution-service';
import type { AnalysisOptions } from '@/lib/services/pipeline-execution-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, options = {}, forceRestart = false } = body as { 
      projectId: string; 
      options?: AnalysisOptions;
      forceRestart?: boolean;
    };

    // 1. 프로젝트 ID 검증
    if (!projectId) {
      return NextResponse.json(
        { message: '프로젝트 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 2. 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { message: '프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 3. 이미 실행 중인 분석이 있는지 확인
    const runningExecution = await prisma.analysisExecute.findFirst({
      where: {
        projectId,
        status: { in: ['PENDING', 'RUNNING'] }
      }
    });

    if (runningExecution) {
      // 10분 이상 지난 오래된 실행은 자동으로 FAILED 처리
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const isStale = runningExecution.startedAt && runningExecution.startedAt < tenMinutesAgo;

      if (isStale) {
        // 오래된 실행 자동 정리
        await prisma.analysisExecute.update({
          where: { id: runningExecution.id },
          data: { status: 'FAILED', completedAt: new Date() }
        });
        console.log(`[Analysis] Marked stale execution ${runningExecution.id} as FAILED`);
        // 계속 진행하여 새 분석 시작
      } else if (forceRestart) {
        // forceRestart 옵션이 있으면 기존 실행을 취소
        await prisma.analysisExecute.update({
          where: { id: runningExecution.id },
          data: { status: 'CANCELLED', completedAt: new Date() }
        });
        console.log(`[Analysis] Cancelled existing execution ${runningExecution.id} due to forceRestart`);
        // 계속 진행하여 새 분석 시작
      } else {
        // 실행 중인 분석이 있고 forceRestart가 없으면 409 반환
        return NextResponse.json(
          { 
            message: '이미 실행 중인 분석이 있습니다. forceRestart: true 옵션으로 강제 시작할 수 있습니다.',
            executionId: runningExecution.id,
            status: runningExecution.status
          },
          { status: 409 }
        );
      }
    }

    // 4. 분석 실행 레코드 생성
    const execution = await prisma.analysisExecute.create({
      data: {
        projectId,
        status: 'PENDING',
        environment: 'PRODUCTION',
        startedAt: new Date(),
      }
    });

    // 5. 8단계 파이프라인 스테이지 레코드 생성
    const pipelineStages = [
      { stage: 'SOURCE_COLLECT', name: '소스 수집' },
      { stage: 'LANGUAGE_DETECT', name: '언어 감지' },
      { stage: 'AST_PARSE', name: 'AST 파싱' },
      { stage: 'STATIC_ANALYZE', name: '정적 분석' },
      { stage: 'RULE_PARSE', name: '룰 분석' },
      { stage: 'CATEGORIZE', name: '분류' },
      { stage: 'NORMALIZE', name: '정규화' },
      { stage: 'AI_ENHANCE', name: 'AI 보강' },
    ];

    for (const { stage, name } of pipelineStages) {
      await prisma.pipelineStageExecution.create({
        data: {
          executeId: execution.id,
          stage,
          status: 'pending',
          progress: 0,
          message: `${name} 대기 중`,
        }
      });
    }

    console.log(`[Analysis] Created execution ${execution.id} for project ${project.name}`);

    // 6. 실제 파이프라인 실행 시작 (비동기)
    const pipelineService = getPipelineService();
    const startResult = await pipelineService.startAnalysis(
      projectId,
      execution.id,
      {
        enableAI: options.enableAI ?? false,
        deepScan: options.deepScan ?? false,
        includeTests: options.includeTests ?? true,
        mode: options.mode ?? 'immediate',
        scheduledTime: options.scheduledTime,
      }
    );

    if (!startResult.success) {
      // 실패 시 상태 업데이트
      await prisma.analysisExecute.update({
        where: { id: execution.id },
        data: { status: 'FAILED' }
      });

      return NextResponse.json(
        { 
          message: startResult.message,
          executionId: execution.id,
          status: 'FAILED'
        },
        { status: 500 }
      );
    }

    console.log(`[Analysis] Pipeline started for execution ${execution.id}`);

    // 7. 성공 응답
    return NextResponse.json({
      executionId: execution.id,
      status: 'RUNNING',
      message: '분석이 시작되었습니다',
      project: {
        id: project.id,
        name: project.name,
      },
      stages: pipelineStages.map(s => ({
        stage: s.stage,
        name: s.name,
        status: 'pending',
        progress: 0,
      })),
    });

  } catch (error) {
    console.error('[Analysis] Failed to start analysis:', error);
    return NextResponse.json(
      { message: '분석 시작에 실패했습니다' },
      { status: 500 }
    );
  }
}
