/**
 * 소스 저장소 동기화 모듈
 * 
 * GitHub, GitLab, Bitbucket Server 지원 (오프라인망 포함)
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { SourceSnapshot, FileInfo } from '../types';

// 저장소 유형
export type RepoProvider = 'github' | 'gitlab' | 'bitbucket';

// 저장소 설정
export interface RepoConfig {
  provider: RepoProvider;
  url: string;                  // 저장소 URL
  branch?: string;              // 기본 브랜치 (없으면 자동 감지)
  token?: string;               // 인증 토큰
  username?: string;            // Bitbucket 등에서 필요
  password?: string;            // 기본 인증용
  sshKeyPath?: string;          // SSH 키 경로
  insecure?: boolean;           // SSL 검증 무시 (오프라인망)
  localPath: string;            // 로컬 클론 경로
}

// 동기화 옵션
export interface SyncOptions {
  shallowClone?: boolean;       // depth=1
  depth?: number;               // 커밋 히스토리 깊이
  includeSubmodules?: boolean;  // 서브모듈 포함
  timeout?: number;             // 타임아웃 (ms)
}

// 동기화 결과
export interface SyncResult {
  success: boolean;
  snapshot: SourceSnapshot;
  files: FileInfo[];
  error?: string;
}

export class SourceSync {
  private config: RepoConfig;
  private options: SyncOptions;

  constructor(config: RepoConfig, options?: SyncOptions) {
    this.config = config;
    this.options = {
      shallowClone: false,
      depth: 1,
      includeSubmodules: false,
      timeout: 300000,  // 5분
      ...options
    };
  }

  /**
   * 저장소 동기화 (클론 또는 풀)
   */
  async sync(): Promise<SyncResult> {
    try {
      const localPath = this.config.localPath;
      
      // 이미 클론되어 있는지 확인
      const isCloned = fs.existsSync(path.join(localPath, '.git'));
      
      if (isCloned) {
        await this.pull();
      } else {
        await this.clone();
      }

      // 커밋 정보 추출
      const commitId = this.getHeadCommit();
      const branch = this.getCurrentBranch();
      
      // 파일 목록 수집
      const files = await this.collectFiles();

      const snapshot: SourceSnapshot = {
        id: `snapshot-${Date.now()}`,
        commitId,
        branch,
        createdAt: new Date(),
        fileCount: files.length
      };

      return {
        success: true,
        snapshot,
        files
      };
    } catch (error) {
      return {
        success: false,
        snapshot: {
          id: `error-${Date.now()}`,
          createdAt: new Date(),
          fileCount: 0
        },
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 저장소 클론
   */
  private async clone(): Promise<void> {
    const authUrl = this.buildAuthUrl();
    const cmd = this.buildCloneCommand(authUrl);
    
    this.execGit(cmd);
  }

  /**
   * 저장소 풀
   */
  private async pull(): Promise<void> {
    const cmds = [
      'git fetch origin',
      `git reset --hard origin/${this.config.branch || 'main'}`
    ];
    
    for (const cmd of cmds) {
      this.execGit(cmd, this.config.localPath);
    }
  }

  /**
   * 인증 URL 생성
   */
  private buildAuthUrl(): string {
    const url = new URL(this.config.url);
    
    if (this.config.token) {
      // GitHub/GitLab 토큰 인증
      if (this.config.provider === 'github') {
        url.username = this.config.token;
        url.password = 'x-oauth-basic';
      } else if (this.config.provider === 'gitlab') {
        url.username = 'oauth2';
        url.password = this.config.token;
      } else if (this.config.provider === 'bitbucket') {
        // Bitbucket Server는 username/token 조합
        url.username = this.config.username || 'x-token-auth';
        url.password = this.config.token;
      }
    } else if (this.config.username && this.config.password) {
      // 기본 인증
      url.username = this.config.username;
      url.password = this.config.password;
    }

    return url.toString();
  }

  /**
   * 클론 명령어 생성
   */
  private buildCloneCommand(authUrl: string): string {
    const parts = ['git clone'];
    
    // SSL 검증 비활성화 (오프라인망 자체 서명 인증서)
    if (this.config.insecure) {
      parts.unshift('GIT_SSL_NO_VERIFY=true');
    }
    
    // Shallow clone
    if (this.options.shallowClone) {
      parts.push(`--depth ${this.options.depth || 1}`);
    }
    
    // 특정 브랜치
    if (this.config.branch) {
      parts.push(`--branch ${this.config.branch}`);
    }
    
    // 서브모듈
    if (this.options.includeSubmodules) {
      parts.push('--recurse-submodules');
    }
    
    parts.push(`"${authUrl}"`);
    parts.push(`"${this.config.localPath}"`);
    
    return parts.join(' ');
  }

  /**
   * Git 명령 실행
   */
  private execGit(cmd: string, cwd?: string): string {
    const env: NodeJS.ProcessEnv = { ...process.env };
    
    // SSH 키 설정
    if (this.config.sshKeyPath) {
      env.GIT_SSH_COMMAND = `ssh -i "${this.config.sshKeyPath}" -o StrictHostKeyChecking=no`;
    }
    
    // SSL 검증 비활성화
    if (this.config.insecure) {
      env.GIT_SSL_NO_VERIFY = 'true';
    }

    return execSync(cmd, {
      cwd: cwd || process.cwd(),
      env,
      timeout: this.options.timeout,
      encoding: 'utf-8'
    });
  }

  /**
   * HEAD 커밋 ID 추출
   */
  private getHeadCommit(): string {
    try {
      return this.execGit('git rev-parse HEAD', this.config.localPath).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * 현재 브랜치 추출
   */
  private getCurrentBranch(): string {
    try {
      return this.execGit('git rev-parse --abbrev-ref HEAD', this.config.localPath).trim();
    } catch {
      return this.config.branch || 'main';
    }
  }

  /**
   * 파일 목록 수집
   */
  private async collectFiles(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    
    const walk = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.config.localPath, fullPath);
        
        // .git 디렉토리 제외
        if (relativePath.startsWith('.git')) continue;
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          const ext = path.extname(entry.name);
          
          files.push({
            path: fullPath,
            name: entry.name,
            extension: ext.slice(1),  // Remove leading dot
            size: stats.size,
            lastModified: stats.mtime
          });
        }
      }
    };
    
    walk(this.config.localPath);
    return files;
  }

  /**
   * 저장소 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const authUrl = this.buildAuthUrl();
      this.execGit(`git ls-remote "${authUrl}" HEAD`);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 저장소 유형별 팩토리
 */
export function createSourceSync(
  provider: RepoProvider,
  url: string,
  localPath: string,
  auth: {
    token?: string;
    username?: string;
    password?: string;
    sshKeyPath?: string;
  },
  options?: SyncOptions & { branch?: string; insecure?: boolean }
): SourceSync {
  return new SourceSync({
    provider,
    url,
    localPath,
    branch: options?.branch,
    insecure: options?.insecure,
    ...auth
  }, options);
}

/**
 * GitHub 동기화 헬퍼
 */
export function createGitHubSync(
  url: string,
  localPath: string,
  token: string,
  options?: SyncOptions
): SourceSync {
  return createSourceSync('github', url, localPath, { token }, options);
}

/**
 * GitLab 동기화 헬퍼 (오프라인망 지원)
 */
export function createGitLabSync(
  url: string,
  localPath: string,
  token: string,
  options?: SyncOptions & { insecure?: boolean }
): SourceSync {
  return createSourceSync('gitlab', url, localPath, { token }, {
    ...options,
    insecure: options?.insecure
  });
}

/**
 * Bitbucket Server 동기화 헬퍼 (오프라인망 지원)
 */
export function createBitbucketSync(
  url: string,
  localPath: string,
  auth: { username: string; token: string } | { username: string; password: string },
  options?: SyncOptions & { insecure?: boolean }
): SourceSync {
  return createSourceSync('bitbucket', url, localPath, {
    username: auth.username,
    token: 'token' in auth ? auth.token : undefined,
    password: 'password' in auth ? auth.password : undefined
  }, {
    ...options,
    insecure: options?.insecure
  });
}
