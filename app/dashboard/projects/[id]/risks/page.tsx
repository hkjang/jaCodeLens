'use client';

/**
 * 프로젝트별 리스크 맵 페이지
 * 
 * 경로: /dashboard/projects/[id]/risks
 * - URL에서 프로젝트 ID를 직접 가져옴
 * - 프로젝트 선택기 불필요
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Shield, BarChart3, Layers, Activity, CheckCircle, FileCode, FolderGit2, ChevronRight, RefreshCw, X, ArrowLeft, Info, FileWarning, Search } from 'lucide-react';

interface RiskIssue {
  id: string;
  filePath: string;
  message: string;
  severity: string;
  category: string;
  lineStart: number;
  suggestion?: string;
}

interface RiskData {
  module: string;
  security: number;
  quality: number;
  structure: number;
  operations: number;
  test: number;
  standards: number;
}

// 카테고리 설정
const categories = ['security', 'quality', 'structure', 'operations', 'test', 'standards'];
const categoryLabels: Record<string, string> = {
  security: '보안',
  quality: '품질',
  structure: '구조',
  operations: '운영',
  test: '테스트',
  standards: '표준',
};
const categoryIcons: Record<string, any> = {
  security: Shield,
  quality: BarChart3,
  structure: Layers,
  operations: Activity,
  test: CheckCircle,
  standards: FileCode,
};

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-white',
  LOW: 'bg-blue-500 text-white',
  INFO: 'bg-gray-400 text-white',
};

function getRiskColor(value: number): string {
  if (value <= 2) return 'bg-green-500';
  if (value <= 4) return 'bg-yellow-500';
  if (value <= 6) return 'bg-orange-500';
  return 'bg-red-500';
}

function getRiskLevel(value: number): string {
  if (value <= 2) return '낮음';
  if (value <= 4) return '보통';
  if (value <= 6) return '높음';
  return '심각';
}

export default function ProjectRisksPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 드릴다운 상태
  const [selectedModule, setSelectedModule] = useState<RiskData | null>(null);
  const [moduleIssues, setModuleIssues] = useState<RiskIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  
  // 필터 상태
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  // 필터링된 이슈
  const filteredIssues = useMemo(() => {
    return moduleIssues.filter(issue => {
      if (severityFilter && issue.severity !== severityFilter) return false;
      if (categoryFilter && issue.category.toLowerCase() !== categoryFilter) return false;
      return true;
    });
  }, [moduleIssues, severityFilter, categoryFilter]);

  // 심각도별 통계
  const severityStats = useMemo(() => {
    const stats: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    moduleIssues.forEach(i => { stats[i.severity] = (stats[i.severity] || 0) + 1; });
    return stats;
  }, [moduleIssues]);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    try {
      // 프로젝트 정보 로드
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
      }

      // 리스크 데이터 로드
      const res = await fetch(`/api/projects/${projectId}/risks`);
      if (res.ok) {
        const data = await res.json();
        setRiskData(data);
      } else {
        setRiskData([]);
      }
    } catch (e) {
      console.error('Failed to load risk data', e);
      setRiskData([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleModuleClick(module: RiskData) {
    setSelectedModule(module);
    setIssuesLoading(true);
    setSeverityFilter('');
    setCategoryFilter('');
    
    try {
      const res = await fetch(`/api/projects/${projectId}/risks/${encodeURIComponent(module.module)}`);
      if (res.ok) {
        const data = await res.json();
        setModuleIssues(data.issues || []);
      } else {
        setModuleIssues([]);
      }
    } catch (e) {
      console.error('Failed to load module issues', e);
      setModuleIssues([]);
    } finally {
      setIssuesLoading(false);
    }
  }

  const hasData = riskData.length > 0;
  const highRiskCount = riskData.filter(d => 
    d.security > 6 || d.quality > 6 || d.structure > 6 || d.operations > 6
  ).length;

  // 드릴다운 뷰
  if (selectedModule) {
    return (
      <div className="space-y-6">
        {/* 브레드크럼 */}
        <header className="flex items-center gap-2 text-sm">
          <Link href={`/dashboard/projects/${projectId}`} className="text-gray-500 hover:text-blue-600">
            {project?.name || '프로젝트'}
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button onClick={() => setSelectedModule(null)} className="text-gray-500 hover:text-blue-600">
            리스크 맵
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
            <FolderGit2 className="w-4 h-4" />
            {selectedModule.module}/
          </span>
        </header>

        {/* 모듈 정보 카드 */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                📁 {selectedModule.module}
              </h2>
              <p className="text-blue-100 mt-1">
                {moduleIssues.length}개 이슈 발견
              </p>
            </div>
            {(() => {
              const values = [selectedModule.security, selectedModule.quality, selectedModule.structure, selectedModule.operations, selectedModule.test, selectedModule.standards];
              const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
              return (
                <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                  avg > 6 ? 'bg-red-600' : avg > 4 ? 'bg-orange-500' : avg > 2 ? 'bg-yellow-500' : 'bg-green-500'
                }`}>
                  위험도 {avg}/10
                </div>
              );
            })()}
          </div>

          {/* 카테고리 필터 */}
          <div className="grid grid-cols-6 gap-2 mt-6">
            {categories.map(cat => {
              const value = selectedModule[cat as keyof RiskData] as number;
              const Icon = categoryIcons[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(p => p === cat ? '' : cat)}
                  className={`text-center p-3 rounded-lg transition ${
                    categoryFilter === cat ? 'bg-white/30 ring-2 ring-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1" />
                  <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center font-bold ${
                    value > 6 ? 'bg-red-600' : value > 4 ? 'bg-orange-500' : value > 2 ? 'bg-yellow-500' : 'bg-green-600'
                  }`}>
                    {value}
                  </div>
                  <div className="text-xs mt-1 text-blue-100">{categoryLabels[cat]}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 필터 바 */}
        <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">심각도:</span>
            <div className="flex gap-1">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(p => p === sev ? '' : sev)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    severityFilter === sev 
                      ? `${severityColors[sev]} ring-2 ring-offset-1` 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {sev} ({severityStats[sev] || 0})
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1" />
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSuggestions}
              onChange={e => setShowSuggestions(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">💡 개선 제안</span>
          </label>

          {(severityFilter || categoryFilter) && (
            <button
              onClick={() => { setSeverityFilter(''); setCategoryFilter(''); }}
              className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              필터 초기화
            </button>
          )}
        </div>

        {/* 이슈 목록 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-orange-500" />
              발견된 이슈
              <span className="text-sm font-normal text-gray-400">
                ({filteredIssues.length}{filteredIssues.length !== moduleIssues.length ? `/${moduleIssues.length}` : ''}개)
              </span>
            </h3>
            <div className="flex gap-2">
              {severityStats.CRITICAL > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">🔴 {severityStats.CRITICAL}</span>}
              {severityStats.HIGH > 0 && <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded">🟠 {severityStats.HIGH}</span>}
              {severityStats.MEDIUM > 0 && <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded">🟡 {severityStats.MEDIUM}</span>}
            </div>
          </div>

          {issuesLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : filteredIssues.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {filteredIssues.map((issue, idx) => (
                <div key={issue.id || idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      issue.severity === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/30' :
                      issue.severity === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900/30' :
                      issue.severity === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {issue.severity === 'CRITICAL' ? <AlertTriangle className="w-5 h-5 text-red-500" /> :
                       issue.severity === 'HIGH' ? <AlertTriangle className="w-5 h-5 text-orange-500" /> :
                       issue.severity === 'MEDIUM' ? <Info className="w-5 h-5 text-yellow-600" /> :
                       <Info className="w-5 h-5 text-blue-500" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{issue.message}</p>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${severityColors[issue.severity] || 'bg-gray-400'}`}>
                          {issue.severity}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                          {categoryLabels[issue.category.toLowerCase()] || issue.category}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <FileCode className="w-3 h-3" />
                          {issue.filePath}:{issue.lineStart}
                        </span>
                      </div>
                      
                      {showSuggestions && issue.suggestion && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-start gap-2">
                            <span className="text-green-600">💡</span>
                            <div>
                              <span className="text-xs font-medium text-green-700 dark:text-green-400">개선 제안</span>
                              <p className="text-sm text-green-800 dark:text-green-300 mt-0.5">{issue.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Link
                      href={`/dashboard/projects/${projectId}/code-elements?file=${encodeURIComponent(issue.filePath)}&line=${issue.lineStart}&issueId=${issue.id}`}
                      className="shrink-0 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition text-sm flex items-center gap-1"
                    >
                      <FileCode className="w-4 h-4" />
                      코드 보기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              {moduleIssues.length > 0 ? (
                <>
                  <Search className="w-12 h-12 mx-auto mb-2" />
                  <p>필터 조건에 맞는 이슈가 없습니다</p>
                  <button onClick={() => { setSeverityFilter(''); setCategoryFilter(''); }} className="text-blue-500 mt-2">
                    필터 초기화
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                  <p>이 모듈에서 발견된 이슈가 없습니다</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 메인 리스크 맵 뷰
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href={`/dashboard/projects/${projectId}`}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">리스크 맵</h2>
            <p className="text-sm text-gray-500">{project?.name || '프로젝트'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={loadData} disabled={loading} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {highRiskCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{highRiskCount}개 고위험 모듈</span>
            </div>
          )}
        </div>
      </header>

      {/* 모듈 설명 */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <strong>모듈(Module)이란?</strong> 프로젝트의 최상위 폴더를 의미합니다. 모듈을 클릭하면 세부 이슈를 확인할 수 있습니다.
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : hasData ? (
        <>
          {/* Heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">
                    모듈
                    <span className="text-xs font-normal text-gray-400 ml-1">클릭하여 상세 보기</span>
                  </th>
                  {categories.map(cat => {
                    const Icon = categoryIcons[cat];
                    return (
                      <th key={cat} className="text-center p-3">
                        <div className="flex flex-col items-center gap-1">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">{categoryLabels[cat]}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-center p-3 text-sm font-medium text-gray-500">평균</th>
                </tr>
              </thead>
              <tbody>
                {riskData.map((row) => {
                  const values = [row.security, row.quality, row.structure, row.operations, row.test, row.standards];
                  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
                  
                  return (
                    <tr
                      key={row.module}
                      onClick={() => handleModuleClick(row)}
                      className="border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition group"
                    >
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                          <span className="group-hover:text-blue-600">{row.module}/</span>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      </td>
                      {categories.map(cat => {
                        const value = row[cat as keyof typeof row] as number;
                        return (
                          <td key={cat} className="p-3 text-center">
                            <div 
                              className={`w-10 h-10 mx-auto rounded-lg ${getRiskColor(value)} flex items-center justify-center text-white font-bold text-sm`}
                              title={`${categoryLabels[cat]}: ${value}/10`}
                            >
                              {value}
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                          avg > 6 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          avg > 4 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          avg > 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {getRiskLevel(avg)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm text-gray-500">낮음 (1-2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-sm text-gray-500">보통 (3-4)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span className="text-sm text-gray-500">높음 (5-6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm text-gray-500">심각 (7+)</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {categories.map(cat => {
              const Icon = categoryIcons[cat];
              const totalRisk = riskData.reduce((sum, r) => sum + (r[cat as keyof typeof r] as number), 0);
              const avgRisk = riskData.length > 0 ? Math.round(totalRisk / riskData.length) : 0;
              
              return (
                <div key={cat} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{categoryLabels[cat]}</span>
                  </div>
                  <div className={`text-2xl font-bold ${
                    avgRisk > 6 ? 'text-red-500' :
                    avgRisk > 4 ? 'text-orange-500' :
                    avgRisk > 2 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {avgRisk}/10
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <AlertTriangle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">리스크 데이터가 없습니다</h3>
          <p className="text-gray-500 mt-2 mb-6">분석을 실행하면 리스크가 여기에 표시됩니다</p>
          <Link href={`/dashboard/projects/${projectId}`} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            분석 실행하기
          </Link>
        </div>
      )}
    </div>
  );
}
