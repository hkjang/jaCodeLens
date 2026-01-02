/**
 * Code Elements API
 * 
 * GET - 프로젝트의 코드 요소 조회
 * POST - 프로젝트 스캔 시작
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { codeScanner } from '@/lib/code-scanner';
import { codeElementService } from '@/lib/code-element-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const elementType = searchParams.get('type');
  const analyzed = searchParams.get('analyzed');
  const action = searchParams.get('action');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  try {
    // 통계 조회
    if (action === 'stats') {
      const stats = await codeElementService.getProjectStats(projectId);
      return NextResponse.json(stats);
    }

    // 요약 생성
    if (action === 'summary') {
      const summary = await codeElementService.generateProjectSummary(projectId);
      return NextResponse.json({ summary });
    }

    // 요소 목록 조회
    const elements = await codeElementService.getElementsByProject(projectId, {
      elementType: elementType || undefined,
      analyzed: analyzed === 'true' ? true : analyzed === 'false' ? false : undefined,
      limit: 100
    });

    const stats = await codeElementService.getProjectStats(projectId);

    return NextResponse.json({
      elements,
      stats,
      count: elements.length
    });

  } catch (error) {
    console.error('[CodeElements API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch code elements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, action } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // 프로젝트 확인
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 스캔 실행
    if (action === 'scan') {
      console.log(`\n📂 [API] Starting code scan for project: ${project.name}`);
      
      const result = await codeScanner.scanProject(projectId, project.path);
      
      return NextResponse.json({
        success: true,
        message: `Scanned ${result.filesScanned} files, extracted ${result.elementsExtracted} elements`,
        result
      });
    }

    // AI 분석 실행
    if (action === 'analyze') {
      const limit = 5; // 한 번에 5개씩 분석
      
      console.log(`\n🔬 [API] Starting AI analysis for project: ${project.name}`);
      
      const result = await codeElementService.analyzeElements(projectId, limit);
      
      return NextResponse.json({
        success: true,
        message: `Analyzed ${result.analyzed} elements`,
        result
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "scan" or "analyze"' }, { status: 400 });

  } catch (error) {
    console.error('[CodeElements API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
