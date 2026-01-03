import { Suspense } from 'react';
import Link from 'next/link';
import { 
  Activity, ShieldAlert, BarChart3, Clock, 
  CheckCircle, XCircle, AlertTriangle, ArrowRight,
  PlayCircle, TrendingUp, FileCode, Layers
} from 'lucide-react';
import { getDashboardStats, getPipelineExecutions } from '@/lib/services/pipeline-data-service';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [stats, executions] = await Promise.all([
    getDashboardStats(),
    getPipelineExecutions(5)
  ]);

  const latestExecution = executions[0];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">대시보드</h2>
        <p className="text-gray-500">분석 파이프라인 현황 및 통계</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="총 이슈" 
          value={stats.totalIssues} 
          icon={<BarChart3 className="w-6 h-6 text-blue-500" />} 
          trend={`${stats.totalExecutions}회 분석 완료`}
        />
        <StatCard 
          title="Critical" 
          value={stats.criticalCount} 
          icon={<ShieldAlert className="w-6 h-6 text-red-500" />} 
          trend="즉시 조치 필요"
          isCritical={stats.criticalCount > 0}
        />
        <StatCard 
          title="High" 
          value={stats.highCount} 
          icon={<AlertTriangle className="w-6 h-6 text-orange-500" />} 
          trend="높은 우선순위"
          isWarning={stats.highCount > 0}
        />
        <StatCard 
          title="분석 점수" 
          value={stats.averageScore || '-'} 
          icon={<TrendingUp className="w-6 h-6 text-green-500" />} 
          trend="최근 분석 기준"
        />
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 카테고리별 이슈 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            카테고리별 이슈
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byCategory).length > 0 ? (
              Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={category} />
                    <span className="text-gray-700 dark:text-gray-300">{getCategoryLabel(category)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getCategoryColor(category)}`}
                        style={{ width: `${Math.min(100, (count / stats.totalIssues) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">분석 결과가 없습니다</p>
            )}
          </div>
        </div>

        {/* 심각도별 분포 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            심각도별 분포
          </h3>
          <div className="grid grid-cols-5 gap-3">
            <SeverityCard label="Critical" count={stats.criticalCount} color="bg-red-500" />
            <SeverityCard label="High" count={stats.highCount} color="bg-orange-500" />
            <SeverityCard label="Medium" count={stats.mediumCount} color="bg-yellow-500" />
            <SeverityCard label="Low" count={stats.lowCount} color="bg-blue-500" />
            <SeverityCard label="Info" count={stats.infoCount} color="bg-gray-400" />
          </div>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            최근 파이프라인 실행
          </h3>
          <Link 
            href="/dashboard/execution"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            전체 보기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {executions.length > 0 ? (
          <div className="space-y-3">
            {executions.map((exec) => (
              <div 
                key={exec.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={exec.status} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {exec.projectName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(exec.startedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {exec.issueCount > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {exec.issueCount} 이슈
                    </span>
                  )}
                  {exec.score !== null && (
                    <span className={`text-lg font-bold ${
                      exec.score >= 80 ? 'text-green-500' :
                      exec.score >= 60 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {exec.score}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">실행된 분석이 없습니다</p>
            <Link 
              href="/dashboard/execution"
              className="mt-3 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <PlayCircle className="w-4 h-4" />
              분석 시작하기
            </Link>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickLink href="/dashboard/results" icon={<BarChart3 />} label="분석 결과" />
        <QuickLink href="/dashboard/analysis" icon={<FileCode />} label="코드 이슈" />
        <QuickLink href="/dashboard/architecture" icon={<Layers />} label="아키텍처" />
        <QuickLink href="/dashboard/risks" icon={<AlertTriangle />} label="리스크 맵" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, isWarning, isCritical }: any) {
  return (
    <div className={`p-6 rounded-xl border shadow-sm transition-all hover:shadow-md bg-white dark:bg-gray-800 ${
      isCritical ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10' : 
      isWarning ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-900/10' :
      'border-gray-100 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 font-medium">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className={`text-sm ${
        isCritical ? 'text-red-600' : 
        isWarning ? 'text-orange-600' : 
        'text-gray-500'
      }`}>
        {trend}
      </div>
    </div>
  );
}

function SeverityCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className={`w-8 h-8 mx-auto rounded-lg ${color} flex items-center justify-center text-white font-bold mb-2`}>
        {count}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'FAILED':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'RUNNING':
      return <Activity className="w-5 h-5 text-blue-500 animate-spin" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
}

function CategoryIcon({ category }: { category: string }) {
  const iconClass = "w-4 h-4";
  switch (category) {
    case 'SECURITY': return <ShieldAlert className={`${iconClass} text-red-500`} />;
    case 'QUALITY': return <BarChart3 className={`${iconClass} text-blue-500`} />;
    case 'STRUCTURE': return <Layers className={`${iconClass} text-purple-500`} />;
    case 'OPERATIONS': return <Activity className={`${iconClass} text-green-500`} />;
    case 'TEST': return <CheckCircle className={`${iconClass} text-cyan-500`} />;
    case 'STANDARDS': return <FileCode className={`${iconClass} text-yellow-500`} />;
    default: return <FileCode className={`${iconClass} text-gray-500`} />;
  }
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    SECURITY: '보안',
    QUALITY: '품질',
    STRUCTURE: '구조',
    OPERATIONS: '운영',
    TEST: '테스트',
    STANDARDS: '표준'
  };
  return labels[category] || category;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    SECURITY: 'bg-red-500',
    QUALITY: 'bg-blue-500',
    STRUCTURE: 'bg-purple-500',
    OPERATIONS: 'bg-green-500',
    TEST: 'bg-cyan-500',
    STANDARDS: 'bg-yellow-500'
  };
  return colors[category] || 'bg-gray-500';
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
    >
      <span className="text-gray-400">{icon}</span>
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </Link>
  );
}
