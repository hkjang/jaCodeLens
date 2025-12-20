import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, BarChart3, Shield, Layers, GitBranch, Code2, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: '시작하기 - JacodeLens | 병렬 분석 이해하기',
};

export default function OnboardingStep2() {
  const agents = [
    { icon: <BarChart3 className="w-5 h-5" />, name: "품질 분석", color: "from-blue-500 to-blue-600" },
    { icon: <Shield className="w-5 h-5" />, name: "보안 분석", color: "from-red-500 to-orange-500" },
    { icon: <Layers className="w-5 h-5" />, name: "아키텍처", color: "from-purple-500 to-pink-500" },
    { icon: <GitBranch className="w-5 h-5" />, name: "의존성", color: "from-green-500 to-emerald-500" },
    { icon: <Code2 className="w-5 h-5" />, name: "스타일", color: "from-yellow-500 to-amber-500" },
    { icon: <CheckCircle2 className="w-5 h-5" />, name: "테스트", color: "from-cyan-500 to-teal-500" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            병렬 AI 에이전트란?
          </span>
        </h1>
        <p className="text-xl text-slate-400">
          6개의 전문 에이전트가 동시에 코드를 분석합니다.
        </p>
      </div>

      {/* Parallel Visualization */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 mb-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Code2 className="w-10 h-10 text-white" />
          </div>
          <p className="text-slate-400">프로젝트 코드</p>
          
          {/* Connector */}
          <div className="w-px h-8 bg-gradient-to-b from-blue-500 to-transparent mx-auto my-2" />
          <div className="w-64 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto" />
        </div>
        
        {/* Agents Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {agents.map((agent, i) => (
            <div key={i} className="flex flex-col items-center group">
              <div className="w-px h-4 bg-gradient-to-b from-blue-500/50 to-transparent mb-2" />
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                {agent.icon}
              </div>
              <span className="mt-2 text-xs text-slate-400 text-center">{agent.name}</span>
              <div className="mt-2 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] animate-pulse">
                병렬 실행
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Benefits */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">⚡ 기존 순차 분석</h3>
          <div className="space-y-2 text-slate-400 text-sm">
            <p>• 하나씩 차례로 분석</p>
            <p>• 전체 분석 시간: ~30분</p>
            <p>• 병목 현상 발생</p>
          </div>
          <div className="mt-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            느림
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl border border-blue-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">🚀 JacodeLens 병렬 분석</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p>• 모든 에이전트 동시 실행</p>
            <p>• 전체 분석 시간: ~3분</p>
            <p>• 효율적인 리소스 활용</p>
          </div>
          <div className="mt-4 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
            90% 빠름
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/onboarding/step1"
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 text-slate-300 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          이전
        </Link>
        
        <Link 
          href="/onboarding/step3"
          className="group flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
        >
          다음: 첫 프로젝트 등록
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
