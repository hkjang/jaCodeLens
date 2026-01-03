/**
 * 스냅샷 API
 * 
 * 분석 스냅샷 목록 조회 및 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { SnapshotBuilder, MemorySnapshotStorage, SnapshotMeta } from '@/lib/pipeline/merger/snapshot-storage';

// 글로벌 스냅샷 빌더 (실제로는 서비스 레이어에서 관리)
let snapshotBuilder: SnapshotBuilder | null = null;

export function getSnapshotBuilder(): SnapshotBuilder {
  if (!snapshotBuilder) {
    snapshotBuilder = new SnapshotBuilder(new MemorySnapshotStorage({ maxSnapshots: 100 }));
  }
  return snapshotBuilder;
}

interface SnapshotListResponse {
  snapshots: SnapshotMeta[];
  total: number;
  page: number;
  pageSize: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const builder = getSnapshotBuilder();
    const snapshots = await builder.list(projectId, pageSize * page);

    // 페이지네이션 적용
    const startIndex = (page - 1) * pageSize;
    const paginatedSnapshots = snapshots.slice(startIndex, startIndex + pageSize);

    const response: SnapshotListResponse = {
      snapshots: paginatedSnapshots,
      total: snapshots.length,
      page,
      pageSize,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Snapshot list error:', error);
    return NextResponse.json(
      { error: '스냅샷 목록 조회 실패' },
      { status: 500 }
    );
  }
}

// 스냅샷 비교
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snapshotIdA, snapshotIdB } = body;

    if (!snapshotIdA || !snapshotIdB) {
      return NextResponse.json(
        { error: '비교할 스냅샷 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const builder = getSnapshotBuilder();
    const comparison = await builder.compare(snapshotIdA, snapshotIdB);

    return NextResponse.json({
      success: true,
      comparison,
    });

  } catch (error) {
    console.error('Snapshot compare error:', error);
    return NextResponse.json(
      { error: '스냅샷 비교 실패' },
      { status: 500 }
    );
  }
}
