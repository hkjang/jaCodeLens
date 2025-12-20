import { NextRequest, NextResponse } from 'next/server';
import { baselineService, selfProjectService } from '@/lib/self-analysis';

/**
 * GET /api/self-analysis/baseline
 * 기준선 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const selfProject = await selfProjectService.getSelfProject();
    
    if (!selfProject) {
      return NextResponse.json(
        { error: 'Self project not initialized' },
        { status: 404 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    
    if (activeOnly) {
      const baseline = await baselineService.getActiveBaseline(selfProject.id);
      return NextResponse.json({ baseline });
    }
    
    const baselines = await baselineService.getAllBaselines(selfProject.id);
    return NextResponse.json({ baselines });
  } catch (error) {
    console.error('[API] Error fetching baselines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch baselines' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/self-analysis/baseline
 * 새 기준선 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId } = body;
    
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
    
    const baseline = await baselineService.createBaseline(selfProject.id, executionId);
    
    return NextResponse.json({
      success: true,
      baseline: {
        id: baseline.id,
        version: baseline.version,
        status: baseline.status,
        scores: {
          complexity: baseline.complexityScore,
          debt: baseline.debtScore,
          risk: baseline.riskScore,
          quality: baseline.qualityScore,
          security: baseline.securityScore,
          coverage: baseline.coverageScore
        }
      }
    });
  } catch (error) {
    console.error('[API] Error creating baseline:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create baseline' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/self-analysis/baseline
 * 기준선 잠금/승인
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, actorId } = body;
    
    if (!id || !action) {
      return NextResponse.json(
        { error: 'id and action are required' },
        { status: 400 }
      );
    }
    
    let baseline;
    
    switch (action) {
      case 'lock':
        baseline = await baselineService.lockBaseline(id, actorId || 'ADMIN');
        break;
      case 'approve':
        baseline = await baselineService.approveBaseline(id, actorId || 'ADMIN');
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "lock" or "approve"' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      baseline
    });
  } catch (error) {
    console.error('[API] Error updating baseline:', error);
    return NextResponse.json(
      { error: 'Failed to update baseline' },
      { status: 500 }
    );
  }
}
