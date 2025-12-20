'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2, Circle, Code2 } from 'lucide-react';

const steps = [
  { id: 1, name: '서비스 개요', path: '/onboarding/step1' },
  { id: 2, name: '병렬 분석', path: '/onboarding/step2' },
  { id: 3, name: '프로젝트 등록', path: '/onboarding/step3' },
  { id: 4, name: '분석 미리보기', path: '/onboarding/step4' },
  { id: 5, name: '역할 선택', path: '/onboarding/step5' },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentStepIndex = steps.findIndex(s => pathname.includes(s.path));
  const currentStep = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">JacodeLens</span>
          </Link>
          
          <Link 
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            건너뛰기
          </Link>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
            
            {/* Step Indicators */}
            <div className="relative flex justify-between">
              {steps.map((step, index) => {
                const isCompleted = index + 1 < currentStep;
                const isCurrent = index + 1 === currentStep;
                
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div 
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                        ${isCompleted 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                          : isCurrent 
                            ? 'bg-gradient-to-br from-blue-500 to-cyan-400 ring-4 ring-blue-500/30' 
                            : 'bg-slate-700'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <span className={`text-sm font-medium ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                          {step.id}
                        </span>
                      )}
                    </div>
                    <span 
                      className={`
                        mt-2 text-xs font-medium whitespace-nowrap
                        ${isCurrent ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'}
                      `}
                    >
                      {step.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-24">
        {children}
      </main>
    </div>
  );
}
