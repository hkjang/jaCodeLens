/**
 * 스냅샷 상세 API
 * 
 * 개별 스냅샷 상세 정보 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSnapshotBuilder } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const builder = getSnapshotBuilder();
    
    const snapshot = await builder.load(id);

    if (!snapshot) {
      return NextResponse.json(
        { error: '스냅샷을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 검증
    const isValid = await builder.verify(id);

    return NextResponse.json({
      ...snapshot,
      isValid,
    });

  } catch (error) {
    console.error('Snapshot detail error:', error);
    return NextResponse.json(
      { error: '스냅샷 조회 실패' },
      { status: 500 }
    );
  }
}
