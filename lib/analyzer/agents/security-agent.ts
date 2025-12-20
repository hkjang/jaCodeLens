import { BaseAgent, AgentResult, AgentContext } from './base-agent'

const SECRET_PATTERNS = [
  { regex: /(aws_?access_?key(_?id)?|aws_?key)\s*[:=]\s*['"][A-Z0-9]{20}['"]/i, description: 'AWS Access Key', severity: 'CRITICAL' },
  { regex: /(aws_?secret(_?access)?_?key|aws_?secret)\s*[:=]\s*['"][A-Za-z0-9\/+=]{40}['"]/i, description: 'AWS Secret Key', severity: 'CRITICAL' },
  { regex: /BEGIN RSA PRIVATE KEY/i, description: 'RSA Private Key', severity: 'CRITICAL' },
  { regex: /(api_?key|secret_?key|auth_?token)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i, description: 'Generic API Key', severity: 'HIGH' },
]

export class SecurityAgent extends BaseAgent {
  public readonly name = 'SecurityAgent'
  public readonly description = 'Analyzes code for security vulnerabilities, secrets, and compliance.'

  async analyze(context: AgentContext): Promise<AgentResult> {
    const results: any[] = []

    for (const file of context.projectContext.files) {
      if (!file.content) continue
      
      const lines = file.content.split('\n')
      lines.forEach((line, index) => {
        // 1. Secret Scanning
        for (const pattern of SECRET_PATTERNS) {
           if (pattern.regex.test(line)) {
             results.push(this.createResult(
               'SECURITY',
               pattern.severity,
               `Potential Secret Exposed: ${pattern.description}`,
               {
                 filePath: file.path,
                 lineNumber: index + 1,
                 confidenceScore: 0.9,
                 suggestion: 'Rotate secret immediately and use environment variables/Vault.'
               } as any
             ))
           }
        }
        
        // 2. Insecure Configs (Example: Plain HTTP)
        if (line.includes('http://') && !line.includes('localhost')) {
           results.push(this.createResult(
             'SECURITY',
             'MEDIUM',
             'Usage of insecure HTTP protocol',
             {
               filePath: file.path,
               lineNumber: index + 1,
               confidenceScore: 0.7,
               suggestion: 'Use HTTPS for all external communications.'
             } as any
           ))
        }
      })
    }

    // 3. Compliance & Threat Modeling (High Level)
    // If we found secrets, that violates ISO 27001 (A.10 Cryptography)
    const secretCount = results.filter(r => r.category === 'SECURITY' && r.severity === 'CRITICAL').length
    if (secretCount > 0) {
      results.push(this.createResult(
        'SECURITY',
        'HIGH',
        `Compliance Violation (ISO 27001): Secrets found in code (${secretCount} instances).`,
        {
          confidenceScore: 1.0,
          suggestion: 'Ensure all secrets are removed from version control.'
        } as any
      ))
    }

    // STRIDE Check (Spoofing, Tampering, Repudiation, Info Disclosure, Denial of Service, Elevation of Priv)
    // Very basic heuristic: if we have auth logic but no rate limiting??
    // For now, let's just flag generally if we see "password" validation logic without "rate limit" keywords nearby (very fuzzy)
    // This is hard to do statically without deep analysis.
    // Let's add a placeholder STRIDE check.
    
    return {
      results,
      metadata: {
        scannedFiles: context.projectContext.files.length
      }
    }
  }
}
