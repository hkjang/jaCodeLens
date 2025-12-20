"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  AlertCircle,
  X,
  ChevronRight,
  Clock
} from "lucide-react";
import { useState } from "react";

interface Alert {
  id: string;
  type: "critical" | "high" | "warning" | "info";
  title: string;
  message: string;
  projectName?: string;
  filePath?: string;
  timestamp?: Date | string;
  onDismiss?: () => void;
  onClick?: () => void;
}

interface AlertPanelProps {
  alerts: Alert[];
  maxVisible?: number;
  onViewAll?: () => void;
}

const alertConfig = {
  critical: {
    bgColor: "bg-red-50 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    iconColor: "text-red-600 dark:text-red-400",
    textColor: "text-red-800 dark:text-red-200",
    icon: XCircle,
    label: "Critical"
  },
  high: {
    bgColor: "bg-orange-50 dark:bg-orange-900/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    iconColor: "text-orange-600 dark:text-orange-400",
    textColor: "text-orange-800 dark:text-orange-200",
    icon: ShieldAlert,
    label: "High"
  },
  warning: {
    bgColor: "bg-yellow-50 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/50",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    textColor: "text-yellow-800 dark:text-yellow-200",
    icon: AlertTriangle,
    label: "Warning"
  },
  info: {
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    textColor: "text-blue-800 dark:text-blue-200",
    icon: AlertCircle,
    label: "Info"
  }
};

function AlertItem({ alert, onDismiss }: { alert: Alert; onDismiss?: () => void }) {
  const config = alertConfig[alert.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className={`flex items-start gap-3 p-4 rounded-lg border ${config.bgColor} ${config.borderColor} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={alert.onClick}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 p-2 rounded-lg ${config.iconBg}`}>
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold uppercase ${config.iconColor}`}>
            {config.label}
          </span>
          {alert.projectName && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              • {alert.projectName}
            </span>
          )}
        </div>
        <h4 className={`font-medium ${config.textColor}`}>
          {alert.title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
          {alert.message}
        </p>
        {alert.filePath && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-mono truncate">
            {alert.filePath}
          </p>
        )}
        {alert.timestamp && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(alert.timestamp).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      {(onDismiss || alert.onDismiss) && (
        <button
          className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            (onDismiss || alert.onDismiss)?.();
          }}
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}

      {/* Arrow */}
      {alert.onClick && (
        <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400" />
      )}
    </motion.div>
  );
}

export default function AlertPanel({ alerts, maxVisible = 5, onViewAll }: AlertPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  const visibleAlerts = alerts
    .filter(a => !dismissedIds.has(a.id))
    .slice(0, maxVisible);
  
  const remainingCount = alerts.length - dismissedIds.size - maxVisible;

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  if (visibleAlerts.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
            <ShieldAlert className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <h3 className="font-medium text-gray-700 dark:text-gray-300">
          모든 이슈 해결됨
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          현재 고위험 알림이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            고위험 알림
          </h3>
          <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
            {alerts.length - dismissedIds.size}
          </span>
        </div>
        {onViewAll && remainingCount > 0 && (
          <button
            className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
            onClick={onViewAll}
          >
            +{remainingCount}개 더보기
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Alert List */}
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map(alert => (
          <AlertItem
            key={alert.id}
            alert={alert}
            onDismiss={() => handleDismiss(alert.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
