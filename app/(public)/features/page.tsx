import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  BarChart3, 
  Shield, 
  Layers, 
  GitBranch, 
  Code2, 
  CheckCircle2,
  Zap,
  Eye,
  FileSearch,
  AlertTriangle,
  TrendingUp,
  Lock,
  RefreshCw,
  Target,
  Workflow
} from 'lucide-react';

export const metadata = {
  title: '기능 - JacodeLens | 코드 분석 기능 상세',
  description: 'JacodeLens의 모든 기능을 알아보세요. 품질 분석, 보안 취약점 탐지, 아키텍처 검증, 의존성 분석, 스타일 검사, 테스트 커버리지 분석을 제공합니다.',
  keywords: ['코드 품질', '보안 분석', '아키텍처 분석', 'SAST', '의존성 분석', '테스트 커버리지'],
};

export default function FeaturesPage() {
  const mainFeatures = [
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "품질 분석 에이전트",
      description: "코드 복잡도, 중복 코드, 유지보수성 지표를 분석하고 개선점을 제안합니다.",
      color: "from-blue-500 to-blue-600",
      capabilities: [
        "순환 복잡도(Cyclomatic Complexity) 측정",
        "코드 중복 탐지 및 리팩토링 제안",
        "유지보수성 지수(Maintainability Index) 계산",
        "함수/클래스 크기 분석",
      ]
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "보안 분석 에이전트",
      description: "알려진 취약점과 보안 패턴 위반을 탐지하여 보안 위험을 최소화합니다.",
      color: "from-red-500 to-orange-500",
      capabilities: [
        "OWASP Top 10 취약점 탐지",
        "CVE 데이터베이스 연동",
        "SQL Injection, XSS 패턴 감지",
        "하드코딩된 비밀키 탐지",
      ]
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: "아키텍처 분석 에이전트",
      description: "소프트웨어 구조를 분석하여 설계 원칙 위반과 아키텍처 드리프트를 감지합니다.",
      color: "from-purple-500 to-pink-500",
      capabilities: [
        "계층 간 의존성 위반 탐지",
        "순환 의존성(Circular Dependency) 감지",
        "마이크로서비스 경계 분석",
        "아키텍처 패턴 준수 검증",
      ]
    },
    {
      icon: <GitBranch className="w-8 h-8" />,
      title: "의존성 분석 에이전트",
      description: "외부 라이브러리의 보안 위험도, 라이선스, 업데이트 상태를 분석합니다.",
      color: "from-green-500 to-emerald-500",
      capabilities: [
        "취약한 의존성 탐지",
        "라이선스 호환성 검사",
        "Outdated 패키지 알림",
        "의존성 트리 시각화",
      ]
    },
    {
      icon: <Code2 className="w-8 h-8" />,
      title: "스타일 분석 에이전트",
      description: "코딩 컨벤션 준수 여부와 코드 일관성을 평가합니다.",
      color: "from-yellow-500 to-amber-500",
      capabilities: [
        "ESLint, Prettier 규칙 검증",
        "네이밍 컨벤션 검사",
        "일관된 코드 스타일 유지",
        "자동 포맷팅 제안",
      ]
    },
    {
      icon: <CheckCircle2 className="w-8 h-8" />,
      title: "테스트 분석 에이전트",
      description: "테스트 커버리지와 테스트 코드 품질을 분석합니다.",
      color: "from-cyan-500 to-teal-500",
      capabilities: [
        "라인/브랜치 커버리지 측정",
        "테스트 코드 품질 평가",
        "누락된 테스트 케이스 식별",
        "Flaky 테스트 탐지",
      ]
    },
  ];

  const additionalFeatures = [
    {
      icon: <Eye className="w-6 h-6" />,
      title: "실시간 모니터링",
      description: "분석 진행 상황을 실시간으로 확인"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "트렌드 분석",
      description: "시간에 따른 품질 변화 추적"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "우선순위 제안",
      description: "AI 기반 개선 우선순위 추천"
    },
    {
      icon: <Workflow className="w-6 h-6" />,
      title: "CI/CD 통합",
      description: "GitHub Actions, Jenkins 연동"
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "엔터프라이즈 보안",
      description: "SOC2 인증, 데이터 암호화"
    },
    {
      icon: <RefreshCw className="w-6 h-6" />,
      title: "자동 재분석",
      description: "커밋 시 자동 분석 트리거"
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-8">
            <Zap className="w-4 h-4" />
            기능 상세
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              코드 분석의 모든 것,
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              한 곳에서
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            6개의 전문 AI 에이전트가 제공하는 포괄적인 코드 분석.
            품질부터 보안까지, 모든 것을 커버합니다.
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="space-y-8">
            {mainFeatures.map((feature, index) => (
              <div 
                key={index}
                className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 hover:border-blue-500/30 transition-all"
              >
                <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
                  <div>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-slate-400">{feature.description}</p>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
                      주요 기능
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {feature.capabilities.map((cap, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm">{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                추가 기능
              </span>
            </h2>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, i) => (
              <div 
                key={i}
                className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center mb-4 text-blue-400">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            모든 기능을 무료로 체험하세요
          </h2>
          <p className="text-slate-400 mb-8">
            14일 무료 트라이얼. 신용카드 필요 없음.
          </p>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-semibold text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
          >
            무료로 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
