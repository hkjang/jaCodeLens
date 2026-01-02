/**
 * CodeElementService - 코드 요소 관리 및 AI 분석 연동
 */

import { prisma } from '@/lib/db';
import { aiModelService, ChatMessage } from '@/lib/ai-model-service';

export interface ElementAnalysisResult {
  summary: string;      // 한글 요약
  purpose: string;      // 목적/역할
  complexity: string;   // 복잡도 (LOW, MEDIUM, HIGH)
  issues: Array<{
    type: string;
    severity: string;
    description: string;
    suggestion: string;
  }>;
  suggestions: string[];
}

class CodeElementServiceImpl {
  /**
   * 프로젝트의 모든 요소 조회
   */
  async getElementsByProject(projectId: string, options?: {
    elementType?: string;
    analyzed?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { projectId };
    
    if (options?.elementType) {
      where.elementType = options.elementType;
    }
    
    if (options?.analyzed !== undefined) {
      where.analyzedAt = options.analyzed ? { not: null } : null;
    }

    return prisma.codeElement.findMany({
      where,
      take: options?.limit || 100,
      skip: options?.offset || 0,
      orderBy: [
        { elementType: 'asc' },
        { fileName: 'asc' },
        { lineStart: 'asc' }
      ]
    });
  }

  /**
   * 파일별 요소 조회
   */
  async getElementsByFile(projectId: string, filePath: string) {
    return prisma.codeElement.findMany({
      where: { projectId, filePath },
      orderBy: { lineStart: 'asc' }
    });
  }

  /**
   * 분석 대기 요소 조회
   */
  async getPendingElements(projectId: string, limit = 10) {
    return prisma.codeElement.findMany({
      where: { 
        projectId, 
        analyzedAt: null,
        // 주요 요소만 (작은 변수 제외)
        elementType: { in: ['CLASS', 'FUNCTION', 'METHOD', 'COMPONENT', 'INTERFACE'] }
      },
      take: limit,
      orderBy: [
        // 클래스, 컴포넌트 우선
        { elementType: 'asc' },
        { lineEnd: 'desc' } // 큰 요소 우선
      ]
    });
  }

  /**
   * 단일 요소 AI 분석
   */
  async analyzeElement(elementId: string): Promise<ElementAnalysisResult | null> {
    const element = await prisma.codeElement.findUnique({ where: { id: elementId } });
    if (!element) return null;

    console.log(`   🔍 Analyzing: ${element.elementType} ${element.name}`);

    const systemPrompt = `You are a code analyst. Analyze the following ${element.language} code and provide:
1. A concise Korean summary (1-2 sentences)
2. The purpose/role of this code
3. Complexity assessment (LOW, MEDIUM, HIGH)
4. Any issues or improvements

Respond in JSON format:
{
  "summary": "한글 요약",
  "purpose": "목적/역할",
  "complexity": "LOW|MEDIUM|HIGH",
  "issues": [{"type": "...", "severity": "HIGH|MEDIUM|LOW", "description": "...", "suggestion": "..."}],
  "suggestions": ["개선 제안1", "개선 제안2"]
}

Respond only in Korean.`;

    const userPrompt = `${element.elementType}: ${element.name}
File: ${element.filePath}
${element.signature ? `Signature: ${element.signature}` : ''}
${element.parentName ? `Parent: ${element.parentName}` : ''}

Code:
\`\`\`${element.language.toLowerCase()}
${element.content}
\`\`\``;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await aiModelService.chatCompletion({ messages });
      
      // Parse JSON
      let result: ElementAnalysisResult;
      try {
        let jsonStr = response;
        if (jsonStr.includes('```json')) {
          jsonStr = jsonStr.split('```json')[1].split('```')[0];
        } else if (jsonStr.includes('```')) {
          jsonStr = jsonStr.split('```')[1].split('```')[0];
        }
        result = JSON.parse(jsonStr.trim());
      } catch (e) {
        result = {
          summary: response.slice(0, 200),
          purpose: '',
          complexity: 'MEDIUM',
          issues: [],
          suggestions: []
        };
      }

      // Save to DB
      await prisma.codeElement.update({
        where: { id: elementId },
        data: {
          aiSummary: result.summary,
          aiAnalysis: JSON.stringify(result),
          analyzedAt: new Date()
        }
      });

      console.log(`   ✅ Analyzed: ${element.name} - ${result.summary.slice(0, 50)}...`);
      return result;

    } catch (e) {
      console.error(`   ❌ Analysis failed for ${element.name}:`, e);
      return null;
    }
  }

  /**
   * 배치 분석 (여러 요소)
   */
  async analyzeElements(projectId: string, limit = 5): Promise<{
    analyzed: number;
    failed: number;
  }> {
    const pending = await this.getPendingElements(projectId, limit);
    
    console.log(`\n🔬 [CodeElementService] Batch analyzing ${pending.length} elements...`);
    
    let analyzed = 0;
    let failed = 0;

    for (const element of pending) {
      const result = await this.analyzeElement(element.id);
      if (result) {
        analyzed++;
      } else {
        failed++;
      }
      
      // Rate limiting - 요청 간 잠시 대기
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`   📊 Batch complete: ${analyzed} analyzed, ${failed} failed`);
    return { analyzed, failed };
  }

  /**
   * 프로젝트 요소 요약 생성
   */
  async generateProjectSummary(projectId: string): Promise<string> {
    const stats = await this.getProjectStats(projectId);
    
    const topElements = await prisma.codeElement.findMany({
      where: { 
        projectId,
        aiSummary: { not: null },
        elementType: { in: ['CLASS', 'COMPONENT'] }
      },
      take: 10,
      orderBy: { lineEnd: 'desc' }
    });

    const summaryParts = topElements.map(e => `- ${e.name}: ${e.aiSummary}`);
    
    return `프로젝트 코드 요약:
총 ${stats.total}개 요소 (${stats.analyzed}개 분석 완료)
- 클래스: ${stats.byType.CLASS || 0}개
- 함수: ${stats.byType.FUNCTION || 0}개
- 메서드: ${stats.byType.METHOD || 0}개
- 컴포넌트: ${stats.byType.COMPONENT || 0}개
- 인터페이스: ${stats.byType.INTERFACE || 0}개

주요 요소:
${summaryParts.join('\n')}`;
  }

  /**
   * 프로젝트 통계
   */
  async getProjectStats(projectId: string) {
    const elements = await prisma.codeElement.groupBy({
      by: ['elementType'],
      where: { projectId },
      _count: { id: true }
    });

    const total = await prisma.codeElement.count({ where: { projectId } });
    const analyzed = await prisma.codeElement.count({ 
      where: { projectId, analyzedAt: { not: null } } 
    });

    return {
      total,
      analyzed,
      pending: total - analyzed,
      byType: Object.fromEntries(elements.map(e => [e.elementType, e._count.id]))
    };
  }

  /**
   * 요소 검색
   */
  async searchElements(projectId: string, query: string, limit = 20) {
    return prisma.codeElement.findMany({
      where: {
        projectId,
        OR: [
          { name: { contains: query } },
          { aiSummary: { contains: query } },
          { signature: { contains: query } }
        ]
      },
      take: limit,
      orderBy: { name: 'asc' }
    });
  }
}

export const codeElementService = new CodeElementServiceImpl();
