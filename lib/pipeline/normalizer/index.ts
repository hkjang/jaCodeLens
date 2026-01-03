/**
 * 결과 정규화 서비스
 * 
 * 모든 분석 결과를 통합된 데이터 모델로 변환합니다.
 */

import * as crypto from 'crypto';
import {
  NormalizedResult,
  CategorizedResult,
  RuleViolation,
  StaticFinding,
  Severity,
  SupportedLanguage,
  LanguageMapping
} from '../types';

export class Normalizer {
  private projectId: string;
  private executeId: string;
  private languageMappings: Map<string, SupportedLanguage>;

  constructor(projectId: string, executeId: string, languageMappings: LanguageMapping[]) {
    this.projectId = projectId;
    this.executeId = executeId;
    this.languageMappings = new Map(
      languageMappings.map(m => [m.filePath, m.language])
    );
  }

  /**
   * 분류된 결과를 정규화
   */
  normalize(categorizedResult: CategorizedResult): NormalizedResult {
    const original = categorizedResult.originalResult;
    
    if (this.isRuleViolation(original)) {
      return this.normalizeViolation(original, categorizedResult);
    } else {
      return this.normalizeFinding(original, categorizedResult);
    }
  }

  /**
   * 여러 결과 일괄 정규화
   */
  normalizeAll(categorizedResults: CategorizedResult[]): NormalizedResult[] {
    return categorizedResults.map(r => this.normalize(r));
  }

  /**
   * RuleViolation 정규화
   */
  private normalizeViolation(
    violation: RuleViolation,
    categorized: CategorizedResult
  ): NormalizedResult {
    return {
      id: crypto.randomUUID(),
      projectId: this.projectId,
      executeId: this.executeId,
      
      filePath: violation.filePath,
      lineStart: violation.location.start.line,
      lineEnd: violation.location.end.line,
      
      language: this.languageMappings.get(violation.filePath) || 'unknown',
      mainCategory: categorized.mainCategory,
      subCategory: categorized.subCategory,
      ruleId: violation.ruleId,
      severity: violation.severity,
      
      message: violation.message,
      suggestion: violation.suggestion,
      
      rawResult: {
        type: 'violation',
        ruleName: violation.ruleName,
        category: violation.category,
        references: violation.references
      },
      
      createdAt: new Date(),
      deterministic: true
    };
  }

  /**
   * StaticFinding 정규화
   */
  private normalizeFinding(
    finding: StaticFinding,
    categorized: CategorizedResult
  ): NormalizedResult {
    return {
      id: crypto.randomUUID(),
      projectId: this.projectId,
      executeId: this.executeId,
      
      filePath: finding.location.filePath,
      lineStart: finding.location.start.line,
      lineEnd: finding.location.end.line,
      
      language: this.languageMappings.get(finding.location.filePath) || 'unknown',
      mainCategory: categorized.mainCategory,
      subCategory: categorized.subCategory,
      ruleId: finding.id,
      severity: finding.severity,
      
      message: finding.message,
      
      rawResult: {
        type: 'finding',
        findingType: finding.type,
        metadata: finding.metadata
      },
      
      createdAt: new Date(),
      deterministic: true
    };
  }

  /**
   * 타입 가드: RuleViolation
   */
  private isRuleViolation(result: RuleViolation | StaticFinding): result is RuleViolation {
    return 'ruleId' in result && 'ruleName' in result;
  }

  /**
   * 정규화 결과 통계
   */
  static getStats(results: NormalizedResult[]): {
    total: number;
    bySeverity: Record<Severity, number>;
    byLanguage: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const bySeverity: Record<Severity, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0
    };
    const byLanguage: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const r of results) {
      bySeverity[r.severity]++;
      byLanguage[r.language] = (byLanguage[r.language] || 0) + 1;
      byCategory[r.mainCategory] = (byCategory[r.mainCategory] || 0) + 1;
    }

    return {
      total: results.length,
      bySeverity,
      byLanguage,
      byCategory
    };
  }

  /**
   * 심각도별 필터
   */
  static filterBySeverity(
    results: NormalizedResult[],
    minSeverity: Severity
  ): NormalizedResult[] {
    const severityOrder: Record<Severity, number> = {
      CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1
    };
    
    const minLevel = severityOrder[minSeverity];
    return results.filter(r => severityOrder[r.severity] >= minLevel);
  }
}
