'use client';

import { Lightbulb, ArrowRight, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const mockImprovements = [
  {
    id: '1',
    title: '코드 복잡도 개선',
    description: 'parser.ts 함수의 순환 복잡도가 15로 높습니다. 함수 분리를 권장합니다.',
    category: 'QUALITY',
    priority: 'high',
    estimatedHours: 4,
    impact: '유지보수성 30% 향상',
    status: 'pending',
  },
  {
    id: '2',
    title: 'N+1 쿼리 최적화',
    description: 'orders.ts에서 N+1 쿼리 패턴이 발견되었습니다. eager loading 적용을 권장합니다.',
    category: 'PERFORMANCE',
    priority: 'high',
    estimatedHours: 2,
    impact: '응답시간 50% 단축',
    status: 'in-progress',
  },
  {
    id: '3',
    title: '의존성 주입 패턴 적용',
    description: 'services 디렉토리의 모듈들에 DI 컨테이너 적용을 권장합니다.',
    category: 'ARCHITECTURE',
    priority: 'medium',
    estimatedHours: 8,
    impact: '테스트 용이성 향상',
    status: 'pending',
  },
  {
    id: '4',
    title: '로깅 커버리지 확대',
    description: 'payment.ts 서비스에 구조화된 로깅 추가를 권장합니다.',
    category: 'OPERATIONS',
    priority: 'medium',
    estimatedHours: 3,
    impact: '디버깅 시간 40% 단축',
    status: 'completed',
  },
  {
    id: '5',
    title: '보안 헤더 강화',
    description: 'CSP, X-Frame-Options 등 보안 헤더 추가를 권장합니다.',
    category: 'SECURITY',
    priority: 'high',
    estimatedHours: 2,
    impact: 'XSS 취약점 방어',
    status: 'pending',
  },
];

const priorityColors = {
  high: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  medium: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  low: 'text-green-500 bg-green-50 dark:bg-green-900/20',
};

const statusIcons = {
  pending: Clock,
  'in-progress': AlertTriangle,
  completed: CheckCircle,
};

export default function ImprovementsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">개선 제안</h2>
        <p className="text-gray-500">AI가 분석한 코드 개선 사항을 확인하세요</p>
      </header>

      <div className="grid gap-4">
        {mockImprovements.map((item, index) => {
          const StatusIcon = statusIcons[item.status as keyof typeof statusIcons];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${priorityColors[item.priority as keyof typeof priorityColors]}`}>
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {item.category}
                      </span>
                      <span className="text-gray-500">예상 {item.estimatedHours}시간</span>
                      <span className="text-green-600 dark:text-green-400">{item.impact}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${item.status === 'completed' ? 'text-green-500' : item.status === 'in-progress' ? 'text-yellow-500' : 'text-gray-400'}`} />
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
