'use client';

import { FileText, Download, Calendar, Filter, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const mockReports = [
  { id: '1', name: '주간 분석 리포트', type: 'weekly', date: '2024-12-16 ~ 2024-12-20', projects: 5, issues: 28, score: 78.5 },
  { id: '2', name: '월간 보안 리포트', type: 'security', date: '2024-12', projects: 5, issues: 12, score: 72.3 },
  { id: '3', name: '분기별 아키텍처 리뷰', type: 'architecture', date: 'Q4 2024', projects: 5, issues: 8, score: 81.2 },
  { id: '4', name: '운영 상태 리포트', type: 'operations', date: '2024-12-20', projects: 5, issues: 5, score: 89.4 },
];

const reportTypeConfig = {
  weekly: { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  security: { icon: BarChart3, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  architecture: { icon: PieChart, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  operations: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">리포트</h2>
          <p className="text-gray-500">분석 리포트를 생성하고 다운로드합니다</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FileText className="w-4 h-4" />
          새 리포트 생성
        </button>
      </header>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockReports.map((report, index) => {
          const config = reportTypeConfig[report.type as keyof typeof reportTypeConfig];
          const Icon = config.icon;
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${config.bg}`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{report.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{report.date}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>{report.projects} 프로젝트</span>
                      <span>{report.issues} 이슈</span>
                      <span className="font-medium text-gray-900 dark:text-white">점수: {report.score}</span>
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="다운로드">
                  <Download className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Generate Report Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">커스텀 리포트 생성</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">리포트 타입</label>
            <select className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option>주간 리포트</option>
              <option>보안 리포트</option>
              <option>아키텍처 리포트</option>
              <option>운영 리포트</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">기간</label>
            <select className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option>최근 7일</option>
              <option>최근 30일</option>
              <option>최근 분기</option>
              <option>전체</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">프로젝트</label>
            <select className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option>전체 프로젝트</option>
              <option>JacodeLens Core</option>
              <option>Payment Gateway</option>
              <option>ML Pipeline</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <FileText className="w-4 h-4" />
            리포트 생성
          </button>
        </div>
      </div>
    </div>
  );
}
