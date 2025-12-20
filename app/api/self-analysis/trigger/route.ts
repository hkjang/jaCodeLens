import { NextRequest, NextResponse } from 'next/server';
import { triggerService, selfProjectService } from '@/lib/self-analysis';

/**
 * GET /api/self-analysis/trigger
 * 트리거 히스토리 조회
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const pendingOnly = searchParams.get('pending') === 'true';
    
    if (pendingOnly) {
      const triggers = await triggerService.getPendingTriggers();
      return NextResponse.json({ triggers });
    }
    
    const triggers = await triggerService.getTriggerHistory(selfProject.id, limit);
    return NextResponse.json({ triggers });
  } catch (error) {
    console.error('[API] Error fetching triggers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch triggers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/self-analysis/trigger
 * 수동 트리거 실행
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, source, triggeredBy } = body;
    
    const selfProject = await selfProjectService.getSelfProject();
    
    if (!selfProject) {
      return NextResponse.json(
        { error: 'Self project not initialized' },
        { status: 404 }
      );
    }
    
    let trigger;
    
    switch (type) {
      case 'MANUAL':
        trigger = await triggerService.triggerManual(selfProject.id, triggeredBy || 'ADMIN');
        break;
      case 'GIT_PUSH':
        if (!source) {
          return NextResponse.json({ error: 'source (commit SHA) is required for GIT_PUSH' }, { status: 400 });
        }
        trigger = await triggerService.triggerOnPush(selfProject.id, source, triggeredBy);
        break;
      case 'GIT_MERGE':
        if (!source) {
          return NextResponse.json({ error: 'source (merge commit SHA) is required for GIT_MERGE' }, { status: 400 });
        }
        trigger = await triggerService.triggerOnMerge(selfProject.id, source, triggeredBy);
        break;
      case 'CI_BUILD':
        if (!source) {
          return NextResponse.json({ error: 'source (build ID) is required for CI_BUILD' }, { status: 400 });
        }
        trigger = await triggerService.triggerOnBuild(selfProject.id, source, triggeredBy);
        break;
      case 'DEPLOY':
        if (!source) {
          return NextResponse.json({ error: 'source (release version) is required for DEPLOY' }, { status: 400 });
        }
        trigger = await triggerService.triggerOnDeploy(selfProject.id, source, triggeredBy);
        break;
      case 'SCHEDULE':
        trigger = await triggerService.triggerScheduled(selfProject.id);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid trigger type. Use MANUAL, GIT_PUSH, GIT_MERGE, CI_BUILD, DEPLOY, or SCHEDULE' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      trigger: {
        id: trigger.id,
        type: trigger.type,
        status: trigger.status,
        triggeredAt: trigger.triggeredAt
      }
    });
  } catch (error) {
    console.error('[API] Error creating trigger:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create trigger' },
      { status: 500 }
    );
  }
}
