import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../src/utils/rateLimiter';
import { RateLimitConfig } from '../src/types';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  const config: RateLimitConfig = {
    postIntervalMin: 10,
    postIntervalMax: 20,
    commentIntervalMin: 1,
    commentIntervalMax: 2,
    maxPostsPerHour: 3,
    maxCommentsPerHour: 20,
  };

  beforeEach(() => {
    rateLimiter = new RateLimiter(config);
  });

  it('should allow first post', () => {
    const result = rateLimiter.canPost();
    expect(result.allowed).toBe(true);
  });

  it('should allow first comment', () => {
    const result = rateLimiter.canComment();
    expect(result.allowed).toBe(true);
  });

  it('should track posts correctly', () => {
    rateLimiter.recordPost();
    const stats = rateLimiter.getStats();
    expect(stats.postsLastHour).toBe(1);
  });

  it('should track comments correctly', () => {
    rateLimiter.recordComment();
    const stats = rateLimiter.getStats();
    expect(stats.commentsLastHour).toBe(1);
  });

  it('should enforce max posts per hour', () => {
    // Record max posts
    for (let i = 0; i < config.maxPostsPerHour; i++) {
      rateLimiter.recordPost();
    }

    const result = rateLimiter.canPost();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Max posts per hour');
  });

  it('should enforce max comments per hour', () => {
    // Record max comments
    for (let i = 0; i < config.maxCommentsPerHour; i++) {
      rateLimiter.recordComment();
    }

    const result = rateLimiter.canComment();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Max comments per hour');
  });
});
