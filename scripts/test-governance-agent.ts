import { GovernanceAgent } from '../lib/analyzer/agents/governance-agent'
import { AnalysisResult } from '@prisma/client'

async function runTest() {
  console.log('Testing Governance Agent Logic...')

  // Mock Previous Results (Scenario: Fail)
  const failContext = {
    projectContext: { files: [], path: '', ignoredFiles: [], totalSize: 0, languageEstimates: {} },
    config: {},
    previousResults: [
        { category: 'SECURITY', severity: 'CRITICAL', message: 'Secret Exposed' }
    ] as AnalysisResult[]
  }

   // Mock Previous Results (Scenario: Pass)
   const passContext = {
    projectContext: { files: [], path: '', ignoredFiles: [], totalSize: 0, languageEstimates: {} },
    config: {},
    previousResults: [
        { category: 'STYLE', severity: 'LOW', message: 'Casing' }
    ] as AnalysisResult[]
  }

  const agent = new GovernanceAgent()
  
  console.log('--- Test Fail Scenario ---')
  const failResult = await agent.analyze(failContext)
  failResult.results.forEach(r => console.log(`[${r.severity}] ${r.message} (${r.reasoning})`))
  
  console.log('--- Test Pass Scenario ---')
  const passResult = await agent.analyze(passContext)
  passResult.results.forEach(r => console.log(`[${r.severity}] ${r.message} (${r.reasoning})`))

  console.log('--- Verification ---')
  
  if ((failResult.metadata as any).passedGovernance === false) {
     console.log('✅ Governance correctly FAILED for Critical issue')
  } else {
     console.error('❌ Governance PASSED despite Critical issue')
  }

  if ((passResult.metadata as any).passedGovernance === true) {
     console.log('✅ Governance correctly PASSED for Low issue')
  } else {
     console.error('❌ Governance FAILED for Low issue')
  }
}

runTest()
