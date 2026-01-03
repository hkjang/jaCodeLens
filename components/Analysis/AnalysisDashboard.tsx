'use client';

/**
 * 분석 대시보드 컴포넌트
 * 
 * - 트렌드 차트
 * - 카테고리 분포
 * - 최근 분석 요약
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, PieChart, Bell, AlertCircle } from 'lucide-react';

interface TrendData {
  date: string;
  issues: number;
  score: number;
}

interface CategoryData {
  name: string;
  count: number;
  color: string;
}

interface DashboardProps {
  projectId?: string;
}

// 간단한 막대 차트 컴포넌트
function SimpleBarChart({ data, maxValue }: { data: TrendData[], maxValue: number }) {
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((item, idx) => {
        const height = maxValue > 0 ? (item.issues / maxValue) * 100 : 0;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center group relative">
            <div 
              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
              style={{ height: `${Math.max(height, 4)}%` }}
            />
            <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
              {item.date.slice(5)} {/* MM-DD */}
            </span>
            
            {/* 툴팁 */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {item.date}: {item.issues}개 이슈
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 카테고리 분포 도넛 차트 (CSS로 구현)
function CategoryChart({ categories }: { categories: CategoryData[] }) {
  const total = categories.reduce((sum, c) => sum + c.count, 0);
  
  return (
    <div className="space-y-2">
      {categories.map((cat, idx) => {
        const percent = total > 0 ? (cat.count / total) * 100 : 0;
        return (
          <div key={idx} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${cat.color}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{cat.name}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{cat.count}</span>
            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${cat.color}`} 
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 트렌드 지표 컴포넌트
function TrendIndicator({ current, previous, label }: { current: number; previous: number; label: string }) {
  const diff = current - previous;
  const percent = previous > 0 ? Math.round((diff / previous) * 100) : 0;
  
  let Icon = Minus;
  let colorClass = 'text-gray-500';
  let bgClass = 'bg-gray-100 dark:bg-gray-800';
  
  if (diff > 0) {
    Icon = TrendingUp;
    colorClass = 'text-red-500';
    bgClass = 'bg-red-50 dark:bg-red-900/20';
  } else if (diff < 0) {
    Icon = TrendingDown;
    colorClass = 'text-green-500';
    bgClass = 'bg-green-50 dark:bg-green-900/20';
  }
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bgClass}`}>
      <Icon className={`w-4 h-4 ${colorClass}`} />
      <span className={`text-sm font-medium ${colorClass}`}>
        {diff > 0 ? '+' : ''}{percent}%
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// 알림 패널 컴포넌트
export function NotificationPanel() {
  const [notifications, setNotifications] = useState<{
    id: string;
    type: 'critical' | 'high' | 'info';
    message: string;
    time: string;
    read: boolean;
  }[]>([]);

  useEffect(() => {
    // 샘플 알림 데이터
    setNotifications([
      { id: '1', type: 'critical', message: 'SQL 인젝션 취약점 발견됨', time: '5분 전', read: false },
      { id: '2', type: 'high', message: '하드코딩된 시크릿 발견', time: '10분 전', read: false },
      { id: '3', type: 'info', message: '분석 완료: 15개 이슈 발견', time: '1시간 전', read: true },
    ]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      default: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
          알림
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
          모두 읽음
        </button>
      </div>
      
      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3 rounded-lg border ${getTypeStyles(n.type)} ${!n.read ? 'font-medium' : 'opacity-70'}`}
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{n.message}</p>
                <p className="text-xs opacity-70 mt-1">{n.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 분석 대시보드 메인 컴포넌트
export function AnalysisDashboard({ projectId }: DashboardProps) {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [projectId]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const statsRes = await fetch(`/api/analysis/stats${projectId ? `?projectId=${projectId}` : ''}`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        
        // 트렌드 데이터
        setTrendData(data.trends || []);
        
        // 카테고리 데이터
        const categoryColors: Record<string, string> = {
          SECURITY: 'bg-red-500',
          QUALITY: 'bg-blue-500',
          STRUCTURE: 'bg-purple-500',
          OPERATIONS: 'bg-green-500',
          TEST: 'bg-cyan-500',
          STANDARDS: 'bg-yellow-500',
        };
        
        const cats: CategoryData[] = Object.entries(data.byCategory || {}).map(([name, count]) => ({
          name,
          count: count as number,
          color: categoryColors[name] || 'bg-gray-500',
        }));
        setCategories(cats);
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  }

  const maxIssues = Math.max(...trendData.map(t => t.issues), 1);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
            <div className="h-32 bg-gray-100 dark:bg-gray-900 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 트렌드 차트 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            이슈 트렌드 (7일)
          </h3>
          {trendData.length >= 2 && (
            <TrendIndicator 
              current={trendData[trendData.length - 1]?.issues || 0}
              previous={trendData[trendData.length - 2]?.issues || 0}
              label="전일 대비"
            />
          )}
        </div>
        
        {trendData.length > 0 ? (
          <SimpleBarChart data={trendData} maxValue={maxIssues} />
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400">
            트렌드 데이터 없음
          </div>
        )}
      </div>

      {/* 카테고리 분포 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5" />
          카테고리 분포
        </h3>
        
        {categories.length > 0 ? (
          <CategoryChart categories={categories} />
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400">
            카테고리 데이터 없음
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalysisDashboard;
