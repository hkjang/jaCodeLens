import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * 프로젝트별 의존성 그래프 API
 * 
 * GET /api/projects/[id]/dependencies
 * - 프로젝트의 코드 요소 간 의존성 정보 반환
 * - 노드, 엣지, 순환 의존성 포함
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    // 프로젝트 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 최근 분석 실행 조회
    const latestExecution = await prisma.analysisExecute.findFirst({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
      select: { id: true }
    });

    if (!latestExecution) {
      return NextResponse.json({
        nodes: [],
        edges: [],
        circularDeps: [],
        message: 'No analysis execution found'
      });
    }

    // 코드 요소에서 의존성 구조 추출
    const codeElements = await prisma.codeElement.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        elementType: true,
        filePath: true,
        parentName: true
      }
    });

    // 정규화된 분석 결과에서 순환 의존성 추출
    const circularIssues = await prisma.normalizedAnalysisResult.findMany({
      where: {
        executeId: latestExecution.id,
        subCategory: 'CIRCULAR'
      },
      select: {
        rawResult: true,
        filePath: true
      }
    });

    // 파일 경로에서 모듈명 추출
    const fileToModule = (filePath: string): string => {
      const parts = filePath.replace(/\\/g, '/').split('/');
      // 첫 번째 유의미한 폴더명 또는 파일명
      for (const part of parts) {
        if (part && !part.startsWith('.') && part !== 'src' && part !== 'app' && part !== 'lib') {
          return part.replace(/\.(tsx?|jsx?|vue|py)$/, '');
        }
      }
      return parts[parts.length - 1]?.replace(/\.[^.]+$/, '') || 'unknown';
    };

    // 노드 생성 (고유 모듈/파일)
    const nodeMap = new Map<string, {
      id: string;
      name: string;
      type: string;
      issueCount: number;
    }>();

    // 코드 요소에서 노드 추출
    for (const el of codeElements) {
      const moduleName = fileToModule(el.filePath);
      if (!nodeMap.has(moduleName)) {
        nodeMap.set(moduleName, {
          id: moduleName,
          name: moduleName,
          type: inferModuleType(el.filePath),
          issueCount: 0
        });
      }
    }

    // 분석 결과에서 이슈 카운트 업데이트
    const allIssues = await prisma.normalizedAnalysisResult.findMany({
      where: { executeId: latestExecution.id },
      select: { filePath: true }
    });

    for (const issue of allIssues) {
      const moduleName = fileToModule(issue.filePath);
      const node = nodeMap.get(moduleName);
      if (node) {
        node.issueCount++;
      }
    }

    // 순환 의존성 파싱
    const circularDeps: string[][] = [];
    const circularEdgeSet = new Set<string>();

    for (const issue of circularIssues) {
      if (issue.rawResult) {
        try {
          const raw = JSON.parse(issue.rawResult as string);
          if (raw.cycle && Array.isArray(raw.cycle)) {
            circularDeps.push(raw.cycle);
            // 순환 경로의 엣지 기록
            for (let i = 0; i < raw.cycle.length; i++) {
              const from = raw.cycle[i];
              const to = raw.cycle[(i + 1) % raw.cycle.length];
              circularEdgeSet.add(`${from}|${to}`);
              // 순환에 포함된 노드 추가
              if (!nodeMap.has(from)) {
                nodeMap.set(from, { id: from, name: from, type: 'module', issueCount: 0 });
              }
              if (!nodeMap.has(to)) {
                nodeMap.set(to, { id: to, name: to, type: 'module', issueCount: 0 });
              }
            }
          }
        } catch (e) {
          // JSON 파싱 실패 시 무시
        }
      }
    }

    // 엣지 생성 (부모-자식 관계 및 import 기반)
    const edgeSet = new Set<string>();
    const edges: Array<{
      from: string;
      to: string;
      type: string;
      isCircular: boolean;
    }> = [];

    // 코드 요소의 부모 관계에서 엣지 생성
    for (const el of codeElements) {
      if (el.parentName) {
        const fromModule = fileToModule(el.filePath);
        const toModule = el.parentName;
        const key = `${fromModule}|${toModule}`;
        if (!edgeSet.has(key) && fromModule !== toModule) {
          edgeSet.add(key);
          edges.push({
            from: fromModule,
            to: toModule,
            type: 'contains',
            isCircular: circularEdgeSet.has(key)
          });
        }
      }
    }

    // 순환 의존성 엣지 추가
    for (const cycle of circularDeps) {
      for (let i = 0; i < cycle.length; i++) {
        const from = cycle[i];
        const to = cycle[(i + 1) % cycle.length];
        const key = `${from}|${to}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({
            from,
            to,
            type: 'import',
            isCircular: true
          });
        }
      }
    }

    return NextResponse.json({
      nodes: Array.from(nodeMap.values()),
      edges,
      circularDeps
    });

  } catch (error) {
    console.error('Failed to get project dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to get dependencies' },
      { status: 500 }
    );
  }
}

// 파일 경로에서 모듈 타입 추론
function inferModuleType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.includes('/api/') || lower.includes('\\api\\') || lower.includes('route')) return 'api';
  if (lower.includes('service')) return 'service';
  if (lower.includes('component') || lower.includes('.tsx')) return 'component';
  if (lower.includes('util') || lower.includes('lib') || lower.includes('helper')) return 'util';
  if (lower.includes('model') || lower.includes('entity') || lower.includes('schema')) return 'model';
  if (lower.includes('hook')) return 'hook';
  if (lower.includes('context') || lower.includes('provider')) return 'context';
  return 'module';
}
