import { AgentTask } from "@prisma/client";
import { prisma } from "@/lib/db";
import { aiModelService, ChatMessage } from "@/lib/ai-model-service";

export interface AnalysisContext {
  projectId: string;
  files: string[]; // List of file paths to analyze
}

export abstract class BaseAgent {
  abstract name: string;
  abstract description: string;

  /**
   * Main entry point for the agent to perform analysis.
   */
  async runFullAnalysis(projectId: string): Promise<void> {
    console.log(`[${this.name}] Starting full analysis for project ${projectId}`);
    // implementation would go here
  }

  /**
   * Processes a specific task assigned to this agent.
   */
  async processTask(task: AgentTask): Promise<any> {
    const taskStart = Date.now();
    console.log('');
    console.log(`🤖 [${this.name}] ───────────────────────────────────`);
    console.log(`   📋 Task ID: ${task.id.slice(0, 8)}...`);
    console.log(`   🎯 Target: ${task.target}`);
    
    // 1. Update status to RUNNING
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { 
        status: "RUNNING", 
        startedAt: new Date() 
      },
    });

    try {
      console.log(`   ⏳ Executing analysis...`);
      const result = await this.execute(task);
      
      const duration = Date.now() - taskStart;
      
      // 2. Update status to COMPLETED
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { 
          status: "COMPLETED", 
          completedAt: new Date(),
          resultSummary: JSON.stringify(result) 
        },
      });
      
      console.log(`   ✅ Completed in ${duration}ms`);
      console.log(`   📊 Result: ${typeof result === 'object' ? `${Object.keys(result).length} fields` : 'OK'}`);
      console.log('');
      
      return result;

    } catch (error: any) {
      const duration = Date.now() - taskStart;
      console.error(`   ❌ Failed after ${duration}ms: ${error.message}`);
      
      // 3. Update status to FAILED
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { 
          status: "FAILED", 
          errorMessage: error.message,
          completedAt: new Date() 
        },
      });
      throw error;
    }
  }

  /**
   * Call the configured AI model for analysis.
   * Uses the default AI model set in admin (Ollama qwen3:8b or OpenAI, etc.)
   */
  protected async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const aiStart = Date.now();
    console.log(`   🧠 Calling AI model...`);
    console.log(`      System prompt: ${systemPrompt.slice(0, 60)}...`);
    console.log(`      User prompt: ${userPrompt.length} chars`);
    
    try {
      const response = await aiModelService.chatCompletion({ messages });
      const duration = Date.now() - aiStart;
      console.log(`   🧠 AI responded in ${duration}ms (${response.length} chars)`);
      return response;
    } catch (error) {
      console.error(`   🧠 AI call failed:`, error);
      throw error;
    }
  }

  /**
   * Get the current default AI model info
   */
  protected async getAIModelInfo(): Promise<{ name: string; provider: string } | null> {
    const model = await aiModelService.getDefaultModel();
    if (model) {
      return { name: model.name, provider: model.provider };
    }
    return null;
  }

  /**
   * The core logic to be implemented by subclasses.
   */
  protected abstract execute(task: AgentTask): Promise<any>;
}

