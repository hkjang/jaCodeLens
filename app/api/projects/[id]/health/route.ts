import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/health - Get project health dashboard data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get latest execution
    const latestExecution = await prisma.analysisExecute.findFirst({
      where: { projectId },
      orderBy: { startedAt: 'desc' }
    });

    // Get analysis results
    const results = latestExecution 
      ? await prisma.normalizedAnalysisResult.findMany({
          where: { executeId: latestExecution.id }
        })
      : [];

    // Calculate category scores
    const categoryStats = {
      security: { total: 0, critical: 0, high: 0 },
      quality: { total: 0, critical: 0, high: 0 },
      structure: { total: 0, critical: 0, high: 0 },
      operations: { total: 0, critical: 0, high: 0 },
      test: { total: 0, critical: 0, high: 0 }
    };

    results.forEach(r => {
      const cat = r.mainCategory?.toLowerCase() || 'quality';
      const key = cat === 'security' ? 'security' :
                  cat === 'quality' || cat === 'standards' ? 'quality' :
                  cat === 'structure' ? 'structure' :
                  cat === 'operations' ? 'operations' :
                  cat === 'test' ? 'test' : 'quality';
      
      categoryStats[key as keyof typeof categoryStats].total++;
      if (r.severity === 'CRITICAL') categoryStats[key as keyof typeof categoryStats].critical++;
      if (r.severity === 'HIGH') categoryStats[key as keyof typeof categoryStats].high++;
    });

    // Calculate scores using logarithmic scaling - very lenient grading
    // High issue counts are expected in active development projects
    const calcScore = (stats: { total: number; critical: number; high: number }) => {
      if (stats.total === 0) return 100;
      
      // Weighted severity calculation (reduced weights)
      const weightedIssues = stats.critical * 2 + stats.high * 1.5 + (stats.total - stats.critical - stats.high);
      
      // Very gentle logarithmic scaling
      // Lower multiplier (15 instead of 25) for gradual score reduction
      const logPenalty = Math.log10(weightedIssues + 1) * 15;
      
      // Reduced penalty for critical issues (max 15 points instead of 30)
      const criticalPenalty = Math.min(15, stats.critical * 5);
      
      // Calculate final score with higher base
      const score = 100 - logPenalty - criticalPenalty;
      
      return Math.max(20, Math.min(100, Math.round(score)));  // Minimum 20 points
    };

    const securityScore = calcScore(categoryStats.security);
    const qualityScore = calcScore(categoryStats.quality);
    const structureScore = calcScore(categoryStats.structure);
    const operationsScore = calcScore(categoryStats.operations);
    const testScore = calcScore(categoryStats.test);

    // Heavily prioritize structure (clean architecture is most valuable)
    // Minimize impact of high-volume issue categories (quality, operations)
    const weightedScore = 
      securityScore * 0.25 + 
      qualityScore * 0.10 +  // Reduced from 15%
      structureScore * 0.35 + // Increased from 30%
      operationsScore * 0.10 + // Reduced from 15%
      testScore * 0.20;  // Increased from 15%
    
    // Large floor bonus (20 points) to ensure reasonable scores
    const overallScore = Math.min(100, Math.round(weightedScore + 20));

    // Get historical executions for trend
    const historicalExecutions = await prisma.analysisExecute.findMany({
      where: { projectId, status: 'COMPLETED' },
      orderBy: { startedAt: 'asc' },
      take: 10
    });

    const trendData = historicalExecutions.map(exec => ({
      date: exec.startedAt?.toISOString() || new Date().toISOString(),
      score: exec.score || overallScore
    }));

    // Top issues
    const topIssues = results
      .filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH')
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        severity: r.severity,
        category: r.mainCategory || 'QUALITY',
        message: r.message,
        file: r.filePath?.split('/').pop() || 'unknown',
        impact: r.severity === 'CRITICAL' 
          ? '시스템 보안 또는 안정성에 심각한 영향'
          : '코드 품질 또는 유지보수성에 영향'
      }));

    // AI Summary generation
    const aiSummary = generateAiSummary(categoryStats, topIssues.length);

    const healthData = {
      id: project.id,
      name: project.name,
      path: project.path,
      description: project.description,
      type: project.type,
      tier: project.tier,
      overallScore,
      baselineScore: latestExecution?.score ?? null,
      scoreChange: latestExecution?.score ? overallScore - latestExecution.score : 0,
      confidence: calculateConfidence(results.length, historicalExecutions.length),
      aiSummary,
      lastAnalysis: latestExecution?.completedAt?.toISOString() ?? null,
      categoryScores: {
        security: { 
          score: securityScore, 
          issues: categoryStats.security.total,
          critical: categoryStats.security.critical
        },
        quality: { 
          score: qualityScore, 
          issues: categoryStats.quality.total,
          // 유지비용 계산 기준 (단위: 만원)
          // - 이슈당 평균 수정 시간: CRITICAL 4시간, HIGH 2시간, MEDIUM 1시간, LOW 0.5시간
          // - 시니어 개발자 시급: 10만원 (약 $75)
          // - 간소화 계산: 이슈 수 × 평균 1.5시간 × 10만원 = 이슈 × 15만원
          maintainabilityCost: Math.round(categoryStats.quality.total * 15) // 단위: 만원 (KRW)
        },
        structure: { 
          score: structureScore, 
          issues: categoryStats.structure.total,
          coupling: 100 - structureScore // Simplified coupling metric
        },
        operations: { 
          score: operationsScore, 
          issues: categoryStats.operations.total,
          failureRisk: 100 - operationsScore // Simplified failure risk
        },
        test: { 
          score: testScore, 
          issues: categoryStats.test.total,
          coverage: testScore // Simplified coverage estimate
        }
      },
      topIssues,
      trendData
    };

    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Failed to get project health:', error);
    return NextResponse.json(
      { error: 'Failed to get project health' },
      { status: 500 }
    );
  }
}

function generateAiSummary(
  stats: Record<string, { total: number; critical: number; high: number }>,
  criticalCount: number
): string {
  if (stats.security.critical > 0) {
    return `🔴 보안 취약점 ${stats.security.critical}건 즉시 조치 필요. SQL Injection, XSS 등 심각한 보안 위협이 감지되었습니다.`;
  }
  if (stats.security.high > 0) {
    return `🟠 보안 이슈 ${stats.security.total}건 발견. 인증 및 권한 검증 강화가 필요합니다.`;
  }
  if (criticalCount > 5) {
    return `⚠️ 총 ${criticalCount}개의 중요 이슈 발견. 코드 품질 개선 및 리팩토링을 권장합니다.`;
  }
  if (criticalCount > 0) {
    return `🟡 ${criticalCount}개의 개선이 필요한 이슈가 있습니다. 점진적인 품질 개선을 추진하세요.`;
  }
  return `✅ 전반적으로 양호한 상태입니다. 지속적인 코드 품질 모니터링을 유지하세요.`;
}

function calculateConfidence(resultCount: number, historyCount: number): number {
  // Confidence based on data availability
  const baseConfidence = 70;
  const resultBonus = Math.min(15, resultCount * 0.5);
  const historyBonus = Math.min(15, historyCount * 3);
  return Math.round(baseConfidence + resultBonus + historyBonus);
}
