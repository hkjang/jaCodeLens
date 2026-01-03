import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/analysis/start - Start a new analysis
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, options } = body;

    if (!projectId) {
      return NextResponse.json(
        { message: '프로젝트 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { message: '프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Create new analysis execution
    const execution = await prisma.analysisExecute.create({
      data: {
        projectId,
        status: 'PENDING',
        environment: 'PRODUCTION',
        startedAt: new Date()
      }
    });

    // Create pipeline stage executions
    const stages = [
      'SOURCE_COLLECT',
      'LANGUAGE_DETECT',
      'AST_PARSE',
      'STATIC_ANALYZE',
      'RULE_PARSE',
      'CATEGORIZE',
      'NORMALIZE',
      'AI_ENHANCE'
    ];

    for (const stage of stages) {
      await prisma.pipelineStageExecution.create({
        data: {
          executeId: execution.id,
          stage,
          status: 'pending',
          progress: 0
        }
      });
    }

    // In a real implementation, this would trigger the actual pipeline
    // For now, we just create the execution record
    console.log(`[Analysis] Started execution ${execution.id} for project ${project.name}`);

    return NextResponse.json({
      executionId: execution.id,
      status: 'PENDING',
      message: '분석이 시작되었습니다'
    });
  } catch (error) {
    console.error('Failed to start analysis:', error);
    return NextResponse.json(
      { message: '분석 시작에 실패했습니다' },
      { status: 500 }
    );
  }
}
