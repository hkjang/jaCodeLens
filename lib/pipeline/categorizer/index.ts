/**
 * 카테고리 분류 엔진
 * 
 * 분석 결과를 대분류/중분류로 체계화합니다.
 */

import {
  RuleViolation,
  StaticFinding,
  CategorizedResult,
  MainCategory,
  SubCategory
} from '../types';

// 룰 ID → 카테고리 매핑
const RULE_CATEGORY_MAP: Record<string, { main: MainCategory; sub: SubCategory }> = {
  // 보안
  'SEC001': { main: 'SECURITY', sub: 'SECRET' },
  'SEC002': { main: 'SECURITY', sub: 'SECRET' },
  'SEC003': { main: 'SECURITY', sub: 'SECRET' },
  'SEC004': { main: 'SECURITY', sub: 'SECRET' },
  'SEC005': { main: 'SECURITY', sub: 'SECRET' },
  'SEC010': { main: 'SECURITY', sub: 'INJECTION' },
  'SEC011': { main: 'SECURITY', sub: 'INJECTION' },
  'SEC020': { main: 'SECURITY', sub: 'XSS' },
  'SEC021': { main: 'SECURITY', sub: 'XSS' },
  'SEC030': { main: 'SECURITY', sub: 'INJECTION' },
  'SEC031': { main: 'SECURITY', sub: 'INJECTION' },
  'SEC040': { main: 'SECURITY', sub: 'SECRET' },
  'SEC041': { main: 'SECURITY', sub: 'SECRET' },
  'SEC050': { main: 'SECURITY', sub: 'INPUT_VALIDATION' },
  'SEC051': { main: 'SECURITY', sub: 'INPUT_VALIDATION' },
  'SEC060': { main: 'SECURITY', sub: 'INPUT_VALIDATION' },
  'SEC070': { main: 'SECURITY', sub: 'INPUT_VALIDATION' },
  'SEC080': { main: 'OPERATIONS', sub: 'LOGGING' },

  // 스타일
  'STY001': { main: 'STANDARDS', sub: 'NAMING' },
  'STY002': { main: 'STANDARDS', sub: 'NAMING' },
  'STY003': { main: 'STANDARDS', sub: 'NAMING' },
  'STY004': { main: 'STANDARDS', sub: 'NAMING' },
  'STY010': { main: 'QUALITY', sub: 'COMPLEXITY' },
  'STY011': { main: 'QUALITY', sub: 'COMPLEXITY' },
  'STY020': { main: 'STANDARDS', sub: 'CONVENTION' },
  'STY021': { main: 'STANDARDS', sub: 'CONVENTION' },
  'STY022': { main: 'STANDARDS', sub: 'CONVENTION' },
  'STY030': { main: 'OPERATIONS', sub: 'LOGGING' },
  'STY031': { main: 'OPERATIONS', sub: 'LOGGING' },
  'STY040': { main: 'STANDARDS', sub: 'CONVENTION' },
  'STY041': { main: 'QUALITY', sub: 'COMPLEXITY' },
  'STY042': { main: 'STANDARDS', sub: 'FORMAT' },
  'STY050': { main: 'STANDARDS', sub: 'FORMAT' },
  'STY060': { main: 'STANDARDS', sub: 'CONVENTION' },
  'STY061': { main: 'STANDARDS', sub: 'CONVENTION' },
  'STY062': { main: 'STANDARDS', sub: 'CONVENTION' },

  // 아키텍처
  'ARCH001': { main: 'STRUCTURE', sub: 'LAYER' },
  'ARCH010': { main: 'STRUCTURE', sub: 'LAYER' },
  'ARCH011': { main: 'STRUCTURE', sub: 'LAYER' },
  'ARCH020': { main: 'STRUCTURE', sub: 'CIRCULAR' },
  'ARCH030': { main: 'STANDARDS', sub: 'CONVENTION' },

  // 테스트
  'TEST001': { main: 'TEST', sub: 'MISSING_TEST' },
  'TEST010': { main: 'TEST', sub: 'COVERAGE' },
  'TEST011': { main: 'TEST', sub: 'COVERAGE' },
  'TEST012': { main: 'TEST', sub: 'COVERAGE' },
  'TEST013': { main: 'OPERATIONS', sub: 'LOGGING' },
  'TEST020': { main: 'TEST', sub: 'COVERAGE' },
  'TEST021': { main: 'TEST', sub: 'COVERAGE' }
};

// 타입 기반 매핑 (StaticFinding용)
const TYPE_CATEGORY_MAP: Record<string, { main: MainCategory; sub: SubCategory }> = {
  'high-complexity': { main: 'QUALITY', sub: 'COMPLEXITY' },
  'file-too-long': { main: 'QUALITY', sub: 'COMPLEXITY' },
  'layer-violation': { main: 'STRUCTURE', sub: 'LAYER' },
  'deep-nesting': { main: 'STRUCTURE', sub: 'LAYER' },
  'fat-module': { main: 'STRUCTURE', sub: 'LAYER' },
  'circular-dependency': { main: 'STRUCTURE', sub: 'CIRCULAR' },
  'high-coupling': { main: 'QUALITY', sub: 'COMPLEXITY' },
  'dead-code': { main: 'QUALITY', sub: 'DUPLICATION' },
  'deep-call-chain': { main: 'QUALITY', sub: 'COMPLEXITY' }
};

export class Categorizer {
  /**
   * RuleViolation 분류
   */
  categorizeViolation(violation: RuleViolation): CategorizedResult {
    const mapping = RULE_CATEGORY_MAP[violation.ruleId];
    
    if (mapping) {
      return {
        mainCategory: mapping.main,
        subCategory: mapping.sub,
        originalResult: violation
      };
    }

    // 매핑이 없으면 카테고리에서 추론
    return {
      mainCategory: this.inferMainCategory(violation.category),
      subCategory: this.inferSubCategory(violation.ruleName),
      originalResult: violation
    };
  }

  /**
   * StaticFinding 분류
   */
  categorizeFinding(finding: StaticFinding): CategorizedResult {
    const mapping = TYPE_CATEGORY_MAP[finding.type];
    
    if (mapping) {
      return {
        mainCategory: mapping.main,
        subCategory: mapping.sub,
        originalResult: finding
      };
    }

    // 기본값
    return {
      mainCategory: 'QUALITY',
      subCategory: 'COMPLEXITY',
      originalResult: finding
    };
  }

  /**
   * 여러 결과 일괄 분류
   */
  categorizeAll(
    violations: RuleViolation[],
    findings: StaticFinding[]
  ): CategorizedResult[] {
    const results: CategorizedResult[] = [];

    for (const v of violations) {
      results.push(this.categorizeViolation(v));
    }

    for (const f of findings) {
      results.push(this.categorizeFinding(f));
    }

    return results;
  }

  /**
   * 카테고리별 통계
   */
  getStatsByCategory(results: CategorizedResult[]): {
    byMain: Record<MainCategory, number>;
    bySub: Record<SubCategory, number>;
  } {
    const byMain: Record<MainCategory, number> = {
      STRUCTURE: 0,
      QUALITY: 0,
      SECURITY: 0,
      OPERATIONS: 0,
      TEST: 0,
      STANDARDS: 0
    };

    const bySub: Partial<Record<SubCategory, number>> = {};

    for (const r of results) {
      byMain[r.mainCategory]++;
      bySub[r.subCategory] = (bySub[r.subCategory] || 0) + 1;
    }

    return { byMain, bySub: bySub as Record<SubCategory, number> };
  }

  /**
   * 카테고리에서 대분류 추론
   */
  private inferMainCategory(category: string): MainCategory {
    const map: Record<string, MainCategory> = {
      security: 'SECURITY',
      style: 'STANDARDS',
      architecture: 'STRUCTURE',
      test: 'TEST',
      config: 'OPERATIONS'
    };
    return map[category] || 'QUALITY';
  }

  /**
   * 룰 이름에서 중분류 추론
   */
  private inferSubCategory(ruleName: string): SubCategory {
    const name = ruleName.toLowerCase();
    
    if (name.includes('layer')) return 'LAYER';
    if (name.includes('circular')) return 'CIRCULAR';
    if (name.includes('complex')) return 'COMPLEXITY';
    if (name.includes('duplicate')) return 'DUPLICATION';
    if (name.includes('inject')) return 'INJECTION';
    if (name.includes('xss')) return 'XSS';
    if (name.includes('secret') || name.includes('key') || name.includes('password')) return 'SECRET';
    if (name.includes('log')) return 'LOGGING';
    if (name.includes('test') || name.includes('coverage')) return 'COVERAGE';
    if (name.includes('naming') || name.includes('case')) return 'NAMING';
    if (name.includes('format')) return 'FORMAT';
    
    return 'CONVENTION';
  }
}
