'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Plus, Edit2, Trash2, CheckCircle2, XCircle, ChevronDown, 
  Loader2, Database, RefreshCw, Save, X, Search
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string;
  userCount: number;
  isSystem: boolean;
  isActive: boolean;
}

const ALL_PERMISSIONS = [
  { key: 'view_analysis', label: '분석 결과 조회' },
  { key: 'run_analysis', label: '분석 실행' },
  { key: 'fix_issues', label: '이슈 수정' },
  { key: 'view_operations', label: '운영 현황 조회' },
  { key: 'manage_agents', label: '에이전트 관리' },
  { key: 'view_architecture', label: '아키텍처 조회' },
  { key: 'view_security', label: '보안 분석 조회' },
  { key: 'view_logs', label: '로그 조회' },
  { key: 'manage_policies', label: '정책 관리' },
  { key: 'manage_users', label: '사용자 관리' },
  { key: 'manage_models', label: 'AI 모델 관리' },
  { key: 'all', label: '전체 권한' },
];

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [search, setSearch] = useState('');

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        setRoles(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSeedDefaults = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/roles', { method: 'PUT' });
      await fetchRoles();
    } catch (err) {
      console.error('Failed to seed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingRole?.name) return;
    setSaving(true);
    try {
      const url = editingRole.id 
        ? `/api/admin/roles/${editingRole.id}`
        : '/api/admin/roles';
      const method = editingRole.id ? 'PATCH' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRole)
      });
      
      await fetchRoles();
      setIsModalOpen(false);
      setEditingRole(null);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 역할을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchRoles();
      } else {
        const data = await res.json();
        alert(data.error || '삭제 실패');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const openAddModal = () => {
    setEditingRole({ name: '', description: '', permissions: '[]', isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole({ ...role });
    setIsModalOpen(true);
  };

  const togglePermission = (perm: string) => {
    if (!editingRole) return;
    const perms = JSON.parse(editingRole.permissions || '[]');
    const newPerms = perms.includes(perm) 
      ? perms.filter((p: string) => p !== perm)
      : [...perms, perm];
    setEditingRole({ ...editingRole, permissions: JSON.stringify(newPerms) });
  };

  const filteredRoles = roles.filter(r => 
    search === '' || r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-20 bg-white dark:bg-gray-800 rounded-xl border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">역할 관리</h1>
          <p className="text-gray-500 dark:text-gray-400">사용자 역할 및 권한 설정</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedDefaults}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg hover:bg-purple-200 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            시드
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            <Plus className="w-4 h-4" />
            역할 추가
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="역할 검색..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{roles.length}</div>
          <div className="text-sm text-gray-500">전체 역할</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
          <div className="text-2xl font-bold text-blue-600">{roles.filter(r => r.isSystem).length}</div>
          <div className="text-sm text-gray-500">시스템 역할</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
          <div className="text-2xl font-bold text-green-600">{roles.reduce((s, r) => s + r.userCount, 0)}</div>
          <div className="text-sm text-gray-500">총 사용자</div>
        </div>
      </div>

      {/* Empty state */}
      {roles.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">역할이 없습니다</h3>
          <button onClick={handleSeedDefaults} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
            기본 역할 생성
          </button>
        </div>
      )}

      {/* Roles List */}
      <div className="space-y-3">
        {filteredRoles.map((role) => {
          const perms = JSON.parse(role.permissions || '[]');
          return (
            <div
              key={role.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                      {role.isSystem && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-500">시스템</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{role.userCount}명</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedRole === role.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expandedRole === role.id && (
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">권한</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {ALL_PERMISSIONS.map((perm) => {
                      const hasPermission = perms.includes('all') || perms.includes(perm.key);
                      return (
                        <span
                          key={perm.key}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                            hasPermission
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          }`}
                        >
                          {hasPermission ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {perm.label}
                        </span>
                      );
                    })}
                  </div>
                  {!role.isSystem && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditModal(role)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-sm"
                      >
                        <Edit2 className="w-3 h-3" /> 수정
                      </button>
                      <button 
                        onClick={() => handleDelete(role.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 text-sm"
                      >
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && editingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editingRole.id ? '역할 수정' : '새 역할 추가'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">역할명 *</label>
                <input
                  type="text"
                  value={editingRole.name || ''}
                  onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <input
                  type="text"
                  value={editingRole.description || ''}
                  onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">권한 선택</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map((perm) => {
                    const perms = JSON.parse(editingRole.permissions || '[]');
                    const hasPermission = perms.includes(perm.key);
                    return (
                      <button
                        key={perm.key}
                        onClick={() => togglePermission(perm.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition ${
                          hasPermission
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {perm.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingRole.name}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
