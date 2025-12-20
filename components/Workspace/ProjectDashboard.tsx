'use client';

import React from 'react';
import { BarChart3, Shield, Layers, GitBranch, TrendingUp, TrendingDown, Minus, Clock, FolderOpen, Activity } from 'lucide-react';

interface ProjectDashboardProps {
  projectId?: string;
}

interface StatCard {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

export default function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  // Mock data - replace with real API calls
  const projectStats: StatCard[] = [
    { label: '코드 품질', value: 82, change: 5, icon: <BarChart3 className="w-5 h-5" />, color: 'text-blue-400' },
    { label: '보안 점수', value: 75, change: -2, icon: <Shield className="w-5 h-5" />, color: 'text-red-400' },
    { label: '아키텍처', value: 88, change: 0, icon: <Layers className="w-5 h-5" />, color: 'text-purple-400' },
    { label: '의존성 건강', value: 70, change: 3, icon: <GitBranch className="w-5 h-5" />, color: 'text-green-400' },
  ];

  const recentAnalyses = [
    { id: '1', date: '2024-12-20 10:30', score: 82, status: 'completed', duration: '3:24' },
    { id: '2', date: '2024-12-19 15:45', score: 78, status: 'completed', duration: '4:12' },
    { id: '3', date: '2024-12-18 09:00', score: 75, status: 'completed', duration: '3:58' },
  ];

  const getTrendIcon = (change?: number) => {
    if (!change || change === 0) return <Minus className="w-4 h-4 text-slate-500" />;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  const getTrendColor = (change?: number) => {
    if (!change || change === 0) return 'text-slate-500';
    if (change > 0) return 'text-green-400';
    return 'text-red-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">프로젝트 대시보드</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">마지막 분석: 10분 전</p>
          </div>
        </div>
        <button className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium transition-all shadow-lg shadow-blue-500/25">
          새 분석 실행
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {projectStats.map((stat, i) => (
          <div 
            key={i}
            className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={stat.color}>{stat.icon}</span>
              <div className="flex items-center gap-1">
                {getTrendIcon(stat.change)}
                <span className={`text-sm font-medium ${getTrendColor(stat.change)}`}>
                  {stat.change !== undefined && stat.change !== 0 && (stat.change > 0 ? '+' : '')}{stat.change}
                </span>
              </div>
            </div>
            <div className={`text-3xl font-bold mb-1 ${getScoreColor(stat.value as number)}`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  (stat.value as number) >= 80 ? 'bg-green-500' : 
                  (stat.value as number) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${stat.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Analyses */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">최근 분석</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {recentAnalyses.map((analysis) => (
            <div 
              key={analysis.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  analysis.score >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                  analysis.score >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                  'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  <span className="font-bold">{analysis.score}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{analysis.date}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {analysis.duration}
                  </div>
                </div>
              </div>
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                상세 보기
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
