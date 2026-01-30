import { describe, it, expect } from 'vitest';
import { buildPost, buildComment, getModXEducational } from '../src/content/templates';

describe('Content Templates', () => {
  describe('buildPost', () => {
    it('should create basic post', () => {
      const post = buildPost('art', 'Test Title', 'Test body');
      expect(post.submolt).toBe('art');
      expect(post.title).toBe('Test Title');
      expect(post.body).toBe('Test body');
    });

    it('should truncate long titles', () => {
      const longTitle = 'A'.repeat(100);
      const post = buildPost('art', longTitle, 'Body');
      expect(post.title.length).toBeLessThanOrEqual(60);
    });

    it('should include WATAM CTA when requested', () => {
      const post = buildPost('art', 'Title', 'Body', true, 'art');
      expect(post.body).toContain('WATAM');
      expect(post.body).toContain('wearetheartmakers.com');
    });
  });

  describe('buildComment', () => {
    it('should create comment', () => {
      const comment = buildComment('post123', 'Great point!');
      expect(comment.postId).toBe('post123');
      expect(comment.body).toBe('Great point!');
    });
  });

  describe('getModXEducational', () => {
    it('should include disclaimer', () => {
      const content = getModXEducational('utility');
      expect(content).toContain('This is not financial advice');
    });

    it('should provide utility info', () => {
      const content = getModXEducational('utility');
      expect(content).toContain('digital ownership');
      expect(content).toContain('APIs/SDKs');
    });

    it('should provide scam safety info', () => {
      const content = getModXEducational('scam-safety');
      expect(content).toContain('private keys');
      expect(content).toContain('official links');
    });
  });
});
