import { SecurityAgent } from '../lib/analyzer/agents/security-agent'
import { ProjectContext } from '../lib/collector/types'

async function runTest() {
  console.log('Testing Security Agent Logic...')

  const mockedContext: ProjectContext = {
    path: '/test/project',
    ignoredFiles: [],
    totalSize: 100,
    languageEstimates: {},
    files: [
      {
        path: 'src/config.ts',
        name: 'config.ts',
        extension: 'ts',
        size: 100,
        lastModified: new Date(),
        content: `
          export const config = {
            apiUrl: 'http://api.insecure.com', // INSECURE HTTP
            awsKey: 'AKIAIOSFODNN7EXAMPLE', // SECRET
            awsSecret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' // SECRET
          }
        `
      },
      {
        path: 'src/safe.ts',
        name: 'safe.ts',
        extension: 'ts',
        size: 100,
        lastModified: new Date(),
        content: `export const safe = true`
      }
    ]
  }

  const agent = new SecurityAgent()
  const result = await agent.analyze({
    projectContext: mockedContext,
    previousResults: [],
    config: {}
  })

  console.log('--- Results ---')
  result.results.forEach(r => {
    console.log(`[${r.severity}] ${r.message}`)
  })

  const criticals = result.results.filter(r => r.severity === 'CRITICAL')
  const httpWarning = result.results.filter(r => r.message.includes('HTTP'))

  console.log('--- Verification ---')
  if (criticals.length >= 2) console.log('✅ Secrets Detected (AWS Key & Secret)')
  else console.error(`❌ Missed Secrets (Found ${criticals.length})`)

  if (httpWarning.length > 0) console.log('✅ Insecure HTTP Detected')
  else console.error('❌ Insecure HTTP NOT Detected')
}

runTest()
