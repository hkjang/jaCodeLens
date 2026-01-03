import { NextResponse } from 'next/server';
import { getIssues } from '@/lib/services/pipeline-data-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') || undefined;
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getIssues(undefined, { severity, category }, limit, offset);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}
