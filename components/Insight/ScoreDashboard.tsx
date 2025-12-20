'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, Shield, Layers, GitBranch, Code2, CheckCircle2 } from 'lucide-react';

interface ScoreDashboardProps {
  data?: {
    overall: number;
    quality: number;
    security: number;
    architecture: number;
    dependencies: number;
    style: number;
    tests: number;
  };
  previousData?: {
    overall: number;
    quality: number;
    security: number;
    architecture: number;
    dependencies: number;
    style: number;
    tests: number;
  };
}

export default function ScoreDashboard({ data, previousData }: ScoreDashboardProps) {
  // Default mock data
  const scores = data || {
    overall: 78,
    quality: 85,
    security: 72,
    architecture: 80,
    dependencies: 75,
    style: 90,
    tests: 68,
  };

  const prevScores = previousData || {
    overall: 74,
    quality: 82,
    security: 75,
    architecture: 78,
    dependencies: 70,
    style: 88,
    tests: 65,
  };

  const categories = [
    { key: 'quality', label: '코드 품질', icon: <BarChart3 className="w-5 h-5" />, color: 'blue' },
    { key: 'security', label: '보안', icon: <Shield className="w-5 h-5" />, color: 'red' },
    { key: 'architecture', label: '아키텍처', icon: <Layers className="w-5 h-5" />, color: 'purple' },
    { key: 'dependencies', label: '의존성', icon: <GitBranch className="w-5 h-5" />, color: 'green' },
    { key: 'style', label: '스타일', icon: <Code2 className="w-5 h-5" />, color: 'yellow' },
    { key: 'tests', label: '테스트', icon: <CheckCircle2 className="w-5 h-5" />, color: 'cyan' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-green-500', bg: 'bg-green-500', light: 'bg-green-100 dark:bg-green-900/30' };
    if (score >= 60) return { text: 'text-yellow-500', bg: 'bg-yellow-500', light: 'bg-yellow-100 dark:bg-yellow-900/30' };
    return { text: 'text-red-500', bg: 'bg-red-500', light: 'bg-red-100 dark:bg-red-900/30' };
  };

  const getTrend = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff === 0) return { icon: <Minus className="w-4 h-4 text-gray-400" />, text: '0', color: 'text-gray-400' };
    if (diff > 0) return { icon: <TrendingUp className="w-4 h-4 text-green-500" />, text: `+${diff}`, color: 'text-green-500' };
    return { icon: <TrendingDown className="w-4 h-4 text-red-500" />, text: `${diff}`, color: 'text-red-500' };
  };

  const overallColor = getScoreColor(scores.overall);
  const overallTrend = getTrend(scores.overall, prevScores.overall);

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Score Circle */}
          <div className="relative">
            <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${scores.overall * 2.64} 264`}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={scores.overall >= 80 ? '#22c55e' : scores.overall >= 60 ? '#eab308' : '#ef4444'} />
                  <stop offset="100%" stopColor={scores.overall >= 80 ? '#10b981' : scores.overall >= 60 ? '#facc15' : '#f87171'} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold ${overallColor.text}`}>{scores.overall}</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">종합 점수</span>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">종합 분석 결과</h2>
              <div className={`flex items-center gap-1 ${overallTrend.color}`}>
                {overallTrend.icon}
                <span className="font-medium">{overallTrend.text}</span>
                <span className="text-gray-400 text-sm ml-1">vs 이전</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const score = scores[cat.key as keyof typeof scores];
                const prevScore = prevScores[cat.key as keyof typeof prevScores];
                const scoreColor = getScoreColor(score);
                const trend = getTrend(score, prevScore);

                return (
                  <div 
                    key={cat.key}
                    className={`p-4 rounded-xl ${scoreColor.light} border border-gray-100 dark:border-gray-700`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`${scoreColor.text}`}>{cat.icon}</span>
                      <span className={`text-xs flex items-center gap-0.5 ${trend.color}`}>
                        {trend.icon}
                        {trend.text}
                      </span>
                    </div>
                    <div className={`text-2xl font-bold ${scoreColor.text}`}>{score}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{cat.label}</div>
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className={`h-full ${scoreColor.bg} rounded-full`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Score Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span>80+ 우수</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>60-79 보통</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>60 미만 주의</span>
        </div>
      </div>
    </div>
  );
}
