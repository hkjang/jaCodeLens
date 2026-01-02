/**
 * AI Model Service - 설정된 AI 모델을 조회하고 실행하는 서비스
 * Self-Analysis 에이전트가 이 서비스를 통해 Ollama 또는 기타 AI 모델을 사용합니다.
 */

import prisma from '@/lib/db';
import { AiModel } from '@prisma/client';

export interface AiModelConfig {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  apiKey: string | null;
  contextWindow: number;
  maxTokens: number;
  temperature: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export class AiModelService {
  private defaultModel: AiModel | null = null;

  /**
   * 기본 AI 모델 조회 (캐싱)
   */
  async getDefaultModel(): Promise<AiModel | null> {
    if (this.defaultModel) {
      return this.defaultModel;
    }

    const model = await prisma.aiModel.findFirst({
      where: { isDefault: true, isActive: true }
    });

    if (model) {
      this.defaultModel = model;
    }

    return model;
  }

  /**
   * 특정 AI 모델 조회
   */
  async getModel(id: string): Promise<AiModel | null> {
    return prisma.aiModel.findUnique({
      where: { id }
    });
  }

  /**
   * 활성화된 모든 AI 모델 조회
   */
  async getActiveModels(): Promise<AiModel[]> {
    return prisma.aiModel.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' }
    });
  }

  /**
   * AI 모델을 사용하여 채팅 완성 실행
   */
  async chatCompletion(options: ChatCompletionOptions, modelId?: string): Promise<string> {
    const model = modelId 
      ? await this.getModel(modelId) 
      : await this.getDefaultModel();

    if (!model) {
      throw new Error('No active AI model found');
    }

    console.log(`[AiModelService] Using model: ${model.name} (${model.provider})`);

    // 프로바이더별 처리
    switch (model.provider.toLowerCase()) {
      case 'ollama':
        return this.callOllama(model, options);
      case 'openai':
        return this.callOpenAI(model, options);
      default:
        throw new Error(`Unsupported AI provider: ${model.provider}`);
    }
  }

  /**
   * Ollama API 호출
   */
  private async callOllama(model: AiModel, options: ChatCompletionOptions): Promise<string> {
    const endpoint = model.endpoint || 'http://localhost:11434';
    
    console.log(`[AiModelService] Calling Ollama: ${endpoint}/api/chat with model: ${model.name}`);
    
    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.name,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.temperature ?? model.temperature,
          num_predict: options.maxTokens ?? model.maxTokens ?? 8192
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data = await response.json();
    
    console.log(`[AiModelService] Ollama raw response keys:`, Object.keys(data));
    console.log(`[AiModelService] Ollama message object:`, JSON.stringify(data.message, null, 2));
    console.log(`[AiModelService] Ollama message content type:`, typeof data.message?.content);
    console.log(`[AiModelService] Ollama message content length:`, data.message?.content?.length || 0);

    // 사용량 업데이트
    await this.updateUsage(model.id, data.eval_count || 0);

    let content = data.message?.content || '';
    
    // qwen3 thinking mode handling: extract content after </think> tag
    if (content.includes('</think>')) {
      const thinkEndIndex = content.lastIndexOf('</think>');
      content = content.substring(thinkEndIndex + 8).trim();
      console.log(`[AiModelService] Extracted content after </think>: ${content.length} chars`);
    }
    
    console.log(`[AiModelService] Final response length: ${content.length} chars`);
    
    return content;
  }

  /**
   * OpenAI API 호출
   */
  private async callOpenAI(model: AiModel, options: ChatCompletionOptions): Promise<string> {
    const apiKey = model.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const endpoint = model.endpoint || 'https://api.openai.com/v1';
    
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model.name,
        messages: options.messages,
        temperature: options.temperature ?? model.temperature,
        max_tokens: options.maxTokens ?? model.maxTokens ?? 4096
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    
    // 사용량 업데이트
    const totalTokens = data.usage?.total_tokens || 0;
    await this.updateUsage(model.id, totalTokens);

    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 모델 사용량 업데이트
   */
  private async updateUsage(modelId: string, tokens: number): Promise<void> {
    try {
      await prisma.aiModel.update({
        where: { id: modelId },
        data: {
          usageToday: { increment: tokens },
          usageTotal: { increment: tokens }
        }
      });
    } catch (error) {
      console.error('[AiModelService] Failed to update usage:', error);
    }
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.defaultModel = null;
  }
}

// 싱글톤 인스턴스
export const aiModelService = new AiModelService();
