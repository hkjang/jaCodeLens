'use client';

import { FileText, Calendar, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

const mockHistory = [
  { id: '1', project: 'JacodeLens Core', date: '2024-12-20 13:45', score: 78.5, prevScore: 72.8, status: 'completed', issues: 6 },
  { id: '2', project: 'Payment Gateway', date: '2024-12-19 10:30', score: 65.2, prevScore: 68.1, status: 'completed', issues: 7 },
  { id: '3', project: 'ML Pipeline', date: '2024-12-18 15:20', score: 82.1, prevScore: 80.5, status: 'completed', issues: 3 },
  { id: '4', project: 'Mobile App API', date: '2024-12-18 09:15', score: 91.3, prevScore: 89.7, status: 'completed', issues: 2 },
  { id: '5', project: 'DevOps Automation', date: '2024-12-17 14:00', score: 85.7, prevScore: 85.0, status: 'completed', issues: 2 },
  { id: '6', project: 'JacodeLens Core', date: '2024-12-13 11:30', score: 72.8, prevScore: 70.2, status: 'completed', issues: 8 },
  { id: '7', project: 'Payment Gateway', date: '2024-12-12 16:45', score: 68.1, prevScore: 65.5, status: 'failed', issues: 0 },
];

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">히스토리</h2>
        <p className="text-gray-500">분석 실행 기록을 확인합니다</p>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500">
          <span>프로젝트</span>
          <span>일시</span>
          <span>점수</span>
          <span>변화</span>
          <span>이슈</span>
          <span>상태</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {mockHistory.map((item, index) => {
            const scoreDiff = item.score - item.prevScore;
            const isImproved = scoreDiff > 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
              >
                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  {item.project}
                </span>
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {item.date}
                </span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">{item.score}</span>
                <span className={`flex items-center gap-1 ${isImproved ? 'text-green-500' : 'text-red-500'}`}>
                  {isImproved ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {isImproved ? '+' : ''}{scoreDiff.toFixed(1)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">{item.issues}개</span>
                <span className="flex items-center gap-2">
                  {item.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : item.status === 'failed' ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-sm capitalize">{item.status === 'completed' ? '완료' : item.status === 'failed' ? '실패' : '진행중'}</span>
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
