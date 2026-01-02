'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Default policies for seeding
const DEFAULT_POLICIES = [
  { 
    name: 'Security Standards', 
    description: '보안 분석 기준',
    category: 'Security',
    rules: JSON.stringify([
      { key: 'sql_injection_check', value: 'enabled', severity: 'critical' },
      { key: 'xss_check', value: 'enabled', severity: 'high' },
      { key: 'hardcoded_secrets', value: 'enabled', severity: 'critical' },
    ])
  },
  { 
    name: 'Quality Thresholds', 
    description: '코드 품질 임계값',
    category: 'Quality',
    rules: JSON.stringify([
      { key: 'max_complexity', value: '10', severity: 'medium' },
      { key: 'max_function_lines', value: '50', severity: 'low' },
      { key: 'min_test_coverage', value: '80', severity: 'medium' },
    ])
  },
  { 
    name: 'Architecture Rules', 
    description: '아키텍처 규칙',
    category: 'Architecture',
    isActive: false,
    rules: JSON.stringify([
      { key: 'layer_violation', value: 'enabled', severity: 'high' },
      { key: 'circular_dependency', value: 'enabled', severity: 'high' },
    ])
  },
];

/**
 * GET /api/admin/policies
 */
export async function GET() {
  try {
    const policies = await prisma.adminPolicy.findMany({
      orderBy: [{ priority: 'asc' }, { name: 'asc' }]
    });
    return NextResponse.json(policies);
  } catch (error) {
    console.error('[API] Error fetching policies:', error);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/admin/policies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, rules, isActive, priority } = body;
    
    const policy = await prisma.adminPolicy.create({
      data: {
        name,
        description,
        category: category || 'other',
        rules: typeof rules === 'string' ? rules : JSON.stringify(rules || []),
        isActive: isActive !== false,
        priority: priority || 0
      }
    });
    
    return NextResponse.json(policy);
  } catch (error: any) {
    console.error('[API] Error creating policy:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/policies
 * 기본 정책 시드
 */
export async function PUT() {
  try {
    const results = [];
    
    for (const policy of DEFAULT_POLICIES) {
      const existing = await prisma.adminPolicy.findUnique({ where: { name: policy.name } });
      if (existing) {
        results.push({ name: policy.name, action: 'exists', id: existing.id });
      } else {
        const created = await prisma.adminPolicy.create({ 
          data: { 
            ...policy, 
            isActive: policy.isActive !== false 
          } 
        });
        results.push({ name: policy.name, action: 'created', id: created.id });
      }
    }
    
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('[API] Error seeding policies:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
