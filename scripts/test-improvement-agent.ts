import { ImprovementAgent } from '../lib/analyzer/agents/improvement-agent'
import { AnalysisResult } from '@prisma/client'

async function runTest() {
  console.log('Testing Improvement Agent Logic...')

  // Mock Previous Results
  const mockContext = {
    projectContext: { files: [], path: '', ignoredFiles: [], totalSize: 0, languageEstimates: {} },
    config: {},
    previousResults: [
        { 
            category: 'SECURITY', severity: 'CRITICAL', message: 'Secret Exposed: AWS Access Key', confidenceScore: 1.0, 
            id: '1', executeId: '1', filePath: 'src/config.ts', lineNumber: 10, suggestion: '', reasoning: '', createdAt: new Date()
        },
        { 
            category: 'ARCHITECTURE', severity: 'HIGH', message: 'Circular Dependency detected: A -> B -> A', confidenceScore: 1.0, 
            id: '3', executeId: '1', filePath: 'src/file.ts', lineNumber: 5, suggestion: '', reasoning: '', createdAt: new Date()
        }
    ] as AnalysisResult[]
  }

  const agent = new ImprovementAgent()
  const result = await agent.analyze(mockContext)

  console.log('--- Results ---')
  result.results.forEach(r => {
    console.log(`[${r.severity}] ${r.message}`)
    console.log(`   Suggestion: \n${r.suggestion}`)
  })
  
  const fixes = result.results.length

  console.log('--- Verification ---')
  if (fixes === 2) {
     console.log('✅ Generated 2 Improvement Plans')
  } else {
     console.error(`❌ Expected 2 fixes, got ${fixes}`)
  }
}

runTest()
