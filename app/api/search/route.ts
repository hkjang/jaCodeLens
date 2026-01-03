/**
 * 전역 검색 API
 * 
 * GET /api/search - 파일, 이슈, 룰, AI 요약 통합 검색
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type'); // issues, files, rules, all
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: '검색어는 2자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    const searchType = type || 'all';
    const results: Record<string, any[]> = {};

    // 이슈 검색
    if (searchType === 'all' || searchType === 'issues') {
      const issueWhere: Record<string, unknown> = {
        OR: [
          { message: { contains: query } },
          { filePath: { contains: query } },
          { suggestion: { contains: query } },
          { ruleId: { contains: query } },
          { aiExplanation: { contains: query } },
        ]
      };

      if (projectId) {
        issueWhere.execute = { projectId };
      }

      const issues = await prisma.normalizedAnalysisResult.findMany({
        where: issueWhere,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          execute: {
            select: {
              id: true,
              projectId: true,
              project: { select: { name: true } }
            }
          }
        }
      });

      results.issues = issues.map((i: any) => ({
        id: i.id,
        type: 'issue',
        title: i.message,
        subtitle: `${i.filePath}:${i.lineStart}`,
        severity: i.severity,
        category: i.mainCategory,
        ruleId: i.ruleId,
        projectName: i.execute?.project?.name,
        projectId: i.execute?.projectId,
        executeId: i.executeId,
      }));
    }

    // 파일 검색 (코드 요소)
    if (searchType === 'all' || searchType === 'files') {
      const fileWhere: Record<string, unknown> = {
        OR: [
          { filePath: { contains: query } },
          { fileName: { contains: query } },
          { name: { contains: query } },
          { aiSummary: { contains: query } },
        ]
      };

      if (projectId) {
        fileWhere.projectId = projectId;
      }

      const files = await prisma.codeElement.findMany({
        where: fileWhere,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          projectId: true,
          filePath: true,
          fileName: true,
          name: true,
          elementType: true,
          lineStart: true,
          lineEnd: true,
          aiSummary: true,
          project: { select: { name: true } }
        }
      });

      results.files = files.map((f: any) => ({
        id: f.id,
        type: 'file',
        title: f.name,
        subtitle: f.filePath,
        elementType: f.elementType,
        lineStart: f.lineStart,
        lineEnd: f.lineEnd,
        summary: f.aiSummary,
        projectName: f.project?.name,
        projectId: f.projectId,
      }));
    }

    // 태스크 검색
    if (searchType === 'all' || searchType === 'tasks') {
      const taskWhere: Record<string, unknown> = {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { filePath: { contains: query } },
        ]
      };

      if (projectId) {
        taskWhere.execute = { projectId };
      }

      const tasks = await prisma.improvementTask.findMany({
        where: taskWhere,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          execute: {
            select: {
              projectId: true,
              project: { select: { name: true } }
            }
          }
        }
      });

      results.tasks = tasks.map((t: any) => ({
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: t.filePath || t.category,
        status: t.status,
        priority: t.priority,
        projectName: t.execute?.project?.name,
        projectId: t.execute?.projectId,
      }));
    }

    // 전체 결과 수
    const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    return NextResponse.json({
      query,
      totalCount,
      results,
    });

  } catch (error) {
    console.error('[Search] GET Error:', error);
    return NextResponse.json({ error: '검색 실패' }, { status: 500 });
  }
}
