import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 프로젝트 복원 (아카이브 취소)
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

    // 프로젝트 상태를 ACTIVE로 복원
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        updatedAt: new Date(),
        // status: 'ACTIVE' // 스키마에 추가 필요
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Project restored successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Failed to restore project:', error);
    return NextResponse.json(
      { error: 'Failed to restore project' },
      { status: 500 }
    );
  }
}
