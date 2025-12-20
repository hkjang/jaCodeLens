import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Zap, 
  GitBranch, 
  Bot, 
  Layers, 
  Clock,
  ChevronRight,
  CircleDot,
  CheckCircle2,
  BarChart3,
  Shield,
  Code2
} from 'lucide-react';

export const metadata = {
  title: '작동 방식 - JacodeLens | 병렬 AI 코드 분석이란?',
  description: 'JacodeLens의 병렬 AI 에이전트 분석 방식을 알아보세요. 6개의 전문 에이전트가 동시에 코드를 분석하여 빠르고 정확한 결과를 제공합니다.',
  keywords: ['병렬 분석', 'AI 에이전트', '코드 분석 방식', '자동화된 코드 리뷰'],
};

export default function HowItWorksPage() {
  const steps = [
    {
      number: "01",
      title: "프로젝트 연결",
      description: "GitHub, GitLab, 또는 로컬 저장소를 연결합니다. 몇 번의 클릭만으로 설정이 완료됩니다.",
      icon: <GitBranch className="w-6 h-6" />,
    },
    {
      number: "02",
      title: "병렬 분석 시작",
      description: "6개의 AI 에이전트가 동시에 각자의 전문 분야를 분석합니다. 품질, 보안, 아키텍처, 의존성, 스타일, 테스트를 병렬로 처리합니다.",
      icon: <Bot className="w-6 h-6" />,
    },
    {
      number: "03",
      title: "실시간 모니터링",
      description: "각 에이전트의 진행 상황을 실시간으로 확인할 수 있습니다. 대시보드에서 어떤 분석이 진행 중인지 한눈에 파악하세요.",
      icon: <Clock className="w-6 h-6" />,
    },
    {
      number: "04",
      title: "결과 종합 및 제안",
      description: "모든 분석이 완료되면 AI가 결과를 종합하여 우선순위 기반 개선 제안을 제공합니다.",
      icon: <Layers className="w-6 h-6" />,
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-8">
            <Zap className="w-4 h-4" />
            병렬 분석 기술
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              병렬 AI 분석이
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              어떻게 작동하나요?
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            기존의 순차적 분석 도구와 달리, JacodeLens는 모든 분석을 동시에 실행합니다.
            이를 통해 분석 시간을 획기적으로 단축합니다.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="group grid lg:grid-cols-[120px_1fr] gap-8 items-start"
              >
                <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                  <div className="text-6xl font-bold bg-gradient-to-b from-slate-600 to-slate-800 bg-clip-text text-transparent">
                    {step.number}
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 hover:border-purple-500/30 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400 text-lg">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parallel Architecture Diagram */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                병렬 아키텍처
              </span>
            </h2>
            <p className="text-slate-400 text-lg">
              모든 에이전트가 동시에 실행되어 분석 시간을 최소화합니다.
            </p>
          </div>
          
          <div className="relative">
            {/* Central Node */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Code2 className="w-10 h-10 text-white" />
            </div>
            
            {/* Connector Lines */}
            <div className="pt-16">
              <div className="h-16 w-px bg-gradient-to-b from-blue-500 to-transparent mx-auto" />
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { icon: <BarChart3 className="w-5 h-5" />, name: "품질", color: "from-blue-500 to-blue-600" },
                  { icon: <Shield className="w-5 h-5" />, name: "보안", color: "from-red-500 to-orange-500" },
                  { icon: <Layers className="w-5 h-5" />, name: "아키텍처", color: "from-purple-500 to-pink-500" },
                  { icon: <GitBranch className="w-5 h-5" />, name: "의존성", color: "from-green-500 to-emerald-500" },
                  { icon: <Code2 className="w-5 h-5" />, name: "스타일", color: "from-yellow-500 to-amber-500" },
                  { icon: <CheckCircle2 className="w-5 h-5" />, name: "테스트", color: "from-cyan-500 to-teal-500" },
                ].map((agent, i) => (
                  <div key={i} className="flex flex-col items-center group">
                    <div className="h-8 w-px bg-gradient-to-b from-slate-600 to-transparent mb-2" />
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                      {agent.icon}
                    </div>
                    <span className="mt-2 text-sm text-slate-400">{agent.name}</span>
                    <div className="mt-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs animate-pulse">
                      실행 중
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                순차 vs 병렬 분석
              </span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Sequential */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8">
              <h3 className="text-xl font-semibold text-slate-400 mb-6">기존 순차 분석</h3>
              <div className="space-y-3">
                {["품질 분석", "보안 분석", "아키텍처 분석", "의존성 분석", "스타일 분석", "테스트 분석"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-full h-8 bg-slate-700 rounded-lg relative overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-slate-600 rounded-lg"
                        style={{ width: '100%', animationDelay: `${i * 0.5}s` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">
                        {item}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">총 소요 시간</span>
                  <span className="text-2xl font-bold text-red-400">~30분</span>
                </div>
              </div>
            </div>
            
            {/* Parallel */}
            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl border border-blue-500/30 p-8">
              <h3 className="text-xl font-semibold text-blue-400 mb-6">JacodeLens 병렬 분석</h3>
              <div className="space-y-3">
                {["품질 분석", "보안 분석", "아키텍처 분석", "의존성 분석", "스타일 분석", "테스트 분석"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-full h-8 bg-blue-950/50 rounded-lg relative overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg"
                        style={{ width: '100%' }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                        {item}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-blue-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-blue-300">총 소요 시간</span>
                  <span className="text-2xl font-bold text-green-400">~3분</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            직접 체험해 보세요
          </h2>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 font-semibold text-lg transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
          >
            무료로 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
