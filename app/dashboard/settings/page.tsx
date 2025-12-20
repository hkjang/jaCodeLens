"use client";

import { SettingsPanel } from '@/components/Settings';
import { 
  FileSearch, 
  BarChart3, 
  Shield, 
  Code, 
  Palette, 
  TestTube2 
} from 'lucide-react';

const defaultSettings = {
  parallelism: 4,
  agents: [
    { id: '1', name: 'Structure Analysis', enabled: true, icon: <FileSearch className="w-5 h-5" /> },
    { id: '2', name: 'Quality Analysis', enabled: true, icon: <BarChart3 className="w-5 h-5" /> },
    { id: '3', name: 'Security Analysis', enabled: true, icon: <Shield className="w-5 h-5" /> },
    { id: '4', name: 'Dependency Analysis', enabled: true, icon: <Code className="w-5 h-5" /> },
    { id: '5', name: 'Style Analysis', enabled: true, icon: <Palette className="w-5 h-5" /> },
    { id: '6', name: 'Test Analysis', enabled: false, icon: <TestTube2 className="w-5 h-5" /> },
  ],
  policies: [
    { id: 'p1', label: '보안 취약점 자동 검출', description: 'OWASP Top 10 및 CWE 기반 취약점을 자동으로 검출합니다', enabled: true },
    { id: 'p2', label: '코드 품질 임계값 적용', description: '품질 점수가 60점 미만이면 경고를 표시합니다', enabled: true },
    { id: 'p3', label: '의존성 취약점 검사', description: 'npm/pip 패키지의 알려진 취약점을 검사합니다', enabled: true },
    { id: 'p4', label: '아키텍처 드리프트 감지', description: '정의된 아키텍처 규칙 위반을 감지합니다', enabled: false },
    { id: 'p5', label: '테스트 커버리지 분석', description: '테스트 커버리지가 80% 미만이면 경고합니다', enabled: false },
  ],
  model: 'gpt-4o',
  availableModels: [
    { id: 'gpt-4o', name: 'GPT-4o', description: '최신 모델, 높은 정확도' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '빠른 속도, 비용 효율' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: '균형잡힌 성능' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: '다국어 지원 우수' },
  ]
};

export default function SettingsPage() {
  const handleSave = (settings: any) => {
    console.log('Saving settings:', settings);
    // In real implementation, call API to save settings
  };

  const handleReset = () => {
    console.log('Resetting settings');
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">설정</h2>
        <p className="text-gray-500">분석 에이전트 및 정책을 구성합니다</p>
      </header>

      <SettingsPanel
        initialSettings={defaultSettings}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}
