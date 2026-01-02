import { BaseAgent } from "./base-agent";
import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export class SecurityAnalysisAgent extends BaseAgent {
  name = "SecurityAnalysisAgent";
  description = "Scans code for security vulnerabilities and sensitive data exposure.";

  protected async execute(task: AgentTask): Promise<any> {
    // Get project info
    const project = await prisma.project.findFirst({
      where: { analyses: { some: { agentExecutions: { some: { id: task.agentExecutionId } } } } },
    });

    if (!project) throw new Error("Project not found");

    console.log(`   🔒 Scanning for security vulnerabilities...`);

    // 1. Find code files to analyze
    const codeFiles = await this.findCodeFiles(project.path, 5);
    console.log(`   📄 Scanning ${codeFiles.length} files for security issues:`);
    codeFiles.forEach((f, i) => {
      const relativePath = f.replace(project.path, '').replace(/\\/g, '/');
      console.log(`      ${i + 1}. ${relativePath}`);
    });

    if (codeFiles.length === 0) {
      return { filesAnalyzed: 0, issues: [] };
    }

    // 2. Read file contents
    const fileContents: { path: string; name: string; content: string }[] = [];
    for (const file of codeFiles) {
      try {
        let content = await fs.readFile(file, 'utf-8');
        if (content.length > 3000) {
          content = content.slice(0, 3000) + '\n... [truncated]';
        }
        fileContents.push({
          path: file,
          name: path.basename(file),
          content
        });
      } catch (e) {
        // Skip unreadable files
      }
    }

    // Build file content text for AI
    const filesText = fileContents.map(f => 
      `\n--- ${f.name} ---\n${f.content}`
    ).join('\n');

    // 3. Prepare context for admin-configured prompt
    const contextData = {
      projectName: project?.name || 'Unknown',
      files: fileContents.map(f => f.name).join(', '),
      fileCount: String(fileContents.length),
      content: filesText
    };

    // 4. Call AI with admin prompt (or fallback)
    console.log('');
    console.log(`   ╔══════════════════════════════════════════════╗`);
    console.log(`   ║ 📋 분석 대상: 보안 관련 코드                ║`);
    console.log(`   ║ 🔐 ${fileContents.length}개 파일 (api, auth, .env 우선)     ║`);
    console.log(`   ╚══════════════════════════════════════════════╝`);
    console.log(`   🧠 Calling AI for security analysis...`);
    let aiResponse: string;
    
    try {
      aiResponse = await this.callAIWithConfig(contextData);
    } catch (e) {
      console.log(`   ⚠️ ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.log(`   📝 Using fallback prompt...`);
      
      const systemPrompt = `You are a security analyst. Analyze code for vulnerabilities: SQL injection, XSS, hardcoded secrets, auth issues. Respond in JSON: {"issues": [{"severity": "CRITICAL|HIGH|MEDIUM|LOW", "file": "...", "line": 0, "type": "SQL_INJECTION|XSS|HARDCODED_SECRET", "description": "...", "suggestion": "..."}], "riskLevel": "MEDIUM", "summary": "..."}. Respond only in Korean.`;
      const userPrompt = `Security analysis for ${fileContents.length} files:\n${filesText}`;
      aiResponse = await this.callAI(systemPrompt, userPrompt);
    }

    // 5. Parse response
    let analysisResult;
    try {
      let jsonStr = aiResponse;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0];
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0];
      }
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.log(`   ⚠️ Could not parse AI response, creating default`);
      analysisResult = { 
        issues: [],
        riskLevel: "LOW",
        summary: "Security scan completed"
      };
    }

    // 6. Save results
    const agentExecution = await prisma.agentExecution.findUnique({ 
      where: { id: task.agentExecutionId } 
    });

    if (agentExecution && analysisResult.issues) {
      for (const issue of analysisResult.issues) {
        await prisma.analysisResult.create({
          data: {
            executeId: agentExecution.executeId,
            category: "SECURITY",
            severity: issue.severity || "MEDIUM",
            filePath: issue.file,
            lineNumber: issue.line,
            message: issue.description || issue.message,
            suggestion: issue.suggestion,
            confidenceScore: 0.85,
          }
        });
      }
      console.log(`   💾 Saved ${analysisResult.issues.length} security issues`);
    }

    return {
      filesAnalyzed: fileContents.length,
      issuesFound: analysisResult.issues?.length || 0,
      riskLevel: analysisResult.riskLevel,
      summary: analysisResult.summary
    };
  }

  /**
   * Find code files to analyze
   */
  private async findCodeFiles(dirPath: string, maxFiles: number): Promise<string[]> {
    const files: string[] = [];
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build'];
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.env'];

    const scan = async (dir: string, depth = 0): Promise<void> => {
      if (depth > 4 || files.length >= maxFiles * 2) return;
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !skipDirs.includes(entry.name)) {
            await scan(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            const name = entry.name.toLowerCase();
            // Prioritize files likely to have security issues
            if (codeExtensions.includes(ext) || name.includes('.env') || name.includes('config')) {
              if (name.includes('api') || name.includes('auth') || name.includes('db') || name.includes('.env')) {
                files.unshift(fullPath);
              } else {
                files.push(fullPath);
              }
            }
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    };

    await scan(dirPath);
    return files.slice(0, maxFiles);
  }
}
