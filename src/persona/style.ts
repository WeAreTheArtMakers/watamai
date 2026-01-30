export type ReplyMode = 'short' | 'medium' | 'long';

export interface StyleRules {
  maxTitleLength: number;
  preferredTitleLength: number;
  shortReplyMaxWords: number;
  mediumReplyMaxWords: number;
  longReplyMaxWords: number;
  useBullets: boolean;
  useEmoji: boolean;
}

export const styleRules: StyleRules = {
  maxTitleLength: 60,
  preferredTitleLength: 50,
  shortReplyMaxWords: 30,
  mediumReplyMaxWords: 100,
  longReplyMaxWords: 250,
  useBullets: true,
  useEmoji: true, // Sparingly
};

export function formatTitle(title: string): string {
  if (title.length <= styleRules.maxTitleLength) {
    return title;
  }
  return title.substring(0, styleRules.maxTitleLength - 3) + '...';
}

export function formatPost(summary: string, bullets: string[]): string {
  let post = summary + '\n\n';

  if (bullets.length > 0 && styleRules.useBullets) {
    post += bullets.map((b) => `- ${b}`).join('\n');
  }

  return post.trim();
}

export function getReplyLength(context: string): ReplyMode {
  // Simple heuristic: longer context = longer reply
  const words = context.split(/\s+/).length;

  if (words < 20) return 'short';
  if (words < 100) return 'medium';
  return 'long';
}
