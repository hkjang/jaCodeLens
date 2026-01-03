/**
 * AST 캐싱 시스템
 * 
 * 파일 해시 기반 AST 캐시를 관리합니다.
 */

import { ASTFile } from '../types';
import * as crypto from 'crypto';

interface CacheEntry {
  astFile: ASTFile;
  fileHash: string;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export class ASTCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private hitCount = 0;
  private missCount = 0;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  /**
   * 파일 콘텐츠 해시 생성
   */
  static computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * 캐시에서 AST 조회
   */
  get(filePath: string, contentHash: string): ASTFile | null {
    const entry = this.cache.get(filePath);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // 해시 불일치 = 파일 변경됨
    if (entry.fileHash !== contentHash) {
      this.cache.delete(filePath);
      this.missCount++;
      return null;
    }

    // 캐시 히트
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.hitCount++;
    
    return entry.astFile;
  }

  /**
   * AST를 캐시에 저장
   */
  set(filePath: string, contentHash: string, astFile: ASTFile): void {
    // 용량 초과 시 LRU 정리
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(filePath, {
      astFile,
      fileHash: contentHash,
      createdAt: new Date(),
      accessCount: 1,
      lastAccessed: new Date()
    });
  }

  /**
   * 특정 파일 캐시 삭제
   */
  invalidate(filePath: string): boolean {
    return this.cache.delete(filePath);
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * LRU (Least Recently Used) 정책으로 오래된 항목 삭제
   */
  private evictLRU(): void {
    let oldest: { key: string; time: Date } | null = null;
    
    for (const [key, entry] of this.cache) {
      if (!oldest || entry.lastAccessed < oldest.time) {
        oldest = { key, time: entry.lastAccessed };
      }
    }
    
    if (oldest) {
      this.cache.delete(oldest.key);
    }
  }

  /**
   * 캐시 통계
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0
    };
  }

  /**
   * 캐시된 파일 목록
   */
  getCachedFiles(): string[] {
    return Array.from(this.cache.keys());
  }
}
