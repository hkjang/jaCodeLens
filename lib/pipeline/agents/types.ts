/**
 * 에이전트 상세 타입 정의 (명세 11)
 * 
 * 5종 분석 에이전트의 입력/출력 스키마
 */

import { ASTNode, ASTFile } from '../types';
import { IRGraph, IRNode, IREdge } from '../ir/ir-schema';

// ============================================================================
// 에이전트 공통 타입
// ============================================================================

export type AgentType = 
  | 'structure' 
  | 'rule' 
  | 'security' 
  | 'dependency' 
  | 'ai';

export interface AgentInput<T = unknown> {
  agentType: AgentType;
  projectId: string;
  executeId: string;
  timestamp: Date;
  data: T;
}

export interface AgentOutput<T = unknown> {
  agentType: AgentType;
  projectId: string;
  executeId: string;
  timestamp: Date;
  duration: number;
  results: T;
  issues: AgentIssue[];
  metrics: AgentMetrics;
  errors?: string[];
}

export interface AgentIssue {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  message: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  nodeId?: string;
  evidence: AgentEvidence[];
}

export interface AgentEvidence {
  type: 'node' | 'metric' | 'pattern' | 'rule';
  value: string;
  description: string;
}

export interface AgentMetrics {
  itemsProcessed: number;
  issuesFound: number;
  executionTimeMs: number;
}

// ============================================================================
// 1. StructureAgent (명세 11.1)
// IR → 구조 이슈
// ============================================================================

export interface StructureAgentInput extends AgentInput<{
  irGraph: IRGraph;
  options?: {
    analyzeDependencies?: boolean;
    analyzeComplexity?: boolean;
    analyzeCycles?: boolean;
    analyzeCohesion?: boolean;
    analyzeDepth?: boolean;
  };
}> {
  agentType: 'structure';
}

export interface StructureIssue extends AgentIssue {
  structureType: 'dependency' | 'complexity' | 'cycle' | 'cohesion' | 'depth';
  affectedNodes: string[];
  metricValue?: number;
  threshold?: number;
}

export interface StructureAgentOutput extends AgentOutput<{
  dependencyGraph: {
    nodes: string[];
    edges: { from: string; to: string; type: string }[];
  };
  complexityScores: Record<string, number>;
  cycleDetected: boolean;
  cycles: string[][];
  cohesionScores: Record<string, number>;
  layerDepths: Record<string, number>;
}> {
  agentType: 'structure';
  issues: StructureIssue[];
}

// ============================================================================
// 2. RuleAgent (명세 11.2)
// AST → 룰 이슈
// ============================================================================

export interface RuleAgentInput extends AgentInput<{
  astFiles: ASTFile[];
  ruleIds?: string[];
  options?: {
    includeDisabled?: boolean;
    categories?: string[];
    minSeverity?: string;
  };
}> {
  agentType: 'rule';
}

export interface RuleIssue extends AgentIssue {
  ruleId: string;
  ruleName: string;
  ruleCategory: string;
  pattern: string;
  suggestion?: string;
  references?: string[];
}

export interface RuleAgentOutput extends AgentOutput<{
  rulesExecuted: number;
  ruleResults: {
    ruleId: string;
    matchCount: number;
    executionTime: number;
  }[];
}> {
  agentType: 'rule';
  issues: RuleIssue[];
}

// ============================================================================
// 3. SecurityAgent (명세 11.3)
// AST → 취약점
// ============================================================================

export interface SecurityAgentInput extends AgentInput<{
  astFiles: ASTFile[];
  options?: {
    includeSecrets?: boolean;
    includeInjection?: boolean;
    includeXSS?: boolean;
    includeCrypto?: boolean;
  };
}> {
  agentType: 'security';
}

export interface SecurityIssue extends AgentIssue {
  vulnerabilityType: 'injection' | 'xss' | 'secrets' | 'crypto' | 'auth' | 'other';
  cweId?: string;
  owaspCategory?: string;
  cvssScore?: number;
  exploitability: 'HIGH' | 'MEDIUM' | 'LOW';
  mitigation: string;
}

export interface SecurityAgentOutput extends AgentOutput<{
  vulnerabilityCounts: Record<string, number>;
  secretsFound: number;
  riskScore: number;
}> {
  agentType: 'security';
  issues: SecurityIssue[];
}

// ============================================================================
// 4. DependencyAgent (명세 11.4)
// IR → 의존 이슈
// ============================================================================

export interface DependencyAgentInput extends AgentInput<{
  irGraph: IRGraph;
  packageJson?: object;
  options?: {
    checkCycles?: boolean;
    checkOrphans?: boolean;
    checkDeprecated?: boolean;
    checkVersions?: boolean;
  };
}> {
  agentType: 'dependency';
}

export interface DependencyIssue extends AgentIssue {
  dependencyType: 'cycle' | 'orphan' | 'deprecated' | 'version' | 'missing' | 'unused';
  packages?: string[];
  recommendedAction: string;
}

export interface DependencyAgentOutput extends AgentOutput<{
  totalDependencies: number;
  directDependencies: number;
  transitiveDependencies: number;
  cycleCount: number;
  orphanCount: number;
  deprecatedCount: number;
}> {
  agentType: 'dependency';
  issues: DependencyIssue[];
}

// ============================================================================
// 5. AIAgent (명세 11.5)
// 정제 데이터 → 설명
// ============================================================================

export interface AIAgentInput extends AgentInput<{
  refinedData: AIAnalyzerInput[];
  options?: {
    maxTokens?: number;
    temperature?: number;
    includeCode?: boolean;
    language?: 'ko' | 'en';
  };
}> {
  agentType: 'ai';
}

/**
 * AI Analyzer 입력 스키마 (명세 13)
 */
export interface AIAnalyzerInput {
  issueId: string;
  issueType: string;        // 카테고리
  astSnippet: string;       // 요약된 AST/코드
  evidence: string[];       // 룰 및 근거
  metrics: {
    complexity?: number;
    lineCount?: number;
    dependencies?: number;
    [key: string]: unknown;
  };
  context: {
    filePath: string;
    language: string;
    surroundingCode?: string;
    relatedIssues?: string[];
  };
}

/**
 * AI Analyzer 출력 스키마 (명세 14)
 */
export interface AIAnalyzerOutput {
  issueId: string;
  summary: string;          // 요약 (100자 이내)
  explanation: string;      // 상세 해석 (300자 이내)
  improvement: string;      // 개선 방향 (200자 이내)
  risk: string;             // 영향 및 위험 (150자 이내)
  confidence: number;       // 신뢰도 0-1
  nodeIds?: string[];       // 관련 AST 노드 ID
}

export interface AIAgentOutput extends AgentOutput<{
  analysisResults: AIAnalyzerOutput[];
  tokensUsed: number;
  averageConfidence: number;
}> {
  agentType: 'ai';
}

// ============================================================================
// 분석 결과 엔티티 (명세 17)
// ============================================================================

/**
 * AnalysisRun - 분석 실행 단위
 */
export interface AnalysisRun {
  id: string;
  projectId: string;
  commitHash: string;
  branch: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: AnalysisConfig;
  summary: AnalysisSummary;
}

export interface AnalysisConfig {
  enableAI: boolean;
  enabledAgents: AgentType[];
  ruleSetVersion: string;
  parserVersions: Record<string, string>;
}

export interface AnalysisSummary {
  totalIssues: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byAgent: Record<AgentType, number>;
  filesAnalyzed: number;
  linesOfCode: number;
  duration: number;
}

/**
 * Issue - 발견된 이슈
 */
export interface Issue {
  id: string;
  runId: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  message: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  ruleId?: string;
  agentType: AgentType;
  deterministic: boolean;
  createdAt: Date;
}

/**
 * Evidence - 이슈 근거
 */
export interface Evidence {
  id: string;
  issueId: string;
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  description: string;
  codeSnippet?: string;
}

/**
 * Recommendation - 개선 제안
 */
export interface Recommendation {
  id: string;
  issueId: string;
  text: string;
  codeExample?: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  source: 'rule' | 'ai' | 'manual';
}

/**
 * Score - 점수
 */
export interface Score {
  id: string;
  runId: string;
  type: 'overall' | 'security' | 'quality' | 'structure' | 'maintainability';
  value: number;
  maxValue: number;
  trend: 'up' | 'down' | 'stable';
  previousValue?: number;
}
