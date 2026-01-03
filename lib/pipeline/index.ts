/**
 * 파이프라인 모듈 진입점
 * 
 * 분석 파이프라인의 공개 API를 정의합니다.
 */

// Types
export * from './types';

// Language Detection
export { LanguageDetector } from './language/detector';
export { LanguageRegistry } from './language/registry';

// AST Parsing
export { TypeScriptParser } from './ast/typescript-parser';
export { ASTCache } from './ast/cache';

// Static Analysis
export { StructureAnalyzer } from './static/structure-analyzer';
export { ComplexityAnalyzer } from './static/complexity-analyzer';
export { DependencyAnalyzer } from './static/dependency-analyzer';
export { CallGraphAnalyzer } from './static/call-graph-analyzer';

// Rule Parsers
export { SecurityParser } from './parsers/security-parser';
export { StyleParser } from './parsers/style-parser';
export { ArchitectureParser } from './parsers/architecture-parser';
export { TestParser } from './parsers/test-parser';

// Categorization & Normalization
export { Categorizer } from './categorizer';
export { Normalizer } from './normalizer';

// AI Enhancement Layer
export { ExplanationGenerator } from './ai/explanation-generator';
export { ImprovementSuggester } from './ai/improvement-suggester';
export { SecurityAdvisor } from './ai/security-advisor';

// Orchestrator
export { PipelineOrchestrator, runPipeline } from './orchestrator';
