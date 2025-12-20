import React from 'react';
import Link from 'next/link';
import { ArrowRight, Shield, BarChart3, Zap, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: '시작하기 - JacodeLens | 서비스 개요',
};

export default function OnboardingStep1() {
  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            JacodeLens에 오신 것을 환영합니다
          </span>
        </h1>
        <p className="text-xl text-slate-400">
          AI 기반 병렬 코드 분석으로 개발 품질을 혁신하세요.
        </p>
      </div>

      {/* What We Solve */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-center">
          우리가 해결하는 문제
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Zap className="w-6 h-6" />,
              title: "느린 코드 리뷰",
              description: "수동 코드 리뷰는 시간이 오래 걸리고 일관성이 없습니다."
            },
            {
              icon: <Shield className="w-6 h-6" />,
              title: "놓치는 보안 취약점",
              description: "복잡한 보안 이슈는 사람 눈으로 찾기 어렵습니다."
            },
            {
              icon: <BarChart3 className="w-6 h-6" />,
              title: "가시성 부족",
              description: "코드 품질 현황을 한눈에 파악하기 어렵습니다."
            }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
                {item.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Our Solution */}
      <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl border border-blue-500/20 p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-center">
          JacodeLens의 솔루션
        </h2>
        
        <div className="space-y-4">
          {[
            "6개의 AI 에이전트가 동시에 분석하여 시간을 90% 단축",
            "품질, 보안, 아키텍처, 의존성, 스타일, 테스트를 포괄적으로 분석",
            "명확한 개선 제안과 우선순위 제공",
            "실시간 진행 상황 모니터링"
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <span className="text-slate-300">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center">
        <Link 
          href="/onboarding/step2"
          className="group flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-semibold text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
        >
          다음: 병렬 분석 알아보기
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
