import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { prisma } from '@/lib/db';

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  path: string;
  filePath: string;
  fileName: string;
  handler: string;
  params: string[];
  queryParams?: string[];
  middleware?: string[];
  description?: string;
  requestBody?: string;
  responseType?: string;
  isAsync: boolean;
  lineNumber: number;
  framework: string;
  // 추가 메타데이터
  auth?: 'jwt' | 'session' | 'apikey' | 'oauth' | 'none';
  deprecated?: boolean;
  tags?: string[];
  statusCodes?: number[];
}

interface ApiGroup {
  prefix: string;
  endpoints: ApiEndpoint[];
  subGroups?: ApiGroup[];
}

// 프레임워크 감지
function detectFramework(projectPath: string): string {
  try {
    if (existsSync(join(projectPath, 'package.json'))) {
      const pkg = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) return 'nextjs';
      if (deps.express) return 'express';
      if (deps.fastify) return 'fastify';
      if (deps['@nestjs/core']) return 'nestjs';
      if (deps.koa) return 'koa';
      if (deps.hono) return 'hono';
    }
    if (existsSync(join(projectPath, 'requirements.txt'))) {
      const req = readFileSync(join(projectPath, 'requirements.txt'), 'utf-8');
      if (req.includes('fastapi')) return 'fastapi';
      if (req.includes('flask')) return 'flask';
      if (req.includes('django')) return 'django';
    }
    if (existsSync(join(projectPath, 'pom.xml')) || existsSync(join(projectPath, 'build.gradle'))) {
      return 'spring';
    }
  } catch (e) {}
  return 'unknown';
}

// Next.js App Router 파싱
function parseNextJsAppRouter(projectPath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  const apiDir = join(projectPath, 'app', 'api');
  
  if (!existsSync(apiDir)) return endpoints;
  
  function scanDir(dir: string, basePath: string = '/api') {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Dynamic route: [param] -> :param
          const routePart = entry.startsWith('[') && entry.endsWith(']')
            ? `:${entry.slice(1, -1)}`
            : entry;
          scanDir(fullPath, `${basePath}/${routePart}`);
        } else if (entry === 'route.ts' || entry === 'route.js') {
          // Parse route file
          const content = readFileSync(fullPath, 'utf-8');
          const relativePath = relative(projectPath, fullPath);
          
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
              
              endpoints.push({
                id: `${method}-${basePath}`,
                method: method as ApiEndpoint['method'],
                path: basePath,
                filePath: relativePath,
                fileName: entry,
                handler: method,
                params,
                description,
                isAsync,
                lineNumber,
                framework: 'nextjs',
              });
            }
          }
        }
      }
    } catch (e) {}
  }
  
  scanDir(apiDir);
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
              
              endpoints.push({
                id: `${method}-${path}-${relativePath}-${lineNumber}`,
                method: method as ApiEndpoint['method'],
                path, filePath: relativePath, fileName: entry,
                handler, params, isAsync, lineNumber, framework: 'express',
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
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: method.toLowerCase(), params, isAsync, lineNumber, framework: 'fastify',
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
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler: method.toLowerCase(), params, isAsync, lineNumber, framework: 'hono',
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
              
              endpoints.push({
                id: `${method}-${fullPath2}-${lineNumber}`,
                method, path: fullPath2, filePath: relativePath, fileName: entry,
                handler, params, isAsync, lineNumber, framework: 'nestjs',
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
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method: method as ApiEndpoint['method'],
                path, filePath: relativePath, fileName: entry,
                handler, params: [], isAsync: true, lineNumber, framework: 'trpc',
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
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler, params, isAsync, lineNumber, framework: 'fastapi',
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
              
              endpoints.push({
                id: `${method}-${path}-${lineNumber}`,
                method, path, filePath: relativePath, fileName: entry,
                handler, params, isAsync, lineNumber, framework: 'fastapi',
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
                
                endpoints.push({
                  id: `${method}-${path}-${lineNumber}`,
                  method: method as ApiEndpoint['method'],
                  path, filePath: relativePath, fileName: entry,
                  handler, params, isAsync: false, lineNumber, framework: 'flask',
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
              
              endpoints.push({
                id: `GET-${path}-${lineNumber}`,
                method: 'GET', path, filePath: relativePath, fileName: entry,
                handler, params, isAsync: false, lineNumber, framework: 'django',
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
              
              endpoints.push({
                id: `${method}-${fullPath2}-${lineNumber}`,
                method: method as ApiEndpoint['method'],
                path: fullPath2,
                filePath: relativePath,
                fileName: entry,
                handler,
                params,
                isAsync: content.substring(match.index, match.index + 300).includes('CompletableFuture') || 
                         content.substring(match.index, match.index + 300).includes('Mono<') ||
                         content.substring(match.index, match.index + 300).includes('suspend'),
                lineNumber,
                framework: 'spring',
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
              
              endpoints.push({
                id: `${method}-${fullPath2}-${lineNumber}`,
                method,
                path: fullPath2,
                filePath: relativePath,
                fileName: entry,
                handler,
                params,
                isAsync: false,
                lineNumber,
                framework: 'jax-rs',
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
        endpoints = parseNextJsAppRouter(project.path);
        break;
      case 'express':
      case 'fastify':
      case 'koa':
      case 'nestjs':
      case 'hono':
        endpoints = parseTypeScriptRoutes(project.path);
        break;
      case 'fastapi':
      case 'flask':
      case 'django':
        endpoints = parsePythonRoutes(project.path);
        break;
      case 'spring':
        endpoints = parseSpringRoutes(project.path);
        break;
      default:
        // Try all parsers
        endpoints = [
          ...parseNextJsAppRouter(project.path),
          ...parseTypeScriptRoutes(project.path),
          ...parsePythonRoutes(project.path),
          ...parseSpringRoutes(project.path),
        ];
    }
    
    // 그룹화
    const groups = groupEndpoints(endpoints);
    
    // 통계
    const stats = {
      total: endpoints.length,
      byMethod: {} as Record<string, number>,
      byFramework: {} as Record<string, number>,
    };
    
    for (const ep of endpoints) {
      stats.byMethod[ep.method] = (stats.byMethod[ep.method] || 0) + 1;
      stats.byFramework[ep.framework] = (stats.byFramework[ep.framework] || 0) + 1;
    }
    
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
