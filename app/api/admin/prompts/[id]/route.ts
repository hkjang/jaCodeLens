'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { promptRegistry } from '@/lib/prompt-registry';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/prompts/:id
 * 개별 프롬프트 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const prompt = await prisma.aiPrompt.findUnique({
      where: { id }
    });
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(prompt);
  } catch (error) {
    console.error('[API] Error fetching prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/prompts/:id
 * 프롬프트 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      description, 
      category, 
      systemPrompt, 
      userPromptTemplate, 
      variables,
      isActive 
    } = body;
    
    // 버전 증가
    const current = await prisma.aiPrompt.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    const prompt = await prisma.aiPrompt.update({
      where: { id },
      data: {
        name,
        description,
        category,
        systemPrompt,
        userPromptTemplate,
        variables: typeof variables === 'string' ? variables : JSON.stringify(variables),
        isActive,
        version: current.version + 1
      }
    });
    
    // 캐시 초기화
    promptRegistry.clearCache();
    
    return NextResponse.json(prompt);
  } catch (error) {
    console.error('[API] Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/prompts/:id
 * 프롬프트 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    await prisma.aiPrompt.delete({ where: { id } });
    
    // 캐시 초기화
    promptRegistry.clearCache();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
