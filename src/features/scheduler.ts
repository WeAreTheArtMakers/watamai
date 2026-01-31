import { logger } from '../utils/logger.js';
import { MoltbookClient } from '../moltbook/client.js';
import { CreatePostData, CreateCommentData } from '../types.js';

export interface ScheduledTask {
  id: string;
  type: 'post' | 'comment';
  data: CreatePostData | CreateCommentData;
  scheduledFor: Date;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  executedAt?: Date;
  error?: string;
}

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private client: MoltbookClient;

  constructor(client: MoltbookClient) {
    this.client = client;
  }

  schedulePost(data: CreatePostData, scheduledFor: Date): string {
    const id = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: ScheduledTask = {
      id,
      type: 'post',
      data,
      scheduledFor,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(id, task);
    this.setupTimer(task);

    logger.info({ id, scheduledFor }, 'Post scheduled');
    return id;
  }

  scheduleComment(data: CreateCommentData, scheduledFor: Date): string {
    const id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: ScheduledTask = {
      id,
      type: 'comment',
      data,
      scheduledFor,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(id, task);
    this.setupTimer(task);

    logger.info({ id, scheduledFor }, 'Comment scheduled');
    return id;
  }

  private setupTimer(task: ScheduledTask): void {
    const delay = task.scheduledFor.getTime() - Date.now();

    if (delay <= 0) {
      this.executeTask(task);
      return;
    }

    const timer = setTimeout(() => {
      this.executeTask(task);
    }, delay);

    this.timers.set(task.id, timer);
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    try {
      logger.info({ taskId: task.id, type: task.type }, 'Executing scheduled task');

      if (task.type === 'post') {
        await this.client.createPost(task.data as CreatePostData);
      } else {
        await this.client.createComment(task.data as CreateCommentData);
      }

      task.status = 'completed';
      task.executedAt = new Date();
      logger.info({ taskId: task.id }, 'Task completed successfully');
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.executedAt = new Date();
      logger.error({ taskId: task.id, error }, 'Task execution failed');
    } finally {
      this.timers.delete(task.id);
    }
  }

  cancelTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'pending') {
      return false;
    }

    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    task.status = 'cancelled';
    logger.info({ taskId: id }, 'Task cancelled');
    return true;
  }

  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getPendingTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
  }

  cleanup(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    logger.info('Scheduler cleanup completed');
  }
}
