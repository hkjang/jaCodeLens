"use client";

import { motion } from "framer-motion";
import { 
  Clock, 
  Zap, 
  Calendar,
  ChevronRight,
  AlertTriangle,
  TrendingUp
} from "lucide-react";

interface PriorityItem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  priority: "short" | "medium" | "long"; // Short-term, Medium-term, Long-term
  estimatedHours?: number;
  impact?: string;
  filePath?: string;
  onClick?: () => void;
}

interface PriorityTableProps {
  items: PriorityItem[];
  onItemClick?: (item: PriorityItem) => void;
}

const priorityConfig = {
  short: {
    label: "단기",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: Zap
  },
  medium: {
    label: "중기",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: Clock
  },
  long: {
    label: "장기",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Calendar
  }
};

const severityBadges = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-blue-500 text-white"
};

export default function PriorityTable({ items, onItemClick }: PriorityTableProps) {
  const groupedItems = {
    short: items.filter(i => i.priority === "short"),
    medium: items.filter(i => i.priority === "medium"),
    long: items.filter(i => i.priority === "long")
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        개선 우선순위
      </h3>

      <div className="space-y-6">
        {(["short", "medium", "long"] as const).map((priority) => {
          const config = priorityConfig[priority];
          const Icon = config.icon;
          const priorityItems = groupedItems[priority];

          return (
            <div key={priority}>
              {/* Priority Header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} ${config.borderColor} border mb-3`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className={`font-medium ${config.color}`}>
                  {config.label} 개선 ({priorityItems.length})
                </span>
              </div>

              {/* Items */}
              {priorityItems.length > 0 ? (
                <div className="space-y-2">
                  {priorityItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        onItemClick?.(item);
                        item.onClick?.();
                      }}
                    >
                      {/* Severity Badge */}
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${severityBadges[item.severity]}`}>
                        {item.severity.toUpperCase()}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                          {item.description}
                        </p>
                        {item.filePath && (
                          <p className="text-xs text-gray-400 font-mono mt-2 truncate">
                            {item.filePath}
                          </p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-col items-end gap-1">
                        {item.estimatedHours && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ~{item.estimatedHours}h
                          </span>
                        )}
                        {item.impact && (
                          <span className="text-xs text-green-500 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {item.impact}
                          </span>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  {config.label} 개선 항목 없음
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">총 개선 항목</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {items.length}개
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-500">예상 총 소요시간</span>
          <span className="font-bold text-gray-900 dark:text-white">
            ~{items.reduce((sum, i) => sum + (i.estimatedHours || 0), 0)}시간
          </span>
        </div>
      </div>
    </div>
  );
}
