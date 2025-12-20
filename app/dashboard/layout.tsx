'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  PlayCircle, 
  BarChart3, 
  Activity, 
  Settings,
  CheckSquare,
  FileText,
  ClipboardList,
  Shield,
  Layers,
  GitBranch,
  AlertTriangle,
  Lightbulb,
  Code2,
  Bell,
  User,
  ChevronDown
} from 'lucide-react';
import { useRole, UserRole, roleConfigs } from '@/lib/contexts/RoleContext';

const allMenuItems = {
  dashboard: { href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: '대시보드' },
  execution: { href: '/dashboard/execution', icon: <PlayCircle className="w-4 h-4" />, label: '분석 실행' },
  results: { href: '/dashboard/results', icon: <BarChart3 className="w-4 h-4" />, label: '분석 결과' },
  'code-issues': { href: '/dashboard/analysis', icon: <Code2 className="w-4 h-4" />, label: '코드 이슈' },
  improvements: { href: '/dashboard/improvements', icon: <Lightbulb className="w-4 h-4" />, label: '개선 제안' },
  architecture: { href: '/dashboard/architecture', icon: <Layers className="w-4 h-4" />, label: '아키텍처' },
  dependencies: { href: '/dashboard/dependencies', icon: <GitBranch className="w-4 h-4" />, label: '의존성' },
  'risk-heatmap': { href: '/dashboard/risks', icon: <AlertTriangle className="w-4 h-4" />, label: '리스크 맵' },
  history: { href: '/dashboard/history', icon: <FileText className="w-4 h-4" />, label: '히스토리' },
  notifications: { href: '/dashboard/notifications', icon: <Bell className="w-4 h-4" />, label: '알림' },
  operations: { href: '/dashboard/operations', icon: <Activity className="w-4 h-4" />, label: '모니터링' },
  agents: { href: '/dashboard/agents', icon: <Activity className="w-4 h-4" />, label: '에이전트' },
  queue: { href: '/dashboard/queue', icon: <ClipboardList className="w-4 h-4" />, label: '작업 큐' },
  resources: { href: '/dashboard/resources', icon: <Activity className="w-4 h-4" />, label: '리소스' },
  logs: { href: '/dashboard/logs', icon: <FileText className="w-4 h-4" />, label: '로그' },
  approvals: { href: '/dashboard/approvals', icon: <CheckSquare className="w-4 h-4" />, label: '승인 관리' },
  reports: { href: '/dashboard/reports', icon: <FileText className="w-4 h-4" />, label: '리포트' },
  'admin-roles': { href: '/admin/roles', icon: <Shield className="w-4 h-4" />, label: '역할 관리' },
  'admin-policies': { href: '/admin/policies', icon: <FileText className="w-4 h-4" />, label: '분석 정책' },
  'admin-agents': { href: '/admin/agents', icon: <Activity className="w-4 h-4" />, label: '에이전트 설정' },
  'admin-models': { href: '/admin/models', icon: <Activity className="w-4 h-4" />, label: 'AI 모델' },
  'admin-audit': { href: '/dashboard/audit', icon: <ClipboardList className="w-4 h-4" />, label: '감사 로그' },
  settings: { href: '/dashboard/settings', icon: <Settings className="w-4 h-4" />, label: '설정' },
};

const menuSections: Record<string, { title: string; items: string[] }> = {
  analysis: { title: '분석', items: ['dashboard', 'execution', 'results', 'code-issues', 'improvements', 'architecture', 'dependencies', 'risk-heatmap', 'history'] },
  operations: { title: '운영', items: ['operations', 'agents', 'queue', 'resources', 'logs', 'approvals', 'notifications'] },
  admin: { title: '관리', items: ['admin-roles', 'admin-policies', 'admin-agents', 'admin-models', 'admin-audit', 'reports', 'settings'] },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentRole, setRole, roleConfig, isMenuVisible } = useRole();
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);

  const visibleSections = Object.entries(menuSections).map(([key, section]) => ({
    ...section,
    key,
    items: section.items.filter(item => isMenuVisible(item)),
  })).filter(section => section.items.length > 0);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6">
          <Link href="/" className="block">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              JacodeLens
            </h1>
            <p className="text-xs text-gray-500 mt-1">Enterprise AI Code Analysis</p>
          </Link>
        </div>

        {/* Role Selector */}
        <div className="px-4 mb-4">
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">{roleConfig.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {roleMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                {Object.entries(roleConfigs).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => { setRole(key as UserRole); setRoleMenuOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      currentRole === key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {config.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-1">
          {visibleSections.map((section) => (
            <div key={section.key} className="mb-4">
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((itemKey) => {
                  const item = allMenuItems[itemKey as keyof typeof allMenuItems];
                  if (!item) return null;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link 
                      key={itemKey}
                      href={item.href} 
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
