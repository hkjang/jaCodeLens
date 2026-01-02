import { BaseAgent } from "./base-agent";
import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export class TestAnalysisAgent extends BaseAgent {
  name = "TestAnalysisAgent";
  description = "Analyzes test coverage, test gaps, and flakiness.";

  protected async execute(task: AgentTask): Promise<any> {
    // Get project info
    const project = await prisma.project.findFirst({
      where: { analyses: { some: { agentExecutions: { some: { id: task.agentExecutionId } } } } },
    });

    if (!project) throw new Error("Project not found");

    console.log(`   🧪 Scanning test files...`);

    // 1. Find test files
    const testFiles = await this.findTestFiles(project.path);
    console.log(`   🧪 Found ${testFiles.length} test files`);

    // 2. Read test file contents
    const testContents: { name: string; content: string }[] = [];
    for (const file of testFiles.slice(0, 3)) {
      try {
        let content = await fs.readFile(file, 'utf-8');
        if (content.length > 1500) content = content.slice(0, 1500) + '\n...[truncated]';
        testContents.push({ name: path.basename(file), content });
      } catch (e) { /* skip */ }
    }

    // 3. Prepare context for AI
    const contextData = {
      projectName: project.name,
      testFiles: testFiles.map(f => path.basename(f)).join(', '),
      testFileCount: String(testFiles.length),
      content: testContents.map(t => `--- ${t.name} ---\n${t.content}`).join('\n\n')
    };

    // 4. Call AI with admin prompt (or fallback)
    console.log('');
    console.log(`   ╔══════════════════════════════════════════════╗`);
    console.log(`   ║ 📋 분석 대상: 테스트 파일                   ║`);
    console.log(`   ║ 🧪 ${testFiles.length}개 테스트 (.test., .spec. 파일)    ║`);
    console.log(`   ╚══════════════════════════════════════════════╝`);
    console.log(`   🧠 Calling AI for test analysis...`);
    let aiResponse: string;
    
    try {
      aiResponse = await this.callAIWithConfig(contextData);
    } catch (e) {
      console.log(`   ⚠️ ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.log(`   📝 Using fallback prompt...`);
      
      const systemPrompt = `You are a test analyst. Analyze test files for: missing tests, test quality, coverage gaps, flaky tests. Respond in JSON: {"issues": [{"severity": "HIGH|MEDIUM|LOW", "file": "...", "type": "MISSING_TEST|LOW_COVERAGE|FLAKY|BAD_PRACTICE", "description": "...", "suggestion": "..."}], "coverageEstimate": 50, "summary": "..."}. Respond only in Korean.`;
      const userPrompt = `Analyze ${testFiles.length} test files: ${contextData.testFiles}\n\n${contextData.content}`;
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
      analysisResult = { issues: [], coverageEstimate: null, summary: "Test scan completed" };
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
            category: "TEST",
            severity: issue.severity || "MEDIUM",
            filePath: issue.file,
            message: issue.description,
            suggestion: issue.suggestion,
            confidenceScore: 0.75,
          }
        });
      }
      console.log(`   💾 Saved ${analysisResult.issues.length} test issues`);
    }

    return {
      testFilesFound: testFiles.length,
      issuesFound: analysisResult.issues?.length || 0,
      coverageEstimate: analysisResult.coverageEstimate,
      summary: analysisResult.summary
    };
  }

  /**
   * Find test files in project
   */
  private async findTestFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build'];

    const scan = async (dir: string, depth = 0): Promise<void> => {
      if (depth > 4 || files.length >= 10) return;
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !skipDirs.includes(entry.name)) {
            // Prioritize test directories
            if (entry.name === '__tests__' || entry.name === 'test' || entry.name === 'tests') {
              files.unshift(fullPath);
            }
            await scan(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const name = entry.name.toLowerCase();
            if (name.includes('.test.') || name.includes('.spec.') || name.includes('_test.')) {
              files.push(fullPath);
            }
          }
        }
      } catch (e) { /* skip inaccessible */ }
    };

    await scan(dirPath);
    return files;
  }
}
