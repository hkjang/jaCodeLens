'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Shield, FileText, Bot, Brain, ClipboardList, ChevronRight, MessageSquare, 
  ChevronLeft, LayoutDashboard
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  
  const adminMenus = [
    { href: '/admin/roles', icon: <Shield className="w-5 h-5" />, label: '역할 관리' },
    { href: '/admin/policies', icon: <FileText className="w-5 h-5" />, label: '분석 정책' },
    { href: '/admin/agents', icon: <Bot className="w-5 h-5" />, label: '에이전트' },
    { href: '/admin/prompts', icon: <MessageSquare className="w-5 h-5" />, label: 'AI 프롬프트' },
    { href: '/admin/models', icon: <Brain className="w-5 h-5" />, label: 'AI 모델' },
    { href: '/admin/audit', icon: <ClipboardList className="w-5 h-5" />, label: '감사 로그' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm transition">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">대시보드</span>
            </Link>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">관리자</h1>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside 
          className={`${collapsed ? 'w-16' : 'w-56'} shrink-0 transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-57px)] sticky top-14`}
        >
          <nav className="p-3 space-y-1">
            {adminMenus.map((menu) => {
              const isActive = pathname === menu.href;
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={collapsed ? menu.label : undefined}
                >
                  <span className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'}>
                    {menu.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-sm">{menu.label}</span>
                      <ChevronRight className={`w-4 h-4 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
          
          {/* Collapse Button */}
          <div className="absolute bottom-4 left-0 right-0 px-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
              {!collapsed && <span className="text-xs">접기</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 min-w-0">
          <div className="max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
