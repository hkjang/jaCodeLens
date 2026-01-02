'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Plus, Save, Trash2, RefreshCw, Loader2, 
  Edit2, X, ChevronDown, ChevronUp, Database, Copy, Eye, Play,
  Sparkles, CheckCircle, AlertCircle, Search
} from 'lucide-react';

interface Prompt {
  id: string | null;
  key: string;
  name: string;
  description: string | null;
  category: string;
  systemPrompt: string;
  userPromptTemplate: string | null;
  variables: string | null;
  isActive: boolean;
  version: number;
  isDefault?: boolean;
}

const CATEGORIES = ['ANALYSIS', 'JUDGE', 'AGENT', 'EXTRACTION', 'OTHER'];

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState<Prompt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; output: string } | null>(null);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/prompts');
      if (res.ok) {
        const data = await res.json();
        setPrompts(data);
      }
    } catch (err) {
      console.error('Failed to fetch prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSeedDefaults = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/prompts', { method: 'PUT' });
      if (res.ok) {
        await fetchPrompts();
      }
    } catch (err) {
      console.error('Failed to seed prompts:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editedPrompt) return;
    
    try {
      setSaving(true);
      const url = editedPrompt.id 
        ? `/api/admin/prompts/${editedPrompt.id}`
        : '/api/admin/prompts';
      const method = editedPrompt.id ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedPrompt)
      });
      
      if (res.ok) {
        await fetchPrompts();
        setIsModalOpen(false);
        setEditedPrompt(null);
      }
    } catch (err) {
      console.error('Failed to save prompt:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 프롬프트를 삭제하시겠습니까?')) return;
    
    try {
      const res = await fetch(`/api/admin/prompts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPrompts();
      }
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  };

  const handleTest = async (prompt: Prompt) => {
    setTestingId(prompt.key);
    setTestResult(null);
    
    try {
      const res = await fetch('/api/admin/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptKey: prompt.key })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Format validation results
        const validationLines = data.validations?.map((v: any) => 
          `${v.passed ? '✅' : '❌'} ${v.check}: ${v.message}`
        ).join('\n') || '';
        
        setTestResult({
          id: prompt.key,
          success: true,
          output: `✅ 프롬프트 테스트 성공!\n\n🤖 모델: ${data.model?.name} (${data.model?.provider})\n⏱️ 응답시간: ${data.duration}\n\n📋 검증 결과:\n${validationLines}\n\n📝 AI 응답 미리보기:\n${data.response?.slice(0, 200)}...`
        });
      } else {
        // Format validation failures
        const validationLines = data.validations?.map((v: any) => 
          `${v.passed ? '✅' : '❌'} ${v.check}: ${v.message}`
        ).join('\n') || '';
        
        setTestResult({
          id: prompt.key,
          success: false,
          output: `❌ 프롬프트 테스트 실패\n\n${data.error || ''}\n${data.details || ''}\n\n${validationLines ? '📋 검증 결과:\n' + validationLines : ''}`
        });
      }
    } catch (err: any) {
      setTestResult({
        id: prompt.key,
        success: false,
        output: `❌ 테스트 실패: ${err.message || '알 수 없는 오류'}`
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openEditModal = (prompt: Prompt) => {
    setEditedPrompt({ ...prompt });
    setIsModalOpen(true);
  };

  const filteredPrompts = prompts
    .filter(p => filter === 'all' || p.category === filter)
    .filter(p => search === '' || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
    );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'ANALYSIS': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'JUDGE': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'AGENT': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'EXTRACTION': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'OTHER': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    };
    return colors[category] || colors['OTHER'];
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
        <div className="flex gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
              <div className="h-16 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
            </div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 프롬프트 관리</h1>
          <p className="text-gray-500 dark:text-gray-400">모든 AI 프롬프트를 한 곳에서 관리</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedDefaults}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 transition text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            시드
          </button>
          <button
            onClick={fetchPrompts}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="프롬프트 검색..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1">
          {['all', ...CATEGORIES].map(cat => {
            const count = cat === 'all' ? prompts.length : prompts.filter(p => p.category === cat).length;
            const isActive = filter === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  isActive 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? '전체' : cat} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{prompts.length}</div>
            <MessageSquare className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-sm text-gray-500">전체 프롬프트</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-green-600">{prompts.filter(p => p.category === 'AGENT').length}</div>
            <Sparkles className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-sm text-gray-500">에이전트</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-purple-600">{prompts.filter(p => p.category === 'JUDGE').length}</div>
            <CheckCircle className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-sm text-gray-500">Judge</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">{prompts.filter(p => p.category === 'ANALYSIS').length}</div>
            <Eye className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-sm text-gray-500">분석</div>
        </div>
      </div>

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {search ? '검색 결과가 없습니다' : '프롬프트가 없습니다'}
          </h3>
          <p className="text-gray-500 mb-4">
            {search ? '다른 검색어를 시도해보세요' : '기본 프롬프트 시드를 실행하세요'}
          </p>
          {!search && (
            <button
              onClick={handleSeedDefaults}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              기본 프롬프트 생성
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPrompts.map(prompt => {
            const isPreview = previewId === prompt.key;
            const isTestSuccess = testResult?.id === prompt.key && testResult.success;
            return (
              <div
                key={prompt.key}
                className={`group bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                  isTestSuccess ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{prompt.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${getCategoryColor(prompt.category)}`}>
                          {prompt.category}
                        </span>
                      </div>
                      <code className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {prompt.key}
                      </code>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span className="text-xs text-gray-400">v{prompt.version}</span>
                    </div>
                  </div>
                  
                  {/* System Prompt Preview */}
                  <div className="mt-3 p-2 rounded bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {prompt.systemPrompt.slice(0, 100)}...
                  </div>
                  
                  {/* Variables */}
                  {prompt.variables && JSON.parse(prompt.variables).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {JSON.parse(prompt.variables).slice(0, 3).map((v: string) => (
                        <span key={v} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                          {`{{${v}}}`}
                        </span>
                      ))}
                      {JSON.parse(prompt.variables).length > 3 && (
                        <span className="text-xs text-gray-400">+{JSON.parse(prompt.variables).length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Card Actions */}
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewId(isPreview ? null : prompt.key)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-white dark:hover:bg-gray-800"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isPreview ? '접기' : '보기'}
                    </button>
                    <button
                      onClick={() => handleTest(prompt)}
                      disabled={testingId === prompt.key}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      {testingId === prompt.key ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      테스트
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(prompt)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition"
                      title="편집"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {prompt.id && (
                      <button
                        onClick={() => handleDelete(prompt.id!)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Test Result */}
                {testResult?.id === prompt.key && (
                  <div className={`px-4 py-3 border-t text-xs ${
                    testResult.success 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  }`}>
                    <pre className="whitespace-pre-wrap">{testResult.output}</pre>
                  </div>
                )}
                
                {/* Expanded Preview */}
                {isPreview && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">System Prompt</span>
                        <button onClick={() => handleCopy(prompt.systemPrompt)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                          <Copy className="w-3 h-3" /> 복사
                        </button>
                      </div>
                      <pre className="p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap break-words">
                        {prompt.systemPrompt}
                      </pre>
                    </div>
                    
                    {prompt.userPromptTemplate && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-500">User Template</span>
                          <button onClick={() => handleCopy(prompt.userPromptTemplate!)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                            <Copy className="w-3 h-3" /> 복사
                          </button>
                        </div>
                        <pre className="p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                          {prompt.userPromptTemplate}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editedPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">프롬프트 수정</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key</label>
                  <input
                    type="text"
                    value={editedPrompt.key}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">표시명</label>
                  <input
                    type="text"
                    value={editedPrompt.name}
                    onChange={e => setEditedPrompt({ ...editedPrompt, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Prompt</label>
                <textarea
                  value={editedPrompt.systemPrompt}
                  onChange={e => setEditedPrompt({ ...editedPrompt, systemPrompt: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User Template</label>
                <textarea
                  value={editedPrompt.userPromptTemplate || ''}
                  onChange={e => setEditedPrompt({ ...editedPrompt, userPromptTemplate: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variables (쉼표 구분)</label>
                <input
                  type="text"
                  value={editedPrompt.variables ? JSON.parse(editedPrompt.variables).join(', ') : ''}
                  onChange={e => setEditedPrompt({ 
                    ...editedPrompt, 
                    variables: JSON.stringify(e.target.value.split(',').map(v => v.trim()).filter(Boolean))
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  placeholder="code, filePath"
                />
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
                disabled={saving}
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
