import { NextRequest, NextResponse } from 'next/server';
import { automationService, selfProjectService } from '@/lib/self-analysis';

/**
 * GET /api/self-analysis/backlog
 * 백로그 아이템 조회
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
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;
    
    const items = await automationService.getBacklogItems(selfProject.id, {
      status,
      category,
      priority
    });
    
    // 통계 계산
    const stats = {
      total: items.length,
      byStatus: {
        open: items.filter(i => i.status === 'OPEN').length,
        inProgress: items.filter(i => i.status === 'IN_PROGRESS').length,
        resolved: items.filter(i => i.status === 'RESOLVED').length,
        wontFix: items.filter(i => i.status === 'WONT_FIX').length
      },
      byPriority: {
        critical: items.filter(i => i.priority === 'CRITICAL').length,
        high: items.filter(i => i.priority === 'HIGH').length,
        medium: items.filter(i => i.priority === 'MEDIUM').length,
        low: items.filter(i => i.priority === 'LOW').length
      },
      estimatedHours: items.reduce((sum, i) => sum + (i.estimatedHours || 0), 0)
    };
    
    return NextResponse.json({ items, stats });
  } catch (error) {
    console.error('[API] Error fetching backlog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backlog' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/self-analysis/backlog
 * 분석 결과에서 백로그 자동 생성
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
    
    const items = await automationService.generateBacklogItems(selfProject.id, executionId);
    
    return NextResponse.json({
      success: true,
      createdCount: items.length,
      items
    });
  } catch (error) {
    console.error('[API] Error generating backlog:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate backlog' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/self-analysis/backlog
 * 백로그 아이템 상태 업데이트
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, assignedTo } = body;
    
    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' },
        { status: 400 }
      );
    }
    
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Use one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    const item = await automationService.updateBacklogStatus(id, status, assignedTo);
    
    return NextResponse.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('[API] Error updating backlog item:', error);
    return NextResponse.json(
      { error: 'Failed to update backlog item' },
      { status: 500 }
    );
  }
}
