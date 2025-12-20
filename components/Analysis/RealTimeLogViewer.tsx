"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  Filter, 
  Download,
  ChevronDown,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Search
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface LogEntry {
  id: string;
  timestamp: Date | string;
  level: "info" | "warning" | "error" | "debug";
  agentName: string;
  message: string;
}

interface RealTimeLogViewerProps {
  logs: LogEntry[];
  agents: string[];
  autoScroll?: boolean;
  maxHeight?: string;
  onExport?: () => void;
}

const levelConfig = {
  info: {
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    icon: Info
  },
  warning: {
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    icon: AlertTriangle
  },
  error: {
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    icon: XCircle
  },
  debug: {
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    icon: Terminal
  }
};

const agentColors: Record<string, string> = {
  StructureAnalysisAgent: "text-blue-400",
  QualityAnalysisAgent: "text-green-400",
  SecurityAnalysisAgent: "text-red-400",
  DependencyAnalysisAgent: "text-purple-400",
  StyleAnalysisAgent: "text-pink-400",
  TestAnalysisAgent: "text-cyan-400",
  default: "text-gray-400"
};

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3
  });
}

export default function RealTimeLogViewer({
  logs,
  agents,
  autoScroll = true,
  maxHeight = "400px",
  onExport
}: RealTimeLogViewerProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (selectedAgent !== "all" && log.agentName !== selectedAgent) return false;
    if (selectedLevel !== "all" && log.level !== selectedLevel) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-white">실시간 로그</h3>
          <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
            {filteredLogs.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Agent Filter */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white hover:bg-gray-600 transition-colors"
              onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
            >
              <Filter className="w-4 h-4" />
              {selectedAgent === "all" ? "All Agents" : selectedAgent.replace("Agent", "")}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {isAgentDropdownOpen && (
                <motion.div
                  className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                      selectedAgent === "all" ? "text-blue-400" : "text-gray-300"
                    }`}
                    onClick={() => {
                      setSelectedAgent("all");
                      setIsAgentDropdownOpen(false);
                    }}
                  >
                    All Agents
                  </button>
                  {agents.map(agent => (
                    <button
                      key={agent}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                        selectedAgent === agent ? "text-blue-400" : "text-gray-300"
                      }`}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setIsAgentDropdownOpen(false);
                      }}
                    >
                      {agent.replace("Agent", "")}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>

          {/* Export */}
          {onExport && (
            <button
              className="p-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
              onClick={onExport}
              title="로그 내보내기"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Log List */}
      <div 
        className="overflow-y-auto font-mono text-sm"
        style={{ maxHeight }}
      >
        <AnimatePresence initial={false}>
          {filteredLogs.map((log, index) => {
            const config = levelConfig[log.level];
            const Icon = config.icon;
            const agentColor = agentColors[log.agentName] || agentColors.default;

            return (
              <motion.div
                key={log.id}
                className={`flex items-start gap-3 px-4 py-2 border-b border-gray-800 hover:bg-gray-800/50 ${config.bgColor}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {/* Timestamp */}
                <span className="flex-shrink-0 text-gray-500 text-xs">
                  {formatTime(log.timestamp)}
                </span>

                {/* Level Icon */}
                <Icon className={`flex-shrink-0 w-4 h-4 mt-0.5 ${config.color}`} />

                {/* Agent */}
                <span className={`flex-shrink-0 w-24 truncate text-xs ${agentColor}`}>
                  [{log.agentName.replace("Agent", "")}]
                </span>

                {/* Message */}
                <span className="flex-1 text-gray-300 break-all">
                  {log.message}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={logsEndRef} />

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Terminal className="w-8 h-8 mb-2 opacity-50" />
            <p>로그가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
