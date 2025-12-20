'use client';

import { GitBranch, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const mockDependencies = [
  { name: 'react', version: '18.2.0', latest: '18.2.0', status: 'up-to-date', type: 'production' },
  { name: 'next', version: '16.1.0', latest: '16.1.0', status: 'up-to-date', type: 'production' },
  { name: 'typescript', version: '5.3.0', latest: '5.7.2', status: 'outdated', type: 'dev' },
  { name: 'prisma', version: '7.2.0', latest: '7.2.0', status: 'up-to-date', type: 'production' },
  { name: 'lodash', version: '4.17.20', latest: '4.17.21', status: 'minor-update', type: 'production' },
  { name: 'axios', version: '0.27.0', latest: '1.7.2', status: 'major-update', type: 'production' },
  { name: 'framer-motion', version: '11.0.0', latest: '11.15.0', status: 'minor-update', type: 'production' },
  { name: 'recharts', version: '2.15.0', latest: '2.15.0', status: 'up-to-date', type: 'production' },
];

const statusConfig = {
  'up-to-date': { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: '최신' },
  'minor-update': { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', label: '마이너 업데이트' },
  'major-update': { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: '메이저 업데이트' },
  'outdated': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: '구버전' },
};

export default function DependenciesPage() {
  const upToDate = mockDependencies.filter(d => d.status === 'up-to-date').length;
  const needsUpdate = mockDependencies.length - upToDate;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">의존성</h2>
        <p className="text-gray-500">프로젝트 패키지 의존성을 관리합니다</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockDependencies.length}</p>
              <p className="text-sm text-gray-500">전체 패키지</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{upToDate}</p>
              <p className="text-sm text-gray-500">최신 버전</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{needsUpdate}</p>
              <p className="text-sm text-gray-500">업데이트 필요</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dependency List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500">
          <span>패키지</span>
          <span>현재 버전</span>
          <span>최신 버전</span>
          <span>타입</span>
          <span>상태</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {mockDependencies.map((dep, index) => {
            const config = statusConfig[dep.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;
            return (
              <motion.div
                key={dep.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-5 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  {dep.name}
                </span>
                <span className="text-gray-600 dark:text-gray-400">{dep.version}</span>
                <span className="text-gray-600 dark:text-gray-400">{dep.latest}</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 w-fit">
                  {dep.type}
                </span>
                <span className={`flex items-center gap-2 ${config.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  <span className="text-sm">{config.label}</span>
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
