'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Lightbulb, AlertTriangle, FileCode, Zap, Target, 
  Plus, User, Clock, CheckCircle, XCircle, 
  GripVertical, MoreVertical, ChevronDown, RefreshCw,
  Calendar, Users, Filter
} from 'lucide-react';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UndoToast, useUndoToast } from '@/components/ui/UndoToast';

// 태스크 상태 정의
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  severity: string;
  category: string;
  filePath: string;
  lineStart: number;
  estimatedHours: number;
  assignee?: string;
  dueDate?: string;
  createdAt: string;
}

// 칸반 열 설정
const columnConfig: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  TODO: { label: '할 일', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  IN_PROGRESS: { label: '진행 중', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  REVIEW: { label: '검토', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  DONE: { label: '완료', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' }
};

// 우선순위 설정
const priorityConfig: Record<string, { color: string; label: string; bgColor: string }> = {
  CRITICAL: { color: 'text-red-600', label: '긴급', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  HIGH: { color: 'text-orange-600', label: '높음', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  MEDIUM: { color: 'text-yellow-600', label: '보통', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  LOW: { color: 'text-blue-600', label: '낮음', bgColor: 'bg-blue-100 dark:bg-blue-900/30' }
};

// 카테고리 아이콘
function getCategoryIcon(category: string) {
  switch (category) {
    case 'SECURITY': return AlertTriangle;
    case 'QUALITY': return Zap;
    case 'STRUCTURE': return Target;
    default: return FileCode;
  }
}

export default function ImprovementsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  
  const undoToast = useUndoToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/pipeline/issues?limit=50');
      if (res.ok) {
        const data = await res.json();
        // 이슈를 태스크로 변환
        const mappedTasks: Task[] = (data.items || [])
          .filter((issue: any) => issue.suggestion || issue.aiSuggestion)
          .map((issue: any) => ({
            id: issue.id,
            title: issue.message.slice(0, 80) + (issue.message.length > 80 ? '...' : ''),
            description: issue.suggestion || issue.aiSuggestion || '',
            status: 'TODO' as TaskStatus,
            severity: issue.severity,
            category: issue.mainCategory,
            filePath: issue.filePath,
            lineStart: issue.lineStart,
            estimatedHours: estimateHours(issue.severity),
            createdAt: new Date().toISOString()
          }));
        setTasks(mappedTasks);
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    } finally {
      setLoading(false);
    }
  }

  function estimateHours(severity: string): number {
    switch (severity) {
      case 'CRITICAL': return 2;
      case 'HIGH': return 4;
      case 'MEDIUM': return 8;
      default: return 16;
    }
  }

  // 드래그 시작
  const handleDragStart = useCallback((task: Task) => {
    setDraggedTask(task);
  }, []);

  // 드래그 오버
  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  }, []);

  // 드롭
  const handleDrop = useCallback((status: TaskStatus) => {
    if (draggedTask && draggedTask.status !== status) {
      const previousStatus = draggedTask.status;
      
      setTasks(prev => prev.map(t => 
        t.id === draggedTask.id ? { ...t, status } : t
      ));

      undoToast.show({
        message: `"${draggedTask.title.slice(0, 30)}..." 상태 변경됨`,
        description: `${columnConfig[previousStatus].label} → ${columnConfig[status].label}`,
        variant: 'success',
        onUndo: () => {
          setTasks(prev => prev.map(t => 
            t.id === draggedTask.id ? { ...t, status: previousStatus } : t
          ));
        }
      });
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  }, [draggedTask, undoToast]);

  // 태스크 상태 변경
  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const previousStatus = task.status;
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

    undoToast.show({
      message: '태스크 상태가 변경되었습니다',
      variant: 'success',
      onUndo: () => {
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: previousStatus } : t
        ));
      }
    });
  }, [tasks, undoToast]);

  // 태스크 완료 처리
  const completeTask = useCallback((task: Task) => {
    updateTaskStatus(task.id, 'DONE');
    setShowCompleteDialog(false);
    setTaskToComplete(null);
  }, [updateTaskStatus]);

  // 태스크 액션 메뉴
  function getTaskActions(task: Task): ActionMenuItem[] {
    return [
      {
        id: 'start',
        label: '시작하기',
        icon: <Zap className="w-4 h-4" />,
        disabled: task.status !== 'TODO',
        onClick: () => updateTaskStatus(task.id, 'IN_PROGRESS')
      },
      {
        id: 'review',
        label: '검토 요청',
        icon: <Users className="w-4 h-4" />,
        disabled: task.status !== 'IN_PROGRESS',
        onClick: () => updateTaskStatus(task.id, 'REVIEW')
      },
      {
        id: 'complete',
        label: '완료',
        icon: <CheckCircle className="w-4 h-4" />,
        onClick: () => {
          setTaskToComplete(task);
          setShowCompleteDialog(true);
        }
      },
      { id: 'divider', label: '', divider: true },
      {
        id: 'cancel',
        label: '취소',
        icon: <XCircle className="w-4 h-4" />,
        danger: true,
        onClick: () => {
          setTasks(prev => prev.filter(t => t.id !== task.id));
          undoToast.show({
            message: '태스크가 취소되었습니다',
            variant: 'default',
            onUndo: () => setTasks(prev => [...prev, task])
          });
        }
      }
    ];
  }

  // 필터링된 태스크
  const filteredTasks = filterSeverity 
    ? tasks.filter(t => t.severity === filterSeverity)
    : tasks;

  // 통계
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    review: tasks.filter(t => t.status === 'REVIEW').length,
    done: tasks.filter(t => t.status === 'DONE').length,
    totalHours: tasks.reduce((sum, t) => sum + t.estimatedHours, 0)
  };

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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">개선 태스크</h2>
          <p className="text-gray-500">분석 결과 기반 개선 항목을 관리하세요</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 뷰 모드 토글 */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'kanban' 
                  ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' 
                  : 'text-gray-500'
              }`}
            >
              칸반
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' 
                  : 'text-gray-500'
              }`}
            >
              리스트
            </button>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="전체" count={stats.total} icon={<Lightbulb className="w-5 h-5" />} color="text-gray-500" />
        <StatCard label="할 일" count={stats.todo} icon={<Clock className="w-5 h-5" />} color="text-gray-500" />
        <StatCard label="진행 중" count={stats.inProgress} icon={<Zap className="w-5 h-5" />} color="text-blue-500" />
        <StatCard label="검토" count={stats.review} icon={<Users className="w-5 h-5" />} color="text-yellow-500" />
        <StatCard label="완료" count={stats.done} icon={<CheckCircle className="w-5 h-5" />} color="text-green-500" />
        <StatCard label="예상 시간" count={`${stats.totalHours}h`} icon={<Target className="w-5 h-5" />} color="text-purple-500" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">우선순위:</span>
        <div className="flex items-center gap-2">
          <FilterButton label="전체" active={!filterSeverity} onClick={() => setFilterSeverity('')} />
          <FilterButton label="긴급" active={filterSeverity === 'CRITICAL'} onClick={() => setFilterSeverity('CRITICAL')} />
          <FilterButton label="높음" active={filterSeverity === 'HIGH'} onClick={() => setFilterSeverity('HIGH')} />
          <FilterButton label="보통" active={filterSeverity === 'MEDIUM'} onClick={() => setFilterSeverity('MEDIUM')} />
          <FilterButton label="낮음" active={filterSeverity === 'LOW'} onClick={() => setFilterSeverity('LOW')} />
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[500px]">
          {(Object.keys(columnConfig) as TaskStatus[]).map(status => {
            const config = columnConfig[status];
            const columnTasks = filteredTasks.filter(t => t.status === status);
            const isOver = dragOverColumn === status;

            return (
              <div
                key={status}
                className={`flex flex-col rounded-xl border transition-all ${
                  isOver 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={() => handleDrop(status)}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 ${config.bgColor} rounded-t-xl border-b border-gray-200 dark:border-gray-700`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-sm text-gray-500 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
                  {columnTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onDragStart={handleDragStart}
                      actions={getTaskActions(task)}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      태스크 없음
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 text-sm font-medium text-gray-500">태스크</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">우선순위</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">상태</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">예상 시간</th>
                <th className="w-10 p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredTasks.map(task => {
                const priority = priorityConfig[task.severity] || priorityConfig.MEDIUM;
                const status = columnConfig[task.status];
                const CategoryIcon = getCategoryIcon(task.category);

                return (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${priority.bgColor}`}>
                          <CategoryIcon className={`w-4 h-4 ${priority.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                          <p className="text-xs text-gray-500 font-mono">{task.filePath.split('/').pop()}:{task.lineStart}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${priority.bgColor} ${priority.color}`}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{task.estimatedHours}h</td>
                    <td className="p-4">
                      <ActionMenu items={getTaskActions(task)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {tasks.length === 0 && !loading && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Lightbulb className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">
            개선 태스크가 없습니다
          </h3>
          <p className="text-gray-500 mt-2 mb-6">
            분석을 실행하면 개선 항목이 자동으로 생성됩니다
          </p>
          <Link 
            href="/dashboard/execution"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            분석 실행하기
          </Link>
        </div>
      )}

      {/* Complete Task Dialog */}
      <ConfirmDialog
        isOpen={showCompleteDialog}
        onClose={() => {
          setShowCompleteDialog(false);
          setTaskToComplete(null);
        }}
        onConfirm={() => taskToComplete && completeTask(taskToComplete)}
        title="태스크 완료"
        message={`"${taskToComplete?.title.slice(0, 40)}..." 태스크를 완료 처리하시겠습니까?`}
        variant="info"
        recoverable={true}
        confirmText="완료"
      />

      {/* Undo Toast */}
      <undoToast.UndoToastComponent />
    </div>
  );
}

// 태스크 카드 컴포넌트
function TaskCard({ 
  task, 
  onDragStart,
  actions 
}: { 
  task: Task; 
  onDragStart: (task: Task) => void;
  actions: ActionMenuItem[];
}) {
  const priority = priorityConfig[task.severity] || priorityConfig.MEDIUM;
  const CategoryIcon = getCategoryIcon(task.category);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {task.title}
            </p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          </div>
        </div>
        <ActionMenu items={actions} size="sm" />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priority.bgColor} ${priority.color}`}>
          {priority.label}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {task.estimatedHours}h
        </span>
        <CategoryIcon className="w-3 h-3 text-gray-400 ml-auto" />
      </div>
    </div>
  );
}

// 통계 카드
function StatCard({ 
  label, 
  count, 
  icon, 
  color 
}: { 
  label: string; 
  count: number | string; 
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
    </div>
  );
}

// 필터 버튼
function FilterButton({ 
  label, 
  active, 
  onClick 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm transition-colors ${
        active 
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}
