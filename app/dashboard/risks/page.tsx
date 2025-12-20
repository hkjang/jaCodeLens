'use client';

import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const riskData = [
  { module: 'payments', security: 8, quality: 5, performance: 6, operations: 7 },
  { module: 'auth', security: 3, quality: 2, performance: 2, operations: 3 },
  { module: 'api', security: 5, quality: 6, performance: 4, operations: 5 },
  { module: 'database', security: 4, quality: 3, performance: 7, operations: 6 },
  { module: 'utils', security: 1, quality: 2, performance: 1, operations: 1 },
  { module: 'frontend', security: 3, quality: 4, performance: 5, operations: 2 },
];

const categories = ['security', 'quality', 'performance', 'operations'];
const categoryLabels: Record<string, string> = {
  security: '보안',
  quality: '품질',
  performance: '성능',
  operations: '운영',
};

function getRiskColor(value: number): string {
  if (value <= 2) return 'bg-green-500';
  if (value <= 4) return 'bg-yellow-500';
  if (value <= 6) return 'bg-orange-500';
  return 'bg-red-500';
}

function getRiskLevel(value: number): string {
  if (value <= 2) return '낮음';
  if (value <= 4) return '보통';
  if (value <= 6) return '높음';
  return '심각';
}

export default function RisksPage() {
  const highRiskCount = riskData.filter(d => 
    d.security > 6 || d.quality > 6 || d.performance > 6 || d.operations > 6
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">리스크 맵</h2>
          <p className="text-gray-500">모듈별 리스크를 히트맵으로 시각화합니다</p>
        </div>
        {highRiskCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">{highRiskCount}개 고위험 모듈</span>
          </div>
        )}
      </header>

      {/* Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 text-sm font-medium text-gray-500">모듈</th>
              {categories.map(cat => (
                <th key={cat} className="text-center p-3 text-sm font-medium text-gray-500">
                  {categoryLabels[cat]}
                </th>
              ))}
              <th className="text-center p-3 text-sm font-medium text-gray-500">평균</th>
            </tr>
          </thead>
          <tbody>
            {riskData.map((row, index) => {
              const avg = Math.round((row.security + row.quality + row.performance + row.operations) / 4);
              return (
                <motion.tr
                  key={row.module}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-t border-gray-100 dark:border-gray-700"
                >
                  <td className="p-3 font-medium text-gray-900 dark:text-white capitalize">{row.module}</td>
                  {categories.map(cat => {
                    const value = row[cat as keyof typeof row] as number;
                    return (
                      <td key={cat} className="p-3 text-center">
                        <div className={`w-12 h-12 mx-auto rounded-lg ${getRiskColor(value)} flex items-center justify-center text-white font-bold`}>
                          {value}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-3 text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      avg > 6 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      avg > 4 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      avg > 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {getRiskLevel(avg)}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-sm text-gray-500">낮음 (1-2)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span className="text-sm text-gray-500">보통 (3-4)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span className="text-sm text-gray-500">높음 (5-6)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-sm text-gray-500">심각 (7+)</span>
        </div>
      </div>
    </div>
  );
}
