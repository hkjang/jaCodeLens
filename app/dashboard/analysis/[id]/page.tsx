import Link from 'next/link';
import prisma from '@/lib/db';
import { 
  ArrowLeft, Clock, CheckCircle, XCircle, AlertTriangle, AlertCircle, 
  Info, BarChart3, FileCode, Layers, ShieldAlert, FolderGit2, 
  Activity, TrendingUp, ExternalLink, Download
} from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getAnalysisDetails(id: string) {
  try {
    const execute = await prisma.analysisExecute.findUnique({
      where: { id },
      include: {
        project: true,
        results: {
          orderBy: { severity: 'desc' }
        }
      }
    });
    return execute;
  } catch (e) {
    console.error("DB Error", e);
    return null;
  }
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'COMPLETED':
      return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: '완료' };
    case 'FAILED':
      return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: '실패' };
    case 'RUNNING':
      return { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: '실행 중' };
    default:
      return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700', label: status };
  }
}

function getSeverityInfo(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' };
    case 'HIGH':
      return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800' };
    case 'MEDIUM':
      return { icon: Info, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800' };
    case 'LOW':
      return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' };
    default:
      return { icon: Info, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700', border: 'border-gray-200 dark:border-gray-700' };
  }
}

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAnalysisDetails(id);

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">분석을 찾을 수 없습니다</h2>
        <p className="text-gray-500 mb-6">요청하신 분석 결과가 존재하지 않거나 오류가 발생했습니다.</p>
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusInfo(data.status);
  const StatusIcon = statusInfo.icon;

  // 심각도별 통계 계산
  const severityCounts = data.results.reduce((acc: Record<string, number>, r: any) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, {});

  // 카테고리별 통계 계산
  const categoryCounts = data.results.reduce((acc: Record<string, number>, r: any) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  const scoreColor = (data.score || 0) >= 80 ? 'text-green-500' : 
                     (data.score || 0) >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 헤더 with Breadcrumb */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/dashboard" className="hover:text-blue-600">대시보드</Link>
              <span>/</span>
              <Link href={`/dashboard/projects/${data.project.id}`} className="hover:text-blue-600 flex items-center gap-1">
                <FolderGit2 className="w-3 h-3" />
                {data.project.name}
              </Link>
              <span>/</span>
              <span className="text-gray-900 dark:text-white">분석 결과</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              분석 상세
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${data.project.id}/results`}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <ExternalLink className="w-4 h-4" />
            전체 결과
          </Link>
          <a
            href={`/api/projects/${data.project.id}/report?executionId=${id}&format=html`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            리포트
          </a>
        </div>
      </header>

      {/* 분석 정보 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 상태 카드 */}
        <div className={`p-4 rounded-xl border ${statusInfo.bg} ${statusInfo.color.replace('text-', 'border-')}/30`}>
          <div className="flex items-center gap-2 mb-2">
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">상태</span>
          </div>
          <p className={`text-xl font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
        </div>

        {/* 점수 카드 */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-5 h-5 ${scoreColor}`} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">점수</span>
          </div>
          <p className={`text-3xl font-bold ${scoreColor}`}>
            {data.score?.toFixed(0) || '-'}
            <span className="text-sm font-normal text-gray-400 ml-1">/ 100</span>
          </p>
        </div>

        {/* 이슈 수 카드 */}
        <Link 
          href={`/dashboard/projects/${data.project.id}/results`}
          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">발견된 이슈</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition">
            {data.results.length}
            <span className="text-sm font-normal text-gray-400 ml-1">건</span>
          </p>
        </Link>

        {/* 실행 시간 카드 */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">실행 시간</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white">
            {new Date(data.startedAt).toLocaleString('ko-KR')}
          </p>
          {data.completedAt && (
            <p className="text-xs text-gray-500 mt-1">
              소요: {Math.round((new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000)}초
            </p>
          )}
        </div>
      </div>

      {/* 심각도별 통계 - 클릭하면 해당 필터 적용 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(severity => {
          const count = severityCounts[severity] || 0;
          const info = getSeverityInfo(severity);
          const Icon = info.icon;
          return (
            <Link
              key={severity}
              href={`/dashboard/projects/${data.project.id}/results?severity=${severity}`}
              className={`p-3 rounded-lg border ${info.border} ${info.bg} hover:scale-105 transition-transform text-center`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${info.color}`} />
              <p className={`text-2xl font-bold ${info.color}`}>{count}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{severity}</p>
            </Link>
          );
        })}
      </div>

      {/* 카테고리별 통계 */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-500" />
            카테고리별 분포
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <Link
                key={category}
                href={`/dashboard/projects/${data.project.id}/results?category=${category}`}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">{category}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{count as number}건</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 이슈 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            발견된 이슈 ({data.results.length}건)
          </h3>
          {data.results.length > 0 && (
            <Link
              href={`/dashboard/projects/${data.project.id}/results`}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              전체 보기 <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        {data.results.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">이슈가 없습니다!</h3>
            <p className="text-gray-500">깨끗한 코드입니다. 수고하셨습니다! 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
            {data.results.slice(0, 20).map((result: any) => {
              const sevInfo = getSeverityInfo(result.severity);
              const SevIcon = sevInfo.icon;
              return (
                <div key={result.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${sevInfo.bg} ${sevInfo.color}`}>
                      <SevIcon className="w-3 h-3" />
                      {result.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">{result.message}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileCode className="w-3 h-3" />
                          {result.filePath}
                          {result.lineNumber && `:${result.lineNumber}`}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {result.category}
                        </span>
                      </div>
                      {result.suggestion && (
                        <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                          💡 {result.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {data.results.length > 20 && (
              <div className="p-4 text-center bg-gray-50 dark:bg-gray-700/50">
                <Link
                  href={`/dashboard/projects/${data.project.id}/results`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  + {data.results.length - 20}건 더 보기
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>분석 ID: <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{id.substring(0, 8)}</code></span>
          {data.inputHash && (
            <span>Hash: <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{data.inputHash.substring(0, 8)}</code></span>
          )}
        </div>
        <Link
          href={`/dashboard/projects/${data.project.id}/history`}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          실행 기록 보기 <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
