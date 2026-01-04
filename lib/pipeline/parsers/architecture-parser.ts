/**
 * 아키텍처 규칙 파서
 * 
 * 레이어 위반, 도메인 경계, 순환 참조 패턴 검사
 * AI 사용 없이 룰/정규식 기반으로 분석합니다.
 */

import * as path from 'path';
import {
  FileInfo,
  RuleViolation,
  RuleCategory,
  Severity,
  ASTLocation
} from '../types';

interface ArchitectureRule {
  id: string;
  name: string;
  severity: Severity;
  check: (file: FileInfo, allFiles: FileInfo[]) => RuleViolation[];
  message: string;
}

// 아키텍처 패턴 정의
const ARCHITECTURE_PATTERNS = {
  // 각 레이어 디렉토리 패턴
  presentation: /(?:^|\/)(app|pages|components|views|ui|screens)\//i,
  application: /(?:^|\/)(services|use-?cases|handlers|controllers)\//i,
  domain: /(?:^|\/)(domain|models|entities|core)\//i,
  infrastructure: /(?:^|\/)(lib|utils|helpers|api|db|database|repositories)\//i
};

// 허용되는 의존성 방향
const ALLOWED_DEPENDENCIES: Record<string, string[]> = {
  presentation: ['application', 'domain', 'infrastructure'],
  application: ['domain', 'infrastructure'],
  domain: [],  // Domain은 다른 레이어에 의존하면 안 됨
  infrastructure: ['domain']
};

export class ArchitectureParser {
  /**
   * 아키텍처 규칙 분석
   */
  parseFiles(files: FileInfo[]): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // 1. 레이어 위반 검사
    violations.push(...this.checkLayerViolations(files));

    // 2. 도메인 순수성 검사
    violations.push(...this.checkDomainPurity(files));

    // 3. 순환 import 패턴 검사
    violations.push(...this.checkCircularPatterns(files));

    // 4. 금지된 import 패턴
    violations.push(...this.checkForbiddenImports(files));

    return violations;
  }

  /**
   * 레이어 위반 검사
   */
  private checkLayerViolations(files: FileInfo[]): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const file of files) {
      if (!file.content) continue;

      const sourceLayer = this.detectLayer(file.path);
      if (!sourceLayer) continue;

      const imports = this.extractImports(file.content);
      
      for (const imp of imports) {
        if (!imp.isRelative) continue;

        const targetPath = this.resolveImportPath(file.path, imp.source);
        const targetLayer = this.detectLayer(targetPath);

        if (targetLayer && !this.isAllowedDependency(sourceLayer, targetLayer)) {
          violations.push({
            ruleId: 'ARCH001',
            ruleName: 'layer-violation',
            category: 'architecture' as RuleCategory,
            severity: 'HIGH',
            message: `레이어 위반: ${sourceLayer} → ${targetLayer} (${sourceLayer}는 ${targetLayer}에 의존하면 안 됩니다)`,
            filePath: file.path,
            location: this.createLocation(file.path, imp.line, imp.line),
            suggestion: `${this.getSuggestion(sourceLayer, targetLayer)}`
          });
        }
      }
    }

    return violations;
  }

  /**
   * 도메인 레이어 순수성 검사
   */
  private checkDomainPurity(files: FileInfo[]): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // Next.js app 폴더 및 일반 UI 파일 제외 (프레임워크 사용이 당연함)
    const excludedPatterns = [
      /[\\/]app[\\/]/,           // Next.js app directory
      /[\\/]pages[\\/]/,         // Next.js pages directory
      /[\\/]components[\\/]/,    // Component files
      /page\.tsx?$/,            // page files
      /layout\.tsx?$/,          // layout files
      /loading\.tsx?$/,         // loading files
      /error\.tsx?$/,           // error files
    ];

    for (const file of files) {
      if (!file.content) continue;

      // 제외 패턴에 해당하면 도메인 순수성 검사 안함
      if (excludedPatterns.some(p => p.test(file.path))) continue;

      const isDomain = ARCHITECTURE_PATTERNS.domain.test(file.path);
      if (!isDomain) continue;

      // 도메인에서 외부 의존성 검사
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 프레임워크 의존성 검사
        if (/import.*from\s+['"](?:express|fastify|next|react|vue|angular)/i.test(line)) {
          violations.push({
            ruleId: 'ARCH010',
            ruleName: 'domain-framework-dependency',
            category: 'architecture' as RuleCategory,
            severity: 'HIGH',
            message: '도메인 레이어에서 프레임워크 의존성 사용',
            filePath: file.path,
            location: this.createLocation(file.path, i + 1, i + 1),
            suggestion: '도메인은 프레임워크에 독립적이어야 합니다'
          });
        }

        // DB 직접 접근 검사
        if (/import.*from\s+['"](?:prisma|mongoose|typeorm|sequelize)/i.test(line)) {
          violations.push({
            ruleId: 'ARCH011',
            ruleName: 'domain-db-dependency',
            category: 'architecture' as RuleCategory,
            severity: 'MEDIUM',
            message: '도메인 레이어에서 DB 라이브러리 직접 import',
            filePath: file.path,
            location: this.createLocation(file.path, i + 1, i + 1),
            suggestion: 'Repository 패턴을 사용하세요'
          });
        }
      }
    }

    return violations;
  }

  /**
   * 순환 import 패턴 검사
   * (간단한 패턴 기반, 실제 순환은 DependencyAnalyzer에서 상세 분석)
   */
  private checkCircularPatterns(files: FileInfo[]): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // 인덱스 파일에서 자기 디렉토리 상대 import 검사
    for (const file of files) {
      if (!file.content) continue;
      
      const fileName = path.basename(file.path);
      if (fileName !== 'index.ts' && fileName !== 'index.js') continue;

      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // index 파일에서 ./로 시작하지 않는 상대 import
        if (/import.*from\s+['"]\.\/index['"]/i.test(line)) {
          violations.push({
            ruleId: 'ARCH020',
            ruleName: 'circular-index-import',
            category: 'architecture' as RuleCategory,
            severity: 'MEDIUM',
            message: 'index 파일에서 자기 자신 import (순환 가능성)',
            filePath: file.path,
            location: this.createLocation(file.path, i + 1, i + 1),
            suggestion: '직접 파일을 import하세요'
          });
        }
      }
    }

    return violations;
  }

  /**
   * 금지된 import 패턴 검사
   */
  private checkForbiddenImports(files: FileInfo[]): RuleViolation[] {
    const violations: RuleViolation[] = [];

    const forbiddenPatterns = [
      { pattern: /import\s+\*\s+as\s+\w+\s+from/, message: 'namespace import 지양', severity: 'INFO' as Severity },
      { pattern: /require\s*\(\s*['"][^'"]+['"]\s*\)\s*\.\w+/, message: 'require().property 패턴 지양', severity: 'LOW' as Severity }
    ];

    for (const file of files) {
      if (!file.content) continue;
      
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const { pattern, message, severity } of forbiddenPatterns) {
          if (pattern.test(line)) {
            violations.push({
              ruleId: 'ARCH030',
              ruleName: 'forbidden-import-pattern',
              category: 'architecture' as RuleCategory,
              severity,
              message,
              filePath: file.path,
              location: this.createLocation(file.path, i + 1, i + 1)
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * 레이어 감지
   */
  private detectLayer(filePath: string): string | null {
    for (const [layer, pattern] of Object.entries(ARCHITECTURE_PATTERNS)) {
      if (pattern.test(filePath.replace(/\\/g, '/'))) {
        return layer;
      }
    }
    return null;
  }

  /**
   * 의존성 허용 여부
   */
  private isAllowedDependency(source: string, target: string): boolean {
    if (source === target) return true;
    return (ALLOWED_DEPENDENCIES[source] || []).includes(target);
  }

  /**
   * import 추출
   */
  private extractImports(content: string): Array<{ source: string; line: number; isRelative: boolean }> {
    const imports: Array<{ source: string; line: number; isRelative: boolean }> = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/import\s+.*?from\s+['"]([^'"]+)['"]/);
      if (match) {
        imports.push({
          source: match[1],
          line: i + 1,
          isRelative: match[1].startsWith('.')
        });
      }
    }

    return imports;
  }

  /**
   * import 경로 해석
   */
  private resolveImportPath(fromPath: string, importSource: string): string {
    const fromDir = path.dirname(fromPath);
    return path.normalize(path.join(fromDir, importSource));
  }

  /**
   * 위반에 대한 제안
   */
  private getSuggestion(source: string, target: string): string {
    if (target === 'domain' && source !== 'domain') {
      return '도메인 로직만 직접 사용하고, 인프라 세부 사항은 추상화하세요';
    }
    if (source === 'domain') {
      return '도메인 레이어는 외부에 의존하면 안 됩니다. 의존성 역전을 적용하세요';
    }
    return `${source}가 ${target}에 직접 의존하지 않도록 중간 추상화를 추가하세요`;
  }

  /**
   * ASTLocation 생성
   */
  private createLocation(filePath: string, startLine: number, endLine: number): ASTLocation {
    return {
      start: { line: startLine, column: 0 },
      end: { line: endLine, column: 0 },
      filePath
    };
  }
}
