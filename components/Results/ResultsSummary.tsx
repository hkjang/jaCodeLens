"use client";

import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Minus
} from "lucide-react";

interface ResultsSummaryProps {
  score: number;
  previousScore?: number;
  confidence: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  categories?: {
    name: string;
    score: number;
    issueCount: number;
  }[];
}

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

function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.9) return { label: "매우 높음", color: "text-green-500" };
  if (confidence >= 0.7) return { label: "높음", color: "text-blue-500" };
  if (confidence >= 0.5) return { label: "보통", color: "text-yellow-500" };
  return { label: "낮음", color: "text-red-500" };
}

export default function ResultsSummary({
  score,
  previousScore,
  confidence,
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  infoCount,
  categories = []
}: ResultsSummaryProps) {
  const scoreDiff = previousScore !== undefined ? score - previousScore : 0;
  const confidenceInfo = getConfidenceLabel(confidence);
  const totalIssues = criticalCount + highCount + mediumCount + lowCount + infoCount;

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            종합 분석 점수
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              AI 신뢰도:
            </span>
            <span className={`font-medium ${confidenceInfo.color}`}>
              {(confidence * 100).toFixed(0)}% ({confidenceInfo.label})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Score Circle */}
          <div className="relative flex-shrink-0">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="56"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 56}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - score / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" className={score >= 60 ? "text-green-500" : "text-red-500"} stopColor="currentColor" />
                  <stop offset="100%" className={score >= 60 ? "text-emerald-400" : "text-rose-400"} stopColor="currentColor" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              {scoreDiff !== 0 && (
                <div className={`flex items-center gap-1 text-sm ${scoreDiff > 0 ? "text-green-500" : "text-red-500"}`}>
                  {scoreDiff > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{scoreDiff > 0 ? "+" : ""}{scoreDiff}</span>
                </div>
              )}
            </div>
          </div>

          {/* Issue Summary */}
          <div className="flex-1 grid grid-cols-5 gap-2">
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {criticalCount}
              </div>
              <div className="text-xs text-red-500">Critical</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {highCount}
              </div>
              <div className="text-xs text-orange-500">High</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {mediumCount}
              </div>
              <div className="text-xs text-yellow-500">Medium</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {lowCount}
              </div>
              <div className="text-xs text-blue-500">Low</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {infoCount}
              </div>
              <div className="text-xs text-gray-500">Info</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            카테고리별 분석
          </h3>
          <div className="space-y-4">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-28 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {category.name}
                </div>
                <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${getScoreGradient(category.score)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${category.score}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
                <div className={`w-12 text-right font-bold ${getScoreColor(category.score)}`}>
                  {category.score}
                </div>
                <div className="w-16 text-right text-sm text-gray-500">
                  {category.issueCount}개 이슈
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
