'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/roles/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const role = await prisma.adminRole.findUnique({ where: { id } });
    
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    
    return NextResponse.json(role);
  } catch (error) {
    console.error('[API] Error fetching role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/roles/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { permissions, ...rest } = body;
    
    const role = await prisma.adminRole.update({
      where: { id },
      data: {
        ...rest,
        permissions: permissions ? (typeof permissions === 'string' ? permissions : JSON.stringify(permissions)) : undefined
      }
    });
    
    return NextResponse.json(role);
  } catch (error) {
    console.error('[API] Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/roles/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const role = await prisma.adminRole.findUnique({ where: { id } });
    if (role?.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system role' }, { status: 400 });
    }
    
    await prisma.adminRole.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
