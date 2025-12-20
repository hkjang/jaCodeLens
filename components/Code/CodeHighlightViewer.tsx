"use client";

import { motion } from "framer-motion";
import { 
  AlertTriangle,
  CheckCircle,
  FileCode,
  Copy,
  ExternalLink,
  Bot,
  Lightbulb,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

interface CodeIssue {
  lineStart: number;
  lineEnd: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  message: string;
  agentName: string;
  suggestion?: string;
  fixExample?: string;
}

interface CodeHighlightViewerProps {
  filePath: string;
  code: string;
  issues: CodeIssue[];
  language?: string;
}

const severityColors = {
  critical: { bg: "bg-red-500/20", border: "border-red-500", text: "text-red-500" },
  high: { bg: "bg-orange-500/20", border: "border-orange-500", text: "text-orange-500" },
  medium: { bg: "bg-yellow-500/20", border: "border-yellow-500", text: "text-yellow-500" },
  low: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-500" },
  info: { bg: "bg-gray-500/20", border: "border-gray-500", text: "text-gray-500" }
};

export default function CodeHighlightViewer({
  filePath,
  code,
  issues,
  language = "typescript"
}: CodeHighlightViewerProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const lines = code.split("\n");

  // Create a map of line numbers to issues
  const issuesByLine = new Map<number, CodeIssue[]>();
  issues.forEach((issue) => {
    for (let i = issue.lineStart; i <= issue.lineEnd; i++) {
      const existing = issuesByLine.get(i) || [];
      existing.push(issue);
      issuesByLine.set(i, existing);
    }
  });

  const toggleIssue = (lineNum: number) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(lineNum)) {
        next.delete(lineNum);
      } else {
        next.add(lineNum);
      }
      return next;
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-mono text-gray-300">{filePath}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {issues.length}개 이슈
          </span>
          <button
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            onClick={handleCopy}
            title="코드 복사"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Code View */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {lines.map((line, index) => {
              const lineNum = index + 1;
              const lineIssues = issuesByLine.get(lineNum);
              const hasIssue = lineIssues && lineIssues.length > 0;
              const mostSevereIssue = lineIssues?.sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
                return order[a.severity] - order[b.severity];
              })[0];
              const colors = mostSevereIssue
                ? severityColors[mostSevereIssue.severity]
                : null;
              const isExpanded = expandedIssues.has(lineNum);

              return (
                <>
                  <tr
                    key={lineNum}
                    className={`group ${hasIssue ? colors?.bg : "hover:bg-gray-800/50"} ${
                      hasIssue ? "cursor-pointer" : ""
                    }`}
                    onClick={() => hasIssue && toggleIssue(lineNum)}
                  >
                    {/* Line Number */}
                    <td className="px-3 py-0.5 text-right text-gray-500 text-xs select-none w-12 align-top border-r border-gray-800">
                      {lineNum}
                    </td>

                    {/* Issue Indicator */}
                    <td className="w-6 text-center align-top">
                      {hasIssue && (
                        <AlertTriangle className={`w-3 h-3 mt-1 ${colors?.text}`} />
                      )}
                    </td>

                    {/* Code */}
                    <td className="px-3 py-0.5 font-mono text-sm text-gray-300 whitespace-pre">
                      {line || " "}
                    </td>

                    {/* Expand Icon */}
                    <td className="w-6 text-center align-top">
                      {hasIssue && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-3 h-3 mt-1 text-gray-500" />
                        </motion.div>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Issue Details */}
                  {hasIssue && isExpanded && (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 bg-gray-800/80">
                        <div className="space-y-3 ml-12">
                          {lineIssues?.map((issue, idx) => (
                            <motion.div
                              key={idx}
                              className={`p-3 rounded-lg border ${colors?.border} ${colors?.bg}`}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {/* Issue Header */}
                              <div className="flex items-start gap-2">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${colors?.text} bg-gray-900`}>
                                  {issue.severity.toUpperCase()}
                                </span>
                                <span className="flex-1 text-sm text-gray-200">
                                  {issue.message}
                                </span>
                              </div>

                              {/* Agent Source */}
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                <Bot className="w-3 h-3" />
                                <span>Detected by: {issue.agentName.replace("Agent", "")}</span>
                              </div>

                              {/* Suggestion */}
                              {issue.suggestion && (
                                <div className="mt-3 p-2 bg-gray-900 rounded border border-gray-700">
                                  <div className="flex items-center gap-1 text-xs text-yellow-500 mb-1">
                                    <Lightbulb className="w-3 h-3" />
                                    <span>제안</span>
                                  </div>
                                  <p className="text-sm text-gray-300">
                                    {issue.suggestion}
                                  </p>
                                </div>
                              )}

                              {/* Fix Example */}
                              {issue.fixExample && (
                                <div className="mt-2 p-2 bg-gray-900 rounded border border-green-800">
                                  <div className="text-xs text-green-500 mb-1">
                                    수정 예시
                                  </div>
                                  <pre className="text-sm text-green-400 font-mono overflow-x-auto">
                                    {issue.fixExample}
                                  </pre>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
