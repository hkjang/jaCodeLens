'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, FolderGit2, Github, GitBranch, FolderOpen,
  CheckCircle, AlertCircle, Loader2, ChevronRight,
  Globe, Lock, Server
} from 'lucide-react';

type SourceType = 'github' | 'gitlab' | 'bitbucket' | 'local';

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    localPath: '',
    branch: 'main',
    token: '',
    useSSL: true
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          path: sourceType === 'local' ? formData.localPath : formData.url,
          type: 'UNKNOWN',
          sourceType,
          branch: formData.branch,
          token: formData.token || undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '프로젝트 생성에 실패했습니다');
      }

      router.push('/dashboard/projects');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          프로젝트 목록으로
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">새 프로젝트 추가</h1>
        <p className="text-gray-500 mt-2">분석할 코드 저장소를 연결하세요</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <Step number={1} label="소스 선택" active={step === 1} completed={step > 1} />
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <Step number={2} label="연결 설정" active={step === 2} completed={step > 2} />
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <Step number={3} label="프로젝트 정보" active={step === 3} completed={step > 3} />
      </div>

      {/* Step 1: Source Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            코드 소스를 선택하세요
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <SourceCard
              icon={<Github className="w-8 h-8" />}
              title="GitHub"
              description="GitHub 저장소에서 가져오기"
              selected={sourceType === 'github'}
              onClick={() => setSourceType('github')}
            />
            <SourceCard
              icon={<GitBranch className="w-8 h-8" />}
              title="GitLab"
              description="GitLab 저장소에서 가져오기"
              selected={sourceType === 'gitlab'}
              onClick={() => setSourceType('gitlab')}
            />
            <SourceCard
              icon={<Server className="w-8 h-8" />}
              title="Bitbucket"
              description="Bitbucket Server에서 가져오기"
              selected={sourceType === 'bitbucket'}
              onClick={() => setSourceType('bitbucket')}
            />
            <SourceCard
              icon={<FolderOpen className="w-8 h-8" />}
              title="로컬 경로"
              description="서버의 로컬 디렉토리 지정"
              selected={sourceType === 'local'}
              onClick={() => setSourceType('local')}
            />
          </div>

          <div className="flex justify-end mt-8">
            <button
              onClick={() => setStep(2)}
              disabled={!sourceType}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Connection Settings */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {sourceType === 'local' ? '로컬 경로 설정' : '저장소 연결'}
          </h2>

          {sourceType === 'local' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                프로젝트 경로
              </label>
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.localPath}
                  onChange={(e) => setFormData({ ...formData, localPath: e.target.value })}
                  placeholder="예: d:/project/my-app 또는 /home/user/projects/my-app"
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                서버에서 접근 가능한 절대 경로를 입력하세요
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  저장소 URL
                </label>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder={
                      sourceType === 'github' ? 'https://github.com/owner/repo' :
                      sourceType === 'gitlab' ? 'https://gitlab.com/owner/repo' :
                      'https://bitbucket.org/owner/repo'
                    }
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    액세스 토큰 (선택)
                  </span>
                </label>
                <input
                  type="password"
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  placeholder="비공개 저장소의 경우 토큰 입력"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-2">
                  비공개 저장소의 경우 Personal Access Token이 필요합니다
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              이전
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={sourceType === 'local' ? !formData.localPath : !formData.url}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Project Info */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            프로젝트 정보
          </h2>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              프로젝트 이름 *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: My Awesome Project"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              설명 (선택)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="프로젝트에 대한 간단한 설명"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">요약</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">소스 타입</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {sourceType === 'github' ? 'GitHub' :
                   sourceType === 'gitlab' ? 'GitLab' :
                   sourceType === 'bitbucket' ? 'Bitbucket' : '로컬 경로'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">경로</span>
                <span className="text-gray-900 dark:text-white font-medium truncate ml-4 max-w-[300px]">
                  {sourceType === 'local' ? formData.localPath : formData.url}
                </span>
              </div>
              {sourceType !== 'local' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">브랜치</span>
                  <span className="text-gray-900 dark:text-white font-medium">{formData.branch}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              이전
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  프로젝트 생성
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Step({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        completed ? 'bg-green-500 text-white' :
        active ? 'bg-blue-600 text-white' :
        'bg-gray-200 dark:bg-gray-700 text-gray-500'
      }`}>
        {completed ? <CheckCircle className="w-4 h-4" /> : number}
      </div>
      <span className={`text-sm ${active ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

function SourceCard({ icon, title, description, selected, onClick }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-6 rounded-xl border-2 text-left transition-all ${
        selected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
      }`}
    >
      <div className={`mb-4 ${selected ? 'text-blue-600' : 'text-gray-400'}`}>
        {icon}
      </div>
      <h3 className={`font-semibold mb-1 ${selected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
        {title}
      </h3>
      <p className="text-sm text-gray-500">{description}</p>
    </button>
  );
}
