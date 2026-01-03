/**
 * 분석 서비스 싱글톤
 * 
 * API에서 사용하는 글로벌 서비스 인스턴스들
 */

import { AgentScheduler } from '@/lib/pipeline/agents/scheduler';
import { SnapshotBuilder, MemorySnapshotStorage } from '@/lib/pipeline/merger/snapshot-storage';
import { RuleEngine, defaultRules } from '@/lib/pipeline/static/rule-engine';

// ============================================================================
// 에이전트 스케줄러
// ============================================================================

let globalScheduler: AgentScheduler | null = null;

export function getScheduler(): AgentScheduler {
  if (!globalScheduler) {
    globalScheduler = new AgentScheduler({
      maxConcurrency: 4,
      maxRetries: 3,
      retryBaseDelayMs: 1000,
      taskTimeoutMs: 60000,
    });
  }
  return globalScheduler;
}

// ============================================================================
// 스냅샷 빌더
// ============================================================================

let globalSnapshotBuilder: SnapshotBuilder | null = null;

export function getSnapshotBuilder(): SnapshotBuilder {
  if (!globalSnapshotBuilder) {
    globalSnapshotBuilder = new SnapshotBuilder(
      new MemorySnapshotStorage({ maxSnapshots: 100 })
    );
  }
  return globalSnapshotBuilder;
}

// ============================================================================
// 룰 엔진
// ============================================================================

let globalRuleEngine: RuleEngine | null = null;

export function getRuleEngine(): RuleEngine {
  if (!globalRuleEngine) {
    globalRuleEngine = new RuleEngine();
    // 기본 룰 로드
    for (const rule of defaultRules) {
      globalRuleEngine.register(rule);
    }
  }
  return globalRuleEngine;
}
