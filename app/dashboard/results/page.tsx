import { BarChart3 } from 'lucide-react';
import { ResultsSummary } from '@/components/Results';
import { IssueDistributionChart } from '@/components/Results';
import { PriorityTable } from '@/components/Results';

export const dynamic = 'force-dynamic';

// Mock data matching seeded database
function getMockResults() {
  const mockResults = [
    { id: '1', category: 'SECURITY', severity: 'CRITICAL', message: 'SQL Injection 취약점이 발견되었습니다', filePath: 'src/api/users.ts', lineNumber: 45, suggestion: 'parameterized query를 사용하세요' },
    { id: '2', category: 'SECURITY', severity: 'HIGH', message: 'XSS 취약점이 발견되었습니다', filePath: 'src/components/Comment.tsx', lineNumber: 23, suggestion: 'DOMPurify로 sanitize 하세요' },
    { id: '3', category: 'QUALITY', severity: 'MEDIUM', message: '함수 복잡도가 높습니다 (Cyclomatic: 15)', filePath: 'src/utils/parser.ts', lineNumber: 89, suggestion: '함수를 분리하여 복잡도를 낮추세요' },
    { id: '4', category: 'ARCHITECTURE', severity: 'HIGH', message: '순환 의존성이 발견되었습니다', filePath: 'src/modules/auth', lineNumber: null, suggestion: '의존성 방향을 재설계하세요' },
    { id: '5', category: 'PERFORMANCE', severity: 'HIGH', message: 'N+1 쿼리 문제가 발견되었습니다', filePath: 'src/api/orders.ts', lineNumber: 67, suggestion: 'eager loading을 사용하세요' },
    { id: '6', category: 'OPERATIONS', severity: 'MEDIUM', message: '로깅이 부족합니다', filePath: 'src/services/payment.ts', lineNumber: null, suggestion: '로깅 커버리지를 높이세요' },
    { id: '7', category: 'SECURITY', severity: 'CRITICAL', message: '민감 정보가 로그에 노출됩니다', filePath: 'PaymentService.java', lineNumber: 156, suggestion: '민감 정보 마스킹 적용' },
    { id: '8', category: 'SECURITY', severity: 'CRITICAL', message: '암호화되지 않은 데이터 전송', filePath: 'ApiClient.java', lineNumber: 89, suggestion: 'TLS 적용 필수' },
    { id: '9', category: 'SECURITY', severity: 'HIGH', message: '취약한 해시 알고리즘 사용 (MD5)', filePath: 'CryptoUtils.java', lineNumber: 34, suggestion: 'SHA-256 이상 사용' },
    { id: '10', category: 'PERFORMANCE', severity: 'HIGH', message: '메모리 누수 가능성', filePath: 'loader.py', lineNumber: 123, suggestion: 'context manager 사용' },
  ];

  const criticalCount = mockResults.filter(r => r.severity === 'CRITICAL').length;
  const highCount = mockResults.filter(r => r.severity === 'HIGH').length;
  const mediumCount = mockResults.filter(r => r.severity === 'MEDIUM').length;
  const lowCount = mockResults.filter(r => r.severity === 'LOW').length;
  const infoCount = mockResults.filter(r => r.severity === 'INFO').length;

  const categories = [
    { name: 'SECURITY', score: 65, issueCount: 5 },
    { name: 'QUALITY', score: 85, issueCount: 1 },
    { name: 'ARCHITECTURE', score: 75, issueCount: 1 },
    { name: 'PERFORMANCE', score: 70, issueCount: 2 },
    { name: 'OPERATIONS', score: 80, issueCount: 1 },
  ];

  return {
    execution: {
      id: 'exec-1',
      score: 78.5,
      completedAt: new Date(),
      project: { name: 'JacodeLens Core' },
      results: mockResults,
    },
    stats: {
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      totalCount: mockResults.length,
      categories,
    },
  };
}

export default async function ResultsPage() {
  const data = getMockResults();

  const { execution, stats } = data;
  const avgConfidence = 0.85;

  // Create issue distribution data
  const issueData = [
    { name: 'Security', value: 5, color: '#EF4444' },
    { name: 'Quality', value: 1, color: '#F59E0B' },
    { name: 'Performance', value: 2, color: '#3B82F6' },
    { name: 'Architecture', value: 1, color: '#8B5CF6' },
    { name: 'Operations', value: 1, color: '#10B981' },
  ];

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
      filePath: r.filePath || undefined,
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

