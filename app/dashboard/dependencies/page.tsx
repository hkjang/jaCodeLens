'use client';

/**
 * 의존성 페이지
 * 
 * - 리스트 뷰 / 그래프 뷰 토글
 * - 프로젝트 선택
 * - 순환 의존성 표시
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GitBranch, AlertTriangle, CheckCircle, Package, RefreshCw, Link2,
  List, BarChart3, FolderGit2, ArrowRight, ChevronDown
} from 'lucide-react';
import DependencyGraphViewer from '@/components/Analysis/DependencyGraphViewer';

interface Project {
  id: string;
  name: string;
}

interface DependencyData {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    issueCount?: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: string;
    isCircular: boolean;
  }>;
  circularDeps: string[][];
}

export default function DependenciesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [depData, setDepData] = useState<DependencyData>({ nodes: [], edges: [], circularDeps: [] });
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('graph');
  const [loading, setLoading] = useState(true);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // 프로젝트 목록 로드
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (e) {
        console.error('Failed to load projects', e);
      }
    }
    loadProjects();
  }, []);

  // 의존성 데이터 로드
  useEffect(() => {
    loadDependencyData();
  }, [selectedProjectId]);

  async function loadDependencyData() {
    setLoading(true);
    try {
      const url = selectedProjectId 
        ? `/api/projects/${selectedProjectId}/dependencies`
        : '/api/analysis/dependencies';
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDepData({
          nodes: data.nodes?.map((n: any) => ({
            id: n.id || n.name || n,
            name: n.name || n,
            type: n.type || 'module',
            issueCount: n.issueCount
          })) || [],
          edges: data.edges || [],
          circularDeps: data.circularDeps || []
        });
      }
    } catch (e) {
      console.error('Failed to load dependency data', e);
    } finally {
      setLoading(false);
    }
  }

  const hasData = depData.nodes.length > 0 || depData.circularDeps.length > 0;
  const circularCount = depData.circularDeps.length;
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-purple-500" />
            의존성 분석
          </h2>
          <p className="text-gray-500 mt-1">프로젝트 모듈 간 의존성을 분석하고 시각화합니다</p>
        </div>

        <div className="flex items-center gap-3">
          {/* 프로젝트 선택 */}
          <div className="relative">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition"
            >
              <FolderGit2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedProject?.name || '전체 프로젝트'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showProjectDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-10 overflow-hidden">
                <button
                  onClick={() => { setSelectedProjectId(null); setShowProjectDropdown(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${!selectedProjectId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : ''}`}
                >
                  <Package className="w-4 h-4" />
                  전체 프로젝트
                </button>
                <div className="border-t border-gray-100 dark:border-gray-700" />
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => { setSelectedProjectId(project.id); setShowProjectDropdown(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${selectedProjectId === project.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : ''}`}
                  >
                    <FolderGit2 className="w-4 h-4" />
                    {project.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 뷰 모드 토글 */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}
            >
              <List className="w-4 h-4" />
              목록
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition ${viewMode === 'graph' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}
            >
              <BarChart3 className="w-4 h-4" />
              그래프
            </button>
          </div>

          {/* 새로고침 */}
          <button
            onClick={loadDependencyData}
            disabled={loading}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{depData.nodes.length}</p>
              <p className="text-sm text-gray-500">분석된 모듈</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Link2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{depData.edges.length}</p>
              <p className="text-sm text-gray-500">의존성 연결</p>
            </div>
          </div>
        </div>
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border ${
          circularCount > 0 ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${circularCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
              {circularCount > 0 
                ? <RefreshCw className="w-6 h-6 text-red-600 dark:text-red-400" />
                : <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              }
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{circularCount}</p>
              <p className="text-sm text-gray-500">순환 의존성</p>
            </div>
          </div>
        </div>
      </div>

      {/* 순환 의존성 경고 */}
      {circularCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-700 dark:text-red-300">순환 의존성 감지됨</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                순환 의존성은 코드 유지보수를 어렵게 만듭니다. 아래 그래프에서 빨간색으로 표시된 경로를 확인하고 리팩토링을 고려하세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 메인 뷰 */}
      {viewMode === 'graph' ? (
        <DependencyGraphViewer
          nodes={depData.nodes}
          edges={depData.edges}
          circularDeps={depData.circularDeps}
          onRefresh={loadDependencyData}
          loading={loading}
        />
      ) : (
        /* 리스트 뷰 */
        <>
          {/* 순환 의존성 목록 */}
          {depData.circularDeps.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-red-500" />
                  순환 의존성 경로
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {depData.circularDeps.map((cycle, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cycle.map((node, nodeIndex) => (
                        <span key={nodeIndex} className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-mono">
                            {node}
                          </span>
                          {nodeIndex < cycle.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          )}
                        </span>
                      ))}
                      <span className="text-gray-400 text-sm">→ (순환)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 의존성 목록 */}
          {depData.edges.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-purple-500" />
                  의존성 목록
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                {depData.edges.map((edge, index) => (
                  <div key={index} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{edge.from}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{edge.to}</span>
                    {edge.isCircular && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs">
                        순환
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 빈 상태 */}
      {!hasData && !loading && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <GitBranch className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">
            의존성 정보가 없습니다
          </h3>
          <p className="text-gray-500 mt-2 mb-6">
            분석을 실행하면 의존성 그래프가 여기에 표시됩니다
          </p>
          <Link 
            href="/dashboard/execution"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            분석 실행하기
          </Link>
        </div>
      )}
    </div>
  );
}
