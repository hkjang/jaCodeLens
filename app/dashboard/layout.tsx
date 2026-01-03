'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  PlayCircle, 
  BarChart3, 
  Activity, 
  Settings,
  FileText,
  Shield,
  Layers,
  GitBranch,
  AlertTriangle,
  Code2,
  Bell,
  User,
  ChevronDown,
  Star,
  Target,
  ListTodo,
  History,
  TrendingUp,
  FolderGit2,
  Plus,
  ChevronRight,
  ExternalLink,
  Search
} from 'lucide-react';
import { useRole, UserRole, roleConfigs } from '@/lib/contexts/RoleContext';
import QuickActions from '@/components/QuickActions';

interface Project {
  id: string;
  name: string;
  type: string | null;
}

// 프로젝트 관련 메뉴 (프로젝트 선택 시 표시)
const projectMenuItems = [
  { href: '', icon: <LayoutDashboard className="w-4 h-4" />, label: '대시보드' },
  { href: '/code-elements', icon: <Code2 className="w-4 h-4" />, label: '코드 요소' },
  { href: '/results', icon: <BarChart3 className="w-4 h-4" />, label: '분석 결과' },
  { href: '/risks', icon: <AlertTriangle className="w-4 h-4" />, label: '리스크 맵' },
  { href: '/architecture', icon: <Layers className="w-4 h-4" />, label: '아키텍처' },
  { href: '/history/trends', icon: <TrendingUp className="w-4 h-4" />, label: '히스토리' },
  { href: '/settings', icon: <Settings className="w-4 h-4" />, label: '설정' },
];

// 전역 메뉴
const globalMenuSections = [
  {
    key: 'projects',
    title: '프로젝트',
    items: [
      { href: '/dashboard/projects', icon: <FolderGit2 className="w-4 h-4" />, label: '프로젝트 목록' },
      { href: '/dashboard/projects/new', icon: <Plus className="w-4 h-4" />, label: '새 프로젝트' },
    ]
  },
  {
    key: 'analysis',
    title: '분석',
    items: [
      { href: '/dashboard/execution', icon: <PlayCircle className="w-4 h-4" />, label: '분석 실행' },
      { href: '/dashboard/architecture', icon: <Layers className="w-4 h-4" />, label: '아키텍처' },
      { href: '/dashboard/risks', icon: <AlertTriangle className="w-4 h-4" />, label: '리스크 맵' },
    ]
  },
  {
    key: 'selfAnalysis',
    title: 'Self Analysis',
    items: [
      { href: '/dashboard/self-analysis', icon: <Star className="w-4 h-4" />, label: '개요' },
      { href: '/dashboard/self-analysis/baseline', icon: <Target className="w-4 h-4" />, label: '기준선' },
      { href: '/dashboard/self-analysis/backlog', icon: <ListTodo className="w-4 h-4" />, label: '백로그' },
    ]
  },
  {
    key: 'operations',
    title: '운영',
    items: [
      { href: '/dashboard/dependencies', icon: <GitBranch className="w-4 h-4" />, label: '의존성 분석' },
      { href: '/dashboard/operations', icon: <Activity className="w-4 h-4" />, label: '모니터링' },
      { href: '/dashboard/logs', icon: <FileText className="w-4 h-4" />, label: '로그' },
      { href: '/dashboard/notifications', icon: <Bell className="w-4 h-4" />, label: '알림' },
    ]
  },
  {
    key: 'admin',
    title: '관리',
    items: [
      { href: '/dashboard/audit', icon: <Shield className="w-4 h-4" />, label: '감사 로그' },
      { href: '/admin/models', icon: <Activity className="w-4 h-4" />, label: 'AI 모델' },
      { href: '/dashboard/settings', icon: <Settings className="w-4 h-4" />, label: '설정' },
    ]
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, setRole, roleConfig } = useRole();
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);
  
  // 프로젝트 상태
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  // MSA 대응: 프로젝트 검색 필터링 (최대 30개 표시)
  const filteredProjects = React.useMemo(() => {
    const filtered = projects.filter(p =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.type && p.type.toLowerCase().includes(projectSearch.toLowerCase()))
    );
    return filtered.slice(0, 30);
  }, [projects, projectSearch]);

  // 프로젝트 목록 로드
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          
          // URL에서 프로젝트 ID 추출하여 선택
          const match = pathname.match(/\/dashboard\/projects\/([^\/]+)/);
          if (match) {
            const found = data.find((p: Project) => p.id === match[1]);
            if (found) setSelectedProject(found);
          }
        }
      } catch (e) {
        console.error('Failed to load projects', e);
      }
    }
    loadProjects();
  }, []);

  // URL 변경 시 선택된 프로젝트 업데이트
  useEffect(() => {
    const match = pathname.match(/\/dashboard\/projects\/([^\/]+)/);
    if (match) {
      const found = projects.find(p => p.id === match[1]);
      if (found) setSelectedProject(found);
    } else {
      setSelectedProject(null);
    }
  }, [pathname, projects]);

  function selectProject(project: Project) {
    setSelectedProject(project);
    setProjectMenuOpen(false);
    router.push(`/dashboard/projects/${project.id}`);
  }

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

        {/* 프로젝트 선택기 */}
        <div className="px-4 mb-4">
          <div className="relative">
            <button
              onClick={() => setProjectMenuOpen(!projectMenuOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition ${
                selectedProject 
                  ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-200 dark:border-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <FolderGit2 className={`w-5 h-5 shrink-0 ${selectedProject ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left min-w-0">
                  {selectedProject ? (
                    <>
                      <div className="font-medium text-gray-900 dark:text-white truncate">{selectedProject.name}</div>
                      <div className="text-xs text-gray-500">{selectedProject.type || '프로젝트'}</div>
                    </>
                  ) : (
                    <div className="text-gray-500">프로젝트 선택...</div>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${projectMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {projectMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                {/* 검색 필드 */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="프로젝트 검색..."
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {projects.length > 0 ? (
                    <>
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map(project => (
                          <button
                            key={project.id}
                            onClick={() => { selectProject(project); setProjectSearch(''); }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 ${
                              selectedProject?.id === project.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <FolderGit2 className="w-4 h-4 shrink-0" />
                            <span className="truncate flex-1">{project.name}</span>
                            {project.type && <span className="text-xs text-gray-400 shrink-0">{project.type}</span>}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center text-gray-400 text-sm">
                          "{projectSearch}" 검색 결과 없음
                        </div>
                      )}
                      
                      {/* MSA 안내 */}
                      {projects.length > 30 && !projectSearch && (
                        <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100 dark:border-gray-700">
                          {projects.length - 30}개 프로젝트가 더 있습니다. 검색하세요.
                        </div>
                      )}
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                        <Link
                          href="/dashboard/projects/new"
                          onClick={() => { setProjectMenuOpen(false); setProjectSearch(''); }}
                          className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          새 프로젝트 추가
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">
                      <FolderGit2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      프로젝트가 없습니다
                      <Link href="/dashboard/projects/new" className="block mt-2 text-blue-600 hover:underline">
                        첫 프로젝트 만들기
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 프로젝트 서브 메뉴 (프로젝트 선택 시) */}
        {selectedProject && (
          <div className="px-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-2 space-y-1">
              {projectMenuItems.map(item => {
                const href = `/dashboard/projects/${selectedProject.id}${item.href}`;
                const isActive = pathname === href || (item.href === '' && pathname === `/dashboard/projects/${selectedProject.id}`);
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

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
          {globalMenuSections.map((section) => (
            <div key={section.key} className="mb-4">
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link 
                      key={item.href}
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

      {/* Quick Actions FAB */}
      <QuickActions />
    </div>
  );
}
