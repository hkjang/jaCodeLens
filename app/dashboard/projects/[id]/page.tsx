'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, ArrowUp, ArrowDown, Minus,
  Shield, BarChart3, Layers, Activity, TestTube, FileCode,
  AlertTriangle, CheckCircle, Clock, Zap, TrendingUp, TrendingDown,
  ChevronRight, ExternalLink, PlayCircle, RefreshCw, Target,
  History, LineChart, Code2
} from 'lucide-react';

interface ProjectHealth {
  id: string;
  name: string;
  path: string;
  description: string | null;
  type: string | null;
  tier: string;
  overallScore: number;
  baselineScore: number | null;
  scoreChange: number;
  confidence: number;
  aiSummary: string;
  lastAnalysis: string | null;
  categoryScores: {
    security: { score: number; issues: number; critical: number };
    quality: { score: number; issues: number; maintainabilityCost: number };
    structure: { score: number; issues: number; coupling: number };
    operations: { score: number; issues: number; failureRisk: number };
    test: { score: number; issues: number; coverage: number };
  };
  topIssues: Array<{
    id: string;
    severity: string;
    category: string;
    message: string;
    file: string;
    impact: string;
  }>;
  trendData: Array<{ date: string; score: number }>;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    loadProjectHealth();
  }, [projectId]);

  async function loadProjectHealth() {
    try {
      const res = await fetch(`/api/projects/${projectId}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.error('Failed to load project health', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">프로젝트를 찾을 수 없습니다</h3>
        <Link href="/dashboard/projects" className="text-blue-600 hover:underline mt-2 inline-block">
          프로젝트 목록으로
        </Link>
      </div>
    );
  }

  const categories = [
    { key: 'security', label: '보안', icon: Shield, color: 'red', data: health.categoryScores.security, metric: `${health.categoryScores.security.critical} Critical` },
    { key: 'quality', label: '품질', icon: BarChart3, color: 'blue', data: health.categoryScores.quality, metric: `$${health.categoryScores.quality.maintainabilityCost}K 유지비용` },
    { key: 'structure', label: '구조', icon: Layers, color: 'purple', data: health.categoryScores.structure, metric: `${health.categoryScores.structure.coupling}% 결합도` },
    { key: 'operations', label: '운영', icon: Activity, color: 'green', data: health.categoryScores.operations, metric: `${health.categoryScores.operations.failureRisk}% 장애위험` },
    { key: 'test', label: '테스트', icon: TestTube, color: 'cyan', data: health.categoryScores.test, metric: `${health.categoryScores.test.coverage}% 커버리지` }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/projects" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{health.name}</h1>
            <p className="text-gray-500 text-sm">{health.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/projects/${projectId}/history`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
          >
            <History className="w-4 h-4" />
            이력
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/history/trends`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
          >
            <LineChart className="w-4 h-4" />
            트렌드
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/code-elements`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
          >
            <Code2 className="w-4 h-4" />
            코드 요소
          </Link>
          <Link
            href={`/dashboard/execution?project=${projectId}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <PlayCircle className="w-4 h-4" />
            재분석
          </Link>
        </div>
      </div>

      {/* Health Score Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Overall Score */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                <circle 
                  cx="64" cy="64" r="56" 
                  stroke={health.overallScore >= 80 ? '#22C55E' : health.overallScore >= 60 ? '#EAB308' : '#EF4444'}
                  strokeWidth="8" 
                  fill="none"
                  strokeDasharray={`${(health.overallScore / 100) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{health.overallScore}</span>
                <span className="text-sm text-gray-400">종합 점수</span>
              </div>
            </div>
            {health.baselineScore !== null && (
              <div className={`mt-4 flex items-center justify-center gap-1 text-sm ${
                health.scoreChange > 0 ? 'text-green-400' : health.scoreChange < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {health.scoreChange > 0 ? <ArrowUp className="w-4 h-4" /> : 
                 health.scoreChange < 0 ? <ArrowDown className="w-4 h-4" /> : 
                 <Minus className="w-4 h-4" />}
                <span>{Math.abs(health.scoreChange)}% 기준선 대비</span>
              </div>
            )}
          </div>

          {/* Risk Indicators */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4">리스크 지표</h3>
            <RiskGauge label="보안 리스크" value={100 - health.categoryScores.security.score} color="red" />
            <RiskGauge label="품질 리스크" value={100 - health.categoryScores.quality.score} color="yellow" />
            <RiskGauge label="운영 리스크" value={100 - health.categoryScores.operations.score} color="orange" />
          </div>

          {/* AI Summary & Confidence */}
          <div className="space-y-4">
            <div className="p-4 bg-white/10 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-gray-300">AI 분석 요약</span>
              </div>
              <p className="text-white">{health.aiSummary}</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-gray-400">분석 신뢰도</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${health.confidence}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{health.confidence}%</span>
              </div>
            </div>
            {health.lastAnalysis && (
              <p className="text-xs text-gray-500 text-right">
                마지막 분석: {new Date(health.lastAnalysis).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Analysis Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              activeCategory === cat.key 
                ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/20`
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <cat.icon className={`w-5 h-5 text-${cat.color}-500`} />
              <span className={`text-2xl font-bold ${
                cat.data.score >= 80 ? 'text-green-500' : 
                cat.data.score >= 60 ? 'text-yellow-500' : 
                'text-red-500'
              }`}>
                {cat.data.score}
              </span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white mb-1">{cat.label}</p>
            <p className="text-xs text-gray-500">{cat.data.issues}개 이슈</p>
            <p className="text-xs text-gray-400 mt-1">{cat.metric}</p>
          </button>
        ))}
      </div>

      {/* Top Issues - Immediate Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">즉시 조치 필요</h3>
          </div>
          <Link href="/dashboard/results" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            전체 보기 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {health.topIssues.slice(0, 5).map((issue, idx) => (
            <div key={issue.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-start gap-4">
              <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                issue.severity === 'CRITICAL' ? 'bg-red-500' :
                issue.severity === 'HIGH' ? 'bg-orange-500' :
                'bg-yellow-500'
              }`}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{issue.message}</p>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileCode className="w-3 h-3" />
                    {issue.file}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    issue.category === 'SECURITY' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    issue.category === 'QUALITY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {issue.category}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{issue.impact}</p>
              </div>
              <button className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
                개선하기
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">점수 변화 추이</h3>
        <div className="h-48 flex items-end gap-1">
          {health.trendData.map((point, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div 
                className={`w-full rounded-t transition-all ${
                  point.score >= 80 ? 'bg-green-500' : 
                  point.score >= 60 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ height: `${point.score * 1.5}px` }}
              />
              <span className="text-xs text-gray-400 mt-2">
                {new Date(point.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskGauge({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500'
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={`font-medium ${value >= 70 ? 'text-red-400' : value >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
          {value >= 70 ? '높음' : value >= 40 ? '중간' : '낮음'}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={colorClasses[color]}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
