import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, BarChart3, Shield, Layers } from 'lucide-react';

export const metadata = {
  title: '시작하기 - JacodeLens | 분석 미리보기',
};

export default function OnboardingStep4() {
  const sampleResults = [
    { 
      category: '코드 품질', 
      icon: <BarChart3 className="w-4 h-4" />,
      score: 82, 
      issues: 12,
      color: 'text-blue-400'
    },
    { 
      category: '보안', 
      icon: <Shield className="w-4 h-4" />,
      score: 68, 
      issues: 5,
      color: 'text-red-400'
    },
    { 
      category: '아키텍처', 
      icon: <Layers className="w-4 h-4" />,
      score: 75, 
      issues: 8,
      color: 'text-purple-400'
    },
  ];

  const sampleIssues = [
    { severity: 'high', message: 'SQL Injection 취약점 발견', file: 'src/api/users.ts' },
    { severity: 'medium', message: '순환 의존성 감지', file: 'src/services/' },
    { severity: 'low', message: '미사용 import 감지', file: 'src/components/Header.tsx' },
  ];

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            분석 결과 미리보기
          </span>
        </h1>
        <p className="text-xl text-slate-400">
          이런 형태의 분석 결과를 받아보실 수 있습니다.
        </p>
      </div>

      {/* Sample Score Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {sampleResults.map((result, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={result.color}>{result.icon}</span>
              <span className="text-slate-300 text-sm">{result.category}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-white">{result.score}</div>
                <div className="text-xs text-slate-500">점수 (100점 만점)</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-yellow-400">{result.issues}</div>
                <div className="text-xs text-slate-500">이슈</div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${result.score >= 80 ? 'bg-green-500' : result.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${result.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sample Issues */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">발견된 이슈 예시</h3>
        <div className="space-y-3">
          {sampleIssues.map((issue, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50">
              <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getSeverityStyle(issue.severity)}`}>
                {issue.severity}
              </span>
              <div className="flex-1">
                <div className="text-slate-200 text-sm">{issue.message}</div>
                <div className="text-slate-500 text-xs">{issue.file}</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-slate-600" />
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2 text-slate-400 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          실제 분석에서는 더 상세한 정보와 개선 제안이 제공됩니다.
        </div>
      </div>

      {/* Benefit Highlight */}
      <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border border-green-500/20 p-6 mb-8">
        <h3 className="font-semibold text-white mb-3">분석 결과로 얻는 것</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            '우선순위 기반 개선 제안',
            '상세한 파일/라인 위치 표시',
            '구체적인 해결 방법 가이드',
            '시간에 따른 품질 트렌드',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-slate-300 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/onboarding/step3"
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 text-slate-300 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          이전
        </Link>
        
        <Link 
          href="/onboarding/step5"
          className="group flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
        >
          다음: 역할 선택
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
