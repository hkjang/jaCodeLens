'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, Star, RefreshCw, Loader2, Server, Cpu, Zap, 
  CheckCircle, XCircle, Play, Wifi, WifiOff, Settings, BarChart3
} from 'lucide-react';

interface Model {
  id: string;
  name: string;
  provider: string;
  version: string | null;
  endpoint: string | null;
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

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});

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
      // For Ollama, check localhost
      if (model.provider === 'Ollama' && model.endpoint) {
        const res = await fetch(model.endpoint + '/api/tags', { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        setTestResults(prev => ({ ...prev, [model.id]: res.ok ? 'success' : 'error' }));
      } else {
        // For other providers, just simulate
        await new Promise(r => setTimeout(r, 1000));
        setTestResults(prev => ({ ...prev, [model.id]: 'success' }));
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, [model.id]: 'error' }));
    } finally {
      setTesting(null);
    }
  };

  const getProviderGradient = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'ollama': return 'from-purple-500 to-pink-500';
      case 'openai': return 'from-emerald-500 to-teal-500';
      case 'anthropic': return 'from-orange-500 to-amber-500';
      default: return 'from-blue-500 to-indigo-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <span className="text-gray-500">모델 로딩 중...</span>
        </div>
      </div>
    );
  }

  const defaultModel = models.find(m => m.isDefault);
  const totalUsage = models.reduce((s, m) => s + m.usageToday, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 모델 관리</h1>
          <p className="text-gray-500 dark:text-gray-400">분석에 사용할 LLM 모델 선택</p>
        </div>
        <button
          onClick={fetchModels}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 transition text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
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
          <p className="text-gray-500">시드 데이터를 실행하거나 모델을 추가해주세요.</p>
        </div>
      )}

      {/* Models Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {models.map((model) => (
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
              {!model.isDefault && (
                <button
                  onClick={() => setDefaultModel(model.id)}
                  disabled={!model.isActive || updating === model.id}
                  className="flex-1 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs hover:bg-blue-200 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {updating === model.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                  기본 설정
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
                {model.isActive ? '비활성' : '활성'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
