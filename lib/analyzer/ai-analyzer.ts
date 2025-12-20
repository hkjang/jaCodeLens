import { ProjectContext } from '../collector/types'
import { StaticAnalysisResult } from './types'
import { aiClient, DEFAULT_MODEL } from '../ai/client'

export async function analyzeProjectWithAI(
  context: ProjectContext, 
  staticResult: StaticAnalysisResult
): Promise<string> {
  
  // 1. Prepare Context
  const fileList = context.files.map(f => `- ${f.path} (${f.size} bytes)`).slice(0, 50).join('\n')
  const dependencies = JSON.stringify(staticResult.dependencies, null, 2)
  const issuesSummary = JSON.stringify(staticResult.summary, null, 2)
  
  // Pick top 3 complex files to include content
  const topComplexFiles = [...staticResult.metrics]
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 3)
    
  let fileContents = ''
  for (const metric of topComplexFiles) {
    const file = context.files.find(f => f.path === metric.file)
    if (file && file.content) {
      fileContents += `\n\n--- FILE: ${file.path} ---\n${file.content.slice(0, 2000)}\n--- END FILE ---\n`
    }
  }

  const prompt = `
You are a Senior Software Architect and Code Auditor.
Analyze the following project summary and provide a comprehensive audit report.

## Project Structure
${fileList}
(and more...)

## Dependencies
${dependencies}

## Static Analysis Summary
${issuesSummary}

## Key Complex Files (Excerpt)
${fileContents}

## Instructions
Provide a report in Markdown format with the following sections:
1. **Executive Summary**: Overall health and risk assessment.
2. **Architecture Review**: Comments on structure and dependencies.
3. **Code Quality**: Feedback on complexity and maintainability based on the provided files.
4. **Security Risks**: Highlight any observed risks (from static analysis or general patterns).
5. **Recommendations**: Prioritized list of improvements.

Be concise and professional.
`

  try {
    const response = await aiClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert code auditor.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })

    return response.choices[0]?.message?.content || 'No analysis generated.'
  } catch (error) {
    console.error('AI Analysis failed:', error)
    return `AI Analysis Failed: ${(error as Error).message}`
  }
}
