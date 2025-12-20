import { NextRequest, NextResponse } from 'next/server';
import { selfProjectService } from '@/lib/self-analysis';

/**
 * GET /api/self-analysis/project
 * Self Project 조회
 */
export async function GET() {
  try {
    const selfProject = await selfProjectService.getSelfProjectWithDetails();
    
    if (!selfProject) {
      return NextResponse.json(
        { error: 'Self project not initialized' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: selfProject.id,
      projectId: selfProject.projectId,
      project: selfProject.project,
      type: selfProject.type,
      tags: JSON.parse(selfProject.tags),
      visibility: selfProject.visibility,
      triggers: {
        push: selfProject.triggerOnPush,
        merge: selfProject.triggerOnMerge,
        build: selfProject.triggerOnBuild,
        deploy: selfProject.triggerOnDeploy,
        schedule: selfProject.scheduleDaily
      },
      baselines: selfProject.baselines,
      policies: selfProject.policies,
      registeredAt: selfProject.registeredAt,
      registeredBy: selfProject.registeredBy
    });
  } catch (error) {
    console.error('[API] Error fetching self project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch self project' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/self-analysis/project
 * Self Project 초기화/등록
 */
export async function POST() {
  try {
    const selfProject = await selfProjectService.initializeSelfProject();
    
    return NextResponse.json({
      success: true,
      selfProject: {
        id: selfProject.id,
        projectId: selfProject.projectId,
        type: selfProject.type,
        tags: JSON.parse(selfProject.tags)
      }
    });
  } catch (error) {
    console.error('[API] Error initializing self project:', error);
    return NextResponse.json(
      { error: 'Failed to initialize self project' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/self-analysis/project
 * Self Project 설정 업데이트
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { triggers, visibility, tags } = body;
    
    const selfProject = await selfProjectService.getSelfProject();
    
    if (!selfProject) {
      return NextResponse.json(
        { error: 'Self project not found' },
        { status: 404 }
      );
    }
    
    let updated = selfProject;
    
    if (triggers) {
      updated = await selfProjectService.updateTriggerSettings(selfProject.id, {
        triggerOnPush: triggers.push,
        triggerOnMerge: triggers.merge,
        triggerOnBuild: triggers.build,
        triggerOnDeploy: triggers.deploy,
        scheduleDaily: triggers.schedule
      });
    }
    
    if (visibility) {
      updated = await selfProjectService.updateVisibility(selfProject.id, visibility);
    }
    
    if (tags) {
      updated = await selfProjectService.updateTags(selfProject.id, tags);
    }
    
    return NextResponse.json({
      success: true,
      selfProject: updated
    });
  } catch (error) {
    console.error('[API] Error updating self project:', error);
    return NextResponse.json(
      { error: 'Failed to update self project' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/self-analysis/project
 * Self Project 삭제 시도 (항상 실패)
 */
export async function DELETE() {
  return NextResponse.json(
    { error: 'Self-Analysis 기본 프로젝트는 삭제할 수 없습니다.' },
    { status: 403 }
  );
}
