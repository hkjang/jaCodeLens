'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Lock, Check, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BaselineIndicator, GrowthHistory } from '@/components/SelfAnalysis';

export default function BaselinePage() {
  const [baselines, setBaselines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBaselines = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/self-analysis/baseline');
      if (res.ok) {
        const data = await res.json();
        setBaselines(data.baselines || []);
      }
    } catch (err) {
      console.error('Failed to fetch baselines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaselines();
  }, []);

  const handleLock = async (id: string) => {
    try {
      await fetch('/api/self-analysis/baseline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'lock', actorId: 'ADMIN' })
      });
      await fetchBaselines();
    } catch (err) {
      console.error('Failed to lock baseline:', err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch('/api/self-analysis/baseline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve', actorId: 'ADMIN' })
      });
      await fetchBaselines();
    } catch (err) {
      console.error('Failed to approve baseline:', err);
    }
  };

  const activeBaseline = baselines.find(b => b.status === 'ACTIVE');

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
              기준선 관리
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              분석 기준선을 관리하고 승인합니다
            </p>
          </div>
        </div>
        <button
          onClick={fetchBaselines}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Active Baseline */}
      {activeBaseline && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            현재 활성 기준선
          </h2>
          <BaselineIndicator baseline={activeBaseline} />
        </div>
      )}

      {/* All Baselines */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          기준선 히스토리
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : baselines.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            아직 생성된 기준선이 없습니다
          </div>
        ) : (
          <div className="space-y-3">
            {baselines.map(baseline => (
              <div
                key={baseline.id}
                className={`
                  p-4 rounded-lg border-2 transition
                  ${baseline.status === 'ACTIVE' 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : baseline.status === 'LOCKED'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-gray-700'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      v{baseline.version}
                    </span>
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded
                      ${baseline.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        : baseline.status === 'LOCKED'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}
                    `}>
                      {baseline.status}
                    </span>
                    {baseline.isLocked && <Lock className="w-4 h-4 text-amber-500" />}
                    {baseline.approvedBy && (
                      <span className="text-xs text-gray-500">
                        ✓ 승인: {baseline.approvedBy}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mr-4">
                      <span>품질: {baseline.qualityScore?.toFixed(0) || '-'}</span>
                      <span className="mx-2">•</span>
                      <span>보안: {baseline.securityScore?.toFixed(0) || '-'}</span>
                    </div>
                    
                    {!baseline.isLocked && (
                      <button
                        onClick={() => handleLock(baseline.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-amber-700 bg-amber-100 rounded hover:bg-amber-200 transition"
                      >
                        <Lock className="w-3 h-3" />
                        잠금
                      </button>
                    )}
                    
                    {!baseline.approvedBy && (
                      <button
                        onClick={() => handleApprove(baseline.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-green-700 bg-green-100 rounded hover:bg-green-200 transition"
                      >
                        <Check className="w-3 h-3" />
                        승인
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  생성: {new Date(baseline.createdAt).toLocaleString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Growth History */}
      {baselines.length > 0 && (
        <GrowthHistory history={baselines} />
      )}
    </div>
  );
}
