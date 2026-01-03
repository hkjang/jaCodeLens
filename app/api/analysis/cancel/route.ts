import { NextRequest, NextResponse } from 'next/server';

// 분석 취소 (스키마 확장 전 플레이스홀더)
export async function POST(request: NextRequest) {
  try {
    const { executionId, keepResults = true } = await request.json();

    if (!executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 }
      );
    }

    // TODO: Prisma 스키마에 status 필드 추가 후 활성화
    // const execution = await prisma.analysisExecute.findUnique({
    //   where: { id: executionId }
    // });
    //
    // const updatedExecution = await prisma.analysisExecute.update({
    //   where: { id: executionId },
    //   data: { 
    //     status: 'CANCELLED',
    //     completedAt: new Date()
    //   }
    // });

    return NextResponse.json({
      success: true,
      message: `Execution cancel requested${keepResults ? ' (results will be preserved)' : ''}`,
      executionId,
      keepResults
    });
  } catch (error) {
    console.error('Failed to cancel execution:', error);
    return NextResponse.json(
      { error: 'Failed to cancel execution' },
      { status: 500 }
    );
  }
}
