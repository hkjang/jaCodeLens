'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { promptRegistry } from '@/lib/prompt-registry';

/**
 * GET /api/admin/prompts
 * 모든 프롬프트 조회
 */
export async function GET() {
  try {
    const prompts = await prisma.aiPrompt.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    // DB가 비어있으면 기본 프롬프트 반환
    if (prompts.length === 0) {
      const defaults = promptRegistry.getDefaultPrompts();
      return NextResponse.json(
        Object.values(defaults).map(p => ({
          ...p,
          id: null,
          isActive: true,
          version: 0,
          description: null,
          variables: JSON.stringify(p.variables),
          createdAt: null,
          updatedAt: null,
          isDefault: true
        }))
      );
    }
    
    return NextResponse.json(prompts.map(p => ({ ...p, isDefault: false })));
  } catch (error) {
    console.error('[API] Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prompts
 * 새 프롬프트 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      key, 
      name, 
      description, 
      category, 
      systemPrompt, 
      userPromptTemplate, 
      variables,
      isActive 
    } = body;
    
    // 키 중복 확인
    const existing = await prisma.aiPrompt.findUnique({
      where: { key }
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Prompt key already exists' },
        { status: 400 }
      );
    }
    
    const prompt = await prisma.aiPrompt.create({
      data: {
        key,
        name,
        description,
        category,
        systemPrompt,
        userPromptTemplate,
        variables: typeof variables === 'string' ? variables : JSON.stringify(variables),
        isActive: isActive !== false,
        version: 1
      }
    });
    
    // 캐시 초기화
    promptRegistry.clearCache();
    
    return NextResponse.json(prompt);
  } catch (error) {
    console.error('[API] Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prompts/seed
 * 기본 프롬프트로 시드
 */
export async function PUT() {
  try {
    const defaults = promptRegistry.getDefaultPrompts();
    const results = [];
    
    for (const prompt of Object.values(defaults)) {
      const existing = await prisma.aiPrompt.findUnique({
        where: { key: prompt.key }
      });
      
      if (!existing) {
        const created = await prisma.aiPrompt.create({
          data: {
            key: prompt.key,
            name: prompt.name,
            category: prompt.category,
            systemPrompt: prompt.systemPrompt,
            userPromptTemplate: prompt.userPromptTemplate,
            variables: JSON.stringify(prompt.variables),
            isActive: true,
            version: 1
          }
        });
        results.push({ key: prompt.key, action: 'created', id: created.id });
      } else {
        results.push({ key: prompt.key, action: 'exists', id: existing.id });
      }
    }
    
    promptRegistry.clearCache();
    
    return NextResponse.json({ 
      success: true, 
      results,
      message: `${results.filter(r => r.action === 'created').length} prompts created`
    });
  } catch (error) {
    console.error('[API] Error seeding prompts:', error);
    return NextResponse.json(
      { error: 'Failed to seed prompts' },
      { status: 500 }
    );
  }
}
