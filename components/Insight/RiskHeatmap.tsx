'use client';

import React, { useState } from 'react';
import { AlertTriangle, Shield, Layers, Code2, FileCode } from 'lucide-react';

interface RiskArea {
  id: string;
  name: string;
  path: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  issueCount: number;
  type: 'security' | 'architecture' | 'quality' | 'dependency';
}

interface RiskHeatmapProps {
  data?: RiskArea[];
}

export default function RiskHeatmap({ data }: RiskHeatmapProps) {
  const [selectedArea, setSelectedArea] = useState<RiskArea | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Mock data
  const riskAreas: RiskArea[] = data || [
    { id: '1', name: 'auth', path: 'src/api/auth', riskLevel: 'critical', issueCount: 8, type: 'security' },
    { id: '2', name: 'users', path: 'src/api/users', riskLevel: 'high', issueCount: 5, type: 'security' },
    { id: '3', name: 'services', path: 'src/services', riskLevel: 'high', issueCount: 12, type: 'architecture' },
    { id: '4', name: 'utils', path: 'src/utils', riskLevel: 'medium', issueCount: 4, type: 'quality' },
    { id: '5', name: 'components', path: 'src/components', riskLevel: 'low', issueCount: 3, type: 'quality' },
    { id: '6', name: 'hooks', path: 'src/hooks', riskLevel: 'medium', issueCount: 2, type: 'architecture' },
    { id: '7', name: 'lib', path: 'src/lib', riskLevel: 'high', issueCount: 6, type: 'dependency' },
    { id: '8', name: 'config', path: 'src/config', riskLevel: 'medium', issueCount: 3, type: 'security' },
    { id: '9', name: 'pages', path: 'src/pages', riskLevel: 'low', issueCount: 2, type: 'quality' },
    { id: '10', name: 'store', path: 'src/store', riskLevel: 'medium', issueCount: 5, type: 'architecture' },
    { id: '11', name: 'types', path: 'src/types', riskLevel: 'low', issueCount: 1, type: 'quality' },
    { id: '12', name: 'middleware', path: 'src/middleware', riskLevel: 'high', issueCount: 4, type: 'security' },
  ];

  const getRiskStyles = (level: string) => {
    switch (level) {
      case 'critical': return { bg: 'bg-red-500', hover: 'hover:bg-red-400', text: 'text-white', border: 'ring-red-500' };
      case 'high': return { bg: 'bg-orange-500', hover: 'hover:bg-orange-400', text: 'text-white', border: 'ring-orange-500' };
      case 'medium': return { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-400', text: 'text-gray-900', border: 'ring-yellow-500' };
      case 'low': return { bg: 'bg-green-500', hover: 'hover:bg-green-400', text: 'text-white', border: 'ring-green-500' };
      default: return { bg: 'bg-gray-500', hover: 'hover:bg-gray-400', text: 'text-white', border: 'ring-gray-500' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'architecture': return <Layers className="w-4 h-4" />;
      case 'quality': return <Code2 className="w-4 h-4" />;
      case 'dependency': return <FileCode className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredAreas = filterType === 'all' 
    ? riskAreas 
    : riskAreas.filter(a => a.type === filterType);

  const riskCounts = {
    critical: riskAreas.filter(a => a.riskLevel === 'critical').length,
    high: riskAreas.filter(a => a.riskLevel === 'high').length,
    medium: riskAreas.filter(a => a.riskLevel === 'medium').length,
    low: riskAreas.filter(a => a.riskLevel === 'low').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">리스크 맵</h2>
          <p className="text-gray-500 dark:text-gray-400">프로젝트 영역별 위험 수준</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'security', 'architecture', 'quality', 'dependency'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {type === 'all' ? '전체' : 
               type === 'security' ? '보안' :
               type === 'architecture' ? '아키텍처' :
               type === 'quality' ? '품질' : '의존성'}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Summary */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(riskCounts).map(([level, count]) => {
          const styles = getRiskStyles(level);
          return (
            <div key={level} className={`p-4 rounded-xl ${styles.bg} ${styles.text}`}>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm opacity-80 capitalize">{level}</div>
            </div>
          );
        })}
      </div>

      {/* Heatmap Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filteredAreas.map((area) => {
            const styles = getRiskStyles(area.riskLevel);
            const isSelected = selectedArea?.id === area.id;

            return (
              <button
                key={area.id}
                onClick={() => setSelectedArea(isSelected ? null : area)}
                className={`
                  relative p-4 rounded-xl transition-all
                  ${styles.bg} ${styles.hover} ${styles.text}
                  ${isSelected ? `ring-4 ${styles.border} ring-offset-2` : ''}
                `}
              >
                <div className="absolute top-2 right-2 opacity-60">
                  {getTypeIcon(area.type)}
                </div>
                <div className="font-medium truncate">{area.name}</div>
                <div className="text-xs opacity-80 mt-1">{area.issueCount} 이슈</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Area Details */}
      {selectedArea && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getTypeIcon(selectedArea.type)}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedArea.name}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskStyles(selectedArea.riskLevel).bg} ${getRiskStyles(selectedArea.riskLevel).text}`}>
                  {selectedArea.riskLevel.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{selectedArea.path}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{selectedArea.issueCount}</div>
              <div className="text-sm text-gray-500">발견된 이슈</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button className="text-blue-500 hover:text-blue-600 text-sm font-medium">
              상세 이슈 보기 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
