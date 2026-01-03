import { AlertTriangle, Shield, BarChart3, Layers, Activity, CheckCircle, FileCode } from 'lucide-react';
import Link from 'next/link';
import { getRiskMap, getDashboardStats } from '@/lib/services/pipeline-data-service';

export const dynamic = 'force-dynamic';

// 카테고리 설정
const categories = ['security', 'quality', 'structure', 'operations', 'test', 'standards'];
const categoryLabels: Record<string, string> = {
  security: '보안',
  quality: '품질',
  structure: '구조',
  operations: '운영',
  test: '테스트',
  standards: '표준',
};
const categoryIcons: Record<string, any> = {
  security: Shield,
  quality: BarChart3,
  structure: Layers,
  operations: Activity,
  test: CheckCircle,
  standards: FileCode,
};

function getRiskColor(value: number): string {
  if (value <= 2) return 'bg-green-500';
  if (value <= 4) return 'bg-yellow-500';
  if (value <= 6) return 'bg-orange-500';
  return 'bg-red-500';
}

function getRiskLevel(value: number): string {
  if (value <= 2) return '낮음';
  if (value <= 4) return '보통';
  if (value <= 6) return '높음';
  return '심각';
}

export default async function RisksPage() {
  const [riskData, stats] = await Promise.all([
    getRiskMap(),
    getDashboardStats()
  ]);

  const hasData = riskData.length > 0;
  const highRiskCount = riskData.filter(d => 
    d.security > 6 || d.quality > 6 || d.structure > 6 || d.operations > 6
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">리스크 맵</h2>
          <p className="text-gray-500">모듈별 리스크를 히트맵으로 시각화합니다</p>
        </div>
        {highRiskCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">{highRiskCount}개 고위험 모듈</span>
          </div>
        )}
      </header>

      {hasData ? (
        <>
          {/* Heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">모듈</th>
                  {categories.map(cat => {
                    const Icon = categoryIcons[cat];
                    return (
                      <th key={cat} className="text-center p-3">
                        <div className="flex flex-col items-center gap-1">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">
                            {categoryLabels[cat]}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-center p-3 text-sm font-medium text-gray-500">평균</th>
                </tr>
              </thead>
              <tbody>
                {riskData.map((row, index) => {
                  const values = [row.security, row.quality, row.structure, row.operations, row.test, row.standards];
                  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
                  
                  return (
                    <tr
                      key={row.module}
                      className="border-t border-gray-100 dark:border-gray-700"
                    >
                      <td className="p-3 font-medium text-gray-900 dark:text-white capitalize">
                        {row.module}
                      </td>
                      {categories.map(cat => {
                        const value = row[cat as keyof typeof row] as number;
                        return (
                          <td key={cat} className="p-3 text-center">
                            <div 
                              className={`w-10 h-10 mx-auto rounded-lg ${getRiskColor(value)} flex items-center justify-center text-white font-bold text-sm`}
                              title={`${categoryLabels[cat]}: ${value}/10`}
                            >
                              {value}
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                          avg > 6 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          avg > 4 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          avg > 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {getRiskLevel(avg)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm text-gray-500">낮음 (1-2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-sm text-gray-500">보통 (3-4)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span className="text-sm text-gray-500">높음 (5-6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm text-gray-500">심각 (7+)</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {categories.map(cat => {
              const Icon = categoryIcons[cat];
              const totalRisk = riskData.reduce((sum, r) => sum + (r[cat as keyof typeof r] as number), 0);
              const avgRisk = riskData.length > 0 ? Math.round(totalRisk / riskData.length) : 0;
              
              return (
                <div 
                  key={cat}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{categoryLabels[cat]}</span>
                  </div>
                  <div className={`text-2xl font-bold ${
                    avgRisk > 6 ? 'text-red-500' :
                    avgRisk > 4 ? 'text-orange-500' :
                    avgRisk > 2 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {avgRisk}/10
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <AlertTriangle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">
            리스크 데이터가 없습니다
          </h3>
          <p className="text-gray-500 mt-2 mb-6">
            분석을 실행하면 모듈별 리스크가 여기에 표시됩니다
          </p>
          <Link 
            href="/dashboard/execution"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            분석 실행하기
          </Link>
        </div>
      )}
    </div>
  );
}
