'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { aiModelService } from '@/lib/ai-model-service';

/**
 * POST /api/admin/prompts/test
 * 프롬프트를 실제 AI로 테스트
 */
export async function POST(request: NextRequest) {
  try {
    const { promptKey, sampleVariables } = await request.json();
    
    if (!promptKey) {
      return NextResponse.json({ error: 'promptKey is required' }, { status: 400 });
    }
    
    // Get prompt from DB
    const prompt = await prisma.aiPrompt.findUnique({
      where: { key: promptKey }
    });
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    
    // Parse variables
    const variables = prompt.variables ? JSON.parse(prompt.variables) : [];
    
    // Build user prompt with sample data
    let userPrompt = prompt.userPromptTemplate || '';
    const usedVariables: Record<string, string> = {};
    
    for (const varName of variables) {
      const sampleValue = sampleVariables?.[varName] || `[샘플 ${varName}]`;
      userPrompt = userPrompt.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), sampleValue);
      usedVariables[varName] = sampleValue;
    }
    
    // Get default model
    const model = await aiModelService.getDefaultModel();
    if (!model) {
      return NextResponse.json({ 
        success: false,
        error: 'No default AI model configured',
        details: 'AI 모델이 설정되지 않았습니다. AI 모델 페이지에서 기본 모델을 설정해주세요.'
      }, { status: 400 });
    }
    
    // Call AI
    const startTime = Date.now();
    let aiResponse: string;
    
    try {
      aiResponse = await aiModelService.chatCompletion({
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: userPrompt.slice(0, 1000) + (userPrompt.length > 1000 ? '...[truncated for test]' : '') }
        ],
        maxTokens: 12800  // Increased for more complete responses
      });
    } catch (aiError: any) {
      return NextResponse.json({
        success: false,
        error: 'AI 호출 실패',
        details: aiError.message || 'AI 모델에 연결할 수 없습니다.',
        model: model.name,
        provider: model.provider
      });
    }
    
    const duration = Date.now() - startTime;
    
    // Validate response format
    const validations: { check: string; passed: boolean; message: string }[] = [];
    
    // Check if response exists
    const hasResponse = !!aiResponse && aiResponse.length > 0;
    validations.push({
      check: '응답 생성',
      passed: hasResponse,
      message: hasResponse ? `${aiResponse.length}자 응답 생성됨` : '응답이 비어있습니다'
    });
    
    // Check JSON format if expected
    const expectsJson = prompt.userPromptTemplate?.includes('JSON') || 
                       prompt.userPromptTemplate?.includes('json') ||
                       prompt.systemPrompt.includes('JSON');
    
    if (expectsJson) {
      try {
        // Try to find JSON in response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          JSON.parse(jsonMatch[0]);
          validations.push({
            check: 'JSON 형식',
            passed: true,
            message: 'Valid JSON 구조 확인됨'
          });
        } else {
          validations.push({
            check: 'JSON 형식',
            passed: false,
            message: 'JSON 구조를 찾을 수 없습니다'
          });
        }
      } catch {
        validations.push({
          check: 'JSON 형식',
          passed: false,
          message: 'JSON 파싱 실패'
        });
      }
    }
    
    // Check for expected fields
    if (expectsJson && prompt.userPromptTemplate?.includes('"issues"')) {
      const hasIssues = aiResponse.includes('"issues"') || aiResponse.includes("'issues'");
      validations.push({
        check: 'issues 필드',
        passed: hasIssues,
        message: hasIssues ? 'issues 필드 포함됨' : 'issues 필드 누락'
      });
    }
    
    if (expectsJson && prompt.userPromptTemplate?.includes('"summary"')) {
      const hasSummary = aiResponse.includes('"summary"') || aiResponse.includes("'summary'");
      validations.push({
        check: 'summary 필드',
        passed: hasSummary,
        message: hasSummary ? 'summary 필드 포함됨' : 'summary 필드 누락'
      });
    }
    
    // Overall success
    const allPassed = validations.every(v => v.passed);
    
    return NextResponse.json({
      success: allPassed,
      model: {
        name: model.name,
        provider: model.provider
      },
      duration: `${duration}ms`,
      validations,
      response: aiResponse.slice(0, 500) + (aiResponse.length > 500 ? '...' : ''),
      usedVariables
    });
    
  } catch (error: any) {
    console.error('[API] Prompt test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}
