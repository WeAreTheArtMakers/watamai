#!/usr/bin/env node
import { Command } from 'commander';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { confirmAction } from './utils/confirmation.js';
import { RateLimiter } from './utils/rateLimiter.js';
import { MoltbookClient } from './moltbook/client.js';
import { fetchSkillDoc } from './moltbook/skillDoc.js';
import { buildPost, buildComment, helpfulThreads } from './content/templates.js';
import { Scheduler } from './features/scheduler.js';
import { Analytics } from './features/analytics.js';
import { TemplateEngine } from './features/templates.js';
import { MultiAccountManager } from './features/multiAccount.js';

const program = new Command();
const rateLimiter = new RateLimiter(config.rateLimit);
const client = new MoltbookClient();
const scheduler = new Scheduler(client);
const analytics = new Analytics();
const templateEngine = new TemplateEngine();
const accountManager = new MultiAccountManager();

program
  .name('watamai')
  .description('WATAM AI - Moltbook agent CLI')
  .version('1.2.0');

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

// Schedule commands
program
  .command('schedule-post')
  .description('Schedule a post for later')
  .requiredOption('-m, --submolt <name>', 'Submolt to post in')
  .requiredOption('-t, --title <text>', 'Post title')
  .requiredOption('-b, --body <text>', 'Post body')
  .requiredOption('-w, --when <datetime>', 'When to publish (ISO 8601 format)')
  .action(async (options) => {
    try {
      const scheduledFor = new Date(options.when);
      if (isNaN(scheduledFor.getTime())) {
        console.log('❌ Invalid date format. Use ISO 8601 (e.g., 2026-02-01T14:30:00)');
        return;
      }

      const post = buildPost(options.submolt, options.title, options.body);
      const taskId = scheduler.schedulePost(post, scheduledFor);

      console.log(`\n✅ Post scheduled!`);
      console.log(`Task ID: ${taskId}`);
      console.log(`Will publish at: ${scheduledFor.toLocaleString()}\n`);
    } catch (error) {
      logger.error({ error }, 'Failed to schedule post');
      process.exit(1);
    }
  });

program
  .command('scheduled-tasks')
  .description('List all scheduled tasks')
  .action(() => {
    const tasks = scheduler.getAllTasks();
    console.log(`\n=== Scheduled Tasks (${tasks.length}) ===\n`);

    if (tasks.length === 0) {
      console.log('No scheduled tasks');
    } else {
      tasks.forEach((task) => {
        console.log(`${task.id}`);
        console.log(`  Type: ${task.type}`);
        console.log(`  Status: ${task.status}`);
        console.log(`  Scheduled: ${task.scheduledFor.toLocaleString()}`);
        if (task.executedAt) {
          console.log(`  Executed: ${task.executedAt.toLocaleString()}`);
        }
        console.log();
      });
    }
  });

program
  .command('cancel-task')
  .description('Cancel a scheduled task')
  .requiredOption('-i, --id <taskId>', 'Task ID to cancel')
  .action((options) => {
    const cancelled = scheduler.cancelTask(options.id);
    if (cancelled) {
      console.log(`✅ Task ${options.id} cancelled`);
    } else {
      console.log(`❌ Task not found or already completed`);
    }
  });

// Analytics commands
program
  .command('analytics')
  .description('Show analytics and metrics')
  .action(() => {
    const metrics = analytics.getMetrics();
    console.log('\n=== Analytics ===\n');
    console.log(`Total Posts: ${metrics.totalPosts}`);
    console.log(`Total Comments: ${metrics.totalComments}`);
    console.log(`Total Votes: ${metrics.totalVotes}`);
    console.log(`Success Rate: ${metrics.successRate.toFixed(1)}%`);
    console.log(`Avg Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`Rate Limit Hits: ${metrics.rateLimitHits}`);
    console.log(`Errors: ${metrics.errorCount}`);
    if (metrics.lastActivity) {
      console.log(`Last Activity: ${metrics.lastActivity.toLocaleString()}`);
    }

    if (metrics.topSubmolts.length > 0) {
      console.log('\nTop Submolts:');
      metrics.topSubmolts.slice(0, 5).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name}: ${s.count} activities`);
      });
    }

    console.log('\n=================\n');
  });

program
  .command('export-analytics')
  .description('Export analytics logs to JSON')
  .action(() => {
    const data = analytics.exportLogs();
    console.log(data);
  });

// Template commands
program
  .command('list-templates')
  .description('List all content templates')
  .option('-c, --category <type>', 'Filter by category')
  .option('-l, --language <lang>', 'Filter by language (en/tr)')
  .action((options) => {
    let templates = templateEngine.getAllTemplates();

    if (options.category) {
      templates = templateEngine.getTemplatesByCategory(options.category);
    }
    if (options.language) {
      templates = templateEngine.getTemplatesByLanguage(options.language);
    }

    console.log(`\n=== Templates (${templates.length}) ===\n`);
    templates.forEach((t) => {
      console.log(`${t.id} [${t.language}]`);
      console.log(`  Name: ${t.name}`);
      console.log(`  Category: ${t.category}`);
      if (t.variables) {
        console.log(`  Variables: ${t.variables.join(', ')}`);
      }
      console.log();
    });
  });

program
  .command('use-template')
  .description('Generate content from template')
  .requiredOption('-i, --id <templateId>', 'Template ID')
  .option('-v, --vars <json>', 'Variables as JSON object')
  .action((options) => {
    try {
      const variables = options.vars ? JSON.parse(options.vars) : {};
      const result = templateEngine.renderTemplate(options.id, variables);

      if (!result) {
        console.log('❌ Template not found');
        return;
      }

      console.log('\n=== Generated Content ===\n');
      if (result.title) {
        console.log(`Title: ${result.title}\n`);
      }
      console.log(result.body);
      console.log('\n=========================\n');
    } catch (error) {
      console.log('❌ Invalid variables JSON');
    }
  });

// Multi-account commands
program
  .command('add-account')
  .description('Add a new Moltbook account')
  .requiredOption('-n, --name <name>', 'Account name')
  .requiredOption('-u, --url <url>', 'Moltbook base URL')
  .requiredOption('-t, --token <token>', 'Auth token')
  .action((options) => {
    const id = accountManager.addAccount({
      name: options.name,
      baseUrl: options.url,
      authToken: options.token,
    });
    console.log(`✅ Account added: ${id}`);
  });

program
  .command('list-accounts')
  .description('List all accounts')
  .action(() => {
    const accounts = accountManager.getAllAccounts();
    console.log(`\n=== Accounts (${accounts.length}) ===\n`);

    if (accounts.length === 0) {
      console.log('No accounts configured');
    } else {
      accounts.forEach((acc) => {
        const active = acc.isActive ? '✓' : ' ';
        console.log(`[${active}] ${acc.name}`);
        console.log(`    ID: ${acc.id}`);
        console.log(`    URL: ${acc.baseUrl}`);
        if (acc.lastUsed) {
          console.log(`    Last used: ${acc.lastUsed.toLocaleString()}`);
        }
        console.log();
      });
    }
  });

program
  .command('switch-account')
  .description('Switch active account')
  .requiredOption('-i, --id <accountId>', 'Account ID')
  .action((options) => {
    const success = accountManager.setActiveAccount(options.id);
    if (success) {
      const account = accountManager.getAccount(options.id);
      console.log(`✅ Switched to: ${account?.name}`);
    } else {
      console.log('❌ Account not found');
    }
  });

program
  .command('remove-account')
  .description('Remove an account')
  .requiredOption('-i, --id <accountId>', 'Account ID')
  .action((options) => {
    const removed = accountManager.removeAccount(options.id);
    if (removed) {
      console.log(`✅ Account removed`);
    } else {
      console.log('❌ Account not found');
    }
  });

program.parse();
