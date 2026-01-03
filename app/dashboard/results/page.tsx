'use client';

/**
 * 전역 분석 결과 페이지 - 프로젝트 선택으로 리다이렉트
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, FolderGit2, ArrowRight, Plus, RefreshCw } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  type: string | null;
  lastAnalysis?: {
    score: number;
    issueCount: number;
    date: string;
  } | null;
}

export default function GlobalResultsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">분석 결과</h1>
        <p className="text-gray-500 mt-2">프로젝트를 선택하여 분석 결과를 확인하세요</p>
      </div>

      {/* 프로젝트 선택 그리드 */}
      {projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}/results`}
              className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FolderGit2 className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500">{project.type || '프로젝트'}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition" />
              </div>
              
              {project.lastAnalysis && (
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className={`font-bold ${
                    project.lastAnalysis.score >= 80 ? 'text-green-600' :
                    project.lastAnalysis.score >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {project.lastAnalysis.score}점
                  </span>
                  <span className="text-gray-500">{project.lastAnalysis.issueCount}개 이슈</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(project.lastAnalysis.date).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FolderGit2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">프로젝트가 없습니다</h3>
          <p className="text-gray-500 mb-4">먼저 프로젝트를 추가하세요</p>
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
