'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, 
  Loader2, Database, X, Save, Search, AlertTriangle
} from 'lucide-react';

interface Rule {
  key: string;
  value: string;
  severity: string;
}

interface Policy {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isActive: boolean;
  rules: string;
  priority: number;
}

const CATEGORIES = ['Security', 'Quality', 'Architecture', 'Performance', 'Other'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Partial<Policy> | null>(null);
  const [editingRules, setEditingRules] = useState<Rule[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/policies');
      if (res.ok) {
        setPolicies(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSeedDefaults = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/policies', { method: 'PUT' });
      await fetchPolicies();
    } catch (err) {
      console.error('Failed to seed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/policies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });
      await fetchPolicies();
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  const handleSave = async () => {
    if (!editingPolicy?.name) return;
    setSaving(true);
    try {
      const url = editingPolicy.id 
        ? `/api/admin/policies/${editingPolicy.id}`
        : '/api/admin/policies';
      const method = editingPolicy.id ? 'PATCH' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingPolicy,
          rules: JSON.stringify(editingRules)
        })
      });
      
      await fetchPolicies();
      setIsModalOpen(false);
      setEditingPolicy(null);
      setEditingRules([]);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 정책을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/admin/policies/${id}`, { method: 'DELETE' });
      await fetchPolicies();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const openAddModal = () => {
    setEditingPolicy({ name: '', description: '', category: 'Other', isActive: true });
    setEditingRules([]);
    setIsModalOpen(true);
  };

  const openEditModal = (policy: Policy) => {
    setEditingPolicy({ ...policy });
    setEditingRules(JSON.parse(policy.rules || '[]'));
    setIsModalOpen(true);
  };

  const addRule = () => {
    setEditingRules([...editingRules, { key: '', value: '', severity: 'medium' }]);
  };

  const updateRule = (index: number, field: keyof Rule, value: string) => {
    const newRules = [...editingRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setEditingRules(newRules);
  };

  const removeRule = (index: number) => {
    setEditingRules(editingRules.filter((_, i) => i !== index));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Security': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Quality': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Architecture': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Performance': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-600';
      default: return 'text-blue-500';
    }
  };

  const filteredPolicies = policies
    .filter(p => filterCategory === 'all' || p.category === filterCategory)
    .filter(p => search === '' || p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 bg-white dark:bg-gray-800 rounded-xl border animate-pulse" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">분석 정책</h1>
          <p className="text-gray-500 dark:text-gray-400">분석 규칙 및 임계값 설정</p>
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
            정책 추가
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="정책 검색..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {['all', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filterCategory === cat 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? '전체' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{policies.length}</div>
          <div className="text-sm text-gray-500">전체 정책</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
          <div className="text-2xl font-bold text-green-600">{policies.filter(p => p.isActive).length}</div>
          <div className="text-sm text-gray-500">활성 정책</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
          <div className="text-2xl font-bold text-red-600">{policies.filter(p => p.category === 'Security').length}</div>
          <div className="text-sm text-gray-500">보안 정책</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
          <div className="text-2xl font-bold text-blue-600">
            {policies.reduce((s, p) => s + JSON.parse(p.rules || '[]').length, 0)}
          </div>
          <div className="text-sm text-gray-500">총 규칙</div>
        </div>
      </div>

      {/* Empty state */}
      {policies.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">정책이 없습니다</h3>
          <button onClick={handleSeedDefaults} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
            기본 정책 생성
          </button>
        </div>
      )}

      {/* Policies Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPolicies.map((policy) => {
          const rules: Rule[] = JSON.parse(policy.rules || '[]');
          return (
            <div
              key={policy.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-5 transition-all hover:shadow-lg ${
                policy.isActive 
                  ? 'border-green-500/50' 
                  : 'border-gray-200 dark:border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(policy.category)}`}>
                    {policy.category}
                  </span>
                </div>
                <button 
                  onClick={() => handleToggle(policy.id, policy.isActive)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {policy.isActive ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{policy.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{policy.description}</p>

              <div className="space-y-2 mb-4">
                {rules.slice(0, 3).map((rule, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-gray-50 dark:bg-gray-900/50">
                    <span className="text-gray-600 dark:text-gray-300 truncate">{rule.key}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-500">{rule.value}</span>
                      <span className={`text-xs uppercase ${getSeverityColor(rule.severity)}`}>{rule.severity}</span>
                    </div>
                  </div>
                ))}
                {rules.length > 3 && (
                  <div className="text-xs text-gray-400 text-center">+{rules.length - 3} 더보기</div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => openEditModal(policy)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200"
                >
                  <Edit2 className="w-3 h-3" /> 편집
                </button>
                <button 
                  onClick={() => handleDelete(policy.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 text-sm hover:bg-red-200"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && editingPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editingPolicy.id ? '정책 수정' : '새 정책 추가'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">정책명 *</label>
                  <input
                    type="text"
                    value={editingPolicy.name || ''}
                    onChange={e => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">카테고리</label>
                  <select
                    value={editingPolicy.category || 'Other'}
                    onChange={e => setEditingPolicy({ ...editingPolicy, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <input
                  type="text"
                  value={editingPolicy.description || ''}
                  onChange={e => setEditingPolicy({ ...editingPolicy, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              
              {/* Rules Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">규칙</label>
                  <button onClick={addRule} className="text-xs text-blue-500 hover:text-blue-600">+ 규칙 추가</button>
                </div>
                <div className="space-y-2">
                  {editingRules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rule.key}
                        onChange={e => updateRule(i, 'key', e.target.value)}
                        placeholder="규칙 키"
                        className="flex-1 px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700"
                      />
                      <input
                        type="text"
                        value={rule.value}
                        onChange={e => updateRule(i, 'value', e.target.value)}
                        placeholder="값"
                        className="w-24 px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700"
                      />
                      <select
                        value={rule.severity}
                        onChange={e => updateRule(i, 'severity', e.target.value)}
                        className="w-24 px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700"
                      >
                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => removeRule(i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {editingRules.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">규칙이 없습니다</div>
                  )}
                </div>
              </div>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingPolicy.isActive ?? true}
                  onChange={e => setEditingPolicy({ ...editingPolicy, isActive: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">활성화</span>
              </label>
            </div>
            
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingPolicy.name}
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
