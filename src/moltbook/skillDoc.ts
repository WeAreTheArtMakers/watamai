import { request } from 'undici';
import { SkillDoc } from '../types.js';
import { logger } from '../utils/logger.js';

const SKILL_DOC_URL = 'https://moltbook.com/skill.md';

export async function fetchSkillDoc(): Promise<SkillDoc> {
  try {
    logger.info({ url: SKILL_DOC_URL }, 'Fetching Moltbook skill.md');

    const { statusCode, body } = await request(SKILL_DOC_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'WATAM-Agent/1.0',
      },
    });

    if (statusCode !== 200) {
      throw new Error(`Failed to fetch skill.md: HTTP ${statusCode}`);
    }

    const raw = await body.text();
    logger.info({ length: raw.length }, 'Skill.md fetched successfully');

    // Best-effort parsing
    const endpoints = parseEndpoints(raw);
    const rateLimit = parseRateLimit(raw);
    const auth = parseAuth(raw);

    return { raw, endpoints, rateLimit, auth };
  } catch (error) {
    logger.error({ error }, 'Failed to fetch skill.md');
    // Return stub for offline development
    return getStubSkillDoc();
  }
}

function parseEndpoints(raw: string): Record<string, string> {
  const endpoints: Record<string, string> = {};

  // Look for endpoint patterns like: POST /api/posts
  const endpointRegex = /(GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s]+)/g;
  let match;

  while ((match = endpointRegex.exec(raw)) !== null) {
    const [, method, path] = match;
    const key = `${method.toLowerCase()}_${path.replace(/\//g, '_')}`;
    endpoints[key] = `${method} ${path}`;
  }

  logger.info({ count: Object.keys(endpoints).length }, 'Parsed endpoints');
  return endpoints;
}

function parseRateLimit(raw: string): { posts: string; comments: string } {
  // Look for rate limit mentions
  const postMatch = raw.match(/posts?[:\s]+(\d+[^.\n]+)/i);
  const commentMatch = raw.match(/comments?[:\s]+(\d+[^.\n]+)/i);

  return {
    posts: postMatch?.[1] || '1 per 10-20 minutes',
    comments: commentMatch?.[1] || '1 per 1-2 minutes',
  };
}

function parseAuth(raw: string): { method: string; header: string } {
  // Look for auth method
  const authMatch = raw.match(/auth[a-z]*[:\s]+([^\n]+)/i);
  const headerMatch = raw.match(/header[:\s]+([^\n]+)/i);

  return {
    method: authMatch?.[1]?.trim() || 'Bearer token',
    header: headerMatch?.[1]?.trim() || 'Authorization',
  };
}

function getStubSkillDoc(): SkillDoc {
  logger.warn('Using stub skill.md (offline mode)');

  return {
    raw: '# Moltbook Skill (Stub)\n\nTODO: Fetch real skill.md when online',
    endpoints: {
      get_api_feed: 'GET /api/feed',
      post_api_posts: 'POST /api/posts',
      post_api_comments: 'POST /api/comments',
      post_api_votes: 'POST /api/votes',
    },
    rateLimit: {
      posts: '1 per 10-20 minutes',
      comments: '1 per 1-2 minutes',
    },
    auth: {
      method: 'Bearer token',
      header: 'Authorization',
    },
  };
}
