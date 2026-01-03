import Link from 'next/link';
import { BarChart3, Filter, ArrowLeft, ArrowRight, FileCode, AlertTriangle } from 'lucide-react';
import { getIssues, getDashboardStats } from '@/lib/services/pipeline-data-service';

export const dynamic = 'force-dynamic';

// 심각도 설정
const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20', label: 'Critical' },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20', label: 'High' },
  MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20', label: 'Medium' },
  LOW: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20', label: 'Low' },
  INFO: { color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/20', label: 'Info' }
};

// 카테고리 설정
const categoryConfig: Record<string, { color: string; label: string }> = {
  SECURITY: { color: 'bg-red-500', label: '보안' },
  QUALITY: { color: 'bg-blue-500', label: '품질' },
  STRUCTURE: { color: 'bg-purple-500', label: '구조' },
  OPERATIONS: { color: 'bg-green-500', label: '운영' },
  TEST: { color: 'bg-cyan-500', label: '테스트' },
  STANDARDS: { color: 'bg-yellow-500', label: '표준' }
};

export default async function ResultsPage({
  searchParams
}: {
  searchParams: Promise<{ severity?: string; category?: string; page?: string }>
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const pageSize = 20;
  
  const [{ items: issues, total }, stats] = await Promise.all([
    getIssues(undefined, {
      severity: params.severity,
      category: params.category
    }, pageSize, (page - 1) * pageSize),
    getDashboardStats()
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 결과</h2>
          <p className="text-gray-500">파이프라인 분석에서 발견된 이슈 목록</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
            총 {total}개
          </span>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Critical" count={stats.criticalCount} color="bg-red-500" />
        <SummaryCard label="High" count={stats.highCount} color="bg-orange-500" />
        <SummaryCard label="Medium" count={stats.mediumCount} color="bg-yellow-500" />
        <SummaryCard label="Low" count={stats.lowCount} color="bg-blue-500" />
        <SummaryCard label="Info" count={stats.infoCount} color="bg-gray-400" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Filter className="w-5 h-5 text-gray-400" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">심각도:</span>
          <FilterLink href="/dashboard/results" label="전체" active={!params.severity} />
          <FilterLink href="/dashboard/results?severity=CRITICAL" label="Critical" active={params.severity === 'CRITICAL'} />
          <FilterLink href="/dashboard/results?severity=HIGH" label="High" active={params.severity === 'HIGH'} />
          <FilterLink href="/dashboard/results?severity=MEDIUM" label="Medium" active={params.severity === 'MEDIUM'} />
        </div>
        <div className="border-l border-gray-200 dark:border-gray-700 h-6" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">카테고리:</span>
          <FilterLink href="/dashboard/results" label="전체" active={!params.category} />
          <FilterLink href="/dashboard/results?category=SECURITY" label="보안" active={params.category === 'SECURITY'} />
          <FilterLink href="/dashboard/results?category=QUALITY" label="품질" active={params.category === 'QUALITY'} />
          <FilterLink href="/dashboard/results?category=STRUCTURE" label="구조" active={params.category === 'STRUCTURE'} />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {issues.length > 0 ? (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">심각도</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">카테고리</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">메시지</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">파일</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">라인</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {issues.map((issue, index) => {
                  const severity = severityConfig[issue.severity] || severityConfig.INFO;
                  const category = categoryConfig[issue.mainCategory] || { color: 'bg-gray-500', label: issue.mainCategory };
                  
                  return (
                    <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${severity.bg} ${severity.color}`}>
                          {severity.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${category.color}`}>
                          {category.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-900 dark:text-white text-sm max-w-md truncate" title={issue.message}>
                          {issue.message}
                        </p>
                        {issue.suggestion && (
                          <p className="text-xs text-gray-500 mt-1 truncate" title={issue.suggestion}>
                            💡 {issue.suggestion}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate max-w-xs block" title={issue.filePath}>
                          {issue.filePath.split('/').pop()}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                        {issue.lineStart}
                        {issue.lineEnd !== issue.lineStart && `-${issue.lineEnd}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-500">
                  {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} / {total}
                </span>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/dashboard/results?page=${page - 1}${params.severity ? `&severity=${params.severity}` : ''}${params.category ? `&category=${params.category}` : ''}`}
                      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={`/dashboard/results?page=${page + 1}${params.severity ? `&severity=${params.severity}` : ''}${params.category ? `&category=${params.category}` : ''}`}
                      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <FileCode className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
              분석 결과가 없습니다
            </h3>
            <p className="text-gray-500 mt-2">
              프로젝트 분석을 실행하면 결과가 여기에 표시됩니다
            </p>
            <Link 
              href="/dashboard/execution"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              분석 실행하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
    </div>
  );
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-full text-sm transition-colors ${
        active 
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </Link>
  );
}
