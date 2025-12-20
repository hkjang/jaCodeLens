import React from 'react';
import Link from 'next/link';
import { Shield, FileText, Bot, Brain, ClipboardList, ChevronRight } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminMenus = [
    { href: '/admin/roles', icon: <Shield className="w-5 h-5" />, label: '역할 관리' },
    { href: '/admin/policies', icon: <FileText className="w-5 h-5" />, label: '분석 정책' },
    { href: '/admin/agents', icon: <Bot className="w-5 h-5" />, label: '에이전트 설정' },
    { href: '/admin/models', icon: <Brain className="w-5 h-5" />, label: 'AI 모델' },
    { href: '/admin/audit', icon: <ClipboardList className="w-5 h-5" />, label: '감사 로그' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              ← 대시보드
            </Link>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">관리자</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 shrink-0">
            <nav className="space-y-1">
              {adminMenus.map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all group"
                >
                  {menu.icon}
                  <span className="flex-1">{menu.label}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
