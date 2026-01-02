'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ executionId: string }>;
}

/**
 * GET /api/self-analysis/results/:executionId
 * 특정 분석 실행의 모든 결과 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { executionId } = await params;
    
    const results = await prisma.analysisResult.findMany({
      where: { executeId: executionId },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'asc' }
      ]
    });
    
    // Get execution info
    const execution = await prisma.analysisExecute.findUnique({
      where: { id: executionId },
      include: {
        agentExecutions: {
          select: {
            agentName: true,
            status: true,
            durationMs: true,
            tokensUsed: true
          }
        }
      }
    });
    
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }
    
    // Group results by category
    const byCategory = results.reduce((acc, r) => {
      const cat = r.category || 'OTHER';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(r);
      return acc;
    }, {} as Record<string, typeof results>);
    
    // Summary stats
    const stats = {
      total: results.length,
      bySeverity: {
        CRITICAL: results.filter(r => r.severity === 'CRITICAL').length,
        HIGH: results.filter(r => r.severity === 'HIGH').length,
        MEDIUM: results.filter(r => r.severity === 'MEDIUM').length,
        LOW: results.filter(r => r.severity === 'LOW').length,
        INFO: results.filter(r => r.severity === 'INFO').length,
      },
      byStatus: {
        OPEN: results.filter(r => r.reviewStatus === 'OPEN').length,
        FIXED: results.filter(r => r.reviewStatus === 'FIXED').length,
        FALSE_POSITIVE: results.filter(r => r.reviewStatus === 'FALSE_POSITIVE').length,
      }
    };
    
    return NextResponse.json({
      execution: {
        id: execution.id,
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        agents: execution.agentExecutions
      },
      results,
      byCategory,
      stats
    });
    
  } catch (error) {
    console.error('[API] Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}
