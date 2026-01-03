/**
 * 코드 요소 상세 API (CUD)
 * 
 * GET - 단일 요소 조회
 * PATCH - 요소 수정 (AI 요약, 분석 결과 등)
 * DELETE - 요소 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { codeElementService } from '@/lib/code-element-service';

// GET /api/code-elements/[id] - 단일 요소 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const element = await prisma.codeElement.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, path: true }
        }
      }
    });

    if (!element) {
      return NextResponse.json(
        { error: '코드 요소를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // AI 분석 결과 파싱
    let analysisResult = null;
    if (element.aiAnalysis) {
      try {
        analysisResult = JSON.parse(element.aiAnalysis);
      } catch {
        // 파싱 실패 시 무시
      }
    }

    return NextResponse.json({
      ...element,
      analysisResult,
    });

  } catch (error) {
    console.error('[CodeElement] GET Error:', error);
    return NextResponse.json(
      { error: '요소 조회 실패' },
      { status: 500 }
    );
  }
}

// PATCH /api/code-elements/[id] - 요소 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existing = await prisma.codeElement.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: '코드 요소를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 수정 가능한 필드
    const updateData: Record<string, unknown> = {};
    
    if (body.aiSummary !== undefined) {
      updateData.aiSummary = body.aiSummary;
    }
    
    if (body.aiAnalysis !== undefined) {
      updateData.aiAnalysis = typeof body.aiAnalysis === 'string' 
        ? body.aiAnalysis 
        : JSON.stringify(body.aiAnalysis);
    }
    
    // 수동 분석 마킹
    if (body.manualReview !== undefined) {
      updateData.aiSummary = body.manualReview;
      updateData.analyzedAt = new Date();
    }

    // 요소 타입 수정 (잘못 분류된 경우)
    if (body.elementType !== undefined) {
      updateData.elementType = body.elementType;
    }

    // 시그니처 수정
    if (body.signature !== undefined) {
      updateData.signature = body.signature;
    }

    // 재분석 요청
    if (body.reanalyze === true) {
      const result = await codeElementService.analyzeElement(id);
      if (result) {
        return NextResponse.json({
          success: true,
          message: '재분석 완료',
          result,
        });
      } else {
        return NextResponse.json(
          { error: '재분석 실패' },
          { status: 500 }
        );
      }
    }

    const updated = await prisma.codeElement.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      element: updated,
      message: '요소가 수정되었습니다',
    });

  } catch (error) {
    console.error('[CodeElement] PATCH Error:', error);
    return NextResponse.json(
      { error: '요소 수정 실패' },
      { status: 500 }
    );
  }
}

// DELETE /api/code-elements/[id] - 요소 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const existing = await prisma.codeElement.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: '코드 요소를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    await prisma.codeElement.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: `'${existing.name}' 요소가 삭제되었습니다`,
      deletedId: id,
    });

  } catch (error) {
    console.error('[CodeElement] DELETE Error:', error);
    return NextResponse.json(
      { error: '요소 삭제 실패' },
      { status: 500 }
    );
  }
}
