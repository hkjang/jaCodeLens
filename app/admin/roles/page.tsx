'use client';

import React, { useState } from 'react';
import { Users, Shield, Plus, Edit2, Trash2, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
}

export default function RoleManagementPage() {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const roles: Role[] = [
    { id: '1', name: 'Administrator', description: '전체 시스템 관리자', permissions: ['all'], userCount: 2, isSystem: true },
    { id: '2', name: 'Developer', description: '코드 분석 및 개선', permissions: ['view_analysis', 'run_analysis', 'fix_issues'], userCount: 15, isSystem: true },
    { id: '3', name: 'Operator', description: '운영 모니터링', permissions: ['view_analysis', 'view_operations', 'manage_agents'], userCount: 5, isSystem: true },
    { id: '4', name: 'Architect', description: '아키텍처 분석 전문', permissions: ['view_analysis', 'run_analysis', 'view_architecture'], userCount: 3, isSystem: true },
    { id: '5', name: 'Auditor', description: '읽기 전용 감사', permissions: ['view_analysis', 'view_logs'], userCount: 2, isSystem: true },
    { id: '6', name: 'Security Lead', description: '보안 분석 책임자', permissions: ['view_analysis', 'run_analysis', 'view_security', 'manage_policies'], userCount: 2, isSystem: false },
  ];

  const allPermissions = [
    { key: 'view_analysis', label: '분석 결과 조회' },
    { key: 'run_analysis', label: '분석 실행' },
    { key: 'fix_issues', label: '이슈 수정' },
    { key: 'view_operations', label: '운영 현황 조회' },
    { key: 'manage_agents', label: '에이전트 관리' },
    { key: 'view_architecture', label: '아키텍처 조회' },
    { key: 'view_security', label: '보안 분석 조회' },
    { key: 'view_logs', label: '로그 조회' },
    { key: 'manage_policies', label: '정책 관리' },
    { key: 'manage_users', label: '사용자 관리' },
    { key: 'manage_models', label: 'AI 모델 관리' },
    { key: 'all', label: '전체 권한' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">역할 관리</h1>
          <p className="text-gray-500 dark:text-gray-400">사용자 역할 및 권한 설정</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors">
          <Plus className="w-4 h-4" />
          역할 추가
        </button>
      </div>

      {/* Roles List */}
      <div className="space-y-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                    {role.isSystem && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-500">시스템</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{role.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{role.userCount}명</span>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedRole === role.id ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {expandedRole === role.id && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">권한</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {allPermissions.map((perm) => {
                    const hasPermission = role.permissions.includes('all') || role.permissions.includes(perm.key);
                    return (
                      <span
                        key={perm.key}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                          hasPermission
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}
                      >
                        {hasPermission ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {perm.label}
                      </span>
                    );
                  })}
                </div>
                {!role.isSystem && (
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50">
                      <Edit2 className="w-3 h-3" />
                      수정
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm hover:bg-red-200 dark:hover:bg-red-900/50">
                      <Trash2 className="w-3 h-3" />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
