import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Zap, 
  Shield, 
  BarChart3, 
  Bot, 
  Layers, 
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Lock,
  Code2,
  GitBranch
} from 'lucide-react';

export const metadata = {
  title: 'JacodeLens - AI 기반 병렬 코드 분석 | 엔터프라이즈 코드 품질 플랫폼',
  description: '6개의 병렬 AI 에이전트가 동시에 코드 품질, 보안 취약점, 아키텍처, 의존성을 분석합니다. 기업용 코드 리뷰 자동화 솔루션.',
  keywords: ['코드 분석', 'AI 코드 리뷰', '보안 분석', 'SAST', '정적 분석', '병렬 분석', '엔터프라이즈'],
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'JacodeLens',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web-based',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description: 'AI 기반 병렬 코드 분석 플랫폼',
};

export default function LandingPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl" />
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            새로운 병렬 분석 엔진 출시
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
              6개의 AI 에이전트가
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              동시에 코드를 분석합니다
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            품질, 보안, 아키텍처, 의존성, 스타일, 테스트 커버리지까지.
            <br />
            병렬 AI 분석으로 코드 리뷰 시간을 <strong className="text-white">90% 단축</strong>하세요.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/dashboard" 
              className="group flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-semibold text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/how-it-works" 
              className="flex items-center gap-2 px-8 py-4 rounded-full border border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 font-medium text-lg transition-all"
            >
              작동 방식 보기
            </Link>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-16 flex items-center justify-center gap-8 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              설정 없이 바로 사용
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              SOC2 인증
            </div>
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-400" />
              GitHub/GitLab 연동
            </div>
          </div>
        </div>
      </section>

      {/* Agents Section */}
      <section className="py-24 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                6개의 전문 AI 에이전트
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              각 에이전트는 특정 분야에 특화되어 있으며, 병렬로 실행되어 빠르고 정확한 분석 결과를 제공합니다.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "품질 분석",
                description: "코드 복잡도, 중복, 유지보수성 지표를 분석합니다.",
                color: "from-blue-500 to-blue-600"
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "보안 분석",
                description: "취약점, CVE, 보안 패턴 위반을 탐지합니다.",
                color: "from-red-500 to-orange-500"
              },
              {
                icon: <Layers className="w-6 h-6" />,
                title: "아키텍처 분석",
                description: "계층 위반, 순환 의존성, 설계 패턴을 검사합니다.",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: <GitBranch className="w-6 h-6" />,
                title: "의존성 분석",
                description: "외부 라이브러리 위험도와 라이선스를 분석합니다.",
                color: "from-green-500 to-emerald-500"
              },
              {
                icon: <Code2 className="w-6 h-6" />,
                title: "스타일 분석",
                description: "코딩 컨벤션, 일관성, 가독성을 평가합니다.",
                color: "from-yellow-500 to-amber-500"
              },
              {
                icon: <CheckCircle2 className="w-6 h-6" />,
                title: "테스트 분석",
                description: "테스트 커버리지와 테스트 품질을 분석합니다.",
                color: "from-cyan-500 to-teal-500"
              },
            ].map((agent, i) => (
              <div 
                key={i}
                className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-4 shadow-lg`}>
                  {agent.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{agent.title}</h3>
                <p className="text-slate-400">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  병렬 실행으로
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  분석 시간 90% 단축
                </span>
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                기존 순차 분석 도구와 달리, JacodeLens는 모든 에이전트를 병렬로 실행합니다. 
                대규모 코드베이스도 몇 분 안에 종합 분석이 완료됩니다.
              </p>
              
              <div className="space-y-4">
                {[
                  "실시간 진행 상황 모니터링",
                  "에이전트별 세부 결과 확인",
                  "종합 점수 및 트렌드 분석",
                  "우선순위 기반 개선 제안"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-slate-800/80 rounded-2xl border border-slate-700/50 p-8">
                {/* Simulated Progress UI */}
                <div className="space-y-4">
                  {[
                    { name: "품질 분석", progress: 100, status: "완료" },
                    { name: "보안 분석", progress: 100, status: "완료" },
                    { name: "아키텍처 분석", progress: 78, status: "진행 중" },
                    { name: "의존성 분석", progress: 92, status: "진행 중" },
                    { name: "스타일 분석", progress: 100, status: "완료" },
                    { name: "테스트 분석", progress: 45, status: "진행 중" },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{item.name}</span>
                        <span className={item.status === "완료" ? "text-green-400" : "text-blue-400"}>
                          {item.status}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            item.status === "완료" 
                              ? "bg-gradient-to-r from-green-500 to-emerald-400" 
                              : "bg-gradient-to-r from-blue-500 to-cyan-400"
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400 text-sm">전체 진행률</span>
                  <span className="text-2xl font-bold text-white">86%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600/20 to-cyan-600/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            지금 바로 코드 분석을 시작하세요
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            무료 플랜으로 시작하고, 팀 규모에 따라 확장하세요.
            <br />
            신용카드 없이 바로 사용할 수 있습니다.
          </p>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-semibold text-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
          >
            무료로 시작하기
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>
    </>
  );
}
