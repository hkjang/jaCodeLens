'use client';

import { useState, useEffect } from 'react';
import { 
  FileEdit, Trash2, Plus, Eye, RefreshCw, Search, Filter,
  Calendar, User, Clock, ChevronDown, ChevronRight, 
  Database, Shield, Settings, Activity, AlertTriangle,
  ArrowLeft, ArrowRight, Download
} from 'lucide-react';

// 감사 로그 액션 타입
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'VIEW';

// 감사 로그 엔티티 타입
type AuditEntity = 'PROJECT' | 'EXECUTION' | 'ISSUE' | 'TASK' | 'RULE' | 'USER' | 'SETTING';

interface AuditLog {
  id: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  ipAddress: string;
  details?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    changes?: string[];
  };
}

// 액션 설정
const actionConfig: Record<AuditAction, { label: string; color: string; icon: React.ReactNode }> = {
  CREATE: { label: '생성', color: 'bg-green-100 text-green-600 dark:bg-green-900/30', icon: <Plus className="w-4 h-4" /> },
  UPDATE: { label: '수정', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30', icon: <FileEdit className="w-4 h-4" /> },
  DELETE: { label: '삭제', color: 'bg-red-100 text-red-600 dark:bg-red-900/30', icon: <Trash2 className="w-4 h-4" /> },
  ARCHIVE: { label: '아카이브', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700', icon: <Database className="w-4 h-4" /> },
  RESTORE: { label: '복원', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30', icon: <RefreshCw className="w-4 h-4" /> },
  VIEW: { label: '조회', color: 'bg-gray-100 text-gray-500 dark:bg-gray-700', icon: <Eye className="w-4 h-4" /> }
};

// 엔티티 설정
const entityConfig: Record<AuditEntity, { label: string; icon: React.ReactNode }> = {
  PROJECT: { label: '프로젝트', icon: <Database className="w-4 h-4" /> },
  EXECUTION: { label: '분석 실행', icon: <Activity className="w-4 h-4" /> },
  ISSUE: { label: '이슈', icon: <AlertTriangle className="w-4 h-4" /> },
  TASK: { label: '태스크', icon: <FileEdit className="w-4 h-4" /> },
  RULE: { label: '규칙', icon: <Shield className="w-4 h-4" /> },
  USER: { label: '사용자', icon: <User className="w-4 h-4" /> },
  SETTING: { label: '설정', icon: <Settings className="w-4 h-4" /> }
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // 필터
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [entityFilter, setEntityFilter] = useState<AuditEntity | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // 상세 보기
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter, dateFrom, dateTo]);

  async function fetchLogs() {
    setLoading(true);
    try {
      // 실제 API 호출
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('targetType', entityFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      } else {
        // API 실패 시 빈 배열 설정
        setLogs([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // 필터링
  const filteredLogs = logs.filter(log => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (entityFilter && log.entity !== entityFilter) return false;
    if (search && !log.entityName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // 통계
  const stats = {
    total: logs.length,
    creates: logs.filter(l => l.action === 'CREATE').length,
    updates: logs.filter(l => l.action === 'UPDATE').length,
    deletes: logs.filter(l => l.action === 'DELETE').length
  };

  // 시간 포맷
  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return date.toLocaleDateString('ko-KR');
  }

  // CSV 내보내기
  function exportCSV() {
    const headers = ['시간', '액션', '엔티티', '대상', '사용자', '역할', 'IP'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString('ko-KR'),
      actionConfig[log.action].label,
      entityConfig[log.entity].label,
      log.entityName,
      log.userName,
      log.userRole,
      log.ipAddress
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  if (loading && logs.length === 0) {
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">감사 로그</h2>
          <p className="text-gray-500">시스템의 모든 CUD 활동을 추적합니다</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Download className="w-4 h-4" />
          CSV 내보내기
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="전체 로그" count={stats.total} icon={<Activity className="w-5 h-5" />} color="text-gray-500" />
        <StatCard label="생성" count={stats.creates} icon={<Plus className="w-5 h-5" />} color="text-green-500" />
        <StatCard label="수정" count={stats.updates} icon={<FileEdit className="w-5 h-5" />} color="text-blue-500" />
        <StatCard label="삭제" count={stats.deletes} icon={<Trash2 className="w-5 h-5" />} color="text-red-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="대상 이름 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">모든 액션</option>
          <option value="CREATE">생성</option>
          <option value="UPDATE">수정</option>
          <option value="DELETE">삭제</option>
          <option value="ARCHIVE">아카이브</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value as AuditEntity | '')}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">모든 엔티티</option>
          <option value="PROJECT">프로젝트</option>
          <option value="EXECUTION">분석 실행</option>
          <option value="ISSUE">이슈</option>
          <option value="TASK">태스크</option>
          <option value="RULE">규칙</option>
        </select>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {/* Log List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredLogs.map(log => {
              const action = actionConfig[log.action];
              const entity = entityConfig[log.entity];
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div 
                    className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <button className="text-gray-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className={`p-2 rounded-lg ${action.color}`}>
                      {action.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {action.label}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          {entity.icon}
                          {entity.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white mt-1 truncate">
                        {log.entityName}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="w-4 h-4" />
                        {log.userName}
                        <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                          {log.userRole}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(log.timestamp)}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pl-16 bg-gray-50 dark:bg-gray-900/50">
                      <div className="grid gap-4 text-sm">
                        <div className="flex items-center gap-6 text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(log.timestamp).toLocaleString('ko-KR')}
                          </span>
                          <span>IP: {log.ipAddress}</span>
                          <span>ID: {log.entityId}</span>
                        </div>

                        {log.details && (
                          <div className="space-y-2">
                            {log.details.changes && (
                              <div>
                                <span className="text-gray-500">변경된 필드: </span>
                                <span className="font-mono text-gray-700 dark:text-gray-300">
                                  {log.details.changes.join(', ')}
                                </span>
                              </div>
                            )}
                            {log.details.before && (
                              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <span className="text-red-600 dark:text-red-400 text-xs font-medium">이전 값</span>
                                <pre className="text-xs text-red-700 dark:text-red-300 mt-1 overflow-x-auto">
                                  {JSON.stringify(log.details.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.details.after && (
                              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 text-xs font-medium">새 값</span>
                                <pre className="text-xs text-green-700 dark:text-green-300 mt-1 overflow-x-auto">
                                  {JSON.stringify(log.details.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
              로그가 없습니다
            </h3>
            <p className="text-gray-500 mt-2">
              CUD 활동이 발생하면 여기에 기록됩니다
            </p>
          </div>
        )}

        {total > pageSize && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500">
              총 {total}개 중 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  count, 
  icon, 
  color 
}: { 
  label: string; 
  count: number; 
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
    </div>
  );
}
