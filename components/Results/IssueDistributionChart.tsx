"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface IssueData {
  name: string;
  value: number;
  color: string;
}

interface IssueDistributionChartProps {
  data: IssueData[];
  title?: string;
  showLegend?: boolean;
}

const defaultData: IssueData[] = [
  { name: "Security", value: 12, color: "#EF4444" },
  { name: "Quality", value: 25, color: "#F59E0B" },
  { name: "Performance", value: 8, color: "#3B82F6" },
  { name: "Architecture", value: 15, color: "#8B5CF6" },
  { name: "Style", value: 30, color: "#10B981" },
];

export default function IssueDistributionChart({
  data = defaultData,
  title = "유형별 문제 분포",
  showLegend = true
}: IssueDistributionChartProps) {
  const totalIssues = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>

      <div className="flex items-center gap-6">
        {/* Chart */}
        <div className="w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as IssueData;
                    const percentage = ((item.value / totalIssues) * 100).toFixed(1);
                    return (
                      <div className="px-3 py-2 bg-gray-900 text-white rounded-lg shadow-lg text-sm">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-gray-300">
                          {item.value}개 ({percentage}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Stats */}
        {showLegend && (
          <div className="flex-1 space-y-3">
            {data.map((item, index) => {
              const percentage = ((item.value / totalIssues) * 100).toFixed(1);
              return (
                <motion.div
                  key={item.name}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.name}
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {item.value}
                    </div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                </motion.div>
              );
            })}

            {/* Total */}
            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  총 이슈
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {totalIssues}개
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
