import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ErdField {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isOptional: boolean;
  isArray: boolean;
  isRelation: boolean;
  defaultValue?: string;
  attributes: string[];
}

interface ErdRelation {
  from: string;
  to: string;
  fromField: string;
  toField: string;
  type: '1-1' | '1-n' | 'n-1' | 'n-n';
}

interface ErdModel {
  name: string;
  fields: ErdField[];
  category: string;
}

interface ErdData {
  models: ErdModel[];
  relations: ErdRelation[];
}

// 모델 카테고리 분류
function categorizeModel(name: string): string {
  const categories: Record<string, string[]> = {
    'Project': ['Project', 'SelfProject', 'ProjectStats'],
    'Analysis': ['AnalysisExecute', 'AnalysisResult', 'NormalizedAnalysisResult', 'AnalysisSnapshot', 'AnalysisMetric', 'PipelineStageExecution'],
    'Code': ['CodeElement', 'Dependency'],
    'Agent': ['AgentExecution', 'AgentTask', 'AgentConfig'],
    'Security': ['Vulnerability', 'RiskAssessment'],
    'Architecture': ['ArchitecturalIssue', 'ServiceBoundary'],
    'Self-Analysis': ['Baseline', 'AnalysisTrigger', 'SelfAnalysisPolicy', 'BacklogItem'],
    'Governance': ['RuleSet', 'Rule', 'ApprovalWorkflow', 'DecisionRecord'],
    'Admin': ['AdminRole', 'AdminPolicy', 'AuditLog'],
    'AI': ['AiModel', 'AiPrompt', 'ModelExecution'],
    'Operations': ['TechDebt', 'Comment', 'ImprovementTask'],
  };

  for (const [category, models] of Object.entries(categories)) {
    if (models.includes(name)) {
      return category;
    }
  }
  return 'Other';
}

// Prisma 스키마 파싱
function parsePrismaSchema(content: string): ErdData {
  const models: ErdModel[] = [];
  const relations: ErdRelation[] = [];
  
  // 모델 블록 추출
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    const fields: ErdField[] = [];
    
    // 필드 파싱
    const lines = modelBody.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      
      // 필드 패턴: fieldName Type? @attributes
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
      if (fieldMatch) {
        const [, fieldName, fieldType, isArray, isOptional, rest] = fieldMatch;
        
        const isPrimaryKey = rest.includes('@id');
        const isRelation = rest.includes('@relation');
        const defaultMatch = rest.match(/@default\(([^)]+)\)/);
        const defaultValue = defaultMatch ? defaultMatch[1] : undefined;
        
        // 속성 추출
        const attributes: string[] = [];
        if (isPrimaryKey) attributes.push('@id');
        if (rest.includes('@unique')) attributes.push('@unique');
        if (rest.includes('@default')) attributes.push('@default');
        if (rest.includes('@updatedAt')) attributes.push('@updatedAt');
        
        fields.push({
          name: fieldName,
          type: fieldType,
          isPrimaryKey,
          isOptional: !!isOptional,
          isArray: !!isArray,
          isRelation,
          defaultValue,
          attributes,
        });
        
        // 관계 추출
        if (isRelation) {
          const relationMatch = rest.match(/@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/);
          if (relationMatch) {
            const [, fromField, toField] = relationMatch;
            relations.push({
              from: modelName,
              to: fieldType,
              fromField,
              toField,
              type: isArray ? '1-n' : 'n-1',
            });
          }
        }
      }
    }
    
    models.push({
      name: modelName,
      fields,
      category: categorizeModel(modelName),
    });
  }
  
  return { models, relations };
}

export async function GET() {
  try {
    // 프로젝트 루트에서 prisma/schema.prisma 읽기
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    
    const erdData = parsePrismaSchema(schemaContent);
    
    return NextResponse.json(erdData);
  } catch (error) {
    console.error('Failed to parse Prisma schema:', error);
    return NextResponse.json(
      { error: 'Failed to parse Prisma schema' },
      { status: 500 }
    );
  }
}
