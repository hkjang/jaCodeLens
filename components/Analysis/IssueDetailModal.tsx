'use client';

import { useState } from 'react';
import { 
  X, FileCode, AlertTriangle, Shield, BarChart3, 
  ChevronRight, ExternalLink, Copy, CheckCircle,
  Zap, Lightbulb, Code2, GitBranch, ArrowRight
} from 'lucide-react';

interface Issue {
  id: string;
  severity: string;
  category: string;
  message: string;
  description?: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  codeSnippet?: string;
  astBasis?: string;
  aiInterpretation?: string;
  impactScope?: {
    files: string[];
    dependencies: string[];
    affectedModules: string[];
  };
  improvements?: Array<{
    id: string;
    title: string;
    description: string;
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    codeExample?: string;
  }>;
  ruleId?: string;
  ruleLink?: string;
}

interface IssueDetailModalProps {
  issue: Issue | null;
  onClose: () => void;
  onCreateTask?: (issueId: string, improvementId: string) => void;
}

export default function IssueDetailModal({ issue, onClose, onCreateTask }: IssueDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'impact' | 'ast' | 'ai' | 'improve'>('overview');
  const [copied, setCopied] = useState(false);
  const [selectedImprovement, setSelectedImprovement] = useState<string | null>(null);

  if (!issue) return null;

  const tabs = [
    { id: 'overview', label: '개요', icon: FileCode },
    { id: 'impact', label: '영향 범위', icon: GitBranch },
    { id: 'ast', label: 'AST 근거', icon: Code2 },
    { id: 'ai', label: 'AI 해석', icon: Zap },
    { id: 'improve', label: '개선 방안', icon: Lightbulb }
  ] as const;

  const handleCopyCode = () => {
    if (issue.codeSnippet) {
      navigator.clipboard.writeText(issue.codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const severityColors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
    LOW: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    INFO: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-400'
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    SECURITY: <Shield className="w-4 h-4" />,
    QUALITY: <BarChart3 className="w-4 h-4" />,
    STRUCTURE: <Code2 className="w-4 h-4" />,
    OPERATIONS: <AlertTriangle className="w-4 h-4" />,
    TEST: <CheckCircle className="w-4 h-4" />
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium border ${severityColors[issue.severity]}`}>
                  {issue.severity}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm">
                  {categoryIcons[issue.category]}
                  {issue.category}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{issue.message}</h2>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <FileCode className="w-4 h-4" />
                  {issue.filePath}
                </span>
                {issue.lineStart && (
                  <span>Line {issue.lineStart}{issue.lineEnd && issue.lineEnd !== issue.lineStart ? `-${issue.lineEnd}` : ''}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {issue.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">설명</h3>
                  <p className="text-gray-900 dark:text-white">{issue.description}</p>
                </div>
              )}
              
              {issue.codeSnippet && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">문제 코드</h3>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {copied ? '복사됨' : '복사'}
                    </button>
                  </div>
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                    <code>{issue.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {issue.ruleId && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">분석 룰</p>
                    <p className="font-medium text-gray-900 dark:text-white">{issue.ruleId}</p>
                  </div>
                  {issue.ruleLink && (
                    <a 
                      href={issue.ruleLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                    >
                      자세히 <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Impact Tab */}
          {activeTab === 'impact' && (
            <div className="space-y-6">
              {issue.impactScope ? (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">영향받는 파일</h3>
                    <div className="space-y-2">
                      {issue.impactScope.files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                          <FileCode className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900 dark:text-white text-sm">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {issue.impactScope.dependencies.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">의존성</h3>
                      <div className="flex flex-wrap gap-2">
                        {issue.impactScope.dependencies.map((dep, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {issue.impactScope.affectedModules.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">영향받는 모듈</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {issue.impactScope.affectedModules.map((mod, idx) => (
                          <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <span className="text-gray-900 dark:text-white text-sm">{mod}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">영향 범위 분석 데이터가 없습니다</p>
              )}
            </div>
          )}

          {/* AST Tab */}
          {activeTab === 'ast' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500">AST 분석 근거</h3>
              {issue.astBasis ? (
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                  <code>{issue.astBasis}</code>
                </pre>
              ) : (
                <div className="text-center py-8">
                  <Code2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">AST 분석 데이터가 없습니다</p>
                </div>
              )}
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI 분석 해석</h3>
              </div>
              {issue.aiInterpretation ? (
                <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {issue.aiInterpretation}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">AI 해석을 생성하려면 AI 보강 분석을 실행하세요</p>
                </div>
              )}
            </div>
          )}

          {/* Improvements Tab */}
          {activeTab === 'improve' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">개선 방안 비교</h3>
              </div>
              {issue.improvements && issue.improvements.length > 0 ? (
                <div className="space-y-3">
                  {issue.improvements.map((imp, idx) => (
                    <div 
                      key={imp.id}
                      onClick={() => setSelectedImprovement(selectedImprovement === imp.id ? null : imp.id)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        selectedImprovement === imp.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center text-sm font-medium">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{imp.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">{imp.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            imp.effort === 'LOW' ? 'bg-green-100 text-green-700' :
                            imp.effort === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            난이도: {imp.effort}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            imp.impact === 'HIGH' ? 'bg-green-100 text-green-700' :
                            imp.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            효과: {imp.impact}
                          </span>
                        </div>
                      </div>

                      {selectedImprovement === imp.id && imp.codeExample && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-500 mb-2">개선 코드 예시</p>
                          <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                            <code>{imp.codeExample}</code>
                          </pre>
                          {onCreateTask && (
                            <button
                              onClick={() => onCreateTask(issue.id, imp.id)}
                              className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                            >
                              개선 태스크 생성
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">개선 방안이 아직 생성되지 않았습니다</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
