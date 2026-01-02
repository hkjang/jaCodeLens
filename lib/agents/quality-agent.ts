import { BaseAgent } from "./base-agent";
import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export class QualityAnalysisAgent extends BaseAgent {
  name = "QualityAnalysisAgent";
  description = "Analyzes code complexity, code smells, and maintainability.";

  protected async execute(task: AgentTask): Promise<any> {
    // Get project info
    const project = await prisma.project.findFirst({
      where: { analyses: { some: { agentExecutions: { some: { id: task.agentExecutionId } } } } },
    });

    if (!project) throw new Error("Project not found");

    console.log(`   🔍 Scanning code files for quality analysis...`);

    // 1. Find code files to analyze (sample up to 5 files)
    const codeFiles = await this.findCodeFiles(project.path, 5);
    console.log(`   📄 Found ${codeFiles.length} code files to analyze:`);
    codeFiles.forEach((f, i) => {
      const relativePath = f.replace(project.path, '').replace(/\\/g, '/');
      console.log(`      ${i + 1}. ${relativePath}`);
    });

    if (codeFiles.length === 0) {
      return { filesAnalyzed: 0, issues: [] };
    }

    // 2. Read file contents (truncated)
    const fileContents: { path: string; name: string; content: string }[] = [];
    for (const file of codeFiles) {
      try {
        let content = await fs.readFile(file, 'utf-8');
        // Truncate large files
        if (content.length > 2000) {
          content = content.slice(0, 2000) + '\n... [truncated]';
        }
        fileContents.push({
          path: file,
          name: path.basename(file),
          content
        });
      } catch (e) {
        console.log(`   ⚠️ Could not read: ${file}`);
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
    console.log(`   ║ 📋 분석 대상: 실제 코드 내용                ║`);
    console.log(`   ║ 📄 ${fileContents.length}개 파일의 소스코드 (각 2000자 제한)   ║`);
    console.log(`   ╚══════════════════════════════════════════════╝`);
    console.log(`   🧠 Calling AI for quality analysis...`);
    let aiResponse: string;
    
    try {
      aiResponse = await this.callAIWithConfig(contextData);
    } catch (e) {
      console.log(`   ⚠️ ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.log(`   📝 Using fallback prompt...`);
      
      const systemPrompt = `You are a code quality analyst. Analyze code for complexity, code smells, and maintainability issues. Respond in JSON: {"issues": [{"severity": "HIGH|MEDIUM|LOW", "file": "...", "line": 0, "type": "COMPLEXITY|SMELL|NAMING", "description": "...", "suggestion": "..."}], "overallScore": 7, "summary": "..."}. Respond only in Korean.`;
      const userPrompt = `Analyze these ${fileContents.length} code files for quality:\n${filesText}`;
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
        overallScore: 7,
        summary: "Analysis completed but response parsing failed"
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
            category: "QUALITY",
            severity: issue.severity || "MEDIUM",
            filePath: issue.file,
            lineNumber: issue.line,
            message: issue.description || issue.message,
            suggestion: issue.suggestion,
            confidenceScore: 0.8,
          }
        });
      }
      console.log(`   💾 Saved ${analysisResult.issues.length} quality issues`);
    }

    return {
      filesAnalyzed: fileContents.length,
      issuesFound: analysisResult.issues?.length || 0,
      overallScore: analysisResult.overallScore,
      summary: analysisResult.summary
    };
  }

  /**
   * Find code files to analyze
   */
  private async findCodeFiles(dirPath: string, maxFiles: number): Promise<string[]> {
    const files: string[] = [];
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build'];
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx'];

    const scan = async (dir: string, depth = 0): Promise<void> => {
      if (depth > 4 || files.length >= maxFiles) return;
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (files.length >= maxFiles) break;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !skipDirs.includes(entry.name)) {
            await scan(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (codeExtensions.includes(ext)) {
              // Prefer lib, components, app directories
              if (dir.includes('lib') || dir.includes('component') || dir.includes('app')) {
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
