"use client";

import { motion } from "framer-motion";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  PlayCircle, 
  XCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  score?: number | null;
  lastAnalysis?: Date | string | null;
  criticalCount?: number;
  highCount?: number;
  onAnalyze?: () => void;
  onClick?: () => void;
}

const statusConfig = {
  PENDING: {
    color: "bg-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-800/50",
    borderColor: "border-gray-200 dark:border-gray-700",
    icon: Clock,
    label: "대기"
  },
  RUNNING: {
    color: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-300 dark:border-blue-700",
    icon: Activity,
    label: "분석중"
  },
  COMPLETED: {
    color: "bg-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-300 dark:border-green-700",
    icon: CheckCircle,
    label: "완료"
  },
  FAILED: {
    color: "bg-red-500",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-300 dark:border-red-700",
    icon: XCircle,
    label: "실패"
  }
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getScoreGradient(score: number): string {
  if (score >= 80) return "from-green-500 to-emerald-400";
  if (score >= 60) return "from-yellow-500 to-amber-400";
  if (score >= 40) return "from-orange-500 to-amber-500";
  return "from-red-500 to-rose-400";
}

export default function ProjectCard({
  id,
  name,
  description,
  status,
  score,
  lastAnalysis,
  criticalCount = 0,
  highCount = 0,
  onAnalyze,
  onClick
}: ProjectCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const hasRisk = criticalCount > 0 || highCount > 0;

  return (
    <motion.div
      className={`relative p-5 rounded-xl border-2 shadow-sm hover:shadow-lg transition-all cursor-pointer ${config.bgColor} ${config.borderColor}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      {/* Risk Indicator */}
      {hasRisk && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-md">
          <AlertTriangle className="w-3 h-3" />
          {criticalCount > 0 && <span>{criticalCount} Critical</span>}
          {criticalCount > 0 && highCount > 0 && <span>·</span>}
          {highCount > 0 && <span>{highCount} High</span>}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {name}
          </h3>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
              {description}
            </p>
          )}
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-medium ${config.color}`}>
          <StatusIcon className={`w-4 h-4 ${status === "RUNNING" ? "animate-spin" : ""}`} />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Score */}
      {score !== null && score !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">분석 점수</span>
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${getScoreGradient(score)}`}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          {lastAnalysis ? (
            <span>
              {new Date(lastAnalysis).toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          ) : (
            <span>분석 기록 없음</span>
          )}
        </div>

        {onAnalyze && status !== "RUNNING" && (
          <motion.button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onAnalyze();
            }}
          >
            <PlayCircle className="w-4 h-4" />
            재분석
          </motion.button>
        )}

        {status === "RUNNING" && (
          <div className="flex items-center gap-2 text-sm text-blue-500">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>분석 진행중...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
