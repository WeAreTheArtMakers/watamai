import { describe, it, expect } from 'vitest';
import { detectEmotion, getMirrorResponse, shouldDeEscalate } from '../src/persona/empathy';

describe('Empathy Module', () => {
  describe('detectEmotion', () => {
    it('should detect frustration', () => {
      const result = detectEmotion('This is so frustrating!');
      expect(result.emotion).toBe('frustrated');
    });

    it('should detect excitement', () => {
      const result = detectEmotion('This is amazing!');
      expect(result.emotion).toBe('excited');
    });

    it('should detect confusion', () => {
      const result = detectEmotion("I don't understand how this works");
      expect(result.emotion).toBe('confused');
    });

    it('should default to neutral', () => {
      const result = detectEmotion('The weather is nice today');
      expect(result.emotion).toBe('neutral');
    });
  });

  describe('getMirrorResponse', () => {
    it('should return appropriate response for frustration', () => {
      const response = getMirrorResponse('frustrated');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should return appropriate response for excitement', () => {
      const response = getMirrorResponse('excited');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('shouldDeEscalate', () => {
    it('should detect toxic language', () => {
      expect(shouldDeEscalate("you're stupid")).toBe(true);
      expect(shouldDeEscalate('shut up')).toBe(true);
    });

    it('should not flag normal language', () => {
      expect(shouldDeEscalate('I disagree with this')).toBe(false);
      expect(shouldDeEscalate('This is not working')).toBe(false);
    });
  });
});
