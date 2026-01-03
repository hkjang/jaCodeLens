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
    <div className="space-y-4">
      {/* Header with Actions */}
      <header className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            대시보드
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">분석 파이프라인 현황 및 통계</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/execution"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors shadow-sm"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            분석 실행
          </Link>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
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

      {/* Health Score + Stats Grid - 더 컴팩트 */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
        {/* Health Score Gauge - 작게 */}
        <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-xs font-medium">건강도</span>
            <Target className="w-4 h-4 text-blue-200" />
          </div>
          <div className="relative w-16 h-16 mx-auto mb-2">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
              <circle 
                cx="32" cy="32" r="26" 
                stroke="white" strokeWidth="6" fill="none"
                strokeDasharray={`${((stats.averageScore || 0) / 100) * 163.4} 163.4`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold">{stats.averageScore?.toFixed(0) || '-'}</span>
            </div>
          </div>
          <p className="text-center text-blue-100 text-xs">100점 만점</p>
        </div>

        {/* Mini Stats Cards - 5개로 늘림 */}
        <MiniStatCard 
          title="총 이슈" 
          value={stats.totalIssues} 
          icon={<BarChart3 className="w-4 h-4" />}
          color="blue"
          href="/dashboard/results"
          subtitle={`${stats.totalExecutions}회 분석`}
        />
        <MiniStatCard 
          title="Critical" 
          value={stats.criticalCount} 
          icon={<ShieldAlert className="w-4 h-4" />}
          color="red"
          href="/dashboard/results?severity=CRITICAL"
          subtitle="즉시 조치"
        />
        <MiniStatCard 
          title="High" 
          value={stats.highCount} 
          icon={<AlertTriangle className="w-4 h-4" />}
          color="orange"
          href="/dashboard/results?severity=HIGH"
          subtitle="높은 우선순위"
        />
        <MiniStatCard 
          title="Medium" 
          value={stats.mediumCount} 
          icon={<Activity className="w-4 h-4" />}
          color="yellow"
          href="/dashboard/results?severity=MEDIUM"
          subtitle="개선 권장"
        />
        <MiniStatCard 
          title="Low+Info" 
          value={stats.lowCount + stats.infoCount} 
          icon={<CheckCircle className="w-4 h-4" />}
          color="green"
          href="/dashboard/results?severity=LOW"
          subtitle="참고 사항"
        />
      </div>

      {/* Category Distribution - 더 컴팩트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 카테고리별 이슈 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" />
            카테고리별 이슈
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.byCategory).length > 0 ? (
              Object.entries(stats.byCategory).map(([category, count]) => (
                <Link 
                  key={category} 
                  href={`/dashboard/results?category=${category}`}
                  className="flex items-center justify-between p-1.5 -mx-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={category} />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{getCategoryLabel(category)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getCategoryColor(category)}`}
                        style={{ width: `${Math.min(100, (count / stats.totalIssues) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-6 text-right">
                      {count}
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-gray-500 text-xs">분석 결과가 없습니다</p>
            )}
          </div>
        </div>

        {/* 심각도별 분포 - 미니 버전 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            심각도별 분포
          </h3>
          <div className="grid grid-cols-5 gap-2">
            <SeverityMini label="Critical" count={stats.criticalCount} color="red" href="/dashboard/results?severity=CRITICAL" />
            <SeverityMini label="High" count={stats.highCount} color="orange" href="/dashboard/results?severity=HIGH" />
            <SeverityMini label="Medium" count={stats.mediumCount} color="yellow" href="/dashboard/results?severity=MEDIUM" />
            <SeverityMini label="Low" count={stats.lowCount} color="blue" href="/dashboard/results?severity=LOW" />
            <SeverityMini label="Info" count={stats.infoCount} color="gray" href="/dashboard/results?severity=INFO" />
          </div>
        </div>
      </div>

      {/* Language Distribution + AI Insights - 컴팩트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 언어별 분포 */}
        {Object.keys(stats.byLanguage).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-500" />
              언어별 분포
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.byLanguage)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([lang, count]) => (
                  <div key={lang} className="flex items-center gap-2">
                    <div className="w-12 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{lang}</div>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${Math.min(100, ((count as number) / stats.totalIssues) * 100)}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                      {count as number}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* AI 인사이트 */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-lg font-semibold">AI 인사이트</h3>
          </div>
          <div className="space-y-4">
            {stats.criticalCount > 0 && (
              <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-300" />
                  <span className="text-sm font-medium">긴급 조치 필요</span>
                </div>
                <p className="text-sm text-purple-100">
                  {stats.criticalCount}개의 Critical 이슈가 발견되었습니다. 즉시 확인하세요.
                </p>
              </div>
            )}
            {stats.criticalCount === 0 && stats.highCount > 0 && (
              <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-medium">개선 기회</span>
                </div>
                <p className="text-sm text-purple-100">
                  Critical 이슈가 없습니다! {stats.highCount}개의 High 이슈를 처리하면 더 좋아집니다.
                </p>
              </div>
            )}
            {stats.criticalCount === 0 && stats.highCount === 0 && (
              <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  <span className="text-sm font-medium">우수한 코드 상태</span>
                </div>
                <p className="text-sm text-purple-100">
                  Critical/High 이슈가 없습니다! 코드 품질이 우수합니다. 🎉
                </p>
              </div>
            )}
            {Object.entries(stats.byCategory).length > 0 && (
              <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-blue-300" />
                  <span className="text-sm font-medium">주요 개선 영역</span>
                </div>
                <p className="text-sm text-purple-100">
                  {getCategoryLabel(Object.entries(stats.byCategory).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '')} 
                  분야에 가장 많은 이슈가 집중되어 있습니다.
                </p>
              </div>
            )}
            <Link 
              href="/dashboard/results"
              className="flex items-center justify-center gap-2 w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
            >
              전체 분석 결과 보기 <ArrowRight className="w-4 h-4" />
            </Link>
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

function MiniStatCard({ title, value, icon, color, href, subtitle }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  color: 'blue' | 'red' | 'orange' | 'yellow' | 'green'; 
  href: string;
  subtitle?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  };
  const iconBgClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/40',
    red: 'bg-red-100 dark:bg-red-900/40',
    orange: 'bg-orange-100 dark:bg-orange-900/40',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/40',
    green: 'bg-green-100 dark:bg-green-900/40',
  };

  return (
    <Link 
      href={href}
      className={`p-3 rounded-lg border ${colorClasses[color]} hover:scale-[1.02] transition-all cursor-pointer group`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-md ${iconBgClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </Link>
  );
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

function SeverityMini({ label, count, color, href }: { 
  label: string; 
  count: number; 
  color: 'red' | 'orange' | 'yellow' | 'blue' | 'gray'; 
  href: string;
}) {
  const colorClasses = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-400',
  };

  return (
    <Link href={href} className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors cursor-pointer hover:scale-105">
      <div className={`w-6 h-6 mx-auto rounded ${colorClasses[color]} flex items-center justify-center text-white text-xs font-bold mb-1`}>
        {count}
      </div>
      <p className="text-[10px] text-gray-500">{label}</p>
    </Link>
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

function QuickLink({ href, icon, label, description }: { href: string; icon: React.ReactNode; label: string; description?: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
