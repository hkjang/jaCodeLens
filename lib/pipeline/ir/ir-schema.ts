/**
 * 표준 중간 표현 (IR) 스키마
 * 
 * 언어별 AST를 통합하기 위한 표준 그래프 구조입니다.
 * 변경 감지, 의존성 분석, 호출 그래프 등에 사용됩니다.
 */

import { SupportedLanguage, ASTFile, ASTNode, ASTLocation } from '../types';

// ============================================================================
// IR 노드 타입
// ============================================================================

export type IRNodeType = 
  | 'module'      // 파일/모듈
  | 'class'       // 클래스
  | 'interface'   // 인터페이스
  | 'function'    // 함수/메서드
  | 'variable'    // 변수/상수
  | 'type'        // 타입 정의
  | 'enum'        // 열거형
  | 'namespace';  // 네임스페이스/패키지

export interface IRLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

export interface IRNode {
  id: string;                     // 고유 ID
  type: IRNodeType;               // 노드 타입
  name: string;                   // 이름
  qualifiedName: string;          // 정규화된 전체 이름 (module.class.method)
  language: SupportedLanguage;    // 원본 언어
  location: IRLocation;           // 위치 정보
  hash: string;                   // 변경 감지용 해시
  
  // 메타데이터
  visibility?: 'public' | 'private' | 'protected' | 'internal';
  isAsync?: boolean;
  isStatic?: boolean;
  isAbstract?: boolean;
  isExported?: boolean;
  parameters?: number;            // 함수인 경우 매개변수 수
  complexity?: number;            // 복잡도 (있는 경우)
  
  // 원본 AST 참조
  originalNodeId?: string;
}

// ============================================================================
// IR 엣지 (관계) 타입
// ============================================================================

export type IREdgeType =
  | 'import'      // A imports B
  | 'call'        // A calls B
  | 'inherit'     // A extends B
  | 'implement'   // A implements B
  | 'compose'     // A contains B (필드)
  | 'depend'      // A depends on B (기타 의존)
  | 'reference';  // A references B

export interface IREdge {
  id: string;
  from: string;       // 소스 노드 ID
  to: string;         // 타겟 노드 ID
  type: IREdgeType;   // 관계 타입
  
  // 메타데이터
  location?: IRLocation;
  isOptional?: boolean;
  isConditional?: boolean;
  weight?: number;    // 관계 강도 (호출 빈도 등)
}

// ============================================================================
// IR 그래프
// ============================================================================

export interface IRMeta {
  projectId: string;
  executeId: string;
  createdAt: Date;
  totalNodes: number;
  totalEdges: number;
  languages: SupportedLanguage[];
  entryPoints: string[];          // 진입점 노드 ID
  circularDependencies: string[][]; // 순환 의존성
}

export interface IRGraph {
  nodes: Map<string, IRNode>;
  edges: IREdge[];
  meta: IRMeta;
  
  // 인덱스
  nodesByFile: Map<string, string[]>;       // filePath -> nodeIds
  nodesByType: Map<IRNodeType, string[]>;   // type -> nodeIds
  edgesByFrom: Map<string, string[]>;       // fromId -> edgeIds
  edgesByTo: Map<string, string[]>;         // toId -> edgeIds
}

// ============================================================================
// IR 그래프 빌더
// ============================================================================

export class IRGraphBuilder {
  private nodes: Map<string, IRNode> = new Map();
  private edges: IREdge[] = [];
  private edgeIndex = 0;
  
  private projectId: string;
  private executeId: string;
  
  constructor(projectId: string, executeId: string) {
    this.projectId = projectId;
    this.executeId = executeId;
  }

  /**
   * 노드 추가
   */
  addNode(node: Omit<IRNode, 'id' | 'hash'>): string {
    const id = this.generateNodeId(node.qualifiedName, node.language);
    const hash = this.computeHash(node);
    
    const irNode: IRNode = { ...node, id, hash };
    this.nodes.set(id, irNode);
    
    return id;
  }

  /**
   * 엣지 추가
   */
  addEdge(from: string, to: string, type: IREdgeType, options?: Partial<IREdge>): string {
    const id = `edge_${this.edgeIndex++}`;
    
    const edge: IREdge = {
      id,
      from,
      to,
      type,
      ...options,
    };
    
    this.edges.push(edge);
    return id;
  }

  /**
   * AST 파일에서 노드 추출
   */
  addFromASTFile(astFile: ASTFile): void {
    // 모듈 노드
    const moduleId = this.addNode({
      type: 'module',
      name: this.getFileName(astFile.filePath),
      qualifiedName: astFile.filePath,
      language: astFile.language,
      location: {
        filePath: astFile.filePath,
        startLine: 1,
        endLine: astFile.root.location.end.line,
      },
      isExported: true,
    });

    // 자식 노드 재귀 처리
    this.processASTNode(astFile.root, moduleId, astFile.filePath, astFile.language);

    // Import 엣지
    for (const imp of astFile.imports) {
      const targetId = this.generateNodeId(imp.source, astFile.language);
      this.addEdge(moduleId, targetId, 'import', {
        location: {
          filePath: astFile.filePath,
          startLine: imp.location.start.line,
          endLine: imp.location.end.line,
        }
      });
    }
  }

  /**
   * AST 노드 재귀 처리
   */
  private processASTNode(
    astNode: ASTNode,
    parentId: string,
    filePath: string,
    language: SupportedLanguage
  ): void {
    // 함수/클래스/인터페이스만 IR 노드로 변환
    const irType = this.mapASTTypeToIRType(astNode.type);
    if (irType && astNode.name) {
      const nodeId = this.addNode({
        type: irType,
        name: astNode.name,
        qualifiedName: `${filePath}#${astNode.name}`,
        language,
        location: {
          filePath,
          startLine: astNode.location.start.line,
          endLine: astNode.location.end.line,
        },
        originalNodeId: astNode.id,
        isExported: astNode.metadata?.exported as boolean,
        isAsync: astNode.metadata?.async as boolean,
        isStatic: astNode.metadata?.static as boolean,
        parameters: astNode.metadata?.parameters as number,
      });

      // 부모와의 관계
      this.addEdge(parentId, nodeId, 'compose');
    }

    // 자식 노드 처리
    for (const child of astNode.children) {
      this.processASTNode(child, parentId, filePath, language);
    }
  }

  /**
   * 그래프 빌드
   */
  build(): IRGraph {
    // 인덱스 생성
    const nodesByFile = new Map<string, string[]>();
    const nodesByType = new Map<IRNodeType, string[]>();
    const edgesByFrom = new Map<string, string[]>();
    const edgesByTo = new Map<string, string[]>();

    for (const [id, node] of this.nodes) {
      // 파일별 인덱스
      const fileNodes = nodesByFile.get(node.location.filePath) || [];
      fileNodes.push(id);
      nodesByFile.set(node.location.filePath, fileNodes);

      // 타입별 인덱스
      const typeNodes = nodesByType.get(node.type) || [];
      typeNodes.push(id);
      nodesByType.set(node.type, typeNodes);
    }

    for (const edge of this.edges) {
      const fromEdges = edgesByFrom.get(edge.from) || [];
      fromEdges.push(edge.id);
      edgesByFrom.set(edge.from, fromEdges);

      const toEdges = edgesByTo.get(edge.to) || [];
      toEdges.push(edge.id);
      edgesByTo.set(edge.to, toEdges);
    }

    // 순환 의존성 감지
    const circularDeps = this.detectCircularDependencies();

    // 진입점 식별
    const entryPoints = this.findEntryPoints(edgesByTo);

    return {
      nodes: this.nodes,
      edges: this.edges,
      meta: {
        projectId: this.projectId,
        executeId: this.executeId,
        createdAt: new Date(),
        totalNodes: this.nodes.size,
        totalEdges: this.edges.length,
        languages: [...new Set(Array.from(this.nodes.values()).map(n => n.language))],
        entryPoints,
        circularDependencies: circularDeps,
      },
      nodesByFile,
      nodesByType,
      edgesByFrom,
      edgesByTo,
    };
  }

  // 헬퍼 메서드들

  private generateNodeId(qualifiedName: string, language: SupportedLanguage): string {
    return `${language}:${qualifiedName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private computeHash(node: Partial<IRNode>): string {
    const content = `${node.qualifiedName}:${node.type}:${node.location?.startLine}`;
    return Buffer.from(content).toString('base64').slice(0, 16);
  }

  private getFileName(filePath: string): string {
    return filePath.split(/[/\\]/).pop() || filePath;
  }

  private mapASTTypeToIRType(astType: string): IRNodeType | null {
    const mapping: Record<string, IRNodeType> = {
      'function': 'function',
      'method': 'function',
      'class': 'class',
      'interface': 'interface',
      'type': 'type',
      'variable': 'variable',
    };
    return mapping[astType] || null;
  }

  private detectCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (nodeId: string, path: string[]) => {
      if (stack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        cycles.push(path.slice(cycleStart));
        return;
      }
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      stack.add(nodeId);
      path.push(nodeId);

      const outEdges = this.edges.filter(e => e.from === nodeId && e.type === 'import');
      for (const edge of outEdges) {
        dfs(edge.to, [...path]);
      }

      stack.delete(nodeId);
    };

    for (const nodeId of this.nodes.keys()) {
      dfs(nodeId, []);
    }

    return cycles;
  }

  private findEntryPoints(edgesByTo: Map<string, string[]>): string[] {
    const entryPoints: string[] = [];
    
    for (const [id, node] of this.nodes) {
      // 외부에서 참조되지 않고 exported된 모듈
      if (node.type === 'module' && node.isExported) {
        const incomingEdges = edgesByTo.get(id) || [];
        if (incomingEdges.length === 0) {
          entryPoints.push(id);
        }
      }
    }

    return entryPoints;
  }
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 두 IR 그래프 비교 (변경 감지)
 */
export function compareIRGraphs(
  previous: IRGraph,
  current: IRGraph
): { added: string[]; removed: string[]; modified: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  const prevIds = new Set(previous.nodes.keys());
  const currIds = new Set(current.nodes.keys());

  for (const id of currIds) {
    if (!prevIds.has(id)) {
      added.push(id);
    } else {
      const prevNode = previous.nodes.get(id)!;
      const currNode = current.nodes.get(id)!;
      if (prevNode.hash !== currNode.hash) {
        modified.push(id);
      }
    }
  }

  for (const id of prevIds) {
    if (!currIds.has(id)) {
      removed.push(id);
    }
  }

  return { added, removed, modified };
}

/**
 * IR 그래프에서 특정 타입의 노드만 추출
 */
export function getNodesByType(graph: IRGraph, type: IRNodeType): IRNode[] {
  const ids = graph.nodesByType.get(type) || [];
  return ids.map(id => graph.nodes.get(id)!).filter(Boolean);
}

/**
 * IR 그래프를 JSON으로 직렬화
 */
export function serializeIRGraph(graph: IRGraph): string {
  const serializable = {
    nodes: Array.from(graph.nodes.entries()),
    edges: graph.edges,
    meta: graph.meta,
  };
  return JSON.stringify(serializable);
}
