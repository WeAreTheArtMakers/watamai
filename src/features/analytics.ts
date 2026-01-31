import { logger } from '../utils/logger.js';

export interface AnalyticsMetrics {
  totalPosts: number;
  totalComments: number;
  totalVotes: number;
  successRate: number;
  averageResponseTime: number;
  rateLimitHits: number;
  errorCount: number;
  lastActivity: Date | null;
  topSubmolts: Array<{ name: string; count: number }>;
  hourlyActivity: Record<number, number>;
  dailyActivity: Record<string, number>;
}

export interface ActivityLog {
  timestamp: Date;
  type: 'post' | 'comment' | 'vote' | 'error' | 'rate_limit';
  submolt?: string;
  success: boolean;
  responseTime?: number;
  error?: string;
}

export class Analytics {
  private logs: ActivityLog[] = [];
  private maxLogs = 10000;

  logActivity(log: Omit<ActivityLog, 'timestamp'>): void {
    this.logs.push({
      ...log,
      timestamp: new Date(),
    });

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    logger.debug({ type: log.type, success: log.success }, 'Activity logged');
  }

  getMetrics(): AnalyticsMetrics {
    const posts = this.logs.filter((l) => l.type === 'post');
    const comments = this.logs.filter((l) => l.type === 'comment');
    const votes = this.logs.filter((l) => l.type === 'vote');
    const errors = this.logs.filter((l) => l.type === 'error');
    const rateLimits = this.logs.filter((l) => l.type === 'rate_limit');

    const successfulActions = this.logs.filter(
      (l) => l.success && ['post', 'comment', 'vote'].includes(l.type)
    );
    const totalActions = this.logs.filter((l) =>
      ['post', 'comment', 'vote'].includes(l.type)
    );

    const responseTimes = this.logs
      .filter((l) => l.responseTime !== undefined)
      .map((l) => l.responseTime!);

    const submoltCounts = new Map<string, number>();
    this.logs.forEach((log) => {
      if (log.submolt) {
        submoltCounts.set(log.submolt, (submoltCounts.get(log.submolt) || 0) + 1);
      }
    });

    const topSubmolts = Array.from(submoltCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const hourlyActivity: Record<number, number> = {};
    const dailyActivity: Record<string, number> = {};

    this.logs.forEach((log) => {
      const hour = log.timestamp.getHours();
      const day = log.timestamp.toISOString().split('T')[0];

      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    });

    return {
      totalPosts: posts.length,
      totalComments: comments.length,
      totalVotes: votes.length,
      successRate:
        totalActions.length > 0
          ? (successfulActions.length / totalActions.length) * 100
          : 0,
      averageResponseTime:
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,
      rateLimitHits: rateLimits.length,
      errorCount: errors.length,
      lastActivity: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
      topSubmolts,
      hourlyActivity,
      dailyActivity,
    };
  }

  getRecentLogs(limit = 100): ActivityLog[] {
    return this.logs.slice(-limit).reverse();
  }

  clearLogs(): void {
    this.logs = [];
    logger.info('Analytics logs cleared');
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  importLogs(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        this.logs = parsed.map((log) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
        logger.info({ count: this.logs.length }, 'Logs imported');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to import logs');
      throw new Error('Invalid log data format');
    }
  }
}
