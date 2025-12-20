import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  BarChart3, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Code2,
  FileCode2,
  Layers
} from 'lucide-react';

export const metadata = {
  title: '분석 예시 - JacodeLens | 실제 코드 분석 결과 샘플',
  description: 'JacodeLens의 실제 코드 분석 결과를 확인하세요. 품질 점수, 보안 취약점 탐지, 아키텍처 분석 결과의 실제 예시를 제공합니다.',
  keywords: ['코드 분석 예시', '코드 리뷰 샘플', '보안 분석 결과', '품질 분석 데모'],
};

export default function ExamplesPage() {
  const sampleResults = {
    overallScore: 78,
    quality: 85,
    security: 72,
    architecture: 80,
    dependencies: 75,
    style: 90,
    tests: 68,
  };

  const sampleIssues = [
    {
      severity: 'critical',
      category: 'Security',
      file: 'src/api/auth.ts',
      line: 42,
      message: 'SQL Injection 취약점 발견',
      suggestion: 'Parameterized query를 사용하세요.',
    },
    {
      severity: 'high',
      category: 'Architecture',
      file: 'src/services/userService.ts',
      line: 156,
      message: '순환 의존성 감지: UserService → OrderService → UserService',
      suggestion: '인터페이스를 통한 의존성 역전을 적용하세요.',
    },
    {
      severity: 'medium',
      category: 'Quality',
      file: 'src/utils/parser.ts',
      line: 89,
      message: '함수 복잡도가 높습니다 (Cyclomatic: 15)',
      suggestion: '함수를 작은 단위로 분리하세요.',
    },
    {
      severity: 'low',
      category: 'Style',
      file: 'src/components/Button.tsx',
      line: 12,
      message: '네이밍 컨벤션 위반: handleclick → handleClick',
      suggestion: 'camelCase를 사용하세요.',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              실제 분석 결과
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              미리보기
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            JacodeLens가 실제 프로젝트를 분석한 결과 샘플입니다.
            이와 같은 상세한 분석 결과를 받아보세요.
          </p>
        </div>
      </section>

      {/* Score Dashboard Preview */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">종합 분석 점수</h2>
            
            <div className="grid lg:grid-cols-[200px_1fr] gap-8">
              {/* Overall Score */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-slate-700"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${sampleResults.overallScore * 2.83} 283`}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">{sampleResults.overallScore}</span>
                  </div>
                </div>
                <span className="mt-4 text-slate-400">종합 점수</span>
              </div>
              
              {/* Category Scores */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: '코드 품질', score: sampleResults.quality, icon: <BarChart3 className="w-5 h-5" /> },
                  { name: '보안', score: sampleResults.security, icon: <Shield className="w-5 h-5" /> },
                  { name: '아키텍처', score: sampleResults.architecture, icon: <Layers className="w-5 h-5" /> },
                  { name: '의존성', score: sampleResults.dependencies, icon: <Code2 className="w-5 h-5" /> },
                  { name: '스타일', score: sampleResults.style, icon: <FileCode2 className="w-5 h-5" /> },
                  { name: '테스트', score: sampleResults.tests, icon: <CheckCircle2 className="w-5 h-5" /> },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-slate-400">
                        {item.icon}
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className={`text-lg font-bold ${getScoreColor(item.score)}`}>
                        {item.score}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          item.score >= 80 ? 'bg-green-500' : item.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Issues Preview */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">발견된 이슈</h2>
            
            <div className="space-y-4">
              {sampleIssues.map((issue, i) => (
                <div 
                  key={i}
                  className={`p-4 rounded-xl border ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <span className="text-slate-400 text-sm">{issue.category}</span>
                      </div>
                      <p className="text-white font-medium mb-1">{issue.message}</p>
                      <p className="text-slate-500 text-sm">{issue.file}:{issue.line}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      <p className="text-slate-300 text-sm">{issue.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            나의 프로젝트도 분석해 보세요
          </h2>
          <p className="text-slate-400 mb-8">
            무료로 첫 번째 분석을 실행하고 상세한 결과를 확인하세요.
          </p>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 font-semibold text-lg transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
          >
            지금 분석 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
