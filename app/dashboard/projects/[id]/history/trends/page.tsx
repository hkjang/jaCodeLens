'use client';

/**
 * 프로젝트 분석 트렌드 페이지
 * 
 * - 이슈 추이 차트
 * - 점수 변화
 * - 카테고리별 분포
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3,
  RefreshCw, Calendar, GitBranch, AlertTriangle, CheckCircle
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

interface Stats {
  totalExecutions: number;
  currentScore: number;
  scoreChange: number;
  issuesChange: number;
  latestExecution: {
    id: string;
    date: string;
    score: number;
    totalIssues: number;
  } | null;
}

export default function ProjectTrendsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [trends, setTrends] = useState<TrendData[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, [projectId, days]);

  async function loadTrends() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/trends?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setTrends(data.trends);
        setCategoryTrends(data.categoryTrends);
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load trends', e);
    } finally {
      setLoading(false);
    }
  }

  const maxIssues = Math.max(...trends.map(t => t.totalIssues), 1);

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
            href={`/dashboard/projects/${projectId}/history`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            이력으로 돌아가기
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 트렌드</h2>
          <p className="text-gray-500">프로젝트의 분석 결과 추이</p>
        </div>
        
        {/* 기간 선택 */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value={7}>7일</option>
            <option value={14}>14일</option>
            <option value={30}>30일</option>
            <option value={90}>90일</option>
          </select>
        </div>
      </header>

      {/* 요약 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
            label="총 분석 횟수"
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
          <StatCard
            icon={<Calendar className="w-5 h-5 text-purple-500" />}
            label="최근 분석"
            value={stats.latestExecution?.date.split('T')[0] || '-'}
          />
        </div>
      )}

      {/* 이슈 추이 차트 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          이슈 추이 ({days}일)
        </h3>
        
        {trends.length > 0 ? (
          <div className="h-64">
            {/* 간단한 막대 차트 */}
            <div className="flex items-end gap-1 h-48">
              {trends.map((item, idx) => {
                const height = maxIssues > 0 ? (item.totalIssues / maxIssues) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    
                    {/* 툴팁 */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        <div className="font-medium">{item.date}</div>
                        <div>이슈: {item.totalIssues}개</div>
                        <div>분석: {item.executionCount}회</div>
                        <div>점수: {Math.round(item.avgScore)}점</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* X축 레이블 */}
            <div className="flex gap-1 mt-2">
              {trends.map((item, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <span className="text-xs text-gray-400 truncate block">
                    {item.date.slice(5)} {/* MM-DD */}
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

      {/* 심각도별 추이 */}
      {categoryTrends.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            심각도별 추이 (최근 5회)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-500">날짜</th>
                  <th className="text-center py-2 px-3 text-red-500">Critical</th>
                  <th className="text-center py-2 px-3 text-orange-500">High</th>
                  <th className="text-center py-2 px-3 text-yellow-500">Medium</th>
                  <th className="text-center py-2 px-3 text-blue-500">Low</th>
                </tr>
              </thead>
              <tbody>
                {categoryTrends.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{row.date}</td>
                    <td className="text-center py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.critical > 0 ? 'bg-red-100 text-red-700' : 'text-gray-400'
                      }`}>
                        {row.critical}
                      </span>
                    </td>
                    <td className="text-center py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.high > 0 ? 'bg-orange-100 text-orange-700' : 'text-gray-400'
                      }`}>
                        {row.high}
                      </span>
                    </td>
                    <td className="text-center py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.medium > 0 ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400'
                      }`}>
                        {row.medium}
                      </span>
                    </td>
                    <td className="text-center py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.low > 0 ? 'bg-blue-100 text-blue-700' : 'text-gray-400'
                      }`}>
                        {row.low}
                      </span>
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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>
        {prefix}{value}{suffix}
      </div>
      {change !== undefined && (
        <div className={`text-sm mt-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)} 점 변화
        </div>
      )}
    </div>
  );
}
