'use client';

/**
 * 파이프라인 스테이지 뷰
 * 
 * 8단계 분석 파이프라인 진행상황을 표시합니다.
 */

import { useState, useEffect } from 'react';
import { 
  FolderGit, 
  Languages, 
  FileCode, 
  Search, 
  ShieldCheck, 
  Tags, 
  Database, 
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  Clock
} from 'lucide-react';

// 스테이지 상태 타입
type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// 스테이지 정보
interface StageInfo {
  stage: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: StageStatus;
  progress: number;
  message?: string;
  error?: string;
  duration?: number;
}

// 8단계 스테이지 정의
const PIPELINE_STAGES: Array<{
  stage: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { stage: 'SOURCE_COLLECT', name: '소스 수집', description: 'Git 저장소에서 파일 수집', icon: FolderGit },
  { stage: 'LANGUAGE_DETECT', name: '언어 감지', description: '파일별 프로그래밍 언어 감지', icon: Languages },
  { stage: 'AST_PARSE', name: 'AST 생성', description: '추상 구문 트리 생성', icon: FileCode },
  { stage: 'STATIC_ANALYZE', name: '정적 분석', description: '복잡도, 구조, 의존성 분석', icon: Search },
  { stage: 'RULE_PARSE', name: '룰 분석', description: '보안, 스타일, 아키텍처 룰 검사', icon: ShieldCheck },
  { stage: 'CATEGORIZE', name: '분류', description: '결과를 카테고리별로 분류', icon: Tags },
  { stage: 'NORMALIZE', name: '정규화', description: '결과를 표준 형식으로 변환', icon: Database },
  { stage: 'AI_ENHANCE', name: 'AI 보강', description: 'AI 설명 및 개선점 생성', icon: Sparkles }
];

interface PipelineStagesViewProps {
  stages: StageInfo[];
  className?: string;
}

export function PipelineStagesView({ stages, className = '' }: PipelineStagesViewProps) {
  // 스테이지 상태 매핑
  const stageMap = new Map(stages.map(s => [s.stage, s]));

  // 전체 진행률 계산
  const completedCount = stages.filter(s => s.status === 'completed').length;
  const totalProgress = Math.round((completedCount / PIPELINE_STAGES.length) * 100);

  // 상태별 아이콘
  const StatusIcon = ({ status }: { status: StageStatus }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'skipped':
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-300" />;
    }
  };

  // 상태별 배경색
  const getStatusBg = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'running':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          파이프라인 진행 상황
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {totalProgress}%
          </span>
        </div>
      </div>

      {/* 스테이지 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {PIPELINE_STAGES.map((pipelineStage, index) => {
          const stageData = stageMap.get(pipelineStage.stage);
          const status: StageStatus = stageData?.status || 'pending';
          const Icon = pipelineStage.icon;

          return (
            <div
              key={pipelineStage.stage}
              className={`relative p-4 rounded-lg border transition-all duration-300 ${getStatusBg(status)}`}
            >
              {/* 스테이지 번호 */}
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>

              {/* 아이콘 및 상태 */}
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${
                  status === 'running' ? 'bg-blue-100 dark:bg-blue-800' :
                  status === 'completed' ? 'bg-green-100 dark:bg-green-800' :
                  'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    status === 'running' ? 'text-blue-600 dark:text-blue-300' :
                    status === 'completed' ? 'text-green-600 dark:text-green-300' :
                    'text-gray-500'
                  }`} />
                </div>
                <StatusIcon status={status} />
              </div>

              {/* 이름 및 설명 */}
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                {pipelineStage.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stageData?.message || pipelineStage.description}
              </p>

              {/* 진행률 바 (실행 중일 때) */}
              {status === 'running' && (
                <div className="mt-3 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 animate-pulse"
                    style={{ width: `${stageData?.progress || 50}%` }}
                  />
                </div>
              )}

              {/* 에러 메시지 */}
              {status === 'failed' && stageData?.error && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 truncate" title={stageData.error}>
                  {stageData.error}
                </p>
              )}

              {/* 소요 시간 */}
              {status === 'completed' && stageData?.duration && (
                <p className="text-xs text-gray-400 mt-2">
                  {(stageData.duration / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 타임라인 형식 뷰
 */
export function PipelineTimelineView({ stages }: PipelineStagesViewProps) {
  const stageMap = new Map(stages.map(s => [s.stage, s]));

  return (
    <div className="relative">
      {/* 연결선 */}
      <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-gray-700" />
      
      <div className="space-y-4">
        {PIPELINE_STAGES.map((pipelineStage, index) => {
          const stageData = stageMap.get(pipelineStage.stage);
          const status: StageStatus = stageData?.status || 'pending';
          const Icon = pipelineStage.icon;

          return (
            <div key={pipelineStage.stage} className="relative flex items-start gap-4">
              {/* 상태 dot */}
              <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                status === 'completed' ? 'bg-green-100 dark:bg-green-900' :
                status === 'running' ? 'bg-blue-100 dark:bg-blue-900' :
                status === 'failed' ? 'bg-red-100 dark:bg-red-900' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                {status === 'running' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : status === 'failed' ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Icon className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* 내용 */}
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {pipelineStage.name}
                  </h4>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {status === 'completed' ? '완료' :
                     status === 'running' ? '실행 중' :
                     status === 'failed' ? '실패' : '대기'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {stageData?.message || pipelineStage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PipelineStagesView;
