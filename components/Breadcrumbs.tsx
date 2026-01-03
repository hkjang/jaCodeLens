'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: '대시보드',
  projects: '프로젝트',
  new: '새 프로젝트',
  execution: '분석 실행',
  results: '분석 결과',
  analysis: '코드 이슈',
  architecture: '아키텍처',
  dependencies: '의존성',
  risks: '리스크 맵',
  improvements: '개선 제안',
  history: '히스토리',
  settings: '설정',
  'self-analysis': 'Self Analysis',
  baseline: '기준선',
  backlog: '백로그',
  policy: '분석 정책',
  'code-elements': '코드 요소',
  agents: '에이전트',
  queue: '작업 큐',
  operations: '모니터링',
  approvals: '승인 관리',
  reports: '리포트',
  notifications: '알림',
  audit: '감사 로그',
  logs: '로그',
  resources: '리소스'
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  
  if (!pathname || pathname === '/dashboard') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  
  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = ROUTE_LABELS[segment] || segment;
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
      <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">
        <Home className="w-4 h-4" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4" />
          {crumb.isLast ? (
            <span className="text-gray-900 dark:text-white font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-gray-700 dark:hover:text-gray-300">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
