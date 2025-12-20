"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Timer,
  FileText,
  Cpu,
  Zap,
  TrendingUp,
  ListChecks
} from "lucide-react";

interface AgentTask {
  id: string;
  target: string;
  status: "pending" | "running" | "completed" | "failed";
  duration?: number;
  error?: string;
}

interface AgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: {
    id: string;
    name: string;
    role: string;
    status: "pending" | "running" | "completed" | "failed";
    startedAt?: Date | string;
    completedAt?: Date | string;
    durationMs?: number;
    tokensUsed?: number;
    tasks?: AgentTask[];
    issuesFound?: number;
    resultSummary?: string;
  } | null;
}

const statusConfig = {
  pending: { color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800", icon: Clock },
  running: { color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", icon: Activity },
  completed: { color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle },
  failed: { color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle }
};

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}분 ${seconds % 60}초`;
  return `${seconds}초`;
}

export default function AgentDetailModal({ isOpen, onClose, agent }: AgentDetailModalProps) {
  if (!agent) return null;

  const config = statusConfig[agent.status];
  const StatusIcon = config.icon;
  const isRunning = agent.status === "running";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-6 ${config.bg}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-white dark:bg-gray-700 shadow-md`}>
                      <StatusIcon className={`w-8 h-8 ${config.color} ${isRunning ? "animate-spin" : ""}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {agent.name.replace("Agent", "")}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400">{agent.role}</p>
                    </div>
                  </div>
                  <button
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    onClick={onClose}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                      <Timer className="w-4 h-4" />
                      <span className="text-sm">소요 시간</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatDuration(agent.durationMs)}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                      <ListChecks className="w-4 h-4" />
                      <span className="text-sm">작업 수</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {agent.tasks?.length || 0}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">토큰 사용</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {agent.tokensUsed?.toLocaleString() || "-"}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">이슈 발견</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {agent.issuesFound || 0}
                    </div>
                  </div>
                </div>

                {/* Result Summary */}
                {agent.resultSummary && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      결과 요약
                    </h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-700 dark:text-gray-300">
                      {agent.resultSummary}
                    </div>
                  </div>
                )}

                {/* Tasks List */}
                {agent.tasks && agent.tasks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <ListChecks className="w-5 h-5" />
                      작업 목록
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {agent.tasks.map((task) => {
                        const taskConfig = statusConfig[task.status];
                        const TaskIcon = taskConfig.icon;

                        return (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 p-3 rounded-lg ${taskConfig.bg}`}
                          >
                            <TaskIcon className={`w-4 h-4 ${taskConfig.color} ${task.status === "running" ? "animate-spin" : ""}`} />
                            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                              {task.target}
                            </span>
                            {task.duration && (
                              <span className="text-xs text-gray-500">
                                {formatDuration(task.duration)}
                              </span>
                            )}
                            {task.error && (
                              <span className="text-xs text-red-500 truncate max-w-32" title={task.error}>
                                {task.error}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={onClose}
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
