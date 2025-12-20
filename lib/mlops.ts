import prisma from '@/lib/db';

/**
 * Logs a model execution for MLOps tracking.
 */
export async function logModelExecution(
  agentExecId: string, 
  modelName: string, 
  metrics: { latency: number, inputTokens: number, outputTokens: number }
) {
  await prisma.modelExecution.create({
    data: {
      agentExecId,
      modelName,
      modelVersion: 'v1.0.0', // In real scenario, fetch from env or model provider
      latencyMs: metrics.latency,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens
    }
  });
}

/**
 * Detects drift by comparing current run output distribution vs historical baseline.
 * (Placeholder logic)
 */
export async function detectDrift(projectId: string, currentAnalysisId: string): Promise<number> {
  // 1. Fetch previous analysis results
  const history = await prisma.analysisExecute.findMany({
    where: { projectId, status: 'COMPLETED', NOT: { id: currentAnalysisId } },
    orderBy: { completedAt: 'desc' },
    take: 5,
    include: { results: true }
  });

  if (history.length === 0) return 0;

  // 2. Simple metric: Compare average severity count
  const avgHighSeverity = history.reduce((sum, h) => 
    sum + h.results.filter(r => r.severity === 'HIGH').length, 0
  ) / history.length;

  const currentResults = await prisma.analysisResult.count({
    where: { executeId: currentAnalysisId, severity: 'HIGH' }
  });

  // Calculate percentage difference
  const drift = Math.abs(currentResults - avgHighSeverity) / (avgHighSeverity + 1); // +1 to avoid div by 0
  
  return Math.min(drift, 1.0); // Cap at 1.0
}
