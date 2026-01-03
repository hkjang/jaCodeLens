import { Lightbulb, AlertTriangle, ChevronRight, FileCode, Zap, Target, Link2 } from 'lucide-react';
import Link from 'next/link';
import { getIssues, getDashboardStats } from '@/lib/services/pipeline-data-service';

export const dynamic = 'force-dynamic';

// 우선순위 설정
const priorityConfig: Record<string, { color: string; label: string; bg: string }> = {
  CRITICAL: { color: 'text-red-600', label: '즉시', bg: 'bg-red-100 dark:bg-red-900/20' },
  HIGH: { color: 'text-orange-600', label: '단기', bg: 'bg-orange-100 dark:bg-orange-900/20' },
  MEDIUM: { color: 'text-yellow-600', label: '중기', bg: 'bg-yellow-100 dark:bg-yellow-900/20' },
  LOW: { color: 'text-blue-600', label: '장기', bg: 'bg-blue-100 dark:bg-blue-900/20' },
};

// 개선 유형 추론
function getImprovementType(category: string, subCategory: string): { icon: any; label: string; color: string } {
  if (category === 'SECURITY') return { icon: AlertTriangle, label: '보안 개선', color: 'text-red-500' };
  if (category === 'QUALITY') return { icon: Zap, label: '코드 품질', color: 'text-blue-500' };
  if (category === 'STRUCTURE') return { icon: Target, label: '구조 개선', color: 'text-purple-500' };
  if (category === 'STANDARDS') return { icon: FileCode, label: '표준 준수', color: 'text-yellow-500' };
  return { icon: Lightbulb, label: '일반 개선', color: 'text-gray-500' };
}

// 예상 소요 시간 추정
function estimateHours(severity: string): number {
  switch (severity) {
    case 'CRITICAL': return 2;
    case 'HIGH': return 4;
    case 'MEDIUM': return 8;
    default: return 16;
  }
}

export default async function ImprovementsPage() {
  const [{ items: issues }, stats] = await Promise.all([
    getIssues(undefined, undefined, 50, 0),
    getDashboardStats()
  ]);

  // 개선 항목으로 변환 (suggestion이 있는 항목 우선)
  const improvements = issues
    .filter(issue => issue.suggestion || issue.aiSuggestion)
    .map(issue => ({
      id: issue.id,
      title: issue.message.slice(0, 80) + (issue.message.length > 80 ? '...' : ''),
      description: issue.suggestion || issue.aiSuggestion || '',
      severity: issue.severity,
      category: issue.mainCategory,
      subCategory: issue.subCategory,
      filePath: issue.filePath,
      lineStart: issue.lineStart,
      estimatedHours: estimateHours(issue.severity),
      type: getImprovementType(issue.mainCategory, issue.subCategory)
    }));

  const hasData = improvements.length > 0;
  const totalEstimatedHours = improvements.reduce((sum, i) => sum + i.estimatedHours, 0);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">개선 제안</h2>
        <p className="text-gray-500">분석 결과를 바탕으로 한 개선 사항입니다</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{improvements.length}</p>
              <p className="text-sm text-gray-500">개선 항목</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {improvements.filter(i => i.severity === 'CRITICAL').length}
              </p>
              <p className="text-sm text-gray-500">즉시 개선 필요</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {improvements.filter(i => i.severity === 'HIGH').length}
              </p>
              <p className="text-sm text-gray-500">단기 개선</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEstimatedHours}h</p>
              <p className="text-sm text-gray-500">예상 소요 시간</p>
            </div>
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="space-y-4">
          {/* Priority Sections */}
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => {
            const items = improvements.filter(i => i.severity === severity);
            if (items.length === 0) return null;
            
            const config = priorityConfig[severity];
            
            return (
              <div key={severity} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className={`px-4 py-3 ${config.bg} border-b border-gray-200 dark:border-gray-700`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${config.color}`}>
                      {config.label} 개선 ({items.length}개)
                    </span>
                    <span className="text-sm text-gray-500">
                      예상 {items.reduce((sum, i) => sum + i.estimatedHours, 0)}시간
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((item) => {
                    const TypeIcon = item.type.icon;
                    return (
                      <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${item.type.color}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span className="font-mono">{item.filePath.split('/').pop()}:{item.lineStart}</span>
                              <span>•</span>
                              <span>{item.type.label}</span>
                              <span>•</span>
                              <span>~{item.estimatedHours}h</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Lightbulb className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">
            개선 제안이 없습니다
          </h3>
          <p className="text-gray-500 mt-2 mb-6">
            분석을 실행하면 개선 항목이 여기에 표시됩니다
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
