'use client';

import React from 'react';
import { Clock, BarChart3, TrendingUp, TrendingDown, Minus, ChevronRight, Calendar } from 'lucide-react';

interface Analysis {
  id: string;
  date: string;
  score: number;
  qualityScore: number;
  securityScore: number;
  architectureScore: number;
  issuesFound: number;
  issuesFixed: number;
}

interface AnalysisHistoryProps {
  projectId?: string;
}

export default function AnalysisHistory({ projectId }: AnalysisHistoryProps) {
  // Mock data - replace with real API calls
  const analyses: Analysis[] = [
    { id: '1', date: '2024-12-20', score: 82, qualityScore: 85, securityScore: 72, architectureScore: 88, issuesFound: 24, issuesFixed: 18 },
    { id: '2', date: '2024-12-19', score: 78, qualityScore: 80, securityScore: 70, architectureScore: 84, issuesFound: 32, issuesFixed: 12 },
    { id: '3', date: '2024-12-18', score: 75, qualityScore: 78, securityScore: 68, architectureScore: 80, issuesFound: 45, issuesFixed: 8 },
    { id: '4', date: '2024-12-17', score: 72, qualityScore: 75, securityScore: 65, architectureScore: 78, issuesFound: 52, issuesFixed: 5 },
    { id: '5', date: '2024-12-16', score: 70, qualityScore: 72, securityScore: 65, architectureScore: 75, issuesFound: 58, issuesFixed: 0 },
  ];

  const getScoreTrend = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff === 0) return { icon: <Minus className="w-4 h-4" />, color: 'text-gray-400', text: '0' };
    if (diff > 0) return { icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-500', text: `+${diff}` };
    return { icon: <TrendingDown className="w-4 h-4" />, color: 'text-red-500', text: `${diff}` };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">분석 히스토리</h2>
          <p className="text-gray-500 dark:text-gray-400">과거 분석 결과를 비교하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm">
            <option>최근 7일</option>
            <option>최근 30일</option>
            <option>최근 90일</option>
          </select>
        </div>
      </div>

      {/* Timeline Chart (simplified visual) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">점수 트렌드</h3>
        <div className="flex items-end justify-between h-32 gap-1">
          {analyses.slice().reverse().map((a, i) => (
            <div key={a.id} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs text-gray-500">{a.score}</div>
              <div 
                className={`w-full rounded-t-lg transition-all ${getScoreColor(a.score)}`}
                style={{ height: `${a.score}%` }}
              />
              <div className="text-xs text-gray-400 truncate w-full text-center">
                {new Date(a.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">날짜</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">종합 점수</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">품질</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">보안</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">이슈</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {analyses.map((analysis, index) => {
              const previousAnalysis = analyses[index + 1];
              const trend = previousAnalysis 
                ? getScoreTrend(analysis.score, previousAnalysis.score)
                : null;

              return (
                <tr 
                  key={analysis.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(analysis.date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        analysis.score >= 80 ? 'text-green-500' :
                        analysis.score >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {analysis.score}
                      </span>
                      {trend && (
                        <span className={`flex items-center gap-0.5 text-xs ${trend.color}`}>
                          {trend.icon}
                          {trend.text}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{analysis.qualityScore}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{analysis.securityScore}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <div className="text-sm">
                      <span className="text-red-500">{analysis.issuesFound}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-green-500">{analysis.issuesFixed} 해결</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
