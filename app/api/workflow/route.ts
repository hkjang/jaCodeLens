import { NextRequest, NextResponse } from 'next/server';
import { approveStep, rejectStep } from '@/lib/workflow';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflowId, action, approverId, comment } = body;

    if (!workflowId || !action || !approverId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;
    if (action === 'APPROVE') {
      result = await approveStep(workflowId, approverId, comment);
    } else if (action === 'REJECT') {
      // If rejected, we might also want to fail the execution or mark it as requiring significant changes
      result = await rejectStep(workflowId, approverId, comment);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Workflow action failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
