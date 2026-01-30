#!/usr/bin/env node
import { Command } from 'commander';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { confirmAction } from './utils/confirmation.js';
import { RateLimiter } from './utils/rateLimiter.js';
import { MoltbookClient } from './moltbook/client.js';
import { fetchSkillDoc } from './moltbook/skillDoc.js';
import { buildPost, buildComment, helpfulThreads } from './content/templates.js';

const program = new Command();
const rateLimiter = new RateLimiter(config.rateLimit);
const client = new MoltbookClient();

program
  .name('watamai')
  .description('WATAM AI - Moltbook agent CLI')
  .version('1.0.0');

// Fetch skill.md
program
  .command('fetch-skill')
  .description('Fetch and parse Moltbook skill.md')
  .action(async () => {
    try {
      const skillDoc = await fetchSkillDoc();
      console.log('\n=== Moltbook Skill Document ===\n');
      console.log('Endpoints:', Object.keys(skillDoc.endpoints).length);
      console.log('Rate Limits:', skillDoc.rateLimit);
      console.log('Auth:', skillDoc.auth);
      console.log('\nRaw content length:', skillDoc.raw.length, 'characters');
    } catch (error) {
      logger.error({ error }, 'Failed to fetch skill.md');
      process.exit(1);
    }
  });

// Fetch feed
program
  .command('fetch-feed')
  .description('Fetch posts from Moltbook')
  .option('-s, --sort <type>', 'Sort by: new, top, discussed', 'new')
  .option('-m, --submolt <name>', 'Filter by submolt')
  .option('-l, --limit <number>', 'Number of posts', '10')
  .action(async (options) => {
    try {
      logger.info({ options }, 'Fetching feed');
      const feed = await client.getFeed({
        sort: options.sort,
        submolt: options.submolt,
        limit: parseInt(options.limit, 10),
      });

      console.log(`\n=== Feed (${feed.posts.length} posts) ===\n`);
      feed.posts.forEach((post, i) => {
        console.log(`${i + 1}. [${post.submolt}] ${post.title}`);
        console.log(`   By: ${post.author} | Votes: ${post.votes} | Comments: ${post.commentCount}`);
        console.log(`   ${post.body.substring(0, 100)}...\n`);
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch feed');
      process.exit(1);
    }
  });

// Draft post
program
  .command('draft-post')
  .description('Draft a post (dry run)')
  .requiredOption('-m, --submolt <name>', 'Submolt to post in')
  .requiredOption('-t, --topic <text>', 'Post topic/title')
  .option('--include-watam', 'Include WATAM CTA')
  .option('--watam-context <type>', 'WATAM context: art, music, ai, community')
  .action(async (options) => {
    try {
      // Check rate limit
      const canPost = rateLimiter.canPost();
      if (!canPost.allowed) {
        console.log(`\n⚠️  Rate limit: ${canPost.reason}`);
        if (canPost.waitMs) {
          console.log(`   Wait ${Math.ceil(canPost.waitMs / 1000 / 60)} minutes`);
        }
        return;
      }

      // Use a template or generate
      const template = helpfulThreads.find((t) => t.submolt === options.submolt);
      const post = template
        ? buildPost(template.submolt, template.title, template.body, options.includeWatam, options.watamContext)
        : buildPost(
            options.submolt,
            options.topic,
            'This is a draft post. Edit the body as needed.',
            options.includeWatam,
            options.watamContext
          );

      console.log('\n=== Draft Post ===\n');
      console.log(`Submolt: ${post.submolt}`);
      console.log(`Title: ${post.title}`);
      console.log(`\n${post.body}\n`);
      console.log('===================\n');
      console.log('To publish, run: watamai publish-post (with same options)');
    } catch (error) {
      logger.error({ error }, 'Failed to draft post');
      process.exit(1);
    }
  });

// Publish post
program
  .command('publish-post')
  .description('Publish a post (requires confirmation)')
  .requiredOption('-m, --submolt <name>', 'Submolt to post in')
  .requiredOption('-t, --title <text>', 'Post title')
  .requiredOption('-b, --body <text>', 'Post body')
  .option('--include-watam', 'Include WATAM CTA')
  .option('--watam-context <type>', 'WATAM context: art, music, ai, community')
  .action(async (options) => {
    try {
      // Safety check
      if (config.safety.dryRunMode) {
        console.log('\n⚠️  DRY_RUN_MODE is enabled. Set DRY_RUN_MODE=false in .env to publish.\n');
        return;
      }

      // Check rate limit
      const canPost = rateLimiter.canPost();
      if (!canPost.allowed) {
        console.log(`\n⚠️  Rate limit: ${canPost.reason}`);
        if (canPost.waitMs) {
          console.log(`   Wait ${Math.ceil(canPost.waitMs / 1000 / 60)} minutes`);
        }
        return;
      }

      const post = buildPost(
        options.submolt,
        options.title,
        options.body,
        options.includeWatam,
        options.watamContext
      );

      console.log('\n=== Post to Publish ===\n');
      console.log(`Submolt: ${post.submolt}`);
      console.log(`Title: ${post.title}`);
      console.log(`\n${post.body}\n`);
      console.log('=======================\n');

      // Require confirmation
      if (config.safety.requireConfirmation) {
        const confirmed = await confirmAction('Publish this post to Moltbook?');
        if (!confirmed) {
          console.log('❌ Cancelled');
          return;
        }
      }

      const result = await client.createPost(post);
      rateLimiter.recordPost();

      console.log(`\n✅ Post published! ID: ${result.id}\n`);
    } catch (error) {
      logger.error({ error }, 'Failed to publish post');
      process.exit(1);
    }
  });

// Draft comment
program
  .command('draft-comment')
  .description('Draft a comment (dry run)')
  .requiredOption('-p, --post-id <id>', 'Post ID to comment on')
  .requiredOption('-b, --body <text>', 'Comment body')
  .option('-s, --stance <type>', 'Stance: helpful, curious, supportive', 'helpful')
  .action(async (options) => {
    try {
      const canComment = rateLimiter.canComment();
      if (!canComment.allowed) {
        console.log(`\n⚠️  Rate limit: ${canComment.reason}`);
        if (canComment.waitMs) {
          console.log(`   Wait ${Math.ceil(canComment.waitMs / 1000)} seconds`);
        }
        return;
      }

      const comment = buildComment(options.postId, options.body, options.stance);

      console.log('\n=== Draft Comment ===\n');
      console.log(`Post ID: ${comment.postId}`);
      console.log(`\n${comment.body}\n`);
      console.log('=====================\n');
      console.log('To publish, run: watamai publish-comment (with same options)');
    } catch (error) {
      logger.error({ error }, 'Failed to draft comment');
      process.exit(1);
    }
  });

// Publish comment
program
  .command('publish-comment')
  .description('Publish a comment (requires confirmation)')
  .requiredOption('-p, --post-id <id>', 'Post ID to comment on')
  .requiredOption('-b, --body <text>', 'Comment body')
  .action(async (options) => {
    try {
      if (config.safety.dryRunMode) {
        console.log('\n⚠️  DRY_RUN_MODE is enabled. Set DRY_RUN_MODE=false in .env to publish.\n');
        return;
      }

      const canComment = rateLimiter.canComment();
      if (!canComment.allowed) {
        console.log(`\n⚠️  Rate limit: ${canComment.reason}`);
        if (canComment.waitMs) {
          console.log(`   Wait ${Math.ceil(canComment.waitMs / 1000)} seconds`);
        }
        return;
      }

      const comment = buildComment(options.postId, options.body);

      console.log('\n=== Comment to Publish ===\n');
      console.log(`Post ID: ${comment.postId}`);
      console.log(`\n${comment.body}\n`);
      console.log('==========================\n');

      if (config.safety.requireConfirmation) {
        const confirmed = await confirmAction('Publish this comment to Moltbook?');
        if (!confirmed) {
          console.log('❌ Cancelled');
          return;
        }
      }

      const result = await client.createComment(comment);
      rateLimiter.recordComment();

      console.log(`\n✅ Comment published! ID: ${result.id}\n`);
    } catch (error) {
      logger.error({ error }, 'Failed to publish comment');
      process.exit(1);
    }
  });

// Rate limit stats
program
  .command('stats')
  .description('Show rate limiter stats')
  .action(() => {
    const stats = rateLimiter.getStats();
    console.log('\n=== Rate Limiter Stats ===\n');
    console.log(`Posts in last hour: ${stats.postsLastHour}/${config.rateLimit.maxPostsPerHour}`);
    console.log(`Comments in last hour: ${stats.commentsLastHour}/${config.rateLimit.maxCommentsPerHour}`);
    console.log('\n==========================\n');
  });

// Security commands
program
  .command('security-status')
  .description('Show sandbox security status')
  .action(async () => {
    const { sandbox } = await import('./security/sandbox.js');
    const status = sandbox.getStatus();
    
    console.log('\n=== Security Status ===\n');
    console.log(`Sandbox: ${status.enabled ? '🔒 Enabled' : '⚠️  Disabled'}`);
    console.log(`Strict Mode: ${status.strictMode ? '✅ Yes' : '❌ No'}`);
    console.log(`Violations: ${status.violations}`);
    console.log(`Workspace: ${status.workspaceRoot}`);
    console.log('\n======================\n');
    
    if (!status.enabled) {
      console.log('⚠️  Warning: Sandbox is disabled. Enable for production!');
    }
  });

program
  .command('security-violations')
  .description('Show security violations')
  .action(async () => {
    const { sandbox } = await import('./security/sandbox.js');
    const violations = sandbox.getViolations();
    
    console.log('\n=== Security Violations ===\n');
    
    if (violations.length === 0) {
      console.log('✅ No violations detected');
    } else {
      violations.forEach((v, i) => {
        console.log(`${i + 1}. [${v.type}] ${v.path}`);
        console.log(`   Time: ${v.timestamp.toISOString()}\n`);
      });
    }
    
    console.log('===========================\n');
  });

program
  .command('security-test')
  .description('Test sandbox security')
  .action(async () => {
    const { sandbox } = await import('./security/sandbox.js');
    
    console.log('\n=== Testing Sandbox Security ===\n');
    
    // Test read permissions
    console.log('Testing read permissions...');
    console.log(`  src/config.ts: ${sandbox.canRead('src/config.ts') ? '✅' : '❌'}`);
    console.log(`  ~/.ssh/id_rsa: ${sandbox.canRead('~/.ssh/id_rsa') ? '❌ FAIL' : '✅'}`);
    
    // Test write permissions
    console.log('\nTesting write permissions...');
    console.log(`  logs/test.log: ${sandbox.canWrite('logs/test.log') ? '✅' : '❌'}`);
    console.log(`  ~/Documents/test.txt: ${sandbox.canWrite('~/Documents/test.txt') ? '❌ FAIL' : '✅'}`);
    
    // Test command permissions
    console.log('\nTesting command permissions...');
    console.log(`  npm run cli: ${sandbox.canExecute('npm run cli fetch-feed') ? '✅' : '❌'}`);
    console.log(`  rm -rf /: ${sandbox.canExecute('rm -rf /') ? '❌ FAIL' : '✅'}`);
    
    // Test network permissions
    console.log('\nTesting network permissions...');
    console.log(`  moltbook.com: ${sandbox.canAccessNetwork('https://moltbook.com') ? '✅' : '❌'}`);
    console.log(`  malicious.com: ${sandbox.canAccessNetwork('https://malicious.com') ? '❌ FAIL' : '✅'}`);
    
    console.log('\n================================\n');
    console.log('✅ Security tests completed');
  });

program.parse();
