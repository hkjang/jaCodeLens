import { runFullAnalysis } from '../lib/analyzer/index'
import path from 'path'

async function main() {
  const targetDir = path.resolve(process.cwd()) // Analyze self
  console.log(`Analyzing self: ${targetDir}`)

  try {
    // Skip AI for quick test unless env var set
    const useAI = process.env.ENABLE_AI_TEST === 'true'
    const result = await runFullAnalysis(targetDir, useAI)
    
    console.log('\n--- Analysis Result ---')
    console.log(`Files: ${result.context.files.length}`)
    console.log(`Total Lines: ${result.staticAnalysis.summary.totalLines}`)
    console.log(`Issues: ${result.staticAnalysis.issues.length}`)
    console.log(`Critical: ${result.staticAnalysis.summary.criticalIssues}`)
    
    if (useAI) {
      console.log('\n--- AI Report ---')
      console.log(result.aiReport.slice(0, 500) + '...')
    } else {
      console.log('\nAI Analysis skipped (set ENABLE_AI_TEST=true to enable)')
    }

  } catch (err) {
    console.error('Analysis failed:', err)
  }
}

main()
