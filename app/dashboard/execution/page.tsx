'use client';

/**
 * 전역 파이프라인 실행 페이지 - 프로젝트 선택으로 개선
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlayCircle, FolderGit2, ArrowRight, Plus, RefreshCw, Zap, Clock, CheckCircle } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  type: string | null;
  lastAnalysis?: {
    score: number;
    status: string;
    date: string;
  } | null;
}

export default function GlobalExecutionPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingAnalysis, setStartingAnalysis] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          setProjects(await res.json());
        }
      } catch (e) {
        console.error('Failed to load projects', e);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  async function startAnalysis(projectId: string) {
    setStartingAnalysis(projectId);
    try {
      const res = await fetch('/api/analysis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      if (res.ok) {
        router.push(`/dashboard/projects/${projectId}`);
      }
    } catch (e) {
      console.error('Failed to start analysis', e);
    } finally {
      setStartingAnalysis(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <PlayCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">분석 실행</h1>
        <p className="text-gray-500 mt-2">프로젝트를 선택하여 코드 분석을 시작하세요</p>
      </div>

      {/* 프로젝트 선택 그리드 */}
      {projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map(project => (
            <div
              key={project.id}
              className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FolderGit2 className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500">{project.type || '프로젝트'}</p>
                  </div>
                </div>
              </div>
              
              {project.lastAnalysis && (
                <div className="flex items-center gap-3 mb-4 text-sm">
                  {project.lastAnalysis.status === 'COMPLETED' ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      완료
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600">
                      <Clock className="w-4 h-4" />
                      진행 중
                    </span>
                  )}
                  <span className="text-gray-400 text-xs">
                    {new Date(project.lastAnalysis.date).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startAnalysis(project.id)}
                  disabled={startingAnalysis === project.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition"
                >
                  {startingAnalysis === project.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  분석 시작
                </button>
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  상세
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FolderGit2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">프로젝트가 없습니다</h3>
          <p className="text-gray-500 mb-4">분석할 프로젝트를 먼저 추가하세요</p>
          <Link 
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            새 프로젝트 추가
          </Link>
        </div>
      )}
    </div>
  );
}
