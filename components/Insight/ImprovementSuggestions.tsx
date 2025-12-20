'use client';

import React, { useState } from 'react';
import { Lightbulb, ArrowRight, CheckCircle2, Clock, Target, Zap, TrendingUp, Filter } from 'lucide-react';

interface Suggestion {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  affectedFiles: string[];
}

interface ImprovementSuggestionsProps {
  data?: Suggestion[];
}

export default function ImprovementSuggestions({ data }: ImprovementSuggestionsProps) {
  const [filter, setFilter] = useState<string>('all');

  // Mock data
  const suggestions: Suggestion[] = data || [
    {
      id: '1',
      priority: 'high',
      category: 'Security',
      title: 'SQL Injection 취약점 수정',
      description: 'src/api/auth.ts의 쿼리를 parameterized query로 변경하세요.',
      impact: '보안 점수 +15점 예상',
      effort: 'medium',
      status: 'pending',
      affectedFiles: ['src/api/auth.ts', 'src/api/users.ts'],
    },
    {
      id: '2',
      priority: 'high',
      category: 'Architecture',
      title: '순환 의존성 해결',
      description: 'UserService와 OrderService 간 순환 참조를 인터페이스로 분리하세요.',
      impact: '유지보수성 향상, 테스트 용이성 증가',
      effort: 'high',
      status: 'in-progress',
      affectedFiles: ['src/services/userService.ts', 'src/services/orderService.ts'],
    },
    {
      id: '3',
      priority: 'medium',
      category: 'Quality',
      title: '함수 복잡도 감소',
      description: 'parser.ts의 parseData 함수를 5개의 작은 함수로 분리하세요.',
      impact: '코드 가독성 및 테스트 커버리지 향상',
      effort: 'medium',
      status: 'pending',
      affectedFiles: ['src/utils/parser.ts'],
    },
    {
      id: '4',
      priority: 'medium',
      category: 'Performance',
      title: '불필요한 리렌더링 제거',
      description: 'React.memo와 useMemo를 활용하여 컴포넌트 최적화하세요.',
      impact: '렌더링 성능 30% 향상 예상',
      effort: 'low',
      status: 'pending',
      affectedFiles: ['src/components/DataTable.tsx', 'src/components/Chart.tsx'],
    },
    {
      id: '5',
      priority: 'low',
      category: 'Style',
      title: '코딩 컨벤션 통일',
      description: 'ESLint 규칙을 적용하고 일관된 네이밍 컨벤션을 사용하세요.',
      impact: '코드 일관성 향상',
      effort: 'low',
      status: 'completed',
      affectedFiles: ['전체 프로젝트'],
    },
  ];

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'bg-red-500', text: 'text-red-500', light: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-500' };
      case 'medium': return { bg: 'bg-yellow-500', text: 'text-yellow-500', light: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-500' };
      case 'low': return { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-500', light: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-500' };
    }
  };

  const getEffortLabel = (effort: string) => {
    switch (effort) {
      case 'low': return { text: '쉬움', color: 'text-green-500' };
      case 'medium': return { text: '보통', color: 'text-yellow-500' };
      case 'high': return { text: '어려움', color: 'text-red-500' };
      default: return { text: effort, color: 'text-gray-500' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress': return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      default: return <Target className="w-5 h-5 text-gray-400" />;
    }
  };

  const filteredSuggestions = filter === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.priority === filter);

  const stats = {
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === 'pending').length,
    inProgress: suggestions.filter(s => s.status === 'in-progress').length,
    completed: suggestions.filter(s => s.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            개선 제안
          </h2>
          <p className="text-gray-500 dark:text-gray-400">우선순위 기반 실행 가능한 액션 아이템</p>
        </div>
        <div className="flex gap-2">
          {['all', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === p
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {p === 'all' ? '전체' : p === 'high' ? '높음' : p === 'medium' ? '보통' : '낮음'}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-sm text-gray-500">전체</div>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.pending}</div>
          <div className="text-sm text-gray-500">대기</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</div>
          <div className="text-sm text-blue-500">진행 중</div>
        </div>
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
          <div className="text-sm text-green-500">완료</div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {filteredSuggestions.map((suggestion) => {
          const priorityStyles = getPriorityStyles(suggestion.priority);
          const effortInfo = getEffortLabel(suggestion.effort);

          return (
            <div
              key={suggestion.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border-l-4 ${priorityStyles.border} border border-gray-100 dark:border-gray-700 p-5 transition-all hover:shadow-md ${
                suggestion.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  {getStatusIcon(suggestion.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${priorityStyles.bg}`}>
                      {suggestion.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{suggestion.category}</span>
                    <span className={`text-xs ${effortInfo.color}`}>
                      난이도: {effortInfo.text}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {suggestion.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {suggestion.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>{suggestion.impact}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-1">
                    {suggestion.affectedFiles.map((file, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono text-gray-600 dark:text-gray-400">
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
                
                {suggestion.status !== 'completed' && (
                  <button className="shrink-0 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium flex items-center gap-1 transition-colors">
                    <Zap className="w-4 h-4" />
                    시작
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
