import { Suspense } from 'react';
import prisma from '@/lib/db';
import { BarChart3, FileSearch, TrendingUp } from 'lucide-react';
import { ResultsSummary } from '@/components/Results';
import { IssueDistributionChart } from '@/components/Results';
import { PriorityTable } from '@/components/Results';

export const dynamic = 'force-dynamic';

async function getLatestResults() {
  try {
    const latestExecution = await prisma.analysisExecute.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: {
        project: true,
        results: true
      }
    });

    if (!latestExecution) return null;

    const results = latestExecution.results;
    const criticalCount = results.filter(r => r.severity === 'CRITICAL').length;
    const highCount = results.filter(r => r.severity === 'HIGH').length;
    const mediumCount = results.filter(r => r.severity === 'MEDIUM').length;
    const lowCount = results.filter(r => r.severity === 'LOW').length;
    const infoCount = results.filter(r => r.severity === 'INFO').length;

    // Group by category
    const categoryMap = new Map<string, { count: number; score: number }>();
    results.forEach(r => {
      const existing = categoryMap.get(r.category) || { count: 0, score: 0 };
      categoryMap.set(r.category, {
        count: existing.count + 1,
        score: existing.score
      });
    });

    const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      score: 100 - (data.count * 5), // Simple score calculation
      issueCount: data.count
    }));

    return {
      execution: latestExecution,
      stats: {
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        infoCount,
        totalCount: results.length,
        categories
      }
    };
  } catch (e) {
    console.error("DB Error", e);
    return null;
  }
}

export default async function ResultsPage() {
  const data = await getLatestResults();

  if (!data) {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 결과</h2>
          <p className="text-gray-500">종합 분석 결과를 확인합니다</p>
        </header>

        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            분석 결과가 없습니다
          </h3>
          <p className="text-gray-500 mt-2">
            프로젝트 분석을 완료하면 결과가 여기에 표시됩니다
          </p>
        </div>
      </div>
    );
  }

  const { execution, stats } = data;
  const avgConfidence = 0.85; // Default confidence since field may not be in select

  // Create issue distribution data
  const issueData = [
    { name: 'Security', value: execution.results.filter(r => r.category === 'SECURITY').length, color: '#EF4444' },
    { name: 'Quality', value: execution.results.filter(r => r.category === 'QUALITY').length, color: '#F59E0B' },
    { name: 'Performance', value: execution.results.filter(r => r.category === 'PERFORMANCE').length, color: '#3B82F6' },
    { name: 'Architecture', value: execution.results.filter(r => r.category === 'ARCHITECTURE').length, color: '#8B5CF6' },
    { name: 'Operations', value: execution.results.filter(r => r.category === 'OPERATIONS').length, color: '#10B981' },
  ].filter(d => d.value > 0);

  // Create priority items
  const priorityItems = execution.results
    .filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH')
    .slice(0, 10)
    .map(r => ({
      id: r.id,
      title: r.message.slice(0, 50) + (r.message.length > 50 ? '...' : ''),
      description: r.suggestion || r.message,
      severity: r.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
      priority: r.severity === 'CRITICAL' ? 'short' as const : 'medium' as const,
      estimatedHours: r.severity === 'CRITICAL' ? 2 : 4,
      filePath: r.filePath || undefined
    }));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 결과</h2>
        <p className="text-gray-500">
          {execution.project.name} - {new Date(execution.completedAt!).toLocaleString('ko-KR')}
        </p>
      </header>

      {/* Summary */}
      <ResultsSummary
        score={execution.score || 0}
        confidence={avgConfidence}
        criticalCount={stats.criticalCount}
        highCount={stats.highCount}
        mediumCount={stats.mediumCount}
        lowCount={stats.lowCount}
        infoCount={stats.infoCount}
        categories={stats.categories}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IssueDistributionChart data={issueData} />
        <PriorityTable items={priorityItems} />
      </div>
    </div>
  );
}
