/**
 * 병렬 에이전트 스케줄러
 * 
 * 분석 에이전트들을 병렬로 실행하고 관리합니다.
 * - 작업 큐 관리
 * - 리소스 제한 (동시 실행 수)
 * - 실패 재시도 (exponential backoff)
 * - 상태 추적
 */

// ============================================================================
// 타입 정의
// ============================================================================

export type AgentType = 
  | 'ast'         // AST 분석
  | 'rule'        // 정적 룰 분석
  | 'security'    // 보안 분석
  | 'dependency'  // 의존성 분석
  | 'ai';         // AI 분석

export type TaskStatus = 
  | 'pending'     // 대기 중
  | 'running'     // 실행 중
  | 'completed'   // 완료
  | 'failed'      // 실패
  | 'retrying';   // 재시도 중

export interface AgentTask<TInput = unknown, TOutput = unknown> {
  id: string;
  agentType: AgentType;
  input: TInput;
  status: TaskStatus;
  priority: number;         // 높을수록 우선 실행
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  output?: TOutput;
  error?: string;
}

export interface AgentHandler<TInput = unknown, TOutput = unknown> {
  type: AgentType;
  execute: (input: TInput) => Promise<TOutput>;
  validate?: (input: TInput) => boolean;
}

export interface SchedulerConfig {
  maxConcurrency: number;       // 최대 동시 실행 수
  maxRetries: number;           // 최대 재시도 횟수
  retryBaseDelayMs: number;     // 재시도 기본 대기 시간
  taskTimeoutMs: number;        // 작업 타임아웃
  priorityBoostOnRetry: boolean; // 재시도 시 우선순위 상승
}

export interface SchedulerStats {
  totalTasks: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
}

// ============================================================================
// 에이전트 스케줄러
// ============================================================================

export class AgentScheduler {
  private config: SchedulerConfig;
  private handlers: Map<AgentType, AgentHandler> = new Map();
  private taskQueue: AgentTask[] = [];
  private runningTasks: Map<string, AgentTask> = new Map();
  private completedTasks: AgentTask[] = [];
  private isRunning: boolean = false;
  private taskCounter: number = 0;

  private onTaskComplete?: (task: AgentTask) => void;
  private onTaskError?: (task: AgentTask, error: Error) => void;
  private onQueueEmpty?: () => void;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      maxConcurrency: 4,
      maxRetries: 3,
      retryBaseDelayMs: 1000,
      taskTimeoutMs: 60000,
      priorityBoostOnRetry: true,
      ...config,
    };
  }

  /**
   * 에이전트 핸들러 등록
   */
  registerHandler<TInput, TOutput>(handler: AgentHandler<TInput, TOutput>): void {
    this.handlers.set(handler.type, handler as AgentHandler);
  }

  /**
   * 작업 추가
   */
  addTask<TInput>(
    agentType: AgentType,
    input: TInput,
    options?: { priority?: number; maxRetries?: number }
  ): string {
    const id = `task_${++this.taskCounter}`;
    
    const task: AgentTask<TInput> = {
      id,
      agentType,
      input,
      status: 'pending',
      priority: options?.priority ?? 0,
      retryCount: 0,
      maxRetries: options?.maxRetries ?? this.config.maxRetries,
      createdAt: new Date(),
    };

    this.taskQueue.push(task as AgentTask);
    this.sortQueue();

    // 실행 중이면 바로 처리 시도
    if (this.isRunning) {
      this.processNext();
    }

    return id;
  }

  /**
   * 일괄 작업 추가
   */
  addTasks<TInput>(
    agentType: AgentType,
    inputs: TInput[],
    options?: { priority?: number }
  ): string[] {
    return inputs.map(input => this.addTask(agentType, input, options));
  }

  /**
   * 스케줄러 시작
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processNext();
  }

  /**
   * 스케줄러 중지
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * 모든 작업 완료 대기
   */
  async waitForCompletion(): Promise<AgentTask[]> {
    return new Promise((resolve) => {
      if (this.taskQueue.length === 0 && this.runningTasks.size === 0) {
        resolve(this.completedTasks);
        return;
      }

      const originalOnQueueEmpty = this.onQueueEmpty;
      this.onQueueEmpty = () => {
        originalOnQueueEmpty?.();
        resolve(this.completedTasks);
      };

      this.start();
    });
  }

  /**
   * 다음 작업 처리
   */
  private async processNext(): Promise<void> {
    if (!this.isRunning) return;
    if (this.runningTasks.size >= this.config.maxConcurrency) return;
    if (this.taskQueue.length === 0) {
      if (this.runningTasks.size === 0) {
        this.onQueueEmpty?.();
      }
      return;
    }

    const task = this.taskQueue.shift()!;
    this.runningTasks.set(task.id, task);
    task.status = 'running';
    task.startedAt = new Date();

    // 병렬로 다음 작업도 시작
    this.processNext();

    try {
      const handler = this.handlers.get(task.agentType);
      if (!handler) {
        throw new Error(`Handler not found for agent type: ${task.agentType}`);
      }

      // 유효성 검증
      if (handler.validate && !handler.validate(task.input)) {
        throw new Error('Input validation failed');
      }

      // 타임아웃 처리
      const result = await Promise.race([
        handler.execute(task.input),
        this.timeout(this.config.taskTimeoutMs),
      ]);

      task.output = result;
      task.status = 'completed';
      task.completedAt = new Date();

      this.onTaskComplete?.(task);

    } catch (error) {
      await this.handleError(task, error as Error);
    } finally {
      this.runningTasks.delete(task.id);
      this.completedTasks.push(task);
      this.processNext();
    }
  }

  /**
   * 에러 처리 및 재시도
   */
  private async handleError(task: AgentTask, error: Error): Promise<void> {
    task.error = error.message;

    if (task.retryCount < task.maxRetries) {
      // 재시도
      task.retryCount++;
      task.status = 'retrying';
      
      if (this.config.priorityBoostOnRetry) {
        task.priority++;
      }

      // Exponential backoff
      const delay = this.config.retryBaseDelayMs * Math.pow(2, task.retryCount - 1);
      await this.sleep(delay);

      // 다시 큐에 추가
      task.status = 'pending';
      this.taskQueue.push(task);
      this.sortQueue();

    } else {
      task.status = 'failed';
      task.completedAt = new Date();
      this.onTaskError?.(task, error);
    }
  }

  /**
   * 우선순위 기반 정렬
   */
  private sortQueue(): void {
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 타임아웃 Promise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Task timeout')), ms);
    });
  }

  /**
   * 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 통계 조회
   */
  getStats(): SchedulerStats {
    const executionTimes = this.completedTasks
      .filter(t => t.startedAt && t.completedAt)
      .map(t => t.completedAt!.getTime() - t.startedAt!.getTime());

    const avgTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    return {
      totalTasks: this.taskCounter,
      pendingTasks: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      completedTasks: this.completedTasks.filter(t => t.status === 'completed').length,
      failedTasks: this.completedTasks.filter(t => t.status === 'failed').length,
      averageExecutionTime: avgTime,
    };
  }

  /**
   * 특정 작업 상태 조회
   */
  getTaskStatus(taskId: string): AgentTask | undefined {
    return (
      this.taskQueue.find(t => t.id === taskId) ||
      this.runningTasks.get(taskId) ||
      this.completedTasks.find(t => t.id === taskId)
    );
  }

  /**
   * 이벤트 핸들러 등록
   */
  on(
    event: 'taskComplete' | 'taskError' | 'queueEmpty',
    handler: (...args: any[]) => void
  ): void {
    switch (event) {
      case 'taskComplete':
        this.onTaskComplete = handler;
        break;
      case 'taskError':
        this.onTaskError = handler;
        break;
      case 'queueEmpty':
        this.onQueueEmpty = handler;
        break;
    }
  }

  /**
   * 큐 초기화
   */
  clear(): void {
    this.taskQueue = [];
    this.completedTasks = [];
    this.taskCounter = 0;
  }
}

// ============================================================================
// 사전 정의된 에이전트 핸들러
// ============================================================================

/**
 * 기본 에이전트 핸들러 생성
 */
export function createAgentHandler<TInput, TOutput>(
  type: AgentType,
  executor: (input: TInput) => Promise<TOutput>,
  validator?: (input: TInput) => boolean
): AgentHandler<TInput, TOutput> {
  return {
    type,
    execute: executor,
    validate: validator,
  };
}

/**
 * 병렬 분석 실행 헬퍼
 */
export async function runParallelAnalysis<TInput, TOutput>(
  inputs: TInput[],
  agentType: AgentType,
  executor: (input: TInput) => Promise<TOutput>,
  options?: Partial<SchedulerConfig>
): Promise<TOutput[]> {
  const scheduler = new AgentScheduler(options);
  
  scheduler.registerHandler(createAgentHandler(agentType, executor));
  scheduler.addTasks(agentType, inputs, { priority: 0 });

  const results = await scheduler.waitForCompletion();
  
  return results
    .filter(t => t.status === 'completed' && t.output)
    .map(t => t.output as TOutput);
}
