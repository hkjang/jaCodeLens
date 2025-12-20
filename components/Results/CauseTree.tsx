"use client";

import { motion } from "framer-motion";
import { 
  ChevronRight, 
  ChevronDown,
  AlertTriangle,
  FileCode,
  Layers,
  GitBranch
} from "lucide-react";
import { useState } from "react";

interface CauseNode {
  id: string;
  label: string;
  type: "root" | "category" | "cause" | "file";
  severity?: "critical" | "high" | "medium" | "low";
  children?: CauseNode[];
  filePath?: string;
  lineNumber?: number;
}

interface CauseTreeProps {
  data: CauseNode;
  onNodeClick?: (node: CauseNode) => void;
}

const severityColors = {
  critical: "text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  high: "text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  medium: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  low: "text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
};

const typeIcons = {
  root: <Layers className="w-4 h-4" />,
  category: <GitBranch className="w-4 h-4" />,
  cause: <AlertTriangle className="w-4 h-4" />,
  file: <FileCode className="w-4 h-4" />
};

function TreeNode({ 
  node, 
  level = 0, 
  onNodeClick 
}: { 
  node: CauseNode; 
  level?: number; 
  onNodeClick?: (node: CauseNode) => void 
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const severityClass = node.severity ? severityColors[node.severity] : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: level * 0.05 }}
      className="select-none"
    >
      <div
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
          node.type === "root" ? "font-semibold" : ""
        }`}
        style={{ marginLeft: level * 16 }}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
          onNodeClick?.(node);
        }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </motion.div>
        ) : (
          <div className="w-4" />
        )}

        {/* Type Icon */}
        <div className={`p-1 rounded ${severityClass || "text-gray-500"}`}>
          {typeIcons[node.type]}
        </div>

        {/* Label */}
        <span className="flex-1 text-gray-800 dark:text-gray-200">
          {node.label}
        </span>

        {/* File Info */}
        {node.filePath && (
          <span className="text-xs text-gray-500 font-mono truncate max-w-48">
            {node.filePath}
            {node.lineNumber && `:${node.lineNumber}`}
          </span>
        )}

        {/* Severity Badge */}
        {node.severity && (
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${severityClass} border`}>
            {node.severity.toUpperCase()}
          </span>
        )}

        {/* Child Count */}
        {hasChildren && (
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {node.children!.length}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function CauseTree({ data, onNodeClick }: CauseTreeProps) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <GitBranch className="w-5 h-5" />
        원인 분석 트리
      </h3>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 max-h-96 overflow-y-auto">
        <TreeNode node={data} onNodeClick={onNodeClick} />
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500" /> Critical
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500" /> High
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500" /> Medium
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500" /> Low
        </div>
      </div>
    </div>
  );
}
