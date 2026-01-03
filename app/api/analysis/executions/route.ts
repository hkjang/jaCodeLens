import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/analysis/executions - List recent executions with pipeline stages
export async function GET() {
  try {
    const executions = await prisma.analysisExecute.findMany({
      take: 10,
      orderBy: { startedAt: 'desc' },
      include: {
        project: true
      }
    });

    const executionsWithDetails = await Promise.all(
      executions.map(async (exec) => {
        // Get pipeline stages
        const stages = await prisma.pipelineStageExecution.findMany({
          where: { executeId: exec.id },
          orderBy: { createdAt: 'asc' }
        });

        // Get result count
        const resultCount = await prisma.normalizedAnalysisResult.count({
          where: { executeId: exec.id }
        });

        return {
          id: exec.id,
          projectId: exec.projectId,
          projectName: exec.project.name,
          status: exec.status,
          score: exec.score,
          startedAt: exec.startedAt?.toISOString(),
          completedAt: exec.completedAt?.toISOString() || null,
          pipelineStages: stages.map(s => ({
            stage: s.stage,
            status: s.status,
            progress: s.progress,
            message: s.message,
            duration: s.startedAt && s.completedAt 
              ? new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()
              : undefined
          })),
          resultCount
        };
      })
    );

    return NextResponse.json(executionsWithDetails);
  } catch (error) {
    console.error('Failed to fetch executions:', error);
    return NextResponse.json([], { status: 200 });
  }
}
