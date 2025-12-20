import React from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, User, Tag } from 'lucide-react';

export const metadata = {
  title: '기술 블로그 - JacodeLens | 코드 분석 인사이트',
  description: '코드 품질, 보안, AI 기반 분석에 대한 최신 기술 블로그 글을 읽어보세요.',
  keywords: ['기술 블로그', '코드 분석', 'AI', '소프트웨어 품질', '보안 분석'],
};

export default function BlogPage() {
  const posts = [
    {
      title: '병렬 AI 에이전트로 코드 분석 시간을 90% 단축하는 방법',
      excerpt: '기존의 순차적 분석 도구와 비교하여 병렬 AI 에이전트 아키텍처가 어떻게 분석 시간을 획기적으로 줄이는지 알아봅니다.',
      date: '2024-12-15',
      readTime: '8분',
      author: 'JacodeLens Team',
      tags: ['AI', '병렬 처리', '성능'],
      slug: 'parallel-ai-agents-performance',
    },
    {
      title: 'OWASP Top 10 취약점을 자동으로 탐지하는 보안 분석 에이전트',
      excerpt: '보안 분석 에이전트가 SQL Injection, XSS 등 주요 웹 보안 취약점을 어떻게 탐지하는지 상세하게 설명합니다.',
      date: '2024-12-10',
      readTime: '12분',
      author: 'Security Team',
      tags: ['보안', 'OWASP', '취약점'],
      slug: 'owasp-vulnerability-detection',
    },
    {
      title: '클린 아키텍처 원칙과 자동 검증',
      excerpt: '소프트웨어 아키텍처 원칙을 자동으로 검증하고 위반 사항을 탐지하는 방법을 소개합니다.',
      date: '2024-12-05',
      readTime: '10분',
      author: 'Architecture Team',
      tags: ['아키텍처', '클린코드', '설계'],
      slug: 'clean-architecture-validation',
    },
    {
      title: 'CI/CD 파이프라인에 코드 분석 통합하기',
      excerpt: 'GitHub Actions, Jenkins 등 CI/CD 도구와 JacodeLens를 통합하여 자동화된 코드 품질 게이트를 구축하는 방법.',
      date: '2024-11-28',
      readTime: '6분',
      author: 'DevOps Team',
      tags: ['CI/CD', 'DevOps', '자동화'],
      slug: 'cicd-integration-guide',
    },
    {
      title: '테스트 커버리지를 넘어서: 테스트 품질 분석',
      excerpt: '단순한 커버리지 수치를 넘어 테스트 코드의 실제 품질을 평가하는 방법론을 소개합니다.',
      date: '2024-11-20',
      readTime: '9분',
      author: 'QA Team',
      tags: ['테스트', '품질', '커버리지'],
      slug: 'test-quality-beyond-coverage',
    },
    {
      title: '기술 부채 정량화: 리팩토링 ROI 계산하기',
      excerpt: '코드 분석 결과를 바탕으로 기술 부채를 정량화하고 리팩토링 우선순위를 결정하는 방법.',
      date: '2024-11-12',
      readTime: '11분',
      author: 'Engineering Team',
      tags: ['기술부채', '리팩토링', 'ROI'],
      slug: 'tech-debt-quantification',
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              기술 블로그
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            코드 품질, 보안, AI 기반 분석에 대한 최신 인사이트를 공유합니다.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-8">
            {posts.map((post, i) => (
              <article 
                key={i}
                className="group bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 hover:border-blue-500/30 transition-all"
              >
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{post.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{post.readTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>{post.author}</span>
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                
                <p className="text-slate-400 mb-4">{post.excerpt}</p>
                
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, j) => (
                      <span 
                        key={j}
                        className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <Link 
                    href={`/blog/${post.slug}`}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    자세히 읽기
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">뉴스레터 구독</h2>
          <p className="text-slate-400 mb-6">
            새로운 글이 발행되면 이메일로 알려드립니다.
          </p>
          <form className="flex gap-2">
            <input 
              type="email" 
              placeholder="이메일 주소"
              className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button 
              type="submit"
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium transition-colors"
            >
              구독
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
