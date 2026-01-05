import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { prisma } from '@/lib/db';

interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
  in: 'path' | 'query' | 'body' | 'header';
}

interface ApiRequestBody {
  contentType: string;
  schema?: string;
  example?: string;
  required: boolean;
}

interface ApiResponse {
  statusCode: number;
  contentType?: string;
  schema?: string;
  description?: string;
}

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  path: string;
  filePath: string;
  fileName: string;
  handler: string;
  params: string[];
  // 상세 파라미터 정보
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses?: ApiResponse[];
  // 기타 메타데이터
  queryParams?: string[];
  middleware?: string[];
  description?: string;
  summary?: string;
  responseType?: string;
  isAsync: boolean;
  lineNumber: number;
  framework: string;
  auth?: 'jwt' | 'session' | 'apikey' | 'oauth' | 'basic' | 'bearer' | 'none';
  deprecated?: boolean;
  tags?: string[];
  contentType?: string;
  headers?: { name: string; value: string; required: boolean }[];
  // 고급 메타데이터 (NEW)
  validation?: {
    rules: { field: string; rule: string; message?: string }[];
    schema?: string;
  };
  rateLimit?: {
    limit: number;
    window: string;
    key?: string;
  };
  cache?: {
    ttl?: number;
    strategy?: 'private' | 'public' | 'no-cache' | 'no-store';
    tags?: string[];
  };
  apiVersion?: string;
  operationId?: string;
  security?: string[];
  cors?: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
  };
  // 분석 메타데이터 (Enhanced)
  complexity?: {
    score: number; // 1-10 scale
    factors: string[];
    cyclomaticComplexity?: number;
  };
  documentationScore?: {
    score: number; // 0-100
    hasDescription: boolean;
    hasParameterDocs: boolean;
    hasResponseDocs: boolean;
    hasExamples: boolean;
  };
  securityAnalysis?: {
    issues: { severity: 'low' | 'medium' | 'high' | 'critical'; message: string; recommendation: string }[];
    hasAuth: boolean;
    hasRateLimit: boolean;
    hasInputValidation: boolean;
    hasSanitization: boolean;
  };
  performance?: {
    hasCaching: boolean;
    hasCompression: boolean;
    hasPagination: boolean;
    estimatedLatency?: 'low' | 'medium' | 'high';
  };
  // 추가 분석 메타데이터 (Enhanced v2)
  namingConvention?: {
    followsRESTful: boolean;
    usesKebabCase: boolean;
    usesCamelCase: boolean;
    usesSnakeCase: boolean;
    issues: string[];
    score: number; // 0-100
  };
  testCoverage?: {
    hasUnitTest: boolean;
    hasIntegrationTest: boolean;
    hasE2ETest: boolean;
    testFilePath?: string;
  };
  consistency?: {
    responseFormat: 'json' | 'xml' | 'html' | 'mixed' | 'unknown';
    errorHandling: 'consistent' | 'inconsistent' | 'unknown';
    versioningStyle: 'path' | 'header' | 'query' | 'none';
  };
  healthScore?: {
    overall: number; // 0-100
    security: number;
    documentation: number;
    performance: number;
    naming: number;
  };
  // 변경 이력 추적
  changeRisk?: {
    level: 'low' | 'medium' | 'high';
    breakingChangeRisk: boolean;
    dependentEndpoints: string[];
  };
  // 고급 분석 메타데이터 (Enhanced v3)
  similarity?: {
    similarEndpoints: { path: string; method: string; score: number }[];
    potentialDuplicate: boolean;
  };
  mockData?: {
    responseExample: string;
    requestExample?: string;
    generatedAt?: string;
  };
  sdkSnippets?: {
    typescript?: string;
    python?: string;
    curl?: string;
    javascript?: string;
  };
  dependencies?: {
    callsEndpoints: string[];
    calledByEndpoints: string[];
    externalApis: string[];
  };
  usageHints?: {
    recommendedHeaders: { name: string; value: string; description: string }[];
    commonErrors: { code: number; message: string; solution: string }[];
    bestPractices: string[];
  };
}

interface ApiGroup {
  prefix: string;
  endpoints: ApiEndpoint[];
  subGroups?: ApiGroup[];
}

// 프레임워크 감지 (확장)
function detectFramework(projectPath: string): string {
  try {
    // Node.js/JavaScript/TypeScript
    if (existsSync(join(projectPath, 'package.json'))) {
      const pkg = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) return 'nextjs';
      if (deps.express) return 'express';
      if (deps.fastify) return 'fastify';
      if (deps['@nestjs/core']) return 'nestjs';
      if (deps.koa) return 'koa';
      if (deps.hono) return 'hono';
      if (deps['@trpc/server']) return 'trpc';
      if (deps['@hapi/hapi']) return 'hapi';
      if (deps.restify) return 'restify';
    }
    
    // Python
    if (existsSync(join(projectPath, 'requirements.txt'))) {
      const req = readFileSync(join(projectPath, 'requirements.txt'), 'utf-8');
      if (req.includes('fastapi')) return 'fastapi';
      if (req.includes('flask')) return 'flask';
      if (req.includes('django')) return 'django';
      if (req.includes('tornado')) return 'tornado';
      if (req.includes('aiohttp')) return 'aiohttp';
      if (req.includes('sanic')) return 'sanic';
    }
    if (existsSync(join(projectPath, 'pyproject.toml'))) {
      const pyproject = readFileSync(join(projectPath, 'pyproject.toml'), 'utf-8');
      if (pyproject.includes('fastapi')) return 'fastapi';
      if (pyproject.includes('django')) return 'django';
      if (pyproject.includes('flask')) return 'flask';
    }
    
    // Java/Kotlin
    if (existsSync(join(projectPath, 'pom.xml'))) {
      const pom = readFileSync(join(projectPath, 'pom.xml'), 'utf-8');
      if (pom.includes('spring-boot')) return 'spring';
      if (pom.includes('quarkus')) return 'quarkus';
      if (pom.includes('micronaut')) return 'micronaut';
      if (pom.includes('vertx')) return 'vertx';
      return 'spring';
    }
    if (existsSync(join(projectPath, 'build.gradle')) || existsSync(join(projectPath, 'build.gradle.kts'))) {
      return 'spring';
    }
    
    // Go
    if (existsSync(join(projectPath, 'go.mod'))) {
      const goMod = readFileSync(join(projectPath, 'go.mod'), 'utf-8');
      if (goMod.includes('gin-gonic')) return 'gin';
      if (goMod.includes('labstack/echo')) return 'echo';
      if (goMod.includes('gofiber/fiber')) return 'fiber';
      if (goMod.includes('gorilla/mux')) return 'gorilla';
      if (goMod.includes('go-chi/chi')) return 'chi';
      return 'go-http';
    }
    
    // Ruby
    if (existsSync(join(projectPath, 'Gemfile'))) {
      const gemfile = readFileSync(join(projectPath, 'Gemfile'), 'utf-8');
      if (gemfile.includes('rails')) return 'rails';
      if (gemfile.includes('sinatra')) return 'sinatra';
      if (gemfile.includes('grape')) return 'grape';
      if (gemfile.includes('hanami')) return 'hanami';
    }
    
    // PHP
    if (existsSync(join(projectPath, 'composer.json'))) {
      const composer = JSON.parse(readFileSync(join(projectPath, 'composer.json'), 'utf-8'));
      const require = { ...composer.require, ...composer['require-dev'] };
      if (require['laravel/framework']) return 'laravel';
      if (require['symfony/framework-bundle']) return 'symfony';
      if (require['slim/slim']) return 'slim';
      if (require['yiisoft/yii2']) return 'yii';
    }
    
    // .NET / C#
    if (existsSync(join(projectPath, 'Program.cs')) || existsSync(join(projectPath, 'Startup.cs'))) {
      return 'aspnet';
    }
    const csprojFiles = readdirSync(projectPath).filter(f => f.endsWith('.csproj'));
    if (csprojFiles.length > 0) {
      const csproj = readFileSync(join(projectPath, csprojFiles[0]), 'utf-8');
      if (csproj.includes('Microsoft.AspNetCore')) return 'aspnet';
    }
    
    // Rust
    if (existsSync(join(projectPath, 'Cargo.toml'))) {
      const cargo = readFileSync(join(projectPath, 'Cargo.toml'), 'utf-8');
      if (cargo.includes('actix-web')) return 'actix';
      if (cargo.includes('rocket')) return 'rocket';
      if (cargo.includes('axum')) return 'axum';
      if (cargo.includes('warp')) return 'warp';
    }
    
    // Dart/Flutter
    if (existsSync(join(projectPath, 'pubspec.yaml'))) {
      const pubspec = readFileSync(join(projectPath, 'pubspec.yaml'), 'utf-8');
      if (pubspec.includes('shelf')) return 'shelf';
      if (pubspec.includes('aqueduct')) return 'aqueduct';
    }
    
  } catch (e) {}
  return 'unknown';
}

// ===== 파라미터 추출 헬퍼 함수들 =====

// TypeScript/JavaScript에서 함수 파라미터와 타입 추출
function extractTsParams(content: string, startIndex: number): { params: ApiParameter[], body?: ApiRequestBody, responses: ApiResponse[] } {
  const params: ApiParameter[] = [];
  const responses: ApiResponse[] = [];
  let body: ApiRequestBody | undefined;
  
  // 함수 시그니처에서 파라미터 추출
  const funcContent = content.substring(startIndex, startIndex + 1000);
  
  // request.json() - body 추출
  if (funcContent.includes('request.json()') || funcContent.includes('req.body')) {
    body = {
      contentType: 'application/json',
      required: true,
    };
    
    // 타입 추출 시도: const data: UserInput = await request.json()
    const bodyTypeMatch = funcContent.match(/(?:const|let)\s+(\w+)(?::\s*(\w+))?\s*=\s*await\s+request\.json\(\)/);
    if (bodyTypeMatch && bodyTypeMatch[2]) {
      body.schema = bodyTypeMatch[2];
    }
  }
  
  // request.formData() - multipart body
  if (funcContent.includes('request.formData()') || funcContent.includes('req.files')) {
    body = {
      contentType: 'multipart/form-data',
      required: true,
    };
  }
  
  // URL query params: searchParams.get('key'), req.query.key
  const queryMatches = funcContent.matchAll(/searchParams\.get\s*\(\s*['"](\w+)['"]\)|req\.query\.(\w+)/g);
  for (const m of queryMatches) {
    const name = m[1] || m[2];
    if (!params.some(p => p.name === name)) {
      params.push({
        name,
        type: 'string',
        required: false,
        in: 'query',
      });
    }
  }
  
  // req.query 구조분해: const { id, name } = req.query
  const queryDestructMatch = funcContent.match(/const\s*\{([^}]+)\}\s*=\s*req\.query/);
  if (queryDestructMatch) {
    const names = queryDestructMatch[1].split(',').map(s => s.trim().split(':')[0].trim());
    for (const name of names) {
      if (name && !params.some(p => p.name === name)) {
        params.push({ name, type: 'string', required: false, in: 'query' });
      }
    }
  }
  
  // Response detection
  if (funcContent.includes('NextResponse.json') || funcContent.includes('res.json')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
  }
  if (funcContent.includes('status: 201') || funcContent.includes('status(201)')) {
    responses.push({ statusCode: 201, description: 'Created' });
  }
  if (funcContent.includes('status: 400') || funcContent.includes('status(400)')) {
    responses.push({ statusCode: 400, description: 'Bad Request' });
  }
  if (funcContent.includes('status: 401') || funcContent.includes('status(401)')) {
    responses.push({ statusCode: 401, description: 'Unauthorized' });
  }
  if (funcContent.includes('status: 404') || funcContent.includes('status(404)')) {
    responses.push({ statusCode: 404, description: 'Not Found' });
  }
  if (funcContent.includes('status: 500') || funcContent.includes('status(500)')) {
    responses.push({ statusCode: 500, description: 'Internal Server Error' });
  }
  
  // Auth detection
  const authMatch = funcContent.match(/(?:getServerSession|getToken|jwt\.verify|Bearer|auth\(\)|requireAuth)/i);
  
  return { params, body, responses };
}

// Python에서 파라미터 추출
function extractPythonParams(content: string, startIndex: number): { params: ApiParameter[], body?: ApiRequestBody, responses: ApiResponse[] } {
  const params: ApiParameter[] = [];
  const responses: ApiResponse[] = [];
  let body: ApiRequestBody | undefined;
  
  const funcContent = content.substring(startIndex, startIndex + 1000);
  
  // FastAPI Path/Query params: def endpoint(id: int, name: str = Query(...))
  const paramMatches = funcContent.matchAll(/(\w+)\s*:\s*(\w+)(?:\s*=\s*(?:Query\([^)]*\)|Path\([^)]*\)|([^,)]+)))?/g);
  for (const m of paramMatches) {
    const name = m[1];
    const type = m[2];
    if (['request', 'response', 'db', 'session', 'self', 'cls', 'background_tasks'].includes(name.toLowerCase())) continue;
    
    const required = !m[3] || m[3].includes('...');
    params.push({
      name,
      type: type || 'string',
      required,
      in: funcContent.includes(`Path(`) && funcContent.includes(name) ? 'path' : 'query',
    });
  }
  
  // Pydantic body: def endpoint(data: UserCreate)
  const bodyMatch = funcContent.match(/(\w+)\s*:\s*(\w+(?:Model|Schema|Input|Create|Update|Request))/);
  if (bodyMatch) {
    body = {
      contentType: 'application/json',
      schema: bodyMatch[2],
      required: true,
    };
  }
  
  // Response
  if (funcContent.includes('JSONResponse') || funcContent.includes('return {')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
  }
  
  return { params, body, responses };
}

// Java/Spring에서 파라미터 추출
function extractJavaParams(content: string, startIndex: number): { params: ApiParameter[], body?: ApiRequestBody, responses: ApiResponse[] } {
  const params: ApiParameter[] = [];
  const responses: ApiResponse[] = [];
  let body: ApiRequestBody | undefined;
  
  const funcContent = content.substring(startIndex, startIndex + 1500);
  
  // @RequestParam
  const requestParamMatches = funcContent.matchAll(/@RequestParam(?:\([^)]*\))?\s*(?:(\w+)\s+)?(\w+)/g);
  for (const m of requestParamMatches) {
    params.push({
      name: m[2],
      type: m[1] || 'String',
      required: !funcContent.includes(`@RequestParam(required = false, name = "${m[2]}")`),
      in: 'query',
    });
  }
  
  // @PathVariable
  const pathVarMatches = funcContent.matchAll(/@PathVariable(?:\([^)]*\))?\s*(?:(\w+)\s+)?(\w+)/g);
  for (const m of pathVarMatches) {
    params.push({
      name: m[2],
      type: m[1] || 'String',
      required: true,
      in: 'path',
    });
  }
  
  // @RequestBody
  const bodyMatch = funcContent.match(/@RequestBody\s+(\w+)\s+(\w+)/);
  if (bodyMatch) {
    body = {
      contentType: 'application/json',
      schema: bodyMatch[1],
      required: true,
    };
  }
  
  // @RequestHeader
  const headerMatches = funcContent.matchAll(/@RequestHeader(?:\([^)]*\))?\s*(?:(\w+)\s+)?(\w+)/g);
  for (const m of headerMatches) {
    params.push({
      name: m[2],
      type: m[1] || 'String',
      required: true,
      in: 'header',
    });
  }
  
  // ResponseEntity
  if (funcContent.includes('ResponseEntity')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
    if (funcContent.includes('ResponseEntity.status(201)') || funcContent.includes('HttpStatus.CREATED')) {
      responses.push({ statusCode: 201, description: 'Created' });
    }
  }
  
  return { params, body, responses };
}

// 레거시 Java 프레임워크 파라미터 추출 (Servlet, Struts, JSP)
function extractLegacyJavaParams(content: string, startIndex: number): { params: ApiParameter[], body?: ApiRequestBody, responses: ApiResponse[] } {
  const params: ApiParameter[] = [];
  const responses: ApiResponse[] = [];
  let body: ApiRequestBody | undefined;
  
  const funcContent = content.substring(startIndex, startIndex + 2000);
  
  // ===== Servlet =====
  // request.getParameter("key")
  const servletParamMatches = funcContent.matchAll(/request\.getParameter\s*\(\s*["'](\w+)["']\)/g);
  for (const m of servletParamMatches) {
    params.push({ name: m[1], type: 'String', required: false, in: 'query' });
  }
  
  // request.getParameterValues("key")
  const arrayParamMatches = funcContent.matchAll(/request\.getParameterValues\s*\(\s*["'](\w+)["']\)/g);
  for (const m of arrayParamMatches) {
    params.push({ name: m[1], type: 'String[]', required: false, in: 'query' });
  }
  
  // request.getAttribute("key")
  const attrMatches = funcContent.matchAll(/request\.getAttribute\s*\(\s*["'](\w+)["']\)/g);
  for (const m of attrMatches) {
    params.push({ name: m[1], type: 'Object', required: false, in: 'body' });
  }
  
  // request.getHeader("key")
  const headerMatches = funcContent.matchAll(/request\.getHeader\s*\(\s*["']([^"']+)["']\)/g);
  for (const m of headerMatches) {
    params.push({ name: m[1], type: 'String', required: false, in: 'header' });
  }
  
  // request.getInputStream() / getReader() - body
  if (funcContent.includes('getInputStream()') || funcContent.includes('getReader()')) {
    body = {
      contentType: 'application/json',
      required: true,
    };
  }
  
  // request.getPart() - multipart
  if (funcContent.includes('getPart(') || funcContent.includes('getParts()')) {
    body = {
      contentType: 'multipart/form-data',
      required: true,
    };
    // 파일 파라미터 추출
    const partMatches = funcContent.matchAll(/request\.getPart\s*\(\s*["'](\w+)["']\)/g);
    for (const m of partMatches) {
      params.push({ name: m[1], type: 'File', required: true, in: 'body' });
    }
  }
  
  // ===== Struts 1/2 =====
  // ActionForm fields: private String username;
  const strutsFieldMatches = funcContent.matchAll(/private\s+(String|int|Integer|boolean|Boolean|Long|Double)\s+(\w+)\s*;/g);
  for (const m of strutsFieldMatches) {
    params.push({ name: m[2], type: m[1], required: false, in: 'body' });
  }
  
  // Struts 2 @Required, @RequiredString
  const requiredMatches = funcContent.matchAll(/@Required(?:String)?\s*(?:\([^)]*\))?\s*private\s+(\w+)\s+(\w+)/g);
  for (const m of requiredMatches) {
    params.push({ name: m[2], type: m[1], required: true, in: 'body' });
  }
  
  // getText() - form data
  if (funcContent.includes('ActionForm') || funcContent.includes('extends ActionSupport')) {
    body = {
      contentType: 'application/x-www-form-urlencoded',
      required: false,
    };
  }
  
  // ===== JAX-RS =====
  // @QueryParam("key")
  const jaxrsQueryMatches = funcContent.matchAll(/@QueryParam\s*\(\s*["'](\w+)["']\)\s*(\w+)\s+(\w+)/g);
  for (const m of jaxrsQueryMatches) {
    params.push({ name: m[1], type: m[2], required: false, in: 'query' });
  }
  
  // @PathParam("key")
  const jaxrsPathMatches = funcContent.matchAll(/@PathParam\s*\(\s*["'](\w+)["']\)\s*(\w+)\s+(\w+)/g);
  for (const m of jaxrsPathMatches) {
    params.push({ name: m[1], type: m[2], required: true, in: 'path' });
  }
  
  // @HeaderParam("key")
  const jaxrsHeaderMatches = funcContent.matchAll(/@HeaderParam\s*\(\s*["']([^"']+)["']\)\s*(\w+)\s+(\w+)/g);
  for (const m of jaxrsHeaderMatches) {
    params.push({ name: m[1], type: m[2], required: false, in: 'header' });
  }
  
  // @FormParam("key")
  const jaxrsFormMatches = funcContent.matchAll(/@FormParam\s*\(\s*["'](\w+)["']\)\s*(\w+)\s+(\w+)/g);
  for (const m of jaxrsFormMatches) {
    params.push({ name: m[1], type: m[2], required: false, in: 'body' });
    body = { contentType: 'application/x-www-form-urlencoded', required: true };
  }
  
  // @BeanParam
  const beanParamMatch = funcContent.match(/@BeanParam\s+(\w+)\s+(\w+)/);
  if (beanParamMatch) {
    body = {
      contentType: 'application/json',
      schema: beanParamMatch[1],
      required: true,
    };
  }
  
  // JAX-RS body (no annotation = body)
  const jaxrsBodyMatch = funcContent.match(/public\s+\w+\s+\w+\s*\([^)]*(?<!@\w+\s)(\w+)\s+(\w+)[^)]*\)/);
  if (jaxrsBodyMatch && !body) {
    const typeClass = jaxrsBodyMatch[1];
    if (!['String', 'int', 'long', 'Integer', 'Long', 'HttpServletRequest', 'HttpServletResponse'].includes(typeClass)) {
      body = {
        contentType: 'application/json',
        schema: typeClass,
        required: true,
      };
    }
  }
  
  // ===== Response Detection =====
  // response.setStatus(200)
  if (funcContent.includes('response.setStatus(') || funcContent.includes('PrintWriter')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
  }
  if (funcContent.includes('SC_CREATED') || funcContent.includes('setStatus(201)')) {
    responses.push({ statusCode: 201, description: 'Created' });
  }
  if (funcContent.includes('SC_BAD_REQUEST') || funcContent.includes('setStatus(400)')) {
    responses.push({ statusCode: 400, description: 'Bad Request' });
  }
  if (funcContent.includes('SC_NOT_FOUND') || funcContent.includes('setStatus(404)')) {
    responses.push({ statusCode: 404, description: 'Not Found' });
  }
  if (funcContent.includes('sendError(')) {
    responses.push({ statusCode: 500, description: 'Internal Server Error' });
  }
  
  // JAX-RS Response
  if (funcContent.includes('Response.ok') || funcContent.includes('Response.status')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
  }
  
  return { params, body, responses };
}

// 인증 타입 감지
function detectAuthType(content: string): ApiEndpoint['auth'] {
  if (content.includes('@PreAuthorize') || content.includes('getServerSession') || content.includes('useSession')) {
    return 'session';
  }
  if (content.includes('jwt') || content.includes('JWT') || content.includes('JwtAuth')) {
    return 'jwt';
  }
  if (content.includes('Bearer') || content.includes('Authorization')) {
    return 'bearer';
  }
  if (content.includes('apiKey') || content.includes('x-api-key') || content.includes('API_KEY')) {
    return 'apikey';
  }
  if (content.includes('OAuth') || content.includes('oauth')) {
    return 'oauth';
  }
  if (content.includes('BasicAuth') || content.includes('basic auth')) {
    return 'basic';
  }
  return undefined;
}

// 미들웨어 추출
function extractMiddleware(content: string, startIndex: number): string[] {
  const middleware: string[] = [];
  const funcContent = content.substring(Math.max(0, startIndex - 500), startIndex + 200);
  
  // Express/Koa: router.get('/path', auth, validate, handler)
  const expressMiddlewareMatch = funcContent.match(/\.(get|post|put|patch|delete)\s*\([^,]+,\s*([^)]+)\)/i);
  if (expressMiddlewareMatch) {
    const parts = expressMiddlewareMatch[2].split(',').map(s => s.trim());
    if (parts.length > 1) {
      middleware.push(...parts.slice(0, -1));
    }
  }
  
  // NestJS: @UseGuards(), @UseInterceptors(), @UsePipes()
  const nestMiddleware = funcContent.matchAll(/@Use(Guards|Interceptors|Pipes)\s*\(\s*([^)]+)\s*\)/g);
  for (const m of nestMiddleware) {
    middleware.push(`${m[1]}: ${m[2].trim()}`);
  }
  
  // FastAPI: Depends()
  const fastapiDeps = funcContent.matchAll(/Depends\s*\(\s*(\w+)\s*\)/g);
  for (const m of fastapiDeps) {
    middleware.push(`Depends: ${m[1]}`);
  }
  
  // Spring: @PreAuthorize, @Secured, @RolesAllowed
  const springAuth = funcContent.matchAll(/@(PreAuthorize|Secured|RolesAllowed)\s*\(\s*([^)]+)\s*\)/g);
  for (const m of springAuth) {
    middleware.push(`${m[1]}: ${m[2].trim()}`);
  }
  
  // Express: app.use()
  const expressUse = funcContent.matchAll(/app\.use\s*\(\s*['"]?([^'")\s,]+)/g);
  for (const m of expressUse) {
    if (!middleware.includes(m[1])) {
      middleware.push(m[1]);
    }
  }
  
  return middleware;
}

// 유효성 검증 규칙 추출
function extractValidation(content: string, startIndex: number): ApiEndpoint['validation'] | undefined {
  const rules: { field: string; rule: string; message?: string }[] = [];
  let schema: string | undefined;
  
  const funcContent = content.substring(startIndex, startIndex + 2000);
  
  // Zod schema
  const zodMatch = funcContent.match(/(\w+Schema)\.parse|z\.object\s*\(\s*\{([^}]+)\}/);
  if (zodMatch) {
    schema = zodMatch[1] || 'ZodSchema';
    // Extract Zod fields
    const zodFields = funcContent.matchAll(/(\w+)\s*:\s*z\.(\w+)\(\)/g);
    for (const m of zodFields) {
      rules.push({ field: m[1], rule: `z.${m[2]}()` });
    }
  }
  
  // Yup schema
  const yupMatch = funcContent.match(/yup\.object\s*\(\s*\{([^}]+)\}/);
  if (yupMatch) {
    schema = 'YupSchema';
    const yupFields = funcContent.matchAll(/(\w+)\s*:\s*yup\.(\w+)/g);
    for (const m of yupFields) {
      rules.push({ field: m[1], rule: `yup.${m[2]}` });
    }
  }
  
  // Express-validator
  const evMatches = funcContent.matchAll(/(?:body|query|param)\s*\(\s*['"](\w+)['"]\s*\)\s*\.(\w+)/g);
  for (const m of evMatches) {
    rules.push({ field: m[1], rule: m[2] });
  }
  
  // class-validator (NestJS)
  const cvMatches = funcContent.matchAll(/@(IsString|IsNumber|IsEmail|IsOptional|MinLength|MaxLength|Min|Max)\s*\(\s*([^)]*)\)/g);
  for (const m of cvMatches) {
    rules.push({ field: 'unknown', rule: `@${m[1]}(${m[2]})` });
  }
  
  // Laravel validation
  const laravelValidate = funcContent.match(/\$request->validate\s*\(\s*\[([^\]]+)\]/);
  if (laravelValidate) {
    const fieldRules = laravelValidate[1].matchAll(/['"](\w+)['"]\s*=>\s*['"]([^'"]+)['"]/g);
    for (const m of fieldRules) {
      rules.push({ field: m[1], rule: m[2] });
    }
  }
  
  // Spring @Valid, @NotNull, @Size
  const springValidation = funcContent.matchAll(/@(NotNull|NotEmpty|NotBlank|Size|Min|Max|Email|Pattern)\s*(?:\([^)]*\))?/g);
  for (const m of springValidation) {
    rules.push({ field: 'unknown', rule: `@${m[1]}` });
  }
  
  // FastAPI Field()
  const fastapiField = funcContent.matchAll(/Field\s*\(\s*([^)]+)\)/g);
  for (const m of fastapiField) {
    const constraints = m[1];
    if (constraints.includes('min_length') || constraints.includes('max_length')) {
      rules.push({ field: 'unknown', rule: `Field(${constraints})` });
    }
  }
  
  if (rules.length === 0 && !schema) return undefined;
  return { rules, schema };
}

// 레이트 리밋 감지
function extractRateLimit(content: string): ApiEndpoint['rateLimit'] | undefined {
  // Express-rate-limit
  const rateLimitMatch = content.match(/rateLimit\s*\(\s*\{[^}]*windowMs\s*:\s*(\d+)[^}]*max\s*:\s*(\d+)/);
  if (rateLimitMatch) {
    return {
      limit: parseInt(rateLimitMatch[2]),
      window: `${parseInt(rateLimitMatch[1]) / 1000}s`,
    };
  }
  
  // NestJS @Throttle
  const throttleMatch = content.match(/@Throttle\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (throttleMatch) {
    return {
      limit: parseInt(throttleMatch[1]),
      window: `${throttleMatch[2]}s`,
    };
  }
  
  // FastAPI slowapi
  const slowapiMatch = content.match(/limiter\.limit\s*\(\s*["']([^"']+)["']\s*\)/);
  if (slowapiMatch) {
    const [limit, window] = slowapiMatch[1].split('/');
    return {
      limit: parseInt(limit),
      window: window || 'minute',
    };
  }
  
  // Spring @RateLimiter
  const springRateMatch = content.match(/@RateLimiter\s*\(\s*name\s*=\s*["']([^"']+)["']/);
  if (springRateMatch) {
    return {
      limit: 10, // default
      window: '1s',
      key: springRateMatch[1],
    };
  }
  
  return undefined;
}

// 캐싱 감지
function extractCache(content: string): ApiEndpoint['cache'] | undefined {
  // Express: res.set('Cache-Control', ...)
  const cacheControlMatch = content.match(/['"]Cache-Control['"]\s*,\s*['"]([^"']+)['"]/i);
  if (cacheControlMatch) {
    const cc = cacheControlMatch[1];
    const maxAgeMatch = cc.match(/max-age=(\d+)/);
    return {
      ttl: maxAgeMatch ? parseInt(maxAgeMatch[1]) : undefined,
      strategy: cc.includes('private') ? 'private' : cc.includes('public') ? 'public' : cc.includes('no-cache') ? 'no-cache' : 'no-store',
    };
  }
  
  // NestJS @CacheKey, @CacheTTL
  const cacheTTLMatch = content.match(/@CacheTTL\s*\(\s*(\d+)\s*\)/);
  if (cacheTTLMatch) {
    return {
      ttl: parseInt(cacheTTLMatch[1]),
    };
  }
  
  // Spring @Cacheable
  const springCacheMatch = content.match(/@Cacheable\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/);
  if (springCacheMatch) {
    return {
      tags: [springCacheMatch[1]],
    };
  }
  
  // FastAPI @cache
  const fastapiCacheMatch = content.match(/@cache\s*\(\s*expire\s*=\s*(\d+)/);
  if (fastapiCacheMatch) {
    return {
      ttl: parseInt(fastapiCacheMatch[1]),
    };
  }
  
  return undefined;
}

// API 버전 감지
function detectApiVersion(path: string, content: string): string | undefined {
  // Path-based versioning: /v1/users, /api/v2/
  const pathVersion = path.match(/\/v(\d+(?:\.\d+)?)\//);
  if (pathVersion) {
    return `v${pathVersion[1]}`;
  }
  
  // Header-based: @ApiVersion  
  const headerVersion = content.match(/@ApiVersion\s*\(\s*["']([^"']+)["']\s*\)/);
  if (headerVersion) {
    return headerVersion[1];
  }
  
  // Spring: @RequestMapping with produces/consumes version
  const springVersion = content.match(/produces\s*=\s*["'][^"']*version=(\d+)/);
  if (springVersion) {
    return `v${springVersion[1]}`;
  }
  
  return undefined;
}

// ===== 분석 함수들 (NEW) =====

// API 복잡도 계산
function calculateComplexity(content: string, startIndex: number, endpoint: Partial<ApiEndpoint>): ApiEndpoint['complexity'] {
  const factors: string[] = [];
  let score = 1; // Base score
  
  const funcContent = content.substring(startIndex, startIndex + 3000);
  
  // Factor 1: Number of parameters
  const paramCount = endpoint.parameters?.length || 0;
  if (paramCount > 5) {
    factors.push('Many parameters');
    score += 2;
  } else if (paramCount > 2) {
    factors.push('Multiple parameters');
    score += 1;
  }
  
  // Factor 2: Request body complexity
  if (endpoint.requestBody) {
    factors.push('Has request body');
    score += 1;
    if (endpoint.requestBody.contentType === 'multipart/form-data') {
      factors.push('File upload');
      score += 1;
    }
  }
  
  // Factor 3: Authentication
  if (endpoint.auth && endpoint.auth !== 'none') {
    factors.push('Requires authentication');
    score += 1;
  }
  
  // Factor 4: Middleware count
  const middlewareCount = endpoint.middleware?.length || 0;
  if (middlewareCount > 3) {
    factors.push('Many middlewares');
    score += 2;
  } else if (middlewareCount > 0) {
    factors.push('Has middleware');
    score += 1;
  }
  
  // Factor 5: Database operations
  const dbPatterns = /prisma\.|\.findMany|\.findUnique|\.create|\.update|\.delete|SELECT|INSERT|UPDATE|DELETE|mongoose\.|\.save\(\)/gi;
  const dbMatches = funcContent.match(dbPatterns);
  if (dbMatches && dbMatches.length > 3) {
    factors.push('Multiple DB operations');
    score += 2;
  } else if (dbMatches && dbMatches.length > 0) {
    factors.push('Database access');
    score += 1;
  }
  
  // Factor 6: External API calls
  if (funcContent.match(/fetch\(|axios\.|http\.|https\.|request\(|\.ajax/gi)) {
    factors.push('External API calls');
    score += 2;
  }
  
  // Factor 7: Try-catch blocks (error handling complexity)
  const tryCatchCount = (funcContent.match(/try\s*\{/g) || []).length;
  if (tryCatchCount > 2) {
    factors.push('Complex error handling');
    score += 1;
  }
  
  // Factor 8: Conditional statements (cyclomatic complexity approximation)
  const conditionals = (funcContent.match(/if\s*\(|else\s+if|switch\s*\(|\?\s*:/g) || []).length;
  const cyclomaticComplexity = conditionals + 1;
  if (conditionals > 10) {
    factors.push('High branching');
    score += 2;
  } else if (conditionals > 5) {
    factors.push('Moderate branching');
    score += 1;
  }
  
  // Factor 9: Loop statements
  const loops = (funcContent.match(/for\s*\(|while\s*\(|\.forEach|\.map\(|\.reduce\(|\.filter\(/g) || []).length;
  if (loops > 5) {
    factors.push('Many iterations');
    score += 1;
  }
  
  // Factor 10: Async/Promise complexity
  const asyncOps = (funcContent.match(/await\s|Promise\.|\.then\(|\.catch\(/g) || []).length;
  if (asyncOps > 5) {
    factors.push('Complex async flow');
    score += 1;
  }
  
  return {
    score: Math.min(10, score),
    factors,
    cyclomaticComplexity,
  };
}

// 보안 분석
function analyzeSecurityIssues(content: string, startIndex: number, endpoint: Partial<ApiEndpoint>): ApiEndpoint['securityAnalysis'] {
  const issues: { severity: 'low' | 'medium' | 'high' | 'critical'; message: string; recommendation: string }[] = [];
  const funcContent = content.substring(startIndex, startIndex + 3000);
  
  // Check 1: No authentication
  const hasAuth = endpoint.auth && endpoint.auth !== 'none';
  if (!hasAuth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method || '')) {
    issues.push({
      severity: 'high',
      message: 'Mutation endpoint without authentication',
      recommendation: 'Add authentication middleware to protect this endpoint'
    });
  }
  
  // Check 2: No rate limiting
  const hasRateLimit = !!endpoint.rateLimit;
  if (!hasRateLimit && endpoint.method === 'POST') {
    issues.push({
      severity: 'medium',
      message: 'POST endpoint without rate limiting',
      recommendation: 'Add rate limiting to prevent abuse'
    });
  }
  
  // Check 3: SQL Injection risk
  const sqlInjectionPatterns = /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE)|`.*\$\{.*\}.*(?:FROM|WHERE|VALUES)`|\.query\s*\(.*\+|\.raw\s*\(.*\+/gi;
  if (funcContent.match(sqlInjectionPatterns)) {
    issues.push({
      severity: 'critical',
      message: 'Potential SQL injection vulnerability',
      recommendation: 'Use parameterized queries or an ORM'
    });
  }
  
  // Check 4: Input validation
  const hasInputValidation = !!(
    funcContent.match(/\.parse\(|\.validate\(|\.safeParse\(|@IsString|@IsNumber|@Valid|validator\./gi) ||
    endpoint.validation
  );
  if (!hasInputValidation && endpoint.requestBody) {
    issues.push({
      severity: 'medium',
      message: 'Request body without validation',
      recommendation: 'Add schema validation using Zod, Joi, or class-validator'
    });
  }
  
  // Check 5: eval() or Function constructor
  if (funcContent.match(/eval\s*\(|new\s+Function\s*\(/)) {
    issues.push({
      severity: 'critical',
      message: 'Use of eval() or Function constructor',
      recommendation: 'Avoid dynamic code execution; use safer alternatives'
    });
  }
  
  // Check 6: Hardcoded secrets
  if (funcContent.match(/password\s*[=:]\s*['"][^'"]{4,}['"]|api[_-]?key\s*[=:]\s*['"][^'"]{8,}['"]/gi)) {
    issues.push({
      severity: 'critical',
      message: 'Possible hardcoded secret detected',
      recommendation: 'Move secrets to environment variables'
    });
  }
  
  // Check 7: CORS wildcard
  if (funcContent.match(/['"]Access-Control-Allow-Origin['"].*['"]\*['"]|cors\s*\(\s*\)/gi)) {
    issues.push({
      severity: 'medium',
      message: 'CORS allows all origins',
      recommendation: 'Restrict CORS to specific trusted origins'
    });
  }
  
  // Check 8: No HTTPS enforcement
  if (funcContent.match(/http:\/\/(?!localhost|127\.0\.0\.1)/gi)) {
    issues.push({
      severity: 'low',
      message: 'HTTP URL detected (non-localhost)',
      recommendation: 'Use HTTPS for external connections'
    });
  }
  
  // Check 9: XSS vulnerability (innerHTML, dangerouslySetInnerHTML)
  if (funcContent.match(/\.innerHTML\s*=|dangerouslySetInnerHTML/gi)) {
    issues.push({
      severity: 'high',
      message: 'Potential XSS vulnerability',
      recommendation: 'Sanitize user input before rendering'
    });
  }
  
  // Check 10: Sanitization
  const hasSanitization = !!funcContent.match(/sanitize|escape|encode|DOMPurify|xss/gi);
  
  return {
    issues,
    hasAuth: hasAuth || false,
    hasRateLimit,
    hasInputValidation,
    hasSanitization,
  };
}

// 문서화 품질 점수 계산
function calculateDocumentationScore(content: string, startIndex: number, endpoint: Partial<ApiEndpoint>): ApiEndpoint['documentationScore'] {
  let score = 0;
  const beforeFunc = content.substring(Math.max(0, startIndex - 500), startIndex);
  
  // Check 1: Has description (30 points)
  const hasDescription = !!(
    beforeFunc.match(/\/\*\*[\s\S]*?\*\//) ||
    beforeFunc.match(/"""[\s\S]*?"""/) ||
    beforeFunc.match(/'''[\s\S]*?'''/) ||
    endpoint.description
  );
  if (hasDescription) score += 30;
  
  // Check 2: Has parameter documentation (25 points)
  const hasParameterDocs = !!(
    beforeFunc.match(/@param\s/) ||
    beforeFunc.match(/:param\s/) ||
    beforeFunc.match(/Args:/i) ||
    endpoint.parameters?.some(p => p.description)
  );
  if (hasParameterDocs) score += 25;
  
  // Check 3: Has response documentation (25 points)
  const hasResponseDocs = !!(
    beforeFunc.match(/@returns?|@response/i) ||
    beforeFunc.match(/Returns:/i) ||
    endpoint.responses?.some(r => r.description)
  );
  if (hasResponseDocs) score += 25;
  
  // Check 4: Has examples (20 points)
  const hasExamples = !!(
    beforeFunc.match(/@example/i) ||
    beforeFunc.match(/Example:/i) ||
    endpoint.requestBody?.example
  );
  if (hasExamples) score += 20;
  
  return {
    score,
    hasDescription,
    hasParameterDocs,
    hasResponseDocs,
    hasExamples,
  };
}

// 성능 분석
function analyzePerformance(content: string, startIndex: number, endpoint: Partial<ApiEndpoint>): ApiEndpoint['performance'] {
  const funcContent = content.substring(startIndex, startIndex + 3000);
  
  // Check caching
  const hasCaching = !!(
    endpoint.cache ||
    funcContent.match(/redis|memcache|cache\.|@Cache|\.setex\(|unstable_cache|revalidate/gi)
  );
  
  // Check compression
  const hasCompression = !!(
    funcContent.match(/gzip|compress|deflate|@Compress|compression\(/gi)
  );
  
  // Check pagination
  const hasPagination = !!(
    funcContent.match(/page|limit|offset|skip|take|cursor|pagination/gi) &&
    funcContent.match(/\d+|parseInt|Number\(/gi)
  );
  
  // Estimate latency based on operations
  let estimatedLatency: 'low' | 'medium' | 'high' = 'low';
  
  // External API calls = high latency
  if (funcContent.match(/fetch\(|axios\.|http\.get|https\.get/gi)) {
    estimatedLatency = 'high';
  }
  // Multiple DB operations = medium to high
  else if ((funcContent.match(/prisma\.|mongoose\.|\.find|\.query/gi) || []).length > 3) {
    estimatedLatency = 'high';
  }
  else if (funcContent.match(/prisma\.|mongoose\.|\.find|\.query/gi)) {
    estimatedLatency = 'medium';
  }
  // File operations = medium
  else if (funcContent.match(/readFile|writeFile|streams/gi)) {
    estimatedLatency = 'medium';
  }
  
  return {
    hasCaching,
    hasCompression,
    hasPagination,
    estimatedLatency,
  };
}

// 파일 캐시 (성능 최적화)
const fileCache = new Map<string, { content: string; mtime: number }>();
const CACHE_TTL = 60000; // 1 minute

function readFileCached(filePath: string): string {
  try {
    const stat = statSync(filePath);
    const cached = fileCache.get(filePath);
    
    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.content;
    }
    
    const content = readFileSync(filePath, 'utf-8');
    fileCache.set(filePath, { content, mtime: stat.mtimeMs });
    
    // Clean up old cache entries
    if (fileCache.size > 500) {
      const entries = Array.from(fileCache.entries());
      entries.slice(0, 100).forEach(([key]) => fileCache.delete(key));
    }
    
    return content;
  } catch {
    return '';
  }
}

// 엔드포인트에 분석 정보 추가
function enrichEndpointWithAnalysis(
  endpoint: ApiEndpoint,
  content: string,
  startIndex: number
): ApiEndpoint {
  endpoint.complexity = calculateComplexity(content, startIndex, endpoint);
  endpoint.documentationScore = calculateDocumentationScore(content, startIndex, endpoint);
  endpoint.securityAnalysis = analyzeSecurityIssues(content, startIndex, endpoint);
  endpoint.performance = analyzePerformance(content, startIndex, endpoint);
  endpoint.namingConvention = analyzeNamingConvention(endpoint);
  endpoint.consistency = analyzeConsistency(content, startIndex, endpoint);
  endpoint.healthScore = calculateHealthScore(endpoint);
  
  // v3 고급 분석 정보 추가
  endpoint.mockData = generateMockData(endpoint);
  endpoint.sdkSnippets = generateSDKSnippets(endpoint);
  endpoint.dependencies = analyzeDependencies(content, startIndex, endpoint);
  endpoint.usageHints = generateUsageHints(endpoint);
  
  return endpoint;
}

// 네이밍 컨벤션 분석
function analyzeNamingConvention(endpoint: Partial<ApiEndpoint>): ApiEndpoint['namingConvention'] {
  const issues: string[] = [];
  let score = 100;
  
  const path = endpoint.path || '';
  const pathParts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
  
  // RESTful 분석
  const restfulResources = ['users', 'posts', 'items', 'products', 'orders', 'comments', 'categories', 'tags', 'files', 'images', 'documents', 'messages', 'notifications', 'settings', 'profiles', 'accounts'];
  const hasResourceNoun = pathParts.some(p => {
    const singular = p.replace(/s$/, '');
    return restfulResources.includes(p) || restfulResources.includes(singular) || /^[a-z]+s$/.test(p);
  });
  
  // HTTP 메서드와 경로 일관성 체크
  const method = endpoint.method || 'GET';
  const lastPathPart = pathParts[pathParts.length - 1] || '';
  
  // 동사가 URL에 포함되어 있는지 체크 (RESTful 안티패턴)
  const verbPatterns = /\/(get|create|update|delete|add|remove|edit|fetch|save|load|find|search|list)/i;
  const hasVerbInPath = verbPatterns.test(path);
  if (hasVerbInPath) {
    issues.push('URL에 동사 사용 (RESTful 권장: HTTP 메서드로 동작 표현)');
    score -= 15;
  }
  
  // 케이스 분석
  const usesKebabCase = pathParts.some(p => /^[a-z]+(-[a-z]+)+$/.test(p));
  const usesCamelCase = pathParts.some(p => /^[a-z]+[A-Z][a-z]+/.test(p));
  const usesSnakeCase = pathParts.some(p => /^[a-z]+(_[a-z]+)+$/.test(p));
  
  // 혼합 케이스 사용 체크
  const caseTypes = [usesKebabCase, usesCamelCase, usesSnakeCase].filter(Boolean).length;
  if (caseTypes > 1) {
    issues.push('URL에 혼합 케이스 사용 (일관된 케이스 권장)');
    score -= 10;
  }
  
  // camelCase in URL (비권장)
  if (usesCamelCase) {
    issues.push('URL에 camelCase 사용 (kebab-case 권장)');
    score -= 5;
  }
  
  // 대문자 사용 체크
  if (/[A-Z]/.test(path)) {
    issues.push('URL에 대문자 사용 (소문자 권장)');
    score -= 5;
  }
  
  // 파일 확장자 체크
  if (/\.(json|xml|html)$/i.test(path)) {
    issues.push('URL에 파일 확장자 포함 (Content-Type 헤더 사용 권장)');
    score -= 5;
  }
  
  // 너무 깊은 중첩 체크
  if (pathParts.length > 5) {
    issues.push('URL 경로가 너무 깊음 (5단계 이하 권장)');
    score -= 10;
  }
  
  // ID 파라미터 위치 체크 (리소스 바로 뒤에 와야 함)
  const pathParams = (path.match(/:[a-zA-Z]+|\{[a-zA-Z]+\}/g) || []);
  const followsRESTful = hasResourceNoun && pathParams.length <= 2 && !hasVerbInPath;
  
  // 복수형 사용 체크
  if (pathParts.some(p => /^[a-z]+$/.test(p) && !p.endsWith('s') && p !== 'auth' && p !== 'api' && p !== 'v1' && p !== 'v2')) {
    issues.push('컬렉션 리소스에 복수형 권장');
    score -= 5;
  }
  
  return {
    followsRESTful,
    usesKebabCase,
    usesCamelCase,
    usesSnakeCase,
    issues,
    score: Math.max(0, score),
  };
}

// 테스트 커버리지 분석
function analyzeTestCoverage(projectPath: string, endpoint: Partial<ApiEndpoint>): ApiEndpoint['testCoverage'] {
  const handler = endpoint.handler || '';
  const path = endpoint.path || '';
  const filePath = endpoint.filePath || '';
  
  // 테스트 파일 패턴
  const testPatterns = [
    // JavaScript/TypeScript
    `**/*.test.ts`, `**/*.test.js`, `**/*.spec.ts`, `**/*.spec.js`,
    `__tests__/**/*.ts`, `__tests__/**/*.js`,
    // Python
    `**/test_*.py`, `**/*_test.py`, `tests/**/*.py`,
    // Java
    `**/Test*.java`, `**/*Test.java`, `**/*Tests.java`,
    // Go
    `**/*_test.go`,
  ];
  
  let hasUnitTest = false;
  let hasIntegrationTest = false;
  let hasE2ETest = false;
  let testFilePath: string | undefined;
  
  // 간단한 휴리스틱: 테스트 디렉토리에 관련 파일이 있는지 확인
  const possibleTestDirs = ['__tests__', 'tests', 'test', 'spec', 'specs'];
  const pathSegments = filePath.replace(/\\/g, '/').split('/');
  const fileName = pathSegments[pathSegments.length - 1] || '';
  const baseName = fileName.replace(/\.(ts|js|tsx|jsx|py|java|go|rb|php|rs)$/, '');
  
  for (const testDir of possibleTestDirs) {
    const testDirPath = join(projectPath, testDir);
    if (existsSync(testDirPath)) {
      // 단위 테스트
      const unitTestPath = join(testDirPath, `${baseName}.test.ts`);
      const unitTestPath2 = join(testDirPath, `${baseName}.spec.ts`);
      if (existsSync(unitTestPath) || existsSync(unitTestPath2)) {
        hasUnitTest = true;
        testFilePath = existsSync(unitTestPath) ? unitTestPath : unitTestPath2;
      }
      
      // 통합 테스트
      const integrationPath = join(testDirPath, 'integration');
      if (existsSync(integrationPath)) {
        hasIntegrationTest = true;
      }
      
      // E2E 테스트
      const e2ePath = join(testDirPath, 'e2e');
      const e2ePath2 = join(projectPath, 'e2e');
      const cypressPath = join(projectPath, 'cypress');
      const playwrightPath = join(projectPath, 'playwright');
      if (existsSync(e2ePath) || existsSync(e2ePath2) || existsSync(cypressPath) || existsSync(playwrightPath)) {
        hasE2ETest = true;
      }
    }
  }
  
  return {
    hasUnitTest,
    hasIntegrationTest,
    hasE2ETest,
    testFilePath,
  };
}

// 일관성 분석
function analyzeConsistency(content: string, startIndex: number, endpoint: Partial<ApiEndpoint>): ApiEndpoint['consistency'] {
  const funcContent = content.substring(startIndex, startIndex + 2000);
  
  // 응답 포맷 감지
  let responseFormat: 'json' | 'xml' | 'html' | 'mixed' | 'unknown' = 'unknown';
  if (funcContent.match(/\.json\(|NextResponse\.json|JSONResponse|application\/json|res\.json/gi)) {
    responseFormat = 'json';
  } else if (funcContent.match(/\.xml\(|application\/xml|text\/xml/gi)) {
    responseFormat = 'xml';
  } else if (funcContent.match(/\.html\(|text\/html|render\(/gi)) {
    responseFormat = 'html';
  }
  
  // 에러 핸들링 일관성
  const hasTryCatch = funcContent.includes('try') && funcContent.includes('catch');
  const hasErrorMiddleware = funcContent.match(/errorHandler|handleError|catchAsync/gi);
  const hasCustomErrorClass = funcContent.match(/throw new \w+Error|throw new HttpException/gi);
  const errorHandling: 'consistent' | 'inconsistent' | 'unknown' = 
    (hasTryCatch && (hasErrorMiddleware || hasCustomErrorClass)) ? 'consistent' :
    hasTryCatch ? 'inconsistent' : 'unknown';
  
  // 버저닝 스타일 감지
  const path = endpoint.path || '';
  let versioningStyle: 'path' | 'header' | 'query' | 'none' = 'none';
  if (/\/v\d+\//i.test(path)) {
    versioningStyle = 'path';
  } else if (funcContent.match(/Accept-Version|X-API-Version|api-version/gi)) {
    versioningStyle = 'header';
  } else if (funcContent.match(/\?.*version=|apiVersion=/gi)) {
    versioningStyle = 'query';
  }
  
  return {
    responseFormat,
    errorHandling,
    versioningStyle,
  };
}

// API 헬스 스코어 계산
function calculateHealthScore(endpoint: Partial<ApiEndpoint>): ApiEndpoint['healthScore'] {
  // 보안 점수 (0-100)
  let securityScore = 100;
  if (endpoint.securityAnalysis) {
    const sa = endpoint.securityAnalysis;
    if (!sa.hasAuth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method || '')) {
      securityScore -= 30;
    }
    if (!sa.hasInputValidation && endpoint.requestBody) {
      securityScore -= 20;
    }
    if (!sa.hasRateLimit && endpoint.method === 'POST') {
      securityScore -= 10;
    }
    for (const issue of sa.issues) {
      switch (issue.severity) {
        case 'critical': securityScore -= 25; break;
        case 'high': securityScore -= 15; break;
        case 'medium': securityScore -= 10; break;
        case 'low': securityScore -= 5; break;
      }
    }
  }
  securityScore = Math.max(0, securityScore);
  
  // 문서화 점수
  const documentationScore = endpoint.documentationScore?.score || 0;
  
  // 성능 점수
  let performanceScore = 70; // 기본 점수
  if (endpoint.performance) {
    if (endpoint.performance.hasCaching) performanceScore += 10;
    if (endpoint.performance.hasPagination) performanceScore += 10;
    if (endpoint.performance.estimatedLatency === 'low') performanceScore += 10;
    else if (endpoint.performance.estimatedLatency === 'high') performanceScore -= 20;
  }
  performanceScore = Math.min(100, Math.max(0, performanceScore));
  
  // 네이밍 점수
  const namingScore = endpoint.namingConvention?.score || 70;
  
  // 전체 점수 (가중 평균)
  const overall = Math.round(
    securityScore * 0.35 + 
    documentationScore * 0.25 + 
    performanceScore * 0.20 + 
    namingScore * 0.20
  );
  
  return {
    overall,
    security: securityScore,
    documentation: documentationScore,
    performance: performanceScore,
    naming: namingScore,
  };
}

// 변경 위험도 분석
function analyzeChangeRisk(endpoint: Partial<ApiEndpoint>, allEndpoints: Partial<ApiEndpoint>[]): ApiEndpoint['changeRisk'] {
  const path = endpoint.path || '';
  const method = endpoint.method || 'GET';
  
  // 의존 엔드포인트 찾기 (같은 리소스를 사용하는 다른 엔드포인트)
  const pathParts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
  const resource = pathParts[pathParts.length - 1] || pathParts[0] || '';
  
  const dependentEndpoints = allEndpoints
    .filter(ep => ep !== endpoint && ep.path?.includes(resource))
    .map(ep => `${ep.method} ${ep.path}`)
    .slice(0, 5);
  
  // 파라미터 수가 많으면 변경 위험도 증가
  const paramCount = endpoint.parameters?.length || 0;
  
  // 복잡도가 높으면 위험도 증가
  const complexityScore = endpoint.complexity?.score || 1;
  
  // 위험도 레벨 결정
  let riskScore = 0;
  if (paramCount > 5) riskScore += 3;
  else if (paramCount > 3) riskScore += 1;
  
  if (complexityScore > 7) riskScore += 3;
  else if (complexityScore > 4) riskScore += 1;
  
  if (dependentEndpoints.length > 3) riskScore += 2;
  else if (dependentEndpoints.length > 0) riskScore += 1;
  
  if (endpoint.requestBody) riskScore += 1;
  
  // 중요 리소스 체크
  if (/user|auth|payment|order|transaction/i.test(path)) {
    riskScore += 2;
  }
  
  const level: 'low' | 'medium' | 'high' = 
    riskScore >= 6 ? 'high' :
    riskScore >= 3 ? 'medium' : 'low';
  
  // Breaking change 위험
  const breakingChangeRisk = 
    method === 'DELETE' || 
    (method === 'PUT' && paramCount > 2) ||
    dependentEndpoints.length > 2;
  
  return {
    level,
    breakingChangeRisk,
    dependentEndpoints,
  };
}

// JSDoc/Docstring에서 설명 추출
function extractDescription(content: string, startIndex: number): { description?: string; summary?: string; tags?: string[] } {
  const beforeFunc = content.substring(Math.max(0, startIndex - 500), startIndex);
  const result: { description?: string; summary?: string; tags?: string[] } = {};
  
  // JSDoc /** ... */
  const jsdocMatch = beforeFunc.match(/\/\*\*\s*([\s\S]*?)\s*\*\/\s*$/);
  if (jsdocMatch) {
    const jsdoc = jsdocMatch[1];
    
    // @description or first line
    const descMatch = jsdoc.match(/@description\s+(.+)|^\s*\*?\s*([^\n@]+)/m);
    if (descMatch) {
      result.description = (descMatch[1] || descMatch[2]).replace(/^\s*\*\s*/gm, '').trim();
    }
    
    // @summary
    const summaryMatch = jsdoc.match(/@summary\s+(.+)/);
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim();
    }
    
    // @tags
    const tagsMatch = jsdoc.match(/@tags?\s+(.+)/);
    if (tagsMatch) {
      result.tags = tagsMatch[1].split(/[,\s]+/).filter(Boolean);
    }
  }
  
  // Python docstring """ ... """
  const docstringMatch = beforeFunc.match(/"""([\s\S]*?)"""/);
  if (docstringMatch && !result.description) {
    result.description = docstringMatch[1].trim().split('\n')[0];
  }
  
  // Single line comment // ...
  const singleLineMatch = beforeFunc.match(/\/\/\s*(.+)\s*$/m);
  if (singleLineMatch && !result.description) {
    result.description = singleLineMatch[1].trim();
  }
  
  return result;
}

// Go에서 파라미터 추출 (Gin, Echo, Fiber)
function extractGoParams(content: string, startIndex: number): { params: ApiParameter[], body?: ApiRequestBody, responses: ApiResponse[] } {
  const params: ApiParameter[] = [];
  const responses: ApiResponse[] = [];
  let body: ApiRequestBody | undefined;
  
  const funcContent = content.substring(startIndex, startIndex + 1500);
  
  // Gin: c.Query("key"), c.Param("id"), c.PostForm("field")
  const queryMatches = funcContent.matchAll(/c\.Query\s*\(\s*["'](\w+)["']\)/g);
  for (const m of queryMatches) {
    params.push({ name: m[1], type: 'string', required: false, in: 'query' });
  }
  
  const paramMatches = funcContent.matchAll(/c\.Param\s*\(\s*["'](\w+)["']\)/g);
  for (const m of paramMatches) {
    params.push({ name: m[1], type: 'string', required: true, in: 'path' });
  }
  
  // c.ShouldBindJSON(&data) - body
  if (funcContent.includes('ShouldBindJSON') || funcContent.includes('BindJSON')) {
    const bindMatch = funcContent.match(/ShouldBindJSON\s*\(\s*&(\w+)\)/);
    body = {
      contentType: 'application/json',
      schema: bindMatch ? bindMatch[1] : undefined,
      required: true,
    };
  }
  
  // Echo: c.QueryParam("key"), c.Param("id"), c.Bind(&data)
  const echoQueryMatches = funcContent.matchAll(/c\.QueryParam\s*\(\s*["'](\w+)["']\)/g);
  for (const m of echoQueryMatches) {
    if (!params.some(p => p.name === m[1])) {
      params.push({ name: m[1], type: 'string', required: false, in: 'query' });
    }
  }
  
  if (funcContent.includes('c.Bind') && !body) {
    body = { contentType: 'application/json', required: true };
  }
  
  // Fiber: c.Query("key"), c.Params("id"), c.BodyParser(&data)
  if (funcContent.includes('BodyParser')) {
    body = { contentType: 'application/json', required: true };
  }
  
  // Response
  if (funcContent.includes('c.JSON') || funcContent.includes('c.IndentedJSON')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
  }
  if (funcContent.includes('http.StatusCreated')) {
    responses.push({ statusCode: 201, description: 'Created' });
  }
  if (funcContent.includes('http.StatusBadRequest')) {
    responses.push({ statusCode: 400, description: 'Bad Request' });
  }
  if (funcContent.includes('http.StatusNotFound')) {
    responses.push({ statusCode: 404, description: 'Not Found' });
  }
  
  return { params, body, responses };
}

// Ruby에서 파라미터 추출 (Rails, Sinatra)
function extractRubyParams(content: string, startIndex: number): { params: ApiParameter[], body?: ApiRequestBody, responses: ApiResponse[] } {
  const params: ApiParameter[] = [];
  const responses: ApiResponse[] = [];
  let body: ApiRequestBody | undefined;
  
  const funcContent = content.substring(startIndex, startIndex + 1000);
  
  // Rails: params[:id], params.require(:user).permit(:name, :email)
  const paramMatches = funcContent.matchAll(/params\[:(\w+)\]/g);
  for (const m of paramMatches) {
    params.push({ name: m[1], type: 'string', required: true, in: 'query' });
  }
  
  // params.require(:user)
  const requireMatch = funcContent.match(/params\.require\s*\(\s*:(\w+)\s*\)/);
  if (requireMatch) {
    body = {
      contentType: 'application/json',
      schema: requireMatch[1],
      required: true,
    };
    
    // .permit(:name, :email)
    const permitMatch = funcContent.match(/\.permit\s*\(\s*([^)]+)\s*\)/);
    if (permitMatch) {
      const fields = permitMatch[1].match(/:(\w+)/g);
      if (fields) {
        body.example = `{ ${fields.map(f => `"${f.slice(1)}": "..."`).join(', ')} }`;
      }
    }
  }
  
  // render json:
  if (funcContent.includes('render json:') || funcContent.includes('render :json')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
  }
  if (funcContent.includes('status: :created')) {
    responses.push({ statusCode: 201, description: 'Created' });
  }
  if (funcContent.includes('status: :not_found')) {
    responses.push({ statusCode: 404, description: 'Not Found' });
  }
  
  return { params, body, responses };
}

// PHP에서 파라미터 추출 (Laravel, Slim)
function extractPhpParams(content: string, startIndex: number): { params: ApiParameter[], body?: ApiRequestBody, responses: ApiResponse[] } {
  const params: ApiParameter[] = [];
  const responses: ApiResponse[] = [];
  let body: ApiRequestBody | undefined;
  
  const funcContent = content.substring(startIndex, startIndex + 1500);
  
  // Laravel: $request->query('key'), $request->input('field'), $request->all()
  const queryMatches = funcContent.matchAll(/\$request->(?:query|get)\s*\(\s*['"](\w+)['"]/g);
  for (const m of queryMatches) {
    params.push({ name: m[1], type: 'string', required: false, in: 'query' });
  }
  
  const inputMatches = funcContent.matchAll(/\$request->input\s*\(\s*['"](\w+)['"]/g);
  for (const m of inputMatches) {
    params.push({ name: m[1], type: 'string', required: false, in: 'body' });
  }
  
  // $request->validate([...])
  const validateMatch = funcContent.match(/\$request->validate\s*\(\s*\[([^\]]+)\]/);
  if (validateMatch) {
    body = {
      contentType: 'application/json',
      required: true,
    };
    
    const fieldMatches = validateMatch[1].matchAll(/['"](\w+)['"]\s*=>/g);
    for (const m of fieldMatches) {
      params.push({ name: m[1], type: 'string', required: true, in: 'body' });
    }
  }
  
  // Route parameter: Route::get('/users/{id}', ...) - extract from path  
  // response()->json()
  if (funcContent.includes('response()->json') || funcContent.includes('return response(')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
  }
  if (funcContent.includes('201')) {
    responses.push({ statusCode: 201, description: 'Created' });
  }
  if (funcContent.includes('404')) {
    responses.push({ statusCode: 404, description: 'Not Found' });
  }
  
  return { params, body, responses };
}

// Rust에서 파라미터 추출 (Actix, Axum, Rocket)
function extractRustParams(content: string, startIndex: number): { params: ApiParameter[], body?: ApiRequestBody, responses: ApiResponse[] } {
  const params: ApiParameter[] = [];
  const responses: ApiResponse[] = [];
  let body: ApiRequestBody | undefined;
  
  const funcContent = content.substring(startIndex, startIndex + 1500);
  
  // Actix: web::Path<(i32,)>, web::Query<QueryParams>, web::Json<CreateUser>
  const pathMatch = funcContent.match(/web::Path<\(([^)]+)\)>/);
  if (pathMatch) {
    const types = pathMatch[1].split(',').map(t => t.trim());
    types.forEach((t, i) => {
      params.push({ name: `param${i}`, type: t || 'string', required: true, in: 'path' });
    });
  }
  
  const queryMatch = funcContent.match(/web::Query<(\w+)>/);
  if (queryMatch) {
    params.push({ name: 'query', type: queryMatch[1], required: false, in: 'query' });
  }
  
  const jsonMatch = funcContent.match(/web::Json<(\w+)>/);
  if (jsonMatch) {
    body = {
      contentType: 'application/json',
      schema: jsonMatch[1],
      required: true,
    };
  }
  
  // Axum: Path<(i32,)>, Query<Params>, Json<Data>
  const axumPathMatch = funcContent.match(/Path<\(([^)]+)\)>/);
  if (axumPathMatch && !pathMatch) {
    const types = axumPathMatch[1].split(',').map(t => t.trim());
    types.forEach((t, i) => {
      params.push({ name: `param${i}`, type: t || 'string', required: true, in: 'path' });
    });
  }
  
  const axumJsonMatch = funcContent.match(/Json<(\w+)>/);
  if (axumJsonMatch && !jsonMatch) {
    body = {
      contentType: 'application/json',
      schema: axumJsonMatch[1],
      required: true,
    };
  }
  
  // Rocket: form, data
  const rocketDataMatch = funcContent.match(/data\s*=\s*"<(\w+)>"/);
  if (rocketDataMatch) {
    body = {
      contentType: 'application/json',
      schema: rocketDataMatch[1],
      required: true,
    };
  }
  
  // Response: HttpResponse, Json, Status
  if (funcContent.includes('HttpResponse::Ok') || funcContent.includes('Json(')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
  }
  if (funcContent.includes('HttpResponse::Created') || funcContent.includes('Status::Created')) {
    responses.push({ statusCode: 201, description: 'Created' });
  }
  if (funcContent.includes('HttpResponse::NotFound') || funcContent.includes('Status::NotFound')) {
    responses.push({ statusCode: 404, description: 'Not Found' });
  }
  
  return { params, body, responses };
}

// C# ASP.NET에서 파라미터 추출
function extractCSharpParams(content: string, startIndex: number): { params: ApiParameter[], body?: ApiRequestBody, responses: ApiResponse[] } {
  const params: ApiParameter[] = [];
  const responses: ApiResponse[] = [];
  let body: ApiRequestBody | undefined;
  
  const funcContent = content.substring(startIndex, startIndex + 1500);
  
  // [FromQuery] string name, [FromRoute] int id, [FromBody] UserDto user
  const fromQueryMatches = funcContent.matchAll(/\[FromQuery\]\s*(\w+)\s+(\w+)/g);
  for (const m of fromQueryMatches) {
    params.push({ name: m[2], type: m[1], required: false, in: 'query' });
  }
  
  const fromRouteMatches = funcContent.matchAll(/\[FromRoute\]\s*(\w+)\s+(\w+)/g);
  for (const m of fromRouteMatches) {
    params.push({ name: m[2], type: m[1], required: true, in: 'path' });
  }
  
  const fromBodyMatch = funcContent.match(/\[FromBody\]\s*(\w+)\s+(\w+)/);
  if (fromBodyMatch) {
    body = {
      contentType: 'application/json',
      schema: fromBodyMatch[1],
      required: true,
    };
  }
  
  // [FromHeader]
  const fromHeaderMatches = funcContent.matchAll(/\[FromHeader\]\s*(\w+)\s+(\w+)/g);
  for (const m of fromHeaderMatches) {
    params.push({ name: m[2], type: m[1], required: true, in: 'header' });
  }
  
  // ActionResult, IActionResult
  if (funcContent.includes('Ok(') || funcContent.includes('ActionResult')) {
    responses.push({ statusCode: 200, contentType: 'application/json' });
  }
  if (funcContent.includes('Created')) {
    responses.push({ statusCode: 201, description: 'Created' });
  }
  if (funcContent.includes('BadRequest')) {
    responses.push({ statusCode: 400, description: 'Bad Request' });
  }
  if (funcContent.includes('NotFound')) {
    responses.push({ statusCode: 404, description: 'Not Found' });
  }
  
  return { params, body, responses };
}

// Next.js App Router 파싱
function parseNextJsAppRouter(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  // 직접 위치의 API 디렉토리들 스캔
  scanAllApiDirs(projectPath);
  
  // Monorepo 패턴 지원: apps/*, packages/* 하위 프로젝트도 스캔
  const monorepoPatterns = ['apps', 'packages', 'services', 'projects'];
  for (const pattern of monorepoPatterns) {
    const monorepoDir = join(projectPath, pattern);
    if (existsSync(monorepoDir)) {
      try {
        const subProjects = readdirSync(monorepoDir);
        for (const subProject of subProjects) {
          const subProjectPath = join(monorepoDir, subProject);
          if (statSync(subProjectPath).isDirectory()) {
            scanAllApiDirs(subProjectPath);
          }
        }
      } catch (e) {}
    }
  }
  
  // 모든 가능한 API 디렉토리 스캔 헬퍼
  function scanAllApiDirs(basePath: string) {
    // App Router: app/api
    const appApiDir = join(basePath, 'app', 'api');
    if (existsSync(appApiDir)) {
      scanAppRouter(appApiDir, '/api');
    }
    
    // Pages Router: pages/api  
    const pagesApiDir = join(basePath, 'pages', 'api');
    if (existsSync(pagesApiDir)) {
      scanPagesRouter(pagesApiDir, '/api');
    }
    
    // src/app/api
    const srcAppApiDir = join(basePath, 'src', 'app', 'api');
    if (existsSync(srcAppApiDir)) {
      scanAppRouter(srcAppApiDir, '/api');
    }
    
    // src/pages/api
    const srcPagesApiDir = join(basePath, 'src', 'pages', 'api');
    if (existsSync(srcPagesApiDir)) {
      scanPagesRouter(srcPagesApiDir, '/api');
    }
  }
  
  // App Router 스캔 (route.ts/route.js 파일 기반)
  function scanAppRouter(dir: string, basePath: string = '/api') {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Dynamic route: [param] -> :param, [...param] -> :param*, [[...param]] -> :param?
          let routePart = entry;
          if (entry.startsWith('[[...') && entry.endsWith(']]')) {
            routePart = `:${entry.slice(5, -2)}?`;
          } else if (entry.startsWith('[...') && entry.endsWith(']')) {
            routePart = `:${entry.slice(4, -1)}*`;
          } else if (entry.startsWith('[') && entry.endsWith(']')) {
            routePart = `:${entry.slice(1, -1)}`;
          }
          scanAppRouter(fullPath, `${basePath}/${routePart}`);
        } else if (entry === 'route.ts' || entry === 'route.js') {
          parseRouteFile(fullPath, basePath, 'app-router');
        }
      }
    } catch (e) {}
  }
  
  // Pages Router 스캔 (파일명 기반 라우팅)
  function scanPagesRouter(dir: string, basePath: string = '/api') {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Dynamic route: [param] -> :param
          let routePart = entry;
          if (entry.startsWith('[[...') && entry.endsWith(']]')) {
            routePart = `:${entry.slice(5, -2)}?`;
          } else if (entry.startsWith('[...') && entry.endsWith(']')) {
            routePart = `:${entry.slice(4, -1)}*`;
          } else if (entry.startsWith('[') && entry.endsWith(']')) {
            routePart = `:${entry.slice(1, -1)}`;
          }
          scanPagesRouter(fullPath, `${basePath}/${routePart}`);
        } else if ((entry.endsWith('.ts') || entry.endsWith('.js')) && !entry.endsWith('.d.ts')) {
          // 파일명에서 라우트 경로 추출 (예: users.ts -> /api/users, [id].ts -> /api/:id)
          let routeName = entry.replace(/\.(ts|js)$/, '');
          
          // index 파일은 현재 경로
          if (routeName === 'index') {
            parsePagesRouterFile(fullPath, basePath, entry);
          } else {
            // Dynamic route 처리
            if (routeName.startsWith('[[...') && routeName.endsWith(']]')) {
              routeName = `:${routeName.slice(5, -2)}?`;
            } else if (routeName.startsWith('[...') && routeName.endsWith(']')) {
              routeName = `:${routeName.slice(4, -1)}*`;
            } else if (routeName.startsWith('[') && routeName.endsWith(']')) {
              routeName = `:${routeName.slice(1, -1)}`;
            }
            parsePagesRouterFile(fullPath, `${basePath}/${routeName}`, entry);
          }
        }
      }
    } catch (e) {}
  }
  
  // App Router route.ts/route.js 파일 파싱
  function parseRouteFile(fullPath: string, basePath: string, routerType: string) {
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const relativePath = relative(projectPath, fullPath);
      const fileName = fullPath.split(/[/\\]/).pop() || 'route.ts';
      
      // Find exported HTTP methods
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
      for (const method of methods) {
        // Match: export async function GET, export function GET, export const GET
        const funcRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`, 'g');
        const constRegex = new RegExp(`export\\s+const\\s+${method}\\s*=`, 'g');
        
        let match = funcRegex.exec(content) || constRegex.exec(content);
        if (match) {
          // Extract params from path
          const params = (basePath.match(/:(\w+)/g) || []).map(p => p.slice(1));
          
          // Try to find description from comments
          const beforeFunc = content.substring(Math.max(0, match.index - 200), match.index);
          const descMatch = beforeFunc.match(/\/\*\*[\s\S]*?\*\/|\/\/.*$/m);
          const description = descMatch 
            ? descMatch[0].replace(/\/\*\*|\*\/|\*|\/\//g, '').trim().split('\n')[0]
            : undefined;
          
          // Find line number
          const lines = content.substring(0, match.index).split('\n');
          const lineNumber = lines.length;
          
          // Check if async
          const isAsync = content.substring(match.index, match.index + 50).includes('async');
          
          // 상세 파라미터 추출
          const extracted = extractTsParams(content, match.index);
          const auth = detectAuthType(content.substring(match.index, match.index + 500));
          
          // 경로 파라미터 추가
          for (const p of params) {
            extracted.params.push({
              name: p,
              type: 'string',
              required: true,
              in: 'path',
            });
          }
          
          endpoints.push({
            id: `${method}-${basePath}`,
            method: method as ApiEndpoint['method'],
            path: basePath,
            filePath: relativePath,
            fileName,
            handler: method,
            params,
            parameters: extracted.params,
            requestBody: extracted.body,
            responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
            description,
            isAsync,
            lineNumber,
            framework: 'nextjs',
            auth,
            contentType: extracted.body?.contentType || 'application/json',
          });
        }
      }
    } catch (e) {}
  }
  
  // Pages Router 파일 파싱 (default export handler 기반)
  function parsePagesRouterFile(fullPath: string, routePath: string, fileName: string) {
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const relativePath = relative(projectPath, fullPath);
      
      // Pages Router는 default export handler 또는 named export (GET, POST 등)
      // 1. Named exports 확인 (Next.js 13+ Pages API Routes)
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
      let foundNamedExport = false;
      
      for (const method of methods) {
        const funcRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`, 'g');
        const constRegex = new RegExp(`export\\s+const\\s+${method}\\s*=`, 'g');
        
        let match = funcRegex.exec(content) || constRegex.exec(content);
        if (match) {
          foundNamedExport = true;
          const params = (routePath.match(/:(\w+)/g) || []).map(p => p.slice(1));
          const lines = content.substring(0, match.index).split('\n');
          const lineNumber = lines.length;
          const isAsync = content.substring(match.index, match.index + 50).includes('async');
          
          const extracted = extractTsParams(content, match.index);
          const auth = detectAuthType(content.substring(match.index, match.index + 500));
          
          for (const p of params) {
            extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
          }
          
          endpoints.push({
            id: `${method}-${routePath}`,
            method: method as ApiEndpoint['method'],
            path: routePath,
            filePath: relativePath,
            fileName,
            handler: method,
            params,
            parameters: extracted.params,
            requestBody: extracted.body,
            responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
            isAsync,
            lineNumber,
            framework: 'nextjs-pages',
            auth,
            contentType: extracted.body?.contentType || 'application/json',
          });
        }
      }
      
      // 2. Default export handler 확인 (전통적인 Pages API Routes)
      if (!foundNamedExport) {
        // export default (req, res) => {} 또는 export default function handler(req, res) {}
        const defaultExportRegex = /export\s+default\s+(?:async\s+)?(?:function\s+(\w+)?\s*\(|(?:const\s+\w+\s*=\s*)?\(?\s*(?:\w+|\{[^}]+\})\s*(?:,\s*(?:\w+|\{[^}]+\}))?\s*\)?\s*=>)/g;
        const match = defaultExportRegex.exec(content);
        
        if (match) {
          const params = (routePath.match(/:(\w+)/g) || []).map(p => p.slice(1));
          const lines = content.substring(0, match.index).split('\n');
          const lineNumber = lines.length;
          const isAsync = content.substring(match.index, match.index + 80).includes('async');
          
          const extracted = extractTsParams(content, match.index);
          const auth = detectAuthType(content.substring(match.index, match.index + 500));
          
          for (const p of params) {
            extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
          }
          
          // Default handler는 모든 HTTP 메서드를 처리할 수 있음
          // req.method 기반 분기 체크
          const methodChecks = content.match(/req\.method\s*===?\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/gi);
          const detectedMethods = methodChecks 
            ? [...new Set(methodChecks.map(m => m.match(/(GET|POST|PUT|PATCH|DELETE)/i)?.[1]?.toUpperCase()).filter(Boolean))]
            : ['GET', 'POST']; // 기본값
          
          for (const method of detectedMethods) {
            endpoints.push({
              id: `${method}-${routePath}`,
              method: method as ApiEndpoint['method'],
              path: routePath,
              filePath: relativePath,
              fileName,
              handler: match[1] || 'handler',
              params,
              parameters: extracted.params,
              requestBody: method !== 'GET' ? extracted.body : undefined,
              responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
              isAsync,
              lineNumber,
              framework: 'nextjs-pages',
              auth,
              contentType: extracted.body?.contentType || 'application/json',
            });
          }
        }
      }
    } catch (e) {}
  }
  
  return endpoints;
}

// TypeScript/JavaScript 파싱 (Express, NestJS, Fastify, Hono, Koa, etc.)
function parseTypeScriptRoutes(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 8) return; // 깊이 제한
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__tests__', 'test'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (['.js', '.ts', '.mjs', '.mts'].includes(extname(entry)) && !entry.endsWith('.d.ts')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            let match;
            
            // Express/Koa/Hono 기본 패턴: router.get('/path'), app.post('/path')
            const expressRegex = /(?:router|app|server|api|route|routes)\.(get|post|put|patch|delete|options|head|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
            while ((match = expressRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase();
              if (method === 'ALL') continue; // all은 무시
              const path = match[2];
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              const afterMatch = content.substring(match.index, match.index + 150);
              const isAsync = afterMatch.includes('async');
              
              // 핸들러 함수 이름 추출 시도
              const handlerMatch = afterMatch.match(/,\s*(\w+)/) || afterMatch.match(/=>\s*(\w+)\(/) || afterMatch.match(/async\s+(\w+)/);
              const handler = handlerMatch ? handlerMatch[1] : `${method.toLowerCase()}Handler`;
              
              // 파라미터 추출
              const extracted = extractTsParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              
              // 경로 파라미터 추가
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${relativePath}-${lineNumber}`,
                method: method as ApiEndpoint['method'],
                path, filePath: relativePath, fileName: entry,
                handler, params, isAsync, lineNumber, framework: 'express',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // Fastify 패턴: fastify.get('/path'), f.post('/path')
            const fastifyRegex = /(?:fastify|f|server|app)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
            while ((match = fastifyRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              if (endpoints.some(e => e.path === path && e.method === method && e.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              const isAsync = content.substring(match.index, match.index + 100).includes('async');
              
              // 파라미터 추출
              const extracted = extractTsParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: method.toLowerCase(), params, isAsync, lineNumber, framework: 'fastify',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // Hono 패턴: app.get('/path'), c.post('/path')
            const honoRegex = /(?:app|c|hono)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
            while ((match = honoRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              if (endpoints.some(e => e.path === path && e.method === method && e.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              const isAsync = content.substring(match.index, match.index + 100).includes('async');
              
              // 파라미터 추출
              const extracted = extractTsParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: method.toLowerCase(), params, isAsync, lineNumber, framework: 'hono',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // NestJS 패턴: @Get('/path'), @Post(), @Controller('/api')
            const nestControllerMatch = content.match(/@Controller\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
            const nestPrefix = nestControllerMatch ? nestControllerMatch[1] : '';
            
            const nestMethodRegex = /@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/gi;
            while ((match = nestMethodRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              let path = match[2] || '';
              const fullPath2 = (nestPrefix + (path.startsWith('/') ? path : '/' + path)).replace(/\/\//g, '/') || '/';
              
              const params = (fullPath2.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // 메서드 이름 찾기
              const afterDecorator = content.substring(match.index);
              const methodNameMatch = afterDecorator.match(/(?:async\s+)?(\w+)\s*\(/);
              const handler = methodNameMatch ? methodNameMatch[1] : 'handler';
              const isAsync = afterDecorator.substring(0, 80).includes('async');
              
              // 파라미터 추출
              const extracted = extractTsParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              const middleware = extractMiddleware(content, match.index);
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${fullPath2}-${lineNumber}`,
                method, path: fullPath2, filePath: relativePath, fileName: entry,
                handler, params, isAsync, lineNumber, framework: 'nestjs',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
                middleware,
              });
            }
            
            // tRPC 패턴: .query(), .mutation()
            const trpcRegex = /\.(\w+)\s*:\s*(?:publicProcedure|protectedProcedure|procedure)\s*\.(query|mutation)\s*\(/gi;
            while ((match = trpcRegex.exec(content)) !== null) {
              const handler = match[1];
              const type = match[2];
              const method = type === 'mutation' ? 'POST' : 'GET';
              const path = `/trpc/${handler}`;
              
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // 파라미터 추출
              const extracted = extractTsParams(content, match.index);
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method: method as ApiEndpoint['method'],
                path, filePath: relativePath, fileName: entry,
                handler, params: [], isAsync: true, lineNumber, framework: 'trpc',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: [{ statusCode: 200, contentType: 'application/json' }],
              });
            }
            
            // 라우터 export 패턴: export default router
            // Route 배열 패턴: { method: 'GET', path: '/api' }
            const routeArrayRegex = /\{\s*(?:method|httpMethod)\s*:\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]\s*,\s*(?:path|url|route)\s*:\s*['"`]([^'"`]+)['"`]/gi;
            while ((match = routeArrayRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              
              if (endpoints.some(e => e.path === path && e.method === method && e.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'routeHandler', params, isAsync: true, lineNumber, framework: 'express',
              });
            }
            
          } catch (e) {
            // 파일 읽기 실패 - 무시
          }
        }
      }
    } catch (e) {}
  }
  
  // 여러 가능한 경로 스캔
  scanDir(join(projectPath, 'src'));
  scanDir(join(projectPath, 'routes'));
  scanDir(join(projectPath, 'api'));
  scanDir(join(projectPath, 'server'));
  scanDir(join(projectPath, 'lib'));
  scanDir(join(projectPath, 'app'));
  scanDir(projectPath);
  
  // 중복 제거
  const seen = new Set<string>();
  return endpoints.filter(ep => {
    const key = `${ep.method}-${ep.path}-${ep.filePath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Python 파싱 (FastAPI, Flask, Django)
function parsePythonRoutes(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 6) return; // 깊이 제한
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['__pycache__', '.git', 'venv', '.venv', 'node_modules', 'env', '.env', 'migrations', 'tests', 'test'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (extname(entry) === '.py') {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            
            // FastAPI: @app.get("/path"), @router.post("/path"), @app.api_route
            const fastApiRegex = /@(?:app|router|api_router)\.(?:api_route|route)?\s*\(?\s*\.?(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]+)['"]/gi;
            let match;
            while ((match = fastApiRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              const params = (path.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              const afterDecorator = content.substring(match.index);
              const funcMatch = afterDecorator.match(/(?:async\s+)?def\s+(\w+)/);
              const handler = funcMatch ? funcMatch[1] : 'unknown';
              const isAsync = afterDecorator.substring(0, 80).includes('async');
              
              // 파라미터 추출
              const extracted = extractPythonParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler, params, isAsync, lineNumber, framework: 'fastapi',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // FastAPI 간단 패턴: @app.get("/path")
            const simpleApiRegex = /@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
            while ((match = simpleApiRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              // 중복 체크
              if (endpoints.some(e => e.path === path && e.method === method && e.filePath === relativePath)) continue;
              
              const params = (path.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              const afterDecorator = content.substring(match.index);
              const funcMatch = afterDecorator.match(/(?:async\s+)?def\s+(\w+)/);
              const handler = funcMatch ? funcMatch[1] : 'unknown';
              const isAsync = afterDecorator.substring(0, 80).includes('async');
              
              // 파라미터 추출
              const extracted = extractPythonParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler, params, isAsync, lineNumber, framework: 'fastapi',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // Flask: @app.route("/path", methods=["GET"]), @blueprint.route
            const flaskRegex = /@(?:app|blueprint|bp)\.route\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*methods\s*=\s*\[([^\]]+)\])?/gi;
            while ((match = flaskRegex.exec(content)) !== null) {
              const path = match[1];
              const methodsStr = match[2] || '"GET"';
              const methods = methodsStr.match(/['"](\w+)['"]/g)?.map(m => m.replace(/['"]/g, '').toUpperCase()) || ['GET'];
              
              for (const method of methods) {
                if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(method)) continue;
                const params = (path.match(/<(?:\w+:)?(\w+)>/g) || []).map(p => p.replace(/<(?:\w+:)?(\w+)>/, '$1'));
                const lines = content.substring(0, match.index).split('\n');
                const lineNumber = lines.length;
                const afterDecorator = content.substring(match.index);
                const funcMatch = afterDecorator.match(/def\s+(\w+)/);
                const handler = funcMatch ? funcMatch[1] : 'unknown';
                
                // 파라미터 추출
                const extracted = extractPythonParams(content, match.index);
                const auth = detectAuthType(content.substring(match.index, match.index + 500));
                for (const p of params) {
                  if (!extracted.params.some(ep => ep.name === p)) {
                    extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                  }
                }
                
                endpoints.push({
                  id: `${method}-${path}-${lineNumber}`,
                  method: method as ApiEndpoint['method'],
                  path, filePath: relativePath, fileName: entry,
                  handler, params, isAsync: false, lineNumber, framework: 'flask',
                  parameters: extracted.params,
                  requestBody: extracted.body,
                  responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                  auth,
                });
              }
            }
            
            // Django: path('api/...', views.function), re_path
            const djangoRegex = /(?:path|re_path)\s*\(\s*['"]([^'"]+)['"](?:.*?)(?:views\.)?(\w+)/gi;
            while ((match = djangoRegex.exec(content)) !== null) {
              const path = '/' + match[1].replace(/^\//, '');
              const handler = match[2];
              const params = (path.match(/<(?:\w+:)?(\w+)>/g) || []).map(p => p.replace(/<(?:\w+:)?(\w+)>/, '$1'));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // 파라미터 추출
              const extracted = extractPythonParams(content, match.index);
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `GET-${path}-${lineNumber}`,
                method: 'GET', path, filePath: relativePath, fileName: entry,
                handler, params, isAsync: false, lineNumber, framework: 'django',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: [{ statusCode: 200, contentType: 'application/json' }],
              });
            }
            
            // Django REST Framework: @api_view(['GET', 'POST'])
            const drfRegex = /@api_view\s*\(\s*\[([^\]]+)\]\s*\)/gi;
            while ((match = drfRegex.exec(content)) !== null) {
              const methodsStr = match[1];
              const methods = methodsStr.match(/['"](\w+)['"]/g)?.map(m => m.replace(/['"]/g, '').toUpperCase()) || ['GET'];
              const afterDecorator = content.substring(match.index);
              const funcMatch = afterDecorator.match(/def\s+(\w+)/);
              const handler = funcMatch ? funcMatch[1] : 'unknown';
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              for (const method of methods) {
                if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) continue;
                endpoints.push({
                  id: `${method}-${handler}-${lineNumber}`,
                  method: method as ApiEndpoint['method'],
                  path: `/${handler}`, filePath: relativePath, fileName: entry,
                  handler, params: [], isAsync: false, lineNumber, framework: 'django-rest',
                });
              }
            }
          } catch (e) {
            // 파일 읽기 실패 - 무시
          }
        }
      }
    } catch (e) {}
  }
  
  scanDir(projectPath);
  return endpoints;
}

// Spring/Java 파싱 (Spring Boot, JAX-RS)
function parseSpringRoutes(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 8) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['.git', 'target', 'build', 'out', '.idea', 'gradle'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (extname(entry) === '.java' || extname(entry) === '.kt') {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            
            // Find @RequestMapping on class
            const classMappingMatch = content.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/);
            let classPrefix = classMappingMatch ? classMappingMatch[1] : '';
            
            // @RestController with path
            const restControllerMatch = content.match(/@RestController\s*\(\s*["']([^"']+)["']/);
            if (restControllerMatch && !classPrefix) {
              classPrefix = restControllerMatch[1];
            }
            
            // Match: @GetMapping, @PostMapping, etc. with various formats
            // @GetMapping("/path"), @GetMapping(value = "/path"), @GetMapping(path = "/path")
            const mappingRegex = /@(Get|Post|Put|Patch|Delete|Request)Mapping\s*(?:\(\s*(?:(?:value|path)\s*=\s*)?(?:["']([^"']+)["']|\{[^}]*\})?)?/gi;
            let match;
            
            while ((match = mappingRegex.exec(content)) !== null) {
              let method = match[1].toUpperCase();
              if (method === 'REQUEST') {
                // @RequestMapping - check for method attribute
                const afterMatch = content.substring(match.index, match.index + 200);
                const methodAttr = afterMatch.match(/method\s*=\s*RequestMethod\.(GET|POST|PUT|PATCH|DELETE)/i);
                method = methodAttr ? methodAttr[1].toUpperCase() : 'GET';
              }
              
              let path = match[2] || '/';
              // path가 없으면 '/' 사용
              if (!path.startsWith('/')) path = '/' + path;
              const fullPath2 = (classPrefix + path).replace(/\/\//g, '/');
              
              // Extract params like {param}
              const params = (fullPath2.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1));
              
              // Find line number
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // Find method name (Java or Kotlin syntax)
              const afterAnnotation = content.substring(match.index);
              const methodMatch = afterAnnotation.match(/(?:public|private|protected)?\s*(?:fun|\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/);
              const handler = methodMatch ? methodMatch[1] : 'unknown';
              
              // 파라미터 추출
              const extracted = extractJavaParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              const validation = extractValidation(content, match.index);
              const rateLimit = extractRateLimit(content.substring(match.index, match.index + 300));
              const cache = extractCache(content.substring(match.index, match.index + 300));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'String', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${fullPath2}-${lineNumber}`,
                method: method as ApiEndpoint['method'],
                path: fullPath2,
                filePath: relativePath,
                fileName: entry,
                handler,
                params,
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                isAsync: content.substring(match.index, match.index + 300).includes('CompletableFuture') || 
                         content.substring(match.index, match.index + 300).includes('Mono<') ||
                         content.substring(match.index, match.index + 300).includes('suspend'),
                lineNumber,
                framework: 'spring',
                auth,
                validation,
                rateLimit,
                cache,
              });
            }
            
            // JAX-RS: @Path, @GET, @POST, etc.
            const jaxRsPathMatch = content.match(/@Path\s*\(\s*["']([^"']+)["']/);
            const jaxRsPrefix = jaxRsPathMatch ? jaxRsPathMatch[1] : '';
            
            const jaxRsMethodRegex = /@(GET|POST|PUT|PATCH|DELETE)\s*(?:@Path\s*\(\s*["']([^"']+)["'])?/gi;
            while ((match = jaxRsMethodRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              let path = match[2] || '/';
              const fullPath2 = (jaxRsPrefix + path).replace(/\/\//g, '/');
              
              const params = (fullPath2.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              const afterAnnotation = content.substring(match.index);
              const methodMatch = afterAnnotation.match(/public\s+\w+\s+(\w+)\s*\(/);
              const handler = methodMatch ? methodMatch[1] : 'unknown';
              
              // 파라미터 추출 (레거시 Java)
              const extracted = extractLegacyJavaParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'String', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${fullPath2}-${lineNumber}`,
                method,
                path: fullPath2,
                filePath: relativePath,
                fileName: entry,
                handler,
                params,
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                isAsync: false,
                lineNumber,
                framework: 'jax-rs',
                auth,
              });
            }
            
            // ===== 레거시 Java 프레임워크 지원 =====
            
            // Struts 2: @Action(value="/path"), @Actions
            const strutsActionRegex = /@Action\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/gi;
            while ((match = strutsActionRegex.exec(content)) !== null) {
              const path = match[1].startsWith('/') ? match[1] : '/' + match[1];
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              const afterAnnotation = content.substring(match.index);
              const methodMatch = afterAnnotation.match(/public\s+\w+\s+(\w+)\s*\(/);
              const handler = methodMatch ? methodMatch[1] : 'execute';
              
              // 파라미터 추출
              const extracted = extractLegacyJavaParams(content, match.index);
              
              endpoints.push({
                id: `POST-${path}-${lineNumber}`,
                method: 'POST',
                path, filePath: relativePath, fileName: entry,
                handler, params: [], isAsync: false, lineNumber,
                framework: 'struts',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200 }],
              });
            }
            
            // Struts 1: ActionMapping, structs-config.xml 패턴
            const struts1Regex = /path\s*=\s*["']([^"']+)["'].*?(?:type|forward)\s*=\s*["']([^"'"]+)["']/gi;
            while ((match = struts1Regex.exec(content)) !== null) {
              const path = match[1];
              const handler = match[2].split('.').pop() || 'action';
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `GET-${path}-${lineNumber}`,
                method: 'GET',
                path, filePath: relativePath, fileName: entry,
                handler, params: [], isAsync: false, lineNumber,
                framework: 'struts1',
              });
            }
            
            // Servlet: @WebServlet("/path"), doGet, doPost
            const webServletMatch = content.match(/@WebServlet\s*\(\s*(?:urlPatterns\s*=\s*\{?\s*)?["']([^"']+)["']/);
            if (webServletMatch) {
              const path = webServletMatch[1];
              const lines = content.substring(0, webServletMatch.index!).split('\n');
              const baseLineNumber = lines.length;
              
              // doGet 메서드 찾기
              if (content.includes('doGet')) {
                const doGetMatch = content.match(/protected\s+void\s+doGet\s*\(/);
                if (doGetMatch) {
                  const ln = content.substring(0, doGetMatch.index!).split('\n').length;
                  endpoints.push({
                    id: `GET-${path}-${ln}`,
                    method: 'GET',
                    path, filePath: relativePath, fileName: entry,
                    handler: 'doGet', params: [], isAsync: false, lineNumber: ln,
                    framework: 'servlet',
                  });
                }
              }
              
              // doPost 메서드 찾기
              if (content.includes('doPost')) {
                const doPostMatch = content.match(/protected\s+void\s+doPost\s*\(/);
                if (doPostMatch) {
                  const ln = content.substring(0, doPostMatch.index!).split('\n').length;
                  endpoints.push({
                    id: `POST-${path}-${ln}`,
                    method: 'POST',
                    path, filePath: relativePath, fileName: entry,
                    handler: 'doPost', params: [], isAsync: false, lineNumber: ln,
                    framework: 'servlet',
                  });
                }
              }
              
              // doPut, doDelete
              const httpMethods = ['doPut', 'doDelete'];
              for (const m of httpMethods) {
                if (content.includes(m)) {
                  const methodPattern = new RegExp(`protected\\s+void\\s+${m}\\s*\\(`);
                  const mm = content.match(methodPattern);
                  if (mm) {
                    const ln = content.substring(0, mm.index!).split('\n').length;
                    endpoints.push({
                      id: `${m.replace('do', '').toUpperCase()}-${path}-${ln}`,
                      method: m.replace('do', '').toUpperCase() as ApiEndpoint['method'],
                      path, filePath: relativePath, fileName: entry,
                      handler: m, params: [], isAsync: false, lineNumber: ln,
                      framework: 'servlet',
                    });
                  }
                }
              }
            }
            
            // Play Framework (Java): GET("/path"), POST("/path") 라우트
            const playRouteRegex = /(GET|POST|PUT|PATCH|DELETE)\s*\(\s*["']([^"']+)["']\s*\)/gi;
            while ((match = playRouteRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'action', params, isAsync: false, lineNumber,
                framework: 'play',
              });
            }
            
            // Spark Framework (Java): get("/path", ...), post("/path", ...)
            const sparkRegex = /(?:Spark\.)?(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi;
            while ((match = sparkRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              if (endpoints.some(e => e.path === path && e.method === method && e.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'lambda', params, isAsync: false, lineNumber,
                framework: 'spark',
              });
            }
            
            // Vert.x: router.get("/path"), router.route("/path").handler(...)
            const vertxRegex = /router\.(get|post|put|patch|delete|route)\s*\(\s*["']([^"']+)["']\s*\)/gi;
            while ((match = vertxRegex.exec(content)) !== null) {
              let method = match[1].toUpperCase();
              if (method === 'ROUTE') method = 'GET'; // route() defaults to all methods
              const path = match[2];
              if (endpoints.some(e => e.path === path && e.method === method && e.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method: method as ApiEndpoint['method'],
                path, filePath: relativePath, fileName: entry,
                handler: 'handler', params, isAsync: true, lineNumber,
                framework: 'vertx',
              });
            }
            
            // Javalin: app.get("/path", ctx -> {}), app.post("/path", ...)
            const javalinRegex = /app\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi;
            while ((match = javalinRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              if (endpoints.some(e => e.path === path && e.method === method && e.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'handler', params, isAsync: false, lineNumber,
                framework: 'javalin',
              });
            }
            
            // Micronaut: @Get("/path"), @Post("/path")
            const micronautRegex = /@(Get|Post|Put|Patch|Delete)\s*\(\s*(?:["']([^"']+)["'])?\s*\)/gi;
            while ((match = micronautRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              let path = match[2] || '/';
              const fullPath2 = (classPrefix + (path.startsWith('/') ? path : '/' + path)).replace(/\/\//g, '/');
              
              if (endpoints.some(e => e.path === fullPath2 && e.method === method && e.filePath === relativePath)) continue;
              
              const params = (fullPath2.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              const afterAnnotation = content.substring(match.index);
              const methodMatch = afterAnnotation.match(/(?:public\s+)?\w+\s+(\w+)\s*\(/);
              const handler = methodMatch ? methodMatch[1] : 'handler';
              
              endpoints.push({
                id: `${method}-${fullPath2}-${lineNumber}`,
                method, path: fullPath2, filePath: relativePath, fileName: entry,
                handler, params, isAsync: false, lineNumber,
                framework: 'micronaut',
              });
            }
            
            // Quarkus (JAX-RS based but with additional patterns)
            const quarkusRegex = /@(GET|POST|PUT|PATCH|DELETE)\s*\n\s*@Path\s*\(\s*["']([^"']+)["']\s*\)/gi;
            while ((match = quarkusRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = (jaxRsPrefix + match[2]).replace(/\/\//g, '/');
              
              if (endpoints.some(e => e.path === path && e.method === method && e.filePath === relativePath)) continue;
              
              const params = (path.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'resource', params, isAsync: false, lineNumber,
                framework: 'quarkus',
              });
            }
            
          } catch (e) {
            // 파일 읽기 실패
          }
        }
      }
    } catch (e) {}
  }
  
  // 여러 가능한 경로 스캔
  scanDir(join(projectPath, 'src'));
  scanDir(join(projectPath, 'app'));
  scanDir(join(projectPath, 'conf')); // Play Framework routes
  scanDir(join(projectPath, 'WEB-INF')); // Servlet/Struts config
  scanDir(projectPath);
  
  // 중복 제거
  const seen = new Set<string>();
  return endpoints.filter(ep => {
    const key = `${ep.method}-${ep.path}-${ep.filePath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Go 파싱 (Gin, Echo, Fiber, Chi, Gorilla Mux)
function parseGoRoutes(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 8) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['.git', 'vendor', 'testdata'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (extname(entry) === '.go') {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            let match;
            
            // Gin: r.GET("/path", handler), router.POST("/path", ...)
            const ginRegex = /(?:r|router|g|gin|api|v1)\.(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(\s*["']([^"']+)["']/gi;
            while ((match = ginRegex.exec(content)) !== null) {
              const methodMatch = content.substring(match.index).match(/\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)/i);
              if (!methodMatch) continue;
              const method = methodMatch[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[1];
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // Go 파라미터 추출
              const extracted = extractGoParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'handler', params, isAsync: false, lineNumber,
                framework: 'gin',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // Echo: e.GET("/path", handler)
            const echoRegex = /(?:e|echo|api)\.(?:GET|POST|PUT|PATCH|DELETE)\s*\(\s*["']([^"']+)["']/gi;
            while ((match = echoRegex.exec(content)) !== null) {
              const methodMatch = content.substring(match.index).match(/\.(GET|POST|PUT|PATCH|DELETE)/i);
              if (!methodMatch) continue;
              const method = methodMatch[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[1];
              if (endpoints.some(ep => ep.path === path && ep.method === method && ep.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // Go 파라미터 추출
              const extracted = extractGoParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'handler', params, isAsync: false, lineNumber,
                framework: 'echo',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // Fiber: app.Get("/path", handler)
            const fiberRegex = /(?:app|f|fiber)\.(?:Get|Post|Put|Patch|Delete)\s*\(\s*["']([^"']+)["']/gi;
            while ((match = fiberRegex.exec(content)) !== null) {
              const methodMatch = content.substring(match.index).match(/\.(Get|Post|Put|Patch|Delete)/i);
              if (!methodMatch) continue;
              const method = methodMatch[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[1];
              if (endpoints.some(ep => ep.path === path && ep.method === method && ep.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // Go 파라미터 추출
              const extracted = extractGoParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'handler', params, isAsync: false, lineNumber,
                framework: 'fiber',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // http.HandleFunc / mux.HandleFunc
            const httpRegex = /(?:http|mux|r)\.(?:HandleFunc|Handle)\s*\(\s*["']([^"']+)["']/gi;
            while ((match = httpRegex.exec(content)) !== null) {
              const path = match[1];
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `GET-${path}-${lineNumber}`,
                method: 'GET', path, filePath: relativePath, fileName: entry,
                handler: 'HandleFunc', params: [], isAsync: false, lineNumber,
                framework: 'go-http',
              });
            }
            
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  
  scanDir(projectPath);
  return endpoints;
}

// Ruby 파싱 (Rails, Sinatra, Grape)
function parseRubyRoutes(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 8) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['.git', 'vendor', 'node_modules', 'tmp', 'log'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (extname(entry) === '.rb') {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            let match;
            
            // Rails routes: get '/path', post '/path', resources :users
            const railsRouteRegex = /(?:get|post|put|patch|delete)\s+['"]([^'"]+)['"]/gi;
            while ((match = railsRouteRegex.exec(content)) !== null) {
              const methodMatch = content.substring(match.index).match(/^(get|post|put|patch|delete)/i);
              if (!methodMatch) continue;
              const method = methodMatch[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[1];
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // Ruby 파라미터 추출
              const extracted = extractRubyParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'action', params, isAsync: false, lineNumber,
                framework: 'rails',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // Sinatra: get '/path' do
            const sinatraRegex = /^(?:get|post|put|patch|delete)\s+['"]([^'"]+)['"]\s+do/gim;
            while ((match = sinatraRegex.exec(content)) !== null) {
              const methodMatch = content.substring(match.index).match(/^(get|post|put|patch|delete)/i);
              if (!methodMatch) continue;
              const method = methodMatch[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[1];
              if (endpoints.some(ep => ep.path === path && ep.method === method && ep.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // Ruby 파라미터 추출
              const extracted = extractRubyParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'block', params, isAsync: false, lineNumber,
                framework: 'sinatra',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  
  // Rails routes are typically in config/routes.rb
  scanDir(join(projectPath, 'config'));
  scanDir(join(projectPath, 'app'));
  scanDir(projectPath);
  
  return endpoints;
}

// PHP 파싱 (Laravel, Symfony, Slim)
function parsePhpRoutes(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 8) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['.git', 'vendor', 'node_modules', 'storage', 'cache'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (extname(entry) === '.php') {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            let match;
            
            // Laravel: Route::get('/path', ...), Route::post('/path', ...)
            const laravelRegex = /Route::(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
            while ((match = laravelRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              const params = (path.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // PHP 파라미터 추출
              const extracted = extractPhpParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'string', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'controller', params, isAsync: false, lineNumber,
                framework: 'laravel',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // Laravel API resource: Route::apiResource('users', UserController::class)
            const resourceRegex = /Route::apiResource\s*\(\s*['"]([^'"]+)['"]/gi;
            while ((match = resourceRegex.exec(content)) !== null) {
              const resource = match[1];
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // Generate RESTful routes
              const restMethods = [
                { method: 'GET', path: `/${resource}` },
                { method: 'GET', path: `/${resource}/{id}` },
                { method: 'POST', path: `/${resource}` },
                { method: 'PUT', path: `/${resource}/{id}` },
                { method: 'DELETE', path: `/${resource}/{id}` },
              ];
              
              for (const rm of restMethods) {
                endpoints.push({
                  id: `${rm.method}-${rm.path}-${lineNumber}`,
                  method: rm.method as ApiEndpoint['method'],
                  path: rm.path, filePath: relativePath, fileName: entry,
                  handler: resource + 'Controller', params: rm.path.includes('{id}') ? ['id'] : [],
                  isAsync: false, lineNumber, framework: 'laravel',
                });
              }
            }
            
            // Slim: $app->get('/path', ...)
            const slimRegex = /\$app->(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
            while ((match = slimRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              if (endpoints.some(ep => ep.path === path && ep.method === method && ep.filePath === relativePath)) continue;
              
              const params = (path.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'handler', params, isAsync: false, lineNumber,
                framework: 'slim',
              });
            }
            
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  
  scanDir(join(projectPath, 'routes'));
  scanDir(join(projectPath, 'app'));
  scanDir(projectPath);
  
  return endpoints;
}

// Rust 파싱 (Actix-web, Axum, Rocket)
function parseRustRoutes(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 8) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['.git', 'target'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (extname(entry) === '.rs') {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            let match;
            
            // Actix: #[get("/path")], #[post("/path")]
            const actixRegex = /#\[(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']\s*\)\]/gi;
            while ((match = actixRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              const params = (path.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // Find handler function name
              const afterAttr = content.substring(match.index);
              const fnMatch = afterAttr.match(/async\s+fn\s+(\w+)|fn\s+(\w+)/);
              const handler = fnMatch ? (fnMatch[1] || fnMatch[2]) : 'handler';
              
              // Rust 파라미터 추출
              const extracted = extractRustParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'String', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler, params, isAsync: afterAttr.includes('async fn'), lineNumber,
                framework: 'actix',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // Rocket: #[get("/path")]
            const rocketRegex = /#\[(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi;
            while ((match = rocketRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              if (endpoints.some(ep => ep.path === path && ep.method === method && ep.filePath === relativePath)) continue;
              
              const params = (path.match(/<(\w+)>/g) || []).map(p => p.slice(1, -1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              const afterAttr = content.substring(match.index);
              const fnMatch = afterAttr.match(/fn\s+(\w+)/);
              const handler = fnMatch ? fnMatch[1] : 'handler';
              
              // Rust 파라미터 추출
              const extracted = extractRustParams(content, match.index);
              const auth = detectAuthType(content.substring(match.index, match.index + 500));
              for (const p of params) {
                if (!extracted.params.some(ep => ep.name === p)) {
                  extracted.params.push({ name: p, type: 'String', required: true, in: 'path' });
                }
              }
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler, params, isAsync: false, lineNumber,
                framework: 'rocket',
                parameters: extracted.params,
                requestBody: extracted.body,
                responses: extracted.responses.length > 0 ? extracted.responses : [{ statusCode: 200, contentType: 'application/json' }],
                auth,
              });
            }
            
            // Axum: .route("/path", get(handler))
            const axumRegex = /\.route\s*\(\s*["']([^"']+)["']\s*,\s*(get|post|put|patch|delete)\s*\(/gi;
            while ((match = axumRegex.exec(content)) !== null) {
              const path = match[1];
              const method = match[2].toUpperCase() as ApiEndpoint['method'];
              if (endpoints.some(ep => ep.path === path && ep.method === method && ep.filePath === relativePath)) continue;
              
              const params = (path.match(/:(\w+)/g) || []).map(p => p.slice(1));
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: 'handler', params, isAsync: true, lineNumber,
                framework: 'axum',
              });
            }
            
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  
  scanDir(join(projectPath, 'src'));
  scanDir(projectPath);
  
  return endpoints;
}

// 엔드포인트를 그룹으로 구성
function groupEndpoints(endpoints: ApiEndpoint[]): ApiGroup[] {
  const groups: Map<string, ApiEndpoint[]> = new Map();
  
  for (const endpoint of endpoints) {
    // Get first path segment as group
    const parts = endpoint.path.split('/').filter(Boolean);
    const prefix = parts.length > 0 ? `/${parts[0]}` : '/';
    
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)!.push(endpoint);
  }
  
  return Array.from(groups.entries()).map(([prefix, eps]) => ({
    prefix,
    endpoints: eps.sort((a, b) => a.path.localeCompare(b.path)),
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const startTime = Date.now();
    
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, path: true }
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found', endpoints: [], groups: [] }, { status: 200 });
    }
    
    if (!project.path || !existsSync(project.path)) {
      return NextResponse.json({ 
        error: 'Project path not found', 
        endpoints: [], 
        groups: [] 
      }, { status: 200 });
    }
    
    // 프레임워크 감지
    const framework = detectFramework(project.path);
    
    // 프레임워크별 파싱
    let endpoints: ApiEndpoint[] = [];
    
    switch (framework) {
      case 'nextjs':
        // NextJS API Routes (App Router & Pages Router)
        endpoints = parseNextJsAppRouter(project.path);
        // Monorepo에서 NestJS 등 다른 TypeScript 프레임워크도 함께 스캔
        endpoints = [...endpoints, ...parseTypeScriptRoutes(project.path)];
        break;
      case 'express':
      case 'fastify':
      case 'koa':
      case 'nestjs':
      case 'hono':
      case 'hapi':
      case 'restify':
      case 'trpc':
        endpoints = parseTypeScriptRoutes(project.path);
        break;
      case 'fastapi':
      case 'flask':
      case 'django':
      case 'tornado':
      case 'aiohttp':
      case 'sanic':
        endpoints = parsePythonRoutes(project.path);
        break;
      case 'spring':
      case 'quarkus':
      case 'micronaut':
      case 'vertx':
        endpoints = parseSpringRoutes(project.path);
        break;
      case 'gin':
      case 'echo':
      case 'fiber':
      case 'gorilla':
      case 'chi':
      case 'go-http':
        endpoints = parseGoRoutes(project.path);
        break;
      case 'rails':
      case 'sinatra':
      case 'grape':
      case 'hanami':
        endpoints = parseRubyRoutes(project.path);
        break;
      case 'laravel':
      case 'symfony':
      case 'slim':
      case 'yii':
        endpoints = parsePhpRoutes(project.path);
        break;
      case 'actix':
      case 'rocket':
      case 'axum':
      case 'warp':
        endpoints = parseRustRoutes(project.path);
        break;
      default:
        // Try all parsers
        endpoints = [
          ...parseNextJsAppRouter(project.path),
          ...parseTypeScriptRoutes(project.path),
          ...parsePythonRoutes(project.path),
          ...parseSpringRoutes(project.path),
          ...parseGoRoutes(project.path),
          ...parseRubyRoutes(project.path),
          ...parsePhpRoutes(project.path),
          ...parseRustRoutes(project.path),
        ];
    }
    
    // GraphQL 엔드포인트 추가
    const graphqlEndpoints = parseGraphQLEndpoints(project.path);
    endpoints = [...endpoints, ...graphqlEndpoints];
    
    // WebSocket 엔드포인트 추가
    const wsEndpoints = parseWebSocketEndpoints(project.path);
    endpoints = [...endpoints, ...wsEndpoints];
    
    // gRPC 엔드포인트 추가
    const grpcEndpoints = parseGrpcEndpoints(project.path);
    endpoints = [...endpoints, ...grpcEndpoints];
    
    // 엔드포인트에 고급 분석 정보 추가
    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i];
      try {
        const content = readFileCached(ep.filePath);
        const startIndex = content.indexOf(ep.handler) || ep.lineNumber || 0;
        endpoints[i] = enrichEndpointWithAnalysis(ep, content, startIndex);
      } catch (e) {
        // 파일을 읽을 수 없는 경우 기본값으로 설정
        endpoints[i].mockData = generateMockData(ep);
        endpoints[i].sdkSnippets = generateSDKSnippets(ep);
        endpoints[i].dependencies = { callsEndpoints: [], calledByEndpoints: [], externalApis: [] };
        endpoints[i].usageHints = generateUsageHints(ep);
      }
    }
    
    // 그룹화
    const groups = groupEndpoints(endpoints);
    
    // 향상된 통계
    const stats = {
      total: endpoints.length,
      byMethod: {} as Record<string, number>,
      byFramework: {} as Record<string, number>,
      byAuth: {} as Record<string, number>,
      // 보안 분석 통계 (NEW)
      security: {
        endpointsWithAuth: 0,
        endpointsWithoutAuth: 0,
        endpointsWithValidation: 0,
        endpointsWithRateLimit: 0,
        totalSecurityIssues: 0,
        issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>,
      },
      // 복잡도 통계 (NEW)
      complexity: {
        average: 0,
        distribution: { low: 0, medium: 0, high: 0 } as Record<string, number>,
        mostComplex: [] as { path: string; method: string; score: number }[],
      },
      // 문서화 통계 (NEW)
      documentation: {
        averageScore: 0,
        wellDocumented: 0, // score >= 70
        partiallyDocumented: 0, // 30 <= score < 70
        undocumented: 0, // score < 30
      },
      // 성능 통계 (NEW)
      performance: {
        withCaching: 0,
        withPagination: 0,
        highLatency: 0,
        mediumLatency: 0,
        lowLatency: 0,
      },
      // 엔드포인트 유형 (NEW)
      types: {
        rest: 0,
        graphql: 0,
        websocket: 0,
        grpc: 0,
      },
      // 헬스 스코어 통계 (NEW v2)
      healthScore: {
        average: 0,
        distribution: { excellent: 0, good: 0, fair: 0, poor: 0 } as Record<string, number>,
        lowestScoring: [] as { path: string; method: string; score: number }[],
      },
      // 네이밍 컨벤션 통계 (NEW v2)
      naming: {
        restfulCompliant: 0,
        nonRestful: 0,
        averageScore: 0,
        commonIssues: {} as Record<string, number>,
      },
      // 일관성 통계 (NEW v2)
      consistency: {
        responseFormats: {} as Record<string, number>,
        versioningStyles: {} as Record<string, number>,
        errorHandling: { consistent: 0, inconsistent: 0, unknown: 0 },
      },
      // 유사도 및 중복 통계 (NEW v3)
      similarity: {
        potentialDuplicates: 0,
        similarPairs: [] as { endpoint1: string; endpoint2: string; score: number }[],
      },
      // 의존성 통계 (NEW v3)
      dependencies: {
        totalInternalCalls: 0,
        totalExternalCalls: 0,
        externalApis: [] as string[],
        mostConnected: [] as { path: string; method: string; connections: number }[],
      },
      // 분석 시간
      analysisTimeMs: 0,
    };
    
    let totalComplexity = 0;
    let totalDocScore = 0;
    
    for (const ep of endpoints) {
      // 기본 통계
      stats.byMethod[ep.method] = (stats.byMethod[ep.method] || 0) + 1;
      stats.byFramework[ep.framework] = (stats.byFramework[ep.framework] || 0) + 1;
      
      // 인증 통계
      const authType = ep.auth || 'none';
      stats.byAuth[authType] = (stats.byAuth[authType] || 0) + 1;
      
      // 엔드포인트 유형 통계
      if (ep.framework === 'graphql') {
        stats.types.graphql++;
      } else if (ep.framework === 'socket.io' || ep.framework === 'websocket') {
        stats.types.websocket++;
      } else if (ep.framework === 'grpc') {
        stats.types.grpc++;
      } else {
        stats.types.rest++;
      }
      
      // 보안 통계
      if (ep.securityAnalysis) {
        if (ep.securityAnalysis.hasAuth) {
          stats.security.endpointsWithAuth++;
        } else {
          stats.security.endpointsWithoutAuth++;
        }
        if (ep.securityAnalysis.hasInputValidation) {
          stats.security.endpointsWithValidation++;
        }
        if (ep.securityAnalysis.hasRateLimit) {
          stats.security.endpointsWithRateLimit++;
        }
        for (const issue of ep.securityAnalysis.issues) {
          stats.security.totalSecurityIssues++;
          stats.security.issuesBySeverity[issue.severity]++;
        }
      }
      
      // 복잡도 통계
      if (ep.complexity) {
        totalComplexity += ep.complexity.score;
        if (ep.complexity.score <= 3) {
          stats.complexity.distribution.low++;
        } else if (ep.complexity.score <= 6) {
          stats.complexity.distribution.medium++;
        } else {
          stats.complexity.distribution.high++;
        }
      }
      
      // 문서화 통계
      if (ep.documentationScore) {
        totalDocScore += ep.documentationScore.score;
        if (ep.documentationScore.score >= 70) {
          stats.documentation.wellDocumented++;
        } else if (ep.documentationScore.score >= 30) {
          stats.documentation.partiallyDocumented++;
        } else {
          stats.documentation.undocumented++;
        }
      }
      
      // 성능 통계
      if (ep.performance) {
        if (ep.performance.hasCaching) stats.performance.withCaching++;
        if (ep.performance.hasPagination) stats.performance.withPagination++;
        if (ep.performance.estimatedLatency === 'high') stats.performance.highLatency++;
        else if (ep.performance.estimatedLatency === 'medium') stats.performance.mediumLatency++;
        else stats.performance.lowLatency++;
      }
    }
    
    // 평균 계산
    if (endpoints.length > 0) {
      stats.complexity.average = Math.round((totalComplexity / endpoints.length) * 10) / 10;
      stats.documentation.averageScore = Math.round(totalDocScore / endpoints.length);
    }
    
    // 가장 복잡한 엔드포인트 상위 5개
    stats.complexity.mostComplex = endpoints
      .filter(ep => ep.complexity)
      .sort((a, b) => (b.complexity?.score || 0) - (a.complexity?.score || 0))
      .slice(0, 5)
      .map(ep => ({
        path: ep.path,
        method: ep.method,
        score: ep.complexity?.score || 0,
      }));
    
    // 헬스 스코어 통계 계산 (NEW v2)
    let totalHealthScore = 0;
    let totalNamingScore = 0;
    for (const ep of endpoints) {
      // 헬스 스코어
      if (ep.healthScore) {
        totalHealthScore += ep.healthScore.overall;
        if (ep.healthScore.overall >= 80) stats.healthScore.distribution.excellent++;
        else if (ep.healthScore.overall >= 60) stats.healthScore.distribution.good++;
        else if (ep.healthScore.overall >= 40) stats.healthScore.distribution.fair++;
        else stats.healthScore.distribution.poor++;
      }
      
      // 네이밍 컨벤션 통계
      if (ep.namingConvention) {
        totalNamingScore += ep.namingConvention.score;
        if (ep.namingConvention.followsRESTful) {
          stats.naming.restfulCompliant++;
        } else {
          stats.naming.nonRestful++;
        }
        for (const issue of ep.namingConvention.issues) {
          stats.naming.commonIssues[issue] = (stats.naming.commonIssues[issue] || 0) + 1;
        }
      }
      
      // 일관성 통계
      if (ep.consistency) {
        stats.consistency.responseFormats[ep.consistency.responseFormat] = 
          (stats.consistency.responseFormats[ep.consistency.responseFormat] || 0) + 1;
        stats.consistency.versioningStyles[ep.consistency.versioningStyle] = 
          (stats.consistency.versioningStyles[ep.consistency.versioningStyle] || 0) + 1;
        stats.consistency.errorHandling[ep.consistency.errorHandling]++;
      }
    }
    
    // 평균 계산
    if (endpoints.length > 0) {
      stats.healthScore.average = Math.round(totalHealthScore / endpoints.length);
      stats.naming.averageScore = Math.round(totalNamingScore / endpoints.length);
    }
    
    // 가장 낮은 헬스 스코어 엔드포인트 상위 5개
    stats.healthScore.lowestScoring = endpoints
      .filter(ep => ep.healthScore)
      .sort((a, b) => (a.healthScore?.overall || 100) - (b.healthScore?.overall || 100))
      .slice(0, 5)
      .map(ep => ({
        path: ep.path,
        method: ep.method,
        score: ep.healthScore?.overall || 0,
      }));
    
    // v3 통계: 유사도 및 중복
    const allSimilarPairs: { endpoint1: string; endpoint2: string; score: number }[] = [];
    for (const ep of endpoints) {
      if (ep.similarity) {
        if (ep.similarity.potentialDuplicate) {
          stats.similarity.potentialDuplicates++;
        }
        for (const sim of ep.similarity.similarEndpoints) {
          const pair1 = `${ep.method} ${ep.path}`;
          const pair2 = `${sim.method} ${sim.path}`;
          // 중복 방지
          if (!allSimilarPairs.some(p => 
            (p.endpoint1 === pair1 && p.endpoint2 === pair2) ||
            (p.endpoint1 === pair2 && p.endpoint2 === pair1)
          )) {
            allSimilarPairs.push({ endpoint1: pair1, endpoint2: pair2, score: sim.score });
          }
        }
      }
    }
    stats.similarity.similarPairs = allSimilarPairs
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    // v3 통계: 의존성
    const externalApisSet = new Set<string>();
    for (const ep of endpoints) {
      if (ep.dependencies) {
        stats.dependencies.totalInternalCalls += ep.dependencies.callsEndpoints.length;
        stats.dependencies.totalExternalCalls += ep.dependencies.externalApis.length;
        ep.dependencies.externalApis.forEach(api => externalApisSet.add(api));
      }
    }
    stats.dependencies.externalApis = Array.from(externalApisSet).slice(0, 20);
    
    // 가장 많이 연결된 엔드포인트
    stats.dependencies.mostConnected = endpoints
      .filter(ep => ep.dependencies)
      .map(ep => ({
        path: ep.path,
        method: ep.method,
        connections: (ep.dependencies?.callsEndpoints.length || 0) + 
                     (ep.dependencies?.calledByEndpoints.length || 0),
      }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5);
    
    stats.analysisTimeMs = Date.now() - startTime;
    
    return NextResponse.json({
      endpoints,
      groups,
      stats,
      framework,
      projectName: project.name,
      projectPath: project.path,
    });
    
  } catch (error) {
    console.error('Failed to parse API endpoints:', error);
    return NextResponse.json({
      error: 'Failed to parse API endpoints',
      details: error instanceof Error ? error.message : String(error),
      endpoints: [],
      groups: [],
    }, { status: 200 });
  }
}

// ===== 생성 유틸리티 함수들 =====

// OpenAPI 3.0 스펙 생성
function generateOpenApiSpec(endpoints: ApiEndpoint[], projectName: string): object {
  const paths: Record<string, Record<string, object>> = {};
  const tags = new Set<string>();
  
  for (const ep of endpoints) {
    const path = ep.path.replace(/:(\w+)/g, '{$1}');
    if (!paths[path]) paths[path] = {};
    
    // 태그 추출
    const pathParts = ep.path.split('/').filter(Boolean);
    const tag = pathParts[0] || 'default';
    tags.add(tag);
    
    // 파라미터 생성
    const parameters: object[] = [];
    
    // Path 파라미터
    for (const param of ep.params) {
      parameters.push({
        name: param,
        in: 'path',
        required: true,
        schema: { type: 'string' },
      });
    }
    
    // Query/Header 파라미터
    if (ep.parameters) {
      for (const p of ep.parameters) {
        if (p.in !== 'body') {
          parameters.push({
            name: p.name,
            in: p.in,
            required: p.required,
            schema: { type: mapTypeToOpenApi(p.type) },
            description: p.description,
          });
        }
      }
    }
    
    // Request Body
    let requestBody = undefined;
    if (ep.requestBody) {
      requestBody = {
        required: ep.requestBody.required,
        content: {
          [ep.requestBody.contentType]: {
            schema: ep.requestBody.schema 
              ? { $ref: `#/components/schemas/${ep.requestBody.schema}` }
              : { type: 'object' },
            example: ep.requestBody.example,
          },
        },
      };
    }
    
    // Responses
    const responses: Record<string, object> = {};
    if (ep.responses && ep.responses.length > 0) {
      for (const r of ep.responses) {
        responses[String(r.statusCode)] = {
          description: r.description || `${r.statusCode} response`,
          content: r.contentType ? {
            [r.contentType]: {
              schema: r.schema ? { $ref: `#/components/schemas/${r.schema}` } : { type: 'object' },
            },
          } : undefined,
        };
      }
    } else {
      responses['200'] = { description: 'Successful response' };
    }
    
    paths[path][ep.method.toLowerCase()] = {
      operationId: ep.operationId || `${ep.method.toLowerCase()}_${ep.handler}`,
      summary: ep.summary || ep.description,
      description: ep.description,
      tags: ep.tags || [tag],
      deprecated: ep.deprecated,
      parameters: parameters.length > 0 ? parameters : undefined,
      requestBody,
      responses,
      security: ep.auth ? [{ [ep.auth]: [] }] : undefined,
    };
  }
  
  return {
    openapi: '3.0.3',
    info: {
      title: `${projectName} API`,
      version: '1.0.0',
      description: `Auto-generated API documentation for ${projectName}`,
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    tags: Array.from(tags).map(t => ({ name: t })),
    paths,
    components: {
      securitySchemes: {
        jwt: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apikey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        bearer: { type: 'http', scheme: 'bearer' },
        basic: { type: 'http', scheme: 'basic' },
      },
    },
  };
}

// 타입을 OpenAPI 타입으로 매핑
function mapTypeToOpenApi(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'string', 'String': 'string',
    'int': 'integer', 'Integer': 'integer', 'number': 'integer',
    'long': 'integer', 'Long': 'integer',
    'float': 'number', 'double': 'number', 'Double': 'number',
    'boolean': 'boolean', 'Boolean': 'boolean', 'bool': 'boolean',
    'array': 'array', 'list': 'array', 'List': 'array',
    'object': 'object', 'Object': 'object',
    'File': 'string',
  };
  return typeMap[type] || 'string';
}

// cURL 명령어 생성
function generateCurlCommand(endpoint: ApiEndpoint, baseUrl: string = 'http://localhost:3000'): string {
  const path = endpoint.path.replace(/:(\w+)/g, '{$1}');
  const url = `${baseUrl}${path}`;
  
  const parts: string[] = ['curl'];
  
  // Method
  if (endpoint.method !== 'GET') {
    parts.push(`-X ${endpoint.method}`);
  }
  
  // Headers
  if (endpoint.requestBody?.contentType) {
    parts.push(`-H 'Content-Type: ${endpoint.requestBody.contentType}'`);
  }
  
  if (endpoint.auth) {
    switch (endpoint.auth) {
      case 'bearer':
      case 'jwt':
        parts.push(`-H 'Authorization: Bearer YOUR_TOKEN'`);
        break;
      case 'apikey':
        parts.push(`-H 'X-API-Key: YOUR_API_KEY'`);
        break;
      case 'basic':
        parts.push(`-u 'username:password'`);
        break;
    }
  }
  
  // Body
  if (endpoint.requestBody && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    if (endpoint.requestBody.contentType === 'application/json') {
      const bodyFields: Record<string, string> = {};
      if (endpoint.parameters) {
        for (const p of endpoint.parameters) {
          if (p.in === 'body') {
            bodyFields[p.name] = `<${p.type}>`;
          }
        }
      }
      const bodyJson = Object.keys(bodyFields).length > 0 
        ? JSON.stringify(bodyFields, null, 2)
        : '{}';
      parts.push(`-d '${bodyJson}'`);
    } else if (endpoint.requestBody.contentType === 'multipart/form-data') {
      if (endpoint.parameters) {
        for (const p of endpoint.parameters) {
          if (p.in === 'body' && p.type === 'File') {
            parts.push(`-F '${p.name}=@/path/to/file'`);
          } else if (p.in === 'body') {
            parts.push(`-F '${p.name}=value'`);
          }
        }
      }
    }
  }
  
  // Query params
  let urlWithQuery = url;
  if (endpoint.parameters) {
    const queryParams = endpoint.parameters.filter(p => p.in === 'query');
    if (queryParams.length > 0) {
      const queryString = queryParams.map(p => `${p.name}=value`).join('&');
      urlWithQuery = `${url}?${queryString}`;
    }
  }
  
  parts.push(`'${urlWithQuery}'`);
  
  return parts.join(' \\\n  ');
}

// Postman Collection 생성
function generatePostmanCollection(endpoints: ApiEndpoint[], projectName: string): object {
  const items: object[] = [];
  const folders = new Map<string, object[]>();
  
  for (const ep of endpoints) {
    const pathParts = ep.path.split('/').filter(Boolean);
    const folderName = pathParts[0] || 'root';
    
    if (!folders.has(folderName)) {
      folders.set(folderName, []);
    }
    
    // Request 생성
    const request: Record<string, unknown> = {
      method: ep.method,
      header: [],
      url: {
        raw: `{{baseUrl}}${ep.path}`,
        host: ['{{baseUrl}}'],
        path: ep.path.split('/').filter(Boolean).map(p => p.startsWith(':') ? `:${p.slice(1)}` : p),
        variable: ep.params.map(p => ({ key: p, value: '' })),
      },
    };
    
    // Headers
    const headers: object[] = [];
    if (ep.requestBody?.contentType) {
      headers.push({ key: 'Content-Type', value: ep.requestBody.contentType });
    }
    if (ep.auth === 'bearer' || ep.auth === 'jwt') {
      headers.push({ key: 'Authorization', value: 'Bearer {{token}}' });
    } else if (ep.auth === 'apikey') {
      headers.push({ key: 'X-API-Key', value: '{{apiKey}}' });
    }
    request.header = headers;
    
    // Body
    if (ep.requestBody && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      if (ep.requestBody.contentType === 'application/json') {
        const bodyObj: Record<string, string> = {};
        if (ep.parameters) {
          for (const p of ep.parameters) {
            if (p.in === 'body') {
              bodyObj[p.name] = '';
            }
          }
        }
        request.body = {
          mode: 'raw',
          raw: JSON.stringify(bodyObj, null, 2),
          options: { raw: { language: 'json' } },
        };
      } else if (ep.requestBody.contentType === 'multipart/form-data') {
        const formdata: object[] = [];
        if (ep.parameters) {
          for (const p of ep.parameters) {
            if (p.in === 'body') {
              formdata.push({
                key: p.name,
                type: p.type === 'File' ? 'file' : 'text',
                value: '',
              });
            }
          }
        }
        request.body = { mode: 'formdata', formdata };
      }
    }
    
    // Query params
    if (ep.parameters) {
      const queryParams = ep.parameters.filter(p => p.in === 'query');
      if (queryParams.length > 0) {
        (request.url as Record<string, unknown>).query = queryParams.map(p => ({
          key: p.name,
          value: '',
          disabled: !p.required,
        }));
      }
    }
    
    const item = {
      name: `${ep.method} ${ep.path}`,
      request,
      response: [],
    };
    
    folders.get(folderName)!.push(item);
  }
  
  // 폴더 구조로 변환
  for (const [name, folderItems] of folders) {
    items.push({
      name,
      item: folderItems,
    });
  }
  
  return {
    info: {
      name: `${projectName} API`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:3000' },
      { key: 'token', value: '' },
      { key: 'apiKey', value: '' },
    ],
    item: items,
  };
}

// GraphQL 엔드포인트 감지
function parseGraphQLEndpoints(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 6) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (entry.endsWith('.graphql') || entry.endsWith('.gql') || entry.includes('schema') || entry.includes('resolver')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            
            // Query 감지
            const queryMatches = content.matchAll(/type\s+Query\s*\{([^}]+)\}/g);
            for (const m of queryMatches) {
              const queries = m[1].matchAll(/(\w+)\s*(?:\(([^)]*)\))?\s*:\s*([^\n]+)/g);
              for (const q of queries) {
                endpoints.push({
                  id: `QUERY-${q[1]}`,
                  method: 'POST',
                  path: '/graphql',
                  filePath: relativePath,
                  fileName: entry,
                  handler: q[1],
                  params: [],
                  description: `GraphQL Query: ${q[1]}`,
                  responseType: q[3].trim(),
                  isAsync: true,
                  lineNumber: 1,
                  framework: 'graphql',
                  tags: ['GraphQL', 'Query'],
                });
              }
            }
            
            // Mutation 감지
            const mutationMatches = content.matchAll(/type\s+Mutation\s*\{([^}]+)\}/g);
            for (const m of mutationMatches) {
              const mutations = m[1].matchAll(/(\w+)\s*(?:\(([^)]*)\))?\s*:\s*([^\n]+)/g);
              for (const q of mutations) {
                endpoints.push({
                  id: `MUTATION-${q[1]}`,
                  method: 'POST',
                  path: '/graphql',
                  filePath: relativePath,
                  fileName: entry,
                  handler: q[1],
                  params: [],
                  description: `GraphQL Mutation: ${q[1]}`,
                  responseType: q[3].trim(),
                  isAsync: true,
                  lineNumber: 1,
                  framework: 'graphql',
                  tags: ['GraphQL', 'Mutation'],
                });
              }
            }
            
            // Subscription 감지
            const subscriptionMatches = content.matchAll(/type\s+Subscription\s*\{([^}]+)\}/g);
            for (const m of subscriptionMatches) {
              const subs = m[1].matchAll(/(\w+)\s*(?:\(([^)]*)\))?\s*:\s*([^\n]+)/g);
              for (const q of subs) {
                endpoints.push({
                  id: `SUBSCRIPTION-${q[1]}`,
                  method: 'POST',
                  path: '/graphql',
                  filePath: relativePath,
                  fileName: entry,
                  handler: q[1],
                  params: [],
                  description: `GraphQL Subscription: ${q[1]}`,
                  responseType: q[3].trim(),
                  isAsync: true,
                  lineNumber: 1,
                  framework: 'graphql',
                  tags: ['GraphQL', 'Subscription'],
                });
              }
            }
            
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  
  scanDir(projectPath);
  return endpoints;
}

// WebSocket 엔드포인트 감지
function parseWebSocketEndpoints(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 6) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (['.ts', '.js', '.py', '.java', '.go'].some(ext => entry.endsWith(ext))) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            
            // Socket.io
            const socketioMatches = content.matchAll(/(?:io|socket)\.on\s*\(\s*['"](\w+)['"]/g);
            for (const m of socketioMatches) {
              if (!['connection', 'disconnect', 'error'].includes(m[1])) {
                endpoints.push({
                  id: `WS-${m[1]}`,
                  method: 'GET', // WebSocket upgrade
                  path: `/socket.io/${m[1]}`,
                  filePath: relativePath,
                  fileName: entry,
                  handler: m[1],
                  params: [],
                  description: `WebSocket Event: ${m[1]}`,
                  isAsync: true,
                  lineNumber: 1,
                  framework: 'socket.io',
                  tags: ['WebSocket'],
                });
              }
            }
            
            // ws library
            if (content.includes('new WebSocket') || content.includes('new WebSocketServer') || content.includes('ws.Server')) {
              const wsPath = content.match(/path:\s*['"]([^'"]+)['"]/);
              endpoints.push({
                id: `WS-server`,
                method: 'GET',
                path: wsPath ? wsPath[1] : '/ws',
                filePath: relativePath,
                fileName: entry,
                handler: 'WebSocketServer',
                params: [],
                description: 'WebSocket Server',
                isAsync: true,
                lineNumber: 1,
                framework: 'websocket',
                tags: ['WebSocket'],
              });
            }
            
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  
  scanDir(projectPath);
  return endpoints;
}

// gRPC 엔드포인트 감지 (Protocol Buffers)
function parseGrpcEndpoints(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 6) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build', 'vendor'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (entry.endsWith('.proto')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            
            // Package name
            const packageMatch = content.match(/package\s+([^;]+);/);
            const packageName = packageMatch ? packageMatch[1].trim() : '';
            
            // Service definitions
            const serviceMatches = content.matchAll(/service\s+(\w+)\s*\{([^}]+)\}/g);
            for (const sm of serviceMatches) {
              const serviceName = sm[1];
              const serviceBody = sm[2];
              
              // RPC methods
              const rpcMatches = serviceBody.matchAll(/rpc\s+(\w+)\s*\(\s*(\w+)\s*\)\s*returns\s*\(\s*(?:stream\s+)?(\w+)\s*\)/g);
              for (const rm of rpcMatches) {
                const methodName = rm[1];
                const requestType = rm[2];
                const responseType = rm[3];
                const isStream = serviceBody.includes(`stream ${responseType}`) || serviceBody.includes(`stream ${requestType}`);
                
                // Extract comments above the rpc
                const beforeRpc = serviceBody.substring(0, serviceBody.indexOf(`rpc ${methodName}`));
                const commentMatch = beforeRpc.match(/\/\/\s*(.+)\s*$/m);
                const description = commentMatch ? commentMatch[1].trim() : undefined;
                
                endpoints.push({
                  id: `gRPC-${serviceName}-${methodName}`,
                  method: 'POST', // gRPC uses HTTP/2 POST
                  path: `/${packageName ? packageName + '.' : ''}${serviceName}/${methodName}`,
                  filePath: relativePath,
                  fileName: entry,
                  handler: methodName,
                  params: [],
                  parameters: [
                    {
                      name: 'request',
                      type: requestType,
                      required: true,
                      in: 'body',
                      description: `gRPC request message: ${requestType}`,
                    }
                  ],
                  requestBody: {
                    contentType: 'application/grpc',
                    schema: requestType,
                    required: true,
                  },
                  responses: [
                    {
                      statusCode: 200,
                      contentType: 'application/grpc',
                      schema: responseType,
                      description: isStream ? `Stream of ${responseType}` : responseType,
                    }
                  ],
                  description: description || `gRPC ${isStream ? 'streaming ' : ''}method: ${serviceName}.${methodName}`,
                  summary: `${serviceName}/${methodName}`,
                  isAsync: true,
                  lineNumber: 1,
                  framework: 'grpc',
                  tags: ['gRPC', serviceName, ...(isStream ? ['Streaming'] : [])],
                  contentType: 'application/grpc',
                });
              }
            }
            
            // Message types (for reference)
            const messageMatches = content.matchAll(/message\s+(\w+)\s*\{([^}]+)\}/g);
            for (const mm of messageMatches) {
              // Could be used to enrich schema information
              // For now, we just detect services
            }
            
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  
  scanDir(projectPath);
  return endpoints;
}

// Kotlin/Ktor 엔드포인트 감지
function parseKtorRoutes(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 6) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['node_modules', '.git', 'build', 'out', '.gradle', 'target'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (entry.endsWith('.kt') || entry.endsWith('.kts')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            
            // Ktor: get("/path"), post("/path"), route("/path")
            const ktorRegex = /(get|post|put|patch|delete|route)\s*\(\s*["']([^"']+)["']\s*\)/gi;
            let match;
            while ((match = ktorRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase();
              if (method === 'ROUTE') continue; // route is for grouping
              const path = match[2];
              
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `KTOR-${method}-${path}-${lineNumber}`,
                method: method as ApiEndpoint['method'],
                path,
                filePath: relativePath,
                fileName: entry,
                handler: 'ktorHandler',
                params: (path.match(/\{(\w+)\}/g) || []).map(p => p.slice(1, -1)),
                isAsync: true,
                lineNumber,
                framework: 'ktor',
                tags: ['Kotlin', 'Ktor'],
              });
            }
            
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  
  scanDir(join(projectPath, 'src'));
  scanDir(projectPath);
  return endpoints;
}

// Elixir/Phoenix 엔드포인트 감지
function parsePhoenixRoutes(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  function scanDir(dir: string, depth: number = 0) {
    if (depth > 6) return;
    
    try {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (['deps', '_build', '.git', 'node_modules'].includes(entry)) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (entry === 'router.ex' || entry.endsWith('_router.ex')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath);
            
            // Phoenix: get "/path", Controller, :action
            const phoenixRegex = /(get|post|put|patch|delete)\s+["']([^"']+)["']\s*,\s*(\w+)(?:Controller)?\s*,\s*:(\w+)/gi;
            let match;
            while ((match = phoenixRegex.exec(content)) !== null) {
              const method = match[1].toUpperCase() as ApiEndpoint['method'];
              const path = match[2];
              const controller = match[3];
              const action = match[4];
              
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              endpoints.push({
                id: `PHOENIX-${method}-${path}-${lineNumber}`,
                method,
                path,
                filePath: relativePath,
                fileName: entry,
                handler: `${controller}.${action}`,
                params: (path.match(/:(\w+)/g) || []).map(p => p.slice(1)),
                isAsync: true,
                lineNumber,
                framework: 'phoenix',
                tags: ['Elixir', 'Phoenix'],
              });
            }
            
            // resources macro: resources "/users", UserController
            const resourcesRegex = /resources\s+["']([^"']+)["']\s*,\s*(\w+)(?:Controller)?/gi;
            while ((match = resourcesRegex.exec(content)) !== null) {
              const basePath = match[1];
              const controller = match[2];
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              // RESTful resources generate: index, show, new, edit, create, update, delete
              const resourceActions = [
                { method: 'GET', path: basePath, action: 'index' },
                { method: 'GET', path: `${basePath}/new`, action: 'new' },
                { method: 'GET', path: `${basePath}/:id`, action: 'show' },
                { method: 'GET', path: `${basePath}/:id/edit`, action: 'edit' },
                { method: 'POST', path: basePath, action: 'create' },
                { method: 'PUT', path: `${basePath}/:id`, action: 'update' },
                { method: 'DELETE', path: `${basePath}/:id`, action: 'delete' },
              ];
              
              for (const ra of resourceActions) {
                endpoints.push({
                  id: `PHOENIX-${ra.method}-${ra.path}-${lineNumber}`,
                  method: ra.method as ApiEndpoint['method'],
                  path: ra.path,
                  filePath: relativePath,
                  fileName: entry,
                  handler: `${controller}.${ra.action}`,
                  params: ra.path.includes(':id') ? ['id'] : [],
                  isAsync: true,
                  lineNumber,
                  framework: 'phoenix',
                  tags: ['Elixir', 'Phoenix', 'RESTful'],
                });
              }
            }
            
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  
  scanDir(join(projectPath, 'lib'));
  scanDir(projectPath);
  return endpoints;
}

// ===== 고급 분석 함수들 (v3) =====

// 유사 엔드포인트 감지
function detectSimilarEndpoints(endpoint: Partial<ApiEndpoint>, allEndpoints: Partial<ApiEndpoint>[]): ApiEndpoint['similarity'] {
  const path = endpoint.path || '';
  const method = endpoint.method || 'GET';
  const similarEndpoints: { path: string; method: string; score: number }[] = [];
  
  // 경로 토큰화
  const pathTokens = path
    .split('/')
    .filter(p => p && !p.startsWith(':') && !p.startsWith('{'))
    .map(p => p.toLowerCase());
  
  for (const other of allEndpoints) {
    if (other === endpoint) continue;
    
    const otherPath = other.path || '';
    const otherMethod = other.method || 'GET';
    const otherTokens = otherPath
      .split('/')
      .filter(p => p && !p.startsWith(':') && !p.startsWith('{'))
      .map(p => p.toLowerCase());
    
    // Jaccard 유사도 계산
    const intersection = pathTokens.filter(t => otherTokens.includes(t)).length;
    const union = new Set([...pathTokens, ...otherTokens]).size;
    const pathSimilarity = union > 0 ? intersection / union : 0;
    
    // 메서드 유사도
    const methodSimilarity = method === otherMethod ? 0.3 : 0;
    
    // 파라미터 유사도
    const paramCount = endpoint.parameters?.length || 0;
    const otherParamCount = other.parameters?.length || 0;
    const paramSimilarity = Math.min(paramCount, otherParamCount) / Math.max(paramCount, otherParamCount, 1) * 0.2;
    
    const totalScore = Math.round((pathSimilarity * 0.5 + methodSimilarity + paramSimilarity) * 100);
    
    if (totalScore >= 50) {
      similarEndpoints.push({
        path: otherPath,
        method: otherMethod,
        score: totalScore,
      });
    }
  }
  
  // 상위 3개만 반환, 점수 순 정렬
  similarEndpoints.sort((a, b) => b.score - a.score);
  const topSimilar = similarEndpoints.slice(0, 3);
  
  return {
    similarEndpoints: topSimilar,
    potentialDuplicate: topSimilar.length > 0 && topSimilar[0].score >= 80,
  };
}

// Mock 데이터 생성
function generateMockData(endpoint: Partial<ApiEndpoint>): ApiEndpoint['mockData'] {
  const method = endpoint.method || 'GET';
  const path = endpoint.path || '';
  
  // 리소스 이름 추출
  const pathParts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
  const resourceName = pathParts[pathParts.length - 1]?.replace(/s$/, '') || 'item';
  
  // Request example
  let requestExample: string | undefined;
  if (endpoint.requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
    const requestFields: Record<string, unknown> = {};
    if (endpoint.parameters) {
      for (const p of endpoint.parameters) {
        if (p.in === 'body') {
          requestFields[p.name] = getMockValue(p.type, p.name);
        }
      }
    }
    if (Object.keys(requestFields).length === 0) {
      requestFields.name = `New ${resourceName}`;
      requestFields.description = `Description for ${resourceName}`;
    }
    requestExample = JSON.stringify(requestFields, null, 2);
  }
  
  // Response example
  const responseFields: Record<string, unknown> = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  if (endpoint.responses && endpoint.responses.length > 0) {
    const successResponse = endpoint.responses.find(r => r.statusCode === 200 || r.statusCode === 201);
    if (successResponse?.schema) {
      responseFields['_type'] = successResponse.schema;
    }
  }
  
  // 리소스 기반 필드 추가
  switch (resourceName.toLowerCase()) {
    case 'user':
      Object.assign(responseFields, { name: 'John Doe', email: 'john@example.com', role: 'user' });
      break;
    case 'product':
      Object.assign(responseFields, { name: 'Sample Product', price: 99.99, stock: 100 });
      break;
    case 'order':
      Object.assign(responseFields, { status: 'pending', total: 199.99, items: [] });
      break;
    case 'post':
      Object.assign(responseFields, { title: 'Sample Post', content: 'Lorem ipsum...', author: 'John Doe' });
      break;
    default:
      Object.assign(responseFields, { name: `Sample ${resourceName}`, description: `A sample ${resourceName}` });
  }
  
  // 목록 엔드포인트인 경우
  const isListEndpoint = method === 'GET' && !path.includes(':id') && !path.includes('{id}');
  let responseExample: string;
  
  if (isListEndpoint) {
    responseExample = JSON.stringify({
      data: [responseFields],
      pagination: {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
      },
    }, null, 2);
  } else {
    responseExample = JSON.stringify({
      success: true,
      data: responseFields,
    }, null, 2);
  }
  
  return {
    responseExample,
    requestExample,
    generatedAt: new Date().toISOString(),
  };
}

// 타입에 따른 Mock 값 생성
function getMockValue(type: string, name: string): unknown {
  const lowerType = type.toLowerCase();
  const lowerName = name.toLowerCase();
  
  // 이름 기반 추론
  if (lowerName.includes('email')) return 'user@example.com';
  if (lowerName.includes('name')) return 'John Doe';
  if (lowerName.includes('phone')) return '+1-555-123-4567';
  if (lowerName.includes('url') || lowerName.includes('link')) return 'https://example.com';
  if (lowerName.includes('date')) return new Date().toISOString();
  if (lowerName.includes('id')) return '550e8400-e29b-41d4-a716-446655440000';
  if (lowerName.includes('password')) return '********';
  if (lowerName.includes('price') || lowerName.includes('amount')) return 99.99;
  if (lowerName.includes('count') || lowerName.includes('quantity')) return 10;
  if (lowerName.includes('status')) return 'active';
  if (lowerName.includes('enabled') || lowerName.includes('active')) return true;
  
  // 타입 기반
  switch (lowerType) {
    case 'string':
    case 'str':
      return 'sample_string';
    case 'number':
    case 'int':
    case 'integer':
    case 'float':
    case 'double':
      return 42;
    case 'boolean':
    case 'bool':
      return true;
    case 'array':
    case 'list':
      return [];
    case 'object':
    case 'dict':
      return {};
    case 'date':
    case 'datetime':
      return new Date().toISOString();
    default:
      return `<${type}>`;
  }
}

// SDK 스니펫 생성
function generateSDKSnippets(endpoint: Partial<ApiEndpoint>): ApiEndpoint['sdkSnippets'] {
  const method = endpoint.method || 'GET';
  const path = endpoint.path || '';
  const baseUrl = 'https://api.example.com';
  const fullUrl = `${baseUrl}${path}`;
  
  // Path 파라미터 대체
  const urlWithParams = path.replace(/:(\w+)/g, '${$1}').replace(/\{(\w+)\}/g, '${$1}');
  
  // Request body 구성
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method) && endpoint.requestBody;
  const bodyFields: Record<string, unknown> = {};
  if (hasBody && endpoint.parameters) {
    for (const p of endpoint.parameters) {
      if (p.in === 'body') {
        bodyFields[p.name] = getMockValue(p.type, p.name);
      }
    }
  }
  const bodyJson = hasBody ? JSON.stringify(bodyFields, null, 2) : '';
  
  // Query params
  const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
  const queryString = queryParams.length > 0 
    ? '?' + queryParams.map(p => `${p.name}=value`).join('&')
    : '';
  
  // TypeScript/JavaScript fetch snippet
  const typescript = `// TypeScript/JavaScript
const response = await fetch(\`${baseUrl}${urlWithParams}${queryString}\`, {
  method: '${method}',
  headers: {
    'Content-Type': 'application/json',${endpoint.auth ? "\n    'Authorization': 'Bearer YOUR_TOKEN'," : ''}
  },${hasBody ? `\n  body: JSON.stringify(${bodyJson.split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n')}),` : ''}
});

const data = await response.json();
console.log(data);`;

  // Python requests snippet
  const python = `# Python
import requests

response = requests.${method.toLowerCase()}(
    f"${baseUrl}${urlWithParams.replace(/\$\{/g, '{')}"${queryString ? `,
    params={${queryParams.map(p => `"${p.name}": "value"`).join(', ')}}` : ''}${hasBody ? `,
    json=${bodyJson.split('\n').map((l, i) => i === 0 ? l : '    ' + l).join('\n')}` : ''},
    headers={
        "Content-Type": "application/json",${endpoint.auth ? '\n        "Authorization": "Bearer YOUR_TOKEN",' : ''}
    }
)

print(response.json())`;

  // cURL snippet
  const curl = `# cURL
curl -X ${method} \\
  '${fullUrl.replace(/:(\\w+)/g, '{$1}')}${queryString}' \\
  -H 'Content-Type: application/json'${endpoint.auth ? " \\\n  -H 'Authorization: Bearer YOUR_TOKEN'" : ''}${hasBody ? ` \\\n  -d '${JSON.stringify(bodyFields)}'` : ''}`;

  // JavaScript (Node.js with axios)
  const javascript = `// JavaScript (Node.js with axios)
const axios = require('axios');

const response = await axios.${method.toLowerCase()}(\`${baseUrl}${urlWithParams}${queryString}\`, ${hasBody ? `${bodyJson}, ` : ''}{
  headers: {
    'Content-Type': 'application/json',${endpoint.auth ? "\n    'Authorization': 'Bearer YOUR_TOKEN'," : ''}
  },
});

console.log(response.data);`;

  return {
    typescript,
    python,
    curl,
    javascript,
  };
}

// 의존성 분석
function analyzeDependencies(content: string, startIndex: number, endpoint: Partial<ApiEndpoint>): ApiEndpoint['dependencies'] {
  const funcContent = content.substring(startIndex, startIndex + 5000);
  const callsEndpoints: string[] = [];
  const externalApis: string[] = [];
  
  // 내부 API 호출 감지
  const internalCallPatterns = [
    /fetch\s*\(\s*['"`]\/api\/([^'"`]+)['"`]/g,
    /axios\.[a-z]+\s*\(\s*['"`]\/api\/([^'"`]+)['"`]/g,
    /request\s*\(\s*['"`]\/api\/([^'"`]+)['"`]/g,
  ];
  
  for (const pattern of internalCallPatterns) {
    const matches = funcContent.matchAll(pattern);
    for (const m of matches) {
      const calledPath = `/api/${m[1]}`;
      if (!callsEndpoints.includes(calledPath)) {
        callsEndpoints.push(calledPath);
      }
    }
  }
  
  // 외부 API 호출 감지
  const externalUrlPattern = /fetch\s*\(\s*['"`](https?:\/\/[^'"`]+)['"`]/g;
  const externalMatches = funcContent.matchAll(externalUrlPattern);
  for (const m of externalMatches) {
    const url = m[1];
    if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
      // 도메인만 추출
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        if (!externalApis.includes(domain)) {
          externalApis.push(domain);
        }
      } catch {
        externalApis.push(url.slice(0, 50));
      }
    }
  }
  
  return {
    callsEndpoints,
    calledByEndpoints: [], // 이건 전체 분석 시 채워짐
    externalApis,
  };
}

// 사용 힌트 생성
function generateUsageHints(endpoint: Partial<ApiEndpoint>): ApiEndpoint['usageHints'] {
  const method = endpoint.method || 'GET';
  const path = endpoint.path || '';
  const recommendedHeaders: { name: string; value: string; description: string }[] = [];
  const commonErrors: { code: number; message: string; solution: string }[] = [];
  const bestPractices: string[] = [];
  
  // 권장 헤더
  recommendedHeaders.push({
    name: 'Content-Type',
    value: 'application/json',
    description: 'API는 JSON 형식 응답을 반환합니다',
  });
  
  if (endpoint.auth && endpoint.auth !== 'none') {
    switch (endpoint.auth) {
      case 'bearer':
      case 'jwt':
        recommendedHeaders.push({
          name: 'Authorization',
          value: 'Bearer <your_token>',
          description: 'JWT 토큰을 통한 인증이 필요합니다',
        });
        break;
      case 'apikey':
        recommendedHeaders.push({
          name: 'X-API-Key',
          value: '<your_api_key>',
          description: 'API 키를 통한 인증이 필요합니다',
        });
        break;
    }
  }
  
  // 일반적인 에러
  if (endpoint.auth && endpoint.auth !== 'none') {
    commonErrors.push({
      code: 401,
      message: 'Unauthorized',
      solution: '유효한 인증 토큰/키를 헤더에 포함하세요',
    });
    commonErrors.push({
      code: 403,
      message: 'Forbidden',
      solution: '해당 리소스에 대한 권한이 있는지 확인하세요',
    });
  }
  
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    commonErrors.push({
      code: 400,
      message: 'Bad Request',
      solution: '요청 본문의 형식과 필수 필드를 확인하세요',
    });
    commonErrors.push({
      code: 422,
      message: 'Unprocessable Entity',
      solution: '입력 데이터의 유효성을 확인하세요',
    });
  }
  
  if (path.includes(':id') || path.includes('{id}')) {
    commonErrors.push({
      code: 404,
      message: 'Not Found',
      solution: '해당 ID의 리소스가 존재하는지 확인하세요',
    });
  }
  
  // 베스트 프랙티스
  if (method === 'GET') {
    bestPractices.push('캐시 헤더를 활용하여 성능을 최적화하세요');
    if (endpoint.performance?.hasPagination) {
      bestPractices.push('페이지네이션을 사용하여 대량 데이터를 효율적으로 처리하세요');
    }
  }
  
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    bestPractices.push('요청 전 데이터 유효성을 클라이언트에서 먼저 검증하세요');
    bestPractices.push('네트워크 오류에 대비하여 적절한 재시도 로직을 구현하세요');
  }
  
  if (endpoint.rateLimit) {
    bestPractices.push(`Rate limit: ${endpoint.rateLimit.limit}회/${endpoint.rateLimit.window} - 호출 빈도를 조절하세요`);
  }
  
  if (endpoint.deprecated) {
    bestPractices.push('⚠️ 이 엔드포인트는 더 이상 사용되지 않습니다. 새 버전을 사용하세요');
  }
  
  return {
    recommendedHeaders,
    commonErrors,
    bestPractices,
  };
}

// 전체 의존성 그래프 구성
function buildDependencyGraph(endpoints: ApiEndpoint[]): void {
  // 각 엔드포인트가 호출하는 다른 엔드포인트들을 분석 후, calledByEndpoints 업데이트
  for (const ep of endpoints) {
    if (ep.dependencies?.callsEndpoints) {
      for (const calledPath of ep.dependencies.callsEndpoints) {
        // calledPath와 일치하는 엔드포인트 찾기
        const calledEndpoint = endpoints.find(e => 
          e.path === calledPath || 
          e.path.replace(/:\w+/g, '*') === calledPath.replace(/:\w+/g, '*')
        );
        if (calledEndpoint && calledEndpoint.dependencies) {
          if (!calledEndpoint.dependencies.calledByEndpoints.includes(`${ep.method} ${ep.path}`)) {
            calledEndpoint.dependencies.calledByEndpoints.push(`${ep.method} ${ep.path}`);
          }
        }
      }
    }
  }
}

// 엔드포인트에 고급 분석 추가 (v3)
function enrichEndpointWithAdvancedAnalysis(
  endpoint: ApiEndpoint,
  content: string,
  startIndex: number,
  allEndpoints: ApiEndpoint[]
): ApiEndpoint {
  endpoint.similarity = detectSimilarEndpoints(endpoint, allEndpoints);
  endpoint.mockData = generateMockData(endpoint);
  endpoint.sdkSnippets = generateSDKSnippets(endpoint);
  endpoint.dependencies = analyzeDependencies(content, startIndex, endpoint);
  endpoint.usageHints = generateUsageHints(endpoint);
  endpoint.changeRisk = analyzeChangeRisk(endpoint, allEndpoints);
  
  return endpoint;
}
