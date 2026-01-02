'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/admin/ai-models
 * 모든 AI 모델 목록 조회
 */
export async function GET() {
  try {
    const models = await prisma.aiModel.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });
    
    return NextResponse.json(models);
  } catch (error) {
    console.error('[API] Error fetching AI models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-models
 * 새 AI 모델 추가
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, provider, version, endpoint, apiKey, isDefault, isActive, latency, accuracy, costPerToken, contextWindow, maxTokens, temperature } = body;
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.aiModel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }
    
    const model = await prisma.aiModel.create({
      data: {
        name,
        provider,
        version,
        endpoint,
        apiKey,
        isDefault: isDefault || false,
        isActive: isActive !== false,
        latency: latency || 0,
        accuracy: accuracy || 0,
        costPerToken: costPerToken || 0,
        contextWindow,
        maxTokens,
        temperature: temperature || 0.7
      }
    });
    
    return NextResponse.json(model);
  } catch (error) {
    console.error('[API] Error creating AI model:', error);
    return NextResponse.json(
      { error: 'Failed to create AI model' },
      { status: 500 }
    );
  }
}
