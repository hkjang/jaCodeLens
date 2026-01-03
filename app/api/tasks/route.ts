/**
 * 개선 태스크 API
 * 
 * GET - 태스크 목록 조회
 * POST - 태스크 생성
 * PATCH - 태스크 상태 업데이트
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET: 태스크 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const executeId = searchParams.get('executeId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 쿼리 조건
    const where: Record<string, unknown> = {};
    
    if (executeId) {
      where.executeId = executeId;
    }
    
    if (projectId) {
      where.execute = { projectId };
    }
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }

    // 총 개수
    const total = await prisma.improvementTask.count({ where });

    // 태스크 조회
    const tasks = await prisma.improvementTask.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        execute: {
          select: {
            id: true,
            projectId: true,
            startedAt: true,
            project: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // 통계
    const stats = await prisma.improvementTask.groupBy({
      by: ['status'],
      where: projectId ? { execute: { projectId } } : {},
      _count: true,
    });

    const statusCounts = stats.reduce((acc: Record<string, number>, s: any) => {
      acc[s.status] = s._count;
      return acc;
    }, {});

    return NextResponse.json({
      tasks: tasks.map((t: any) => ({
        id: t.id,
        executeId: t.executeId,
        resultId: t.resultId,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        severity: t.severity,
        status: t.status,
        filePath: t.filePath,
        lineStart: t.lineStart,
        lineEnd: t.lineEnd,
        assignedTo: t.assignedTo,
        assignedAt: t.assignedAt?.toISOString(),
        resolvedBy: t.resolvedBy,
        resolvedAt: t.resolvedAt?.toISOString(),
        verifiedAt: t.verifiedAt?.toISOString(),
        linkedCommit: t.linkedCommit,
        estimatedHours: t.estimatedHours,
        actualHours: t.actualHours,
        createdAt: t.createdAt?.toISOString(),
        project: t.execute?.project,
      })),
      pagination: { total, limit, offset },
      stats: {
        total,
        open: statusCounts['OPEN'] || 0,
        inProgress: statusCounts['IN_PROGRESS'] || 0,
        resolved: statusCounts['RESOLVED'] || 0,
        verified: statusCounts['VERIFIED'] || 0,
        wontFix: statusCounts['WONT_FIX'] || 0,
      }
    });

  } catch (error) {
    console.error('[Tasks] GET Error:', error);
    return NextResponse.json({ error: '태스크 조회 실패' }, { status: 500 });
  }
}

// POST: 태스크 생성 (이슈에서 자동 생성 또는 수동)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      executeId, 
      resultId, 
      title, 
      description, 
      category, 
      priority, 
      severity,
      filePath,
      lineStart,
      lineEnd,
      estimatedHours 
    } = body;

    if (!executeId || !title) {
      return NextResponse.json(
        { error: 'executeId와 title은 필수입니다' },
        { status: 400 }
      );
    }

    const task = await prisma.improvementTask.create({
      data: {
        executeId,
        resultId,
        title,
        description,
        category: category || 'IMPROVEMENT',
        priority: priority || 'MEDIUM',
        severity,
        status: 'OPEN',
        filePath,
        lineStart,
        lineEnd,
        estimatedHours,
      }
    });

    return NextResponse.json({ task, success: true });

  } catch (error) {
    console.error('[Tasks] POST Error:', error);
    return NextResponse.json({ error: '태스크 생성 실패' }, { status: 500 });
  }
}

// PATCH: 태스크 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, assignedTo, linkedCommit, actualHours, resolvedBy } = body;

    if (!id) {
      return NextResponse.json({ error: 'id는 필수입니다' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
        if (resolvedBy) updateData.resolvedBy = resolvedBy;
      }
      
      if (status === 'VERIFIED') {
        updateData.verifiedAt = new Date();
      }
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
      updateData.assignedAt = assignedTo ? new Date() : null;
    }

    if (linkedCommit) {
      updateData.linkedCommit = linkedCommit;
    }

    if (actualHours !== undefined) {
      updateData.actualHours = actualHours;
    }

    const task = await prisma.improvementTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ task, success: true });

  } catch (error) {
    console.error('[Tasks] PATCH Error:', error);
    return NextResponse.json({ error: '태스크 업데이트 실패' }, { status: 500 });
  }
}
