import { ProjectContext } from '../collector/types'
import { StaticAnalysisResult, AnalysisIssue, FileMetric } from './types'

const RISKY_PATTERNS = [
  { regex: /AWS_ACCESS_KEY_ID\s*=\s*['"][A-Z0-9]{20}['"]/i, message: 'Hardcoded AWS Access Key', severity: 'CRITICAL', category: 'SECURITY' },
  { regex: /AWS_SECRET_ACCESS_KEY\s*=\s*['"][A-Za-z0-9\/+=]{40}['"]/i, message: 'Hardcoded AWS Secret Key', severity: 'CRITICAL', category: 'SECURITY' },
  { regex: /password\s*=\s*['"][^'"]{6,}['"]/i, message: 'Potential hardcoded password', severity: 'HIGH', category: 'SECURITY' },
  { regex: /api_key\s*=\s*['"][A-Za-z0-9_\-]{20,}['"]/i, message: 'Potential hardcoded API Key', severity: 'HIGH', category: 'SECURITY' },
  { regex: /TODO:/, message: 'TODO Comment found', severity: 'INFO', category: 'CODE_QUALITY' },
  { regex: /FIXME:/, message: 'FIXME Comment found', severity: 'LOW', category: 'CODE_QUALITY' },
  { regex: /debugger;/, message: 'Debugger statement found', severity: 'MEDIUM', category: 'CODE_QUALITY' },
  { regex: /console\.log\(/, message: 'Console.log found (should use logger)', severity: 'INFO', category: 'CODE_QUALITY' },
] as const

export function analyzeProjectStatic(context: ProjectContext): StaticAnalysisResult {
  const issues: AnalysisIssue[] = []
  const metrics: FileMetric[] = []
  // Basic dependency tracking - could be enhanced by parsing package.json specially
  const dependencies: Record<string, string> = {} 

  let totalLines = 0
  let totalComplexity = 0

  for (const file of context.files) {
    if (!file.content) continue

    const lines = file.content.split('\n')
    const fileLines = lines.length
    
    // Simple complexity: based on control flow keywords
    const controlFlowKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?']
    let complexity = 1
    let todoCount = 0

    lines.forEach((line, idx) => {
      // Complexity
      controlFlowKeywords.forEach(kw => {
        if (line.includes(kw)) complexity++
      })

      // TODO count
      if (line.includes('TODO')) todoCount++

      // Pattern Matching
      RISKY_PATTERNS.forEach(pattern => {
        if (pattern.regex.test(line)) {
          issues.push({
            file: file.path,
            line: idx + 1,
            message: pattern.message,
            severity: pattern.severity,
            category: pattern.category
          })
        }
      })
    })

    // Heuristic for high complexity
    if (complexity > 20) {
      issues.push({
        file: file.path,
        line: 0,
        message: `High cyclomatic complexity (${complexity})`,
        severity: 'MEDIUM',
        category: 'CODE_QUALITY'
      })
    }
    
    if (fileLines > 300) {
      issues.push({
         file: file.path,
         line: 0,
         message: `File too long (${fileLines} lines)`,
         severity: 'LOW',
         category: 'CODE_QUALITY'
      })
    }

    metrics.push({
      file: file.path,
      lines: fileLines,
      complexity,
      todoCount
    })

    totalLines += fileLines
    totalComplexity += complexity
  }

  // Parse package.json if exists for dependencies
  const packageJson = context.files.find(f => f.name === 'package.json')
  if (packageJson && packageJson.content) {
    try {
        const pkg = JSON.parse(packageJson.content)
        if (pkg.dependencies) Object.assign(dependencies, pkg.dependencies)
        if (pkg.devDependencies) Object.assign(dependencies, pkg.devDependencies)
    } catch (e) {
        // ignore parse error
    }
  }

  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length

  return {
    issues,
    metrics,
    dependencies,
    summary: {
      totalFiles: context.files.length,
      totalLines,
      averageComplexity: context.files.length ? totalComplexity / context.files.length : 0,
      criticalIssues
    }
  }
}
