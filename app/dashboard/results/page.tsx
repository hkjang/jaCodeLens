'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BarChart3, Filter, ArrowLeft, ArrowRight, FileCode, AlertTriangle,
  Check, X, Eye, EyeOff, MessageSquare, CheckCircle, XCircle,
  Download, RefreshCw, Bookmark, Share2, MoreVertical
} from 'lucide-react';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UndoToast, useUndoToast } from '@/components/ui/UndoToast';

// 심각도 설정
const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20', label: 'Critical' },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20', label: 'High' },
  MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20', label: 'Medium' },
  LOW: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20', label: 'Low' },
  INFO: { color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/20', label: 'Info' }
};

// 카테고리 설정
const categoryConfig: Record<string, { color: string; label: string }> = {
  SECURITY: { color: 'bg-red-500', label: '보안' },
  QUALITY: { color: 'bg-blue-500', label: '품질' },
  STRUCTURE: { color: 'bg-purple-500', label: '구조' },
  OPERATIONS: { color: 'bg-green-500', label: '운영' },
  TEST: { color: 'bg-cyan-500', label: '테스트' },
  STANDARDS: { color: 'bg-yellow-500', label: '표준' }
};

// 상태 설정
const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  NEW: { color: 'bg-gray-100 text-gray-600', label: '신규', icon: <AlertTriangle className="w-3 h-3" /> },
  ACKNOWLEDGED: { color: 'bg-blue-100 text-blue-600', label: '확인됨', icon: <Eye className="w-3 h-3" /> },
  IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-600', label: '처리중', icon: <RefreshCw className="w-3 h-3" /> },
  RESOLVED: { color: 'bg-green-100 text-green-600', label: '해결됨', icon: <CheckCircle className="w-3 h-3" /> },
  WONT_FIX: { color: 'bg-gray-100 text-gray-500', label: '미해결', icon: <XCircle className="w-3 h-3" /> },
  HIDDEN: { color: 'bg-gray-50 text-gray-400', label: '숨김', icon: <EyeOff className="w-3 h-3" /> }
};

interface Issue {
  id: string;
  severity: string;
  mainCategory: string;
  subCategory: string;
  message: string;
  suggestion?: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  status?: string;
  memo?: string;
  selected?: boolean;
}

interface Stats {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
}

export default function ResultsPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats>({ criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const pageSize = 20;
  
  // CUD 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showMemoDialog, setShowMemoDialog] = useState(false);
  const [memoTarget, setMemoTarget] = useState<Issue | null>(null);
  const [memoText, setMemoText] = useState('');
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [issuesToHide, setIssuesToHide] = useState<Issue[]>([]);
  
  // Undo Toast
  const undoToast = useUndoToast();

  useEffect(() => {
    fetchData();
  }, [page, severityFilter, categoryFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', pageSize.toString());
      params.set('offset', ((page - 1) * pageSize).toString());
      if (severityFilter) params.set('severity', severityFilter);
      if (categoryFilter) params.set('category', categoryFilter);

      const [issuesRes, statsRes] = await Promise.all([
        fetch(`/api/analysis/issues?${params}`),
        fetch('/api/analysis/stats')
      ]);

      if (issuesRes.ok) {
        const data = await issuesRes.json();
        setIssues(data.items.map((i: Issue) => ({ ...i, status: i.status || 'NEW', selected: false })));
        setTotal(data.total);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch data', e);
    } finally {
      setLoading(false);
    }
  }

  // 선택 토글
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setShowBulkActions(next.size > 0);
      return next;
    });
  }, []);

  // 전체 선택
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === issues.length) {
      setSelectedIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedIds(new Set(issues.map(i => i.id)));
      setShowBulkActions(true);
    }
  }, [issues, selectedIds.size]);

  // 상태 일괄 변경
  async function bulkUpdateStatus(status: string) {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch('/api/analysis/issues/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status })
      });
      if (res.ok) {
        setIssues(prev => prev.map(i => 
          ids.includes(i.id) ? { ...i, status } : i
        ));
        setSelectedIds(new Set());
        setShowBulkActions(false);
        
        undoToast.show({
          message: `${ids.length}개 항목의 상태가 변경되었습니다`,
          variant: 'success',
          onUndo: () => {
            // 원래 상태로 복원
            fetchData();
          }
        });
      }
    } catch (e) {
      console.error('Failed to bulk update', e);
    }
  }

  // 숨김 처리
  async function hideIssues(issueList: Issue[]) {
    const ids = issueList.map(i => i.id);
    try {
      const res = await fetch('/api/analysis/issues/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: 'HIDDEN' })
      });
      if (res.ok) {
        setIssues(prev => prev.filter(i => !ids.includes(i.id)));
        setSelectedIds(new Set());
        setShowBulkActions(false);
        setShowHideDialog(false);
        setIssuesToHide([]);
        
        undoToast.show({
          message: `${ids.length}개 항목이 숨김 처리되었습니다`,
          description: '숨김 필터에서 복원할 수 있습니다',
          variant: 'default',
          onUndo: async () => {
            await fetch('/api/analysis/issues/bulk-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids, status: 'NEW' })
            });
            fetchData();
          }
        });
      }
    } catch (e) {
      console.error('Failed to hide issues', e);
    }
  }

  // 메모 저장
  async function saveMemo() {
    if (!memoTarget) return;
    try {
      const res = await fetch(`/api/analysis/issues/${memoTarget.id}/memo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: memoText })
      });
      if (res.ok) {
        setIssues(prev => prev.map(i => 
          i.id === memoTarget.id ? { ...i, memo: memoText } : i
        ));
        setShowMemoDialog(false);
        setMemoTarget(null);
        setMemoText('');
      }
    } catch (e) {
      console.error('Failed to save memo', e);
    }
  }

  // 개별 행 액션 메뉴
  function getRowActions(issue: Issue): ActionMenuItem[] {
    return [
      {
        id: 'acknowledge',
        label: '확인 처리',
        icon: <Eye className="w-4 h-4" />,
        onClick: () => bulkUpdateStatus('ACKNOWLEDGED')
      },
      {
        id: 'resolve',
        label: '해결됨',
        icon: <CheckCircle className="w-4 h-4" />,
        onClick: () => bulkUpdateStatus('RESOLVED')
      },
      {
        id: 'memo',
        label: '메모 추가',
        icon: <MessageSquare className="w-4 h-4" />,
        onClick: () => {
          setMemoTarget(issue);
          setMemoText(issue.memo || '');
          setShowMemoDialog(true);
        }
      },
      { id: 'divider', label: '', divider: true },
      {
        id: 'hide',
        label: '숨김',
        icon: <EyeOff className="w-4 h-4" />,
        onClick: () => {
          setIssuesToHide([issue]);
          setShowHideDialog(true);
        }
      }
    ];
  }

  const totalPages = Math.ceil(total / pageSize);

  if (loading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 결과</h2>
          <p className="text-gray-500">파이프라인 분석에서 발견된 이슈 목록</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {/* 스냅샷 저장 */}}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Bookmark className="w-4 h-4" />
            스냅샷 저장
          </button>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
            총 {total}개
          </span>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Critical" count={stats.criticalCount} color="bg-red-500" />
        <SummaryCard label="High" count={stats.highCount} color="bg-orange-500" />
        <SummaryCard label="Medium" count={stats.mediumCount} color="bg-yellow-500" />
        <SummaryCard label="Low" count={stats.lowCount} color="bg-blue-500" />
        <SummaryCard label="Info" count={stats.infoCount} color="bg-gray-400" />
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
          <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
            {selectedIds.size}개 항목 선택됨
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkUpdateStatus('ACKNOWLEDGED')}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
            >
              <Eye className="w-4 h-4" />
              확인
            </button>
            <button
              onClick={() => bulkUpdateStatus('RESOLVED')}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
            >
              <CheckCircle className="w-4 h-4" />
              해결
            </button>
            <button
              onClick={() => {
                setIssuesToHide(issues.filter(i => selectedIds.has(i.id)));
                setShowHideDialog(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg"
            >
              <EyeOff className="w-4 h-4" />
              숨김
            </button>
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setShowBulkActions(false);
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Filter className="w-5 h-5 text-gray-400" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">심각도:</span>
          <FilterLink onClick={() => setSeverityFilter('')} label="전체" active={!severityFilter} />
          <FilterLink onClick={() => setSeverityFilter('CRITICAL')} label="Critical" active={severityFilter === 'CRITICAL'} />
          <FilterLink onClick={() => setSeverityFilter('HIGH')} label="High" active={severityFilter === 'HIGH'} />
          <FilterLink onClick={() => setSeverityFilter('MEDIUM')} label="Medium" active={severityFilter === 'MEDIUM'} />
        </div>
        <div className="border-l border-gray-200 dark:border-gray-700 h-6" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">카테고리:</span>
          <FilterLink onClick={() => setCategoryFilter('')} label="전체" active={!categoryFilter} />
          <FilterLink onClick={() => setCategoryFilter('SECURITY')} label="보안" active={categoryFilter === 'SECURITY'} />
          <FilterLink onClick={() => setCategoryFilter('QUALITY')} label="품질" active={categoryFilter === 'QUALITY'} />
          <FilterLink onClick={() => setCategoryFilter('STRUCTURE')} label="구조" active={categoryFilter === 'STRUCTURE'} />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {issues.length > 0 ? (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="w-10 p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === issues.length && issues.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">상태</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">심각도</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">카테고리</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">메시지</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">파일</th>
                  <th className="w-10 p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {issues.map((issue) => {
                  const severity = severityConfig[issue.severity] || severityConfig.INFO;
                  const category = categoryConfig[issue.mainCategory] || { color: 'bg-gray-500', label: issue.mainCategory };
                  const status = statusConfig[issue.status || 'NEW'];

                  return (
                    <tr 
                      key={issue.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        selectedIds.has(issue.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(issue.id)}
                          onChange={() => toggleSelect(issue.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${severity.bg} ${severity.color}`}>
                          {severity.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${category.color}`}>
                          {category.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-900 dark:text-white text-sm max-w-md truncate" title={issue.message}>
                          {issue.message}
                        </p>
                        {issue.memo && (
                          <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {issue.memo.slice(0, 30)}...
                          </p>
                        )}
                        {issue.suggestion && (
                          <p className="text-xs text-gray-500 mt-1 truncate" title={issue.suggestion}>
                            💡 {issue.suggestion}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate max-w-xs block" title={issue.filePath}>
                          {issue.filePath.split('/').pop()}:{issue.lineStart}
                        </span>
                      </td>
                      <td className="p-4">
                        <ActionMenu items={getRowActions(issue)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-500">
                  {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} / {total}
                </span>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <button
                      onClick={() => setPage(page - 1)}
                      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <button
                      onClick={() => setPage(page + 1)}
                      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <FileCode className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
              분석 결과가 없습니다
            </h3>
            <p className="text-gray-500 mt-2">
              프로젝트 분석을 실행하면 결과가 여기에 표시됩니다
            </p>
            <Link 
              href="/dashboard/execution"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              분석 실행하기
            </Link>
          </div>
        )}
      </div>

      {/* 메모 다이얼로그 */}
      {showMemoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              메모 추가
            </h3>
            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="이슈에 대한 메모를 입력하세요..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowMemoDialog(false);
                  setMemoTarget(null);
                  setMemoText('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={saveMemo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 숨김 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showHideDialog}
        onClose={() => {
          setShowHideDialog(false);
          setIssuesToHide([]);
        }}
        onConfirm={() => hideIssues(issuesToHide)}
        title="이슈 숨김"
        message={`${issuesToHide.length}개의 이슈를 숨기시겠습니까?`}
        variant="warning"
        recoverable={true}
        recoverableDays={0}
        confirmText="숨김"
      />

      {/* Undo Toast */}
      <undoToast.UndoToastComponent />
    </div>
  );
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
    </div>
  );
}

function FilterLink({ onClick, label, active }: { onClick: () => void; label: string; active: boolean }) {
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
