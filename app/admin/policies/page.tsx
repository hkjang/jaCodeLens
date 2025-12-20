'use client';

import React, { useState } from 'react';
import { FileText, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Policy {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  rules: { key: string; value: string; severity: string }[];
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([
    { 
      id: '1', 
      name: 'Security Standards', 
      description: '보안 분석 기준',
      category: 'Security',
      isActive: true, 
      rules: [
        { key: 'sql_injection_check', value: 'enabled', severity: 'critical' },
        { key: 'xss_check', value: 'enabled', severity: 'high' },
        { key: 'hardcoded_secrets', value: 'enabled', severity: 'critical' },
      ]
    },
    { 
      id: '2', 
      name: 'Quality Thresholds', 
      description: '코드 품질 임계값',
      category: 'Quality',
      isActive: true, 
      rules: [
        { key: 'max_complexity', value: '10', severity: 'medium' },
        { key: 'max_function_lines', value: '50', severity: 'low' },
        { key: 'min_test_coverage', value: '80', severity: 'medium' },
      ]
    },
    { 
      id: '3', 
      name: 'Architecture Rules', 
      description: '아키텍처 규칙',
      category: 'Architecture',
      isActive: false, 
      rules: [
        { key: 'layer_violation', value: 'enabled', severity: 'high' },
        { key: 'circular_dependency', value: 'enabled', severity: 'high' },
      ]
    },
  ]);

  const togglePolicy = (id: string) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Security': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Quality': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Architecture': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">분석 정책</h1>
          <p className="text-gray-500 dark:text-gray-400">분석 규칙 및 임계값 설정</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors">
          <Plus className="w-4 h-4" />
          정책 추가
        </button>
      </div>

      {/* Policies Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border p-5 transition-all ${
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
                onClick={() => togglePolicy(policy.id)}
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{policy.description}</p>

            <div className="space-y-2 mb-4">
              {policy.rules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-gray-50 dark:bg-gray-900/50">
                  <span className="text-gray-600 dark:text-gray-300">{rule.key}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-500">{rule.value}</span>
                    <span className={`text-xs uppercase ${getSeverityColor(rule.severity)}`}>{rule.severity}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                <Edit2 className="w-3 h-3" />
                편집
              </button>
              <button className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm hover:bg-red-200 dark:hover:bg-red-900/50">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
