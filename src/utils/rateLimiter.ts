import { RateLimitConfig } from '../types.js';
import { logger } from './logger.js';

interface ActionRecord {
  timestamp: number;
  type: 'post' | 'comment';
}

export class RateLimiter {
  private actions: ActionRecord[] = [];
  private lastPostTime: number = 0;
  private lastCommentTime: number = 0;

  constructor(private config: RateLimitConfig) {}

  private getRandomInterval(min: number, max: number): number {
    return (min + Math.random() * (max - min)) * 60 * 1000; // Convert to ms
  }

  private cleanOldActions(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.actions = this.actions.filter((a) => a.timestamp > oneHourAgo);
  }

  canPost(): { allowed: boolean; waitMs?: number; reason?: string } {
    this.cleanOldActions();

    const now = Date.now();
    const postsInLastHour = this.actions.filter((a) => a.type === 'post').length;

    // Check hourly limit
    if (postsInLastHour >= this.config.maxPostsPerHour) {
      return {
        allowed: false,
        reason: `Max posts per hour (${this.config.maxPostsPerHour}) reached`,
      };
    }

    // Check interval since last post
    const minInterval = this.getRandomInterval(
      this.config.postIntervalMin,
      this.config.postIntervalMax
    );
    const timeSinceLastPost = now - this.lastPostTime;

    if (this.lastPostTime > 0 && timeSinceLastPost < minInterval) {
      return {
        allowed: false,
        waitMs: minInterval - timeSinceLastPost,
        reason: 'Too soon since last post',
      };
    }

    return { allowed: true };
  }

  canComment(): { allowed: boolean; waitMs?: number; reason?: string } {
    this.cleanOldActions();

    const now = Date.now();
    const commentsInLastHour = this.actions.filter((a) => a.type === 'comment').length;

    // Check hourly limit
    if (commentsInLastHour >= this.config.maxCommentsPerHour) {
      return {
        allowed: false,
        reason: `Max comments per hour (${this.config.maxCommentsPerHour}) reached`,
      };
    }

    // Check interval since last comment
    const minInterval = this.getRandomInterval(
      this.config.commentIntervalMin,
      this.config.commentIntervalMax
    );
    const timeSinceLastComment = now - this.lastCommentTime;

    if (this.lastCommentTime > 0 && timeSinceLastComment < minInterval) {
      return {
        allowed: false,
        waitMs: minInterval - timeSinceLastComment,
        reason: 'Too soon since last comment',
      };
    }

    return { allowed: true };
  }

  recordPost(): void {
    const now = Date.now();
    this.actions.push({ timestamp: now, type: 'post' });
    this.lastPostTime = now;
    logger.info('Post recorded in rate limiter');
  }

  recordComment(): void {
    const now = Date.now();
    this.actions.push({ timestamp: now, type: 'comment' });
    this.lastCommentTime = now;
    logger.info('Comment recorded in rate limiter');
  }

  getStats(): { postsLastHour: number; commentsLastHour: number } {
    this.cleanOldActions();
    return {
      postsLastHour: this.actions.filter((a) => a.type === 'post').length,
      commentsLastHour: this.actions.filter((a) => a.type === 'comment').length,
    };
  }
}
