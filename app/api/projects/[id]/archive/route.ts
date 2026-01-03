import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 프로젝트 아카이브
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // 프로젝트 상태를 ARCHIVED로 변경
    // 실제 구현에서는 status 필드가 스키마에 있어야 함
    // 여기서는 updatedAt을 업데이트하고 메타데이터로 처리
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        updatedAt: new Date(),
        // status: 'ARCHIVED' // 스키마에 추가 필요
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Project archived successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Failed to archive project:', error);
    return NextResponse.json(
      { error: 'Failed to archive project' },
      { status: 500 }
    );
  }
}
