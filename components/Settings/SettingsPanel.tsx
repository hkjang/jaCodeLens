"use client";

import { motion } from "framer-motion";
import { 
  Settings, 
  Sliders, 
  ToggleLeft, 
  ToggleRight,
  CheckSquare,
  Square,
  ChevronDown,
  Save,
  RotateCcw,
  Zap,
  Bot,
  Shield,
  FileSearch,
  Activity
} from "lucide-react";
import { useState } from "react";

interface SettingsState {
  parallelism: number;
  agents: {
    id: string;
    name: string;
    enabled: boolean;
    icon: React.ReactNode;
  }[];
  policies: {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
  }[];
  model: string;
  availableModels: { id: string; name: string; description?: string }[];
}

interface SettingsPanelProps {
  initialSettings: SettingsState;
  onSave?: (settings: SettingsState) => void;
  onReset?: () => void;
}

export default function SettingsPanel({
  initialSettings,
  onSave,
  onReset
}: SettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave?.(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(initialSettings);
    setHasChanges(false);
    onReset?.();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-gray-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              분석 설정
            </h2>
            <p className="text-sm text-gray-500">
              에이전트 및 분석 정책을 구성합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </motion.button>
          <motion.button
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              hasChanges
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
            whileHover={hasChanges ? { scale: 1.02 } : {}}
            whileTap={hasChanges ? { scale: 0.98 } : {}}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4" />
            저장
          </motion.button>
        </div>
      </div>

      {/* Parallelism Slider */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            병렬도 설정
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              동시 실행 에이전트 수
            </span>
            <span className="text-2xl font-bold text-blue-500">
              {settings.parallelism}
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="8"
            value={settings.parallelism}
            onChange={(e) => updateSettings({ parallelism: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          <div className="flex justify-between text-xs text-gray-400">
            <span>1 (순차)</span>
            <span>4 (권장)</span>
            <span>8 (최대)</span>
          </div>

          <p className="text-sm text-gray-500">
            병렬도가 높을수록 분석 속도가 빨라지지만, 시스템 리소스 사용량이 증가합니다.
          </p>
        </div>
      </div>

      {/* Agent Toggles */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            에이전트 활성화
          </h3>
        </div>

        <div className="space-y-3">
          {settings.agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                agent.enabled
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700"
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${agent.enabled ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600" : "bg-gray-200 dark:bg-gray-600 text-gray-400"}`}>
                  {agent.icon}
                </div>
                <span className={`font-medium ${agent.enabled ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                  {agent.name}
                </span>
              </div>

              <button
                className="focus:outline-none"
                onClick={() => {
                  const newAgents = [...settings.agents];
                  newAgents[index] = { ...agent, enabled: !agent.enabled };
                  updateSettings({ agents: newAgents });
                }}
              >
                {agent.enabled ? (
                  <ToggleRight className="w-10 h-10 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-400" />
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Policy Checkboxes */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            분석 정책
          </h3>
        </div>

        <div className="space-y-3">
          {settings.policies.map((policy, index) => (
            <motion.div
              key={policy.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                const newPolicies = [...settings.policies];
                newPolicies[index] = { ...policy, enabled: !policy.enabled };
                updateSettings({ policies: newPolicies });
              }}
            >
              {policy.enabled ? (
                <CheckSquare className="w-5 h-5 text-blue-500 flex-shrink-0" />
              ) : (
                <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
              <div>
                <span className={`font-medium ${policy.enabled ? "text-gray-900 dark:text-white" : "text-gray-500"}`}>
                  {policy.label}
                </span>
                <p className="text-sm text-gray-500 mt-0.5">
                  {policy.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI 모델 선택
          </h3>
        </div>

        <div className="relative">
          <select
            value={settings.model}
            onChange={(e) => updateSettings({ model: e.target.value })}
            className="w-full p-4 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {settings.availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} {model.description && `- ${model.description}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
