/**
 * 분석 파이프라인 핵심 타입 정의
 * 
 * 결정적 분석 우선 구조를 위한 8단계 파이프라인 타입 시스템
 */

// ============================================================================
// 파이프라인 단계 정의
// ============================================================================

export enum PipelineStage {
  SOURCE_COLLECT = 'SOURCE_COLLECT',
  LANGUAGE_DETECT = 'LANGUAGE_DETECT',
  AST_PARSE = 'AST_PARSE',
  STATIC_ANALYZE = 'STATIC_ANALYZE',
  RULE_PARSE = 'RULE_PARSE',
  CATEGORIZE = 'CATEGORIZE',
  NORMALIZE = 'NORMALIZE',
  AI_ENHANCE = 'AI_ENHANCE'
}

export type PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface StageProgress {
  stage: PipelineStage;
  status: PipelineStageStatus;
  startedAt?: Date;
  completedAt?: Date;
  progress: number; // 0-100
  message?: string;
  error?: string;
}

// ============================================================================
// 언어 타입
// ============================================================================

export type SupportedLanguage = 
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'go'
  | 'csharp'
  | 'rust'
  | 'cpp'
  | 'unknown';

export interface LanguageMapping {
  filePath: string;
  language: SupportedLanguage;
  confidence: number; // 0-1
  detectedBy: 'extension' | 'shebang' | 'content';
}

export interface LanguageStats {
  language: SupportedLanguage;
  fileCount: number;
  lineCount: number;
  percentage: number;
}

// ============================================================================
// AST 노드 표준 인터페이스
// ============================================================================

export interface ASTPosition {
  line: number;      // 1-indexed
  column: number;    // 0-indexed
  offset?: number;   // Byte offset from file start
}

export interface ASTLocation {
  start: ASTPosition;
  end: ASTPosition;
  filePath: string;
}

export type ASTNodeType = 
  | 'function'
  | 'class'
  | 'method'
  | 'interface'
  | 'type'
  | 'variable'
  | 'import'
  | 'export'
  | 'call'
  | 'block'
  | 'statement'
  | 'expression'
  | 'other';

export interface ASTNode {
  id: string;
  type: ASTNodeType;
  name?: string;
  location: ASTLocation;
  children: ASTNode[];
  parent?: string;        // Parent node ID
  metadata?: Record<string, unknown>;
}

export interface ASTFile {
  filePath: string;
  language: SupportedLanguage;
  root: ASTNode;
  imports: ImportInfo[];
  exports: ExportInfo[];
  parseError?: string;
}

export interface ImportInfo {
  source: string;           // Module path
  specifiers: string[];     // Imported names
  isDefault: boolean;
  location: ASTLocation;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  location: ASTLocation;
}

// ============================================================================
// 정적 분석 결과
// ============================================================================

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface StaticAnalysisResult {
  type: 'complexity' | 'structure' | 'dependency' | 'callgraph';
  filePath: string;
  findings: StaticFinding[];
}

export interface StaticFinding {
  id: string;
  type: string;
  message: string;
  severity: Severity;
  location: ASTLocation;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 복잡도 메트릭
// ============================================================================

export interface ComplexityMetric {
  filePath: string;
  functionName?: string;
  cyclomaticComplexity: number;
  cognitiveComplexity?: number;
  linesOfCode: number;
  location: ASTLocation;
}

// ============================================================================
// 의존성 분석
// ============================================================================

export interface DependencyInfo {
  from: string;           // Source file/module
  to: string;             // Target file/module
  type: 'import' | 'require' | 'dynamic' | 'external';
  isCircular: boolean;
  location?: ASTLocation;
}

export interface DependencyGraph {
  nodes: string[];
  edges: DependencyInfo[];
  cycles: string[][];     // Groups of circular dependencies
}

// ============================================================================
// 호출 그래프
// ============================================================================

export interface CallInfo {
  caller: string;         // Full qualified name
  callee: string;
  location: ASTLocation;
  isAsync: boolean;
  isConditional: boolean;
}

export interface CallGraph {
  functions: FunctionInfo[];
  calls: CallInfo[];
  entryPoints: string[];
  deadCode: string[];     // Unreachable functions
}

export interface FunctionInfo {
  qualifiedName: string;
  filePath: string;
  isExported: boolean;
  isAsync: boolean;
  parameters: number;
  location: ASTLocation;
}

// ============================================================================
// 룰 기반 파서 결과
// ============================================================================

export type RuleCategory = 
  | 'security'
  | 'style'
  | 'architecture'
  | 'test'
  | 'config';

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: Severity;
  message: string;
  filePath: string;
  location: ASTLocation;
  suggestion?: string;
  references?: string[];  // OWASP, CWE links etc.
}

// ============================================================================
// 카테고리 분류
// ============================================================================

export type MainCategory = 
  | 'STRUCTURE'      // 구조
  | 'QUALITY'        // 품질
  | 'SECURITY'       // 보안
  | 'OPERATIONS'     // 운영
  | 'TEST'           // 테스트
  | 'STANDARDS';     // 표준

export type SubCategory = 
  // 구조
  | 'LAYER' | 'CIRCULAR'
  // 품질
  | 'COMPLEXITY' | 'DUPLICATION'
  // 보안
  | 'INPUT_VALIDATION' | 'SECRET' | 'INJECTION' | 'XSS'
  // 운영
  | 'LOGGING' | 'EXCEPTION'
  // 테스트
  | 'COVERAGE' | 'MISSING_TEST'
  // 표준
  | 'NAMING' | 'FORMAT' | 'CONVENTION';

export interface CategorizedResult {
  mainCategory: MainCategory;
  subCategory: SubCategory;
  originalResult: RuleViolation | StaticFinding;
}

// ============================================================================
// 정규화된 분석 결과 (최종 데이터 모델)
// ============================================================================

export interface NormalizedResult {
  id: string;
  projectId: string;
  executeId: string;
  
  // 위치 정보
  filePath: string;
  lineStart: number;
  lineEnd: number;
  
  // 분류 정보
  language: SupportedLanguage;
  mainCategory: MainCategory;
  subCategory: SubCategory;
  ruleId: string;
  severity: Severity;
  
  // 내용
  message: string;
  suggestion?: string;
  
  // 원본 데이터
  rawResult: Record<string, unknown>;
  
  // AI 보강 필드 (정규화 이후에만 채워짐)
  aiExplanation?: string;
  aiSuggestion?: string;
  aiSecurityAdvice?: string;
  
  // 메타데이터
  createdAt: Date;
  deterministic: boolean;  // AI 없이 생성된 결과인지
}

// ============================================================================
// 파이프라인 컨텍스트
// ============================================================================

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  content?: string;
  lastModified: Date;
  hash?: string;
}

export interface SourceSnapshot {
  id: string;
  commitId?: string;
  branch?: string;
  createdAt: Date;
  fileCount: number;
}

export interface PipelineContext {
  // 프로젝트 정보
  projectId: string;
  projectPath: string;
  executeId: string;
  
  // 소스 수집 결과
  snapshot?: SourceSnapshot;
  files: FileInfo[];
  
  // 언어 감지 결과
  languageMappings: LanguageMapping[];
  languageStats: LanguageStats[];
  
  // AST 분석 결과
  astFiles: ASTFile[];
  
  // 정적 분석 결과
  complexityMetrics: ComplexityMetric[];
  dependencyGraph?: DependencyGraph;
  callGraph?: CallGraph;
  
  // 룰 파서 결과
  ruleViolations: RuleViolation[];
  
  // 분류된 결과
  categorizedResults: CategorizedResult[];
  
  // 정규화된 최종 결과
  normalizedResults: NormalizedResult[];
  
  // 파이프라인 상태
  stages: StageProgress[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ============================================================================
// 파이프라인 설정
// ============================================================================

export interface PipelineConfig {
  // 소스 수집
  shallowClone: boolean;
  maxFileSize: number;         // bytes
  excludePatterns: string[];   // gitignore-style patterns
  
  // AST 분석
  enableCaching: boolean;
  cacheDir?: string;
  
  // 정적 분석
  complexityThreshold: number;
  maxFileLengthLines: number;
  
  // 룰 파서
  enableSecurityRules: boolean;
  enableStyleRules: boolean;
  enableArchitectureRules: boolean;
  enableTestRules: boolean;
  customRules?: RuleDefinition[];
  
  // AI 보강
  enableAI: boolean;
  aiExplanation: boolean;
  aiSuggestion: boolean;
  aiSecurityAdvice: boolean;
}

export interface RuleDefinition {
  id: string;
  name: string;
  category: RuleCategory;
  severity: Severity;
  pattern: string;            // RegEx or AST query
  message: string;
  fix?: string;
}

// ============================================================================
// 파이프라인 인터페이스
// ============================================================================

export interface PipelineStageHandler<TInput = unknown, TOutput = unknown> {
  stage: PipelineStage;
  name: string;
  execute(context: PipelineContext, config: PipelineConfig): Promise<TOutput>;
  validate?(input: TInput): boolean;
}

export interface PipelineResult {
  success: boolean;
  executeId: string;
  normalizedResults: NormalizedResult[];
  stages: StageProgress[];
  summary: PipelineSummary;
  error?: string;
}

export interface PipelineSummary {
  totalFiles: number;
  analyzedFiles: number;
  totalIssues: number;
  issuesBySeverity: Record<Severity, number>;
  issuesByCategory: Record<MainCategory, number>;
  topLanguages: LanguageStats[];
  duration: number;           // milliseconds
}
