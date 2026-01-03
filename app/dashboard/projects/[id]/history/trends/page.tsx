'use client';

/**
 * 프로젝트 분석 트렌드 페이지 - 대폭 개선
 * 
 * - 점수 라인 차트
 * - 이슈 추이 차트
 * - 분석 타임라인
 * - 카테고리별 분포
 * - 비교 기능
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3,
  RefreshCw, Calendar, AlertTriangle, CheckCircle, Activity,
  GitCommit, Clock, ChevronDown, ChevronUp, ExternalLink,
  Target, Zap, Download, Filter, LineChart as LineChartIcon
} from 'lucide-react';

interface TrendData {
  date: string;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  avgScore: number;
  executionCount: number;
}

interface ExecutionItem {
  id: string;
  date: string;
  score: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  status: string;
  duration: number;
}

interface Stats {
  totalExecutions: number;
  currentScore: number;
  scoreChange: number;
  issuesChange: number;
  latestExecution: ExecutionItem | null;
  avgDuration: number;
  bestScore: number;
  worstScore: number;
}

export default function ProjectTrendsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [trends, setTrends] = useState<TrendData[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<any[]>([]);
  const [executions, setExecutions] = useState<ExecutionItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'issues' | 'score'>('score');
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);

  useEffect(() => {
    loadTrends();
  }, [projectId, days]);

  async function loadTrends() {
    setLoading(true);
    try {
      const [trendsRes, execRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/trends?days=${days}`),
        fetch(`/api/projects/${projectId}/history?limit=20`)
      ]);
      
      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data.trends || []);
        setCategoryTrends(data.categoryTrends || []);
        setStats(data.stats || null);
      }
      
      if (execRes.ok) {
        const data = await execRes.json();
        setExecutions(data.executions || []);
      }
    } catch (e) {
      console.error('Failed to load trends', e);
    } finally {
      setLoading(false);
    }
  }

  // 차트 데이터 계산
  const chartData = useMemo(() => {
    if (chartType === 'score') {
      const maxScore = Math.max(...trends.map(t => t.avgScore), 100);
      return trends.map(t => ({ ...t, value: t.avgScore, max: maxScore }));
    } else {
      const maxIssues = Math.max(...trends.map(t => t.totalIssues), 1);
      return trends.map(t => ({ ...t, value: t.totalIssues, max: maxIssues }));
    }
  }, [trends, chartType]);

  // 점수 변화 분석
  const scoreAnalysis = useMemo(() => {
    if (trends.length < 2) return null;
    const recent = trends.slice(-7);
    const avgRecent = recent.reduce((s, t) => s + t.avgScore, 0) / recent.length;
    const trend = recent[recent.length - 1]?.avgScore - recent[0]?.avgScore;
    return { avgRecent: Math.round(avgRecent), trend: Math.round(trend) };
  }, [trends]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <Link 
            href={`/dashboard/projects/${projectId}`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            프로젝트로 돌아가기
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <LineChartIcon className="w-8 h-8 text-blue-500" />
            분석 트렌드
          </h2>
          <p className="text-gray-500">프로젝트의 분석 결과 추이 및 상세 히스토리</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 기간 선택 */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded text-sm ${days === d ? 'bg-white dark:bg-gray-700 shadow font-medium' : ''}`}
              >
                {d}일
              </button>
            ))}
          </div>
          <button onClick={loadTrends} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 요약 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
            label="총 분석"
            value={stats.totalExecutions}
            suffix="회"
          />
          <StatCard
            icon={stats.scoreChange >= 0 
              ? <TrendingUp className="w-5 h-5 text-green-500" />
              : <TrendingDown className="w-5 h-5 text-red-500" />
            }
            label="현재 점수"
            value={Math.round(stats.currentScore)}
            suffix="점"
            change={stats.scoreChange}
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-green-500" />}
            label="최고 점수"
            value={stats.bestScore}
            suffix="점"
            highlight="green"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            label="최저 점수"
            value={stats.worstScore}
            suffix="점"
            highlight="red"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-purple-500" />}
            label="평균 소요"
            value={Math.round(stats.avgDuration / 1000)}
            suffix="초"
          />
          <StatCard
            icon={stats.issuesChange <= 0 
              ? <CheckCircle className="w-5 h-5 text-green-500" />
              : <AlertTriangle className="w-5 h-5 text-red-500" />
            }
            label="이슈 변화"
            value={stats.issuesChange}
            prefix={stats.issuesChange > 0 ? '+' : ''}
            suffix="개"
            highlight={stats.issuesChange < 0 ? 'green' : stats.issuesChange > 0 ? 'red' : 'gray'}
          />
        </div>
      )}

      {/* 점수 분석 배너 */}
      {scoreAnalysis && (
        <div className={`p-4 rounded-xl flex items-center justify-between ${
          scoreAnalysis.trend >= 0 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-3">
            <Zap className={`w-6 h-6 ${scoreAnalysis.trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                최근 7일 평균 점수: {scoreAnalysis.avgRecent}점
              </div>
              <div className={`text-sm ${scoreAnalysis.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {scoreAnalysis.trend >= 0 ? '↑' : '↓'} {Math.abs(scoreAnalysis.trend)}점 변화
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/projects/${projectId}/results`}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            이슈 확인 <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 차트 타입 토글 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setChartType('score')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm ${chartType === 'score' ? 'bg-white dark:bg-gray-700 shadow font-medium' : ''}`}
          >
            <TrendingUp className="w-4 h-4" />
            점수 추이
          </button>
          <button
            onClick={() => setChartType('issues')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm ${chartType === 'issues' ? 'bg-white dark:bg-gray-700 shadow font-medium' : ''}`}
          >
            <AlertTriangle className="w-4 h-4" />
            이슈 추이
          </button>
        </div>
      </div>

      {/* 라인 차트 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          {chartType === 'score' ? <TrendingUp className="w-5 h-5 text-blue-500" /> : <AlertTriangle className="w-5 h-5 text-orange-500" />}
          {chartType === 'score' ? '점수 추이' : '이슈 추이'} ({days}일)
        </h3>
        
        {chartData.length > 0 ? (
          <div className="h-64 relative">
            {/* Y축 레이블 */}
            <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-400">
              <span>{chartType === 'score' ? '100' : Math.round(chartData[0]?.max || 0)}</span>
              <span>{chartType === 'score' ? '50' : Math.round((chartData[0]?.max || 0) / 2)}</span>
              <span>0</span>
            </div>
            
            {/* 차트 영역 */}
            <div className="ml-12 h-full flex items-end gap-1">
              {chartData.map((item, idx) => {
                const height = chartType === 'score' 
                  ? item.value 
                  : item.max > 0 ? (item.value / item.max) * 100 : 0;
                const color = chartType === 'score'
                  ? (item.value >= 80 ? 'from-green-500 to-green-400' : item.value >= 60 ? 'from-yellow-500 to-yellow-400' : 'from-red-500 to-red-400')
                  : 'from-blue-500 to-blue-400';
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative">
                    <div 
                      className={`w-full bg-gradient-to-t ${color} rounded-t transition-all hover:opacity-80`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    
                    {/* 툴팁 */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap shadow-lg">
                        <div className="font-medium mb-1">{item.date}</div>
                        <div>점수: {Math.round(item.avgScore)}점</div>
                        <div>이슈: {item.totalIssues}개</div>
                        <div className="text-gray-400">Critical: {item.criticalCount}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* X축 레이블 */}
            <div className="ml-12 flex gap-1 mt-2">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <span className="text-xs text-gray-400 truncate block">
                    {idx % Math.ceil(chartData.length / 7) === 0 ? item.date.slice(5) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400">
            트렌드 데이터가 없습니다
          </div>
        )}
      </div>

      {/* 분석 타임라인 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-purple-500" />
            분석 타임라인
          </h3>
          <span className="text-sm text-gray-500">{executions.length}건</span>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
          {executions.length > 0 ? executions.map((exec, idx) => (
            <div key={exec.id} className="relative">
              <button
                onClick={() => setExpandedExecution(expandedExecution === exec.id ? null : exec.id)}
                className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left"
              >
                {/* 타임라인 마커 */}
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    exec.score >= 80 ? 'bg-green-100 text-green-600' :
                    exec.score >= 60 ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {exec.score >= 80 ? <CheckCircle className="w-5 h-5" /> :
                     exec.score >= 60 ? <Activity className="w-5 h-5" /> :
                     <AlertTriangle className="w-5 h-5" />}
                  </div>
                  {idx < executions.length - 1 && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
                  )}
                </div>
                
                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xl font-bold ${
                      exec.score >= 80 ? 'text-green-600' :
                      exec.score >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {exec.score}점
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(exec.date).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{exec.totalIssues}개 이슈</span>
                    {exec.criticalCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">
                        {exec.criticalCount} Critical
                      </span>
                    )}
                    <span className="text-gray-400">
                      {Math.round(exec.duration / 1000)}초 소요
                    </span>
                  </div>
                </div>
                
                {expandedExecution === exec.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              {/* 확장 상세 */}
              {expandedExecution === exec.id && (
                <div className="px-4 pb-4 pl-18 ml-14 border-l-2 border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                      <div className="text-xs text-red-500">Critical</div>
                      <div className="text-lg font-bold text-red-600">{exec.criticalCount}</div>
                    </div>
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                      <div className="text-xs text-orange-500">High</div>
                      <div className="text-lg font-bold text-orange-600">{exec.highCount}</div>
                    </div>
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                      <div className="text-xs text-yellow-500">Medium</div>
                      <div className="text-lg font-bold text-yellow-600">{exec.mediumCount}</div>
                    </div>
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <div className="text-xs text-blue-500">Low</div>
                      <div className="text-lg font-bold text-blue-600">{exec.lowCount}</div>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/execution/${exec.id}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    상세 보기 <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          )) : (
            <div className="p-8 text-center text-gray-400">
              분석 기록이 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 심각도별 추이 테이블 */}
      {categoryTrends.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            심각도별 추이 (최근 {categoryTrends.length}회)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">날짜</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium">점수</th>
                  <th className="text-center py-3 px-4 text-red-500 font-medium">Critical</th>
                  <th className="text-center py-3 px-4 text-orange-500 font-medium">High</th>
                  <th className="text-center py-3 px-4 text-yellow-500 font-medium">Medium</th>
                  <th className="text-center py-3 px-4 text-blue-500 font-medium">Low</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium">총 이슈</th>
                </tr>
              </thead>
              <tbody>
                {categoryTrends.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.date}</td>
                    <td className="text-center py-3 px-4">
                      <span className={`font-bold ${
                        row.score >= 80 ? 'text-green-600' :
                        row.score >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {row.score}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                        row.critical > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'text-gray-400'
                      }`}>
                        {row.critical}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                        row.high > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'text-gray-400'
                      }`}>
                        {row.high}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                        row.medium > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'text-gray-400'
                      }`}>
                        {row.medium}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                        row.low > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400'
                      }`}>
                        {row.low}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                      {row.critical + row.high + row.medium + row.low}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value,
  prefix = '',
  suffix = '',
  change,
  highlight,
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number | string;
  prefix?: string;
  suffix?: string;
  change?: number;
  highlight?: 'green' | 'red' | 'gray';
}) {
  const valueColor = highlight === 'green' 
    ? 'text-green-600' 
    : highlight === 'red' 
    ? 'text-red-600' 
    : 'text-gray-900 dark:text-white';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>
        {prefix}{value}{suffix}
      </div>
      {change !== undefined && (
        <div className={`text-sm mt-1 flex items-center gap-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change >= 0 ? '+' : ''}{change.toFixed(1)}점
        </div>
      )}
    </div>
  );
}
