import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/projects - List all projects with last analysis info
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    // Get last analysis for each project
    const projectsWithAnalysis = await Promise.all(
      projects.map(async (project) => {
        const lastExecution = await prisma.analysisExecute.findFirst({
          where: { projectId: project.id },
          orderBy: { startedAt: 'desc' }
        });

        let issueCount = 0;
        if (lastExecution) {
          issueCount = await prisma.normalizedAnalysisResult.count({
            where: { executeId: lastExecution.id }
          });
        }

        return {
          ...project,
          lastAnalysis: lastExecution ? {
            score: lastExecution.score,
            status: lastExecution.status,
            date: lastExecution.startedAt?.toISOString() || null,
            issueCount
          } : null
        };
      })
    );

    return NextResponse.json(projectsWithAnalysis);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, path, type, sourceType, branch, token } = body;

    if (!name || !path) {
      return NextResponse.json(
        { message: '프로젝트 이름과 경로는 필수입니다' },
        { status: 400 }
      );
    }

    // Check if path already exists
    const existing = await prisma.project.findUnique({
      where: { path }
    });

    if (existing) {
      return NextResponse.json(
        { message: '이미 동일한 경로의 프로젝트가 존재합니다' },
        { status: 409 }
      );
    }

    // Detect project type from path and package.json
    let detectedType = type || 'UNKNOWN';
    
    // Path-based detection first
    if (path.includes('nextjs') || path.includes('next')) {
      detectedType = 'NEXTJS';
    } else if (path.includes('java') || path.endsWith('.java')) {
      detectedType = 'JAVA';
    } else if (path.includes('python') || path.includes('.py')) {
      detectedType = 'PYTHON';
    } else {
      // Try to detect from package.json if available
      try {
        const fs = await import('fs/promises');
        const pkgPath = `${path}/package.json`;
        const pkgContent = await fs.readFile(pkgPath, 'utf-8');
        const pkg = JSON.parse(pkgContent);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (deps['next']) {
          detectedType = 'NEXTJS';
        } else if (deps['react']) {
          detectedType = 'REACT';
        } else if (deps['vue']) {
          detectedType = 'VUE';
        } else if (deps['@angular/core']) {
          detectedType = 'ANGULAR';
        } else if (deps['express'] || deps['fastify']) {
          detectedType = 'NODE';
        } else {
          detectedType = 'TYPESCRIPT';
        }
      } catch {
        // package.json not found or not readable, keep detected type
        if (detectedType === 'UNKNOWN') {
          detectedType = 'OTHER';
        }
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        path,
        type: detectedType,
        tier: 'STANDARD'
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { message: '프로젝트 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}
