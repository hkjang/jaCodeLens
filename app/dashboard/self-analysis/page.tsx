'use client';

import React, { useEffect, useState } from 'react';
import { 
  Star, 
  Shield, 
  Activity, 
  RefreshCw, 
  Settings,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { 
  SelfAnalysisBadge, 
  InternalCoreBadge, 
  TagBadge,
  BaselineIndicator,
  TriggerPanel,
  GrowthHistory
} from '@/components/SelfAnalysis';

interface SelfProjectData {
  id: string;
  projectId: string;
  project: {
    id: string;
    name: string;
    path: string;
  };
  type: string;
  tags: string[];
  visibility: string;
  triggers: {
    push: boolean;
    merge: boolean;
    build: boolean;
    deploy: boolean;
    schedule: boolean;
  };
  baselines: any[];
  policies: any[];
  registeredAt: string;
}

export default function SelfAnalysisPage() {
  const [selfProject, setSelfProject] = useState<SelfProjectData | null>(null);
  const [triggerHistory, setTriggerHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch self project
      const projectRes = await fetch('/api/self-analysis/project');
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setSelfProject(projectData);
      } else if (projectRes.status === 404) {
        setSelfProject(null);
      }
      
      // Fetch trigger history
      const triggerRes = await fetch('/api/self-analysis/trigger?limit=10');
      if (triggerRes.ok) {
        const triggerData = await triggerRes.json();
        setTriggerHistory(triggerData.triggers || []);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInitialize = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/self-analysis/project', { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      setError('Failed to initialize self project');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTrigger = async () => {
    try {
      setIsTriggering(true);
      await fetch('/api/self-analysis/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MANUAL', triggeredBy: 'ADMIN' })
      });
      await fetchData();
    } catch (err) {
      console.error('Trigger failed:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleToggleTrigger = async (type: string, enabled: boolean) => {
    if (!selfProject) return;
    
    try {
      await fetch('/api/self-analysis/project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggers: {
            ...selfProject.triggers,
            [type]: enabled
          }
        })
      });
      await fetchData();
    } catch (err) {
      console.error('Toggle trigger failed:', err);
    }
  };

  if (loading && !selfProject) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          로딩 중...
        </div>
      </div>
    );
  }

  if (!selfProject) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <Star className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Self-Analysis 시작하기
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            현재 서비스를 기본 프로젝트로 등록하여 자동 분석을 시작합니다.
            등록된 프로젝트는 모든 분석의 기준점이 됩니다.
          </p>
          <button
            onClick={handleInitialize}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                초기화 중...
              </span>
            ) : (
              'Self-Analysis 등록'
            )}
          </button>
        </div>
      </div>
    );
  }

  const activeBaseline = selfProject.baselines[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Self-Analysis
            </h1>
            <SelfAnalysisBadge />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {selfProject.project.name} - 기본 프로젝트 자동 분석
          </p>
        </div>
        <Link
          href="/dashboard/self-analysis/policy"
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <Settings className="w-4 h-4" />
          정책 설정
        </Link>
      </div>

      {/* Project Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {selfProject.project.name}
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <InternalCoreBadge />
              {selfProject.tags.map(tag => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              경로: {selfProject.project.path}
            </p>
          </div>
          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
            <div>등록일: {new Date(selfProject.registeredAt).toLocaleDateString('ko-KR')}</div>
            <div>가시성: {selfProject.visibility}</div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/self-analysis/baseline"
          className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">기준선 관리</div>
              <div className="text-sm text-gray-500">v{activeBaseline?.version || '-'} 활성</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition" />
        </Link>
        
        <Link
          href="/dashboard/self-analysis/backlog"
          className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">백로그</div>
              <div className="text-sm text-gray-500">자동 생성된 이슈</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition" />
        </Link>
        
        <Link
          href="/dashboard/self-analysis/compare"
          className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">비교 분석</div>
              <div className="text-sm text-gray-500">다른 프로젝트와 비교</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition" />
        </Link>
      </div>

      {/* Active Baseline */}
      {activeBaseline && (
        <BaselineIndicator baseline={activeBaseline} />
      )}

      {/* Trigger Panel */}
      <TriggerPanel
        triggers={selfProject.triggers}
        history={triggerHistory}
        onManualTrigger={handleManualTrigger}
        onToggleTrigger={handleToggleTrigger}
        isTriggering={isTriggering}
        onRefresh={fetchData}
      />

      {/* Growth History */}
      {selfProject.baselines.length > 0 && (
        <GrowthHistory history={selfProject.baselines} />
      )}
    </div>
  );
}
