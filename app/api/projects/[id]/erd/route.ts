import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { prisma } from '@/lib/db';

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
  schemaPath?: string;
  schemaType?: string;
  language?: string;
}

type SchemaType = 'prisma' | 'django' | 'sqlalchemy' | 'typeorm' | 'sequelize' | 'laravel' | 'rails' | 'spring' | 'dotnet' | 'go' | 'sql' | 'unknown';

// 프로젝트 언어 감지
function detectProjectLanguage(projectPath: string): { language: string; frameworks: string[] } {
  const files = new Map<string, boolean>();
  const frameworks: string[] = [];
  let language = 'unknown';
  
  try {
    const entries = readdirSync(projectPath);
    for (const entry of entries) {
      files.set(entry.toLowerCase(), true);
    }
  } catch (e) {
    return { language, frameworks };
  }
  
  // Python
  if (files.has('requirements.txt') || files.has('pyproject.toml') || files.has('setup.py') || files.has('pipfile')) {
    language = 'python';
    if (files.has('manage.py')) frameworks.push('django');
    if (existsSync(join(projectPath, 'alembic.ini'))) frameworks.push('sqlalchemy');
    if (existsSync(join(projectPath, 'app', 'models.py'))) frameworks.push('flask');
  }
  // JavaScript/TypeScript
  else if (files.has('package.json')) {
    language = 'javascript';
    try {
      const pkg = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.typescript) language = 'typescript';
      if (deps.prisma || deps['@prisma/client']) frameworks.push('prisma');
      if (deps.typeorm) frameworks.push('typeorm');
      if (deps.sequelize) frameworks.push('sequelize');
      if (deps.mongoose) frameworks.push('mongoose');
      if (deps.drizzle) frameworks.push('drizzle');
      if (deps.nextjs || deps.next) frameworks.push('nextjs');
    } catch (e) {}
  }
  // PHP/Laravel
  else if (files.has('composer.json')) {
    language = 'php';
    if (files.has('artisan')) frameworks.push('laravel');
  }
  // Ruby/Rails
  else if (files.has('gemfile')) {
    language = 'ruby';
    if (files.has('config.ru') || existsSync(join(projectPath, 'app', 'models'))) {
      frameworks.push('rails');
    }
  }
  // Java/Spring
  else if (files.has('pom.xml') || files.has('build.gradle') || files.has('build.gradle.kts')) {
    language = 'java';
    try {
      const pomPath = join(projectPath, 'pom.xml');
      if (existsSync(pomPath)) {
        const pom = readFileSync(pomPath, 'utf-8');
        if (pom.includes('spring-boot')) frameworks.push('spring');
        if (pom.includes('hibernate')) frameworks.push('hibernate');
      }
    } catch (e) {}
  }
  // Go
  else if (files.has('go.mod')) {
    language = 'go';
    try {
      const goMod = readFileSync(join(projectPath, 'go.mod'), 'utf-8');
      if (goMod.includes('gorm')) frameworks.push('gorm');
      if (goMod.includes('ent')) frameworks.push('ent');
    } catch (e) {}
  }
  // Rust
  else if (files.has('cargo.toml')) {
    language = 'rust';
    try {
      const cargo = readFileSync(join(projectPath, 'Cargo.toml'), 'utf-8');
      if (cargo.includes('diesel')) frameworks.push('diesel');
      if (cargo.includes('sea-orm')) frameworks.push('seaorm');
    } catch (e) {}
  }
  // C#/.NET (마지막에 체크)
  else {
    try {
      const dirEntries = readdirSync(projectPath);
      if (dirEntries.some(e => e.endsWith('.csproj') || e.endsWith('.sln'))) {
        language = 'csharp';
        frameworks.push('dotnet');
      }
    } catch (e) {}
  }
  
  return { language, frameworks };
}

// 모델 카테고리 분류
function categorizeModel(name: string): string {
  const lowerName = name.toLowerCase();
  
  const categories: [string[], string][] = [
    [['user', 'account', 'auth', 'member', 'profile'], 'User'],
    [['project', 'workspace', 'team', 'organization'], 'Project'],
    [['analysis', 'result', 'metric', 'report', 'stat'], 'Analysis'],
    [['code', 'file', 'element', 'source'], 'Code'],
    [['agent', 'task', 'job', 'queue', 'worker'], 'Agent'],
    [['security', 'vulnerability', 'risk', 'threat'], 'Security'],
    [['arch', 'service', 'module', 'component'], 'Architecture'],
    [['admin', 'role', 'permission', 'policy'], 'Admin'],
    [['ai', 'model', 'prompt', 'completion'], 'AI'],
    [['log', 'audit', 'history', 'event'], 'Logging'],
    [['config', 'setting', 'option', 'preference'], 'Config'],
    [['order', 'product', 'cart', 'payment', 'invoice'], 'Commerce'],
    [['post', 'comment', 'blog', 'article', 'content'], 'Content'],
    [['category', 'tag', 'label', 'group'], 'Taxonomy'],
    [['message', 'notification', 'email', 'sms'], 'Messaging'],
    [['session', 'token', 'refresh', 'oauth'], 'Session'],
  ];
  
  for (const [keywords, category] of categories) {
    if (keywords.some(k => lowerName.includes(k))) {
      return category;
    }
  }
  
  return 'Other';
}

// ===================== SCHEMA PARSERS =====================

// Prisma 스키마 파싱
function parsePrismaSchema(content: string): Omit<ErdData, 'schemaPath' | 'schemaType' | 'language'> {
  const models: ErdModel[] = [];
  const relations: ErdRelation[] = [];
  
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    const fields: ErdField[] = [];
    
    const lines = modelBody.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
      if (fieldMatch) {
        const [, fieldName, fieldType, isArray, isOptional, rest] = fieldMatch;
        
        const isPrimaryKey = rest.includes('@id');
        const isRelation = rest.includes('@relation');
        const defaultMatch = rest.match(/@default\(([^)]+)\)/);
        const defaultValue = defaultMatch ? defaultMatch[1] : undefined;
        
        const attributes: string[] = [];
        if (isPrimaryKey) attributes.push('@id');
        if (rest.includes('@unique')) attributes.push('@unique');
        if (rest.includes('@default')) attributes.push('@default');
        
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
        
        if (isRelation) {
          const relationMatch = rest.match(/@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/);
          if (relationMatch) {
            relations.push({
              from: modelName,
              to: fieldType,
              fromField: relationMatch[1],
              toField: relationMatch[2],
              type: isArray ? '1-n' : 'n-1',
            });
          }
        }
      }
    }
    
    models.push({ name: modelName, fields, category: categorizeModel(modelName) });
  }
  
  return { models, relations };
}

// Django models.py 파싱
function parseDjangoModels(content: string): Omit<ErdData, 'schemaPath' | 'schemaType' | 'language'> {
  const models: ErdModel[] = [];
  const relations: ErdRelation[] = [];
  
  // class ModelName(models.Model): 패턴
  const classRegex = /class\s+(\w+)\s*\(\s*(?:models\.Model|[\w.]+)\s*\):([\s\S]*?)(?=\nclass\s|\n[^\s]|$)/g;
  let match;
  
  while ((match = classRegex.exec(content)) !== null) {
    const modelName = match[1];
    const classBody = match[2];
    const fields: ErdField[] = [];
    
    // 필드 패턴: field_name = models.FieldType(...)
    const fieldRegex = /(\w+)\s*=\s*models\.(\w+)\s*\(([^)]*)\)/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(classBody)) !== null) {
      const [, fieldName, fieldType, args] = fieldMatch;
      
      const isPrimaryKey = fieldType === 'AutoField' || args.includes('primary_key=True');
      const isRelation = ['ForeignKey', 'OneToOneField', 'ManyToManyField'].includes(fieldType);
      const isOptional = args.includes('null=True') || args.includes('blank=True');
      const isArray = fieldType === 'ManyToManyField';
      
      const attributes: string[] = [];
      if (isPrimaryKey) attributes.push('primary_key');
      if (args.includes('unique=True')) attributes.push('unique');
      if (args.includes('default=')) attributes.push('default');
      
      fields.push({
        name: fieldName,
        type: fieldType,
        isPrimaryKey,
        isOptional,
        isArray,
        isRelation,
        attributes,
      });
      
      if (isRelation) {
        const targetMatch = args.match(/['"]?(\w+)['"]?/);
        if (targetMatch) {
          relations.push({
            from: modelName,
            to: targetMatch[1] === 'self' ? modelName : targetMatch[1],
            fromField: fieldName,
            toField: 'id',
            type: isArray ? 'n-n' : fieldType === 'OneToOneField' ? '1-1' : 'n-1',
          });
        }
      }
    }
    
    // id 필드 자동 추가 (없는 경우)
    if (!fields.some(f => f.isPrimaryKey)) {
      fields.unshift({
        name: 'id',
        type: 'AutoField',
        isPrimaryKey: true,
        isOptional: false,
        isArray: false,
        isRelation: false,
        attributes: ['primary_key'],
      });
    }
    
    models.push({ name: modelName, fields, category: categorizeModel(modelName) });
  }
  
  return { models, relations };
}

// TypeORM Entity 파싱
function parseTypeORMEntities(content: string): Omit<ErdData, 'schemaPath' | 'schemaType' | 'language'> {
  const models: ErdModel[] = [];
  const relations: ErdRelation[] = [];
  
  // @Entity() class 패턴
  const entityRegex = /@Entity\s*\([^)]*\)\s*(?:export\s+)?class\s+(\w+)[\s\S]*?\{([\s\S]*?)\n\}/g;
  let match;
  
  while ((match = entityRegex.exec(content)) !== null) {
    const modelName = match[1];
    const classBody = match[2];
    const fields: ErdField[] = [];
    
    // 컬럼 데코레이터 패턴
    const columnRegex = /@(PrimaryGeneratedColumn|PrimaryColumn|Column|ManyToOne|OneToMany|ManyToMany|OneToOne)\s*\(([^)]*)\)[\s\S]*?(\w+)\s*[?:]?\s*[:\s]*(\w+)?/g;
    let colMatch;
    
    while ((colMatch = columnRegex.exec(classBody)) !== null) {
      const [, decorator, args, fieldName, fieldType] = colMatch;
      
      const isPrimaryKey = decorator.includes('Primary');
      const isRelation = ['ManyToOne', 'OneToMany', 'ManyToMany', 'OneToOne'].includes(decorator);
      const isArray = decorator === 'OneToMany' || decorator === 'ManyToMany';
      
      fields.push({
        name: fieldName,
        type: fieldType || 'unknown',
        isPrimaryKey,
        isOptional: false,
        isArray,
        isRelation,
        attributes: [decorator],
      });
      
      if (isRelation && fieldType) {
        const relType = decorator === 'OneToOne' ? '1-1' : 
                        decorator === 'ManyToOne' ? 'n-1' :
                        decorator === 'OneToMany' ? '1-n' : 'n-n';
        relations.push({
          from: modelName,
          to: fieldType.replace(/[\[\]]/g, ''),
          fromField: fieldName,
          toField: 'id',
          type: relType,
        });
      }
    }
    
    models.push({ name: modelName, fields, category: categorizeModel(modelName) });
  }
  
  return { models, relations };
}

// SQL DDL 파싱
function parseSQLSchema(content: string): Omit<ErdData, 'schemaPath' | 'schemaType' | 'language'> {
  const models: ErdModel[] = [];
  const relations: ErdRelation[] = [];
  
  // CREATE TABLE 패턴
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\);/gi;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const tableBody = match[2];
    const fields: ErdField[] = [];
    
    // 컬럼 정의 파싱
    const lines = tableBody.split(',');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toUpperCase().startsWith('PRIMARY KEY') || 
          trimmed.toUpperCase().startsWith('FOREIGN KEY') ||
          trimmed.toUpperCase().startsWith('CONSTRAINT') ||
          trimmed.toUpperCase().startsWith('INDEX') ||
          trimmed.toUpperCase().startsWith('KEY')) continue;
      
      const colMatch = trimmed.match(/^[`"']?(\w+)[`"']?\s+(\w+)(?:\([^)]+\))?(.*)$/i);
      if (colMatch) {
        const [, colName, colType, rest] = colMatch;
        const upperRest = rest.toUpperCase();
        
        fields.push({
          name: colName,
          type: colType.toUpperCase(),
          isPrimaryKey: upperRest.includes('PRIMARY KEY') || upperRest.includes('AUTO_INCREMENT'),
          isOptional: !upperRest.includes('NOT NULL'),
          isArray: false,
          isRelation: false,
          attributes: [],
        });
      }
    }
    
    // FOREIGN KEY 추출
    const fkRegex = /FOREIGN\s+KEY\s*\([`"']?(\w+)[`"']?\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\([`"']?(\w+)[`"']?\)/gi;
    let fkMatch: RegExpExecArray | null;
    while ((fkMatch = fkRegex.exec(tableBody)) !== null) {
      const matchResult = fkMatch;
      relations.push({
        from: tableName,
        to: matchResult[2],
        fromField: matchResult[1],
        toField: matchResult[3],
        type: 'n-1',
      });
      
      const field = fields.find(f => f.name === matchResult[1]);
      if (field) field.isRelation = true;
    }
    
    models.push({ name: tableName, fields, category: categorizeModel(tableName) });
  }
  
  return { models, relations };
}

// Laravel Eloquent 파싱 (PHP)
function parseLaravelModels(content: string): Omit<ErdData, 'schemaPath' | 'schemaType' | 'language'> {
  const models: ErdModel[] = [];
  const relations: ErdRelation[] = [];
  
  // class ModelName extends Model 패턴
  const classRegex = /class\s+(\w+)\s+extends\s+(?:Model|Eloquent)([\s\S]*?)\n\}/g;
  let match;
  
  while ((match = classRegex.exec(content)) !== null) {
    const modelName = match[1];
    const classBody = match[2];
    const fields: ErdField[] = [];
    
    // $fillable 배열에서 필드 추출
    const fillableMatch = classBody.match(/\$fillable\s*=\s*\[([\s\S]*?)\]/);
    if (fillableMatch) {
      const fieldNames = fillableMatch[1].match(/'(\w+)'/g);
      if (fieldNames) {
        for (const fn of fieldNames) {
          fields.push({
            name: fn.replace(/'/g, ''),
            type: 'string',
            isPrimaryKey: false,
            isOptional: true,
            isArray: false,
            isRelation: false,
            attributes: ['fillable'],
          });
        }
      }
    }
    
    // 관계 메서드 추출
    const relRegex = /function\s+(\w+)\s*\(\s*\)\s*(?::\s*\w+)?\s*\{\s*return\s+\$this->(belongsTo|hasMany|hasOne|belongsToMany)\s*\(\s*(\w+)::class/g;
    let relMatch;
    while ((relMatch = relRegex.exec(classBody)) !== null) {
      const [, methodName, relType, targetModel] = relMatch;
      
      const type = relType === 'hasOne' ? '1-1' :
                   relType === 'hasMany' ? '1-n' :
                   relType === 'belongsTo' ? 'n-1' : 'n-n';
      
      relations.push({
        from: modelName,
        to: targetModel,
        fromField: methodName,
        toField: 'id',
        type,
      });
    }
    
    // id 필드 추가
    fields.unshift({
      name: 'id',
      type: 'integer',
      isPrimaryKey: true,
      isOptional: false,
      isArray: false,
      isRelation: false,
      attributes: ['primary_key'],
    });
    
    models.push({ name: modelName, fields, category: categorizeModel(modelName) });
  }
  
  return { models, relations };
}

// Java JPA/Hibernate Entity 파싱
function parseJavaEntities(content: string): Omit<ErdData, 'schemaPath' | 'schemaType' | 'language'> {
  const models: ErdModel[] = [];
  const relations: ErdRelation[] = [];
  
  // @Entity class 패턴
  const entityRegex = /@Entity[\s\S]*?(?:@Table\s*\(\s*name\s*=\s*["'](\w+)["']\s*\))?\s*public\s+class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{([\s\S]*?)(?=\n@Entity|\npublic\s+class|$)/g;
  let match;
  
  while ((match = entityRegex.exec(content)) !== null) {
    const tableName = match[1];
    const className = match[2];
    const classBody = match[3];
    const modelName = tableName || className;
    const fields: ErdField[] = [];
    
    // 필드 파싱 (private Type fieldName;)
    const fieldRegex = /(?:@(\w+)(?:\([^)]*\))?[\s\S]*?)*private\s+(\w+)(?:<[\w<>,\s]+>)?\s+(\w+)\s*;/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(classBody)) !== null) {
      const annotations = classBody.substring(
        Math.max(0, classBody.lastIndexOf('\n', fieldMatch.index)),
        fieldMatch.index
      );
      
      const fieldType = fieldMatch[2];
      const fieldName = fieldMatch[3];
      
      const isPrimaryKey = annotations.includes('@Id');
      const isRelation = annotations.includes('@ManyToOne') || 
                         annotations.includes('@OneToMany') || 
                         annotations.includes('@OneToOne') || 
                         annotations.includes('@ManyToMany');
      const isOptional = annotations.includes('nullable = true') || 
                         annotations.includes('optional = true');
      const isArray = fieldType === 'List' || fieldType === 'Set' || fieldType === 'Collection';
      
      const attributes: string[] = [];
      if (isPrimaryKey) attributes.push('@Id');
      if (annotations.includes('@Column')) attributes.push('@Column');
      if (annotations.includes('@GeneratedValue')) attributes.push('@GeneratedValue');
      if (annotations.includes('@JoinColumn')) attributes.push('@JoinColumn');
      
      fields.push({
        name: fieldName,
        type: fieldType,
        isPrimaryKey,
        isOptional,
        isArray,
        isRelation,
        attributes,
      });
      
      // 관계 추출
      if (isRelation) {
        let relType: '1-1' | '1-n' | 'n-1' | 'n-n' = 'n-1';
        if (annotations.includes('@OneToOne')) relType = '1-1';
        else if (annotations.includes('@OneToMany')) relType = '1-n';
        else if (annotations.includes('@ManyToMany')) relType = 'n-n';
        
        // 타겟 엔티티 추출
        const targetMatch = annotations.match(/(?:targetEntity\s*=\s*)?(\w+)\.class/) ||
                           annotations.match(/@(?:ManyToOne|OneToOne|OneToMany|ManyToMany)\s*(?:\([^)]*\))?\s*(?:@\w+\s*(?:\([^)]*\))?)*\s*private\s+(?:List|Set|Collection)?(?:<)?(\w+)/);
        
        if (targetMatch) {
          relations.push({
            from: modelName,
            to: targetMatch[1] || targetMatch[2] || fieldType,
            fromField: fieldName,
            toField: 'id',
            type: relType,
          });
        }
      }
    }
    
    // id 필드가 없으면 추가
    if (!fields.some(f => f.isPrimaryKey)) {
      fields.unshift({
        name: 'id',
        type: 'Long',
        isPrimaryKey: true,
        isOptional: false,
        isArray: false,
        isRelation: false,
        attributes: ['@Id', '@GeneratedValue'],
      });
    }
    
    models.push({ name: modelName, fields, category: categorizeModel(modelName) });
  }
  
  return { models, relations };
}

// Python SQLAlchemy/FastAPI SQLModel 파싱
function parsePythonModels(content: string): Omit<ErdData, 'schemaPath' | 'schemaType' | 'language'> {
  const models: ErdModel[] = [];
  const relations: ErdRelation[] = [];
  
  // class ModelName(Base): 또는 class ModelName(SQLModel, table=True): 패턴
  const classRegex = /class\s+(\w+)\s*\(\s*(?:Base|SQLModel|db\.Model|DeclarativeBase)[\w\s,=]*\)\s*:([\s\S]*?)(?=\nclass\s|\n[^\s#]|$)/g;
  let match;
  
  while ((match = classRegex.exec(content)) !== null) {
    const modelName = match[1];
    const classBody = match[2];
    const fields: ErdField[] = [];
    
    // __tablename__ 추출
    const tableNameMatch = classBody.match(/__tablename__\s*=\s*['"](\w+)['"]/);
    const tableName = tableNameMatch ? tableNameMatch[1] : modelName.toLowerCase();
    
    // SQLAlchemy Column 필드 패턴
    const columnRegex = /(\w+)(?:\s*:\s*[\w\[\]]+)?\s*=\s*(?:Column|Field|mapped_column)\s*\(\s*([\w.]+)?([^)]*)\)/g;
    let colMatch;
    
    while ((colMatch = columnRegex.exec(classBody)) !== null) {
      const [, fieldName, fieldType, args] = colMatch;
      
      const isPrimaryKey = args.includes('primary_key=True') || args.includes('primary_key: True');
      const isRelation = fieldType?.includes('ForeignKey') || args.includes('ForeignKey');
      const isOptional = args.includes('nullable=True') || args.includes('Optional');
      
      const attributes: string[] = [];
      if (isPrimaryKey) attributes.push('primary_key');
      if (args.includes('unique=True')) attributes.push('unique');
      if (args.includes('index=True')) attributes.push('index');
      if (args.includes('default=')) attributes.push('default');
      
      fields.push({
        name: fieldName,
        type: fieldType || 'String',
        isPrimaryKey,
        isOptional,
        isArray: false,
        isRelation,
        attributes,
      });
      
      // ForeignKey 관계 추출
      if (isRelation) {
        const fkMatch = args.match(/ForeignKey\s*\(\s*['"](\w+)\.(\w+)['"]/);
        if (fkMatch) {
          relations.push({
            from: modelName,
            to: fkMatch[1].charAt(0).toUpperCase() + fkMatch[1].slice(1),
            fromField: fieldName,
            toField: fkMatch[2],
            type: 'n-1',
          });
        }
      }
    }
    
    // relationship 필드 파싱
    const relRegex = /(\w+)(?:\s*:\s*[\w\[\]"]+)?\s*=\s*relationship\s*\(\s*['"]?(\w+)['"]?/g;
    let relMatch;
    while ((relMatch = relRegex.exec(classBody)) !== null) {
      const [, fieldName, targetModel] = relMatch;
      const isBackRef = classBody.includes('back_populates');
      
      fields.push({
        name: fieldName,
        type: targetModel,
        isPrimaryKey: false,
        isOptional: true,
        isArray: classBody.includes(`List["${targetModel}"]`) || classBody.includes(`list[${targetModel}]`),
        isRelation: true,
        attributes: ['relationship'],
      });
    }
    
    // id 필드가 없으면 추가
    if (!fields.some(f => f.isPrimaryKey)) {
      fields.unshift({
        name: 'id',
        type: 'Integer',
        isPrimaryKey: true,
        isOptional: false,
        isArray: false,
        isRelation: false,
        attributes: ['primary_key'],
      });
    }
    
    models.push({ name: modelName, fields, category: categorizeModel(modelName) });
  }
  
  return { models, relations };
}

// ===================== SCHEMA FINDER =====================

interface SchemaFile {
  path: string;
  type: SchemaType;
  content?: string;
}

function findSchemaFiles(projectPath: string, frameworks: string[]): SchemaFile[] {
  const schemaFiles: SchemaFile[] = [];
  
  // 프레임워크별 스키마 파일 위치
  const schemaPatterns: Record<string, { paths: string[]; type: SchemaType }> = {
    // JavaScript/TypeScript
    prisma: { paths: ['prisma/schema.prisma', 'schema.prisma'], type: 'prisma' },
    typeorm: { paths: ['src/entity/*.ts', 'src/entities/*.ts', 'entities/*.ts', '**/entity/*.ts'], type: 'typeorm' },
    sequelize: { paths: ['models/*.js', 'models/*.ts', 'src/models/*.ts'], type: 'sequelize' },
    
    // Python
    django: { paths: ['**/models.py', 'models.py', 'app/models.py'], type: 'django' },
    sqlalchemy: { paths: ['**/models.py', 'models/*.py', 'app/models/*.py'], type: 'sqlalchemy' },
    fastapi: { paths: ['app/models.py', 'src/models.py', '**/models.py'], type: 'sqlalchemy' },
    flask: { paths: ['app/models.py', 'models.py'], type: 'sqlalchemy' },
    
    // Java/Spring
    spring: { paths: ['src/main/java/**/entity/*.java', 'src/main/java/**/model/*.java', 'src/main/java/**/domain/*.java'], type: 'spring' },
    hibernate: { paths: ['src/main/java/**/entity/*.java', 'src/main/java/**/*.java'], type: 'spring' },
    
    // PHP
    laravel: { paths: ['app/Models/*.php', 'app/*.php'], type: 'laravel' },
    
    // Ruby
    rails: { paths: ['app/models/*.rb', 'db/schema.rb'], type: 'rails' },
    
    // .NET
    dotnet: { paths: ['Models/*.cs', '**/Models/*.cs', '**/Entities/*.cs', '**/Domain/*.cs'], type: 'dotnet' },
    
    // Go
    gorm: { paths: ['models/*.go', 'model/*.go', '**/model/*.go', 'internal/models/*.go'], type: 'go' },
    ent: { paths: ['ent/schema/*.go'], type: 'go' },
  };
  
  // 우선순위: 감지된 프레임워크부터 검색
  const searchOrder = [...frameworks, ...Object.keys(schemaPatterns).filter(k => !frameworks.includes(k))];
  
  for (const framework of searchOrder) {
    const pattern = schemaPatterns[framework];
    if (!pattern) continue;
    
    for (const pathPattern of pattern.paths) {
      const found = searchForSchema(projectPath, pathPattern, pattern.type);
      schemaFiles.push(...found);
    }
    
    if (schemaFiles.length > 0) break; // 첫 번째로 찾은 스키마 사용
  }
  
  // SQL 파일도 검색 (폴백)
  if (schemaFiles.length === 0) {
    const sqlFiles = searchForSchema(projectPath, '*.sql', 'sql');
    schemaFiles.push(...sqlFiles);
  }
  
  return schemaFiles;
}

function searchForSchema(projectPath: string, pattern: string, type: SchemaType): SchemaFile[] {
  const results: SchemaFile[] = [];
  
  function search(dir: string, depth: number) {
    if (depth > 4) return;
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'vendor'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        
        try {
          const stat = statSync(fullPath);
          
          if (stat.isFile()) {
            const ext = extname(entry);
            const name = basename(entry);
            
            // 패턴 매칭
            if (pattern.includes('*')) {
              const patternExt = extname(pattern);
              const patternBase = basename(pattern).replace('*', '');
              
              if ((patternExt === ext || patternExt === '.*') && 
                  (patternBase === '' || entry.includes(patternBase.replace('*', '')))) {
                results.push({ path: fullPath, type });
              }
            } else if (pattern === entry || pattern.endsWith(entry)) {
              results.push({ path: fullPath, type });
            }
          } else if (stat.isDirectory()) {
            search(fullPath, depth + 1);
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {}
  }
  
  search(projectPath, 0);
  return results.slice(0, 5); // 최대 5개
}

// ===================== MAIN HANDLER =====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, path: true }
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found', models: [], relations: [] }, { status: 200 });
    }
    
    if (!project.path || !existsSync(project.path)) {
      return NextResponse.json({ 
        error: 'Project path not found', 
        projectPath: project.path,
        models: [], 
        relations: [] 
      }, { status: 200 });
    }
    
    // 프로젝트 언어 및 프레임워크 감지
    const { language, frameworks } = detectProjectLanguage(project.path);
    
    // 스키마 파일 찾기
    const schemaFiles = findSchemaFiles(project.path, frameworks);
    
    if (schemaFiles.length === 0) {
      return NextResponse.json({
        error: 'No schema files found',
        message: `프로젝트에서 스키마 파일을 찾을 수 없습니다. (감지된 언어: ${language}, 프레임워크: ${frameworks.join(', ') || 'none'})`,
        searchedPath: project.path,
        language,
        frameworks,
        models: [],
        relations: []
      }, { status: 200 });
    }
    
    // 첫 번째 스키마 파일 파싱
    const schemaFile = schemaFiles[0];
    const content = readFileSync(schemaFile.path, 'utf-8');
    
    let erdData: Omit<ErdData, 'schemaPath' | 'schemaType' | 'language'>;
    
    switch (schemaFile.type) {
      case 'prisma':
        erdData = parsePrismaSchema(content);
        break;
      case 'django':
        erdData = parseDjangoModels(content);
        break;
      case 'sqlalchemy':
        // Python SQLAlchemy/SQLModel 파서 사용
        erdData = parsePythonModels(content);
        // 결과가 없으면 Django 파서 시도
        if (erdData.models.length === 0) {
          erdData = parseDjangoModels(content);
        }
        break;
      case 'typeorm':
        erdData = parseTypeORMEntities(content);
        break;
      case 'spring':
        // Java JPA/Hibernate 파서 사용
        erdData = parseJavaEntities(content);
        break;
      case 'laravel':
        erdData = parseLaravelModels(content);
        break;
      case 'sql':
        erdData = parseSQLSchema(content);
        break;
      default:
        // 파일 확장자 기반 폴백
        const ext = schemaFile.path.toLowerCase();
        if (ext.endsWith('.java')) {
          erdData = parseJavaEntities(content);
        } else if (ext.endsWith('.py')) {
          erdData = parsePythonModels(content);
          if (erdData.models.length === 0) {
            erdData = parseDjangoModels(content);
          }
        } else if (ext.endsWith('.prisma')) {
          erdData = parsePrismaSchema(content);
        } else if (ext.endsWith('.sql')) {
          erdData = parseSQLSchema(content);
        } else if (ext.endsWith('.ts') || ext.endsWith('.js')) {
          erdData = parseTypeORMEntities(content);
        } else if (ext.endsWith('.php')) {
          erdData = parseLaravelModels(content);
        } else {
          // 최후의 폴백: 모든 파서 시도
          erdData = parsePrismaSchema(content);
          if (erdData.models.length === 0) erdData = parseJavaEntities(content);
          if (erdData.models.length === 0) erdData = parsePythonModels(content);
          if (erdData.models.length === 0) erdData = parseDjangoModels(content);
          if (erdData.models.length === 0) erdData = parseSQLSchema(content);
        }
    }
    
    return NextResponse.json({
      ...erdData,
      schemaPath: schemaFile.path.replace(project.path, ''),
      schemaType: schemaFile.type,
      language,
      frameworks,
      projectName: project.name,
      projectPath: project.path,
      availableSchemas: schemaFiles.map(s => ({ path: s.path.replace(project.path, ''), type: s.type }))
    });
    
  } catch (error) {
    console.error('Failed to parse schema:', error);
    return NextResponse.json({
      error: 'Failed to parse schema',
      details: error instanceof Error ? error.message : String(error),
      models: [],
      relations: []
    }, { status: 200 });
  }
}
