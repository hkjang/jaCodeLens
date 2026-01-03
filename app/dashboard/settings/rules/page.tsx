'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Plus, Search, Filter, Edit2, Trash2, 
  ToggleLeft, ToggleRight, Copy, Eye, RefreshCw,
  AlertTriangle, CheckCircle, Clock, Code2, FileCode,
  ChevronDown, ChevronRight, Activity
} from 'lucide-react';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UndoToast, useUndoToast } from '@/components/ui/UndoToast';

interface AIRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  pattern: string;
  suggestion: string;
  enabled: boolean;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
}

// 카테고리 설정
const categoryConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SECURITY: { label: '보안', color: 'text-red-500', icon: <Shield className="w-4 h-4" /> },
  QUALITY: { label: '품질', color: 'text-blue-500', icon: <Activity className="w-4 h-4" /> },
  STRUCTURE: { label: '구조', color: 'text-purple-500', icon: <Code2 className="w-4 h-4" /> },
  STANDARDS: { label: '표준', color: 'text-yellow-500', icon: <FileCode className="w-4 h-4" /> }
};

// 심각도 설정
const severityConfig: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: '심각', color: 'bg-red-100 text-red-600 dark:bg-red-900/30' },
  HIGH: { label: '높음', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' },
  MEDIUM: { label: '보통', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' },
  LOW: { label: '낮음', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' }
};

// 기본 템플릿 규칙
const ruleTemplates: Partial<AIRule>[] = [
  {
    name: 'SQL Injection 감지',
    description: 'SQL 인젝션 취약점을 감지합니다',
    category: 'SECURITY',
    severity: 'CRITICAL',
    pattern: 'query.*\\$\\{.*\\}',
    suggestion: 'Prepared Statement 또는 파라미터 바인딩을 사용하세요'
  },
  {
    name: '하드코딩된 비밀번호',
    description: '코드에 하드코딩된 비밀번호를 감지합니다',
    category: 'SECURITY',
    severity: 'HIGH',
    pattern: 'password\\s*=\\s*["\'].*["\']',
    suggestion: '환경 변수 또는 시크릿 관리 시스템을 사용하세요'
  },
  {
    name: 'console.log 사용',
    description: '프로덕션 코드의 console.log를 감지합니다',
    category: 'QUALITY',
    severity: 'LOW',
    pattern: 'console\\.log\\(',
    suggestion: '로깅 라이브러리를 사용하거나 제거하세요'
  }
];

export default function RulesPage() {
  const [rules, setRules] = useState<AIRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showDisabled, setShowDisabled] = useState(false);
  
  // CUD 상태
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AIRule | null>(null);
  const [editForm, setEditForm] = useState<Partial<AIRule>>({});
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  
  const undoToast = useUndoToast();

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    setLoading(true);
    // 더미 데이터 (실제로는 API에서 가져옴)
    const dummyRules: AIRule[] = [
      {
        id: '1',
        name: 'SQL Injection 감지',
        description: 'SQL 인젝션 취약점을 감지합니다',
        category: 'SECURITY',
        severity: 'CRITICAL',
        pattern: 'query.*\\$\\{.*\\}',
        suggestion: 'Prepared Statement 또는 파라미터 바인딩을 사용하세요',
        enabled: true,
        builtIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'console.log 사용',
        description: '프로덕션 코드의 console.log를 감지합니다',
        category: 'QUALITY',
        severity: 'LOW',
        pattern: 'console\\.log\\(',
        suggestion: '로깅 라이브러리를 사용하거나 제거하세요',
        enabled: true,
        builtIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    setRules(dummyRules);
    setLoading(false);
  }

  // 규칙 토글
  const toggleRule = useCallback((ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const previousState = rule.enabled;
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));

    undoToast.show({
      message: `"${rule.name}" ${previousState ? '비활성화' : '활성화'}됨`,
      variant: 'success',
      onUndo: () => {
        setRules(prev => prev.map(r => 
          r.id === ruleId ? { ...r, enabled: previousState } : r
        ));
      }
    });
  }, [rules, undoToast]);

  // 규칙 생성
  const createRule = useCallback(() => {
    const newRule: AIRule = {
      id: Date.now().toString(),
      name: editForm.name || '새 규칙',
      description: editForm.description || '',
      category: editForm.category || 'QUALITY',
      severity: editForm.severity || 'MEDIUM',
      pattern: editForm.pattern || '',
      suggestion: editForm.suggestion || '',
      enabled: true,
      builtIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setRules(prev => [...prev, newRule]);
    setShowCreateDialog(false);
    setEditForm({});

    undoToast.show({
      message: `"${newRule.name}" 규칙이 생성되었습니다`,
      variant: 'success',
      onUndo: () => {
        setRules(prev => prev.filter(r => r.id !== newRule.id));
      }
    });
  }, [editForm, undoToast]);

  // 규칙 수정
  const updateRule = useCallback(() => {
    if (!selectedRule) return;

    const previousRule = { ...selectedRule };
    const updatedRule = {
      ...selectedRule,
      ...editForm,
      updatedAt: new Date().toISOString()
    };

    setRules(prev => prev.map(r => 
      r.id === selectedRule.id ? updatedRule : r
    ));
    setShowEditDialog(false);
    setSelectedRule(null);
    setEditForm({});

    undoToast.show({
      message: `"${updatedRule.name}" 규칙이 수정되었습니다`,
      variant: 'success',
      onUndo: () => {
        setRules(prev => prev.map(r => 
          r.id === previousRule.id ? previousRule : r
        ));
      }
    });
  }, [selectedRule, editForm, undoToast]);

  // 규칙 삭제
  const deleteRule = useCallback(() => {
    if (!selectedRule) return;

    setRules(prev => prev.filter(r => r.id !== selectedRule.id));
    setShowDeleteDialog(false);

    undoToast.show({
      message: `"${selectedRule.name}" 규칙이 삭제되었습니다`,
      variant: 'default',
      onUndo: () => {
        setRules(prev => [...prev, selectedRule]);
      }
    });
    setSelectedRule(null);
  }, [selectedRule, undoToast]);

  // 템플릿에서 생성
  const createFromTemplate = useCallback((template: Partial<AIRule>) => {
    setEditForm(template);
    setShowTemplateMenu(false);
    setShowCreateDialog(true);
  }, []);

  // 규칙 복사
  const duplicateRule = useCallback((rule: AIRule) => {
    const newRule: AIRule = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (복사본)`,
      builtIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setRules(prev => [...prev, newRule]);

    undoToast.show({
      message: `"${newRule.name}" 규칙이 생성되었습니다`,
      variant: 'success',
      onUndo: () => {
        setRules(prev => prev.filter(r => r.id !== newRule.id));
      }
    });
  }, [undoToast]);

  // 규칙 액션 메뉴
  function getRuleActions(rule: AIRule): ActionMenuItem[] {
    return [
      {
        id: 'edit',
        label: '수정',
        icon: <Edit2 className="w-4 h-4" />,
        disabled: rule.builtIn,
        onClick: () => {
          setSelectedRule(rule);
          setEditForm(rule);
          setShowEditDialog(true);
        }
      },
      {
        id: 'duplicate',
        label: '복사',
        icon: <Copy className="w-4 h-4" />,
        onClick: () => duplicateRule(rule)
      },
      {
        id: 'toggle',
        label: rule.enabled ? '비활성화' : '활성화',
        icon: rule.enabled ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />,
        onClick: () => toggleRule(rule.id)
      },
      { id: 'divider', label: '', divider: true },
      {
        id: 'delete',
        label: '삭제',
        icon: <Trash2 className="w-4 h-4" />,
        danger: true,
        disabled: rule.builtIn,
        onClick: () => {
          setSelectedRule(rule);
          setShowDeleteDialog(true);
        }
      }
    ];
  }

  // 필터링
  const filteredRules = rules.filter(rule => {
    if (search && !rule.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && rule.category !== categoryFilter) return false;
    if (!showDisabled && !rule.enabled) return false;
    return true;
  });

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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">AI 규칙</h2>
          <p className="text-gray-500">분석에 사용되는 규칙을 관리하세요</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 템플릿 메뉴 */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FileCode className="w-4 h-4" />
              템플릿
              <ChevronDown className="w-4 h-4" />
            </button>
            {showTemplateMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                {ruleTemplates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => createFromTemplate(template)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                    <p className="text-xs text-gray-500">{template.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setEditForm({});
              setShowCreateDialog(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            새 규칙
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-500">전체 규칙</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{rules.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">활성</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {rules.filter(r => r.enabled).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-gray-500">보안 규칙</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {rules.filter(r => r.category === 'SECURITY').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-500">사용자 정의</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {rules.filter(r => !r.builtIn).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="규칙 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="">모든 카테고리</option>
            <option value="SECURITY">보안</option>
            <option value="QUALITY">품질</option>
            <option value="STRUCTURE">구조</option>
            <option value="STANDARDS">표준</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showDisabled}
            onChange={(e) => setShowDisabled(e.target.checked)}
            className="rounded border-gray-300"
          />
          비활성 포함
        </label>
      </div>

      {/* Rules List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredRules.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredRules.map(rule => {
              const category = categoryConfig[rule.category] || categoryConfig.QUALITY;
              const severity = severityConfig[rule.severity] || severityConfig.MEDIUM;

              return (
                <div 
                  key={rule.id} 
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !rule.enabled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${category.color}`}>
                        {category.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{rule.name}</h3>
                          {rule.builtIn && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                              기본 제공
                            </span>
                          )}
                          {!rule.enabled && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                              비활성
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${severity.color}`}>
                            {severity.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            패턴: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{rule.pattern}</code>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.enabled 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <ActionMenu items={getRuleActions(rule)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
              규칙이 없습니다
            </h3>
            <p className="text-gray-500 mt-2">
              새 규칙을 추가하거나 템플릿을 사용하세요
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      {(showCreateDialog || showEditDialog) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {showCreateDialog ? '새 규칙 생성' : '규칙 수정'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  규칙 이름
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="예: SQL Injection 감지"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  설명
                </label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    카테고리
                  </label>
                  <select
                    value={editForm.category || 'QUALITY'}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="SECURITY">보안</option>
                    <option value="QUALITY">품질</option>
                    <option value="STRUCTURE">구조</option>
                    <option value="STANDARDS">표준</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    심각도
                  </label>
                  <select
                    value={editForm.severity || 'MEDIUM'}
                    onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="CRITICAL">심각</option>
                    <option value="HIGH">높음</option>
                    <option value="MEDIUM">보통</option>
                    <option value="LOW">낮음</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  패턴 (정규식)
                </label>
                <input
                  type="text"
                  value={editForm.pattern || ''}
                  onChange={(e) => setEditForm({ ...editForm, pattern: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
                  placeholder="예: console\\.log\\("
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  개선 제안
                </label>
                <textarea
                  value={editForm.suggestion || ''}
                  onChange={(e) => setEditForm({ ...editForm, suggestion: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setShowEditDialog(false);
                  setSelectedRule(null);
                  setEditForm({});
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={showCreateDialog ? createRule : updateRule}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {showCreateDialog ? '생성' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedRule(null);
        }}
        onConfirm={deleteRule}
        title="규칙 삭제"
        message={`"${selectedRule?.name}" 규칙을 삭제하시겠습니까?`}
        variant="danger"
        recoverable={true}
        confirmText="삭제"
      />

      {/* Undo Toast */}
      <undoToast.UndoToastComponent />
    </div>
  );
}
