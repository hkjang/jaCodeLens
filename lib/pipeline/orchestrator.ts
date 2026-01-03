/**
 * 파이프라인 오케스트레이터
 * 
 * 8단계 분석 파이프라인을 순차 실행합니다.
 * 결정적 분석 → AI 보강 순서로 진행합니다.
 */

import {
  PipelineContext,
  PipelineConfig,
  PipelineResult,
  PipelineStage,
  PipelineStageStatus,
  StageProgress,
  PipelineSummary,
  FileInfo,
  NormalizedResult,
  Severity,
  MainCategory
} from './types';
import { LanguageDetector } from './language/detector';
import { TypeScriptParser } from './ast/typescript-parser';
import { ASTCache } from './ast/cache';
import { ComplexityAnalyzer } from './static/complexity-analyzer';
import { StructureAnalyzer } from './static/structure-analyzer';
import { DependencyAnalyzer } from './static/dependency-analyzer';
import { CallGraphAnalyzer } from './static/call-graph-analyzer';
import { SecurityParser } from './parsers/security-parser';
import { StyleParser } from './parsers/style-parser';
import { ArchitectureParser } from './parsers/architecture-parser';
import { TestParser } from './parsers/test-parser';
import { Categorizer } from './categorizer';
import { Normalizer } from './normalizer';
import { ExplanationGenerator } from './ai/explanation-generator';
import { ImprovementSuggester } from './ai/improvement-suggester';
import { SecurityAdvisor } from './ai/security-advisor';

// 기본 설정
const DEFAULT_CONFIG: PipelineConfig = {
  shallowClone: false,
  maxFileSize: 1024 * 1024,  // 1MB
  excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
  enableCaching: true,
  complexityThreshold: 15,
  maxFileLengthLines: 300,
  enableSecurityRules: true,
  enableStyleRules: true,
  enableArchitectureRules: true,
  enableTestRules: true,
  enableAI: false,
  aiExplanation: false,
  aiSuggestion: false,
  aiSecurityAdvice: false
};

export class PipelineOrchestrator {
  private config: PipelineConfig;
  private astCache: ASTCache;

  constructor(config?: Partial<PipelineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.astCache = new ASTCache();
  }

  /**
   * 파이프라인 실행
   */
  async execute(
    projectId: string,
    executeId: string,
    files: FileInfo[],
    onProgress?: (stage: StageProgress) => void
  ): Promise<PipelineResult> {
    const context: PipelineContext = {
      projectId,
      projectPath: '',
      executeId,
      files,
      languageMappings: [],
      languageStats: [],
      astFiles: [],
      complexityMetrics: [],
      ruleViolations: [],
      categorizedResults: [],
      normalizedResults: [],
      stages: [],
      startedAt: new Date()
    };

    const stages: StageProgress[] = [];

    try {
      // Stage 1: 소스 수집 (파일은 이미 수집된 상태)
      await this.executeStage(
        PipelineStage.SOURCE_COLLECT,
        '소스 수집',
        async () => {
          // 파일 필터링
          context.files = files.filter(f => 
            f.size <= this.config.maxFileSize &&
            !this.config.excludePatterns.some(p => this.matchPattern(f.path, p))
          );
          return context.files.length;
        },
        stages,
        onProgress
      );

      // Stage 2: 언어 감지
      await this.executeStage(
        PipelineStage.LANGUAGE_DETECT,
        '언어 감지',
        async () => {
          context.languageMappings = LanguageDetector.detectFiles(context.files);
          context.languageStats = LanguageDetector.calculateStats(context.files, context.languageMappings);
          return context.languageMappings.length;
        },
        stages,
        onProgress
      );

      // Stage 3: AST 파싱
      await this.executeStage(
        PipelineStage.AST_PARSE,
        'AST 생성',
        async () => {
          const parser = new TypeScriptParser(this.astCache);
          
          for (const file of context.files) {
            const mapping = context.languageMappings.find(m => m.filePath === file.path);
            if (!mapping || !file.content) continue;
            
            if (mapping.language === 'typescript' || mapping.language === 'javascript') {
              const astFile = parser.parseFile(file.path, file.content, mapping.language);
              context.astFiles.push(astFile);
            }
          }
          
          return context.astFiles.length;
        },
        stages,
        onProgress
      );

      // Stage 4: 정적 분석
      await this.executeStage(
        PipelineStage.STATIC_ANALYZE,
        '정적 분석',
        async () => {
          const complexityAnalyzer = new ComplexityAnalyzer({
            complexityThreshold: this.config.complexityThreshold,
            maxFileLengthLines: this.config.maxFileLengthLines
          });
          const structureAnalyzer = new StructureAnalyzer();
          const dependencyAnalyzer = new DependencyAnalyzer();
          const callGraphAnalyzer = new CallGraphAnalyzer();

          // 복잡도 분석
          const fileContents = context.files
            .filter(f => f.content)
            .map(f => ({ content: f.content!, filePath: f.path }));
          
          const complexityResult = complexityAnalyzer.analyzeFiles(fileContents);
          context.complexityMetrics = fileContents.map(f => 
            complexityAnalyzer.analyzeFile(f.content, f.filePath)
          ).flat();

          // 구조 분석
          const { modules, result: structureResult } = structureAnalyzer.analyzeStructure(context.files);

          // 의존성 분석
          const { graph: depGraph, result: depResult } = dependencyAnalyzer.analyzeDependencies(context.files);
          context.dependencyGraph = depGraph;

          // 호출 그래프 분석
          const { graph: callGraph, result: callResult } = callGraphAnalyzer.analyzeCallGraph(fileContents);
          context.callGraph = callGraph;

          return [complexityResult, structureResult, depResult, callResult]
            .reduce((sum, r) => sum + r.findings.length, 0);
        },
        stages,
        onProgress
      );

      // Stage 5: 룰 파서 분석
      await this.executeStage(
        PipelineStage.RULE_PARSE,
        '룰 기반 분석',
        async () => {
          const violations = [];

          if (this.config.enableSecurityRules) {
            const securityParser = new SecurityParser();
            violations.push(...securityParser.parseFiles(context.files));
          }

          if (this.config.enableStyleRules) {
            const styleParser = new StyleParser();
            violations.push(...styleParser.parseFiles(context.files));
          }

          if (this.config.enableArchitectureRules) {
            const archParser = new ArchitectureParser();
            violations.push(...archParser.parseFiles(context.files));
          }

          if (this.config.enableTestRules) {
            const testParser = new TestParser();
            const { violations: testViolations } = testParser.parseFiles(context.files);
            violations.push(...testViolations);
          }

          context.ruleViolations = violations;
          return violations.length;
        },
        stages,
        onProgress
      );

      // Stage 6: 카테고리 분류
      await this.executeStage(
        PipelineStage.CATEGORIZE,
        '분류',
        async () => {
          const categorizer = new Categorizer();
          
          // 정적 분석 결과 수집
          const staticFindings: any[] = [];
          // 복잡도, 구조, 의존성, 호출그래프에서 findings 수집
          // (실제 구현에서는 위에서 저장해둔 findings 사용)

          context.categorizedResults = categorizer.categorizeAll(
            context.ruleViolations,
            staticFindings
          );
          
          return context.categorizedResults.length;
        },
        stages,
        onProgress
      );

      // Stage 7: 정규화
      await this.executeStage(
        PipelineStage.NORMALIZE,
        '정규화',
        async () => {
          const normalizer = new Normalizer(
            context.projectId,
            context.executeId,
            context.languageMappings
          );
          
          context.normalizedResults = normalizer.normalizeAll(context.categorizedResults);
          return context.normalizedResults.length;
        },
        stages,
        onProgress
      );

      // Stage 8: AI 보강 (선택적)
      if (this.config.enableAI) {
        await this.executeStage(
          PipelineStage.AI_ENHANCE,
          'AI 보강',
          async () => {
            let enhanced = 0;

            if (this.config.aiExplanation) {
              const explainer = new ExplanationGenerator({ aiEnabled: true });
              const explanations = await explainer.generateBatch(context.normalizedResults);
              for (const result of context.normalizedResults) {
                result.aiExplanation = explanations.get(result.id);
                if (result.aiExplanation) enhanced++;
              }
            }

            if (this.config.aiSuggestion) {
              const suggester = new ImprovementSuggester({ aiEnabled: true });
              const suggestions = await suggester.suggestBatch(context.normalizedResults);
              for (const suggestion of suggestions) {
                const result = context.normalizedResults.find(r => r.id === suggestion.resultId);
                if (result) {
                  result.aiSuggestion = suggestion.direction;
                }
              }
            }

            if (this.config.aiSecurityAdvice) {
              const advisor = new SecurityAdvisor({ aiEnabled: true });
              const advices = await advisor.adviseBatch(context.normalizedResults);
              for (const advice of advices) {
                const result = context.normalizedResults.find(r => r.id === advice.resultId);
                if (result) {
                  result.aiSecurityAdvice = advice.recommendation;
                }
              }
            }

            return enhanced;
          },
          stages,
          onProgress
        );
      }

      // 완료
      context.completedAt = new Date();
      context.stages = stages;

      return {
        success: true,
        executeId,
        normalizedResults: context.normalizedResults,
        stages,
        summary: this.createSummary(context)
      };

    } catch (error) {
      context.error = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        executeId,
        normalizedResults: context.normalizedResults,
        stages,
        summary: this.createSummary(context),
        error: context.error
      };
    }
  }

  /**
   * 단계 실행 래퍼
   */
  private async executeStage(
    stage: PipelineStage,
    name: string,
    executor: () => Promise<number>,
    stages: StageProgress[],
    onProgress?: (stage: StageProgress) => void
  ): Promise<void> {
    const progress: StageProgress = {
      stage,
      status: 'running' as PipelineStageStatus,
      startedAt: new Date(),
      progress: 0
    };
    
    stages.push(progress);
    onProgress?.(progress);

    try {
      const count = await executor();
      progress.status = 'completed';
      progress.completedAt = new Date();
      progress.progress = 100;
      progress.message = `${count}개 처리됨`;
    } catch (error) {
      progress.status = 'failed';
      progress.completedAt = new Date();
      progress.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }

    onProgress?.(progress);
  }

  /**
   * 결과 요약 생성
   */
  private createSummary(context: PipelineContext): PipelineSummary {
    const issuesBySeverity: Record<Severity, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0
    };
    const issuesByCategory: Record<MainCategory, number> = {
      STRUCTURE: 0, QUALITY: 0, SECURITY: 0, OPERATIONS: 0, TEST: 0, STANDARDS: 0
    };

    for (const result of context.normalizedResults) {
      issuesBySeverity[result.severity]++;
      issuesByCategory[result.mainCategory]++;
    }

    const duration = context.completedAt 
      ? context.completedAt.getTime() - context.startedAt.getTime()
      : 0;

    return {
      totalFiles: context.files.length,
      analyzedFiles: context.astFiles.length,
      totalIssues: context.normalizedResults.length,
      issuesBySeverity,
      issuesByCategory,
      topLanguages: context.languageStats.slice(0, 5),
      duration
    };
  }

  /**
   * 패턴 매칭 (간단한 glob 지원)
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/');
    return new RegExp(regexPattern).test(filePath);
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.astCache.clear();
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return this.astCache.getStats();
  }
}

/**
 * 간편 실행 함수
 */
export async function runPipeline(
  projectId: string,
  executeId: string,
  files: FileInfo[],
  config?: Partial<PipelineConfig>
): Promise<PipelineResult> {
  const orchestrator = new PipelineOrchestrator(config);
  return orchestrator.execute(projectId, executeId, files);
}
