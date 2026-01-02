'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Default roles for seeding
const DEFAULT_ROLES = [
  { name: 'Administrator', description: '전체 시스템 관리자', permissions: '["all"]', userCount: 2, isSystem: true },
  { name: 'Developer', description: '코드 분석 및 개선', permissions: '["view_analysis","run_analysis","fix_issues"]', userCount: 15, isSystem: true },
  { name: 'Operator', description: '운영 모니터링', permissions: '["view_analysis","view_operations","manage_agents"]', userCount: 5, isSystem: true },
  { name: 'Architect', description: '아키텍처 분석 전문', permissions: '["view_analysis","run_analysis","view_architecture"]', userCount: 3, isSystem: true },
  { name: 'Auditor', description: '읽기 전용 감사', permissions: '["view_analysis","view_logs"]', userCount: 2, isSystem: true },
];

/**
 * GET /api/admin/roles
 * 모든 역할 목록 조회
 */
export async function GET() {
  try {
    const roles = await prisma.adminRole.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }]
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error('[API] Error fetching roles:', error);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/admin/roles
 * 새 역할 추가
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, permissions, isActive } = body;
    
    const role = await prisma.adminRole.create({
      data: {
        name,
        description,
        permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions || []),
        isActive: isActive !== false,
        isSystem: false
      }
    });
    
    return NextResponse.json(role);
  } catch (error: any) {
    console.error('[API] Error creating role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/roles
 * 기본 역할 시드
 */
export async function PUT() {
  try {
    const results = [];
    
    for (const role of DEFAULT_ROLES) {
      const existing = await prisma.adminRole.findUnique({ where: { name: role.name } });
      if (existing) {
        results.push({ name: role.name, action: 'exists', id: existing.id });
      } else {
        const created = await prisma.adminRole.create({ data: role });
        results.push({ name: role.name, action: 'created', id: created.id });
      }
    }
    
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('[API] Error seeding roles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
