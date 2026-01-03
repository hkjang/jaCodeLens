/**
 * 분석 스냅샷 저장소
 * 
 * 재현 가능한 분석 스냅샷을 저장하고 관리합니다.
 * - 코드 (commit)
 * - 룰 버전
 * - AI 모델
 * - 옵션 설정
 * - 결과 고정
 */

import * as crypto from 'crypto';
import { 
  NormalizedResult, 
  PipelineConfig, 
  PipelineSummary,
  LanguageStats
} from '../types';

// ============================================================================
// 타입 정의
// ============================================================================

export interface SnapshotMeta {
  id: string;
  projectId: string;
  executeId: string;
  createdAt: Date;
  
  // 코드 상태
  commitHash: string;
  branch: string;
  tag?: string;
  
  // 분석 설정
  pipelineVersion: string;
  ruleVersion: string;
  aiModel?: string;
  config: PipelineConfig;
  
  // 결과 요약
  summary: PipelineSummary;
  
  // 무결성
  checksum: string;
}

export interface SnapshotData {
  meta: SnapshotMeta;
  results: NormalizedResult[];
  languageStats: LanguageStats[];
  rawData?: Record<string, unknown>;
}

export interface SnapshotComparison {
  added: NormalizedResult[];
  removed: NormalizedResult[];
  changed: Array<{
    before: NormalizedResult;
    after: NormalizedResult;
    changes: string[];
  }>;
  unchanged: number;
  summary: {
    totalBefore: number;
    totalAfter: number;
    netChange: number;
    newCritical: number;
    resolvedCritical: number;
  };
}

export interface StorageConfig {
  storageType: 'memory' | 'file' | 'database';
  storagePath?: string;
  maxSnapshots?: number;
  compressResults?: boolean;
}

// ============================================================================
// 스냅샷 저장소 인터페이스
// ============================================================================

export interface ISnapshotStorage {
  save(snapshot: SnapshotData): Promise<string>;
  load(snapshotId: string): Promise<SnapshotData | null>;
  list(projectId: string, limit?: number): Promise<SnapshotMeta[]>;
  delete(snapshotId: string): Promise<boolean>;
  compare(snapshotIdA: string, snapshotIdB: string): Promise<SnapshotComparison>;
}

// ============================================================================
// 메모리 저장소 (기본)
// ============================================================================

export class MemorySnapshotStorage implements ISnapshotStorage {
  private snapshots: Map<string, SnapshotData> = new Map();
  private maxSnapshots: number;

  constructor(config?: Partial<StorageConfig>) {
    this.maxSnapshots = config?.maxSnapshots || 100;
  }

  async save(snapshot: SnapshotData): Promise<string> {
    const id = snapshot.meta.id;
    
    // 체크섬 계산
    snapshot.meta.checksum = this.computeChecksum(snapshot);
    
    this.snapshots.set(id, snapshot);
    
    // 최대 개수 초과 시 오래된 것 삭제
    if (this.snapshots.size > this.maxSnapshots) {
      const oldest = this.getOldestSnapshot();
      if (oldest) {
        this.snapshots.delete(oldest.meta.id);
      }
    }

    return id;
  }

  async load(snapshotId: string): Promise<SnapshotData | null> {
    return this.snapshots.get(snapshotId) || null;
  }

  async list(projectId: string, limit = 10): Promise<SnapshotMeta[]> {
    const projectSnapshots = Array.from(this.snapshots.values())
      .filter(s => s.meta.projectId === projectId)
      .sort((a, b) => b.meta.createdAt.getTime() - a.meta.createdAt.getTime())
      .slice(0, limit)
      .map(s => s.meta);

    return projectSnapshots;
  }

  async delete(snapshotId: string): Promise<boolean> {
    return this.snapshots.delete(snapshotId);
  }

  async compare(snapshotIdA: string, snapshotIdB: string): Promise<SnapshotComparison> {
    const snapshotA = await this.load(snapshotIdA);
    const snapshotB = await this.load(snapshotIdB);

    if (!snapshotA || !snapshotB) {
      throw new Error('Snapshot not found');
    }

    return this.compareSnapshots(snapshotA, snapshotB);
  }

  private computeChecksum(snapshot: SnapshotData): string {
    const content = JSON.stringify({
      results: snapshot.results.map(r => ({
        filePath: r.filePath,
        lineStart: r.lineStart,
        ruleId: r.ruleId,
        severity: r.severity,
        message: r.message,
      })),
      config: snapshot.meta.config,
      commitHash: snapshot.meta.commitHash,
    });

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private getOldestSnapshot(): SnapshotData | null {
    let oldest: SnapshotData | null = null;
    
    for (const snapshot of this.snapshots.values()) {
      if (!oldest || snapshot.meta.createdAt < oldest.meta.createdAt) {
        oldest = snapshot;
      }
    }

    return oldest;
  }

  private compareSnapshots(a: SnapshotData, b: SnapshotData): SnapshotComparison {
    const added: NormalizedResult[] = [];
    const removed: NormalizedResult[] = [];
    const changed: SnapshotComparison['changed'] = [];
    let unchanged = 0;

    // 결과 ID 맵
    const mapA = new Map(a.results.map(r => [this.getResultKey(r), r]));
    const mapB = new Map(b.results.map(r => [this.getResultKey(r), r]));

    // A에 있고 B에 없는 것 (제거됨)
    for (const [key, result] of mapA) {
      if (!mapB.has(key)) {
        removed.push(result);
      }
    }

    // B에서 비교
    for (const [key, resultB] of mapB) {
      const resultA = mapA.get(key);
      
      if (!resultA) {
        // 새로 추가됨
        added.push(resultB);
      } else {
        // 변경 확인
        const changes = this.detectChanges(resultA, resultB);
        if (changes.length > 0) {
          changed.push({ before: resultA, after: resultB, changes });
        } else {
          unchanged++;
        }
      }
    }

    return {
      added,
      removed,
      changed,
      unchanged,
      summary: {
        totalBefore: a.results.length,
        totalAfter: b.results.length,
        netChange: b.results.length - a.results.length,
        newCritical: added.filter(r => r.severity === 'CRITICAL').length,
        resolvedCritical: removed.filter(r => r.severity === 'CRITICAL').length,
      },
    };
  }

  private getResultKey(result: NormalizedResult): string {
    return `${result.filePath}:${result.lineStart}:${result.ruleId}`;
  }

  private detectChanges(a: NormalizedResult, b: NormalizedResult): string[] {
    const changes: string[] = [];

    if (a.severity !== b.severity) changes.push('severity');
    if (a.message !== b.message) changes.push('message');
    if (a.suggestion !== b.suggestion) changes.push('suggestion');
    if (a.aiExplanation !== b.aiExplanation) changes.push('aiExplanation');
    if (a.lineEnd !== b.lineEnd) changes.push('lineEnd');

    return changes;
  }
}

// ============================================================================
// 스냅샷 빌더
// ============================================================================

export class SnapshotBuilder {
  private storage: ISnapshotStorage;

  constructor(storage?: ISnapshotStorage) {
    this.storage = storage || new MemorySnapshotStorage();
  }

  /**
   * 새 스냅샷 생성
   */
  async create(params: {
    projectId: string;
    executeId: string;
    commitHash: string;
    branch: string;
    tag?: string;
    config: PipelineConfig;
    results: NormalizedResult[];
    languageStats: LanguageStats[];
    summary: PipelineSummary;
  }): Promise<SnapshotMeta> {
    const id = this.generateId();
    
    const meta: SnapshotMeta = {
      id,
      projectId: params.projectId,
      executeId: params.executeId,
      createdAt: new Date(),
      commitHash: params.commitHash,
      branch: params.branch,
      tag: params.tag,
      pipelineVersion: '1.0.0',
      ruleVersion: '1.0.0',
      aiModel: params.config.enableAI ? 'gemini-2.0-flash' : undefined,
      config: params.config,
      summary: params.summary,
      checksum: '', // 저장 시 계산
    };

    const snapshot: SnapshotData = {
      meta,
      results: params.results,
      languageStats: params.languageStats,
    };

    await this.storage.save(snapshot);
    
    return meta;
  }

  /**
   * 스냅샷 로드
   */
  async load(snapshotId: string): Promise<SnapshotData | null> {
    return this.storage.load(snapshotId);
  }

  /**
   * 프로젝트별 스냅샷 목록
   */
  async list(projectId: string, limit?: number): Promise<SnapshotMeta[]> {
    return this.storage.list(projectId, limit);
  }

  /**
   * 두 스냅샷 비교
   */
  async compare(snapshotIdA: string, snapshotIdB: string): Promise<SnapshotComparison> {
    return this.storage.compare(snapshotIdA, snapshotIdB);
  }

  /**
   * 스냅샷 검증 (무결성)
   */
  async verify(snapshotId: string): Promise<boolean> {
    const snapshot = await this.storage.load(snapshotId);
    if (!snapshot) return false;

    const currentChecksum = this.computeChecksum(snapshot);
    return currentChecksum === snapshot.meta.checksum;
  }

  /**
   * 스냅샷 재현 (동일 설정으로 분석 재실행 준비)
   */
  async prepareReproduction(snapshotId: string): Promise<{
    commitHash: string;
    config: PipelineConfig;
    ruleVersion: string;
  } | null> {
    const snapshot = await this.storage.load(snapshotId);
    if (!snapshot) return null;

    return {
      commitHash: snapshot.meta.commitHash,
      config: snapshot.meta.config,
      ruleVersion: snapshot.meta.ruleVersion,
    };
  }

  private generateId(): string {
    return `snap_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private computeChecksum(snapshot: SnapshotData): string {
    const content = JSON.stringify({
      results: snapshot.results.length,
      config: snapshot.meta.config,
      commitHash: snapshot.meta.commitHash,
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// ============================================================================
// 모듈 인덱스
// ============================================================================

export * from './result-merger';
