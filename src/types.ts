import { z } from 'zod';

// Moltbook API Types
export const MoltbookPostSchema = z.object({
  id: z.string(),
  submolt: z.string(),
  title: z.string(),
  body: z.string(),
  author: z.string(),
  createdAt: z.string(),
  votes: z.number(),
  commentCount: z.number(),
});

export const MoltbookCommentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  body: z.string(),
  author: z.string(),
  createdAt: z.string(),
  votes: z.number(),
});

export const MoltbookFeedSchema = z.object({
  posts: z.array(MoltbookPostSchema),
  nextCursor: z.string().optional(),
});

export type MoltbookPost = z.infer<typeof MoltbookPostSchema>;
export type MoltbookComment = z.infer<typeof MoltbookCommentSchema>;
export type MoltbookFeed = z.infer<typeof MoltbookFeedSchema>;

// Request Types
export interface GetFeedOptions {
  sort?: 'new' | 'top' | 'discussed';
  submolt?: string;
  limit?: number;
  cursor?: string;
}

export interface CreatePostData {
  submolt: string;
  title: string;
  body: string;
}

export interface CreateCommentData {
  postId: string;
  body: string;
}

export interface VoteData {
  targetId: string;
  direction: 'up' | 'down';
}

// Action Types for Dry Run
export type Action =
  | { type: 'post'; data: CreatePostData }
  | { type: 'comment'; data: CreateCommentData }
  | { type: 'vote'; data: VoteData };

// Rate Limiter Types
export interface RateLimitConfig {
  postIntervalMin: number; // minutes
  postIntervalMax: number;
  commentIntervalMin: number;
  commentIntervalMax: number;
  maxPostsPerHour: number;
  maxCommentsPerHour: number;
}

// Skill Document Types
export interface SkillDoc {
  raw: string;
  endpoints: Record<string, string>;
  rateLimit: {
    posts: string;
    comments: string;
  };
  auth: {
    method: string;
    header: string;
  };
}
