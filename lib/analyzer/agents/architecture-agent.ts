import { BaseAgent, AgentResult, AgentContext } from './base-agent'
import path from 'path'

interface Dependency {
  from: string
  to: string
  type: 'IMPORT' | 'DYNAMIC'
}

export class ArchitectureAgent extends BaseAgent {
  public readonly name = 'ArchitectureAgent'
  public readonly description = 'Analyzes project structure, dependencies, and architectural violations.'

  async analyze(context: AgentContext): Promise<AgentResult> {
    const files = context.projectContext.files
    const dependencies: Dependency[] = []
    
    // 1. Build Dependency Graph
    for (const file of files) {
      if (!file.content) continue
      
      // Normalize file path for comparison
      const normalizedFilePath = file.path.replace(/\\/g, '/')

      const imports = this.extractImports(file.content)
      for (const imp of imports) {
        const resolvedBase = this.resolveImport(normalizedFilePath, imp)
        
        if (resolvedBase) {
          // Try to find the actual file that matches this resolved path
          // File paths have extensions, imports don't.
          const targetFile = files.find(f => {
             const fPath = f.path.replace(/\\/g, '/')
             return fPath === resolvedBase || fPath.startsWith(resolvedBase + '.')
          })
          
          if (targetFile) {
             dependencies.push({ 
               from: normalizedFilePath, 
               to: targetFile.path.replace(/\\/g, '/'), 
               type: 'IMPORT' 
             })
          }
        }
      }
    }

    // 2. Detect Cycles
    const cycles = this.detectCycles(dependencies)
    
    // 3. Detect Layer Violations (Heuristic based on directory names)
    // Rules: 
    // - "controller" should not import "db" or "repository" directly (if using Service pattern) - *Strict Rule*
    // - "domain" should not import "infrastructure"
    const violations = this.detectLayerViolations(dependencies)

    // 4. Generate Results
    const results = []

    for (const cycle of cycles) {
      results.push(this.createResult(
        'ARCHITECTURE',
        'HIGH',
        `Circular Dependency detected: ${cycle.join(' -> ')}`,
        {
          filePath: cycle[0],
          confidenceScore: 1.0,
          suggestion: 'Refactor code to break the cycle (e.g., use dependency injection or shared interface).'
        } as any
      ))
    }

    for (const violation of violations) {
      results.push(this.createResult(
        'ARCHITECTURE',
        'MEDIUM',
        `Layer Violation: ${violation.message}`,
        {
          filePath: violation.from,
          confidenceScore: 0.8,
          suggestion: violation.suggestion
        } as any
      ))
    }

    return {
      results,
      dependencies,
      metadata: {
        dependencyCount: dependencies.length,
        cycleCount: cycles.length
      }
    }
  }

  private extractImports(content: string): string[] {
    const regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
    const imports: string[] = []
    let match
    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1])
    }
    return imports
  }


  private resolveImport(sourcePath: string, importPath: string): string | null {
    // 1. Handle @ alias (Next.js default)
    if (importPath.startsWith('@/')) {
       return importPath.replace('@/', '') 
       // In a real app, we'd join with project root, but for these relative comparisons
       // we might need to assume a root. Let's try to match the file path style.
       // The file paths in context are relative to project root usually? 
       // Let's assume file.path is relative to project root for now.
    }

    // 2. Handle Relative Paths
    if (importPath.startsWith('.')) {
      // sourcePath is like 'src/service/UserService.ts'
      // importPath is like '../utils/UserHelper'
      
      const sourceDir = path.dirname(sourcePath)
      const resolved = path.join(sourceDir, importPath)
      
      // Normalize slashes for Windows/Unix consistency
      const normalized = resolved.replace(/\\/g, '/')
      
      // We need to guess the extension? 
      // The context.files have full paths with extensions.
      // The import usually lacks extension.
      // We will perform a "fuzzy match" later in the main loop or here?
      // For graph construction, let's return the "likely" path without extension 
      // and match it against file list later.
      return normalized
    }
    
    return null 
  }

  private detectCycles(deps: Dependency[]): string[][] {
    // DFS for cycle detection
    const cycles: string[][] = []
    const adj = new Map<string, string[]>()
    
    for (const d of deps) {
      if (!adj.has(d.from)) adj.set(d.from, [])
      adj.get(d.from)?.push(d.to)
    }

    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []

    const dfs = (node: string) => {
      visited.add(node)
      recursionStack.add(node)
      path.push(node)

      const neighbors = adj.get(node) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor)
        } else if (recursionStack.has(neighbor)) {
          // Cycle found
          const cycleStart = path.indexOf(neighbor)
          cycles.push([...path.slice(cycleStart)])
        }
      }

      recursionStack.delete(node)
      path.pop()
    }

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
         dfs(node)
      }
    }

    return cycles
  }

  private detectLayerViolations(deps: Dependency[]): { from: string, message: string, suggestion: string }[] {
    const violations = []
    
    for (const d of deps) {
       const lowerFrom = d.from.toLowerCase()
       const lowerTo = d.to.toLowerCase()

       // Example Rule: Controllers shouldn't call DB directly
       if (lowerFrom.includes('controller') && (lowerTo.includes('db') || lowerTo.includes('prisma'))) {
         violations.push({
           from: d.from,
           message: 'Controller calls Database directly (should use Service)',
           suggestion: 'Move database logic to a Service layer.'
         })
       }

       // Example Rule: Domain entities shouldn't depend on Infrastructure
       if (lowerFrom.includes('domain') && lowerTo.includes('infra')) {
          violations.push({
            from: d.from,
            message: 'Domain layer depends on Infrastructure',
            suggestion: 'Invert dependency: Infrastructure should implement Domain interfaces.'
          })
       }
    }
    
    return violations
  }
}
