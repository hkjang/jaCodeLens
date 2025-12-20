import { ArchitectureAgent } from '../lib/analyzer/agents/architecture-agent'
import { ProjectContext } from '../lib/collector/types'

async function runTest() {
  console.log('Testing Architecture Agent Logic...')

  // Mock Context with a circular dependency and layer violation
  const mockedContext: ProjectContext = {
    path: '/test/project',
    ignoredFiles: [],
    totalSize: 100,
    languageEstimates: {},
    files: [
      {
        path: 'src/controller/UserController.ts',
        name: 'UserController.ts',
        extension: 'ts',
        size: 100,
        lastModified: new Date(),
        content: `
          import { UserService } from '../service/UserService'
          import { UserRepository } from '../infra/db/UserRepository' // VIOLATION: Controller -> Infra/DB
          
          export class UserController {
             constructor(private service: UserService) {}
          }
        `
      },
      {
        path: 'src/service/UserService.ts',
        name: 'UserService.ts',
        extension: 'ts',
        size: 100,
        lastModified: new Date(),
        content: `
          import { UserHelper } from '../utils/UserHelper'
          export class UserService {}
        `
      },
      {
        path: 'src/utils/UserHelper.ts',
        name: 'UserHelper.ts',
        extension: 'ts',
        size: 100,
        lastModified: new Date(),
        content: `
          import { UserService } from '../service/UserService' // CIRCULAR: Helper -> Service -> Helper
          export class UserHelper {}
        `
      },
      {
        path: 'src/infra/db/UserRepository.ts',
        name: 'UserRepository.ts',
        extension: 'ts',
        size: 100,
        lastModified: new Date(),
        content: `export class UserRepository {}`
      }
    ]
  }

  const agent = new ArchitectureAgent()
  const result = await agent.analyze({
    projectContext: mockedContext,
    previousResults: [],
    config: {}
  })

  console.log('--- Results ---')
  result.results.forEach(r => {
    console.log(`[${r.severity}] ${r.message}`)
  })

  // Assertions
  const cycles = result.results.filter(r => r.message.includes('Circular Dependency'))
  const violations = result.results.filter(r => r.message.includes('Layer Violation'))

  console.log('--- Verification ---')
  if (cycles.length > 0) console.log('✅ Circular Dependency Detected')
  else console.error('❌ Circular Dependency NOT Detected')

  if (violations.length > 0) console.log('✅ Layer Violation Detected')
  else console.error('❌ Layer Violation NOT Detected')
}

runTest()
