'use client';

/**
 * 신뢰도 배지 컴포넌트
 * 
 * 분석 결과의 신뢰도를 시각적으로 표시합니다.
 */

import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, AlertTriangle } from 'lucide-react';

type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

interface ConfidenceBadgeProps {
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'HIGH';
  if (score >= 0.6) return 'MEDIUM';
  if (score >= 0.4) return 'LOW';
  return 'VERY_LOW';
}

const levelConfig: Record<ConfidenceLevel, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  description: string;
}> = {
  HIGH: {
    label: '높음',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <ShieldCheck className="w-full h-full" />,
    description: '높은 신뢰도 - 운영에 즉시 반영 가능',
  },
  MEDIUM: {
    label: '중간',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Shield className="w-full h-full" />,
    description: '중간 신뢰도 - 검토 후 반영 권장',
  },
  LOW: {
    label: '낮음',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <ShieldAlert className="w-full h-full" />,
    description: '낮은 신뢰도 - 추가 검증 필요',
  },
  VERY_LOW: {
    label: '매우 낮음',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <ShieldQuestion className="w-full h-full" />,
    description: '매우 낮은 신뢰도 - 참고용으로만 사용',
  },
};

const sizeConfig = {
  sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-1.5 py-0.5' },
  md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-2 py-1' },
  lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-3 py-1.5' },
};

export function ConfidenceBadge({ 
  score, 
  showScore = false, 
  size = 'md',
  showTooltip = true 
}: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(score);
  const config = levelConfig[level];
  const sizeClass = sizeConfig[size];

  return (
    <div 
      className={`inline-flex items-center gap-1 rounded-full ${config.bgColor} ${config.color} ${sizeClass.padding}`}
      title={showTooltip ? config.description : undefined}
    >
      <span className={sizeClass.icon}>{config.icon}</span>
      {showScore ? (
        <span className={`font-medium ${sizeClass.text}`}>
          {Math.round(score * 100)}%
        </span>
      ) : (
        <span className={`font-medium ${sizeClass.text}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

/**
 * 소스 타입 배지
 */
interface SourceBadgeProps {
  source: 'static' | 'rule' | 'ai';
  size?: 'sm' | 'md';
}

const sourceConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  static: { label: '정적', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  rule: { label: '룰', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  ai: { label: 'AI', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
};

export function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const config = sourceConfig[source] || sourceConfig.static;
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span className={`inline-flex items-center rounded-full ${config.bgColor} ${config.color} ${sizeClass} font-medium`}>
      {config.label}
    </span>
  );
}

/**
 * 신뢰도 진행 바
 */
interface ConfidenceBarProps {
  score: number;
  height?: number;
  showLabel?: boolean;
}

export function ConfidenceBar({ score, height = 4, showLabel = false }: ConfidenceBarProps) {
  const level = getConfidenceLevel(score);
  const config = levelConfig[level];
  const percentage = Math.round(score * 100);

  const barColors: Record<ConfidenceLevel, string> = {
    HIGH: 'bg-green-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-orange-500',
    VERY_LOW: 'bg-red-500',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className={config.color}>{config.label}</span>
          <span className="text-gray-500">{percentage}%</span>
        </div>
      )}
      <div 
        className="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div 
          className={`h-full ${barColors[level]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 신뢰도 상세 카드
 */
interface ConfidenceDetailCardProps {
  components: {
    staticRatio: number;
    aiWeight: number;
    evidenceCount: number;
    reproducibility: number;
    sensitivity: number;
  };
}

export function ConfidenceDetailCard({ components }: ConfidenceDetailCardProps) {
  const items = [
    { label: '정적 비율', value: components.staticRatio, color: 'bg-blue-500' },
    { label: 'AI 신뢰도', value: components.aiWeight, color: 'bg-purple-500' },
    { label: '근거 점수', value: components.evidenceCount, color: 'bg-green-500' },
    { label: '재현성', value: components.reproducibility, color: 'bg-yellow-500' },
    { label: '민감도', value: components.sensitivity, color: 'bg-orange-500' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        신뢰도 구성 요소
      </h5>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
              <span className="font-medium">{Math.round(item.value * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${item.color}`}
                style={{ width: `${item.value * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConfidenceBadge;
