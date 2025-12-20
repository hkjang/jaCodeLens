'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              문의하기
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            궁금한 점이 있으시면 언제든 연락해 주세요.
            빠른 시일 내에 답변드리겠습니다.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-[2fr_1fr] gap-12">
            {/* Form */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">문의가 접수되었습니다</h3>
                  <p className="text-slate-400">영업일 기준 1-2일 내에 답변드리겠습니다.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        이름 *
                      </label>
                      <input 
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="홍길동"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        이메일 *
                      </label>
                      <input 
                        type="email"
                        required
                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      회사명
                    </label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="회사명 (선택)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      문의 유형 *
                    </label>
                    <select 
                      required
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">선택해주세요</option>
                      <option value="demo">제품 데모 요청</option>
                      <option value="pricing">가격 문의</option>
                      <option value="enterprise">엔터프라이즈 플랜</option>
                      <option value="technical">기술 지원</option>
                      <option value="partnership">파트너십</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      메시지 *
                    </label>
                    <textarea 
                      required
                      rows={5}
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="문의 내용을 자세히 적어주세요..."
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-semibold text-lg transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Send className="w-5 h-5" />
                    문의 보내기
                  </button>
                </form>
              )}
            </div>
            
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">이메일</h3>
                    <p className="text-slate-400 text-sm">일반 문의 및 지원 요청</p>
                    <a href="mailto:support@jacodelens.io" className="text-blue-400 hover:text-blue-300">
                      support@jacodelens.io
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">영업 문의</h3>
                    <p className="text-slate-400 text-sm">엔터프라이즈 플랜 상담</p>
                    <a href="mailto:sales@jacodelens.io" className="text-blue-400 hover:text-blue-300">
                      sales@jacodelens.io
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl border border-blue-500/20 p-6">
                <h3 className="font-semibold text-white mb-2">제품 데모</h3>
                <p className="text-slate-400 text-sm mb-4">
                  30분 온라인 데모를 통해 JacodeLens의 모든 기능을 직접 확인해 보세요.
                </p>
                <a 
                  href="#"
                  className="block text-center px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium transition-colors"
                >
                  데모 예약하기
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">자주 묻는 질문</h2>
          <p className="text-slate-400 mb-6">
            답변을 찾지 못하셨나요? 문의 양식을 통해 질문해 주세요.
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-left">
            {[
              { q: '무료 플랜이 있나요?', a: '네, 개인 프로젝트용 무료 플랜을 제공합니다.' },
              { q: 'On-premise 설치가 가능한가요?', a: '엔터프라이즈 플랜에서 지원됩니다.' },
              { q: '어떤 언어를 지원하나요?', a: 'JavaScript, TypeScript, Python, Java, Go 등 10개 이상의 언어를 지원합니다.' },
              { q: 'GitHub Enterprise와 연동되나요?', a: '네, GitHub, GitLab, Bitbucket Enterprise 모두 지원합니다.' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h4 className="font-medium text-white mb-1">{item.q}</h4>
                <p className="text-slate-400 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
