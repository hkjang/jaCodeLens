/**
 * AI Client - 설정된 AI 모델을 통해 AI 기능 제공
 * 
 * 이 모듈은 AiModelService를 래핑하여 기존 코드와의 호환성을 유지합니다.
 * 새 코드는 AiModelService를 직접 사용하는 것을 권장합니다.
 */

import { aiModelService, ChatMessage } from '@/lib/ai-model-service';

// Re-export for convenience
export { aiModelService };

/**
 * 기본 모델 이름 가져오기 (DB에서 조회)
 */
export async function getDefaultModelName(): Promise<string> {
  const model = await aiModelService.getDefaultModel();
  return model?.name || 'qwen3:8b';
}

/**
 * AI 연결 확인
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const model = await aiModelService.getDefaultModel();
    if (!model) return false;
    
    // Simple ping test
    if (model.provider === 'Ollama') {
      const endpoint = model.endpoint || 'http://localhost:11434';
      const response = await fetch(`${endpoint}/api/tags`);
      return response.ok;
    }
    
    // For other providers, just check if we have a model configured
    return true;
  } catch (error) {
    console.error('AI Provider connectivity verification failed:', error);
    return false;
  }
}

/**
 * AI 채팅 완성 (간편 함수)
 */
export async function chat(
  systemPrompt: string, 
  userPrompt: string
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  return aiModelService.chatCompletion({ messages });
}

/**
 * AI 단일 프롬프트 완성 (간편 함수)
 */
export async function complete(prompt: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'user', content: prompt }
  ];
  
  return aiModelService.chatCompletion({ messages });
}
