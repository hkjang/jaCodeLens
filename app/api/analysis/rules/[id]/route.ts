/**
 * 규칙 상세 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRuleEngine } from '@/lib/services/analysis-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engine = getRuleEngine();
    const rules = engine.getRules();
    const rule = rules.find(r => r.id === id);

    if (!rule) {
      return NextResponse.json(
        { error: '규칙을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);

  } catch (error) {
    console.error('Rule detail error:', error);
    return NextResponse.json(
      { error: '규칙 조회 실패' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const engine = getRuleEngine();
    const rules = engine.getRules();
    const existingRule = rules.find(r => r.id === id);

    if (!existingRule) {
      return NextResponse.json(
        { error: '규칙을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const updatedRule = {
      ...existingRule,
      ...body,
      id,
    };

    engine.register(updatedRule);

    return NextResponse.json({
      success: true,
      rule: updatedRule,
      message: '규칙이 수정되었습니다',
    });

  } catch (error) {
    console.error('Rule update error:', error);
    return NextResponse.json(
      { error: '규칙 수정 실패' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { enabled } = body;

    const engine = getRuleEngine();
    const rules = engine.getRules();
    const existingRule = rules.find(r => r.id === id);

    if (!existingRule) {
      return NextResponse.json(
        { error: '규칙을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const updatedRule = {
      ...existingRule,
      enabled: enabled !== undefined ? enabled : !existingRule.enabled,
    };

    engine.register(updatedRule);

    return NextResponse.json({
      success: true,
      enabled: updatedRule.enabled,
      message: updatedRule.enabled ? '규칙이 활성화되었습니다' : '규칙이 비활성화되었습니다',
    });

  } catch (error) {
    console.error('Rule toggle error:', error);
    return NextResponse.json(
      { error: '규칙 토글 실패' },
      { status: 500 }
    );
  }
}
