import { NextRequest, NextResponse } from 'next/server';
import { policyService, selfProjectService } from '@/lib/self-analysis';

/**
 * GET /api/self-analysis/policy
 * 분석 정책 조회
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
      const policy = await policyService.getActivePolicy(selfProject.id);
      return NextResponse.json({ policy });
    }
    
    const policies = await policyService.getAllPolicies(selfProject.id);
    return NextResponse.json({ policies });
  } catch (error) {
    console.error('[API] Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/self-analysis/policy
 * 새 정책 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ...settings } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
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
    
    const policy = await policyService.createPolicy(selfProject.id, {
      name,
      ...settings
    });
    
    return NextResponse.json({
      success: true,
      policy
    });
  } catch (error) {
    console.error('[API] Error creating policy:', error);
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/self-analysis/policy
 * 정책 업데이트/활성화
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, setActive, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
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
    
    if (setActive === true) {
      await policyService.setActivePolicy(selfProject.id, id);
      const policy = await policyService.getActivePolicy(selfProject.id);
      return NextResponse.json({ success: true, policy });
    }
    
    const policy = await policyService.updatePolicy(id, updates);
    
    return NextResponse.json({
      success: true,
      policy
    });
  } catch (error) {
    console.error('[API] Error updating policy:', error);
    return NextResponse.json(
      { error: 'Failed to update policy' },
      { status: 500 }
    );
  }
}
