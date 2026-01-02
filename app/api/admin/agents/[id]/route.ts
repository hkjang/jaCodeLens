'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/agents/:id
 * 개별 에이전트 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = await prisma.agentConfig.findUnique({
      where: { id },
      include: { prompt: true }
    });
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(agent);
  } catch (error) {
    console.error('[API] Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/agents/:id
 * 에이전트 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      displayName, 
      description, 
      category,
      isEnabled,
      priority,
      timeout,
      maxRetries,
      promptId,
      modelId,
      config,
      status
    } = body;
    
    const updateData: any = {};
    
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (priority !== undefined) updateData.priority = priority;
    if (timeout !== undefined) updateData.timeout = timeout;
    if (maxRetries !== undefined) updateData.maxRetries = maxRetries;
    if (promptId !== undefined) updateData.promptId = promptId;
    if (modelId !== undefined) updateData.modelId = modelId;
    if (config !== undefined) updateData.config = JSON.stringify(config);
    if (status !== undefined) updateData.status = status;
    
    const agent = await prisma.agentConfig.update({
      where: { id },
      data: updateData,
      include: { prompt: true }
    });
    
    return NextResponse.json(agent);
  } catch (error) {
    console.error('[API] Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/agents/:id
 * 에이전트 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    await prisma.agentConfig.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
