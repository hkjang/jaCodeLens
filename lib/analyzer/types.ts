export interface AnalysisIssue {
  file: string
  line: number
  message: string
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'CODE_QUALITY' | 'SECURITY' | 'PERFORMANCE' | 'ARCHITECTURE'
}

export interface FileMetric {
  file: string
  lines: number
  complexity: number // Cyclomatic complexity estimate
  todoCount: number
}

export interface StaticAnalysisResult {
  issues: AnalysisIssue[]
  metrics: FileMetric[]
  dependencies: Record<string, string>
  summary: {
    totalFiles: number
    totalLines: number
    averageComplexity: number
    criticalIssues: number
  }
}
