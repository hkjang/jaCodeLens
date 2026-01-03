import { Suspense } from 'react';
import Link from 'next/link';
import { 
  Activity, ShieldAlert, BarChart3, Clock, 
  CheckCircle, XCircle, AlertTriangle, ArrowRight,
  PlayCircle, TrendingUp, FileCode, Layers,
  FolderGit2, Rocket, Zap, ChevronRight,
  Plus, RefreshCw, Settings, Search, Target,
  ArrowUpRight, ArrowDownRight, Minus, Sparkles
} from 'lucide-react';
import { getDashboardStats, getPipelineExecutions, getRecentProjects } from '@/lib/services/pipeline-data-service';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [stats, executions, projects] = await Promise.all([
    getDashboardStats(),
    getPipelineExecutions(5),
    getRecentProjects(4)
  ]);

  const latestExecution = executions[0];
  const isFirstTime = stats.totalIssues === 0 && executions.length === 0;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">대시보드</h2>
          <p className="text-gray-500">분석 파이프라인 현황 및 통계</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/execution"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <PlayCircle className="w-4 h-4" />
            분석 실행
          </Link>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 프로젝트
          </Link>
        </div>
      </header>

      {/* Getting Started Section - Show for first-time users */}
      {isFirstTime && (
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-start gap-6">
            <div className="hidden md:flex w-16 h-16 rounded-2xl bg-white/10 items-center justify-center shrink-0">
              <Rocket className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">JacodeLens 시작하기</h3>
              <p className="text-blue-100 mb-6 max-w-2xl">
                AI 기반 코드 분석을 통해 보안 취약점, 코드 품질 문제, 아키텍처 결함을 자동으로 탐지하세요.
                아래 3단계를 따라 첫 번째 분석을 시작해 보세요.
              </p>
              
              {/* 3-Step Guide */}
              <div className="grid md:grid-cols-3 gap-4">
                <StepCard 
                  step={1}
                  icon={<FolderGit2 className="w-5 h-5" />}
                  title="프로젝트 연결"
                  description="Git 저장소 또는 로컬 경로로 프로젝트를 추가하세요"
                  href="/dashboard/projects/new"
                  buttonText="프로젝트 추가"
                  active
                />
                <StepCard 
                  step={2}
                  icon={<Zap className="w-5 h-5" />}
                  title="분석 실행"
                  description="8단계 파이프라인으로 코드를 자동 분석합니다"
                  href="/dashboard/execution"
                  buttonText="실행하기"
                />
                <StepCard 
                  step={3}
                  icon={<BarChart3 className="w-5 h-5" />}
                  title="결과 확인"
                  description="발견된 이슈와 개선 제안을 확인하세요"
                  href="/dashboard/results"
                  buttonText="결과 보기"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Score + Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Health Score Gauge */}
        <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-blue-100 text-sm font-medium">전체 건강도</span>
            <Target className="w-5 h-5 text-blue-200" />
          </div>
          <div className="relative w-24 h-24 mx-auto mb-4">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
              <circle 
                cx="48" cy="48" r="40" 
                stroke="white" strokeWidth="8" fill="none"
                strokeDasharray={`${((stats.averageScore || 0) / 100) * 251.2} 251.2`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold">{stats.averageScore?.toFixed(0) || '-'}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-blue-100 text-sm">100점 만점</p>
            {stats.averageScore && stats.averageScore >= 80 && (
              <p className="text-green-300 text-xs mt-1 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" /> 우수한 코드 품질
              </p>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="총 이슈" 
            value={stats.totalIssues} 
            icon={<BarChart3 className="w-6 h-6 text-blue-500" />} 
            trend={`${stats.totalExecutions}회 분석`}
            href="/dashboard/results"
          />
          <StatCard 
            title="Critical" 
            value={stats.criticalCount} 
            icon={<ShieldAlert className="w-6 h-6 text-red-500" />} 
            trend="즉시 조치 필요"
            isCritical={stats.criticalCount > 0}
            href="/dashboard/results?severity=CRITICAL"
          />
          <StatCard 
            title="High" 
            value={stats.highCount} 
            icon={<AlertTriangle className="w-6 h-6 text-orange-500" />} 
            trend="높은 우선순위"
            isWarning={stats.highCount > 0}
            href="/dashboard/results?severity=HIGH"
          />
          <StatCard 
            title="Medium+Low" 
            value={stats.mediumCount + stats.lowCount} 
            icon={<CheckCircle className="w-6 h-6 text-green-500" />} 
            trend="개선 권장"
            href="/dashboard/results?severity=MEDIUM"
          />
        </div>
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
                <Link 
                  key={category} 
                  href={`/dashboard/results?category=${category}`}
                  className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={category} />
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{getCategoryLabel(category)}</span>
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
                    <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
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
            <SeverityCard label="Critical" count={stats.criticalCount} color="bg-red-500" href="/dashboard/results?severity=CRITICAL" />
            <SeverityCard label="High" count={stats.highCount} color="bg-orange-500" href="/dashboard/results?severity=HIGH" />
            <SeverityCard label="Medium" count={stats.mediumCount} color="bg-yellow-500" href="/dashboard/results?severity=MEDIUM" />
            <SeverityCard label="Low" count={stats.lowCount} color="bg-blue-500" href="/dashboard/results?severity=LOW" />
            <SeverityCard label="Info" count={stats.infoCount} color="bg-gray-400" href="/dashboard/results?severity=INFO" />
          </div>
        </div>
      </div>

      {/* Projects Overview - 프로젝트별 현황 */}
      {projects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-blue-500" />
              프로젝트 현황
            </h3>
            <Link 
              href="/dashboard/projects"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              전체 보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <FolderGit2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-500">{project.type || '프로젝트'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {project.lastAnalysis ? (
                    <>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          (project.lastAnalysis.score || 0) >= 80 ? 'text-green-500' :
                          (project.lastAnalysis.score || 0) >= 60 ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {project.lastAnalysis.score?.toFixed(0) || '-'}
                        </p>
                        <p className="text-xs text-gray-500">{project.lastAnalysis.issueCount}개 이슈</p>
                      </div>
                      {(project.lastAnalysis.criticalCount > 0 || project.lastAnalysis.highCount > 0) && (
                        <div className="flex gap-1">
                          {project.lastAnalysis.criticalCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-medium">
                              {project.lastAnalysis.criticalCount}
                            </span>
                          )}
                          {project.lastAnalysis.highCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded text-xs font-medium">
                              {project.lastAnalysis.highCount}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">미분석</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
              <Link 
                key={exec.id}
                href={`/dashboard/analysis/${exec.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={exec.status} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
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
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
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

      {/* Quick Links with Icons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickLink href="/dashboard/results" icon={<BarChart3 />} label="분석 결과" description="이슈 목록 확인" />
        <QuickLink href="/dashboard/code-elements" icon={<FileCode />} label="코드 요소" description="함수/클래스 분석" />
        <QuickLink href="/dashboard/architecture" icon={<Layers />} label="아키텍처" description="구조 시각화" />
        <QuickLink href="/dashboard/risks" icon={<AlertTriangle />} label="리스크 맵" description="위험도 분석" />
      </div>

      {/* Floating Quick Actions */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <Link
          href="/dashboard/execution"
          className="group flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          title="새 분석 실행"
        >
          <PlayCircle className="w-5 h-5" />
          <span className="hidden group-hover:inline text-sm font-medium">분석 실행</span>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, isWarning, isCritical, href }: any) {
  const content = (
    <div className={`p-6 rounded-xl border shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800 ${
      isCritical ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10 hover:border-red-400' : 
      isWarning ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 hover:border-orange-400' :
      'border-gray-100 dark:border-gray-700 hover:border-blue-300'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 font-medium">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className={`text-sm flex items-center gap-1 ${
        isCritical ? 'text-red-600' : 
        isWarning ? 'text-orange-600' : 
        'text-gray-500'
      }`}>
        {trend}
        <ChevronRight className="w-4 h-4 opacity-50" />
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function SeverityCard({ label, count, color, href }: { label: string; count: number; color: string; href?: string }) {
  const content = (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors cursor-pointer hover:scale-105">
      <div className={`w-8 h-8 mx-auto rounded-lg ${color} flex items-center justify-center text-white font-bold mb-2`}>
        {count}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
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

function StepCard({ step, icon, title, description, href, buttonText, active }: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  buttonText: string;
  active?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl transition-all ${active ? 'bg-white/20 ring-2 ring-white/30' : 'bg-white/10 hover:bg-white/15'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          active ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
        }`}>
          {step}
        </span>
        <span className="text-white/80">{icon}</span>
      </div>
      <h4 className="font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-blue-100 mb-4">{description}</p>
      <Link
        href={href}
        className={`inline-flex items-center gap-1 text-sm font-medium ${
          active 
            ? 'px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50' 
            : 'text-white/80 hover:text-white'
        }`}
      >
        {buttonText}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
