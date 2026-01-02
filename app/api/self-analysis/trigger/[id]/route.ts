'use server';

import { NextRequest, NextResponse } from 'next/server';
import { triggerService } from '@/lib/self-analysis';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/self-analysis/trigger/:id
 * 트리거 상세 조회 (진행 상황 포함)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const details = await triggerService.getTriggerDetails(id);
    
    if (!details) {
      return NextResponse.json(
        { error: 'Trigger not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(details);
  } catch (error) {
    console.error('[API] Error fetching trigger details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trigger details' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/self-analysis/trigger/:id
 * 트리거 취소/중지
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const trigger = await triggerService.cancelTrigger(id);
    
    return NextResponse.json({
      success: true,
      trigger: {
        id: trigger.id,
        status: trigger.status,
        completedAt: trigger.completedAt
      }
    });
  } catch (error) {
    console.error('[API] Error cancelling trigger:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel trigger' },
      { status: 500 }
    );
  }
}
