'use client';

import React from 'react';
import { AlertTriangle, Bug, Shield, Lightbulb, Clock, User, CheckCircle, Circle, CircleDot } from 'lucide-react';

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  estimatedHours?: number;
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
}

interface BacklogListProps {
  items: BacklogItem[];
  stats: {
    total: number;
    byStatus: {
      open: number;
      inProgress: number;
      resolved: number;
      wontFix: number;
    };
    byPriority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    estimatedHours: number;
  };
  onStatusChange?: (id: string, status: string) => void;
  onAssign?: (id: string, assignee: string) => void;
}

/**
 * 백로그 목록 컴포넌트
 */
export function BacklogList({ items, stats, onStatusChange, onAssign }: BacklogListProps) {
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'BUG': Bug,
      'SECURITY': Shield,
      'IMPROVEMENT': Lightbulb,
      'TECH_DEBT': AlertTriangle
    };
    const Icon = icons[category] || Circle;
    return <Icon className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'BUG': 'text-red-500 bg-red-100 dark:bg-red-900/30',
      'SECURITY': 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
      'IMPROVEMENT': 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
      'TECH_DEBT': 'text-orange-500 bg-orange-100 dark:bg-orange-900/30'
    };
    return colors[category] || 'text-gray-500 bg-gray-100';
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      'CRITICAL': 'bg-red-500 text-white',
      'HIGH': 'bg-orange-500 text-white',
      'MEDIUM': 'bg-yellow-500 text-white',
      'LOW': 'bg-gray-300 text-gray-700'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[priority] || 'bg-gray-200'}`}>
        {priority}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Circle className="w-4 h-4 text-gray-400" />;
      case 'IN_PROGRESS':
        return <CircleDot className="w-4 h-4 text-blue-500" />;
      case 'RESOLVED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'WONT_FIX':
        return <Circle className="w-4 h-4 text-gray-300" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-sm text-gray-500">전체 항목</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600">{stats.byPriority.critical + stats.byPriority.high}</div>
          <div className="text-sm text-gray-500">긴급/높음</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600">{stats.byStatus.inProgress}</div>
          <div className="text-sm text-gray-500">진행 중</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.estimatedHours}h</span>
          </div>
          <div className="text-sm text-gray-500">예상 작업 시간</div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            백로그 항목이 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map(item => (
              <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => {
                      const nextStatus = item.status === 'OPEN' ? 'IN_PROGRESS' : 
                                        item.status === 'IN_PROGRESS' ? 'RESOLVED' : 'OPEN';
                      onStatusChange?.(item.id, nextStatus);
                    }}
                    className="mt-1"
                  >
                    {getStatusIcon(item.status)}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`p-1 rounded ${getCategoryColor(item.category)}`}>
                        {getCategoryIcon(item.category)}
                      </span>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      {getPriorityBadge(item.priority)}
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                      {item.description.replace(/[#*`]/g, '').slice(0, 100)}...
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {item.estimatedHours && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.estimatedHours}h
                        </span>
                      )}
                      {item.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.assignedTo}
                        </span>
                      )}
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BacklogList;
