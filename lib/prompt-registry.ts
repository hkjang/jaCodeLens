/**
 * AI Prompt Registry - 중앙 집중식 프롬프트 관리
 * 
 * 모든 AI 프롬프트를 DB에서 조회하고 캐싱합니다.
 * 변수 치환 기능을 제공합니다.
 */

import prisma from '@/lib/db';

export interface PromptTemplate {
  key: string;
  name: string;
  category: string;
  systemPrompt: string;
  userPromptTemplate: string | null;
  variables: string[];
  version: number;
}

// 기본 프롬프트 (DB에 없을 경우 폴백)
const DEFAULT_PROMPTS: Record<string, Omit<PromptTemplate, 'version'>> = {
  'ai-judge.synthesis': {
    key: 'ai-judge.synthesis',
    name: '분석 결과 합성',
    category: 'JUDGE',
    systemPrompt: 'You are a senior code review expert. Analyze code analysis results and provide a concise executive summary and prioritized action items. Always respond in JSON format with "summary" and "recommendations" fields.',
    userPromptTemplate: `Analyze the following code analysis results and provide:
1. A 2-3 sentence executive summary
2. Top 5 prioritized action items

Analysis Results:
{{results}}

Category Scores:
{{scores}}

Respond in JSON format:
{
  "summary": "...",
  "recommendations": ["item1", "item2", ...]
}`,
    variables: ['results', 'scores']
  },
  'analyzer.project-audit': {
    key: 'analyzer.project-audit',
    name: '프로젝트 분석',
    category: 'ANALYSIS',
    systemPrompt: 'You are an expert code auditor and Senior Software Architect.',
    userPromptTemplate: `Analyze the following project summary and provide a comprehensive audit report.

## Project Structure
{{fileList}}
(and more...)

## Dependencies
{{dependencies}}

## Static Analysis Summary
{{issuesSummary}}

## Key Complex Files (Excerpt)
{{fileContents}}

## Instructions
Provide a report in Markdown format with the following sections:
1. **Executive Summary**: Overall health and risk assessment.
2. **Architecture Review**: Comments on structure and dependencies.
3. **Code Quality**: Feedback on complexity and maintainability.
4. **Security Risks**: Highlight any observed risks.
5. **Recommendations**: Prioritized list of improvements.

Be concise and professional.`,
    variables: ['fileList', 'dependencies', 'issuesSummary', 'fileContents']
  },
  'agent.structure': {
    key: 'agent.structure',
    name: '구조 분석 에이전트',
    category: 'AGENT',
    systemPrompt: 'You are a software architecture expert. Analyze project structure, directory organization, and file patterns to identify architectural issues and improvement opportunities.',
    userPromptTemplate: `Analyze the following project structure:

{{structure}}

Project: {{projectName}}

Identify structural issues like:
- Poor directory organization
- Inconsistent naming conventions
- Missing key files (README, tests, configs)
- Circular dependencies
- Unused or orphaned files

Respond in JSON format:
{
  "issues": [
    {"severity": "...", "type": "STRUCTURE", "path": "...", "description": "...", "suggestion": "..."}
  ]
}`,
    variables: ['structure', 'projectName']
  },
  'agent.security': {
    key: 'agent.security',
    name: '보안 분석 에이전트',
    category: 'AGENT',
    systemPrompt: 'You are a security expert specializing in code vulnerability detection. Analyze code for security issues including SQL injection, XSS, authentication flaws, and sensitive data exposure.',
    userPromptTemplate: `Analyze the following code for security vulnerabilities:

{{code}}

File: {{filePath}}

Identify any security issues and rate their severity (CRITICAL, HIGH, MEDIUM, LOW).
Respond in JSON format:
{
  "issues": [
    {"severity": "...", "type": "SECURITY", "line": ..., "description": "...", "suggestion": "..."}
  ]
}`,
    variables: ['code', 'filePath']
  },
  'agent.quality': {
    key: 'agent.quality',
    name: '코드 품질 에이전트',
    category: 'AGENT',
    systemPrompt: 'You are a code quality expert. Analyze code for maintainability, complexity, code smells, and best practices violations.',
    userPromptTemplate: `Analyze the following code for quality issues:

{{code}}

File: {{filePath}}

Identify quality issues like high complexity, code smells, poor naming, and violations of best practices.
Respond in JSON format:
{
  "issues": [
    {"severity": "...", "type": "QUALITY", "line": ..., "description": "...", "suggestion": "..."}
  ]
}`,
    variables: ['code', 'filePath']
  },
  'agent.dependency': {
    key: 'agent.dependency',
    name: '의존성 분석 에이전트',
    category: 'AGENT',
    systemPrompt: 'You are a dependency management expert. Analyze project dependencies for security vulnerabilities, outdated packages, license issues, and bloat.',
    userPromptTemplate: `Analyze the following dependencies:

{{dependencies}}

Package manager: {{packageManager}}

Identify issues like:
- Outdated packages with security vulnerabilities
- License incompatibilities
- Unused dependencies
- Duplicate or conflicting versions
- Missing peer dependencies

Respond in JSON format:
{
  "issues": [
    {"severity": "...", "type": "DEPENDENCY", "package": "...", "description": "...", "suggestion": "..."}
  ]
}`,
    variables: ['dependencies', 'packageManager']
  },
  'agent.style': {
    key: 'agent.style',
    name: '스타일 검사 에이전트',
    category: 'AGENT',
    systemPrompt: 'You are a coding style expert. Analyze code for style consistency, formatting issues, and adherence to style guides.',
    userPromptTemplate: `Analyze the following code for style issues:

{{code}}

File: {{filePath}}

Identify style issues like:
- Inconsistent indentation or formatting
- Naming convention violations
- Missing or inconsistent comments
- Long lines or complex expressions
- Magic numbers or strings

Respond in JSON format:
{
  "issues": [
    {"severity": "...", "type": "STYLE", "line": ..., "description": "...", "suggestion": "..."}
  ]
}`,
    variables: ['code', 'filePath']
  },
  'agent.test': {
    key: 'agent.test',
    name: '테스트 분석 에이전트',
    category: 'AGENT',
    systemPrompt: 'You are a testing expert. Analyze test coverage, test quality, and identify missing or inadequate tests.',
    userPromptTemplate: `Analyze the following test file:

{{code}}

Testing: {{filePath}}

Identify issues like:
- Missing edge case tests
- Insufficient assertions
- Flaky or non-deterministic tests
- Missing error handling tests
- Poor test naming or organization

Respond in JSON format:
{
  "issues": [
    {"severity": "...", "type": "TEST", "line": ..., "description": "...", "suggestion": "..."}
  ]
}`,
    variables: ['code', 'filePath']
  }
};

class PromptRegistry {
  private cache: Map<string, PromptTemplate> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheTime: number = 0;

  /**
   * 프롬프트 조회 (DB 우선, 폴백으로 기본값)
   */
  async get(key: string): Promise<PromptTemplate> {
    // 캐시 확인
    if (this.isCacheValid() && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // DB에서 조회
    try {
      const prompt = await prisma.aiPrompt.findUnique({
        where: { key, isActive: true }
      });

      if (prompt) {
        const template: PromptTemplate = {
          key: prompt.key,
          name: prompt.name,
          category: prompt.category,
          systemPrompt: prompt.systemPrompt,
          userPromptTemplate: prompt.userPromptTemplate,
          variables: prompt.variables ? JSON.parse(prompt.variables) : [],
          version: prompt.version
        };
        this.cache.set(key, template);
        return template;
      }
    } catch (error) {
      console.warn(`[PromptRegistry] DB lookup failed for ${key}:`, error);
    }

    // 폴백: 기본 프롬프트
    const defaultPrompt = DEFAULT_PROMPTS[key];
    if (defaultPrompt) {
      return { ...defaultPrompt, version: 0 };
    }

    throw new Error(`Prompt not found: ${key}`);
  }

  /**
   * 모든 프롬프트 조회
   */
  async getAll(): Promise<PromptTemplate[]> {
    try {
      const prompts = await prisma.aiPrompt.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }]
      });

      return prompts.map(p => ({
        key: p.key,
        name: p.name,
        category: p.category,
        systemPrompt: p.systemPrompt,
        userPromptTemplate: p.userPromptTemplate,
        variables: p.variables ? JSON.parse(p.variables) : [],
        version: p.version
      }));
    } catch (error) {
      console.warn('[PromptRegistry] DB lookup failed, returning defaults');
      return Object.values(DEFAULT_PROMPTS).map(p => ({ ...p, version: 0 }));
    }
  }

  /**
   * 변수 치환하여 프롬프트 생성
   */
  async render(key: string, variables: Record<string, string>): Promise<{ system: string; user: string }> {
    const template = await this.get(key);
    
    let userPrompt = template.userPromptTemplate || '';
    
    // 변수 치환 {{variable}}
    for (const [varName, value] of Object.entries(variables)) {
      userPrompt = userPrompt.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
    }

    return {
      system: template.systemPrompt,
      user: userPrompt
    };
  }

  /**
   * 캐시 유효성 확인
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheTime < this.cacheExpiry;
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
    this.lastCacheTime = 0;
  }

  /**
   * 기본 프롬프트 목록 반환 (시드용)
   */
  getDefaultPrompts(): typeof DEFAULT_PROMPTS {
    return DEFAULT_PROMPTS;
  }
}

// 싱글톤 인스턴스
export const promptRegistry = new PromptRegistry();
