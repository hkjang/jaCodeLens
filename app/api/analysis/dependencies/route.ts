import { NextRequest, NextResponse } from 'next/server';
import { getDependencyGraph } from '@/lib/services/pipeline-data-service';

/**
 * 전역 의존성 그래프 API
 * 
 * GET /api/analysis/dependencies
 * - 가장 최근 분석의 의존성 정보 반환
 */
export async function GET(request: NextRequest) {
  try {
    const depGraph = await getDependencyGraph();

    // 노드를 올바른 형식으로 변환
    const nodes = depGraph.nodes.map(name => ({
      id: name,
      name: name,
      type: inferModuleType(name),
      issueCount: 0
    }));

    return NextResponse.json({
      nodes,
      edges: depGraph.edges,
      circularDeps: depGraph.circularDeps
    });

  } catch (error) {
    console.error('Failed to get dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to get dependencies' },
      { status: 500 }
    );
  }
}

function inferModuleType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('api') || lower.includes('route')) return 'api';
  if (lower.includes('service')) return 'service';
  if (lower.includes('component')) return 'component';
  if (lower.includes('util') || lower.includes('lib')) return 'util';
  if (lower.includes('model') || lower.includes('entity')) return 'model';
  return 'module';
}
