/**
 * 실시간 분석 상태 SSE API
 * 
 * GET - Server-Sent Events로 실시간 분석 진행 상태 스트리밍
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;

  // SSE 스트림 생성
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 연결 확인
      sendEvent({ type: 'connected', executionId });

      let lastStatus = '';
      let attempts = 0;
      const maxAttempts = 300;

      // 폴링 루프
      const poll = async () => {
        try {
          // 실행 상태 조회
          const execution = await prisma.analysisExecute.findUnique({
            where: { id: executionId },
          });

          if (!execution) {
            sendEvent({ type: 'error', message: '실행을 찾을 수 없습니다' });
            controller.close();
            return;
          }

          // 진행률 추정 (상태 기반)
          let progress = 0;
          if (execution.status === 'PENDING') progress = 0;
          else if (execution.status === 'RUNNING') progress = 50;
          else if (execution.status === 'COMPLETED') progress = 100;
          else if (execution.status === 'FAILED') progress = 100;

          // 상태 변경 시에만 이벤트 전송
          const statusKey = `${execution.status}-${progress}-${execution.totalIssues || 0}`;
          if (statusKey !== lastStatus) {
            lastStatus = statusKey;

            sendEvent({
              type: 'progress',
              status: execution.status,
              progress,
              score: execution.score,
              issues: {
                total: execution.totalIssues || 0,
                critical: execution.criticalCount || 0,
                high: execution.highCount || 0,
                medium: execution.mediumCount || 0,
                low: execution.lowCount || 0,
              },
            });
          }

          // 완료 또는 실패 시 종료
          if (execution.status === 'COMPLETED' || execution.status === 'FAILED') {
            sendEvent({
              type: 'complete',
              status: execution.status,
              score: execution.score || 0,
              completedAt: execution.completedAt?.toISOString(),
              issues: {
                total: execution.totalIssues || 0,
                critical: execution.criticalCount || 0,
                high: execution.highCount || 0,
                medium: execution.mediumCount || 0,
                low: execution.lowCount || 0,
              }
            });
            controller.close();
            return;
          }

          // 계속 폴링
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            sendEvent({ type: 'timeout', message: '타임아웃' });
            controller.close();
          }

        } catch (error) {
          console.error('[SSE] Error:', error);
          sendEvent({ type: 'error', message: '상태 조회 실패' });
          controller.close();
        }
      };

      poll();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
