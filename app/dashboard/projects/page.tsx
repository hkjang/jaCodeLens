'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, FolderGit2, GitBranch, Clock, CheckCircle, 
  AlertTriangle, PlayCircle, Settings, Trash2, RefreshCw,
  ChevronRight, Search, Filter, Shield, BarChart3, Activity,
  ArrowUp, ArrowDown, Minus, Zap, ExternalLink, Archive,
  MoreVertical, Edit2, Copy
} from 'lucide-react';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UndoToast, useUndoToast } from '@/components/ui/UndoToast';
import { CUDStatusBadge, CUDStatus } from '@/components/ui/CUDStatusBadge';

interface Project {
  id: string;
  name: string;
  path: string;
  description: string | null;
  type: string | null;
  tier: string;
  status?: CUDStatus;
  lastAnalysis?: {
    score: number | null;
    status: string;
    date: string;
    issueCount: number;
    criticalCount?: number;
    scoreChange?: number;
  } | null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'date'>('date');
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  // CUD 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Undo Toast
  const undoToast = useUndoToast();

  useEffect(() => {
    fetchProjects();
  }, [showArchivedProjects]);

  async function fetchProjects() {
    try {
      const res = await fetch(`/api/projects${showArchivedProjects ? '?includeArchived=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.map((p: Project) => ({
          ...p,
          status: p.status || 'active'
        })));
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
    } finally {
      setLoading(false);
    }
  }

  async function startAnalysis(projectId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProject(projectId);
    try {
      const res = await fetch('/api/analysis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      if (res.ok) {
        window.location.href = '/dashboard/execution';
      }
    } catch (e) {
      console.error('Failed to start analysis', e);
    } finally {
      setSelectedProject(null);
    }
  }

  // 프로젝트 아카이브
  async function archiveProject(project: Project) {
    setArchiving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/archive`, {
        method: 'POST'
      });
      if (res.ok) {
        // 성공 시 목록에서 제거하고 Undo 토스트 표시
        setProjects(prev => prev.filter(p => p.id !== project.id));
        undoToast.show({
          message: `"${project.name}" 프로젝트가 아카이브되었습니다`,
          description: '30일 후 자동 삭제됩니다',
          variant: 'default',
          onUndo: async () => {
            // 아카이브 취소
            await fetch(`/api/projects/${project.id}/restore`, { method: 'POST' });
            fetchProjects();
          }
        });
      }
    } catch (e) {
      console.error('Failed to archive project', e);
    } finally {
      setArchiving(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  }

  // 프로젝트 완전 삭제
  async function deleteProject(project: Project) {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== project.id));
      }
    } catch (e) {
      console.error('Failed to delete project', e);
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  }

  // 프로젝트 복사
  async function duplicateProject(project: Project) {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${project.name} (복사본)`,
          description: project.description,
          path: project.path,
          type: project.type
        })
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch (e) {
      console.error('Failed to duplicate project', e);
    }
  }

  // 프로젝트별 액션 메뉴 생성
  function getProjectActions(project: Project): ActionMenuItem[] {
    return [
      {
        id: 'edit',
        label: '설정 편집',
        icon: <Settings className="w-4 h-4" />,
        onClick: () => window.location.href = `/dashboard/projects/${project.id}/settings`
      },
      {
        id: 'duplicate',
        label: '프로젝트 복사',
        icon: <Copy className="w-4 h-4" />,
        onClick: () => duplicateProject(project)
      },
      { id: 'divider1', label: '', divider: true },
      {
        id: 'archive',
        label: '아카이브',
        icon: <Archive className="w-4 h-4" />,
        onClick: () => {
          setProjectToDelete(project);
          setDeleteDialogOpen(true);
        }
      },
      {
        id: 'delete',
        label: '완전 삭제',
        icon: <Trash2 className="w-4 h-4" />,
        danger: true,
        onClick: () => {
          setProjectToDelete(project);
          setDeleteDialogOpen(true);
        }
      }
    ];
  }

  // 통계 계산
  const stats = {
    total: projects.length,
    analyzed: projects.filter(p => p.lastAnalysis?.status === 'COMPLETED').length,
    avgScore: Math.round(
      projects.filter(p => p.lastAnalysis?.score).reduce((sum, p) => sum + (p.lastAnalysis?.score || 0), 0) /
      (projects.filter(p => p.lastAnalysis?.score).length || 1)
    ),
    criticalIssues: projects.reduce((sum, p) => sum + (p.lastAnalysis?.criticalCount || 0), 0),
    types: [...new Set(projects.map(p => p.type).filter(Boolean))] as string[]
  };

  const filteredProjects = projects
    .filter(p => 
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.path.toLowerCase().includes(search.toLowerCase())) &&
      (!typeFilter || p.type === typeFilter)
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'score') return (b.lastAnalysis?.score || 0) - (a.lastAnalysis?.score || 0);
      return new Date(b.lastAnalysis?.date || 0).getTime() - new Date(a.lastAnalysis?.date || 0).getTime();
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">프로젝트</h2>
          <p className="text-gray-500">분석할 프로젝트를 관리하세요</p>
        </div>
        <Link 
          href="/dashboard/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-5 h-5" />
          새 프로젝트
        </Link>
      </header>

      {/* Getting Started Banner (if no projects) */}
      {projects.length === 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 text-white">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold mb-2">시작하기</h3>
            <p className="text-blue-100 mb-6">
              코드 분석을 시작하려면 먼저 프로젝트를 추가하세요. 
              Git 저장소 URL을 입력하거나 로컬 경로를 지정할 수 있습니다.
            </p>
            <Link 
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              <FolderGit2 className="w-5 h-5" />
              첫 프로젝트 추가하기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 통계 요약 카드 */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <FolderGit2 className="w-4 h-4" />
              전체 프로젝트
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              분석 완료
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.analyzed}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              평균 점수
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.avgScore || '-'}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              Critical 이슈
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.criticalIssues}</div>
          </div>
        </div>
      )}

      {/* 검색/필터/정렬 바 */}
      {projects.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
            />
          </div>

          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="">모든 유형</option>
            {stats.types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'name' | 'score' | 'date')}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="date">최근 분석순</option>
            <option value="name">이름순</option>
            <option value="score">점수순</option>
          </select>

          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded text-sm ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
            >
              카드
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
            >
              목록
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchivedProjects}
              onChange={(e) => setShowArchivedProjects(e.target.checked)}
              className="rounded border-gray-300"
            />
            아카이브
          </label>
        </div>
      )}


      {/* Projects Grid */}
      {viewMode === 'grid' && filteredProjects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div 
              key={project.id}
              className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all ${
                project.status === 'archived' ? 'opacity-60' : ''
              }`}
            >
              {/* Project Header */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <Link 
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      project.type === 'NEXTJS' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                      project.type === 'JAVA' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                      project.type === 'PYTHON' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {project.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate max-w-[180px]">{project.path}</p>
                    </div>
                  </Link>
                  
                  {/* Action Menu */}
                  <ActionMenu items={getProjectActions(project)} />
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {project.status && project.status !== 'active' && (
                    <CUDStatusBadge status={project.status} size="sm" />
                  )}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    project.tier === 'ENTERPRISE' 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {project.tier}
                  </span>
                </div>
                
                {project.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mt-2">{project.description}</p>
                )}
              </div>

              {/* Health Indicators */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                {project.lastAnalysis ? (
                  <div className="space-y-3">
                    {/* Score with Change Indicator */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {project.lastAnalysis.status === 'COMPLETED' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : project.lastAnalysis.status === 'FAILED' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">
                          {new Date(project.lastAnalysis.date).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {project.lastAnalysis.scoreChange !== undefined && project.lastAnalysis.scoreChange !== 0 && (
                          <span className={`flex items-center text-xs ${
                            project.lastAnalysis.scoreChange > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {project.lastAnalysis.scoreChange > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            {Math.abs(project.lastAnalysis.scoreChange)}%
                          </span>
                        )}
                        {project.lastAnalysis.score !== null && (
                          <span className={`text-xl font-bold ${
                            project.lastAnalysis.score >= 80 ? 'text-green-500' :
                            project.lastAnalysis.score >= 60 ? 'text-yellow-500' :
                            'text-red-500'
                          }`}>
                            {project.lastAnalysis.score}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Risk Mini Indicators */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-red-500" />
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: '30%' }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-green-500" />
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '80%' }} />
                        </div>
                      </div>
                    </div>

                    {/* Critical Issues Alert */}
                    {project.lastAnalysis.criticalCount && project.lastAnalysis.criticalCount > 0 && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                        <Zap className="w-3 h-3" />
                        {project.lastAnalysis.criticalCount}건 즉시 조치 필요
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">아직 분석을 실행하지 않았습니다</p>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => startAnalysis(project.id, e)}
                    disabled={selectedProject === project.id || project.status === 'archived'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors"
                  >
                    {selectedProject === project.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <PlayCircle className="w-3 h-3" />
                    )}
                    분석
                  </button>
                  <Link 
                    href={`/dashboard/projects/${project.id}/code-elements`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <FolderGit2 className="w-3 h-3" />
                    코드
                  </Link>
                  <Link 
                    href={`/dashboard/projects/${project.id}/results`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <BarChart3 className="w-3 h-3" />
                    결과
                  </Link>
                </div>
                <Link 
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects List View */}
      {viewMode === 'list' && filteredProjects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">프로젝트</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">유형</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">점수</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">이슈</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">최근 분석</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProjects.map(project => (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/projects/${project.id}`} className="flex items-center gap-3">
                      <FolderGit2 className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{project.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{project.path}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">{project.type || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {project.lastAnalysis?.score ? (
                      <span className={`font-bold ${project.lastAnalysis.score >= 80 ? 'text-green-500' : project.lastAnalysis.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {project.lastAnalysis.score}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {project.lastAnalysis?.issueCount ? (
                      <span className="text-sm text-gray-600 dark:text-gray-400">{project.lastAnalysis.issueCount}건</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {project.lastAnalysis?.date ? new Date(project.lastAnalysis.date).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/projects/${project.id}/code-elements`} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="코드 요소">
                        <FolderGit2 className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link href={`/dashboard/projects/${project.id}/results`} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="분석 결과">
                        <BarChart3 className="w-4 h-4 text-gray-400" />
                      </Link>
                      <button onClick={(e) => startAnalysis(project.id, e)} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="분석 시작">
                        <PlayCircle className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty Search Result */}
      {projects.length > 0 && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">검색 결과가 없습니다</p>
        </div>
      )}

      {/* Delete/Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={() => projectToDelete && deleteProject(projectToDelete)}
        onArchive={() => projectToDelete && archiveProject(projectToDelete)}
        title={`프로젝트 삭제`}
        message={`"${projectToDelete?.name}" 프로젝트를 삭제하시겠습니까?`}
        variant="danger"
        showArchiveOption={true}
        recoverable={true}
        recoverableDays={30}
        impactItems={[
          { label: '분석 기록', count: projectToDelete?.lastAnalysis ? 1 : 0 },
          { label: '관련 이슈', count: 0 }
        ]}
        confirmText="완전 삭제"
        loading={archiving}
      />

      {/* Undo Toast */}
      <undoToast.UndoToastComponent />
    </div>
  );
}
