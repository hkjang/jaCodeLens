'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, FolderGit2, GitBranch, Clock, CheckCircle, 
  AlertTriangle, PlayCircle, Settings, Trash2, RefreshCw,
  ChevronRight, Search, Filter, Shield, BarChart3, Activity,
  ArrowUp, ArrowDown, Minus, Zap, ExternalLink
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  path: string;
  description: string | null;
  type: string | null;
  tier: string;
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

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
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

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.path.toLowerCase().includes(search.toLowerCase())
  );

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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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

      {/* Search & Filter */}
      {projects.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {filteredProjects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link 
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              {/* Project Header */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      project.type === 'NEXTJS' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                      project.type === 'JAVA' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                      project.type === 'PYTHON' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.name}</h3>
                      <p className="text-xs text-gray-500 truncate max-w-[180px]">{project.path}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    project.tier === 'ENTERPRISE' 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {project.tier}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
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
                <button
                  onClick={(e) => startAnalysis(project.id, e)}
                  disabled={selectedProject === project.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg transition-colors"
                >
                  {selectedProject === project.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  분석 시작
                </button>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-xs">상세 보기</span>
                  <ExternalLink className="w-4 h-4 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty Search Result */}
      {projects.length > 0 && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}
