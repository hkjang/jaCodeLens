/**
 * 하이브리드 오케스트레이터
 * 
 * 새 파이프라인과 기존 에이전트를 통합합니다.
 * - Stage 1-7: 결정적 파이프라인 (새 구현)
 * - Stage 8: AI 보강 + 기존 에이전트 실행
 */

import prisma from '../db';
import { ProjectContext } from '../collector/types';
import { FileInfo } from '../pipeline/types';
import { PipelineOrchestrator, PipelineConfig, StageProgress, NormalizedResult } from '../pipeline';
import { analysisOrchestrator } from './orchestrator';

export interface HybridExecutionResult {
  analysisId: string;
  pipelineResults: NormalizedResult[];
  stageProgress: StageProgress[];
  agentResults?: any[];
  success: boolean;
  error?: string;
}

export interface HybridConfig extends Partial<PipelineConfig> {
  runLegacyAgents?: boolean;  // 기존 에이전트도 실행할지
  saveToDb?: boolean;         // DB에 결과 저장할지
}

const DEFAULT_HYBRID_CONFIG: HybridConfig = {
  runLegacyAgents: true,
  saveToDb: true,
  enableSecurityRules: true,
  enableStyleRules: true,
  enableArchitectureRules: true,
  enableTestRules: true,
  enableAI: false
};

export class HybridOrchestrator {
  private pipeline: PipelineOrchestrator;
  private config: HybridConfig;

  constructor(config?: HybridConfig) {
    this.config = { ...DEFAULT_HYBRID_CONFIG, ...config };
    this.pipeline = new PipelineOrchestrator(this.config);
  }

  /**
   * 하이브리드 분석 실행
   */
  async execute(
    projectId: string,
    context: ProjectContext,
    existingAnalysisId?: string,
    onProgress?: (stage: StageProgress) => void
  ): Promise<HybridExecutionResult> {
    
    let analysisId = existingAnalysisId;

    // 1. 분석 레코드 생성/업데이트
    if (!analysisId) {
      const analysis = await prisma.analysisExecute.create({
        data: {
          projectId,
          status: 'RUNNING',
          startedAt: new Date()
        }
      });
      analysisId = analysis.id;

      // Audit
      try {
        const { logAudit } = await import('../audit');
        await logAudit('ANALYSIS_START', 'ANALYSIS', analysisId, 'SYSTEM');
      } catch (e) { console.error('Audit failed', e); }
    } else {
      await prisma.analysisExecute.update({
        where: { id: analysisId },
        data: { status: 'RUNNING', startedAt: new Date() }
      });
    }

    const currentAnalysisId = analysisId;
    const allStages: StageProgress[] = [];

    try {
      // 2. 파일 정보 변환
      const files: FileInfo[] = context.files.map(f => ({
        path: f.path,
        name: f.path.split(/[/\\]/).pop() || f.path,
        extension: f.path.split('.').pop() || '',
        size: f.size || 0,
        content: f.content,
        lastModified: new Date()  // Default to now for collected files
      }));

      // 3. 새 파이프라인 실행 (Stage 1-7)
      const pipelineResult = await this.pipeline.execute(
        projectId,
        currentAnalysisId,
        files,
        (stage: StageProgress) => {
          allStages.push(stage);
          onProgress?.(stage);
          
          // DB에 스테이지 진행상황 저장
          if (this.config.saveToDb) {
            this.saveStageProgress(currentAnalysisId, stage).catch(console.error);
          }
        }
      );

      // 4. 파이프라인 결과 DB 저장
      if (this.config.saveToDb && pipelineResult.normalizedResults.length > 0) {
        await this.saveNormalizedResults(currentAnalysisId, pipelineResult.normalizedResults);
      }

      // 5. 기존 에이전트 실행 (선택적)
      let agentResults: any[] = [];
      if (this.config.runLegacyAgents) {
        try {
          await analysisOrchestrator.analyzeProject(projectId, context, currentAnalysisId);
          // 에이전트 결과는 이미 DB에 저장됨
        } catch (e) {
          console.error('Legacy agent execution failed', e);
        }
      }

      // 6. 분석 완료
      const resultCount = pipelineResult.normalizedResults.length;
      await prisma.analysisExecute.update({
        where: { id: currentAnalysisId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          score: this.calculateScore(pipelineResult.normalizedResults)
        }
      });

      return {
        analysisId: currentAnalysisId,
        pipelineResults: pipelineResult.normalizedResults,
        stageProgress: allStages,
        agentResults,
        success: true
      };

    } catch (error) {
      console.error('Hybrid orchestrator failed:', error);
      
      await prisma.analysisExecute.update({
        where: { id: currentAnalysisId },
        data: {
          status: 'FAILED',
          completedAt: new Date()
        }
      });

      return {
        analysisId: currentAnalysisId,
        pipelineResults: [],
        stageProgress: allStages,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 스테이지 진행상황 DB 저장
   */
  private async saveStageProgress(executeId: string, stage: StageProgress): Promise<void> {
    await prisma.pipelineStageExecution.upsert({
      where: {
        id: `${executeId}-${stage.stage}`  // Composite key simulation
      },
      create: {
        id: `${executeId}-${stage.stage}`,
        executeId,
        stage: stage.stage,
        status: stage.status,
        progress: stage.progress,
        message: stage.message,
        error: stage.error,
        startedAt: stage.startedAt,
        completedAt: stage.completedAt
      },
      update: {
        status: stage.status,
        progress: stage.progress,
        message: stage.message,
        error: stage.error,
        completedAt: stage.completedAt
      }
    });
  }

  /**
   * 정규화된 결과 DB 저장
   */
  private async saveNormalizedResults(executeId: string, results: NormalizedResult[]): Promise<void> {
    // Batch insert
    await prisma.normalizedAnalysisResult.createMany({
      data: results.map(r => ({
        id: r.id,
        executeId,
        filePath: r.filePath,
        lineStart: r.lineStart,
        lineEnd: r.lineEnd,
        language: r.language,
        mainCategory: r.mainCategory,
        subCategory: r.subCategory,
        ruleId: r.ruleId,
        severity: r.severity,
        message: r.message,
        suggestion: r.suggestion,
        rawResult: r.rawResult ? JSON.stringify(r.rawResult) : null,
        aiExplanation: r.aiExplanation,
        aiSuggestion: r.aiSuggestion,
        aiSecurityAdvice: r.aiSecurityAdvice,
        deterministic: r.deterministic
      }))
    });
  }

  /**
   * 분석 점수 계산
   */
  private calculateScore(results: NormalizedResult[]): number {
    if (results.length === 0) return 100;

    // 심각도별 감점
    const penalties: Record<string, number> = {
      CRITICAL: 20,
      HIGH: 10,
      MEDIUM: 5,
      LOW: 2,
      INFO: 0
    };

    let totalPenalty = 0;
    for (const r of results) {
      totalPenalty += penalties[r.severity] || 0;
    }

    // 최대 100점에서 감점
    return Math.max(0, 100 - totalPenalty);
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<HybridConfig>): void {
    this.config = { ...this.config, ...config };
    this.pipeline.updateConfig(config);
  }

  /**
   * 파이프라인 캐시 초기화
   */
  clearCache(): void {
    this.pipeline.clearCache();
  }
}

// 기본 인스턴스
export const hybridOrchestrator = new HybridOrchestrator();

/**
 * 간편 실행 함수
 */
export async function runHybridAnalysis(
  projectId: string,
  context: ProjectContext,
  config?: HybridConfig,
  onProgress?: (stage: StageProgress) => void
): Promise<HybridExecutionResult> {
  const orchestrator = new HybridOrchestrator(config);
  return orchestrator.execute(projectId, context, undefined, onProgress);
}
