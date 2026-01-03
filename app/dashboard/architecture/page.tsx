import { Layers, AlertTriangle, CheckCircle, ZoomIn, ZoomOut, Maximize, FileCode } from 'lucide-react';
import Link from 'next/link';
import { getArchitectureModules, getDashboardStats } from '@/lib/services/pipeline-data-service';

export const dynamic = 'force-dynamic';

// 모듈 타입별 색상
const typeColors: Record<string, string> = {
  api: 'bg-blue-500',
  service: 'bg-purple-500',
  component: 'bg-indigo-500',
  core: 'bg-green-500',
  util: 'bg-yellow-500',
  model: 'bg-pink-500',
  module: 'bg-gray-500',
};

export default async function ArchitecturePage() {
  const [modules, stats] = await Promise.all([
    getArchitectureModules(),
    getDashboardStats()
  ]);

  const structureIssues = stats.byCategory?.STRUCTURE || 0;
  const hasModules = modules.length > 0;

  // 모듈을 타입별로 그룹핑
  const byType = modules.reduce((acc, mod) => {
    if (!acc[mod.type]) acc[mod.type] = [];
    acc[mod.type].push(mod);
    return acc;
  }, {} as Record<string, typeof modules>);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">아키텍처</h2>
          <p className="text-gray-500">시스템 구조와 모듈 의존성을 시각화합니다</p>
        </div>
        {structureIssues > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span className="text-orange-700 dark:text-orange-300 font-medium">
              {structureIssues}개 구조 이슈
            </span>
          </div>
        )}
      </header>

      {hasModules ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Architecture Diagram */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 min-h-[400px]">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-6">모듈 구조</h3>
            
            <div className="flex flex-col items-center gap-8 py-4">
              {Object.entries(byType).map(([type, typeModules], typeIndex) => (
                <div key={type} className="w-full">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-2 text-center">
                    {type}
                  </div>
                  <div className="flex gap-4 flex-wrap justify-center">
                    {typeModules.map(module => (
                      <div
                        key={module.name}
                        className={`px-6 py-4 rounded-xl text-white font-medium shadow-lg transition-transform hover:scale-105 ${typeColors[module.type] || typeColors.module}`}
                      >
                        {module.name}
                        {module.issueCount > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                            {module.issueCount}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {typeIndex < Object.keys(byType).length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 mx-auto mt-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Module Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">모듈 통계</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">총 모듈</span>
                <span className="font-bold text-gray-900 dark:text-white">{modules.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">이슈 있는 모듈</span>
                <span className="font-bold text-orange-500">
                  {modules.filter(m => m.issueCount > 0).length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">총 구조 이슈</span>
                <span className="font-bold text-red-500">{structureIssues}</span>
              </div>
            </div>

            <h4 className="font-medium text-gray-700 dark:text-gray-300 mt-6 mb-3">타입별</h4>
            <div className="space-y-2">
              {Object.entries(byType).map(([type, typeModules]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${typeColors[type] || 'bg-gray-500'}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{type}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {typeModules.length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Layers className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">
            아키텍처 정보가 없습니다
          </h3>
          <p className="text-gray-500 mt-2 mb-6">
            분석을 실행하면 프로젝트 구조가 여기에 표시됩니다
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
