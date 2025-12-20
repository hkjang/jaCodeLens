"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Activity,
  BarChart3,
  Shield,
  Code,
  FileSearch,
  TestTube2,
  Palette
} from "lucide-react";

interface AgentStatus {
  id: string;
  agentName: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  startedAt?: Date;
  completedAt?: Date;
  taskCount: number;
  completedTaskCount: number;
}

interface ExecutionStatus {
  id: string;
  projectName: string;
  status: string;
  score: number | null;
  startedAt: Date;
  agents: AgentStatus[];
}

const agentIcons: Record<string, React.ReactNode> = {
  StructureAnalysisAgent: <FileSearch className="w-5 h-5" />,
  QualityAnalysisAgent: <BarChart3 className="w-5 h-5" />,
  SecurityAnalysisAgent: <Shield className="w-5 h-5" />,
  DependencyAnalysisAgent: <Code className="w-5 h-5" />,
  StyleAnalysisAgent: <Palette className="w-5 h-5" />,
  TestAnalysisAgent: <TestTube2 className="w-5 h-5" />,
};

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-500",
  RUNNING: "bg-blue-500",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-4 h-4" />,
  RUNNING: <Activity className="w-4 h-4 animate-pulse" />,
  COMPLETED: <CheckCircle className="w-4 h-4" />,
  FAILED: <XCircle className="w-4 h-4" />,
};

export default function AgentStatusDashboard({ executionId }: { executionId: string }) {
  const [execution, setExecution] = useState<ExecutionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/analysis/${executionId}/status`);
        if (!res.ok) throw new Error("Failed to fetch status");
        const data = await res.json();
        setExecution(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    
    // Poll every 3 seconds if not completed
    const interval = setInterval(() => {
      if (execution?.status !== "COMPLETED" && execution?.status !== "FAILED") {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [executionId, execution?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading analysis status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <span className="text-red-700 dark:text-red-300">{error}</span>
      </div>
    );
  }

  if (!execution) return null;

  const completedAgents = execution.agents.filter((a) => a.status === "COMPLETED").length;
  const totalAgents = execution.agents.length;
  const progress = totalAgents > 0 ? (completedAgents / totalAgents) * 100 : 0;

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {execution.projectName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Execution ID: {execution.id.slice(0, 8)}...
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full text-white font-medium ${statusColors[execution.status]}`}>
          {execution.status}
        </div>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">Overall Progress</span>
          <span className="font-medium">{completedAgents}/{totalAgents} Agents</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Score (if available) */}
      {execution.score !== null && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            {execution.score}
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Quality Score</div>
            <div className="text-xs text-gray-400">0 = Critical Issues, 100 = Perfect</div>
          </div>
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {execution.agents.map((agent) => (
          <motion.div
            key={agent.id}
            className={`p-4 rounded-lg border-2 ${
              agent.status === "RUNNING"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : agent.status === "COMPLETED"
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : agent.status === "FAILED"
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusColors[agent.status]} text-white`}>
                {agentIcons[agent.agentName] || <Code className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {agent.agentName.replace("Agent", "")}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  {statusIcons[agent.status]}
                  <span>{agent.status}</span>
                </div>
              </div>
            </div>

            {/* Task Progress */}
            {agent.taskCount > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Tasks: {agent.completedTaskCount}/{agent.taskCount}
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${statusColors[agent.status]}`}
                    style={{
                      width: `${(agent.completedTaskCount / agent.taskCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-400 text-right">
        Started: {new Date(execution.startedAt).toLocaleString()}
      </div>
    </div>
  );
}
