'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Github, Gitlab, Folder, CheckCircle2 } from 'lucide-react';

export default function OnboardingStep3() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('');

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            첫 프로젝트 등록
          </span>
        </h1>
        <p className="text-xl text-slate-400">
          분석할 프로젝트를 연결하세요. 바로 분석을 시작할 수 있습니다.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 mb-8">
        <h2 className="text-lg font-semibold text-white mb-6">저장소 유형 선택</h2>
        
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { id: 'github', icon: <Github className="w-8 h-8" />, name: 'GitHub' },
            { id: 'gitlab', icon: <Gitlab className="w-8 h-8" />, name: 'GitLab' },
            { id: 'local', icon: <Folder className="w-8 h-8" />, name: '로컬 폴더' },
          ].map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id)}
              className={`
                p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3
                ${selectedProvider === provider.id 
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                  : 'border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white'
                }
              `}
            >
              {provider.icon}
              <span className="font-medium">{provider.name}</span>
              {selectedProvider === provider.id && (
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              )}
            </button>
          ))}
        </div>

        {selectedProvider && (
          <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
            {selectedProvider === 'local' ? (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  프로젝트 경로
                </label>
                <input 
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="C:\projects\my-app 또는 /home/user/projects/my-app"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  저장소 URL
                </label>
                <input 
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder={`https://${selectedProvider}.com/username/repository`}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}
            
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-blue-400 text-sm">
                💡 지금은 건너뛰어도 됩니다. 나중에 대시보드에서 프로젝트를 추가할 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          { value: '30초', label: '연결 소요시간' },
          { value: '무제한', label: '분석 가능 횟수' },
          { value: '안전', label: '코드 격리 보장' },
        ].map((stat, i) => (
          <div key={i} className="text-center p-4 bg-slate-800/30 rounded-xl">
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-slate-400 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/onboarding/step2"
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 text-slate-300 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          이전
        </Link>
        
        <Link 
          href="/onboarding/step4"
          className="group flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
        >
          다음: 분석 미리보기
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
