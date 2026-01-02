import { ProjectContext } from '../collector/types'
import { StaticAnalysisResult } from './types'
import { aiModelService } from '../ai-model-service'
import { promptRegistry } from '../prompt-registry'

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

  try {
    // 프롬프트 레지스트리에서 프롬프트 조회 및 렌더링
    const { system, user } = await promptRegistry.render('analyzer.project-audit', {
      fileList,
      dependencies,
      issuesSummary,
      fileContents
    })

    const response = await aiModelService.chatCompletion({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.2
    })

    return response || 'No analysis generated.'
  } catch (error) {
    console.error('AI Analysis failed:', error)
    return `AI Analysis Failed: ${(error as Error).message}`
  }
}

