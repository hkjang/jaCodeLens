'use client';

/**
 * 스냅샷 관리 페이지
 * 
 * 분석 스냅샷 목록 조회 및 비교
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Camera, 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  GitCommit,
  GitBranch,
  FileCode,
  ArrowRight,
  Eye,
  Download,
  Trash2,
  ChevronDown,
  Scale
} from 'lucide-react';

interface SnapshotMeta {
  id: string;
  projectId: string;
  executeId: string;
  createdAt: string;
  commitHash: string;
  branch: string;
  tag?: string;
  pipelineVersion: string;
  ruleVersion: string;
  aiModel?: string;
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    filesAnalyzed: number;
    linesOfCode: number;
    analyzedDuration: number;
  };
  checksum: string;
}

interface ComparisonResult {
  added: any[];
  removed: any[];
  changed: any[];
  unchanged: number;
  summary: {
    totalBefore: number;
    totalAfter: number;
    netChange: number;
    newCritical: number;
    resolvedCritical: number;
  };
}

export default function SnapshotsPage() {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [projectFilter, setProjectFilter] = useState('');

  useEffect(() => {
    loadSnapshots();
  }, [projectFilter]);

  async function loadSnapshots() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set('projectId', projectFilter);
      params.set('pageSize', '20');

      const res = await fetch(`/api/analysis/snapshots?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots);
      }
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      setLoading(false);
    }
  }

  async function compareSnapshots() {
    if (selectedSnapshots.length !== 2) return;
    
    setComparing(true);
    try {
      const res = await fetch('/api/analysis/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotIdA: selectedSnapshots[0],
          snapshotIdB: selectedSnapshots[1],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComparison(data.comparison);
      }
    } catch (error) {
      console.error('Failed to compare snapshots:', error);
    } finally {
      setComparing(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedSnapshots(prev => {
      if (prev.includes(id)) {
        return prev.filter(s => s !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
    setComparison(null);
  }

  // Mock 데이터 (API가 비어있을 경우)
  const displaySnapshots = snapshots.length > 0 ? snapshots : [
    {
      id: 'snap_001',
      projectId: 'proj_1',
      executeId: 'exec_001',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      commitHash: 'abc1234567890def',
      branch: 'main',
      pipelineVersion: '1.0.0',
      ruleVersion: '1.0.0',
      aiModel: 'gemini-2.0-flash',
      summary: {
        totalIssues: 42,
        critical: 2,
        high: 8,
        medium: 15,
        low: 12,
        info: 5,
        filesAnalyzed: 156,
        linesOfCode: 12450,
        analyzedDuration: 45000,
      },
      checksum: 'sha256_checksum_here',
    },
    {
      id: 'snap_002',
      projectId: 'proj_1',
      executeId: 'exec_002',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      commitHash: 'def4567890abc123',
      branch: 'main',
      pipelineVersion: '1.0.0',
      ruleVersion: '1.0.0',
      aiModel: 'gemini-2.0-flash',
      summary: {
        totalIssues: 38,
        critical: 1,
        high: 6,
        medium: 14,
        low: 12,
        info: 5,
        filesAnalyzed: 152,
        linesOfCode: 12200,
        analyzedDuration: 42000,
      },
      checksum: 'sha256_checksum_here2',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">분석 스냅샷</h2>
          <p className="text-gray-500">재현 가능한 분석 결과를 관리하고 비교합니다</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedSnapshots.length === 2 && (
            <button
              onClick={compareSnapshots}
              disabled={comparing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {comparing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Scale className="w-4 h-4" />
              )}
              비교하기
            </button>
          )}
          <button
            onClick={loadSnapshots}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 비교 결과 */}
      {comparison && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-500" />
            비교 결과
          </h3>
          
          <div className="grid grid-cols-5 gap-4 mb-6">
            <StatCard label="추가됨" value={comparison.added.length} color="text-green-500" />
            <StatCard label="제거됨" value={comparison.removed.length} color="text-red-500" />
            <StatCard label="변경됨" value={comparison.changed.length} color="text-yellow-500" />
            <StatCard label="변화 없음" value={comparison.unchanged} color="text-gray-500" />
            <StatCard 
              label="순 변화" 
              value={comparison.summary.netChange} 
              color={comparison.summary.netChange > 0 ? 'text-red-500' : 'text-green-500'}
              prefix={comparison.summary.netChange > 0 ? '+' : ''}
            />
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              신규 치명적: <span className="text-red-600 font-semibold">{comparison.summary.newCritical}</span>
            </span>
            <span className="text-gray-500">
              해결된 치명적: <span className="text-green-600 font-semibold">{comparison.summary.resolvedCritical}</span>
            </span>
          </div>
        </div>
      )}

      {/* 스냅샷 안내 */}
      {selectedSnapshots.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {selectedSnapshots.length}개 선택됨 - {selectedSnapshots.length === 1 ? '비교할 스냅샷을 하나 더 선택하세요' : '비교하기 버튼을 클릭하세요'}
        </div>
      )}

      {/* 스냅샷 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {displaySnapshots.map(snapshot => {
            const isSelected = selectedSnapshots.includes(snapshot.id);
            const createdAt = new Date(snapshot.createdAt);

            return (
              <div
                key={snapshot.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => toggleSelect(snapshot.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500 text-white' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && <CheckCircle className="w-3 h-3" />}
                    </div>

                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Camera className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {snapshot.id}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <GitBranch className="w-3 h-3" />
                          {snapshot.branch}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <GitCommit className="w-3 h-3" />
                          {snapshot.commitHash.slice(0, 7)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {createdAt.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileCode className="w-3 h-3" />
                          {snapshot.summary.filesAnalyzed} 파일
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* 이슈 요약 */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-red-500 font-semibold">{snapshot.summary.critical}</span>
                      <span className="text-orange-500 font-semibold">{snapshot.summary.high}</span>
                      <span className="text-yellow-500 font-semibold">{snapshot.summary.medium}</span>
                      <span className="text-blue-500 font-semibold">{snapshot.summary.low}</span>
                    </div>

                    {/* 버전 정보 */}
                    <div className="text-xs text-gray-400">
                      <div>파이프라인 v{snapshot.pipelineVersion}</div>
                      <div>룰 v{snapshot.ruleVersion}</div>
                    </div>

                    <Link
                      href={`/dashboard/analysis/${snapshot.executeId}`}
                      onClick={e => e.stopPropagation()}
                      className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  color, 
  prefix = '' 
}: { 
  label: string; 
  value: number; 
  color: string; 
  prefix?: string;
}) {
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className={`text-2xl font-bold ${color}`}>{prefix}{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
