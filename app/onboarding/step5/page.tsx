'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Rocket, Code2, Activity, Layers, Shield, Eye } from 'lucide-react';

const roles = [
  {
    id: 'developer',
    icon: <Code2 className="w-8 h-8" />,
    title: '개발자',
    description: '코드 품질과 개선에 집중',
    focus: ['코드 이슈', '개선 제안', '스타일 검사'],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'operator',
    icon: <Activity className="w-8 h-8" />,
    title: '운영자',
    description: '시스템 안정성과 장애 관리',
    focus: ['에이전트 상태', '작업 큐', '장애 분석'],
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'architect',
    icon: <Layers className="w-8 h-8" />,
    title: '아키텍트',
    description: '구조와 의존성 중심',
    focus: ['아키텍처 분석', '의존성 그래프', '설계 패턴'],
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'admin',
    icon: <Shield className="w-8 h-8" />,
    title: '관리자',
    description: '정책과 리소스 관리',
    focus: ['역할 관리', '분석 정책', '모델 설정'],
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'auditor',
    icon: <Eye className="w-8 h-8" />,
    title: '감사자',
    description: '읽기 전용 모니터링',
    focus: ['감사 로그', '리포트 조회', '변경 이력'],
    color: 'from-slate-500 to-slate-600',
  },
];

export default function OnboardingStep5() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            역할 선택
          </span>
        </h1>
        <p className="text-xl text-slate-400">
          역할에 따라 대시보드와 메뉴가 최적화됩니다.
        </p>
      </div>

      {/* Role Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`
              p-6 rounded-2xl border-2 text-left transition-all
              ${selectedRole === role.id 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
              }
            `}
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4`}>
              {role.icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{role.title}</h3>
            <p className="text-slate-400 text-sm mb-3">{role.description}</p>
            <div className="space-y-1">
              {role.focus.map((item, i) => (
                <span key={i} className="inline-block mr-2 px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 text-xs">
                  {item}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="bg-slate-800/30 rounded-xl p-4 mb-8 text-center text-slate-400 text-sm">
        💡 역할은 나중에 설정에서 언제든지 변경할 수 있습니다.
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/onboarding/step4"
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 text-slate-300 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          이전
        </Link>
        
        <Link 
          href="/dashboard"
          className={`
            group flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-lg
            ${selectedRole 
              ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 shadow-green-500/30 hover:shadow-green-500/50' 
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          <Rocket className="w-5 h-5" />
          대시보드로 이동
        </Link>
      </div>
    </div>
  );
}
