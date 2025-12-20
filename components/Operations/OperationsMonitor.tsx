"use client";

import { motion } from "framer-motion";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Cpu,
  HardDrive,
  Zap,
  RefreshCw,
  Timer,
  TrendingUp,
  BarChart3
} from "lucide-react";

interface AgentHealth {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastHeartbeat?: Date | string;
  throughput?: number; // tasks per minute
  avgLatency?: number; // ms
  failureRate?: number; // percentage
  errorCount?: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

interface OperationsMonitorProps {
  agents: AgentHealth[];
  systemStats?: {
    totalCpuUsage: number;
    totalMemoryUsage: number;
    gpuUsage?: number;
    queueSize?: number;
  };
  onRestartAgent?: (agentId: string) => void;
}

const statusConfig = {
  healthy: {
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-300 dark:border-green-700",
    icon: CheckCircle,
    label: "정상"
  },
  degraded: {
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    icon: AlertTriangle,
    label: "지연"
  },
  unhealthy: {
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-300 dark:border-red-700",
    icon: XCircle,
    label: "비정상"
  }
};

function formatTimeAgo(date?: Date | string): string {
  if (!date) return "-";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) return `${diffSecs}초 전`;
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}분 전`;
  return `${Math.floor(diffSecs / 3600)}시간 전`;
}

function UsageBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className={value > 80 ? "text-red-500 font-medium" : "text-gray-400"}>
          {value.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} ${value > 80 ? "animate-pulse" : ""}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

export default function OperationsMonitor({
  agents,
  systemStats,
  onRestartAgent
}: OperationsMonitorProps) {
  const healthyCount = agents.filter(a => a.status === "healthy").length;
  const degradedCount = agents.filter(a => a.status === "degraded").length;
  const unhealthyCount = agents.filter(a => a.status === "unhealthy").length;

  return (
    <div className="space-y-6">
      {/* System Overview */}
      {systemStats && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            시스템 리소스
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <UsageBar 
                value={systemStats.totalCpuUsage} 
                label="CPU" 
                color="bg-blue-500" 
              />
            </div>
            <div className="space-y-2">
              <UsageBar 
                value={systemStats.totalMemoryUsage} 
                label="Memory" 
                color="bg-purple-500" 
              />
            </div>
            {systemStats.gpuUsage !== undefined && (
              <div className="space-y-2">
                <UsageBar 
                  value={systemStats.gpuUsage} 
                  label="GPU" 
                  color="bg-green-500" 
                />
              </div>
            )}
            {systemStats.queueSize !== undefined && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">대기열</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {systemStats.queueSize}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent Health Summary */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            에이전트 상태
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-500">정상 {healthyCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-500">지연 {degradedCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-500">비정상 {unhealthyCount}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {agents.map((agent, index) => {
            const config = statusConfig[agent.status];
            const Icon = config.icon;

            return (
              <motion.div
                key={agent.id}
                className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  {/* Agent Info */}
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color} ${agent.status === "degraded" ? "animate-pulse" : ""}`} />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {agent.name.replace("Agent", "")}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Timer className="w-3 h-3" />
                        <span>마지막 신호: {formatTimeAgo(agent.lastHeartbeat)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6">
                    {agent.throughput !== undefined && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">처리량</div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {agent.throughput}/min
                        </div>
                      </div>
                    )}
                    {agent.avgLatency !== undefined && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">평균 지연</div>
                        <div className={`text-sm font-medium ${agent.avgLatency > 5000 ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}>
                          {agent.avgLatency}ms
                        </div>
                      </div>
                    )}
                    {agent.failureRate !== undefined && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">실패율</div>
                        <div className={`text-sm font-medium ${agent.failureRate > 5 ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}>
                          {agent.failureRate.toFixed(1)}%
                        </div>
                      </div>
                    )}

                    {/* Restart Button */}
                    {agent.status === "unhealthy" && onRestartAgent && (
                      <motion.button
                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onRestartAgent(agent.id)}
                        title="에이전트 재시작"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Resource Usage (if available) */}
                {(agent.cpuUsage !== undefined || agent.memoryUsage !== undefined) && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {agent.cpuUsage !== undefined && (
                      <UsageBar value={agent.cpuUsage} label="CPU" color="bg-blue-400" />
                    )}
                    {agent.memoryUsage !== undefined && (
                      <UsageBar value={agent.memoryUsage} label="Memory" color="bg-purple-400" />
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
