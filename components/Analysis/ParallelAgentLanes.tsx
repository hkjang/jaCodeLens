"use client";

import { motion } from "framer-motion";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: Date | string;
  completedAt?: Date | string;
  taskCount?: number;
  completedTaskCount?: number;
  isBottleneck?: boolean;
}

interface ParallelAgentLanesProps {
  agents: Agent[];
  maxDuration?: number; // Maximum duration in ms for scaling
}

const statusConfig = {
  pending: {
    color: "bg-gray-400",
    barColor: "bg-gray-300 dark:bg-gray-600",
    textColor: "text-gray-600 dark:text-gray-400",
    icon: Clock
  },
  running: {
    color: "bg-blue-500",
    barColor: "bg-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
    icon: Activity
  },
  completed: {
    color: "bg-green-500",
    barColor: "bg-green-400",
    textColor: "text-green-600 dark:text-green-400",
    icon: CheckCircle
  },
  failed: {
    color: "bg-red-500",
    barColor: "bg-red-400",
    textColor: "text-red-600 dark:text-red-400",
    icon: XCircle
  }
};

const agentColors = [
  "from-blue-500 to-cyan-400",
  "from-purple-500 to-pink-400",
  "from-green-500 to-emerald-400",
  "from-orange-500 to-yellow-400",
  "from-red-500 to-rose-400",
  "from-indigo-500 to-blue-400",
  "from-teal-500 to-cyan-400",
  "from-fuchsia-500 to-purple-400"
];

function formatDuration(start?: Date | string, end?: Date | string): string {
  if (!start) return "0s";
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const durationMs = endTime - startTime;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function calculateWidth(agent: Agent, maxDuration: number): number {
  if (agent.status === "pending") return 0;
  if (!agent.startedAt) return 0;
  
  const startTime = new Date(agent.startedAt).getTime();
  const endTime = agent.completedAt ? new Date(agent.completedAt).getTime() : Date.now();
  const duration = endTime - startTime;
  
  return Math.min((duration / maxDuration) * 100, 100);
}

export default function ParallelAgentLanes({ agents, maxDuration = 60000 }: ParallelAgentLanesProps) {
  const [tick, setTick] = useState(0);

  // Force re-render for running agents
  useEffect(() => {
    const hasRunning = agents.some(a => a.status === "running");
    if (!hasRunning) return;

    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [agents]);

  // Find bottleneck agent (longest running)
  const runningAgents = agents.filter(a => a.status === "running");
  const bottleneckId = runningAgents.length > 1 
    ? runningAgents.reduce((longest, agent) => {
        const agentStart = agent.startedAt ? new Date(agent.startedAt).getTime() : 0;
        const longestStart = longest.startedAt ? new Date(longest.startedAt).getTime() : 0;
        return agentStart < longestStart ? agent : longest;
      }, runningAgents[0])?.id
    : null;

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            병렬 에이전트 실행
          </h3>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-gray-500">대기</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-gray-500">실행중</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-500">완료</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-500">실패</span>
          </div>
        </div>
      </div>

      {/* Lanes */}
      <div className="space-y-3">
        {agents.map((agent, index) => {
          const config = statusConfig[agent.status];
          const Icon = config.icon;
          const isRunning = agent.status === "running";
          const isBottleneck = agent.id === bottleneckId || agent.isBottleneck;
          const width = calculateWidth(agent, maxDuration);
          const colorGradient = agentColors[index % agentColors.length];

          return (
            <motion.div
              key={agent.id}
              className={`relative p-3 rounded-lg border ${
                isBottleneck 
                  ? "border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20" 
                  : "border-gray-200 dark:border-gray-700"
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Bottleneck Badge */}
              {isBottleneck && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  병목
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${config.color}`}>
                    <Icon className={`w-4 h-4 text-white ${isRunning ? "animate-spin" : ""}`} />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {agent.name.replace("Agent", "")}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  {/* Task Progress */}
                  {agent.taskCount !== undefined && agent.taskCount > 0 && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {agent.completedTaskCount || 0}/{agent.taskCount} tasks
                    </span>
                  )}
                  
                  {/* Duration */}
                  <span className={`font-mono ${config.textColor}`}>
                    {formatDuration(agent.startedAt, agent.completedAt)}
                  </span>
                </div>
              </div>

              {/* Progress Lane */}
              <div className="relative h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute left-0 top-0 h-full bg-gradient-to-r ${colorGradient} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.5 }}
                />
                
                {/* Animated stripes for running */}
                {isRunning && (
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <div 
                      className="w-full h-full"
                      style={{
                        background: `repeating-linear-gradient(
                          -45deg,
                          transparent,
                          transparent 10px,
                          rgba(255,255,255,0.1) 10px,
                          rgba(255,255,255,0.1) 20px
                        )`,
                        animation: "slide 1s linear infinite"
                      }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* No agents message */}
      {agents.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>에이전트 대기중...</p>
        </div>
      )}

      <style jsx>{`
        @keyframes slide {
          from { transform: translateX(-20px); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
