/**
 * 분석 리포트 내보내기 API
 * 
 * GET - 분석 결과를 HTML/JSON 형식으로 내보내기
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'html';
    const executeId = searchParams.get('executeId');

    // 프로젝트 조회
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, path: true }
    });

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    // 최근 분석 결과 조회
    const execution = await prisma.analysisExecute.findFirst({
      where: executeId ? { id: executeId } : { projectId },
      orderBy: { startedAt: 'desc' },
    });

    if (!execution) {
      return NextResponse.json({ error: '분석 결과가 없습니다' }, { status: 404 });
    }

    // 이슈 목록 조회
    const issues = await prisma.analysisResult.findMany({
      where: { executeId: execution.id },
      orderBy: { severity: 'asc' },
      take: 100
    });

    // 코드 요소 통계
    const elementStats = await prisma.codeElement.groupBy({
      by: ['elementType'],
      where: { projectId },
      _count: true
    });

    // 이슈 통계
    const issuesBySeverity = await prisma.analysisResult.groupBy({
      by: ['severity'],
      where: { executeId: execution.id },
      _count: true
    });

    const reportData = {
      project: {
        id: project.id,
        name: project.name,
        path: project.path
      },
      execution: {
        id: execution.id,
        status: execution.status,
        startedAt: execution.startedAt?.toISOString(),
        completedAt: execution.completedAt?.toISOString(),
        score: execution.score,
      },
      summary: {
        totalIssues: issues.length,
        bySeverity: Object.fromEntries(issuesBySeverity.map((s: any) => [s.severity, s._count])),
        codeElements: Object.fromEntries(elementStats.map((e: any) => [e.elementType, e._count]))
      },
      issues: issues.map((r: any) => ({
        severity: r.severity,
        message: r.message,
        file: r.filePath || '',
        line: r.lineNumber || 0,
        category: r.category,
        suggestion: r.suggestion
      })),
      generatedAt: new Date().toISOString()
    };

    if (format === 'json') {
      return NextResponse.json(reportData);
    }

    // HTML 리포트 생성
    const html = generateHTMLReport(reportData);
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="report-${project.name}-${new Date().toISOString().slice(0, 10)}.html"`
      }
    });

  } catch (error) {
    console.error('[Report] Error:', error);
    return NextResponse.json({ error: '리포트 생성 실패' }, { status: 500 });
  }
}

function generateHTMLReport(data: any): string {
  const severityColors: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
    INFO: '#3b82f6'
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>분석 리포트 - ${data.project.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; background: #f8fafc; color: #1e293b; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 40px; border-radius: 16px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .score-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 8px; font-size: 32px; font-weight: bold; margin-top: 20px; }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h2 { font-size: 18px; color: #334155; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; }
    .stat-card { text-align: center; padding: 16px; background: #f1f5f9; border-radius: 8px; }
    .stat-card .value { font-size: 28px; font-weight: bold; color: #0f172a; }
    .stat-card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .issue-list { max-height: 400px; overflow-y: auto; }
    .issue-item { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .issue-severity { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: white; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; }
    @media print { body { background: white; } .section { box-shadow: none; border: 1px solid #e2e8f0; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 코드 분석 리포트</h1>
      <p>${data.project.name} | ${data.project.path}</p>
      <div class="score-badge">${data.execution.score || 0}점</div>
    </div>

    <div class="section">
      <h2>📈 분석 요약</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="value">${data.summary.totalIssues}</div>
          <div class="label">총 이슈</div>
        </div>
        ${Object.entries(data.summary.bySeverity || {}).map(([sev, count]) => `
        <div class="stat-card">
          <div class="value" style="color: ${severityColors[sev] || '#64748b'}">${count}</div>
          <div class="label">${sev}</div>
        </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h2>🔍 코드 요소</h2>
      <div class="stats-grid">
        ${Object.entries(data.summary.codeElements || {}).map(([type, count]) => `
        <div class="stat-card">
          <div class="value">${count}</div>
          <div class="label">${type}</div>
        </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h2>⚠️ 발견된 이슈 (상위 ${Math.min(data.issues.length, 100)}개)</h2>
      <div class="issue-list">
        ${data.issues.slice(0, 100).map((issue: any) => `
        <div class="issue-item">
          <span class="issue-severity" style="background: ${severityColors[issue.severity] || '#64748b'}">${issue.severity}</span>
          <span style="margin-left: 8px; font-size: 12px; color: #64748b">${issue.category || 'General'}</span>
          <div style="margin-top: 6px; font-size: 13px; color: #64748b">📄 ${issue.file}:${issue.line}</div>
          <div style="margin-top: 4px">${issue.message}</div>
          ${issue.suggestion ? `<div style="margin-top: 4px; font-size: 13px; color: #059669">💡 ${issue.suggestion}</div>` : ''}
        </div>
        `).join('')}
      </div>
    </div>

    <div class="footer">
      <p>Generated by JacodeLens | ${new Date(data.generatedAt).toLocaleString('ko-KR')}</p>
    </div>
  </div>
</body>
</html>`;
}
