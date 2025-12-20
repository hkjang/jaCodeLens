import { ReviewerAgent } from '../lib/analyzer/agents/reviewer-agent'
import { AnalysisResult } from '@prisma/client'

async function runTest() {
  console.log('Testing Reviewer Agent Logic...')

  // Mock Previous Results
  const mockContext = {
    projectContext: { files: [], path: '', ignoredFiles: [], totalSize: 0, languageEstimates: {} },
    config: {},
    previousResults: [
        { 
            category: 'SECURITY', severity: 'CRITICAL', message: 'AWS Key Exposed', confidenceScore: 1.0, 
            id: '1', executeId: '1', filePath: 'src/config.ts', lineNumber: 10, suggestion: '', reasoning: '', createdAt: new Date()
        },
        { 
            category: 'SECURITY', severity: 'CRITICAL', message: 'AWS Secret Exposed', confidenceScore: 1.0, 
            id: '2', executeId: '1', filePath: 'src/config.ts', lineNumber: 11, suggestion: '', reasoning: '', createdAt: new Date()
        },
        { 
            category: 'ARCHITECTURE', severity: 'MEDIUM', message: 'Bad Layering', confidenceScore: 0.8, 
            id: '3', executeId: '1', filePath: 'src/file.ts', lineNumber: 5, suggestion: '', reasoning: '', createdAt: new Date()
        }
    ] as AnalysisResult[]
  }

  const agent = new ReviewerAgent()
  const result = await agent.analyze(mockContext)

  console.log('--- Results ---')
  result.results.forEach(r => {
    console.log(`[${r.severity}] ${r.message}`)
    console.log(`   Reasoning: ${r.reasoning}`)
  })
  
  const summaryResult = result.results.find(r => r.category === 'SUMMARY')

  console.log('--- Verification ---')
  if (summaryResult && summaryResult.reasoning?.includes('Blocking vulnerabilities')) {
     console.log('✅ Reviewer correctly identified Security Gate failure')
  } else {
     console.error('❌ Reviewer failed to synthesize Security check')
  }
}

runTest()
