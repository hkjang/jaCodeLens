'use client';

import React, { useState } from 'react';
import { Brain, CheckCircle2, Clock, AlertTriangle, Settings, Star, ArrowUpDown } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  provider: string;
  version: string;
  isDefault: boolean;
  isActive: boolean;
  latency: number;
  accuracy: number;
  costPerToken: number;
  usageToday: number;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([
    { id: '1', name: 'GPT-4o', provider: 'OpenAI', version: '2024-05', isDefault: true, isActive: true, latency: 1.2, accuracy: 95, costPerToken: 0.015, usageToday: 12500 },
    { id: '2', name: 'GPT-4o-mini', provider: 'OpenAI', version: '2024-07', isDefault: false, isActive: true, latency: 0.5, accuracy: 88, costPerToken: 0.0003, usageToday: 45000 },
    { id: '3', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', version: '2024-06', isDefault: false, isActive: true, latency: 0.8, accuracy: 92, costPerToken: 0.003, usageToday: 8200 },
    { id: '4', name: 'Gemini 1.5 Pro', provider: 'Google', version: '2024-05', isDefault: false, isActive: false, latency: 0.6, accuracy: 90, costPerToken: 0.00125, usageToday: 0 },
  ]);

  const setDefaultModel = (id: string) => {
    setModels(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
  };

  const toggleModel = (id: string) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 모델 관리</h1>
          <p className="text-gray-500 dark:text-gray-400">분석에 사용할 LLM 모델 선택</p>
        </div>
      </div>

      {/* Current Default */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {models.find(m => m.isDefault)?.name}
              </h3>
              <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-xs">기본 모델</span>
            </div>
            <p className="text-sm text-gray-500">모든 분석에 기본으로 사용됩니다</p>
          </div>
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {models.map((model) => (
          <div
            key={model.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border p-5 transition-all ${
              model.isDefault ? 'border-blue-500' : 'border-gray-100 dark:border-gray-700'
            } ${!model.isActive ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{model.name}</h3>
                  {model.isDefault && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                </div>
                <p className="text-sm text-gray-500">{model.provider} · v{model.version}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                model.isActive 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {model.isActive ? '활성' : '비활성'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{model.latency}s</div>
                <div className="text-xs text-gray-500">Latency</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{model.accuracy}%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div className="text-lg font-bold text-gray-900 dark:text-white">${model.costPerToken}</div>
                <div className="text-xs text-gray-500">/1K tokens</div>
              </div>
            </div>

            <div className="text-sm text-gray-500 mb-4">
              오늘 사용량: <span className="font-medium text-gray-700 dark:text-gray-300">{model.usageToday.toLocaleString()} tokens</span>
            </div>

            <div className="flex gap-2">
              {!model.isDefault && (
                <button
                  onClick={() => setDefaultModel(model.id)}
                  disabled={!model.isActive}
                  className="flex-1 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
                >
                  기본으로 설정
                </button>
              )}
              <button
                onClick={() => toggleModel(model.id)}
                disabled={model.isDefault}
                className={`px-4 py-2 rounded-lg text-sm ${
                  model.isActive
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                } disabled:opacity-50`}
              >
                {model.isActive ? '비활성화' : '활성화'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
