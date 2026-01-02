import { BaseAgent } from "./base-agent";
import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { codeScanner } from "@/lib/code-scanner";

interface FileInfo {
  path: string;
  name: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
}

export class StructureAnalysisAgent extends BaseAgent {
  name = "StructureAnalysisAgent";
  description = "Analyzes the directory structure, module organization, and architectural layers.";

  protected async execute(task: AgentTask): Promise<any> {
    // Get project info
    const project = await prisma.project.findFirst({
      where: { analyses: { some: { agentExecutions: { some: { id: task.agentExecutionId } } } } },
    });

    if (!project) throw new Error("Project not found");

    console.log(`   📂 Scanning project: ${project.path}`);
    
    // 1. Scan the project directory structure
    const structure = await this.scanDirectory(project.path, 3); // Max depth 3
    
    console.log(`   📂 Found ${structure.files.length} files, ${structure.directories.length} directories`);
    console.log(`   📂 Sample files analyzed:`);
    structure.files.slice(0, 8).forEach((f, i) => {
      console.log(`      ${i + 1}. ${f.name}`);
    });
    if (structure.files.length > 8) {
      console.log(`      ... and ${structure.files.length - 8} more files`);
    }

    // 1.5 Code Intelligence - 코드 요소 추출 (AST 파싱)
    console.log('');
    console.log(`   🔬 Extracting code elements (AST parsing)...`);
    try {
      const scanResult = await codeScanner.scanProject(project.id, project.path);
      console.log(`   🔬 Extracted ${scanResult.elementsExtracted} code elements:`);
      Object.entries(scanResult.elementsByType).forEach(([type, count]) => {
        console.log(`      - ${type}: ${count}개`);
      });
    } catch (e) {
      console.log(`   ⚠️ Code scanning skipped: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 2. Prepare context for AI (will be passed as variables to configured prompt)
    const contextData = {
      projectName: project.name,
      projectPath: project.path,
      structure: structure.tree,
      directories: structure.directories.slice(0, 20).join(', '),
      files: structure.files.slice(0, 30).map(f => f.name).join(', '),
      fileCount: String(structure.files.length),
      directoryCount: String(structure.directories.length)
    };

    // 3. Call AI with admin-configured prompt (or fallback)
    console.log('');
    console.log(`   ╔══════════════════════════════════════════════╗`);
    console.log(`   ║ 📋 분석 대상: 디렉토리 트리 (파일 내용 X)   ║`);
    console.log(`   ║ 📁 디렉토리 ${structure.directories.length}개 + 파일명 ${structure.files.length}개          ║`);
    console.log(`   ╚══════════════════════════════════════════════╝`);
    console.log(`   🧠 Calling AI for structure analysis...`);
    let aiResponse: string;
    
    try {
      // Try to use admin-configured prompt with variables
      aiResponse = await this.callAIWithConfig(contextData);
    } catch (e) {
      // Fallback to hardcoded prompt if not configured
      console.log(`   ⚠️ ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.log(`   📝 Using fallback prompt...`);
      
      const systemPrompt = `You are a software architecture analyst. Analyze the project structure and identify architectural issues. Respond in JSON: {"issues": [{"severity": "HIGH|MEDIUM|LOW", "type": "...", "path": "...", "description": "...", "suggestion": "..."}], "summary": "..."}. Respond only in Korean.`;
      const userPrompt = `Project: ${project.name}\nStructure:\n${structure.tree}\nFiles: ${structure.files.length}, Directories: ${structure.directories.length}`;
      aiResponse = await this.callAI(systemPrompt, userPrompt);
    }

    // 4. Parse AI response
    let analysisResult;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiResponse;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0];
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0];
      }
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.log(`   ⚠️ Could not parse AI response as JSON, using raw text`);
      analysisResult = { 
        issues: [{
          severity: "INFO",
          type: "ANALYSIS",
          path: project.path,
          description: aiResponse.slice(0, 500),
          suggestion: "Review full AI response"
        }],
        summary: "AI analysis completed"
      };
    }

    // 5. Save results to database
    const agentExecution = await prisma.agentExecution.findUnique({ 
      where: { id: task.agentExecutionId } 
    });

    if (agentExecution && analysisResult.issues) {
      for (const issue of analysisResult.issues) {
        await prisma.analysisResult.create({
          data: {
            executeId: agentExecution.executeId,
            category: "ARCHITECTURE",
            severity: issue.severity || "MEDIUM",
            filePath: issue.path,
            message: issue.description || issue.message,
            suggestion: issue.suggestion,
            confidenceScore: 0.85,
          }
        });
      }
      console.log(`   💾 Saved ${analysisResult.issues.length} issues to database`);
    }

    return {
      filesScanned: structure.files.length,
      directoriesScanned: structure.directories.length,
      issuesFound: analysisResult.issues?.length || 0,
      summary: analysisResult.summary
    };
  }

  /**
   * Recursively scan directory structure
   */
  private async scanDirectory(dirPath: string, maxDepth: number, currentDepth = 0): Promise<{
    files: FileInfo[];
    directories: string[];
    tree: string;
  }> {
    const files: FileInfo[] = [];
    const directories: string[] = [];
    let tree = '';

    // Skip certain directories
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build', '.cache', '__pycache__'];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(dirPath, fullPath);
        const indent = '  '.repeat(currentDepth);

        if (entry.isDirectory()) {
          if (skipDirs.includes(entry.name)) continue;
          
          directories.push(entry.name);
          tree += `${indent}📁 ${entry.name}/\n`;

          if (currentDepth < maxDepth) {
            const subResult = await this.scanDirectory(fullPath, maxDepth, currentDepth + 1);
            files.push(...subResult.files);
            directories.push(...subResult.directories.map(d => `${entry.name}/${d}`));
            tree += subResult.tree;
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          // Only include relevant file types
          if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.py', '.java'].includes(ext)) {
            try {
              const stats = await fs.stat(fullPath);
              files.push({
                path: fullPath,
                name: entry.name,
                type: 'file',
                extension: ext,
                size: stats.size
              });
              tree += `${indent}📄 ${entry.name}\n`;
            } catch (e) {
              // Skip files we can't stat
            }
          }
        }
      }
    } catch (e) {
      console.log(`   ⚠️ Could not read directory: ${dirPath}`);
    }

    return { files, directories, tree };
  }
}
