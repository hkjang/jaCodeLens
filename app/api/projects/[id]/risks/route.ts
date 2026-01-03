import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * 프로젝트별 리스크 맵 API
 * 
 * GET /api/projects/[id]/risks
 * - 해당 프로젝트의 모듈별 카테고리별 리스크 데이터 반환
 */

export const dynamic = 'force-dynamic';

// Severity weight helper
function getSeverityWeight(severity: string): number {
  switch (severity) {
    case 'CRITICAL': return 4;
    case 'HIGH': return 3;
    case 'MEDIUM': return 2;
    case 'LOW': return 1;
    case 'INFO': return 0.5;
    default: return 1;
  }
}

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
      return NextResponse.json([]);
    }

    // 모든 결과 조회
    const results = await prisma.normalizedAnalysisResult.findMany({
      where: { executeId: latestExecution.id }
    });

    if (results.length === 0) {
      return NextResponse.json([]);
    }

    // 모듈별 카테고리별 집계
    const moduleRisks = new Map<string, {
      module: string;
      security: number;
      quality: number;
      structure: number;
      operations: number;
      test: number;
      standards: number;
    }>();

    for (const result of results) {
      const parts = result.filePath.split(/[/\\]/);
      const moduleName = parts.length > 1 ? parts[0] : 'root';

      if (!moduleRisks.has(moduleName)) {
        moduleRisks.set(moduleName, {
          module: moduleName,
          security: 0,
          quality: 0,
          structure: 0,
          operations: 0,
          test: 0,
          standards: 0
        });
      }

      const risk = moduleRisks.get(moduleName)!;
      const severity = getSeverityWeight(result.severity);

      switch (result.mainCategory) {
        case 'SECURITY': risk.security += severity; break;
        case 'QUALITY': risk.quality += severity; break;
        case 'STRUCTURE': risk.structure += severity; break;
        case 'OPERATIONS': risk.operations += severity; break;
        case 'TEST': risk.test += severity; break;
        case 'STANDARDS': risk.standards += severity; break;
      }
    }

    // 정규화 (1-10 스케일)
    const riskArray = Array.from(moduleRisks.values());
    const maxRisk = Math.max(
      ...riskArray.flatMap(r => [r.security, r.quality, r.structure, r.operations, r.test, r.standards]),
      1
    );

    const normalizedRisks = riskArray.map(r => ({
      module: r.module,
      security: Math.min(10, Math.round((r.security / maxRisk) * 10)),
      quality: Math.min(10, Math.round((r.quality / maxRisk) * 10)),
      structure: Math.min(10, Math.round((r.structure / maxRisk) * 10)),
      operations: Math.min(10, Math.round((r.operations / maxRisk) * 10)),
      test: Math.min(10, Math.round((r.test / maxRisk) * 10)),
      standards: Math.min(10, Math.round((r.standards / maxRisk) * 10))
    }));

    return NextResponse.json(normalizedRisks);

  } catch (error) {
    console.error('Failed to get project risks:', error);
    return NextResponse.json(
      { error: 'Failed to get risks' },
      { status: 500 }
    );
  }
}
