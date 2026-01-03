/**
 * 정적 분석 룰 DSL 엔진
 * 
 * 룰 정의를 위한 Domain Specific Language (DSL)을 제공합니다.
 * - 룰 정의 구문
 * - AST 쿼리
 * - 패턴 매칭
 * - 병렬 실행
 * - 버전 관리
 */

import { 
  ASTNode, 
  ASTFile, 
  ASTLocation,
  RuleViolation, 
  Severity, 
  RuleCategory 
} from '../types';

// ============================================================================
// 타입 정의
// ============================================================================

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: Severity;
  version: string;
  enabled: boolean;
  
  // 매칭 조건
  pattern: RulePattern;
  
  // 생성할 메시지
  message: string | ((context: MatchContext) => string);
  suggestion?: string | ((context: MatchContext) => string);
  
  // 참조 링크
  references?: string[];
  
  // 태그
  tags?: string[];
}

export interface RulePattern {
  type: PatternType;
  conditions: PatternCondition[];
  scope?: PatternScope;
}

export type PatternType = 
  | 'ast-query'      // AST 노드 쿼리
  | 'regex'          // 정규표현식
  | 'keyword'        // 키워드 매칭
  | 'structure';     // 구조 매칭

export interface PatternCondition {
  field: string;
  operator: ComparisonOperator;
  value: any;
  not?: boolean;
}

export type ComparisonOperator = 
  | 'equals'
  | 'contains'
  | 'matches'       // regex
  | 'startsWith'
  | 'endsWith'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in'
  | 'exists';

export interface PatternScope {
  filePatterns?: string[];
  excludePatterns?: string[];
  languages?: string[];
  nodeTypes?: string[];
}

export interface MatchContext {
  node: ASTNode;
  file: ASTFile;
  captures: Record<string, any>;
  location: ASTLocation;
}

export interface RuleExecutionResult {
  ruleId: string;
  violations: RuleViolation[];
  executionTime: number;
  nodesScanned: number;
  error?: string;
}

export interface RuleSetConfig {
  version: string;
  name: string;
  rules: RuleDefinition[];
  extends?: string[];
  overrides?: Record<string, Partial<RuleDefinition>>;
}

// ============================================================================
// 룰 DSL 빌더
// ============================================================================

export class RuleBuilder {
  private rule: Partial<RuleDefinition>;

  constructor(id: string) {
    this.rule = { 
      id, 
      enabled: true, 
      version: '1.0.0',
      pattern: { type: 'ast-query', conditions: [] }
    };
  }

  name(name: string): this {
    this.rule.name = name;
    return this;
  }

  description(desc: string): this {
    this.rule.description = desc;
    return this;
  }

  category(category: RuleCategory): this {
    this.rule.category = category;
    return this;
  }

  severity(severity: Severity): this {
    this.rule.severity = severity;
    return this;
  }

  /**
   * AST 노드 타입으로 매칭
   */
  matchNodeType(...types: string[]): this {
    this.rule.pattern!.conditions.push({
      field: 'type',
      operator: 'in',
      value: types,
    });
    return this;
  }

  /**
   * 노드 이름으로 매칭
   */
  matchName(pattern: string | RegExp): this {
    const isRegex = pattern instanceof RegExp;
    this.rule.pattern!.conditions.push({
      field: 'name',
      operator: isRegex ? 'matches' : 'contains',
      value: isRegex ? pattern.source : pattern,
    });
    return this;
  }

  /**
   * 메타데이터 조건
   */
  whereMetadata(field: string, operator: ComparisonOperator, value: any): this {
    this.rule.pattern!.conditions.push({
      field: `metadata.${field}`,
      operator,
      value,
    });
    return this;
  }

  /**
   * 복잡도 조건
   */
  whereComplexity(operator: 'gt' | 'gte' | 'lt' | 'lte', value: number): this {
    return this.whereMetadata('complexity', operator, value);
  }

  /**
   * 라인 수 조건
   */
  whereLineCount(operator: 'gt' | 'gte' | 'lt' | 'lte', value: number): this {
    this.rule.pattern!.conditions.push({
      field: 'lineCount',
      operator,
      value,
    });
    return this;
  }

  /**
   * 파일 패턴 범위
   */
  inFiles(...patterns: string[]): this {
    this.rule.pattern!.scope = {
      ...this.rule.pattern!.scope,
      filePatterns: patterns,
    };
    return this;
  }

  /**
   * 제외 파일 패턴
   */
  excludeFiles(...patterns: string[]): this {
    this.rule.pattern!.scope = {
      ...this.rule.pattern!.scope,
      excludePatterns: patterns,
    };
    return this;
  }

  /**
   * 언어 제한
   */
  forLanguages(...languages: string[]): this {
    this.rule.pattern!.scope = {
      ...this.rule.pattern!.scope,
      languages,
    };
    return this;
  }

  /**
   * 메시지 설정
   */
  message(msg: string | ((ctx: MatchContext) => string)): this {
    this.rule.message = msg;
    return this;
  }

  /**
   * 제안 설정
   */
  suggest(suggestion: string | ((ctx: MatchContext) => string)): this {
    this.rule.suggestion = suggestion;
    return this;
  }

  /**
   * 참조 링크
   */
  references(...refs: string[]): this {
    this.rule.references = refs;
    return this;
  }

  /**
   * 태그
   */
  tags(...tags: string[]): this {
    this.rule.tags = tags;
    return this;
  }

  /**
   * 빌드
   */
  build(): RuleDefinition {
    if (!this.rule.name) this.rule.name = this.rule.id;
    if (!this.rule.description) this.rule.description = this.rule.name;
    if (!this.rule.category) this.rule.category = 'style';
    if (!this.rule.severity) this.rule.severity = 'MEDIUM';
    if (!this.rule.message) this.rule.message = this.rule.description;

    return this.rule as RuleDefinition;
  }
}

// ============================================================================
// 룰 엔진
// ============================================================================

export class RuleEngine {
  private rules: Map<string, RuleDefinition> = new Map();
  private rulesetVersion: string = '1.0.0';

  constructor() {}

  /**
   * 룰 등록
   */
  register(rule: RuleDefinition): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * 룰 빌더로 등록
   */
  define(id: string): RuleBuilder {
    const builder = new RuleBuilder(id);
    // 빌드 후 자동 등록을 위한 래퍼
    const originalBuild = builder.build.bind(builder);
    builder.build = () => {
      const rule = originalBuild();
      this.register(rule);
      return rule;
    };
    return builder;
  }

  /**
   * 룰셋 로드
   */
  loadRuleSet(config: RuleSetConfig): void {
    this.rulesetVersion = config.version;
    
    for (const rule of config.rules) {
      // 오버라이드 적용
      if (config.overrides && config.overrides[rule.id]) {
        const overridden = { ...rule, ...config.overrides[rule.id] };
        this.register(overridden);
      } else {
        this.register(rule);
      }
    }
  }

  /**
   * 파일에 대해 모든 룰 실행
   */
  executeAll(files: ASTFile[]): RuleExecutionResult[] {
    const results: RuleExecutionResult[] = [];

    for (const [, rule] of this.rules) {
      if (!rule.enabled) continue;

      const result = this.executeRule(rule, files);
      results.push(result);
    }

    return results;
  }

  /**
   * 단일 룰 실행
   */
  executeRule(rule: RuleDefinition, files: ASTFile[]): RuleExecutionResult {
    const startTime = Date.now();
    const violations: RuleViolation[] = [];
    let nodesScanned = 0;
    let error: string | undefined;

    try {
      // 적용 대상 파일 필터링
      const targetFiles = this.filterFiles(files, rule.pattern.scope);

      for (const file of targetFiles) {
        // AST 순회
        const matches = this.findMatches(file.root, file, rule.pattern);
        nodesScanned += this.countNodes(file.root);

        for (const match of matches) {
          violations.push(this.createViolation(rule, match, file));
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    return {
      ruleId: rule.id,
      violations,
      executionTime: Date.now() - startTime,
      nodesScanned,
      error,
    };
  }

  /**
   * 파일 필터링
   */
  private filterFiles(files: ASTFile[], scope?: PatternScope): ASTFile[] {
    if (!scope) return files;

    return files.filter(file => {
      // 언어 필터
      if (scope.languages && !scope.languages.includes(file.language)) {
        return false;
      }

      // 파일 패턴 필터
      if (scope.filePatterns) {
        const matched = scope.filePatterns.some(p => 
          this.matchGlob(file.filePath, p)
        );
        if (!matched) return false;
      }

      // 제외 패턴
      if (scope.excludePatterns) {
        const excluded = scope.excludePatterns.some(p => 
          this.matchGlob(file.filePath, p)
        );
        if (excluded) return false;
      }

      return true;
    });
  }

  /**
   * AST에서 매칭되는 노드 찾기
   */
  private findMatches(
    node: ASTNode,
    file: ASTFile,
    pattern: RulePattern
  ): MatchContext[] {
    const matches: MatchContext[] = [];

    // 노드 타입 필터
    if (pattern.scope?.nodeTypes) {
      if (!pattern.scope.nodeTypes.includes(node.type)) {
        // 자식만 검사
        for (const child of node.children) {
          matches.push(...this.findMatches(child, file, pattern));
        }
        return matches;
      }
    }

    // 조건 체크
    if (this.checkConditions(node, pattern.conditions)) {
      matches.push({
        node,
        file,
        captures: this.extractCaptures(node, pattern),
        location: node.location,
      });
    }

    // 자식 노드 검사
    for (const child of node.children) {
      matches.push(...this.findMatches(child, file, pattern));
    }

    return matches;
  }

  /**
   * 조건 체크
   */
  private checkConditions(node: ASTNode, conditions: PatternCondition[]): boolean {
    for (const condition of conditions) {
      const value = this.getFieldValue(node, condition.field);
      const matched = this.checkCondition(value, condition.operator, condition.value);
      
      if (condition.not ? matched : !matched) {
        return false;
      }
    }
    return conditions.length > 0;
  }

  /**
   * 필드 값 가져오기
   */
  private getFieldValue(node: ASTNode, field: string): any {
    const parts = field.split('.');
    let value: any = node;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    // lineCount 계산
    if (field === 'lineCount') {
      return node.location.end.line - node.location.start.line + 1;
    }

    return value;
  }

  /**
   * 조건 비교
   */
  private checkCondition(value: any, operator: ComparisonOperator, target: any): boolean {
    switch (operator) {
      case 'equals': return value === target;
      case 'contains': return String(value).includes(target);
      case 'matches': return new RegExp(target).test(String(value));
      case 'startsWith': return String(value).startsWith(target);
      case 'endsWith': return String(value).endsWith(target);
      case 'gt': return value > target;
      case 'gte': return value >= target;
      case 'lt': return value < target;
      case 'lte': return value <= target;
      case 'in': return Array.isArray(target) && target.includes(value);
      case 'exists': return value !== undefined && value !== null;
      default: return false;
    }
  }

  /**
   * 캡처 추출
   */
  private extractCaptures(node: ASTNode, pattern: RulePattern): Record<string, any> {
    return {
      name: node.name,
      type: node.type,
      lineCount: node.location.end.line - node.location.start.line + 1,
      ...node.metadata,
    };
  }

  /**
   * 위반 생성
   */
  private createViolation(
    rule: RuleDefinition,
    match: MatchContext,
    file: ASTFile
  ): RuleViolation {
    const message = typeof rule.message === 'function' 
      ? rule.message(match) 
      : rule.message;

    const suggestion = rule.suggestion 
      ? (typeof rule.suggestion === 'function' ? rule.suggestion(match) : rule.suggestion)
      : undefined;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      message,
      filePath: file.filePath,
      location: match.location,
      suggestion,
      references: rule.references,
    };
  }

  /**
   * 노드 수 카운트
   */
  private countNodes(node: ASTNode): number {
    let count = 1;
    for (const child of node.children) {
      count += this.countNodes(child);
    }
    return count;
  }

  /**
   * Glob 패턴 매칭
   */
  private matchGlob(path: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/');
    return new RegExp(`^${regex}$`).test(path);
  }

  /**
   * 등록된 룰 목록
   */
  getRules(): RuleDefinition[] {
    return Array.from(this.rules.values());
  }

  /**
   * 룰셋 버전
   */
  getVersion(): string {
    return this.rulesetVersion;
  }
}

// ============================================================================
// 기본 룰 정의
// ============================================================================

export const defaultRules: RuleDefinition[] = [
  new RuleBuilder('complexity-high')
    .name('High Cyclomatic Complexity')
    .description('함수의 순환 복잡도가 너무 높습니다')
    .category('style')
    .severity('HIGH')
    .matchNodeType('function', 'method')
    .whereMetadata('complexity', 'gt', 15)
    .message(ctx => `함수 '${ctx.node.name}'의 복잡도가 ${ctx.captures.complexity}입니다 (임계값: 15)`)
    .suggest('함수를 더 작은 단위로 분리하세요')
    .build(),

  new RuleBuilder('function-too-long')
    .name('Function Too Long')
    .description('함수가 너무 깁니다')
    .category('style')
    .severity('MEDIUM')
    .matchNodeType('function', 'method')
    .whereLineCount('gt', 50)
    .message(ctx => `함수 '${ctx.node.name}'이 ${ctx.captures.lineCount}줄입니다 (임계값: 50줄)`)
    .suggest('함수를 더 작은 단위로 분리하세요')
    .build(),

  new RuleBuilder('naming-convention')
    .name('Inconsistent Naming')
    .description('네이밍 규칙을 따르지 않습니다')
    .category('style')
    .severity('LOW')
    .matchNodeType('function')
    .matchName(/^[A-Z]/)
    .forLanguages('typescript', 'javascript')
    .message(ctx => `함수 '${ctx.node.name}'는 camelCase로 시작해야 합니다`)
    .build(),
];

// ============================================================================
// 팩토리 함수
// ============================================================================

export function createRuleEngine(rules?: RuleDefinition[]): RuleEngine {
  const engine = new RuleEngine();
  
  for (const rule of rules || defaultRules) {
    engine.register(rule);
  }

  return engine;
}
