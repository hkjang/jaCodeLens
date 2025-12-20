"use client";

import { motion } from "framer-motion";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  FileSearch,
  BarChart3,
  Shield,
  Code,
  Palette,
  TestTube2,
  ChevronRight,
  Timer
} from "lucide-react";

interface AgentCardProps {
  id: string;
  name: string;
  role: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: Date | string;
  completedAt?: Date | string;
  taskCount?: number;
  completedTaskCount?: number;
  issuesFound?: number;
  isBottleneck?: boolean;
  onClick?: () => void;
}

const agentIcons: Record<string, React.ReactNode> = {
  StructureAnalysisAgent: <FileSearch className="w-6 h-6" />,
  QualityAnalysisAgent: <BarChart3 className="w-6 h-6" />,
  SecurityAnalysisAgent: <Shield className="w-6 h-6" />,
  DependencyAnalysisAgent: <Code className="w-6 h-6" />,
  StyleAnalysisAgent: <Palette className="w-6 h-6" />,
  TestAnalysisAgent: <TestTube2 className="w-6 h-6" />,
};

const statusConfig = {
  pending: {
    bgColor: "bg-gray-100 dark:bg-gray-800",
    borderColor: "border-gray-300 dark:border-gray-600",
    iconBg: "bg-gray-400",
    textColor: "text-gray-600 dark:text-gray-400",
    statusIcon: Clock,
    statusLabel: "대기"
  },
  running: {
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-300 dark:border-blue-700",
    iconBg: "bg-blue-500",
    textColor: "text-blue-600 dark:text-blue-400",
    statusIcon: Activity,
    statusLabel: "실행중"
  },
  completed: {
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-300 dark:border-green-700",
    iconBg: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
    statusIcon: CheckCircle,
    statusLabel: "완료"
  },
  failed: {
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-300 dark:border-red-700",
    iconBg: "bg-red-500",
    textColor: "text-red-600 dark:text-red-400",
    statusIcon: XCircle,
    statusLabel: "실패"
  }
};

function formatDuration(start?: Date | string, end?: Date | string): string {
  if (!start) return "-";
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const durationMs = endTime - startTime;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) return `${minutes}분 ${seconds % 60}초`;
  return `${seconds}초`;
}

export default function AgentCard({
  id,
  name,
  role,
  status,
  startedAt,
  completedAt,
  taskCount = 0,
  completedTaskCount = 0,
  issuesFound = 0,
  isBottleneck = false,
  onClick
}: AgentCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.statusIcon;
  const isRunning = status === "running";
  const progress = taskCount > 0 ? (completedTaskCount / taskCount) * 100 : 0;

  return (
    <motion.div
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${config.bgColor} ${config.borderColor}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
    >
      {/* Bottleneck Badge */}
      {isBottleneck && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full shadow-md">
          <AlertTriangle className="w-3 h-3" />
          병목
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Agent Icon */}
        <div className={`flex-shrink-0 p-3 rounded-xl ${config.iconBg} text-white`}>
          {agentIcons[name] || <Code className="w-6 h-6" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 dark:text-white truncate">
            {name.replace("Agent", "")}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {role}
          </p>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.textColor} bg-white dark:bg-gray-800 border ${config.borderColor}`}>
          <StatusIcon className={`w-3 h-3 ${isRunning ? "animate-spin" : ""}`} />
          <span>{config.statusLabel}</span>
        </div>
      </div>

      {/* Task Progress */}
      {taskCount > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">작업 진행률</span>
            <span className={config.textColor}>{completedTaskCount}/{taskCount}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${config.iconBg}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        {/* Duration */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Timer className="w-4 h-4" />
          <span>{formatDuration(startedAt, completedAt)}</span>
        </div>

        {/* Issues Found */}
        {status === "completed" && issuesFound > 0 && (
          <div className="flex items-center gap-1 text-sm text-orange-500">
            <AlertTriangle className="w-4 h-4" />
            <span>{issuesFound}개 이슈</span>
          </div>
        )}

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </motion.div>
  );
}
