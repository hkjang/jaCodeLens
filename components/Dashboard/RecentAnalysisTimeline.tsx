"use client";

import { motion } from "framer-motion";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity,
  ChevronRight,
  FileSearch
} from "lucide-react";

interface AnalysisEvent {
  id: string;
  projectName: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  score?: number | null;
  startedAt: Date | string;
  completedAt?: Date | string | null;
  agentCount?: number;
  issueCount?: number;
  onClick?: () => void;
}

interface RecentAnalysisTimelineProps {
  events: AnalysisEvent[];
  maxItems?: number;
  onViewAll?: () => void;
}

const statusConfig = {
  PENDING: {
    color: "bg-gray-400",
    icon: Clock,
    label: "대기"
  },
  RUNNING: {
    color: "bg-blue-500",
    icon: Activity,
    label: "진행중"
  },
  COMPLETED: {
    color: "bg-green-500",
    icon: CheckCircle,
    label: "완료"
  },
  FAILED: {
    color: "bg-red-500",
    icon: XCircle,
    label: "실패"
  }
};

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return then.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function formatDuration(start: Date | string, end?: Date | string | null): string {
  if (!end) return "진행중...";
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const durationMs = endTime - startTime;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

export default function RecentAnalysisTimeline({ 
  events, 
  maxItems = 5,
  onViewAll 
}: RecentAnalysisTimelineProps) {
  const displayEvents = events.slice(0, maxItems);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            최근 분석
          </h3>
        </div>
        {onViewAll && events.length > maxItems && (
          <button
            className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
            onClick={onViewAll}
          >
            전체보기
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Events */}
        <div className="space-y-4">
          {displayEvents.map((event, index) => {
            const config = statusConfig[event.status];
            const StatusIcon = config.icon;
            const isActive = event.status === "RUNNING";

            return (
              <motion.div
                key={event.id}
                className="relative pl-10 group cursor-pointer"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={event.onClick}
              >
                {/* Timeline Dot */}
                <div 
                  className={`absolute left-2 top-2 w-4 h-4 rounded-full ${config.color} flex items-center justify-center ring-4 ring-white dark:ring-gray-900`}
                >
                  {isActive && (
                    <span className="absolute w-full h-full rounded-full animate-ping bg-blue-400 opacity-75" />
                  )}
                </div>

                {/* Event Card */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 group-hover:shadow-md group-hover:border-blue-300 dark:group-hover:border-blue-700 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {event.projectName}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
                          <StatusIcon className={`w-3 h-3 ${isActive ? "animate-spin" : ""}`} />
                          {config.label}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(event.startedAt)}
                        {event.completedAt && (
                          <span className="ml-2">
                            • 소요시간: {formatDuration(event.startedAt, event.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    {event.score !== null && event.score !== undefined && (
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          event.score >= 80 ? "text-green-500" :
                          event.score >= 60 ? "text-yellow-500" :
                          event.score >= 40 ? "text-orange-500" :
                          "text-red-500"
                        }`}>
                          {event.score}
                        </div>
                        <div className="text-xs text-gray-400">점수</div>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {(event.agentCount || event.issueCount !== undefined) && (
                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-sm">
                      {event.agentCount && (
                        <div className="text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {event.agentCount}
                          </span>
                          개 에이전트
                        </div>
                      )}
                      {event.issueCount !== undefined && (
                        <div className="text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {event.issueCount}
                          </span>
                          개 이슈
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow on hover */}
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>아직 분석 기록이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
