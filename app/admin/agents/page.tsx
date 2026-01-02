'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, Settings, ToggleLeft, ToggleRight, RefreshCw, Plus, MessageSquare, 
  Brain, ExternalLink, Loader2, Trash2, Edit2, X, Save, ChevronUp, ChevronDown,
  Play, AlertCircle, CheckCircle, Clock, Database, Zap, Search, Filter
} from 'lucide-react';
import Link from 'next/link';

interface Prompt {
  id: string;
  key: string;
  name: string;
}

interface AgentConfig {
  id: string | null;
  name: string;
  displayName: string;
  description: string | null;
  category: string;
  isEnabled: boolean;
  priority: number;
  timeout: number;
  maxRetries: number;
  promptId: string | null;
  prompt?: Prompt | null;
  modelId: string | null;
  status: string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  avgDuration: number;
  isDefault?: boolean;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  isDefault: boolean;
}

const CATEGORIES = ['ANALYSIS', 'SECURITY', 'QUALITY', 'PERFORMANCE', 'OTHER'];

export default function AgentsConfigPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultModel, setDefaultModel] = useState<AIModel | null>(null);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewAgent, setIsNewAgent] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, promptsRes, modelsRes] = await Promise.all([
        fetch('/api/admin/agents'),
        fetch('/api/admin/prompts'),
        fetch('/api/admin/ai-models')
      ]);
      
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (promptsRes.ok) {
        const promptData = await promptsRes.json();
        setPrompts(promptData.filter((p: any) => p.category === 'AGENT'));
      }
      if (modelsRes.ok) {
        const models = await modelsRes.json();
        setDefaultModel(models.find((m: AIModel) => m.isDefault) || null);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSaving(true);
    try {
      // First seed prompts, then agents
      await fetch('/api/admin/prompts', { method: 'PUT' });
      await fetch('/api/admin/agents', { method: 'PUT' });
      await fetchData();
    } catch (err) {
      console.error('Failed to seed:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = async (agent: AgentConfig) => {
    if (!agent.id) return;
    
    try {
      await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !agent.isEnabled })
      });
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, isEnabled: !agent.isEnabled } : a));
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  };

  const handleSave = async () => {
    if (!editingAgent) return;
    
    setSaving(true);
    try {
      const url = isNewAgent ? '/api/admin/agents' : `/api/admin/agents/${editingAgent.id}`;
      const method = isNewAgent ? 'POST' : 'PATCH';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAgent)
      });
      
      if (res.ok) {
        await fetchData();
        setIsModalOpen(false);
        setEditingAgent(null);
      }
    } catch (err) {
      console.error('Failed to save agent:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 에이전트를 삭제하시겠습니까?')) return;
    
    try {
      await fetch(`/api/admin/agents/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  };

  const openEditModal = (agent?: AgentConfig) => {
    if (agent) {
      setEditingAgent({ ...agent });
      setIsNewAgent(false);
    } else {
      setEditingAgent({
        id: null,
        name: '',
        displayName: '',
        description: '',
        category: 'ANALYSIS',
        isEnabled: true,
        priority: 1,
        timeout: 60,
        maxRetries: 3,
        promptId: null,
        modelId: null,
        status: 'idle',
        totalRuns: 0,
        successRuns: 0,
        failedRuns: 0,
        avgDuration: 0
      });
      setIsNewAgent(true);
    }
    setIsModalOpen(true);
  };

  const movePriority = async (agent: AgentConfig, direction: 'up' | 'down') => {
    if (!agent.id) return;
    const newPriority = direction === 'up' ? agent.priority - 1 : agent.priority + 1;
    if (newPriority < 1) return;
    
    try {
      await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'SECURITY': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'QUALITY': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'ANALYSIS': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'PERFORMANCE': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[category] || 'bg-gray-100 text-gray-600';
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
          <div className="flex gap-2">
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const enabledCount = agents.filter(a => a.isEnabled).length;
  const errorCount = agents.filter(a => a.status === 'error').length;
  const totalRuns = agents.reduce((sum, a) => sum + a.totalRuns, 0);
  
  // Filter agents
  const filteredAgents = agents
    .filter(a => categoryFilter === 'all' || a.category === categoryFilter)
    .filter(a => search === '' || 
      a.displayName.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">에이전트 설정</h1>
          <p className="text-gray-500 dark:text-gray-400">AI 분석 에이전트 CRUD 관리</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedDefaults}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg hover:bg-purple-200 transition text-sm"
          >
            <Database className="w-4 h-4" />
            시드
          </button>
          <button
            onClick={() => openEditModal()}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="에이전트 검색..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1">
          {['all', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                categoryFilter === cat 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? '전체' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link 
          href="/admin/models"
          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:border-purple-500/40 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-white">AI 모델</div>
            <div className="text-sm text-gray-500">
              {defaultModel ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {defaultModel.name} ({defaultModel.provider})
                </span>
              ) : '모델 미설정'}
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </Link>
        
        <Link 
          href="/admin/prompts?category=AGENT"
          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/40 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-white">AI 프롬프트</div>
            <div className="text-sm text-gray-500">{prompts.length}개 에이전트 프롬프트</div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{agents.length}</div>
            <Bot className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-sm text-gray-500">전체 에이전트</div>
        </div>
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-sm text-green-600">활성화됨</div>
        </div>
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-sm text-red-500">에러</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">{totalRuns}</div>
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-sm text-blue-500">총 실행</div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {agents.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">에이전트가 없습니다</h3>
            <p className="text-gray-500 mb-4">기본 에이전트를 시드하거나 새로 추가하세요</p>
            <button
              onClick={handleSeedDefaults}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              기본 에이전트 생성
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">우선순위</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">에이전트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">프롬프트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">설정</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">통계</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">활성화</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredAgents.sort((a, b) => a.priority - b.priority).map((agent) => (
                <tr key={agent.id || agent.name} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!agent.isEnabled ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                        {agent.priority}
                      </span>
                      {agent.id && (
                        <div className="flex flex-col">
                          <button onClick={() => movePriority(agent, 'up')} className="p-0.5 hover:bg-gray-200 rounded">
                            <ChevronUp className="w-3 h-3 text-gray-400" />
                          </button>
                          <button onClick={() => movePriority(agent, 'down')} className="p-0.5 hover:bg-gray-200 rounded">
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{agent.displayName}</span>
                          {getStatusIcon(agent.status)}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(agent.category)}`}>
                            {agent.category}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{agent.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {agent.prompt ? (
                      <Link 
                        href={`/admin/prompts?key=${agent.prompt.key}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs hover:bg-green-200 transition"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {agent.prompt.name}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">미연결</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-xs text-gray-500">
                      <div>Timeout: {agent.timeout}s</div>
                      <div>Retry: {agent.maxRetries}회</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="text-xs">
                      <span className="text-green-600">{agent.successRuns}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="text-gray-600">{agent.totalRuns}</span>
                      {agent.avgDuration > 0 && (
                        <span className="text-gray-400 ml-2">~{agent.avgDuration.toFixed(1)}s</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleAgent(agent)} disabled={!agent.id}>
                      {agent.isEnabled ? (
                        <ToggleRight className="w-8 h-8 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => openEditModal(agent)}
                        className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        title="편집"
                      >
                        <Edit2 className="w-4 h-4 text-blue-500" />
                      </button>
                      {agent.id && (
                        <button 
                          onClick={() => handleDelete(agent.id!)}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isNewAgent ? '새 에이전트 추가' : '에이전트 수정'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">클래스명 (영문)</label>
                  <input
                    type="text"
                    value={editingAgent.name}
                    onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                    disabled={!isNewAgent}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    placeholder="SecurityAnalysisAgent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">표시 이름</label>
                  <input
                    type="text"
                    value={editingAgent.displayName}
                    onChange={e => setEditingAgent({ ...editingAgent, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="보안 분석"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설명</label>
                <input
                  type="text"
                  value={editingAgent.description || ''}
                  onChange={e => setEditingAgent({ ...editingAgent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="에이전트 설명"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">카테고리</label>
                  <select
                    value={editingAgent.category}
                    onChange={e => setEditingAgent({ ...editingAgent, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">프롬프트</label>
                  <select
                    value={editingAgent.promptId || ''}
                    onChange={e => setEditingAgent({ ...editingAgent, promptId: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">프롬프트 미연결</option>
                    {prompts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">우선순위</label>
                  <input
                    type="number"
                    min={1}
                    value={editingAgent.priority}
                    onChange={e => setEditingAgent({ ...editingAgent, priority: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timeout (초)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingAgent.timeout}
                    onChange={e => setEditingAgent({ ...editingAgent, timeout: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">최대 재시도</label>
                  <input
                    type="number"
                    min={0}
                    value={editingAgent.maxRetries}
                    onChange={e => setEditingAgent({ ...editingAgent, maxRetries: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingAgent.isEnabled}
                    onChange={e => setEditingAgent({ ...editingAgent, isEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">활성화</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingAgent.name || !editingAgent.displayName}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
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
