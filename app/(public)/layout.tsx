import React from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Shield, BarChart3, Bot, Code2, Layers } from 'lucide-react';

export const metadata = {
  title: 'JacodeLens - AI 기반 병렬 코드 분석',
  description: '병렬 AI 에이전트로 코드 품질, 보안, 아키텍처를 한 번에 분석하세요. 엔터프라이즈급 코드 리뷰 자동화 솔루션.',
  keywords: ['코드 분석', 'AI 코드 리뷰', '보안 분석', 'SAST', '정적 분석'],
  openGraph: {
    title: 'JacodeLens - AI 기반 병렬 코드 분석',
    description: '병렬 AI 에이전트로 코드 품질, 보안, 아키텍처를 한 번에 분석하세요.',
    type: 'website',
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              JacodeLens
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="/how-it-works" className="text-slate-300 hover:text-white transition-colors">
              작동 방식
            </Link>
            <Link href="/features" className="text-slate-300 hover:text-white transition-colors">
              기능
            </Link>
            <Link href="/examples" className="text-slate-300 hover:text-white transition-colors">
              분석 예시
            </Link>
            <Link href="/blog" className="text-slate-300 hover:text-white transition-colors">
              블로그
            </Link>
            <Link href="/contact" className="text-slate-300 hover:text-white transition-colors">
              문의
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-medium transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              시작하기
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg">JacodeLens</span>
              </div>
              <p className="text-slate-400 text-sm">
                AI 기반 병렬 코드 분석으로<br />
                개발 품질을 혁신합니다.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">제품</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/features" className="hover:text-white transition">기능</Link></li>
                <li><Link href="/how-it-works" className="hover:text-white transition">작동 방식</Link></li>
                <li><Link href="/examples" className="hover:text-white transition">분석 예시</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">리소스</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/blog" className="hover:text-white transition">블로그</Link></li>
                <li><Link href="/docs" className="hover:text-white transition">문서</Link></li>
                <li><Link href="/changelog" className="hover:text-white transition">변경 로그</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">회사</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/about" className="hover:text-white transition">소개</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">문의</Link></li>
                <li><Link href="/careers" className="hover:text-white transition">채용</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-500 text-sm">
            © 2024 JacodeLens. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
