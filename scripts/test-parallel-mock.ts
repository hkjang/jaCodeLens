import { AgentOrchestrator } from "@/lib/orchestrator";
import { setPrisma } from "@/lib/db";
import { StructureAnalysisAgent } from "@/lib/agents/structure-agent";
import { QualityAnalysisAgent } from "@/lib/agents/quality-agent";
import { SecurityAnalysisAgent } from "@/lib/agents/security-agent";
import { DependencyAnalysisAgent } from "@/lib/agents/dependency-agent";
import { StyleAnalysisAgent } from "@/lib/agents/style-agent";
import { TestAnalysisAgent } from "@/lib/agents/test-agent";
import { ResultAggregator } from "@/lib/aggregator";

// Mock Store
const store = {
  projects: [] as any[],
  executions: [] as any[],
  agentExecutions: [] as any[],
  tasks: [] as any[],
  results: [] as any[],
};

const mockPrisma = {
  project: {
    findUnique: async (args: any) => store.projects.find(p => p.id === args.where.id),
    findFirst: async (args: any) => store.projects[0],
    create: async (args: any) => {
      const p = { id: "p1", ...args.data };
      store.projects.push(p);
      return p;
    },
  },
  analysisExecute: {
    create: async (args: any) => {
      const e = { id: `exec-${Date.now()}`, results: [], agentExecutions: [], ...args.data };
      store.executions.push(e);
      return e;
    },
    update: async (args: any) => {
      const e = store.executions.find(x => x.id === args.where.id);
      Object.assign(e, args.data);
      return e;
    },
    findUnique: async (args: any) => {
        const e = store.executions.find(x => x.id === args.where.id);
        if(e) {
            e.results = store.results.filter(r => r.executeId === e.id);
        }
        return e;
    }
  },
  agentExecution: {
    create: async (args: any) => {
      const ae = { id: `ae-${store.agentExecutions.length}`, ...args.data };
      store.agentExecutions.push(ae);
      return ae;
    },
    update: async (args: any) => {
      const ae = store.agentExecutions.find(x => x.id === args.where.id);
      Object.assign(ae, args.data);
      return ae;
    },
    findMany: async (args: any) => store.agentExecutions.filter(ae => ae.executeId === args.where.executeId),
    findUnique: async (args: any) => store.agentExecutions.find(ae => ae.id === args.where.id),
  },
  agentTask: {
    create: async (args: any) => {
      const t = { id: `t-${store.tasks.length}`, ...args.data };
      store.tasks.push(t);
      return t;
    },
    update: async (args: any) => {
      const t = store.tasks.find(x => x.id === args.where.id);
      Object.assign(t, args.data);
      return t;
    },
    findMany: async (args: any) => store.tasks.filter(t => t.agentExecutionId === args.where.agentExecutionId && t.status === args.where.status),
    count: async (args: any) => store.tasks.filter(t => t.agentExecutionId === args.where.agentExecutionId && (args.where.status?.in ? args.where.status.in.includes(t.status) : t.status === args.where.status)).length,
  },
  analysisResult: {
    create: async (args: any) => {
       const r = { id: `res-${store.results.length}`, ...args.data };
       store.results.push(r);
       return r;
    }
  }
};

// Inject Mock
setPrisma(mockPrisma);

async function main() {
  console.log("Starting MOCKED Integration Test...");

  // 1. Setup Mock Project
  const project = await mockPrisma.project.create({
    data: {
      name: "Mock Project",
      path: "/tmp/mock",
      type: "NEXTJS",
    },
  });
  console.log(`Created test project: ${project.id}`);

  // 2. Initialize Orchestrator
  const orchestrator = new AgentOrchestrator();
  const agentNames = [
    "StructureAnalysisAgent",
    "QualityAnalysisAgent",
    "SecurityAnalysisAgent",
    "DependencyAnalysisAgent",
    "StyleAnalysisAgent",
    "TestAnalysisAgent"
  ];
  
  const execution = await orchestrator.startAnalysis(project.id, agentNames);
  console.log(`Started execution: ${execution.id}`);

  // 3. Dispatch
  await orchestrator.dispatchPendingAgents(execution.id);

  // 4. Run Agents
  const agents = {
    "StructureAnalysisAgent": new StructureAnalysisAgent(),
    "QualityAnalysisAgent": new QualityAnalysisAgent(),
    "SecurityAnalysisAgent": new SecurityAnalysisAgent(),
    "DependencyAnalysisAgent": new DependencyAnalysisAgent(),
    "StyleAnalysisAgent": new StyleAnalysisAgent(),
    "TestAnalysisAgent": new TestAnalysisAgent(),
  };

  const agentExecutions = await mockPrisma.agentExecution.findMany({
    where: { executeId: execution.id }
  });

  for (const agentExec of agentExecutions) {
    const tasks = await mockPrisma.agentTask.findMany({
      where: { agentExecutionId: agentExec.id, status: "QUEUED" }
    });
    
    for (const task of tasks) {
        const agentInstance = agents[agentExec.agentName as keyof typeof agents];
        await agentInstance.processTask(task);
        await orchestrator.completeTask(task.id, "COMPLETED");
    }
  }

  // 5. Aggregation
  const aggregator = new ResultAggregator();
  await aggregator.aggregateResults(execution.id);

  // 6. Verification
  const finalExecution = await mockPrisma.analysisExecute.findUnique({
      where: { id: execution.id }
  });

  console.log("Final Status:", finalExecution.status);
  console.log("Score:", finalExecution.score);
  console.log("Results Generated:", store.results.length);
  
  if (finalExecution.status === "COMPLETED" && store.results.length > 0) {
      console.log("MOCK TEST PASSED");
  } else {
      console.log("MOCK TEST FAILED");
      process.exit(1);
  }
}

main().catch(console.error);
