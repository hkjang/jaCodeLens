/**
 * 규칙 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRuleEngine } from '@/lib/services/analysis-service';
import type { RuleDefinition } from '@/lib/pipeline/static/rule-engine';

interface RuleListResponse {
  rules: RuleDefinition[];
  total: number;
  version: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const enabled = searchParams.get('enabled');

    const engine = getRuleEngine();
    let rules = engine.getRules();

    if (category) {
      rules = rules.filter(r => r.category === category);
    }
    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      rules = rules.filter(r => r.enabled === isEnabled);
    }

    const response: RuleListResponse = {
      rules,
      total: rules.length,
      version: engine.getVersion(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Rule list error:', error);
    return NextResponse.json(
      { error: '규칙 목록 조회 실패' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      name, 
      description, 
      category, 
      severity, 
      pattern, 
      message, 
      suggestion,
      enabled = true 
    } = body;

    if (!id || !name || !pattern) {
      return NextResponse.json(
        { error: 'id, name, pattern은 필수입니다' },
        { status: 400 }
      );
    }

    const engine = getRuleEngine();

    const rule: RuleDefinition = {
      id,
      name,
      description: description || name,
      category: category || 'style',
      severity: severity || 'MEDIUM',
      version: '1.0.0',
      enabled,
      pattern: pattern,
      message: message || description || name,
      suggestion,
    };

    engine.register(rule);

    return NextResponse.json({
      success: true,
      rule,
      message: '규칙이 추가되었습니다',
    });

  } catch (error) {
    console.error('Rule create error:', error);
    return NextResponse.json(
      { error: '규칙 추가 실패' },
      { status: 500 }
    );
  }
}
