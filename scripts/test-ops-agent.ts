import { OpsRiskAgent } from '../lib/analyzer/agents/ops-risk-agent'
import { ProjectContext } from '../lib/collector/types'

async function runTest() {
  console.log('Testing Ops Risk Agent Logic...')

  const mockedContext: ProjectContext = {
    path: '/test/project',
    ignoredFiles: [],
    totalSize: 100,
    languageEstimates: {},
    files: [
      {
        path: 'src/reliable.ts',
        name: 'reliable.ts',
        extension: 'ts',
        size: 100,
        lastModified: new Date(),
        content: `
          const logger = new Logger();
          try {
             await api.call()
          } catch (e) {
             logger.error('Failed', e)
             retry()
          }
        `
      },
      {
        path: 'src/casual.ts',
        name: 'casual.ts',
        extension: 'ts',
        size: 100,
        lastModified: new Date(),
        content: `
          console.log('Just log')
          // No retry here
        `
      },
      {
        path: 'src/risky.ts',
        name: 'risky.ts',
        extension: 'ts',
        size: 100,
        lastModified: new Date(),
        content: `
         // No logging, no retries
         function doSomething() { return 1 }
        `
      }
    ]
  }

  const agent = new OpsRiskAgent()
  const result = await agent.analyze({
    projectContext: mockedContext,
    previousResults: [],
    config: {}
  })

  console.log('--- Results ---')
  result.results.forEach(r => {
    console.log(`[${r.severity}] ${r.message}`)
    if (r.suggestion) console.log(`   Suggestion: ${r.suggestion}`)
  })
  
  const metadata = result.metadata as any
  console.log('--- Verification ---')
  console.log(`Risk Score: ${metadata.riskScore}`)
  console.log(`MTTR: ${metadata.mttr}h`)
  console.log(`Log Coverage: ${metadata.stats.logCoverage}`)

  if (metadata.mttr >= 8) console.log('✅ MTTR elevated (Low log coverage)')
  else console.error(`❌ Unexpected MTTR: ${metadata.mttr}`)

  if (metadata.riskScore < 50) console.log('❌ Unexpected Low Risk (Should be high due to risky file)')
  
}

runTest()
