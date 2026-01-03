/**
 * 의존성 분석기
 * 
 * import/require 기반 의존성 그래프 생성 및 순환 참조 탐지
 * AI 사용 없이 결정적으로 분석합니다.
 */

import * as path from 'path';
import {
  FileInfo,
  DependencyInfo,
  DependencyGraph,
  StaticAnalysisResult,
  StaticFinding,
  ASTLocation
} from '../types';

export class DependencyAnalyzer {
  /**
   * 의존성 그래프 생성
   */
  analyzeDependencies(files: FileInfo[]): {
    graph: DependencyGraph;
    result: StaticAnalysisResult;
  } {
    const nodes = new Set<string>();
    const edges: DependencyInfo[] = [];
    const findings: StaticFinding[] = [];

    // 1. 모든 파일의 의존성 추출
    for (const file of files) {
      if (!file.content) continue;
      
      nodes.add(file.path);
      const deps = this.extractDependencies(file);
      
      for (const dep of deps) {
        edges.push(dep);
        if (dep.to.startsWith('.') || dep.to.startsWith('/')) {
          nodes.add(dep.to);
        }
      }
    }

    // 2. 순환 참조 탐지
    const cycles = this.detectCycles(Array.from(nodes), edges);
    
    // 순환 참조 표시
    for (const edge of edges) {
      const isInCycle = cycles.some(cycle => 
        cycle.includes(edge.from) && cycle.includes(edge.to)
      );
      edge.isCircular = isInCycle;
    }

    // 3. Findings 생성
    for (const cycle of cycles) {
      findings.push({
        id: `circular-dep-${cycle.join('-').substring(0, 50)}`,
        type: 'circular-dependency',
        message: `순환 참조 발견: ${cycle.map(p => path.basename(p)).join(' → ')}`,
        severity: 'HIGH',
        location: this.createLocation(cycle[0], 1, 1),
        metadata: { cycle }
      });
    }

    // 4. 외부 의존성 분석
    const externalDeps = edges.filter(e => e.type === 'external');
    const externalDepCounts = new Map<string, number>();
    for (const dep of externalDeps) {
      const count = externalDepCounts.get(dep.to) || 0;
      externalDepCounts.set(dep.to, count + 1);
    }

    // 과도한 외부 의존성 경고
    const overdependentFiles = this.findOverdependentFiles(edges);
    for (const { file, count } of overdependentFiles) {
      findings.push({
        id: `high-coupling-${file}`,
        type: 'high-coupling',
        message: `파일의 의존성이 많습니다 (${count}개)`,
        severity: 'LOW',
        location: this.createLocation(file, 1, 1),
        metadata: { dependencyCount: count }
      });
    }

    return {
      graph: {
        nodes: Array.from(nodes),
        edges,
        cycles
      },
      result: {
        type: 'dependency',
        filePath: 'project',
        findings
      }
    };
  }

  /**
   * 파일에서 의존성 추출
   */
  private extractDependencies(file: FileInfo): DependencyInfo[] {
    const deps: DependencyInfo[] = [];
    if (!file.content) return deps;

    const lines = file.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // ES import
      const importMatch = line.match(/import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/);
      if (importMatch) {
        deps.push(this.createDependency(file.path, importMatch[1], 'import', i + 1));
        continue;
      }

      // CommonJS require
      const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (requireMatch) {
        deps.push(this.createDependency(file.path, requireMatch[1], 'require', i + 1));
        continue;
      }

      // Dynamic import
      const dynamicMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (dynamicMatch) {
        deps.push(this.createDependency(file.path, dynamicMatch[1], 'dynamic', i + 1));
      }
    }

    return deps;
  }

  /**
   * 의존성 정보 생성
   */
  private createDependency(
    from: string, 
    to: string, 
    type: 'import' | 'require' | 'dynamic',
    line: number
  ): DependencyInfo {
    const isExternal = !to.startsWith('.') && !to.startsWith('/');
    
    return {
      from,
      to: isExternal ? to : this.resolvePath(from, to),
      type: isExternal ? 'external' : type,
      isCircular: false,
      location: this.createLocation(from, line, line)
    };
  }

  /**
   * 순환 참조 탐지 (DFS 기반)
   */
  private detectCycles(nodes: string[], edges: DependencyInfo[]): string[][] {
    const cycles: string[][] = [];
    const adjacency = new Map<string, string[]>();

    // 인접 리스트 생성
    for (const node of nodes) {
      adjacency.set(node, []);
    }
    for (const edge of edges) {
      if (edge.type !== 'external') {
        const targets = adjacency.get(edge.from) || [];
        targets.push(edge.to);
        adjacency.set(edge.from, targets);
      }
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = adjacency.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          // 순환 발견
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart);
            cycle.push(neighbor); // 순환 완성
            cycles.push(cycle);
          }
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const node of nodes) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * 과도한 의존성을 가진 파일 탐지
   */
  private findOverdependentFiles(edges: DependencyInfo[]): Array<{ file: string; count: number }> {
    const depCounts = new Map<string, number>();
    
    for (const edge of edges) {
      const count = depCounts.get(edge.from) || 0;
      depCounts.set(edge.from, count + 1);
    }

    return Array.from(depCounts.entries())
      .filter(([_, count]) => count > 15)
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 상대 경로 해석
   */
  private resolvePath(from: string, relativePath: string): string {
    const fromDir = path.dirname(from);
    let resolved = path.normalize(path.join(fromDir, relativePath));
    
    // 확장자가 없으면 일반적인 확장자 추가
    if (!path.extname(resolved)) {
      resolved += '.ts'; // 기본값으로 .ts 가정
    }
    
    return resolved;
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
