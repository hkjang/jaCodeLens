/**
 * AgentConfigService - 에이전트 설정을 DB에서 로드
 * 
 * Admin UI에서 설정한 에이전트 구성을 Self-Analysis에서 사용합니다.
 */

import prisma from '@/lib/db';
import { promptRegistry } from '@/lib/prompt-registry';

export interface AgentConfigData {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string;
  priority: number;
  isEnabled: boolean;
  timeout: number;
  promptKey: string | null;
  modelId: string | null;
}

class AgentConfigService {
  private configCache: Map<string, AgentConfigData> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // 1 minute

  /**
   * 활성화된 에이전트 목록 조회 (우선순위 정렬)
   */
  async getActiveAgents(): Promise<AgentConfigData[]> {
    await this.refreshCacheIfNeeded();
    
    return Array.from(this.configCache.values())
      .filter(a => a.isEnabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 활성화된 에이전트 이름 목록
   */
  async getActiveAgentNames(): Promise<string[]> {
    const agents = await this.getActiveAgents();
    return agents.map(a => a.name);
  }

  /**
   * 특정 에이전트 설정 조회
   */
  async getAgentConfig(name: string): Promise<AgentConfigData | null> {
    await this.refreshCacheIfNeeded();
    return this.configCache.get(name) || null;
  }

  /**
   * 에이전트의 프롬프트 조회
   */
  async getAgentPrompt(name: string): Promise<{ systemPrompt: string; userPromptTemplate: string | null } | null> {
    const config = await this.getAgentConfig(name);
    if (!config?.promptKey) return null;
    
    try {
      const prompt = await promptRegistry.get(config.promptKey);
      return {
        systemPrompt: prompt.systemPrompt,
        userPromptTemplate: prompt.userPromptTemplate
      };
    } catch (error) {
      console.error(`[AgentConfigService] Failed to get prompt for ${name}:`, error);
      return null;
    }
  }

  /**
   * 캐시 새로고침
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    if (Date.now() < this.cacheExpiry && this.configCache.size > 0) {
      return;
    }

    try {
      const configs = await prisma.agentConfig.findMany({
        orderBy: { priority: 'asc' }
      });

      this.configCache.clear();
      for (const config of configs) {
        this.configCache.set(config.name, {
          id: config.id,
          name: config.name,
          displayName: config.displayName,
          description: config.description,
          category: config.category,
          priority: config.priority,
          isEnabled: config.isEnabled,
          timeout: config.timeout,
          promptKey: config.promptKey,
          modelId: config.modelId
        });
      }

      this.cacheExpiry = Date.now() + this.CACHE_TTL;
      console.log(`[AgentConfigService] Loaded ${configs.length} agent configs`);
    } catch (error) {
      console.error('[AgentConfigService] Failed to load configs:', error);
      // 캐시가 비어있으면 기본값 사용
      if (this.configCache.size === 0) {
        this.loadDefaults();
      }
    }
  }

  /**
   * 기본 에이전트 설정 (DB 연결 실패시 폴백)
   */
  private loadDefaults(): void {
    const defaults: AgentConfigData[] = [
      { id: '', name: 'StructureAnalysisAgent', displayName: '구조 분석', description: null, category: 'ANALYSIS', priority: 1, isEnabled: true, timeout: 120, promptKey: 'agent.structure', modelId: null },
      { id: '', name: 'QualityAnalysisAgent', displayName: '품질 분석', description: null, category: 'QUALITY', priority: 2, isEnabled: true, timeout: 120, promptKey: 'agent.quality', modelId: null },
      { id: '', name: 'SecurityAnalysisAgent', displayName: '보안 분석', description: null, category: 'SECURITY', priority: 3, isEnabled: true, timeout: 120, promptKey: 'agent.security', modelId: null },
      { id: '', name: 'DependencyAnalysisAgent', displayName: '의존성 분석', description: null, category: 'ANALYSIS', priority: 4, isEnabled: true, timeout: 60, promptKey: 'agent.dependency', modelId: null },
      { id: '', name: 'StyleAnalysisAgent', displayName: '스타일 분석', description: null, category: 'QUALITY', priority: 5, isEnabled: true, timeout: 60, promptKey: 'agent.style', modelId: null },
      { id: '', name: 'TestAnalysisAgent', displayName: '테스트 분석', description: null, category: 'QUALITY', priority: 6, isEnabled: true, timeout: 60, promptKey: 'agent.test', modelId: null },
    ];

    for (const config of defaults) {
      this.configCache.set(config.name, config);
    }
    console.log('[AgentConfigService] Using default configs (DB fallback)');
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.configCache.clear();
    this.cacheExpiry = 0;
  }
}

export const agentConfigService = new AgentConfigService();
