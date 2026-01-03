/**
 * 구조 분석기
 * 
 * 패키지/모듈 구조 및 레이어 분석
 * AI 사용 없이 결정적으로 분석합니다.
 */

import * as path from 'path';
import { 
  FileInfo, 
  StaticAnalysisResult, 
  StaticFinding,
  ASTLocation 
} from '../types';

interface ModuleInfo {
  name: string;
  path: string;
  type: 'directory' | 'file';
  files: string[];
  depth: number;
}

interface LayerDefinition {
  name: string;
  patterns: string[];
  allowedDependencies: string[];
}

// 기본 레이어 정의 (클린 아키텍처 기반)
const DEFAULT_LAYERS: LayerDefinition[] = [
  {
    name: 'presentation',
    patterns: ['app', 'pages', 'components', 'views', 'ui'],
    allowedDependencies: ['application', 'domain', 'infrastructure']
  },
  {
    name: 'application',
    patterns: ['services', 'use-cases', 'usecases', 'handlers'],
    allowedDependencies: ['domain', 'infrastructure']
  },
  {
    name: 'domain',
    patterns: ['domain', 'models', 'entities', 'core'],
    allowedDependencies: []  // Domain should not depend on anything
  },
  {
    name: 'infrastructure',
    patterns: ['lib', 'utils', 'helpers', 'api', 'db', 'database'],
    allowedDependencies: ['domain']
  }
];

export class StructureAnalyzer {
  private layers: LayerDefinition[];

  constructor(customLayers?: LayerDefinition[]) {
    this.layers = customLayers || DEFAULT_LAYERS;
  }

  /**
   * 프로젝트 구조 분석
   */
  analyzeStructure(files: FileInfo[]): {
    modules: ModuleInfo[];
    result: StaticAnalysisResult;
  } {
    const modules = this.extractModules(files);
    const findings: StaticFinding[] = [];

    // 레이어 구조 검사
    const layerViolations = this.checkLayerViolations(files);
    findings.push(...layerViolations);

    // 디렉토리 구조 검사
    const structureIssues = this.checkStructureIssues(modules);
    findings.push(...structureIssues);

    return {
      modules,
      result: {
        type: 'structure',
        filePath: 'project',
        findings
      }
    };
  }

  /**
   * 모듈 추출
   */
  private extractModules(files: FileInfo[]): ModuleInfo[] {
    const moduleMap = new Map<string, ModuleInfo>();

    for (const file of files) {
      const dirPath = path.dirname(file.path);
      const parts = dirPath.split(/[/\\]/).filter(p => p && p !== '.');
      
      // 각 디렉토리 레벨을 모듈로 등록
      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        currentPath = parts.slice(0, i + 1).join('/');
        
        if (!moduleMap.has(currentPath)) {
          moduleMap.set(currentPath, {
            name: parts[i],
            path: currentPath,
            type: 'directory',
            files: [],
            depth: i + 1
          });
        }
        
        // 최하위 모듈에만 파일 추가
        if (i === parts.length - 1) {
          moduleMap.get(currentPath)!.files.push(file.path);
        }
      }
    }

    return Array.from(moduleMap.values());
  }

  /**
   * 레이어 위반 검사
   */
  private checkLayerViolations(files: FileInfo[]): StaticFinding[] {
    const findings: StaticFinding[] = [];

    for (const file of files) {
      if (!file.content) continue;
      
      const sourceLayer = this.detectLayer(file.path);
      if (!sourceLayer) continue;

      // Import 문 추출 (간단한 정규식 기반)
      const importMatches = file.content.matchAll(
        /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
      );

      for (const match of importMatches) {
        const importPath = match[1];
        
        // 상대 경로인 경우 레이어 검사
        if (importPath.startsWith('.')) {
          const resolvedPath = this.resolvePath(file.path, importPath);
          const targetLayer = this.detectLayer(resolvedPath);
          
          if (targetLayer && !this.isAllowedDependency(sourceLayer, targetLayer)) {
            const lineNum = this.getLineNumber(file.content, match.index || 0);
            findings.push({
              id: `layer-violation-${file.path}-${lineNum}`,
              type: 'layer-violation',
              message: `레이어 위반: ${sourceLayer.name} → ${targetLayer.name} (허용되지 않는 의존성)`,
              severity: 'MEDIUM',
              location: this.createLocation(file.path, lineNum, lineNum),
              metadata: {
                sourceLayer: sourceLayer.name,
                targetLayer: targetLayer.name,
                importPath
              }
            });
          }
        }
      }
    }

    return findings;
  }

  /**
   * 구조 문제 검사
   */
  private checkStructureIssues(modules: ModuleInfo[]): StaticFinding[] {
    const findings: StaticFinding[] = [];

    // 깊은 중첩 검사
    const deepModules = modules.filter(m => m.depth > 5);
    for (const mod of deepModules) {
      findings.push({
        id: `deep-nesting-${mod.path}`,
        type: 'deep-nesting',
        message: `디렉토리 중첩이 깊습니다 (depth: ${mod.depth})`,
        severity: 'LOW',
        location: this.createLocation(mod.path, 1, 1),
        metadata: { depth: mod.depth }
      });
    }

    // 과도하게 많은 파일을 가진 모듈
    const fatModules = modules.filter(m => m.files.length > 20);
    for (const mod of fatModules) {
      findings.push({
        id: `fat-module-${mod.path}`,
        type: 'fat-module',
        message: `모듈의 파일이 너무 많습니다 (${mod.files.length}개)`,
        severity: 'LOW',
        location: this.createLocation(mod.path, 1, 1),
        metadata: { fileCount: mod.files.length }
      });
    }

    return findings;
  }

  /**
   * 파일 경로에서 레이어 감지
   */
  private detectLayer(filePath: string): LayerDefinition | null {
    const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
    
    for (const layer of this.layers) {
      for (const pattern of layer.patterns) {
        if (normalizedPath.includes(`/${pattern}/`) || 
            normalizedPath.startsWith(`${pattern}/`)) {
          return layer;
        }
      }
    }
    
    return null;
  }

  /**
   * 의존성 허용 여부 검사
   */
  private isAllowedDependency(source: LayerDefinition, target: LayerDefinition): boolean {
    if (source.name === target.name) return true;
    return source.allowedDependencies.includes(target.name);
  }

  /**
   * 상대 경로 해석
   */
  private resolvePath(from: string, relativePath: string): string {
    const fromDir = path.dirname(from);
    return path.normalize(path.join(fromDir, relativePath));
  }

  /**
   * 문자 위치에서 줄 번호 계산
   */
  private getLineNumber(content: string, charIndex: number): number {
    const lines = content.substring(0, charIndex).split('\n');
    return lines.length;
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
