import { BaseAgent } from "./base-agent";
import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export class DependencyAnalysisAgent extends BaseAgent {
  name = "DependencyAnalysisAgent";
  description = "Analyzes external libraries, versions, and potential license issues.";

  protected async execute(task: AgentTask): Promise<any> {
    // Get project info
    const project = await prisma.project.findFirst({
      where: { analyses: { some: { agentExecutions: { some: { id: task.agentExecutionId } } } } },
    });

    if (!project) throw new Error("Project not found");

    console.log(`   📦 Scanning dependencies...`);

    // 1. Read package.json
    let packageJson: any = null;
    try {
      const packagePath = path.join(project.path, 'package.json');
      const content = await fs.readFile(packagePath, 'utf-8');
      packageJson = JSON.parse(content);
      console.log(`   📦 Found package.json with ${Object.keys(packageJson.dependencies || {}).length} dependencies`);
    } catch (e) {
      console.log(`   ⚠️ No package.json found`);
      return { dependencies: [], issues: [] };
    }

    // 2. Prepare context for AI
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    const dependencies = [
      ...Object.entries(deps).map(([name, ver]) => ({ name, version: ver, type: 'prod' })),
      ...Object.entries(devDeps).slice(0, 10).map(([name, ver]) => ({ name, version: ver, type: 'dev' }))
    ];

    const contextData = {
      projectName: project.name,
      dependencies: dependencies.map(d => `${d.name}@${d.version}`).join(', '),
      dependencyCount: String(dependencies.length),
      prodCount: String(Object.keys(deps).length),
      devCount: String(Object.keys(devDeps).length)
    };

    // 3. Call AI with admin prompt (or fallback)
    console.log('');
    console.log(`   ╔══════════════════════════════════════════════╗`);
    console.log(`   ║ 📋 분석 대상: package.json 의존성           ║`);
    console.log(`   ║ 📦 prod: ${Object.keys(packageJson.dependencies || {}).length}개 + dev: ${Object.keys(packageJson.devDependencies || {}).length}개 패키지       ║`);
    console.log(`   ╚══════════════════════════════════════════════╝`);
    console.log(`   🧠 Calling AI for dependency analysis...`);
    let aiResponse: string;
    
    try {
      aiResponse = await this.callAIWithConfig(contextData);
    } catch (e) {
      console.log(`   ⚠️ ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.log(`   📝 Using fallback prompt...`);
      
      const systemPrompt = `You are a dependency analyst. Analyze these npm packages for: outdated versions, security vulnerabilities, license issues, unnecessary dependencies. Respond in JSON: {"issues": [{"severity": "HIGH|MEDIUM|LOW", "package": "...", "type": "OUTDATED|SECURITY|LICENSE|UNUSED", "description": "...", "suggestion": "..."}], "summary": "..."}. Respond only in Korean.`;
      const userPrompt = `Analyze dependencies: ${contextData.dependencies}`;
      aiResponse = await this.callAI(systemPrompt, userPrompt);
    }

    // 4. Parse response
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
      analysisResult = { issues: [], summary: "Dependency scan completed" };
    }

    // 5. Save results
    const agentExecution = await prisma.agentExecution.findUnique({ 
      where: { id: task.agentExecutionId } 
    });

    if (agentExecution && analysisResult.issues) {
      for (const issue of analysisResult.issues) {
        await prisma.analysisResult.create({
          data: {
            executeId: agentExecution.executeId,
            category: "DEPENDENCY",
            severity: issue.severity || "MEDIUM",
            message: issue.description || `${issue.package}: ${issue.type}`,
            suggestion: issue.suggestion,
            confidenceScore: 0.8,
          }
        });
      }
      console.log(`   💾 Saved ${analysisResult.issues.length} dependency issues`);
    }

    return {
      dependenciesAnalyzed: dependencies.length,
      issuesFound: analysisResult.issues?.length || 0,
      summary: analysisResult.summary
    };
  }
}
