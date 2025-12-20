import React from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  PlayCircle, 
  BarChart3, 
  Activity, 
  Settings,
  CheckSquare,
  FileText,
  ClipboardList
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            JacodeLens
          </h1>
          <p className="text-xs text-gray-500 mt-1">Enterprise AI Code Analysis</p>
        </div>
        <nav className="mt-4 px-4 space-y-1">
          <NavSection title="분석">
            <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>대시보드</NavLink>
            <NavLink href="/dashboard/execution" icon={<PlayCircle className="w-4 h-4" />}>분석 실행</NavLink>
            <NavLink href="/dashboard/results" icon={<BarChart3 className="w-4 h-4" />}>분석 결과</NavLink>
          </NavSection>
          <NavSection title="운영">
            <NavLink href="/dashboard/operations" icon={<Activity className="w-4 h-4" />}>모니터링</NavLink>
            <NavLink href="/dashboard/approvals" icon={<CheckSquare className="w-4 h-4" />}>승인 관리</NavLink>
          </NavSection>
          <NavSection title="관리">
            <NavLink href="/dashboard/reports" icon={<FileText className="w-4 h-4" />}>리포트</NavLink>
            <NavLink href="/dashboard/audit" icon={<ClipboardList className="w-4 h-4" />}>감사 로그</NavLink>
            <NavLink href="/dashboard/settings" icon={<Settings className="w-4 h-4" />}>설정</NavLink>
          </NavSection>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
    >
      {icon && <span className="text-gray-400">{icon}</span>}
      {children}
    </Link>
  );
}
