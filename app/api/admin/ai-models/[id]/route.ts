'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/ai-models/:id
 * 개별 AI 모델 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const model = await prisma.aiModel.findUnique({
      where: { id }
    });
    
    if (!model) {
      return NextResponse.json(
        { error: 'AI model not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(model);
  } catch (error) {
    console.error('[API] Error fetching AI model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI model' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ai-models/:id
 * AI 모델 업데이트
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isDefault, isActive, ...rest } = body;
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.aiModel.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }
    
    const model = await prisma.aiModel.update({
      where: { id },
      data: {
        ...rest,
        isDefault,
        isActive
      }
    });
    
    return NextResponse.json(model);
  } catch (error) {
    console.error('[API] Error updating AI model:', error);
    return NextResponse.json(
      { error: 'Failed to update AI model' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ai-models/:id
 * AI 모델 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Check if it's the default model
    const model = await prisma.aiModel.findUnique({ where: { id } });
    if (model?.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default model' },
        { status: 400 }
      );
    }
    
    await prisma.aiModel.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting AI model:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI model' },
      { status: 500 }
    );
  }
}
