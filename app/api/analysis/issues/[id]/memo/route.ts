import { NextRequest, NextResponse } from 'next/server';

// 이슈 메모 저장 (스키마 확장 전 플레이스홀더)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const issueId = resolvedParams.id;
    const { memo } = await request.json();

    // TODO: Prisma 스키마에 memo 필드 추가 후 활성화
    // const issue = await prisma.issue.findUnique({
    //   where: { id: issueId }
    // });
    // 
    // const updatedIssue = await prisma.issue.update({
    //   where: { id: issueId },
    //   data: { memo }
    // });

    return NextResponse.json({
      success: true,
      message: 'Memo save requested',
      issueId,
      memo
    });
  } catch (error) {
    console.error('Failed to save memo:', error);
    return NextResponse.json(
      { error: 'Failed to save memo' },
      { status: 500 }
    );
  }
}
