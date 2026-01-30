import { config as loadEnv } from 'dotenv';
import { RateLimitConfig } from './types.js';

loadEnv();

export const config = {
  moltbook: {
    baseUrl: process.env.MOLTBOOK_BASE_URL || 'https://www.moltbook.com',
    authToken: process.env.MOLTBOOK_AUTH_TOKEN || '',
    agentName: process.env.MOLTBOOK_AGENT_NAME || 'watam-agent',
  },
  rateLimit: {
    postIntervalMin: parseInt(process.env.POST_INTERVAL_MIN || '10', 10),
    postIntervalMax: parseInt(process.env.POST_INTERVAL_MAX || '20', 10),
    commentIntervalMin: parseInt(process.env.COMMENT_INTERVAL_MIN || '1', 10),
    commentIntervalMax: parseInt(process.env.COMMENT_INTERVAL_MAX || '2', 10),
    maxPostsPerHour: parseInt(process.env.MAX_POSTS_PER_HOUR || '3', 10),
    maxCommentsPerHour: parseInt(process.env.MAX_COMMENTS_PER_HOUR || '20', 10),
  } as RateLimitConfig,
  safety: {
    dryRunMode: process.env.DRY_RUN_MODE !== 'false',
    requireConfirmation: process.env.REQUIRE_CONFIRMATION !== 'false',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  brand: {
    watamUrl: process.env.WATAM_URL || 'https://wearetheartmakers.com',
    modxUrl: process.env.MODX_URL || 'https://modfxmarket.com/index.html',
  },
};
