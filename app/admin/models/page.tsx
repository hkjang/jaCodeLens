'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, Star, RefreshCw, Loader2, Server, Cpu, Zap, 
  CheckCircle, XCircle, Play, Wifi, WifiOff, Plus, Edit2, Trash2, X, Save,
  BarChart3, Database, Search
} from 'lucide-react';

interface Model {
  id: string;
  name: string;
  provider: string;
  version: string | null;
  endpoint: string | null;
  apiKey: string | null;
  isDefault: boolean;
  isActive: boolean;
  latency: number;
  accuracy: number;
  costPerToken: number;
  usageToday: number;
  usageTotal: number;
  contextWindow: number | null;
  maxTokens: number | null;
  temperature: number;
}

const PROVIDERS = ['Ollama', 'OpenAI', 'Anthropic', 'Google', 'Other'];

const emptyModel: Omit<Model, 'id'> = {
  name: '',
  provider: 'Ollama',
  version: null,
  endpoint: 'http://localhost:11434',
  apiKey: null,
  isDefault: false,
  isActive: true,
  latency: 0,
  accuracy: 0,
  costPerToken: 0,
  usageToday: 0,
  usageTotal: 0,
  contextWindow: 8192,
  maxTokens: 4096,
  temperature: 0.7
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Partial<Model> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ai-models');
      if (res.ok) {
        const data = await res.json();
        setModels(data);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSave = async () => {
    if (!editingModel?.name) return;
    
    setSaving(true);
    try {
      const url = editingModel.id 
        ? `/api/admin/ai-models/${editingModel.id}`
        : '/api/admin/ai-models';
      const method = editingModel.id ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingModel)
      });
      
      if (res.ok) {
        await fetchModels();
        setIsModalOpen(false);
        setEditingModel(null);
      }
    } catch (err) {
      console.error('Failed to save model:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 모델을 삭제하시겠습니까?')) return;
    
    try {
      const res = await fetch(`/api/admin/ai-models/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchModels();
      } else {
        const data = await res.json();
        alert(data.error || '삭제 실패');
      }
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  const setDefaultModel = async (id: string) => {
    try {
      setUpdating(id);
      await fetch(`/api/admin/ai-models/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true })
      });
      await fetchModels();
    } catch (err) {
      console.error('Failed to set default model:', err);
    } finally {
      setUpdating(null);
    }
  };

  const toggleModel = async (id: string, currentActive: boolean) => {
    try {
      setUpdating(id);
      await fetch(`/api/admin/ai-models/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      });
      await fetchModels();
    } catch (err) {
      console.error('Failed to toggle model:', err);
    } finally {
      setUpdating(null);
    }
  };

  const testConnection = async (model: Model) => {
    setTesting(model.id);
    setTestResults(prev => ({ ...prev, [model.id]: null }));
    
    try {
      if (model.provider === 'Ollama' && model.endpoint) {
        const res = await fetch(model.endpoint + '/api/tags', { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        setTestResults(prev => ({ ...prev, [model.id]: res.ok ? 'success' : 'error' }));
      } else {
        await new Promise(r => setTimeout(r, 1000));
        setTestResults(prev => ({ ...prev, [model.id]: 'success' }));
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, [model.id]: 'error' }));
    } finally {
      setTesting(null);
    }
  };

  const openAddModal = () => {
    setEditingModel({ ...emptyModel });
    setIsModalOpen(true);
  };

  const openEditModal = (model: Model) => {
    setEditingModel({ ...model });
    setIsModalOpen(true);
  };

  const getProviderGradient = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'ollama': return 'from-purple-500 to-pink-500';
      case 'openai': return 'from-emerald-500 to-teal-500';
      case 'anthropic': return 'from-orange-500 to-amber-500';
      default: return 'from-blue-500 to-indigo-500';
    }
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-xl border p-4 animate-pulse" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 bg-white dark:bg-gray-800 rounded-xl border p-4 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const defaultModel = models.find(m => m.isDefault);
  const totalUsage = models.reduce((s, m) => s + m.usageToday, 0);
  const filteredModels = models.filter(m => 
    search === '' || 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.provider.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 모델 관리</h1>
          <p className="text-gray-500 dark:text-gray-400">분석에 사용할 LLM 모델 설정</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchModels}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            모델 추가
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="모델 검색..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{models.length}</div>
            <Brain className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-sm text-gray-500">전체 모델</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-green-600">{models.filter(m => m.isActive).length}</div>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-sm text-gray-500">활성 모델</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-purple-600">{models.filter(m => m.provider === 'Ollama').length}</div>
            <Server className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-sm text-gray-500">로컬 모델</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">{totalUsage.toLocaleString()}</div>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-sm text-gray-500">오늘 토큰</div>
        </div>
      </div>

      {/* Default Model Banner */}
      {defaultModel && (
        <div className={`p-5 rounded-xl bg-gradient-to-r ${getProviderGradient(defaultModel.provider)} text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                {defaultModel.provider === 'Ollama' ? (
                  <Server className="w-6 h-6 text-white" />
                ) : (
                  <Cpu className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{defaultModel.name}</h3>
                  <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                </div>
                <p className="text-white/80 text-sm">
                  {defaultModel.provider} · {defaultModel.endpoint || 'API'}
                  {defaultModel.provider === 'Ollama' && ' · 🖥️ 로컬'}
                </p>
              </div>
            </div>
            <button
              onClick={() => testConnection(defaultModel)}
              disabled={testing === defaultModel.id}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition"
            >
              {testing === defaultModel.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : testResults[defaultModel.id] === 'success' ? (
                <Wifi className="w-4 h-4" />
              ) : testResults[defaultModel.id] === 'error' ? (
                <WifiOff className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              연결 테스트
            </button>
          </div>
        </div>
      )}

      {/* No models */}
      {models.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI 모델이 없습니다</h3>
          <p className="text-gray-500 mb-4">새 모델을 추가하세요</p>
          <button onClick={openAddModal} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            첫 모델 추가
          </button>
        </div>
      )}

      {/* Models Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <div
            key={model.id}
            className={`group bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all hover:shadow-lg ${
              model.isDefault 
                ? 'border-blue-500 ring-2 ring-blue-500/20' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            } ${!model.isActive ? 'opacity-60' : ''}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getProviderGradient(model.provider)} flex items-center justify-center`}>
                  {model.provider === 'Ollama' ? (
                    <Server className="w-5 h-5 text-white" />
                  ) : (
                    <Cpu className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{model.name}</h3>
                    {model.isDefault && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <p className="text-xs text-gray-500">
                    {model.provider} {model.provider === 'Ollama' && '🖥️'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {testResults[model.id] === 'success' && <Wifi className="w-4 h-4 text-green-500" />}
                {testResults[model.id] === 'error' && <WifiOff className="w-4 h-4 text-red-500" />}
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  model.isActive 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {model.isActive ? '활성' : '비활성'}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 rounded bg-gray-50 dark:bg-gray-900/50">
                <div className="text-sm font-bold text-gray-900 dark:text-white">{model.latency}s</div>
                <div className="text-xs text-gray-500">Latency</div>
              </div>
              <div className="text-center p-2 rounded bg-gray-50 dark:bg-gray-900/50">
                <div className="text-sm font-bold text-gray-900 dark:text-white">{model.accuracy}%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
              <div className="text-center p-2 rounded bg-gray-50 dark:bg-gray-900/50">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {model.costPerToken === 0 ? '무료' : `$${model.costPerToken}`}
                </div>
                <div className="text-xs text-gray-500">Cost</div>
              </div>
            </div>

            {/* Usage */}
            <div className="text-xs text-gray-500 mb-3 flex items-center justify-between">
              <span>사용: {model.usageToday.toLocaleString()} tokens</span>
              {model.contextWindow && <span>Context: {(model.contextWindow / 1000).toFixed(0)}K</span>}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => testConnection(model)}
                disabled={testing === model.id}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition"
                title="연결 테스트"
              >
                {testing === model.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : (
                  <Zap className="w-4 h-4 text-gray-500" />
                )}
              </button>
              <button
                onClick={() => openEditModal(model)}
                className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 transition"
                title="편집"
              >
                <Edit2 className="w-4 h-4 text-blue-500" />
              </button>
              {!model.isDefault && (
                <button
                  onClick={() => setDefaultModel(model.id)}
                  disabled={!model.isActive || updating === model.id}
                  className="flex-1 py-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-xs hover:bg-yellow-200 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {updating === model.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                  기본
                </button>
              )}
              <button
                onClick={() => toggleModel(model.id, model.isActive)}
                disabled={model.isDefault || updating === model.id}
                className={`px-3 py-2 rounded-lg text-xs disabled:opacity-50 ${
                  model.isActive
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-600'
                }`}
              >
                {model.isActive ? 'OFF' : 'ON'}
              </button>
              {!model.isDefault && (
                <button
                  onClick={() => handleDelete(model.id)}
                  className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 transition"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && editingModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingModel.id ? '모델 수정' : '새 모델 추가'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">모델명 *</label>
                  <input
                    type="text"
                    value={editingModel.name || ''}
                    onChange={e => setEditingModel({ ...editingModel, name: e.target.value })}
                    placeholder="qwen3:8b"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
                  <select
                    value={editingModel.provider || 'Ollama'}
                    onChange={e => setEditingModel({ ...editingModel, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint</label>
                <input
                  type="text"
                  value={editingModel.endpoint || ''}
                  onChange={e => setEditingModel({ ...editingModel, endpoint: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                />
              </div>
              
              {editingModel.provider !== 'Ollama' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                  <input
                    type="password"
                    value={editingModel.apiKey || ''}
                    onChange={e => setEditingModel({ ...editingModel, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                  />
                </div>
              )}
              
              {/* Parameters */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Context Window</label>
                  <input
                    type="number"
                    value={editingModel.contextWindow || ''}
                    onChange={e => setEditingModel({ ...editingModel, contextWindow: parseInt(e.target.value) || null })}
                    placeholder="8192"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={editingModel.maxTokens || ''}
                    onChange={e => setEditingModel({ ...editingModel, maxTokens: parseInt(e.target.value) || null })}
                    placeholder="4096"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingModel.temperature ?? 0.7}
                    onChange={e => setEditingModel({ ...editingModel, temperature: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingModel.isActive ?? true}
                    onChange={e => setEditingModel({ ...editingModel, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">활성화</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingModel.isDefault ?? false}
                    onChange={e => setEditingModel({ ...editingModel, isDefault: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">기본 모델로 설정</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingModel.name}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
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
