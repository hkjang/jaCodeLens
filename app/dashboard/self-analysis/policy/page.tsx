'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowLeft, Save, Plus, Check, X } from 'lucide-react';
import Link from 'next/link';

interface Policy {
  id: string;
  name: string;
  isActive: boolean;
  failureTolerance: number;
  warningThreshold: number;
  confidenceWeight: number;
  requireExplanation: boolean;
  requireHumanApproval: boolean;
  blockOnThresholdExceeded: boolean;
  agentSettings?: string;
}

export default function PolicyPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/self-analysis/policy');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
        if (data.policies?.length > 0 && !selectedPolicy) {
          setSelectedPolicy(data.policies.find((p: Policy) => p.isActive) || data.policies[0]);
        }
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

  const handleSave = async () => {
    if (!selectedPolicy) return;
    
    try {
      setSaving(true);
      await fetch('/api/self-analysis/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedPolicy)
      });
      await fetchPolicies();
    } catch (err) {
      console.error('Failed to save policy:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (policyId: string) => {
    try {
      await fetch('/api/self-analysis/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: policyId, setActive: true })
      });
      await fetchPolicies();
    } catch (err) {
      console.error('Failed to activate policy:', err);
    }
  };

  const handleCreate = async () => {
    if (!newPolicyName.trim()) return;
    
    try {
      await fetch('/api/self-analysis/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPolicyName })
      });
      setNewPolicyName('');
      setShowCreateModal(false);
      await fetchPolicies();
    } catch (err) {
      console.error('Failed to create policy:', err);
    }
  };

  const updateField = (field: keyof Policy, value: any) => {
    if (selectedPolicy) {
      setSelectedPolicy({ ...selectedPolicy, [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/self-analysis"
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              분석 정책 관리
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Self-Analysis 전용 엄격한 분석 정책을 설정합니다
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          새 정책
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Policy List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">
            정책 목록
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {policies.map(policy => (
                <button
                  key={policy.id}
                  onClick={() => setSelectedPolicy(policy)}
                  className={`
                    w-full text-left p-3 rounded-lg border-2 transition
                    ${selectedPolicy?.id === policy.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {policy.name}
                    </span>
                    {policy.isActive && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded">
                        활성
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Policy Editor */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {selectedPolicy ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedPolicy.name}
                </h2>
                <div className="flex items-center gap-2">
                  {!selectedPolicy.isActive && (
                    <button
                      onClick={() => handleSetActive(selectedPolicy.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition"
                    >
                      <Check className="w-4 h-4" />
                      활성화
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        저장
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Numeric Settings */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      실패 허용 수
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={selectedPolicy.failureTolerance}
                      onChange={(e) => updateField('failureTolerance', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">0 = Zero Tolerance</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      경고 임계치
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={selectedPolicy.warningThreshold}
                      onChange={(e) => updateField('warningThreshold', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">0.8 = 80% 기준</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      신뢰도 가중치
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={selectedPolicy.confidenceWeight}
                      onChange={(e) => updateField('confidenceWeight', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">1.0 = 최고 신뢰도</p>
                  </div>
                </div>

                {/* Boolean Settings */}
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPolicy.requireExplanation}
                      onChange={(e) => updateField('requireExplanation', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">설명 필수</span>
                      <p className="text-sm text-gray-500">모든 분석 결과에 근거 설명을 요구합니다</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPolicy.requireHumanApproval}
                      onChange={(e) => updateField('requireHumanApproval', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">휴먼 승인 필수</span>
                      <p className="text-sm text-gray-500">결과 확정 전 관리자 승인을 요구합니다</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPolicy.blockOnThresholdExceeded}
                      onChange={(e) => updateField('blockOnThresholdExceeded', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">릴리즈 차단</span>
                      <p className="text-sm text-gray-500">임계치 초과 시 배포를 자동으로 차단합니다</p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              왼쪽에서 정책을 선택하세요
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              새 정책 생성
            </h2>
            <input
              type="text"
              placeholder="정책 이름"
              value={newPolicyName}
              onChange={(e) => setNewPolicyName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!newPolicyName.trim()}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
