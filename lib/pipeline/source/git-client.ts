/**
 * Git 소스 수집 엔진
 * 
 * Git 저장소에서 소스 코드를 수집합니다.
 * - git pull / git fetch
 * - 브랜치/태그/커밋 지정
 * - 증분 수집 (변경 파일만)
 * - 해시 기반 무결성 검증
 * - 웹훅/스케줄/수동 트리거
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as crypto from 'crypto';
import { FileInfo } from '../types';

// ============================================================================
// 타입 정의
// ============================================================================

export type TriggerType = 'manual' | 'schedule' | 'webhook';

export interface GitConfig {
  repoUrl: string;
  localPath: string;
  branch?: string;
  tag?: string;
  commitHash?: string;
  shallowClone?: boolean;
  depth?: number;
  sshKeyPath?: string;
  username?: string;
  password?: string;
}

export interface SyncOptions {
  trigger: TriggerType;
  incremental?: boolean;       // 증분 수집
  since?: Date;                // 이 날짜 이후 변경분만
  filePatterns?: string[];     // 수집할 파일 패턴
  excludePatterns?: string[];  // 제외 패턴
  maxFileSize?: number;        // 최대 파일 크기 (bytes)
}

export interface SyncResult {
  success: boolean;
  trigger: TriggerType;
  timestamp: Date;
  commitHash: string;
  branch: string;
  changedFiles: string[];
  addedFiles: string[];
  deletedFiles: string[];
  modifiedFiles: string[];
  totalFiles: number;
  duration: number;           // milliseconds
  error?: string;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;           // renamed인 경우
  hash: string;
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  branch: string;
  tags: string[];
}

// ============================================================================
// Git 클라이언트
// ============================================================================

export class GitClient {
  private config: GitConfig;
  private lastSyncCommit: string | null = null;

  constructor(config: GitConfig) {
    this.config = {
      branch: 'main',
      shallowClone: true,
      depth: 1,
      ...config,
    };
  }

  /**
   * 저장소 클론
   */
  async clone(): Promise<void> {
    const args = ['clone'];

    if (this.config.shallowClone) {
      args.push('--depth', String(this.config.depth || 1));
    }

    if (this.config.branch) {
      args.push('--branch', this.config.branch);
    }

    args.push(this.config.repoUrl, this.config.localPath);

    await this.execGit(args);
  }

  /**
   * 저장소 업데이트 (pull)
   */
  async pull(): Promise<string> {
    await this.execGit(['fetch', '--all'], this.config.localPath);

    const targetRef = this.getTargetRef();
    await this.execGit(['checkout', targetRef], this.config.localPath);
    await this.execGit(['pull', 'origin', targetRef], this.config.localPath);

    return this.getCurrentCommit();
  }

  /**
   * 증분 변경 파일 목록 가져오기
   */
  async getChangedFiles(sinceCommit?: string): Promise<FileChange[]> {
    const baseCommit = sinceCommit || this.lastSyncCommit || 'HEAD~1';
    
    try {
      const output = await this.execGit(
        ['diff', '--name-status', baseCommit, 'HEAD'],
        this.config.localPath
      );

      const changes: FileChange[] = [];
      const lines = output.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const parts = line.split('\t');
        const status = parts[0];
        const filePath = parts[1];

        let changeStatus: FileChange['status'] = 'modified';
        let oldPath: string | undefined;

        if (status.startsWith('A')) changeStatus = 'added';
        else if (status.startsWith('D')) changeStatus = 'deleted';
        else if (status.startsWith('M')) changeStatus = 'modified';
        else if (status.startsWith('R')) {
          changeStatus = 'renamed';
          oldPath = filePath;
        }

        const hash = await this.getFileHash(filePath);
        changes.push({ path: filePath, status: changeStatus, oldPath, hash });
      }

      return changes;
    } catch {
      // 첫 번째 커밋이거나 비교 대상이 없는 경우
      return [];
    }
  }

  /**
   * 현재 커밋 해시 가져오기
   */
  async getCurrentCommit(): Promise<string> {
    const output = await this.execGit(['rev-parse', 'HEAD'], this.config.localPath);
    return output.trim();
  }

  /**
   * 현재 브랜치 가져오기
   */
  async getCurrentBranch(): Promise<string> {
    const output = await this.execGit(['rev-parse', '--abbrev-ref', 'HEAD'], this.config.localPath);
    return output.trim();
  }

  /**
   * 커밋 정보 가져오기
   */
  async getCommitInfo(commitHash?: string): Promise<CommitInfo> {
    const ref = commitHash || 'HEAD';
    const format = '%H|%h|%an|%ae|%aI|%s';
    
    const output = await this.execGit(
      ['log', '-1', `--format=${format}`, ref],
      this.config.localPath
    );

    const [hash, shortHash, author, email, dateStr, message] = output.trim().split('|');

    const tagsOutput = await this.execGit(
      ['tag', '--points-at', ref],
      this.config.localPath
    ).catch(() => '');

    const tags = tagsOutput.trim().split('\n').filter(Boolean);
    const branch = await this.getCurrentBranch();

    return {
      hash,
      shortHash,
      author,
      email,
      date: new Date(dateStr),
      message,
      branch,
      tags,
    };
  }

  /**
   * 파일 해시 계산 (무결성 검증)
   */
  async getFileHash(filePath: string): Promise<string> {
    try {
      const output = await this.execGit(
        ['hash-object', filePath],
        this.config.localPath
      );
      return output.trim();
    } catch {
      return '';
    }
  }

  /**
   * 파일 내용 가져오기
   */
  async getFileContent(filePath: string): Promise<string | null> {
    try {
      const fullPath = path.join(this.config.localPath, filePath);
      const fs = await import('fs/promises');
      return await fs.readFile(fullPath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * 모든 파일 목록 가져오기
   */
  async getAllFiles(patterns?: string[], excludes?: string[]): Promise<string[]> {
    const args = ['ls-files'];
    
    if (patterns && patterns.length > 0) {
      args.push('--', ...patterns);
    }

    const output = await this.execGit(args, this.config.localPath);
    let files = output.trim().split('\n').filter(Boolean);

    // 제외 패턴 적용
    if (excludes && excludes.length > 0) {
      files = files.filter(file => {
        return !excludes.some(pattern => this.matchPattern(file, pattern));
      });
    }

    return files;
  }

  /**
   * 마지막 동기화 커밋 저장
   */
  setLastSyncCommit(commit: string): void {
    this.lastSyncCommit = commit;
  }

  private getTargetRef(): string {
    if (this.config.commitHash) return this.config.commitHash;
    if (this.config.tag) return `tags/${this.config.tag}`;
    return this.config.branch || 'main';
  }

  private matchPattern(file: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/');
    return new RegExp(regex).test(file);
  }

  private execGit(args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, { cwd });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data; });
      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Git command failed: ${stderr || stdout}`));
        }
      });

      proc.on('error', reject);
    });
  }
}

// ============================================================================
// 소스 수집 엔진
// ============================================================================

export class SourceCollector {
  private gitClient: GitClient;
  private syncHistory: SyncResult[] = [];

  constructor(gitConfig: GitConfig) {
    this.gitClient = new GitClient(gitConfig);
  }

  /**
   * 소스 동기화 실행
   */
  async sync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      trigger: options.trigger,
      timestamp: new Date(),
      commitHash: '',
      branch: '',
      changedFiles: [],
      addedFiles: [],
      deletedFiles: [],
      modifiedFiles: [],
      totalFiles: 0,
      duration: 0,
    };

    try {
      // Git pull
      const commitHash = await this.gitClient.pull();
      result.commitHash = commitHash;
      result.branch = await this.gitClient.getCurrentBranch();

      // 변경 파일 감지
      if (options.incremental) {
        const changes = await this.gitClient.getChangedFiles();
        result.changedFiles = changes.map(c => c.path);
        result.addedFiles = changes.filter(c => c.status === 'added').map(c => c.path);
        result.deletedFiles = changes.filter(c => c.status === 'deleted').map(c => c.path);
        result.modifiedFiles = changes.filter(c => c.status === 'modified').map(c => c.path);
      }

      // 전체 파일 목록
      const allFiles = await this.gitClient.getAllFiles(
        options.filePatterns,
        options.excludePatterns
      );
      result.totalFiles = allFiles.length;

      // 마지막 동기화 커밋 저장
      this.gitClient.setLastSyncCommit(commitHash);

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    result.duration = Date.now() - startTime;
    this.syncHistory.push(result);

    return result;
  }

  /**
   * 파일 정보 수집
   */
  async collectFiles(
    options?: { patterns?: string[]; excludes?: string[]; maxSize?: number }
  ): Promise<FileInfo[]> {
    const filePaths = await this.gitClient.getAllFiles(
      options?.patterns,
      options?.excludes
    );

    const files: FileInfo[] = [];
    const fs = await import('fs/promises');
    const fsSync = await import('fs');

    for (const filePath of filePaths) {
      try {
        const content = await this.gitClient.getFileContent(filePath);
        if (!content) continue;

        // 파일 크기 제한
        if (options?.maxSize && content.length > options.maxSize) continue;

        const ext = path.extname(filePath).slice(1);
        const stats = fsSync.statSync(path.join(process.cwd(), filePath));

        files.push({
          path: filePath,
          name: path.basename(filePath),
          extension: ext,
          size: content.length,
          content,
          lastModified: stats.mtime,
          hash: this.computeHash(content),
        });
      } catch {
        // 파일 읽기 실패 시 스킵
      }
    }

    return files;
  }

  /**
   * 동기화 이력 조회
   */
  getSyncHistory(): SyncResult[] {
    return [...this.syncHistory];
  }

  /**
   * 커밋 정보 조회
   */
  async getCommitInfo(): Promise<CommitInfo> {
    return this.gitClient.getCommitInfo();
  }

  /**
   * 해시 계산
   */
  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}

// ============================================================================
// 웹훅 핸들러
// ============================================================================

export interface WebhookPayload {
  ref?: string;
  repository?: {
    full_name?: string;
    clone_url?: string;
  };
  commits?: Array<{
    id: string;
    message: string;
    added: string[];
    modified: string[];
    removed: string[];
  }>;
}

export class WebhookHandler {
  private collector: SourceCollector;

  constructor(collector: SourceCollector) {
    this.collector = collector;
  }

  /**
   * GitHub 웹훅 처리
   */
  async handleGitHubPush(payload: WebhookPayload): Promise<SyncResult> {
    // 변경된 파일 추출
    const changedFiles = new Set<string>();
    
    for (const commit of payload.commits || []) {
      commit.added?.forEach(f => changedFiles.add(f));
      commit.modified?.forEach(f => changedFiles.add(f));
      commit.removed?.forEach(f => changedFiles.add(f));
    }

    return this.collector.sync({
      trigger: 'webhook',
      incremental: true,
      filePatterns: Array.from(changedFiles),
    });
  }

  /**
   * GitLab 웹훅 처리
   */
  async handleGitLabPush(payload: WebhookPayload): Promise<SyncResult> {
    return this.handleGitHubPush(payload); // 유사한 구조
  }
}

// ============================================================================
// 스케줄 트리거
// ============================================================================

export class ScheduleTrigger {
  private collector: SourceCollector;
  private intervalId: NodeJS.Timeout | null = null;
  private cronExpression?: string;

  constructor(collector: SourceCollector) {
    this.collector = collector;
  }

  /**
   * 주기적 동기화 시작
   */
  startInterval(intervalMs: number): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      await this.collector.sync({
        trigger: 'schedule',
        incremental: true,
      });
    }, intervalMs);
  }

  /**
   * 동기화 중지
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 수동 트리거
   */
  async triggerManual(): Promise<SyncResult> {
    return this.collector.sync({
      trigger: 'manual',
      incremental: false,
    });
  }
}
