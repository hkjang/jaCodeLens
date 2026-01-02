'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Default agents for seeding
const DEFAULT_AGENTS = [
  { name: 'StructureAnalysisAgent', displayName: '구조 분석', description: '프로젝트 구조 분석', category: 'ANALYSIS', priority: 1, timeout: 30, promptKey: 'agent.structure' },
  { name: 'QualityAnalysisAgent', displayName: '품질 분석', description: '코드 품질 분석', category: 'QUALITY', priority: 2, timeout: 60, promptKey: 'agent.quality' },
  { name: 'SecurityAnalysisAgent', displayName: '보안 분석', description: '보안 취약점 스캔', category: 'SECURITY', priority: 1, timeout: 120, promptKey: 'agent.security' },
  { name: 'DependencyAnalysisAgent', displayName: '의존성 분석', description: '의존성 분석', category: 'ANALYSIS', priority: 3, timeout: 45, promptKey: 'agent.dependency' },
  { name: 'StyleAnalysisAgent', displayName: '스타일 검사', description: '코딩 스타일 검사', category: 'QUALITY', priority: 4, timeout: 30, isEnabled: false, promptKey: 'agent.style' },
  { name: 'TestAnalysisAgent', displayName: '테스트 분석', description: '테스트 커버리지', category: 'QUALITY', priority: 3, timeout: 90, promptKey: 'agent.test' },
];

/**
 * GET /api/admin/agents
 * 모든 에이전트 조회
 */
export async function GET() {
  try {
    const agents = await prisma.agentConfig.findMany({
      include: { prompt: true },
      orderBy: [
        { priority: 'asc' },
        { name: 'asc' }
      ]
    });
    
    // DB가 비어있으면 기본값 반환
    if (agents.length === 0) {
      return NextResponse.json(
        DEFAULT_AGENTS.map((a, i) => ({
          ...a,
          id: null,
          isEnabled: a.isEnabled !== false,
          maxRetries: 3,
          status: 'idle',
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0,
          avgDuration: 0,
          isDefault: true
        }))
      );
    }
    
    return NextResponse.json(agents.map(a => ({ ...a, isDefault: false })));
  } catch (error) {
    console.error('[API] Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/agents
 * 새 에이전트 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      displayName, 
      description, 
      category,
      isEnabled,
      priority,
      timeout,
      maxRetries,
      promptId,
      modelId,
      config
    } = body;
    
    const agent = await prisma.agentConfig.create({
      data: {
        name,
        displayName,
        description,
        category: category || 'ANALYSIS',
        isEnabled: isEnabled !== false,
        priority: priority || 1,
        timeout: timeout || 60,
        maxRetries: maxRetries || 3,
        promptId,
        modelId,
        config: config ? JSON.stringify(config) : null
      },
      include: { prompt: true }
    });
    
    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('[API] Error creating agent:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Agent name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/agents (Seed defaults)
 * 기본 에이전트 시드
 */
export async function PUT() {
  try {
    const results = [];
    
    for (const agentData of DEFAULT_AGENTS) {
      const existing = await prisma.agentConfig.findUnique({
        where: { name: agentData.name }
      });
      
      if (!existing) {
        // Find prompt if promptKey is specified
        let promptId = null;
        if ((agentData as any).promptKey) {
          const prompt = await prisma.aiPrompt.findUnique({
            where: { key: (agentData as any).promptKey }
          });
          promptId = prompt?.id || null;
        }
        
        const created = await prisma.agentConfig.create({
          data: {
            name: agentData.name,
            displayName: agentData.displayName,
            description: agentData.description,
            category: agentData.category,
            isEnabled: agentData.isEnabled !== false,
            priority: agentData.priority,
            timeout: agentData.timeout,
            promptId
          }
        });
        results.push({ name: agentData.name, action: 'created', id: created.id });
      } else {
        results.push({ name: agentData.name, action: 'exists', id: existing.id });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      results,
      message: `${results.filter(r => r.action === 'created').length} agents created`
    });
  } catch (error) {
    console.error('[API] Error seeding agents:', error);
    return NextResponse.json(
      { error: 'Failed to seed agents' },
      { status: 500 }
    );
  }
}
