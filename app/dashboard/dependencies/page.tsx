import { GitBranch, AlertTriangle, CheckCircle, Package, RefreshCw, Link2 } from 'lucide-react';
import Link from 'next/link';
import { getDependencyGraph, getDashboardStats } from '@/lib/services/pipeline-data-service';

export const dynamic = 'force-dynamic';

export default async function DependenciesPage() {
  const [depGraph, stats] = await Promise.all([
    getDependencyGraph(),
    getDashboardStats()
  ]);

  const hasData = depGraph.nodes.length > 0 || depGraph.circularDeps.length > 0;
  const circularCount = depGraph.circularDeps.length;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">의존성</h2>
        <p className="text-gray-500">프로젝트 모듈 간 의존성을 분석합니다</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{depGraph.nodes.length}</p>
              <p className="text-sm text-gray-500">분석된 모듈</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Link2 className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{depGraph.edges.length}</p>
              <p className="text-sm text-gray-500">의존성 연결</p>
            </div>
          </div>
        </div>
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border ${
          circularCount > 0 ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-3">
            <RefreshCw className={`w-8 h-8 ${circularCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{circularCount}</p>
              <p className="text-sm text-gray-500">순환 의존성</p>
            </div>
          </div>
        </div>
      </div>

      {/* Circular Dependencies Warning */}
      {circularCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-700 dark:text-red-300">순환 의존성 감지됨</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                순환 의존성은 코드 유지보수를 어렵게 만듭니다. 아래 순환 경로를 확인하고 리팩토링을 고려하세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Circular Dependencies List */}
      {depGraph.circularDeps.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">순환 의존성 경로</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {depGraph.circularDeps.map((cycle, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {cycle.map((node, nodeIndex) => (
                    <span key={nodeIndex} className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-mono">
                        {node}
                      </span>
                      {nodeIndex < cycle.length - 1 && (
                        <span className="text-gray-400">→</span>
                      )}
                    </span>
                  ))}
                  <span className="text-gray-400">→ (순환)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependency Edges */}
      {depGraph.edges.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">의존성 목록</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {depGraph.edges.slice(0, 20).map((edge, index) => (
              <div key={index} className="px-4 py-3 flex items-center gap-3">
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{edge.from}</span>
                <span className="text-gray-400">→</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{edge.to}</span>
                {edge.isCircular && (
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs">
                    순환
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {!hasData && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <GitBranch className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">
            의존성 정보가 없습니다
          </h3>
          <p className="text-gray-500 mt-2 mb-6">
            분석을 실행하면 의존성 그래프가 여기에 표시됩니다
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
