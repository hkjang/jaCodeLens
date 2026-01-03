/**
 * Git 동기화 API
 * 
 * 프로젝트의 Git 저장소 동기화
 */

import { NextRequest, NextResponse } from 'next/server';
import { SourceCollector, GitConfig, SyncResult, TriggerType } from '@/lib/pipeline/source/git-client';

// 프로젝트별 소스 수집기 캐시
const collectors: Map<string, SourceCollector> = new Map();

function getCollector(projectId: string, config: GitConfig): SourceCollector {
  if (!collectors.has(projectId)) {
    collectors.set(projectId, new SourceCollector(config));
  }
  return collectors.get(projectId)!;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { 
      trigger = 'manual',
      incremental = true,
      repoUrl,
      branch,
      localPath,
    } = body;

    // 실제 구현에서는 프로젝트 DB에서 Git 설정 조회
    const gitConfig: GitConfig = {
      repoUrl: repoUrl || `https://github.com/example/${projectId}.git`,
      localPath: localPath || `./repos/${projectId}`,
      branch: branch || 'main',
    };

    // Mock 응답 (실제로는 collector.sync 호출)
    const mockResult: SyncResult = {
      success: true,
      trigger: trigger as TriggerType,
      timestamp: new Date(),
      commitHash: 'abc1234567890def',
      branch: gitConfig.branch || 'main',
      changedFiles: ['src/index.ts', 'src/utils.ts', 'package.json'],
      addedFiles: ['src/new-feature.ts'],
      deletedFiles: [],
      modifiedFiles: ['src/index.ts', 'src/utils.ts'],
      totalFiles: 42,
      duration: 1523,
    };

    return NextResponse.json({
      success: true,
      result: mockResult,
      message: '동기화가 완료되었습니다',
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: '동기화 실패', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 동기화 상태 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Mock 상태 (실제로는 DB 또는 캐시에서 조회)
    const status = {
      projectId,
      lastSync: new Date(Date.now() - 3600000).toISOString(),
      lastCommit: 'abc1234567890def',
      branch: 'main',
      totalFiles: 42,
      status: 'synced', // 'syncing' | 'synced' | 'error'
      error: null,
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: '동기화 상태 조회 실패' },
      { status: 500 }
    );
  }
}
