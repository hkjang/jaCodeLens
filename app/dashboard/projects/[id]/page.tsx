'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, ArrowUp, ArrowDown, Minus,
  Shield, BarChart3, Layers, Activity, TestTube, FileCode,
  AlertTriangle, CheckCircle, Clock, Zap, TrendingUp, TrendingDown,
  ChevronRight, ChevronDown, ChevronUp, ExternalLink, PlayCircle, RefreshCw, Target,
  History, LineChart, Code2, Copy, Check, Sparkles, Crown, X, Info, Wrench,
  LucideIcon
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

interface CategoryConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  bgColor: string;
  borderColor: string;
  activeBorder: string;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
  recommendation: string;
  data: {
    score: number;
    issues: number;
    [key: string]: number;
  };
  metric: string;
  metricLabel: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const scoreAnimated = useRef(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjectHealth();
  }, [projectId]);

  // Scroll to detail panel when category is selected
  useEffect(() => {
    if (activeCategory && detailPanelRef.current) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [activeCategory]);

  // Animate score on load
  useEffect(() => {
    if (health && !scoreAnimated.current) {
      scoreAnimated.current = true;
      const targetScore = health.overallScore;
      const duration = 1500;
      const steps = 60;
      const stepValue = targetScore / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += stepValue;
        if (current >= targetScore) {
          setAnimatedScore(targetScore);
          clearInterval(timer);
        } else {
          setAnimatedScore(Math.round(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [health]);

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

  function copyPath() {
    if (health) {
      navigator.clipboard.writeText(health.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCategoryClick(categoryKey: string) {
    if (activeCategory === categoryKey) {
      setActiveCategory(null);
    } else {
      setActiveCategory(categoryKey);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm text-gray-500">프로젝트 정보 로딩 중...</span>
        </div>
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

  const tierColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    GOLD: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: <Crown className="w-3 h-3" /> },
    SILVER: { bg: 'bg-gray-100 dark:bg-gray-600/30', text: 'text-gray-600 dark:text-gray-300', icon: null },
    BRONZE: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: null }
  };

  const categories: CategoryConfig[] = [
    { 
      key: 'security', 
      label: '보안', 
      icon: Shield, 
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      activeBorder: 'ring-red-500',
      iconColor: 'text-red-500',
      gradientFrom: 'from-red-500',
      gradientTo: 'to-rose-600',
      description: '보안 취약점 및 위험 요소 분석',
      recommendation: '보안 이슈는 즉시 조치가 필요합니다. Critical, High 순으로 우선 처리하세요.',
      data: health.categoryScores.security, 
      metric: `${health.categoryScores.security.critical}`,
      metricLabel: 'Critical 이슈'
    },
    { 
      key: 'quality', 
      label: '품질', 
      icon: BarChart3, 
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      activeBorder: 'ring-blue-500',
      iconColor: 'text-blue-500',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-indigo-600',
      description: '코드 품질 및 유지보수성 분석',
      recommendation: '품질 개선은 장기적인 유지보수 비용을 절감합니다.',
      data: health.categoryScores.quality, 
      metric: `$${health.categoryScores.quality.maintainabilityCost}K`,
      metricLabel: '예상 유지비용'
    },
    { 
      key: 'structure', 
      label: '구조', 
      icon: Layers, 
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      activeBorder: 'ring-purple-500',
      iconColor: 'text-purple-500',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-violet-600',
      description: '아키텍처 및 코드 구조 분석',
      recommendation: '결합도를 낮추면 테스트와 유지보수가 쉬워집니다.',
      data: health.categoryScores.structure, 
      metric: `${health.categoryScores.structure.coupling}%`,
      metricLabel: '결합도'
    },
    { 
      key: 'operations', 
      label: '운영', 
      icon: Activity, 
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      activeBorder: 'ring-green-500',
      iconColor: 'text-green-500',
      gradientFrom: 'from-green-500',
      gradientTo: 'to-emerald-600',
      description: '운영 안정성 및 장애 위험 분석',
      recommendation: '장애 위험도가 높은 코드를 우선 개선하세요.',
      data: health.categoryScores.operations, 
      metric: `${health.categoryScores.operations.failureRisk}%`,
      metricLabel: '장애 위험도'
    },
    { 
      key: 'test', 
      label: '테스트', 
      icon: TestTube, 
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
      borderColor: 'border-cyan-200 dark:border-cyan-800',
      activeBorder: 'ring-cyan-500',
      iconColor: 'text-cyan-500',
      gradientFrom: 'from-cyan-500',
      gradientTo: 'to-teal-600',
      description: '테스트 커버리지 및 품질 분석',
      recommendation: '핵심 비즈니스 로직부터 테스트 커버리지를 높이세요.',
      data: health.categoryScores.test, 
      metric: `${health.categoryScores.test.coverage}%`,
      metricLabel: '테스트 커버리지'
    }
  ];

  const totalIssues = categories.reduce((acc, cat) => acc + cat.data.issues, 0);
  const activeCategoryConfig = categories.find(c => c.key === activeCategory);
  
  // Filter issues by active category
  const filteredIssues = activeCategory 
    ? health.topIssues.filter(issue => issue.category.toLowerCase() === activeCategory.toLowerCase() || 
        issue.category === activeCategory.toUpperCase())
    : health.topIssues;

  // Get severity counts for active category
  const categorySeverityCounts = activeCategory ? {
    critical: health.topIssues.filter(i => 
      (i.category.toLowerCase() === activeCategory || i.category === activeCategory.toUpperCase()) && 
      i.severity === 'CRITICAL'
    ).length,
    high: health.topIssues.filter(i => 
      (i.category.toLowerCase() === activeCategory || i.category === activeCategory.toUpperCase()) && 
      i.severity === 'HIGH'
    ).length,
    medium: health.topIssues.filter(i => 
      (i.category.toLowerCase() === activeCategory || i.category === activeCategory.toUpperCase()) && 
      i.severity === 'MEDIUM'
    ).length,
  } : null;

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/projects" 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{health.name}</h1>
                {health.tier && tierColors[health.tier] && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tierColors[health.tier].bg} ${tierColors[health.tier].text}`}>
                    {tierColors[health.tier].icon}
                    {health.tier}
                  </span>
                )}
              </div>
              <button 
                onClick={copyPath}
                className="flex items-center gap-1.5 text-gray-500 text-sm hover:text-blue-600 transition-colors group"
              >
                <span className="truncate max-w-md">{health.path}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/projects/${projectId}/history`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all hover:shadow-sm"
          >
            <History className="w-4 h-4" />
            이력
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/history/trends`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all hover:shadow-sm"
          >
            <LineChart className="w-4 h-4" />
            트렌드
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/code-elements`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all hover:shadow-sm"
          >
            <Code2 className="w-4 h-4" />
            코드 요소
          </Link>
          <Link
            href={`/dashboard/execution?project=${projectId}`}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            <PlayCircle className="w-4 h-4" />
            재분석
          </Link>
        </div>
      </div>

      {/* Health Score Hero with Animations */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="grid md:grid-cols-3 gap-8 relative z-10">
          {/* Overall Score with Animation */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle cx="72" cy="72" r="60" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
                <circle 
                  cx="72" cy="72" r="60" 
                  stroke={animatedScore >= 80 ? '#22C55E' : animatedScore >= 60 ? '#EAB308' : '#EF4444'}
                  strokeWidth="10" 
                  fill="none"
                  strokeDasharray={`${(animatedScore / 100) * 377} 377`}
                  strokeLinecap="round"
                  className="transition-all duration-100"
                  style={{
                    filter: animatedScore < 40 ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' : 'none'
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-bold ${animatedScore < 40 ? 'animate-pulse' : ''}`}>
                  {animatedScore}
                </span>
                <span className="text-sm text-gray-400 mt-1">종합 점수</span>
              </div>
            </div>
            {health.baselineScore !== null && (
              <div className={`mt-4 flex items-center justify-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-white/10 ${
                health.scoreChange > 0 ? 'text-green-400' : health.scoreChange < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {health.scoreChange > 0 ? <TrendingUp className="w-4 h-4" /> : 
                 health.scoreChange < 0 ? <TrendingDown className="w-4 h-4" /> : 
                 <Minus className="w-4 h-4" />}
                <span>{health.scoreChange > 0 ? '+' : ''}{health.scoreChange}% 기준선 대비</span>
              </div>
            )}
          </div>

          {/* Risk Indicators with Enhanced Styling */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              리스크 지표
            </h3>
            <RiskGauge label="보안 리스크" value={100 - health.categoryScores.security.score} color="red" />
            <RiskGauge label="품질 리스크" value={100 - health.categoryScores.quality.score} color="yellow" />
            <RiskGauge label="운영 리스크" value={100 - health.categoryScores.operations.score} color="orange" />
          </div>

          {/* AI Summary with Glassmorphism */}
          <div className="space-y-4">
            <div className="p-5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-white">AI 분석 요약</span>
              </div>
              <p className="text-gray-200 leading-relaxed">{health.aiSummary}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <span className="text-sm text-gray-400">분석 신뢰도</span>
              <div className="flex items-center gap-3">
                <div className="w-28 h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${health.confidence}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-green-400">{health.confidence}%</span>
              </div>
            </div>
            {health.lastAnalysis && (
              <p className="text-xs text-gray-500 text-right flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />
                마지막 분석: {new Date(health.lastAnalysis).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Analysis Cards - Interactive Drill-Down */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            카테고리별 분석
          </h3>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              선택 해제
            </button>
          )}
        </div>
        
        <div className="grid md:grid-cols-5 gap-4">
          {categories.map((cat, idx) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryClick(cat.key)}
              className={`p-5 rounded-xl border-2 transition-all text-left group relative overflow-hidden ${
                activeCategory === cat.key 
                  ? `${cat.bgColor} ${cat.borderColor} ring-2 ${cat.activeBorder} ring-offset-2 dark:ring-offset-gray-900 shadow-lg`
                  : activeCategory && activeCategory !== cat.key
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg hover:scale-[1.02]'
              }`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Progress bar background */}
              <div 
                className={`absolute bottom-0 left-0 h-1 ${
                  cat.data.score >= 80 ? 'bg-green-500' : 
                  cat.data.score >= 60 ? 'bg-yellow-500' : 
                  'bg-red-500'
                } transition-all`}
                style={{ width: `${cat.data.score}%` }}
              />
              
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${cat.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <cat.icon className={`w-5 h-5 ${cat.iconColor}`} />
                </div>
                <span className={`text-3xl font-bold ${
                  cat.data.score >= 80 ? 'text-green-500' : 
                  cat.data.score >= 60 ? 'text-yellow-500' : 
                  'text-red-500'
                }`}>
                  {cat.data.score}
                </span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">{cat.label}</p>
              <p className="text-xs text-gray-500">{cat.data.issues.toLocaleString()}개 이슈</p>
              <p className="text-xs text-gray-400 mt-1">{cat.metric} {cat.metricLabel}</p>
              
              {/* Issue proportion indicator */}
              {totalIssues > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={cat.iconColor.replace('text-', 'bg-')}
                      style={{ width: `${(cat.data.issues / totalIssues) * 100}%`, height: '100%' }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {((cat.data.issues / totalIssues) * 100).toFixed(0)}%
                  </span>
                </div>
              )}

              {/* Expand indicator */}
              <div className={`absolute right-2 bottom-3 transition-all ${
                activeCategory === cat.key ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
              }`}>
                {activeCategory === cat.key ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Category Detail Panel */}
      {activeCategory && activeCategoryConfig && (
        <div 
          ref={detailPanelRef}
          className={`bg-gradient-to-br ${activeCategoryConfig.gradientFrom} ${activeCategoryConfig.gradientTo} rounded-2xl p-6 text-white shadow-xl animate-slideDown overflow-hidden`}
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <activeCategoryConfig.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{activeCategoryConfig.label} 상세 분석</h3>
                <p className="text-white/80">{activeCategoryConfig.description}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveCategory(null)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Score & Stats */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5">
              <h4 className="text-sm font-medium text-white/70 mb-4">점수 및 통계</h4>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                    <circle 
                      cx="40" cy="40" r="34" 
                      stroke="white"
                      strokeWidth="6" 
                      fill="none"
                      strokeDasharray={`${(activeCategoryConfig.data.score / 100) * 213.5} 213.5`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{activeCategoryConfig.data.score}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold">{activeCategoryConfig.data.issues.toLocaleString()}</p>
                  <p className="text-white/70">발견된 이슈</p>
                </div>
              </div>
              
              {/* Severity breakdown */}
              {categorySeverityCounts && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-red-500/30 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{categorySeverityCounts.critical}</p>
                    <p className="text-xs text-white/70">Critical</p>
                  </div>
                  <div className="bg-orange-500/30 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{categorySeverityCounts.high}</p>
                    <p className="text-xs text-white/70">High</p>
                  </div>
                  <div className="bg-yellow-500/30 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{categorySeverityCounts.medium}</p>
                    <p className="text-xs text-white/70">Medium</p>
                  </div>
                </div>
              )}
            </div>

            {/* Key Metric */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5">
              <h4 className="text-sm font-medium text-white/70 mb-4">핵심 지표</h4>
              <div className="text-center py-4">
                <p className="text-5xl font-bold mb-2">{activeCategoryConfig.metric}</p>
                <p className="text-white/70">{activeCategoryConfig.metricLabel}</p>
              </div>
              <div className="mt-4 p-3 bg-white/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4" />
                  <span className="text-sm font-medium">권장 조치</span>
                </div>
                <p className="text-xs text-white/80">{activeCategoryConfig.recommendation}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5">
              <h4 className="text-sm font-medium text-white/70 mb-4">빠른 액션</h4>
              <div className="space-y-3">
                <Link
                  href={`/dashboard/projects/${projectId}/results?category=${activeCategory.toUpperCase()}`}
                  className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors group"
                >
                  <Target className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="font-medium">전체 이슈 보기</p>
                    <p className="text-xs text-white/60">{activeCategoryConfig.label} 관련 모든 이슈</p>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link
                  href={`/dashboard/projects/${projectId}/code-elements?category=${activeCategory}`}
                  className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors group"
                >
                  <Code2 className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="font-medium">코드 요소 분석</p>
                    <p className="text-xs text-white/60">문제 있는 코드 요소 확인</p>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <button
                  className="w-full flex items-center gap-3 p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Wrench className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">자동 수정 제안</p>
                    <p className="text-xs text-white/60">AI 기반 코드 개선 제안</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Filtered Issues Preview */}
          {filteredIssues.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {activeCategoryConfig.label} 관련 주요 이슈 ({filteredIssues.length}개)
              </h4>
              <div className="space-y-2">
                {filteredIssues.slice(0, 3).map((issue, idx) => (
                  <div 
                    key={issue.id}
                    className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/15 transition-colors"
                  >
                    <span className={`shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                      issue.severity === 'CRITICAL' ? 'bg-red-500' :
                      issue.severity === 'HIGH' ? 'bg-orange-500' :
                      'bg-yellow-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{issue.message}</p>
                      <p className="text-xs text-white/60">{issue.file}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      issue.severity === 'CRITICAL' ? 'bg-red-500/50' :
                      issue.severity === 'HIGH' ? 'bg-orange-500/50' :
                      'bg-yellow-500/50'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                ))}
              </div>
              {filteredIssues.length > 3 && (
                <Link
                  href={`/dashboard/projects/${projectId}/results?category=${activeCategory.toUpperCase()}`}
                  className="mt-3 flex items-center justify-center gap-2 text-sm py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  +{filteredIssues.length - 3}개 더 보기 <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Issues - Show all when no category selected */}
      {!activeCategory && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-red-50 to-transparent dark:from-red-900/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">즉시 조치 필요</h3>
                <p className="text-xs text-gray-500">우선순위가 높은 이슈들 - 카테고리를 클릭하여 필터링</p>
              </div>
            </div>
            <Link 
              href={`/dashboard/projects/${projectId}/results`} 
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              전체 보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {health.topIssues.slice(0, 5).map((issue, idx) => (
              <div 
                key={issue.id} 
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-start gap-4 transition-all hover:pl-6 group cursor-pointer"
                onClick={() => setActiveCategory(issue.category.toLowerCase())}
              >
                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-md ${
                  issue.severity === 'CRITICAL' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                  issue.severity === 'HIGH' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
                  'bg-gradient-to-br from-yellow-500 to-amber-500'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {issue.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer">
                      <FileCode className="w-3.5 h-3.5" />
                      {issue.file}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      issue.category === 'SECURITY' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      issue.category === 'QUALITY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      issue.category === 'OPERATIONS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {issue.category === 'SECURITY' && <Shield className="w-3 h-3" />}
                      {issue.category === 'QUALITY' && <BarChart3 className="w-3 h-3" />}
                      {issue.category === 'OPERATIONS' && <Activity className="w-3 h-3" />}
                      {issue.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      issue.severity === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{issue.impact}</p>
                </div>
                <button 
                  className="shrink-0 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all opacity-80 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  개선하기
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Chart Enhanced */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">점수 변화 추이</h3>
              <p className="text-xs text-gray-500">최근 분석 결과 기록</p>
            </div>
          </div>
          <Link
            href={`/dashboard/projects/${projectId}/history/trends`}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            상세 보기 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        {/* Chart with grid lines */}
        <div className="relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[100, 80, 60, 40, 20, 0].map((val) => (
              <div key={val} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-6 text-right">{val}</span>
                <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
              </div>
            ))}
          </div>
          
          {/* Bars */}
          <div className="h-52 flex items-end gap-2 pl-8 pr-2 pt-2">
            {health.trendData.map((point, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {point.score}점
                </div>
                <div 
                  className={`w-full max-w-[40px] rounded-t-lg transition-all cursor-pointer hover:opacity-80 ${
                    point.score >= 80 ? 'bg-gradient-to-t from-green-500 to-emerald-400' : 
                    point.score >= 60 ? 'bg-gradient-to-t from-yellow-500 to-amber-400' : 
                    'bg-gradient-to-t from-red-500 to-rose-400'
                  }`}
                  style={{ 
                    height: `${point.score * 1.8}px`,
                    animation: `growUp 0.5s ease-out ${idx * 0.1}s both`
                  }}
                />
                <span className="text-xs text-gray-400 mt-3">
                  {new Date(point.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Baseline indicator */}
        {health.baselineScore && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="w-4 h-0.5 bg-blue-500" />
            <span>기준선: {health.baselineScore}점</span>
          </div>
        )}
      </div>

      {/* Add keyframe animation */}
      <style jsx>{`
        @keyframes growUp {
          from {
            height: 0;
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

function RiskGauge({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, { bg: string; glow: string }> = {
    red: { bg: 'bg-gradient-to-r from-red-500 to-rose-500', glow: 'shadow-red-500/50' },
    yellow: { bg: 'bg-gradient-to-r from-yellow-500 to-amber-500', glow: 'shadow-yellow-500/50' },
    orange: { bg: 'bg-gradient-to-r from-orange-500 to-amber-500', glow: 'shadow-orange-500/50' },
    green: { bg: 'bg-gradient-to-r from-green-500 to-emerald-500', glow: 'shadow-green-500/50' }
  };

  const riskLevel = value >= 70 ? '높음' : value >= 40 ? '중간' : '낮음';
  const riskColor = value >= 70 ? 'text-red-400' : value >= 40 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="group">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-400">{label}</span>
        <span className={`font-medium ${riskColor} flex items-center gap-1`}>
          {value >= 70 && <AlertTriangle className="w-3 h-3" />}
          {riskLevel}
        </span>
      </div>
      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${colorClasses[color]?.bg} ${value >= 70 ? 'shadow-lg ' + colorClasses[color]?.glow : ''}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
