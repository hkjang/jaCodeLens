"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Loader2,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { useState, useEffect } from "react";

interface ExecutionStep {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt?: Date | string;
  completedAt?: Date | string;
  description?: string;
}

interface AnalysisExecutionViewProps {
  executionId: string;
  projectName: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  steps: ExecutionStep[];
  startedAt?: Date | string;
  completedAt?: Date | string;
  onStop?: () => void;
  onRestart?: () => void;
  children?: React.ReactNode;
}

const stepStatusConfig = {
  pending: {
    color: "bg-gray-300 dark:bg-gray-600",
    icon: Clock,
    textColor: "text-gray-500"
  },
  running: {
    color: "bg-blue-500",
    icon: Loader2,
    textColor: "text-blue-500"
  },
  completed: {
    color: "bg-green-500",
    icon: CheckCircle,
    textColor: "text-green-500"
  },
  failed: {
    color: "bg-red-500",
    icon: XCircle,
    textColor: "text-red-500"
  },
  skipped: {
    color: "bg-gray-400",
    icon: ChevronRight,
    textColor: "text-gray-400"
  }
};

function formatDuration(start?: Date | string, end?: Date | string): string {
  if (!start) return "-";
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const durationMs = endTime - startTime;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default function AnalysisExecutionView({
  executionId,
  projectName,
  status,
  progress,
  steps,
  startedAt,
  completedAt,
  onStop,
  onRestart,
  children
}: AnalysisExecutionViewProps) {
  const [elapsedTime, setElapsedTime] = useState(formatDuration(startedAt, completedAt));
  const isRunning = status === "RUNNING";

  useEffect(() => {
    if (!isRunning || !startedAt) return;
    
    const interval = setInterval(() => {
      setElapsedTime(formatDuration(startedAt, completedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startedAt, completedAt]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {projectName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Execution ID: {executionId.slice(0, 8)}...
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Elapsed Time */}
          <div className="text-right">
            <div className="text-sm text-gray-500">소요 시간</div>
            <div className="text-xl font-mono font-bold text-gray-900 dark:text-white">
              {elapsedTime}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            {isRunning && onStop && (
              <motion.button
                className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStop}
                title="분석 중지"
              >
                <Square className="w-5 h-5" />
              </motion.button>
            )}
            {!isRunning && onRestart && (
              <motion.button
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRestart}
                title="재분석"
              >
                <RotateCcw className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            전체 진행률
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${
              status === "FAILED" 
                ? "bg-red-500" 
                : status === "COMPLETED" 
                  ? "bg-green-500" 
                  : "bg-gradient-to-r from-blue-500 to-cyan-400"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center justify-center mt-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium ${
            status === "PENDING" ? "bg-gray-500" :
            status === "RUNNING" ? "bg-blue-500" :
            status === "COMPLETED" ? "bg-green-500" :
            "bg-red-500"
          }`}>
            {status === "RUNNING" && <Activity className="w-4 h-4 animate-spin" />}
            {status === "COMPLETED" && <CheckCircle className="w-4 h-4" />}
            {status === "FAILED" && <XCircle className="w-4 h-4" />}
            {status === "PENDING" && <Clock className="w-4 h-4" />}
            <span>
              {status === "PENDING" ? "대기중" :
               status === "RUNNING" ? "분석 진행중" :
               status === "COMPLETED" ? "분석 완료" :
               "분석 실패"}
            </span>
          </div>
        </div>
      </div>

      {/* Execution Timeline */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          실행 타임라인
        </h3>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-4">
            <AnimatePresence>
              {steps.map((step, index) => {
                const config = stepStatusConfig[step.status];
                const Icon = config.icon;
                const isActive = step.status === "running";

                return (
                  <motion.div
                    key={step.id}
                    className="relative pl-12"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Timeline Dot */}
                    <div className={`absolute left-3 top-1.5 w-5 h-5 rounded-full ${config.color} flex items-center justify-center ring-4 ring-white dark:ring-gray-800`}>
                      {isActive && (
                        <span className="absolute w-full h-full rounded-full animate-ping bg-blue-400 opacity-75" />
                      )}
                      <Icon className={`w-3 h-3 text-white ${isActive ? "animate-spin" : ""}`} />
                    </div>

                    {/* Step Content */}
                    <div className={`p-4 rounded-lg border ${
                      isActive 
                        ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20" 
                        : step.status === "failed"
                          ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`font-medium ${config.textColor}`}>
                            {step.name}
                          </h4>
                          {step.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {step.description}
                            </p>
                          )}
                        </div>
                        {step.startedAt && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {formatDuration(step.startedAt, step.completedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Additional Content (Parallel Agent Lanes, Logs, etc.) */}
      {children}
    </div>
  );
}
