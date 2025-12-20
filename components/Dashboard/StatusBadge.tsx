"use client";

import { motion } from "framer-motion";
import { Activity, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";

type StatusType = "PENDING" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "TIMED_OUT";

interface StatusBadgeProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, {
  color: string;
  bgColor: string;
  textColor: string;
  icon: typeof Clock;
  label: string;
  labelKo: string;
}> = {
  PENDING: {
    color: "bg-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-600 dark:text-gray-400",
    icon: Clock,
    label: "Pending",
    labelKo: "대기"
  },
  QUEUED: {
    color: "bg-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-600 dark:text-amber-400",
    icon: Loader2,
    label: "Queued",
    labelKo: "큐 대기"
  },
  RUNNING: {
    color: "bg-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-600 dark:text-blue-400",
    icon: Activity,
    label: "Running",
    labelKo: "분석중"
  },
  COMPLETED: {
    color: "bg-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-600 dark:text-green-400",
    icon: CheckCircle,
    label: "Completed",
    labelKo: "완료"
  },
  FAILED: {
    color: "bg-red-500",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-600 dark:text-red-400",
    icon: XCircle,
    label: "Failed",
    labelKo: "실패"
  },
  TIMED_OUT: {
    color: "bg-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-600 dark:text-orange-400",
    icon: Clock,
    label: "Timed Out",
    labelKo: "시간초과"
  }
};

const sizeConfig = {
  sm: {
    padding: "px-2 py-0.5",
    iconSize: "w-3 h-3",
    fontSize: "text-xs",
    dotSize: "w-1.5 h-1.5"
  },
  md: {
    padding: "px-3 py-1",
    iconSize: "w-4 h-4",
    fontSize: "text-sm",
    dotSize: "w-2 h-2"
  },
  lg: {
    padding: "px-4 py-1.5",
    iconSize: "w-5 h-5",
    fontSize: "text-base",
    dotSize: "w-2.5 h-2.5"
  }
};

export default function StatusBadge({
  status,
  size = "md",
  showLabel = true,
  animate = true,
  className = ""
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeStyle = sizeConfig[size];
  const StatusIcon = config.icon;
  const isActive = status === "RUNNING" || status === "QUEUED";

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeStyle.padding} ${sizeStyle.fontSize} ${className}`}
      initial={animate ? { scale: 0.9, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1 } : false}
      transition={{ duration: 0.2 }}
    >
      {/* Animated Dot for Active States */}
      {isActive && (
        <span className="relative flex">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
          <span className={`relative inline-flex rounded-full ${sizeStyle.dotSize} ${config.color}`} />
        </span>
      )}

      {/* Icon */}
      {!isActive && (
        <StatusIcon className={sizeStyle.iconSize} />
      )}

      {/* Label */}
      {showLabel && (
        <span>{config.labelKo}</span>
      )}
    </motion.div>
  );
}

// Compact dot-only status indicator
export function StatusDot({ status, size = "md" }: { status: StatusType; size?: "sm" | "md" | "lg" }) {
  const config = statusConfig[status];
  const dotSizes = { sm: "w-2 h-2", md: "w-3 h-3", lg: "w-4 h-4" };
  const isActive = status === "RUNNING" || status === "QUEUED";

  return (
    <span className="relative flex" title={config.labelKo}>
      {isActive && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full ${dotSizes[size]} ${config.color}`} />
    </span>
  );
}
