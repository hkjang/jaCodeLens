'use client';

/**
 * 아키텍처 - 프로젝트 선택 페이지
 * 
 * 프로젝트를 선택하면 해당 프로젝트의 아키텍처 페이지로 이동
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, FolderGit2, Search, RefreshCw, ChevronRight } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  type: string | null;
}

export default function ArchitecturePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    const filtered = projects.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.type && p.type.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return filtered.slice(0, 50);
  }, [projects, searchQuery]);

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          
          // 프로젝트가 1개만 있으면 바로 이동
          if (data.length === 1) {
            router.push(`/dashboard/projects/${data[0].id}/architecture`);
          }
        }
      } catch (e) {
        console.error('Failed to load projects', e);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, [router]);

  function selectProject(project: Project) {
    router.push(`/dashboard/projects/${project.id}/architecture`);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">아키텍처</h2>
          <p className="text-gray-500">분석할 프로젝트를 선택하세요</p>
        </div>
      </header>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="프로젝트 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <button
              key={project.id}
              onClick={() => selectProject(project)}
              className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 hover:shadow-lg transition text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition">
                  <FolderGit2 className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition truncate">
                    {project.name}
                  </h3>
                  {project.type && (
                    <p className="text-sm text-gray-400 mt-1">{project.type}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Layers className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">
            {searchQuery ? `"${searchQuery}" 검색 결과 없음` : '프로젝트가 없습니다'}
          </h3>
          <p className="text-gray-500 mt-2">아키텍처 분석할 프로젝트를 먼저 등록하세요</p>
        </div>
      )}
    </div>
  );
}
