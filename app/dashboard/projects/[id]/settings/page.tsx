'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Save, AlertTriangle, FolderGit2, 
  GitBranch, Settings, Trash2, Archive, History,
  Globe, Lock, CheckCircle, Loader2, RefreshCw
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { StatusTimeline } from '@/components/ui/CUDStatusBadge';

interface Project {
  id: string;
  name: string;
  description: string | null;
  path: string;
  type: string | null;
  tier: string;
  sourceType: string | null;
  branch: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChangeLogEntry {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: string;
  changedBy: string;
}

export default function ProjectSettingsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImpactWarning, setShowImpactWarning] = useState(false);
  
  // 변경 로그 (실제로는 API에서 가져옴)
  const [changeLogs] = useState<ChangeLogEntry[]>([
    {
      id: '1',
      field: 'name',
      oldValue: 'Old Project Name',
      newValue: 'Current Name',
      changedAt: new Date().toISOString(),
      changedBy: 'admin'
    }
  ]);

  // 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    path: '',
    branch: '',
    tier: 'STANDARD'
  });

  // 원본 데이터 (변경 감지용)
  const [originalData, setOriginalData] = useState<typeof formData | null>(null);

  useEffect(() => {
    fetchProject();
  }, [resolvedParams.id]);

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        const formValues = {
          name: data.name || '',
          description: data.description || '',
          path: data.path || '',
          branch: data.branch || 'main',
          tier: data.tier || 'STANDARD'
        };
        setFormData(formValues);
        setOriginalData(formValues);
      } else {
        setError('프로젝트를 찾을 수 없습니다');
      }
    } catch (e) {
      setError('프로젝트를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  // 변경 감지
  const hasChanges = originalData && (
    formData.name !== originalData.name ||
    formData.description !== originalData.description ||
    formData.path !== originalData.path ||
    formData.branch !== originalData.branch ||
    formData.tier !== originalData.tier
  );

  // 경로 변경 시 영향 경고
  const pathChanged = originalData && formData.path !== originalData.path;

  async function handleSave() {
    if (!hasChanges) return;
    
    // 경로 변경 시 경고 표시
    if (pathChanged && !showImpactWarning) {
      setShowImpactWarning(true);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setSuccess(true);
        setOriginalData(formData);
        setShowImpactWarning(false);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        throw new Error(data.message || '저장에 실패했습니다');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}/archive`, {
        method: 'POST'
      });
      if (res.ok) {
        router.push('/dashboard/projects');
      }
    } catch (e) {
      console.error('Failed to archive project', e);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        router.push('/dashboard/projects');
      }
    } catch (e) {
      console.error('Failed to delete project', e);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
          프로젝트를 찾을 수 없습니다
        </h3>
        <Link href="/dashboard/projects" className="text-blue-600 hover:underline mt-2 inline-block">
          프로젝트 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href={`/dashboard/projects/${resolvedParams.id}`}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            프로젝트로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-6 h-6" />
            프로젝트 설정
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? '저장 중...' : success ? '저장됨' : '변경사항 저장'}
          </button>
        </div>
      </div>

      {/* 에러/성공 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          변경사항이 저장되었습니다
        </div>
      )}

      {/* 경로 변경 경고 */}
      {showImpactWarning && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300">경로 변경 영향 안내</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                프로젝트 경로를 변경하면 다음 분석부터 새 경로가 적용됩니다.
                기존 분석 결과는 유지되지만, 이전 경로의 파일과 연결이 끊어질 수 있습니다.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowImpactWarning(false)}
                  className="px-3 py-1.5 text-sm text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded"
                >
                  변경 확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 기본 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">기본 정보</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              프로젝트 이름
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              티어
            </label>
            <select
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="STANDARD">Standard</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* 저장소 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FolderGit2 className="w-5 h-5" />
          저장소 설정
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              프로젝트 경로
              {pathChanged && (
                <span className="ml-2 text-xs text-yellow-600">변경됨</span>
              )}
            </label>
            <input
              type="text"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 ${
                pathChanged 
                  ? 'border-yellow-400 dark:border-yellow-600' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              브랜치
            </label>
            <input
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="main"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 변경 이력 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          변경 이력
        </h2>
        
        {changeLogs.length > 0 ? (
          <div className="space-y-3">
            {changeLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{log.field}</span> 필드가 변경됨
                  </p>
                  <p className="text-gray-500 text-xs">
                    {new Date(log.changedAt).toLocaleString('ko-KR')} · {log.changedBy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">변경 이력이 없습니다</p>
        )}
      </div>

      {/* 위험 영역 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">위험 영역</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">프로젝트 아카이브</h3>
              <p className="text-sm text-gray-500">프로젝트를 아카이브하면 30일 후 자동 삭제됩니다</p>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
            >
              <Archive className="w-4 h-4" />
              아카이브
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div>
              <h3 className="font-medium text-red-700 dark:text-red-400">완전 삭제</h3>
              <p className="text-sm text-red-600 dark:text-red-400">이 작업은 되돌릴 수 없습니다</p>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        onArchive={handleArchive}
        title="프로젝트 삭제"
        message={`"${project.name}" 프로젝트를 삭제하시겠습니까?`}
        variant="danger"
        showArchiveOption={true}
        recoverable={true}
        recoverableDays={30}
        confirmText="완전 삭제"
      />
    </div>
  );
}
