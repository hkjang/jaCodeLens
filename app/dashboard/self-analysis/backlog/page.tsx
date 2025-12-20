'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowLeft, Filter } from 'lucide-react';
import Link from 'next/link';
import { BacklogList } from '@/components/SelfAnalysis';

export default function BacklogPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { open: 0, inProgress: 0, resolved: 0, wontFix: 0 },
    byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
    estimatedHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '', priority: '' });

  const fetchBacklog = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.category) params.append('category', filter.category);
      if (filter.priority) params.append('priority', filter.priority);
      
      const res = await fetch(`/api/self-analysis/backlog?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setStats(data.stats || stats);
      }
    } catch (err) {
      console.error('Failed to fetch backlog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBacklog();
  }, [filter]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch('/api/self-analysis/backlog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      await fetchBacklog();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/self-analysis"
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              자동 생성 백로그
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Self-Analysis 결과에서 자동 생성된 개선 항목
            </p>
          </div>
        </div>
        <button
          onClick={fetchBacklog}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          
          <select
            value={filter.status}
            onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">모든 상태</option>
            <option value="OPEN">열림</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="RESOLVED">해결됨</option>
            <option value="WONT_FIX">수정 안함</option>
          </select>
          
          <select
            value={filter.category}
            onChange={(e) => setFilter(f => ({ ...f, category: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">모든 카테고리</option>
            <option value="BUG">버그</option>
            <option value="SECURITY">보안</option>
            <option value="IMPROVEMENT">개선</option>
            <option value="TECH_DEBT">기술 부채</option>
          </select>
          
          <select
            value={filter.priority}
            onChange={(e) => setFilter(f => ({ ...f, priority: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">모든 우선순위</option>
            <option value="CRITICAL">긴급</option>
            <option value="HIGH">높음</option>
            <option value="MEDIUM">중간</option>
            <option value="LOW">낮음</option>
          </select>
          
          {(filter.status || filter.category || filter.priority) && (
            <button
              onClick={() => setFilter({ status: '', category: '', priority: '' })}
              className="text-sm text-blue-600 hover:underline"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* Backlog List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <BacklogList 
          items={items} 
          stats={stats} 
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
