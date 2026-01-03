import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * 감사 로그 API
 * 
 * GET /api/admin/audit-logs
 * - 시스템의 모든 CUD 활동 로그 조회
 * - 필터링: action, targetType, dateFrom, dateTo
 * - 페이지네이션 지원
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const action = searchParams.get('action');
    const targetType = searchParams.get('targetType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    // 필터 조건 구성
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (targetType) {
      where.targetType = targetType;
    }

    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) {
        where.timestamp.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.timestamp.lte = new Date(dateTo + 'T23:59:59');
      }
    }

    if (search) {
      where.OR = [
        { targetId: { contains: search } },
        { actorId: { contains: search } },
        { details: { contains: search } }
      ];
    }

    // 전체 개수 조회
    const total = await prisma.auditLog.count({ where });

    // 로그 조회
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    // 프로젝트/분석 정보를 조회하여 enrichment
    const enrichedLogs = await Promise.all(logs.map(async (log) => {
      let entityName = log.targetId;
      let userName = log.actorId || 'SYSTEM';
      let userRole = 'system';

      // 프로젝트 이름 조회
      if (log.targetType === 'PROJECT') {
        const project = await prisma.project.findUnique({
          where: { id: log.targetId },
          select: { name: true }
        });
        if (project) {
          entityName = project.name;
        }
      }

      // 분석 실행 정보 조회
      if (log.targetType === 'ANALYSIS') {
        const execution = await prisma.analysisExecute.findUnique({
          where: { id: log.targetId },
          select: { 
            project: { select: { name: true } },
            status: true
          }
        });
        if (execution) {
          entityName = `${execution.project.name} 분석`;
        }
      }

      // 상세 정보 파싱
      let details = null;
      if (log.details) {
        try {
          details = JSON.parse(log.details);
        } catch (e) {
          details = { raw: log.details };
        }
      }

      return {
        id: log.id,
        action: mapAction(log.action),
        entity: mapTargetType(log.targetType),
        entityId: log.targetId,
        entityName,
        userId: log.actorId || 'SYSTEM',
        userName,
        userRole,
        timestamp: log.timestamp.toISOString(),
        ipAddress: log.ipAddress || '127.0.0.1',
        details
      };
    }));

    // 통계 계산
    const stats = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true }
    });

    const statsSummary = {
      total,
      creates: stats.find(s => s.action.includes('START') || s.action.includes('CREATE'))?._count.action || 0,
      updates: stats.find(s => s.action.includes('MODIFIED') || s.action.includes('UPDATE'))?._count.action || 0,
      deletes: stats.find(s => s.action.includes('DELETE'))?._count.action || 0
    };

    return NextResponse.json({
      logs: enrichedLogs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: statsSummary
    });

  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// 액션 매핑
function mapAction(action: string): string {
  if (action.includes('START')) return 'CREATE';
  if (action.includes('MODIFIED') || action.includes('UPDATE')) return 'UPDATE';
  if (action.includes('DELETE')) return 'DELETE';
  if (action.includes('APPROVED')) return 'UPDATE';
  if (action.includes('EXPORTED')) return 'VIEW';
  if (action.includes('ARCHIVE')) return 'ARCHIVE';
  return 'VIEW';
}

// 타겟 타입 매핑
function mapTargetType(targetType: string): string {
  switch (targetType) {
    case 'PROJECT': return 'PROJECT';
    case 'ANALYSIS': return 'EXECUTION';
    case 'RESULT': return 'ISSUE';
    default: return 'SETTING';
  }
}

/**
 * POST /api/admin/audit-logs
 * - 새 감사 로그 기록
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, targetType, targetId, details, actorId, ipAddress } = body;

    const log = await prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId,
        details: details ? JSON.stringify(details) : null,
        actorId: actorId || 'SYSTEM',
        ipAddress: ipAddress || null
      }
    });

    return NextResponse.json(log, { status: 201 });

  } catch (error) {
    console.error('Failed to create audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}
