'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle2, Info, AlertCircle, XCircle,
  ChevronDown, ChevronUp, FileCode, Tag, Clock, Loader2,
  ShieldCheck, Layers, TestTube2, Package, Palette
} from 'lucide-react';

interface AnalysisResult {
  id: string;
  category: string;
  severity: string;
  message: string;
  suggestion?: string;
  filePath?: string;
  lineNumber?: number;
  reviewStatus: string;
  createdAt: string;
}

interface ResultsStats {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
}

interface ResultsPanelProps {
  executionId: string | null;
}

const CATEGORY_ICONS: Record<string, any> = {
  'SECURITY': ShieldCheck,
  'ARCHITECTURE': Layers,
  'QUALITY': AlertCircle,
  'TEST': TestTube2,
  'DEPENDENCY': Package,
  'STYLE': Palette,
};

const SEVERITY_COLORS: Record<string, string> = {
  'CRITICAL': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'HIGH': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'MEDIUM': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'LOW': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'INFO': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const SEVERITY_ICONS: Record<string, any> = {
  'CRITICAL': XCircle,
  'HIGH': AlertTriangle,
  'MEDIUM': AlertCircle,
  'LOW': Info,
  'INFO': Info,
};

export function ResultsPanel({ executionId }: ResultsPanelProps) {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, AnalysisResult[]>>({});
  const [stats, setStats] = useState<ResultsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (executionId) {
      fetchResults(executionId);
    }
  }, [executionId]);

  const fetchResults = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/self-analysis/results/${id}`);
      if (!res.ok) throw new Error('Failed to fetch results');
      const data = await res.json();
      setResults(data.results || []);
      setByCategory(data.byCategory || {});
      setStats(data.stats);
      // Auto-expand first category with results
      const cats = Object.keys(data.byCategory || {});
      if (cats.length > 0) setExpandedCategory(cats[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!executionId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8 text-gray-500">
          <FileCode className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>분석 결과를 보려면 히스토리에서 분석을 선택하세요</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          결과 로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8 text-red-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">분석 결과</h3>
        
        {/* Stats Summary */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(stats.bySeverity).map(([severity, count]) => {
              const Icon = SEVERITY_ICONS[severity] || Info;
              return count > 0 ? (
                <div
                  key={severity}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${SEVERITY_COLORS[severity]}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{count}</span>
                  <span className="text-xs opacity-80">{severity}</span>
                </div>
              ) : null;
            })}
          </div>
        )}
        
        {stats && stats.total === 0 && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <div>
              <span className="font-medium text-green-700 dark:text-green-400">
                분석 완료! 이슈가 발견되지 않았습니다.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Results by Category */}
      {Object.entries(byCategory).length > 0 && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Object.entries(byCategory).map(([category, categoryResults]) => {
            const Icon = CATEGORY_ICONS[category] || Tag;
            const isExpanded = expandedCategory === category;
            
            return (
              <div key={category}>
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900 dark:text-white">{category}</span>
                    <span className="text-sm text-gray-500">({categoryResults.length})</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {categoryResults.map(result => {
                      const SevIcon = SEVERITY_ICONS[result.severity] || Info;
                      return (
                        <div
                          key={result.id}
                          className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <div className="flex items-start gap-3">
                            <span className={`p-1 rounded ${SEVERITY_COLORS[result.severity]}`}>
                              <SevIcon className="w-4 h-4" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white">
                                {result.message}
                              </p>
                              {result.suggestion && (
                                <p className="text-xs text-gray-500 mt-1">
                                  💡 {result.suggestion}
                                </p>
                              )}
                              {result.filePath && (
                                <p className="text-xs text-gray-400 mt-1 font-mono">
                                  📄 {result.filePath}{result.lineNumber ? `:${result.lineNumber}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ResultsPanel;
