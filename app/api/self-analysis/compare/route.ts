import { NextRequest, NextResponse } from 'next/server';
import { baselineService, selfProjectService } from '@/lib/self-analysis';

/**
 * POST /api/self-analysis/compare
 * 프로젝트와 기준선 비교
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, baselineId } = body;
    
    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId is required' },
        { status: 400 }
      );
    }
    
    const selfProject = await selfProjectService.getSelfProject();
    
    if (!selfProject) {
      return NextResponse.json(
        { error: 'Self project not initialized' },
        { status: 404 }
      );
    }
    
    // baselineId가 없으면 현재 활성 기준선 사용
    let targetBaselineId = baselineId;
    if (!targetBaselineId) {
      const activeBaseline = await baselineService.getActiveBaseline(selfProject.id);
      if (!activeBaseline) {
        return NextResponse.json(
          { error: 'No active baseline found' },
          { status: 404 }
        );
      }
      targetBaselineId = activeBaseline.id;
    }
    
    const comparison = await baselineService.compareWithBaseline(targetBaselineId, executionId);
    
    return NextResponse.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('[API] Error comparing with baseline:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compare with baseline' },
      { status: 500 }
    );
  }
}
