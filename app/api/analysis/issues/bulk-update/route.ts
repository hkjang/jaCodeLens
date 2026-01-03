import { NextRequest, NextResponse } from 'next/server';

// 분석 이슈 일괄 업데이트 (스키마 확장 전 플레이스홀더)
export async function POST(request: NextRequest) {
  try {
    const { ids, status } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Issue IDs are required' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // 유효한 상태값 확인
    const validStatuses = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'HIDDEN'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // TODO: Prisma 스키마에 status 필드 추가 후 활성화
    // const result = await prisma.issue.updateMany({
    //   where: { id: { in: ids } },
    //   data: { status }
    // });

    return NextResponse.json({
      success: true,
      message: `${ids.length} issues update requested`,
      updatedCount: ids.length,
      status
    });
  } catch (error) {
    console.error('Failed to bulk update issues:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update issues' },
      { status: 500 }
    );
  }
}
