import { request } from 'undici';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import {
  GetFeedOptions,
  CreatePostData,
  CreateCommentData,
  VoteData,
  MoltbookFeed,
  MoltbookFeedSchema,
} from '../types.js';

export class MoltbookClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl?: string, authToken?: string) {
    this.baseUrl = baseUrl || config.moltbook.baseUrl;
    this.authToken = authToken || config.moltbook.authToken;
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'WATAM-Agent/1.0',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    logger.debug({ method, url }, 'Making request');

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const { statusCode, body: responseBody } = await request(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (statusCode === 401) {
          throw new Error('Unauthorized - check auth token');
        }

        if (statusCode === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          logger.warn({ waitTime }, 'Rate limited, backing off');
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          attempt++;
          continue;
        }

        if (statusCode >= 500) {
          throw new Error(`Server error: HTTP ${statusCode}`);
        }

        if (statusCode >= 400) {
          throw new Error(`Client error: HTTP ${statusCode}`);
        }

        const data = await responseBody.json();
        logger.info({ statusCode }, 'Request successful');
        return data as T;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          logger.error({ error, attempt }, 'Request failed after retries');
          throw error;
        }
        const waitTime = Math.pow(2, attempt) * 1000;
        logger.warn({ error, waitTime }, 'Request failed, retrying');
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw new Error('Request failed after max attempts');
  }

  async getFeed(options: GetFeedOptions = {}): Promise<MoltbookFeed> {
    const params = new URLSearchParams();
    if (options.sort) params.append('sort', options.sort);
    if (options.submolt) params.append('submolt', options.submolt);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.cursor) params.append('cursor', options.cursor);

    const path = `/api/feed?${params.toString()}`;
    const data = await this.makeRequest<unknown>('GET', path);

    // Validate with Zod
    return MoltbookFeedSchema.parse(data);
  }

  async createPost(data: CreatePostData): Promise<{ id: string }> {
    logger.info({ submolt: data.submolt, title: data.title }, 'Creating post');
    return this.makeRequest<{ id: string }>('POST', '/api/posts', data);
  }

  async createComment(data: CreateCommentData): Promise<{ id: string }> {
    logger.info({ postId: data.postId }, 'Creating comment');
    return this.makeRequest<{ id: string }>('POST', '/api/comments', data);
  }

  async vote(data: VoteData): Promise<{ success: boolean }> {
    logger.info({ targetId: data.targetId, direction: data.direction }, 'Voting');
    return this.makeRequest<{ success: boolean }>('POST', '/api/votes', data);
  }
}
