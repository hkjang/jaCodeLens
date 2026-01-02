'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/policies/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const policy = await prisma.adminPolicy.findUnique({ where: { id } });
    
    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    
    return NextResponse.json(policy);
  } catch (error) {
    console.error('[API] Error fetching policy:', error);
    return NextResponse.json({ error: 'Failed to fetch policy' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/policies/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rules, ...rest } = body;
    
    const policy = await prisma.adminPolicy.update({
      where: { id },
      data: {
        ...rest,
        rules: rules ? (typeof rules === 'string' ? rules : JSON.stringify(rules)) : undefined
      }
    });
    
    return NextResponse.json(policy);
  } catch (error) {
    console.error('[API] Error updating policy:', error);
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/policies/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.adminPolicy.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting policy:', error);
    return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
  }
}
