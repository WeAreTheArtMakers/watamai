const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// CRITICAL: Increase Chromium memory limits BEFORE app initialization
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096'); // 4GB heap
app.commandLine.appendSwitch('disable-renderer-backgrounding'); // Keep renderer active
app.commandLine.appendSwitch('disable-background-timer-throttling'); // Prevent throttling
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-breakpad'); // Reduce memory overhead
app.commandLine.appendSwitch('disable-component-extensions-with-background-pages');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion'); // Reduce CPU/memory
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder'); // Hardware acceleration

console.log('[Main] ⚡ Memory optimization flags enabled');
console.log('[Main] - V8 heap size: 4096 MB');
console.log('[Main] - Renderer backgrounding: disabled');
console.log('[Main] - Timer throttling: disabled');

// Load environment variables from .env file
const dotenvPath = path.join(__dirname, '..', '.env');
console.log('[Main] Loading .env from:', dotenvPath);
require('dotenv').config({ path: dotenvPath });

// Log loaded environment variables (masked)
console.log('[Main] Environment variables loaded:');
console.log('[Main] - MOLTBOOK_AGENT_NAME:', process.env.MOLTBOOK_AGENT_NAME || 'NOT SET');
console.log('[Main] - MOLTBOOK_API_KEY:', process.env.MOLTBOOK_API_KEY ? '***' + process.env.MOLTBOOK_API_KEY.slice(-4) : 'NOT SET');
console.log('[Main] - MOLTBOOK_VERIFICATION_CODE:', process.env.MOLTBOOK_VERIFICATION_CODE ? '***' + process.env.MOLTBOOK_VERIFICATION_CODE.slice(-4) : 'NOT SET');

// Agent loop state variables (moved to top to avoid initialization errors)
let agentInterval = null;
let agentRepliesThisHour = 0;
let agentHourlyResetInterval = null;
let moltbookHeartbeatInterval = null; // 4-hour heartbeat
let queueProcessorInterval = null; // Post queue processor

// Post Queue Processor
function startQueueProcessor() {
  if (queueProcessorInterval) {
    console.log('[Queue] Processor already running');
    return;
  }
  
  console.log('[Queue] Starting post queue processor...');
  console.log('[Queue] ℹ️ Processor checks every 30 seconds but only posts when rate limit expires');
  
  // Process queue every 30 seconds
  queueProcessorInterval = setInterval(processPostQueue, 30000);
  
  // Process immediately
  processPostQueue();
}

function stopQueueProcessor() {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
    queueProcessorInterval = null;
    console.log('[Queue] Post queue processor stopped');
  }
}

async function processPostQueue() {
  try {
    const queue = store.getPostQueue();
    const queuedPosts = queue.filter(p => p.status === 'queued' && p.autoPost);
    
    if (queuedPosts.length === 0) {
      return; // No posts to process
    }
    
    // Check if we can post (rate limit) - CRITICAL: Check this FIRST before logging
    const lastRateLimit = store.get('lastRateLimit');
    const now = new Date();
    
    if (lastRateLimit) {
      // lastRateLimit is a string timestamp
      const rateLimitEnd = new Date(lastRateLimit);
      
      // Validate the date
      if (!isNaN(rateLimitEnd.getTime()) && now < rateLimitEnd) {
        // SILENTLY skip - don't spam console when rate limited
        return; // Still rate limited
      } else if (now >= rateLimitEnd) {
        // Rate limit expired - clear it
        console.log('[Queue] ✅ Rate limit expired, clearing...');
        store.set('lastRateLimit', null);
      }
    }
    
    console.log('[Queue] ✅ No rate limit active, processing', queuedPosts.length, 'queued posts...');
    
    // REMOVED: Safe mode check - let auto-post work
    // Users can disable auto-post per draft if needed
    
    // Process one post at a time
    const postToProcess = queuedPosts[0];
    console.log('[Queue] Processing post:', postToProcess.title);
    
    // CRITICAL: Skip problematic submolts
    if (postToProcess.submolt === 'arttech' || postToProcess.submolt === 'm/arttech') {
      console.log('[Queue] ⚠️ SKIPPING PROBLEMATIC SUBMOLT:', postToProcess.submolt);
      console.log('[Queue] Removing post with invalid submolt from queue');
      
      // Remove from queue
      store.removeFromPostQueue(postToProcess.id);
      return;
    }
    
    // CRITICAL: Check for duplicate posts
    const existingPosts = store.getPosts();
    const isDuplicate = existingPosts.some(p => 
      p.title === postToProcess.title && 
      p.body === postToProcess.body
    );
    
    if (isDuplicate) {
      console.log('[Queue] ⚠️ DUPLICATE POST DETECTED:', postToProcess.title);
      console.log('[Queue] This post was already published. Removing from queue.');
      
      // Remove from queue
      store.removeFromPostQueue(postToProcess.id);
      
      // Notify frontend
      if (mainWindow) {
        mainWindow.webContents.send('queue-duplicate-detected', {
          title: postToProcess.title,
          message: 'This post was already published and has been removed from the queue.'
        });
      }
      
      return;
    }
    
    try {
      // Update status to processing
      store.updateQueueItemStatus(postToProcess.id, 'processing');
      
      // Publish the post
      const result = await publishPostToMoltbook({
        submolt: postToProcess.submolt,
        title: postToProcess.title,
        body: postToProcess.body
      });
      
      if (result.success) {
        console.log('[Queue] ✅ Post published successfully:', postToProcess.title);
        console.log('[Queue] 📋 Result from publishPostToMoltbook:', {
          postId: result.postId,
          url: result.url,
          hasRateLimitInfo: !!result.rateLimitInfo
        });
        
        // Save to posts
        const publishedPost = {
          id: result.postId || Date.now(),
          title: postToProcess.title,
          body: postToProcess.body,
          submolt: postToProcess.submolt,
          publishedAt: new Date().toISOString(),
          url: result.url,
          fromQueue: true
        };
        
        console.log('[Queue] 💾 Saving post to storage:', {
          id: publishedPost.id,
          title: publishedPost.title,
          url: publishedPost.url
        });
        
        store.savePost(publishedPost);
        
        // Delete matching draft if exists
        try {
          const drafts = store.getDrafts();
          const matchingDraft = drafts.find(d => 
            d.title === postToProcess.title && d.body === postToProcess.body
          );
          
          if (matchingDraft) {
            console.log('[Queue] Found matching draft to delete:', matchingDraft.id);
            store.deleteDraft(matchingDraft.id);
            console.log('[Queue] ✅ Draft deleted from Saved Drafts');
          }
        } catch (draftError) {
          console.warn('[Queue] Could not delete draft:', draftError.message);
        }
        
        // Remove from queue
        store.removeFromPostQueue(postToProcess.id);
        
        // Update rate limit
        if (result.rateLimitInfo && result.rateLimitInfo.nextPostAllowed) {
          store.set('lastRateLimit', result.rateLimitInfo.nextPostAllowed);
        }
        
        // Notify frontend
        if (mainWindow) {
          mainWindow.webContents.send('queue-post-published', {
            post: publishedPost,
            queueLength: store.getPostQueue().length
          });
        }
        
        store.audit('post.auto_published', { 
          id: publishedPost.id, 
          title: postToProcess.title,
          fromQueue: true 
        });
        
      } else {
        console.error('[Queue] ❌ Failed to publish post:', result.error);
        
        // If rate limited, update the rate limit time and STOP processing
        if (result.error === 'Rate limited' && result.rateLimitInfo) {
          console.log('[Queue] ⏱️ Rate limited - updating rate limit time');
          store.set('lastRateLimit', result.rateLimitInfo.nextPostAllowed);
          
          // Reset status back to queued so it can be retried later
          store.updateQueueItemStatus(postToProcess.id, 'queued');
          
          console.log('[Queue] ⏸️ Queue paused until:', new Date(result.rateLimitInfo.nextPostAllowed).toLocaleString());
        } else {
          // For other errors, mark as failed
          store.updateQueueItemStatus(postToProcess.id, 'failed', result.error);
        }
      }
      
    } catch (error) {
      console.error('[Queue] ❌ Error processing post:', error);
      store.updateQueueItemStatus(postToProcess.id, 'failed', error.message);
    }
    
  } catch (error) {
    console.error('[Queue] ❌ Queue processor error:', error);
  }
}

// Helper function to publish post (extracted from existing publish handler)
async function publishPostToMoltbook(data) {
  const agent = store.getAgent();
  if (!agent) {
    return { success: false, error: 'No agent registered' };
  }

  // CRITICAL: Deobfuscate API key properly
  const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
  console.log('[PublishHelper] Using API key:', maskApiKey(apiKey));

  // Clean submolt name - remove 'm/' prefix and trim whitespace
  let cleanSubmolt = data.submolt.trim();
  if (cleanSubmolt.startsWith('m/')) {
    cleanSubmolt = cleanSubmolt.substring(2).trim();
  }
  console.log('[PublishHelper] Original submolt:', data.submolt);
  console.log('[PublishHelper] Cleaned submolt:', cleanSubmolt);

  const https = require('https');
  const postData = JSON.stringify({
    submolt: cleanSubmolt,
    title: data.title,
    content: data.body, // Use 'content' field for Moltbook
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'www.moltbook.com',
      path: '/api/v1/posts',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WATAM-AI/2.0.0',
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        console.log('[PublishHelper] Response status:', res.statusCode);
        console.log('[PublishHelper] Response data:', responseData);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const parsed = JSON.parse(responseData);
            console.log('[PublishHelper] ========================================');
            console.log('[PublishHelper] 📥 FULL API RESPONSE:');
            console.log('[PublishHelper] Response:', JSON.stringify(parsed, null, 2));
            console.log('[PublishHelper] Response type:', typeof parsed);
            console.log('[PublishHelper] Response keys:', Object.keys(parsed));
            console.log('[PublishHelper] ========================================');
            
            // Moltbook API returns: { success: true, post: { id, title, content, ... } }
            let postId = null;
            
            // Try multiple possible ID locations
            if (parsed.post && parsed.post.id) {
              postId = parsed.post.id;
              console.log('[PublishHelper] ✅ Found ID at parsed.post.id:', postId);
            } else if (parsed.id) {
              postId = parsed.id;
              console.log('[PublishHelper] ✅ Found ID at parsed.id:', postId);
            } else if (parsed.data && parsed.data.id) {
              postId = parsed.data.id;
              console.log('[PublishHelper] ✅ Found ID at parsed.data.id:', postId);
            } else if (parsed.post_id) {
              postId = parsed.post_id;
              console.log('[PublishHelper] ✅ Found ID at parsed.post_id:', postId);
            } else if (parsed.postId) {
              postId = parsed.postId;
              console.log('[PublishHelper] ✅ Found ID at parsed.postId:', postId);
            }
            
            // Check if parsed itself has post properties (flat structure)
            if (!postId && parsed.title && parsed.content) {
              // Response might be the post object itself
              postId = parsed.id;
              console.log('[PublishHelper] ✅ Found ID in flat structure:', postId);
            }
            
            if (!postId) {
              console.error('[PublishHelper] ❌ Could not find post ID in response!');
              console.error('[PublishHelper] Response keys:', Object.keys(parsed));
              console.error('[PublishHelper] Full response:', JSON.stringify(parsed, null, 2));
              
              // Check if post object exists and log its keys
              if (parsed.post) {
                console.error('[PublishHelper] Post object keys:', Object.keys(parsed.post));
                console.error('[PublishHelper] Post object:', JSON.stringify(parsed.post, null, 2));
              }
            }
            
            const postUrl = postId ? `https://www.moltbook.com/post/${postId}` : null;
            console.log('[PublishHelper] Generated URL:', postUrl);
            
            resolve({
              success: true,
              postId: postId,
              url: postUrl,
              rateLimitInfo: {
                nextPostAllowed: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
              }
            });
          } catch (e) {
            console.error('[PublishHelper] JSON parse error:', e);
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        } else if (res.statusCode === 429) {
          console.error('[PublishHelper] ❌ Rate limited (429)');
          resolve({
            success: false,
            error: 'Rate limited',
            rateLimitInfo: {
              nextPostAllowed: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            }
          });
        } else {
          console.error('[PublishHelper] ❌ HTTP error:', res.statusCode, responseData);
          resolve({ success: false, error: `HTTP ${res.statusCode}: ${responseData}` });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[PublishHelper] Request error:', error);
      resolve({ success: false, error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

// Simple config store using JSON file
class SimpleStore {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.agentPath = path.join(app.getPath('userData'), 'agent.json');
    this.auditPath = path.join(app.getPath('userData'), 'audit.log');
    this.draftsPath = path.join(app.getPath('userData'), 'drafts.json');
    this.postsPath = path.join(app.getPath('userData'), 'posts.json');
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
    return {};
  }

  save() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  get(key, defaultValue) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  // Agent management
  getAgent() {
    try {
      if (fs.existsSync(this.agentPath)) {
        return JSON.parse(fs.readFileSync(this.agentPath, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
    }
    return null;
  }

  saveAgent(agent) {
    try {
      const dir = path.dirname(this.agentPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.agentPath, JSON.stringify(agent, null, 2));
      this.audit('agent.saved', { name: agent.name, status: agent.status });
    } catch (error) {
      console.error('Failed to save agent:', error);
      throw error;
    }
  }

  deleteAgent() {
    try {
      // Delete agent file
      if (fs.existsSync(this.agentPath)) {
        fs.unlinkSync(this.agentPath);
        this.audit('agent.deleted', {});
        console.log('[Store] ✅ Agent file deleted');
      }
      
      // Delete config file to reset all settings
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
        console.log('[Store] ✅ Config file deleted');
      }
      
      // Clear in-memory cache
      this.agent = null;
      this.config = {};
      
      console.log('[Store] ✅ Agent and config completely reset');
    } catch (error) {
      console.error('[Store] ❌ Failed to delete agent:', error);
    }
  }

  // Audit logging
  audit(action, details) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        action,
        details,
      };
      const dir = path.dirname(this.auditPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.auditPath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  // Get audit logs
  getLogs() {
    try {
      if (fs.existsSync(this.auditPath)) {
        const content = fs.readFileSync(this.auditPath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line);
        return lines.map(line => JSON.parse(line));
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
    return [];
  }

  // Drafts management
  getDrafts() {
    try {
      if (fs.existsSync(this.draftsPath)) {
        return JSON.parse(fs.readFileSync(this.draftsPath, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
    return [];
  }

  saveDraft(draft) {
    try {
      const drafts = this.getDrafts();
      const existingIndex = drafts.findIndex(d => d.id === draft.id);
      
      if (existingIndex >= 0) {
        drafts[existingIndex] = draft;
      } else {
        drafts.push(draft);
      }
      
      fs.writeFileSync(this.draftsPath, JSON.stringify(drafts, null, 2));
      this.audit('draft.saved', { id: draft.id, title: draft.title });
      return true;
    } catch (error) {
      console.error('Failed to save draft:', error);
      return false;
    }
  }

  deleteDraft(id) {
    try {
      const drafts = this.getDrafts();
      const filtered = drafts.filter(d => d.id != id);
      fs.writeFileSync(this.draftsPath, JSON.stringify(filtered, null, 2));
      this.audit('draft.deleted', { id });
      return true;
    } catch (error) {
      console.error('Failed to delete draft:', error);
      return false;
    }
  }

  // Posts management
  getPosts() {
    try {
      if (fs.existsSync(this.postsPath)) {
        return JSON.parse(fs.readFileSync(this.postsPath, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
    return [];
  }

  savePost(post) {
    try {
      const posts = this.getPosts();
      const existingIndex = posts.findIndex(p => p.id === post.id);
      
      if (existingIndex >= 0) {
        posts[existingIndex] = { ...posts[existingIndex], ...post };
      } else {
        posts.unshift(post); // Add to beginning
      }
      
      fs.writeFileSync(this.postsPath, JSON.stringify(posts, null, 2));
      this.audit('post.saved', { id: post.id, title: post.title });
      return true;
    } catch (error) {
      console.error('Failed to save post:', error);
      return false;
    }
  }

  deletePost(id) {
    try {
      const posts = this.getPosts();
      const filtered = posts.filter(p => p.id != id);
      fs.writeFileSync(this.postsPath, JSON.stringify(filtered, null, 2));
      this.audit('post.deleted', { id });
      return true;
    } catch (error) {
      console.error('Failed to delete post:', error);
      return false;
    }
  }

  // Post Queue Management
  getPostQueue() {
    try {
      const queuePath = path.join(app.getPath('userData'), 'post_queue.json');
      if (fs.existsSync(queuePath)) {
        return JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load post queue:', error);
    }
    return [];
  }

  addToPostQueue(post) {
    try {
      const queue = this.getPostQueue();
      const queueItem = {
        id: Date.now(),
        ...post,
        queuedAt: new Date().toISOString(),
        status: 'queued',
        autoPost: true
      };
      
      queue.push(queueItem);
      
      const queuePath = path.join(app.getPath('userData'), 'post_queue.json');
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
      this.audit('post.queued', { id: queueItem.id, title: queueItem.title });
      return queueItem;
    } catch (error) {
      console.error('Failed to add to post queue:', error);
      return null;
    }
  }

  removeFromPostQueue(id) {
    try {
      const queue = this.getPostQueue();
      const filtered = queue.filter(p => p.id != id);
      
      const queuePath = path.join(app.getPath('userData'), 'post_queue.json');
      fs.writeFileSync(queuePath, JSON.stringify(filtered, null, 2));
      this.audit('post.dequeued', { id });
      return true;
    } catch (error) {
      console.error('Failed to remove from post queue:', error);
      return false;
    }
  }

  updateQueueItemStatus(id, status, error = null) {
    try {
      const queue = this.getPostQueue();
      const item = queue.find(p => p.id === id);
      
      if (item) {
        item.status = status;
        item.processedAt = new Date().toISOString();
        if (error) item.error = error;
        
        const queuePath = path.join(app.getPath('userData'), 'post_queue.json');
        fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
        this.audit('post.queue_updated', { id, status, error });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update queue item:', error);
      return false;
    }
  }
}

const store = new SimpleStore();

// Moltbook API Base URL - ALWAYS use www
const MOLTBOOK_BASE_URL = 'https://www.moltbook.com';

// Moltbook Identity System - New API endpoints
const MOLTBOOK_IDENTITY_ENDPOINTS = {
  generateToken: '/api/v1/agents/me/identity-token',
  verifyToken: '/api/v1/agents/verify-identity',
  agentProfile: '/api/v1/agents/me'
};

// Moltbook skill.md content cache
let moltbookSkillContent = null;
let lastSkillFetch = null;

// Fetch and parse Moltbook skill.md for instructions
async function fetchAndParseMoltbookSkill() {
  const https = require('https');
  
  // Check if we have recent skill content (cache for 1 hour)
  if (moltbookSkillContent && lastSkillFetch && (Date.now() - lastSkillFetch < 3600000)) {
    console.log('[Moltbook] Using cached skill.md content');
    return moltbookSkillContent;
  }
  
  console.log('[Moltbook] Fetching fresh skill.md from Moltbook...');
  
  return new Promise((resolve, reject) => {
    const url = `${MOLTBOOK_BASE_URL}/skill.md`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[Moltbook] ✅ skill.md fetched successfully');
          moltbookSkillContent = data;
          lastSkillFetch = Date.now();
          
          // Parse the skill content for API endpoints and instructions
          const skillInfo = parseMoltbookSkill(data);
          resolve(skillInfo);
        } else {
          console.error('[Moltbook] ❌ Failed to fetch skill.md:', res.statusCode);
          reject(new Error(`Failed to fetch skill.md: ${res.statusCode}`));
        }
      });
    }).on('error', (error) => {
      console.error('[Moltbook] ❌ skill.md fetch error:', error);
      reject(error);
    });
  });
}

// Parse Moltbook skill.md content to extract API info
function parseMoltbookSkill(skillContent) {
  console.log('[Moltbook] 📖 Parsing skill.md content...');
  
  const skillInfo = {
    apiEndpoints: [],
    instructions: [],
    heartbeatInterval: 4 * 60 * 60 * 1000, // 4 hours default
    submolts: [],
    postingGuidelines: [],
  };
  
  // Extract API endpoints
  const apiMatches = skillContent.match(/https:\/\/www\.moltbook\.com\/api\/[^\s\)]+/g);
  if (apiMatches) {
    skillInfo.apiEndpoints = [...new Set(apiMatches)]; // Remove duplicates
    console.log('[Moltbook] 📡 Found API endpoints:', skillInfo.apiEndpoints);
  }
  
  // Extract heartbeat interval if specified
  const heartbeatMatch = skillContent.match(/(\d+)\s*hours?/i);
  if (heartbeatMatch) {
    skillInfo.heartbeatInterval = parseInt(heartbeatMatch[1]) * 60 * 60 * 1000;
    console.log('[Moltbook] ⏰ Heartbeat interval:', heartbeatMatch[1], 'hours');
  }
  
  // Extract submolt recommendations
  const submoltMatches = skillContent.match(/m\/[\w-]+/g);
  if (submoltMatches) {
    skillInfo.submolts = [...new Set(submoltMatches)];
    console.log('[Moltbook] 🏷️ Found submolts:', skillInfo.submolts);
  }
  
  // Extract posting guidelines
  const lines = skillContent.split('\n');
  let inGuidelines = false;
  
  for (const line of lines) {
    if (line.toLowerCase().includes('guideline') || line.toLowerCase().includes('rule')) {
      inGuidelines = true;
    }
    
    if (inGuidelines && line.trim().startsWith('-')) {
      skillInfo.postingGuidelines.push(line.trim().substring(1).trim());
    }
  }
  
  console.log('[Moltbook] 📋 Extracted', skillInfo.postingGuidelines.length, 'posting guidelines');
  
  return skillInfo;
}

// Auto-start agent if it was running before app closed
app.on('ready', () => {
  setTimeout(() => {
    const wasRunning = store.get('agentRunning', false);
    const autoReplyEnabled = store.get('autoReplyEnabled', true);
    
    // Always start queue processor
    startQueueProcessor();
    
    if (wasRunning && autoReplyEnabled) {
      console.log('[AI] Agent was running before, auto-starting...');
      
      // Check if agent is still valid
      const agent = store.getAgent();
      if (agent && agent.status === 'active') {
        // Restart agent
        const config = {
          aiProvider: store.get('aiProvider'),
          aiApiKey: store.get('aiApiKey'),
          aiModel: store.get('aiModel'),
          checkInterval: store.get('checkInterval', 15),
          maxRepliesPerHour: store.get('maxRepliesPerHour', 10),
        };
        
        if (config.aiProvider && (config.aiApiKey || config.aiProvider === 'ollama')) {
          // Reset counters
          agentRepliesThisHour = 0;
          
          // Check daily reset
          const lastResetDate = store.get('agentLastResetDate');
          const today = new Date().toDateString();
          if (lastResetDate !== today) {
            store.set('agentRepliesToday', 0);
            store.set('agentLastResetDate', today);
          }
          
          // Set up hourly reset
          agentHourlyResetInterval = setInterval(() => {
            agentRepliesThisHour = 0;
          }, 60 * 60 * 1000);
          
          // Run immediately
          runAgentLoop();
          
          // Start interval
          const intervalMs = config.checkInterval * 60 * 1000;
          agentInterval = setInterval(runAgentLoop, intervalMs);
          
          console.log('[AI] Agent auto-started successfully');
          store.audit('ai.agent_auto_started', { provider: config.aiProvider });
        } else {
          console.log('[AI] Agent config incomplete, not auto-starting');
          store.set('agentRunning', false);
        }
      } else {
        console.log('[AI] Agent not active, not auto-starting');
        store.set('agentRunning', false);
      }
    }
  }, 3000); // Wait 3 seconds for app to fully load
  
  // Start Moltbook heartbeat system (4 hours)
  setTimeout(() => {
    startMoltbookHeartbeat();
  }, 5000); // Wait 5 seconds after app starts
});

// Mask API key for display (first 8 + last 4 chars)
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 12) return '***';
  return apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
}

// Simple encryption/obfuscation for API key storage
function obfuscateKey(key) {
  return Buffer.from(key).toString('base64');
}

function deobfuscateKey(obfuscated) {
  return Buffer.from(obfuscated, 'base64').toString('utf8');
}

// ========================================
// MOLTBOOK HEARTBEAT SYSTEM (4 HOURS)
// ========================================
// NOTE: Heartbeat functions are defined later in the file (after line 4889)
// to avoid duplication and use the more advanced implementation


// Moltbook API: Register agent with skill.md learning
async function registerMoltbookAgent(name, description) {
  const https = require('https');
  
  console.log('[Moltbook] 🎓 Learning from skill.md before registration...');
  
  // First, fetch and learn from skill.md
  let skillInfo;
  try {
    skillInfo = await fetchAndParseMoltbookSkill();
    console.log('[Moltbook] ✅ Learned from skill.md');
  } catch (error) {
    console.warn('[Moltbook] ⚠️ Could not fetch skill.md, proceeding with defaults:', error.message);
    skillInfo = {
      apiEndpoints: [`${MOLTBOOK_BASE_URL}/api/v1/agents/register`],
      heartbeatInterval: 4 * 60 * 60 * 1000,
      submolts: [],
      postingGuidelines: [],
    };
  }
  
  // Use the registration endpoint from skill.md or fallback
  const registrationEndpoint = (skillInfo.apiEndpoints && skillInfo.apiEndpoints.find(ep => ep.includes('register'))) || 
                               `${MOLTBOOK_BASE_URL}/api/v1/agents/register`;
  
  console.log('[Moltbook] 📝 Registering agent at:', registrationEndpoint);

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ 
      name, 
      description,
      // Include skill-learned information
      capabilities: (skillInfo.postingGuidelines || []).slice(0, 5), // First 5 guidelines
      preferred_submolts: (skillInfo.submolts || []).slice(0, 3), // First 3 submolts
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WATAM-AI/2.0.0',
      },
      // Prevent redirects that strip Authorization header
      maxRedirects: 0,
    };

    const req = https.request(registrationEndpoint, options, (res) => {
      let data = '';

      // Handle redirects as errors
      if (res.statusCode === 301 || res.statusCode === 302) {
        reject(new Error('Redirect detected - ensure using https://www.moltbook.com'));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[Moltbook] Registration response:', res.statusCode, data.substring(0, 200));
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(data);
            
            // Store skill info with the agent
            result.skillInfo = skillInfo;
            result.learnedAt = new Date().toISOString();
            
            resolve(result);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Registration failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Moltbook Identity: Generate identity token for secure authentication
async function generateMoltbookIdentityToken(apiKey) {
  const https = require('https');
  const url = `${MOLTBOOK_BASE_URL}${MOLTBOOK_IDENTITY_ENDPOINTS.generateToken}`;

  console.log('[Moltbook Identity] 🎫 Generating identity token...');

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('⏱️ Token generation timeout'));
    }, 30000);

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'WATAM-AI/2.0.0',
        'Content-Type': 'application/json'
      },
      maxRedirects: 0,
    };

    console.log('[Moltbook Identity] 📡 Request URL:', url);
    console.log('[Moltbook Identity] 🔑 API Key:', maskApiKey(apiKey));

    const req = https.request(url, options, (res) => {
      clearTimeout(timeout);
      let data = '';

      if (res.statusCode === 301 || res.statusCode === 302) {
        console.error('[Moltbook Identity] ❌ Redirect detected');
        reject(new Error('Redirect detected - ensure using https://www.moltbook.com'));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[Moltbook Identity] 📡 Token Response:', res.statusCode);
        console.log('[Moltbook Identity] 📄 Response Body:', data.substring(0, 200));
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const parsed = JSON.parse(data);
            console.log('[Moltbook Identity] ✅ Identity token generated successfully');
            console.log('[Moltbook Identity] 🎫 Token preview:', parsed.token?.substring(0, 20) + '...');
            resolve(parsed);
          } catch (error) {
            console.error('[Moltbook Identity] ❌ JSON parse error:', error);
            reject(new Error('Invalid JSON response from token endpoint'));
          }
        } else if (res.statusCode === 401) {
          console.error('[Moltbook Identity] ❌ 401 Unauthorized - API key invalid');
          reject(new Error('API key invalid or expired - cannot generate identity token'));
        } else if (res.statusCode === 403) {
          console.error('[Moltbook Identity] ❌ 403 Forbidden - agent not claimed');
          reject(new Error('Agent not claimed - complete claim process first'));
        } else {
          console.error('[Moltbook Identity] ❌ Unexpected status:', res.statusCode);
          reject(new Error(`Token generation failed: HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[Moltbook Identity] ❌ Request error:', error);
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('🔌 Cannot connect to Moltbook server'));
      } else if (error.code === 'ETIMEDOUT') {
        reject(new Error('⏱️ Moltbook server timeout'));
      } else {
        reject(new Error(`🔌 Network error: ${error.message}`));
      }
    });

    req.end();
  });
}

// Moltbook Identity: Verify identity token and get agent profile
async function verifyMoltbookIdentityToken(identityToken, appKey) {
  const https = require('https');
  const url = `${MOLTBOOK_BASE_URL}${MOLTBOOK_IDENTITY_ENDPOINTS.verifyToken}`;

  console.log('[Moltbook Identity] 🔍 Verifying identity token...');

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ token: identityToken });
    
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('⏱️ Token verification timeout'));
    }, 30000);

    const options = {
      method: 'POST',
      headers: {
        'X-Moltbook-App-Key': appKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WATAM-AI/2.0.0',
      },
      maxRedirects: 0,
    };

    console.log('[Moltbook Identity] 📡 Verify URL:', url);
    console.log('[Moltbook Identity] 🔑 App Key:', appKey ? appKey.substring(0, 15) + '...' : 'missing');
    console.log('[Moltbook Identity] 🎫 Token preview:', identityToken.substring(0, 20) + '...');

    const req = https.request(url, options, (res) => {
      clearTimeout(timeout);
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[Moltbook Identity] 📡 Verify Response:', res.statusCode);
        console.log('[Moltbook Identity] 📄 Response Body:', data.substring(0, 500));
        
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log('[Moltbook Identity] 🔍 Verification Result:', {
              valid: parsed.valid,
              hasAgent: !!parsed.agent,
              agentName: parsed.agent?.name,
              karma: parsed.agent?.karma,
              isClaimed: parsed.agent?.is_claimed,
              hasOwner: !!parsed.agent?.owner
            });
            
            if (parsed.valid && parsed.agent) {
              console.log('[Moltbook Identity] ✅ Token verified successfully');
              console.log('[Moltbook Identity] 👤 Agent:', parsed.agent.name);
              console.log('[Moltbook Identity] 🏆 Karma:', parsed.agent.karma);
              console.log('[Moltbook Identity] ✅ Claimed:', parsed.agent.is_claimed);
              if (parsed.agent.owner) {
                console.log('[Moltbook Identity] 👨‍💼 Owner:', parsed.agent.owner.x_handle, parsed.agent.owner.x_verified ? '✅' : '❌');
              }
              resolve(parsed);
            } else {
              console.error('[Moltbook Identity] ❌ Token invalid or agent not found');
              resolve({ valid: false, error: parsed.error || 'Token invalid' });
            }
          } catch (error) {
            console.error('[Moltbook Identity] ❌ JSON parse error:', error);
            reject(new Error('Invalid JSON response from verify endpoint'));
          }
        } else if (res.statusCode === 400) {
          console.error('[Moltbook Identity] ❌ 400 Bad Request - invalid token format');
          resolve({ valid: false, error: 'invalid_token' });
        } else if (res.statusCode === 401) {
          console.error('[Moltbook Identity] ❌ 401 Unauthorized - invalid app key');
          resolve({ valid: false, error: 'invalid_app_key' });
        } else if (res.statusCode === 403) {
          console.error('[Moltbook Identity] ❌ 403 Forbidden - token expired');
          resolve({ valid: false, error: 'identity_token_expired' });
        } else {
          console.error('[Moltbook Identity] ❌ Unexpected status:', res.statusCode);
          reject(new Error(`Token verification failed: HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[Moltbook Identity] ❌ Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Moltbook API: Check agent status
async function checkMoltbookStatus(apiKey, agentName = null) {
  const https = require('https');
  
  // Try to get agent name from store if not provided
  if (!agentName) {
    const agent = store.getAgent();
    agentName = agent ? agent.name : null;
  }
  
  // CRITICAL: Try /api/v1/agents/profile?name=AGENT_NAME first (more reliable)
  // If that fails, fallback to /api/v1/agents/me
  const useProfileEndpoint = agentName !== null;
  const url = useProfileEndpoint 
    ? `${MOLTBOOK_BASE_URL}/api/v1/agents/profile?name=${agentName}`
    : `${MOLTBOOK_BASE_URL}/api/v1/agents/me`;

  return new Promise((resolve, reject) => {
    // Set timeout for slow Moltbook server (2 minutes)
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('⏱️ Moltbook server timeout (2 min). Server is very slow, please try again later.'));
    }, 120000);

    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'WATAM-AI/2.0.0',
      },
      maxRedirects: 0,
    };

    console.log('[Moltbook] 🔍 Checking agent status...');
    console.log('[Moltbook] API Key:', maskApiKey(apiKey));
    console.log('[Moltbook] Request URL:', url);
    console.log('[Moltbook] 🔍 DEBUG: Using', useProfileEndpoint ? 'profile endpoint' : '/me endpoint');
    console.log('[Moltbook] 🔍 DEBUG: Agent name:', agentName);
    console.log('[Moltbook] 🔍 DEBUG: API Key length:', apiKey ? apiKey.length : 0);
    console.log('[Moltbook] 🔍 DEBUG: API Key starts with:', apiKey ? apiKey.substring(0, 15) : 'null');

    const req = https.request(url, options, (res) => {
      clearTimeout(timeout);
      let data = '';

      if (res.statusCode === 301 || res.statusCode === 302) {
        console.error('[Moltbook] ❌ Redirect detected - ensure using https://www.moltbook.com');
        reject(new Error('Redirect detected'));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[Moltbook] 📡 Status Response:', res.statusCode);
        console.log('[Moltbook] 📋 Response Headers:', JSON.stringify(res.headers, null, 2));
        console.log('[Moltbook] 📄 Response Body (first 500 chars):', data.substring(0, 500));
        
        if (res.statusCode === 200) {
          // Parse response to check if agent is actually active
          try {
            const parsed = JSON.parse(data);
            console.log('[Moltbook] 🔍 Parsed Response Structure:', {
              hasId: !!parsed.id,
              hasName: !!parsed.name,
              hasAgent: !!parsed.agent,
              hasStatus: !!parsed.status,
              keys: Object.keys(parsed),
              fullData: JSON.stringify(parsed, null, 2)
            });
            
            // Check multiple possible response structures
            let isValidAgent = false;
            let agentData = null;
            
            // Direct agent object
            if (parsed.id || parsed.name) {
              isValidAgent = true;
              agentData = parsed;
              console.log('[Moltbook] ✅ Found direct agent object');
            }
            // Nested agent object
            else if (parsed.agent && (parsed.agent.id || parsed.agent.name)) {
              isValidAgent = true;
              agentData = parsed.agent;
              console.log('[Moltbook] ✅ Found nested agent object');
            }
            // Data wrapper
            else if (parsed.data && (parsed.data.id || parsed.data.name)) {
              isValidAgent = true;
              agentData = parsed.data;
              console.log('[Moltbook] ✅ Found agent in data wrapper');
            }
            // Success flag with agent data
            else if (parsed.success && parsed.agent) {
              isValidAgent = true;
              agentData = parsed.agent;
              console.log('[Moltbook] ✅ Found agent with success flag');
            }
            
            if (isValidAgent && agentData) {
              console.log('[Moltbook] ✅ AGENT IS ACTIVE - API key is valid');
              console.log('[Moltbook] ========================================');
              console.log('[Moltbook] 👤 FULL Agent Data from API:');
              console.log('[Moltbook] Raw agentData object:', JSON.stringify(agentData, null, 2));
              console.log('[Moltbook] ========================================');
              console.log('[Moltbook] 📊 Extracted Values (Before Fallbacks):');
              console.log('[Moltbook]   - ID:', agentData.id);
              console.log('[Moltbook]   - Name:', agentData.name);
              console.log('[Moltbook]   - Username:', agentData.username);
              console.log('[Moltbook]   - Status:', agentData.status);
              console.log('[Moltbook]   - Karma:', agentData.karma);
              console.log('[Moltbook]   - Followers (direct):', agentData.followers);
              console.log('[Moltbook]   - Follower Count:', agentData.follower_count);
              console.log('[Moltbook]   - Follower Count (camel):', agentData.followerCount);
              console.log('[Moltbook]   - Following (direct):', agentData.following);
              console.log('[Moltbook]   - Following Count:', agentData.following_count);
              console.log('[Moltbook]   - Following Count (camel):', agentData.followingCount);
              console.log('[Moltbook]   - Stats Object:', agentData.stats);
              console.log('[Moltbook] ========================================');
              
              // CRITICAL: Try to extract followers/following from profile or user object
              const profileData = agentData.profile || agentData.user || agentData;
              
              console.log('[Moltbook] 🔍 Checking profile/user object for followers/following:');
              console.log('[Moltbook]   - Profile Data:', JSON.stringify(profileData, null, 2));
              
              // Try multiple possible field names for followers/following
              // Priority order: profile > direct field > snake_case > camelCase > stats object
              const followers = (profileData.followers !== undefined ? profileData.followers : null) ||
                               agentData.followers || 
                               agentData.follower_count || 
                               agentData.followerCount ||
                               (agentData.stats && agentData.stats.followers) ||
                               (agentData.stats && agentData.stats.follower_count) ||
                               0;
              
              const following = (profileData.following !== undefined ? profileData.following : null) ||
                               agentData.following || 
                               agentData.following_count || 
                               agentData.followingCount ||
                               (agentData.stats && agentData.stats.following) ||
                               (agentData.stats && agentData.stats.following_count) ||
                               0;
              
              const karma = agentData.karma ||
                           agentData.karma_points ||
                           agentData.karmaPoints ||
                           (agentData.stats && agentData.stats.karma) ||
                           (profileData && profileData.karma) ||
                           0;
              
              console.log('[Moltbook] 🎯 Final Values After Fallbacks:');
              console.log('[Moltbook]   - Karma:', karma);
              console.log('[Moltbook]   - Followers:', followers);
              console.log('[Moltbook]   - Following:', following);
              console.log('[Moltbook] ========================================');
              
              // If followers/following are still 0, log a warning
              if (followers === 0 && following === 0) {
                console.warn('[Moltbook] ⚠️ WARNING: Followers and Following are both 0!');
                console.warn('[Moltbook] This could mean:');
                console.warn('[Moltbook] 1. API response doesn\'t include these fields');
                console.warn('[Moltbook] 2. Field names are different than expected');
                console.warn('[Moltbook] 3. Agent actually has 0 followers/following');
                console.warn('[Moltbook] 💡 Check the "Profile Data" log above to see actual field names');
                console.warn('[Moltbook] 💡 You can also check your profile at: https://moltbook.com/u/' + agentData.name);
              }
              
              resolve({ 
                status: 'active', 
                statusCode: res.statusCode, 
                data: agentData,
                agent: {
                  id: agentData.id,
                  name: agentData.name,
                  username: agentData.username || agentData.name,
                  status: agentData.status,
                  karma: karma,
                  followers: followers,
                  following: following,
                  joinedAt: agentData.created_at || agentData.createdAt || agentData.joinedAt || agentData.joined_at
                }
              });
            } else {
              // Got 200 but no valid agent data
              console.error('[Moltbook] ❌ Got 200 but no valid agent data');
              console.error('[Moltbook] 🔍 This might mean:');
              console.error('[Moltbook] - API endpoint changed');
              console.error('[Moltbook] - Response format changed');
              console.error('[Moltbook] - Agent not properly registered');
              resolve({ status: 'error', statusCode: res.statusCode, message: 'Invalid agent data - agent might not be properly registered' });
            }
          } catch (e) {
            // JSON parse error
            console.error('[Moltbook] ❌ JSON parse error:', e.message);
            console.error('[Moltbook] 📄 Raw response:', data);
            resolve({ status: 'error', statusCode: res.statusCode, message: 'Invalid JSON response from Moltbook API' });
          }
        } else if (res.statusCode === 401) {
          console.error('[Moltbook] ❌ 401 Unauthorized - API key invalid or expired');
          console.error('[Moltbook] 💡 Solutions:');
          console.error('[Moltbook] - Re-register your agent');
          console.error('[Moltbook] - Complete the claim process on Moltbook website');
          console.error('[Moltbook] - Check if API key was corrupted');
          console.error('[Moltbook] ⚠️ NOTE: This might be a temporary Moltbook server issue');
          resolve({ status: 'error', statusCode: res.statusCode, message: 'API key invalid or expired - please re-register agent' });
        } else if (res.statusCode === 403) {
          console.error('[Moltbook] ❌ 403 Forbidden - claim not completed');
          console.error('[Moltbook] 💡 Solution: Complete the claim process on Moltbook website');
          resolve({ status: 'error', statusCode: res.statusCode, message: 'Claim not completed - please complete claim process on Moltbook' });
        } else if (res.statusCode === 404) {
          console.error('[Moltbook] ❌ 404 Not Found - agent not found');
          console.error('[Moltbook] 💡 Solution: Re-register your agent');
          resolve({ status: 'error', statusCode: res.statusCode, message: 'Agent not found - please re-register agent' });
        } else if (res.statusCode === 500 || res.statusCode === 502 || res.statusCode === 503) {
          console.error('[Moltbook] ❌ Server Error:', res.statusCode);
          console.error('[Moltbook] 💡 This is a TEMPORARY Moltbook server issue');
          console.error('[Moltbook] 💡 Your API key is likely still valid');
          console.error('[Moltbook] 💡 The agent will retry automatically');
          resolve({ status: 'temporary_error', statusCode: res.statusCode, message: 'Moltbook server temporary error - will retry' });
        } else {
          // Any other status code is an error
          console.error('[Moltbook] ❌ Unexpected status code:', res.statusCode);
          console.error('[Moltbook] 📄 Response:', data.substring(0, 200));
          resolve({ status: 'error', statusCode: res.statusCode, message: `HTTP ${res.statusCode}: ${data.substring(0, 100)}` });
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[Moltbook] ❌ Request error:', error);
      // Better error message for network issues
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('🔌 Cannot connect to Moltbook server. Server might be down.'));
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
        reject(new Error('⏱️ Moltbook server is very slow. Please try again later.'));
      } else {
        reject(new Error(`🔌 Moltbook connection error: ${error.message}`));
      }
    });

    req.end();
  });
}

// Test API key permissions by trying to access agent-specific endpoints
async function testApiKeyPermissions(apiKey) {
  const https = require('https');
  
  console.log('[Test] 🧪 Testing API key permissions...');
  console.log('[Test] 🔑 API Key:', maskApiKey(apiKey));
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.moltbook.com',
      path: '/api/v1/agents/me/posts', // Try to get agent's own posts
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'WATAM-AI/2.0.0',
      },
    };

    console.log('[Test] 📡 Testing endpoint:', `https://${options.hostname}${options.path}`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('[Test] 📋 Permissions test response:', res.statusCode);
        console.log('[Test] 📄 Response body (first 200 chars):', data.substring(0, 200));
        
        if (res.statusCode === 200) {
          console.log('[Test] ✅ API key has full permissions');
          resolve({ canPost: true, status: res.statusCode, message: 'Full permissions confirmed' });
        } else if (res.statusCode === 401) {
          console.log('[Test] ❌ API key is invalid or expired (401)');
          resolve({ canPost: false, status: res.statusCode, error: 'API key invalid or expired' });
        } else if (res.statusCode === 403) {
          console.log('[Test] ❌ API key lacks permissions (403)');
          resolve({ canPost: false, status: res.statusCode, error: 'Insufficient permissions - claim not completed' });
        } else if (res.statusCode === 404) {
          console.log('[Test] ⚠️ Endpoint not found (404) - might be normal');
          resolve({ canPost: true, status: res.statusCode, warning: 'Endpoint not found but API key might still work' });
        } else {
          console.log('[Test] ⚠️ Unexpected response:', res.statusCode);
          resolve({ canPost: true, status: res.statusCode, warning: 'Unexpected response but proceeding' });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[Test] ❌ Permissions test failed:', error.message);
      resolve({ canPost: true, error: error.message }); // Assume it can post if test fails
    });

    // Set timeout
    setTimeout(() => {
      req.destroy();
      console.log('[Test] ⏱️ Permissions test timeout');
      resolve({ canPost: true, error: 'Timeout' });
    }, 10000);

    req.end();
  });
}

// Comprehensive API key debugging function
async function debugApiKeyIssues(apiKey) {
  console.log('[Debug] 🔍 ========================================');
  console.log('[Debug] 🔍 COMPREHENSIVE API KEY DEBUGGING');
  console.log('[Debug] 🔍 ========================================');
  
  const results = {
    apiKeyFormat: null,
    agentStatus: null,
    permissions: null,
    directPostTest: null,
    recommendations: []
  };
  
  // Test 1: API Key Format
  console.log('[Debug] 1️⃣ Testing API key format...');
  if (!apiKey) {
    results.apiKeyFormat = { valid: false, error: 'API key is null or undefined' };
  } else if (apiKey.length < 20) {
    results.apiKeyFormat = { valid: false, error: 'API key too short (corrupted?)' };
  } else if (!apiKey.startsWith('mb_') && !apiKey.includes('_')) {
    results.apiKeyFormat = { valid: false, error: 'API key format looks invalid' };
  } else {
    results.apiKeyFormat = { valid: true, length: apiKey.length, prefix: apiKey.substring(0, 10) + '...' };
  }
  console.log('[Debug] API Key Format:', results.apiKeyFormat);
  
  if (!results.apiKeyFormat.valid) {
    results.recommendations.push('Re-register agent to get new API key');
    return results;
  }
  
  // Test 2: Agent Status Check
  console.log('[Debug] 2️⃣ Testing agent status...');
  try {
    const statusResult = await checkMoltbookStatus(apiKey, agent.name);
    results.agentStatus = {
      success: true,
      status: statusResult.status,
      statusCode: statusResult.statusCode,
      hasData: !!statusResult.data
    };
    
    if (statusResult.status !== 'active') {
      results.recommendations.push('Complete claim process on Moltbook website');
    }
  } catch (error) {
    results.agentStatus = {
      success: false,
      error: error.message
    };
    results.recommendations.push('Check network connection and Moltbook server status');
  }
  console.log('[Debug] Agent Status:', results.agentStatus);
  
  // Test 3: API Permissions
  console.log('[Debug] 3️⃣ Testing API permissions...');
  try {
    const permResult = await testApiKeyPermissions(apiKey);
    results.permissions = permResult;
    
    if (!permResult.canPost) {
      results.recommendations.push('Complete claim process - API key lacks posting permissions');
    }
  } catch (error) {
    results.permissions = {
      success: false,
      error: error.message
    };
  }
  console.log('[Debug] Permissions:', results.permissions);
  
  // Test 4: Direct Post Test (to a test endpoint)
  console.log('[Debug] 4️⃣ Testing direct API call...');
  try {
    const https = require('https');
    
    const testResult = await new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: '/api/v1/agents/me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.0.0',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            hasData: data.length > 0,
            dataPreview: data.substring(0, 100)
          });
        });
      });

      req.on('error', (error) => {
        resolve({ error: error.message });
      });

      setTimeout(() => {
        req.destroy();
        resolve({ error: 'Timeout' });
      }, 10000);

      req.end();
    });
    
    results.directPostTest = testResult;
  } catch (error) {
    results.directPostTest = { error: error.message };
  }
  console.log('[Debug] Direct Test:', results.directPostTest);
  
  // Generate recommendations
  if (results.recommendations.length === 0) {
    if (results.agentStatus?.status === 'active' && results.permissions?.canPost) {
      results.recommendations.push('API key appears to be working correctly');
      results.recommendations.push('Issue might be with Safe Mode or network connectivity');
    } else {
      results.recommendations.push('Check Moltbook website for agent status');
    }
  }
  
  console.log('[Debug] 🔍 ========================================');
  console.log('[Debug] 🔍 DEBUGGING COMPLETE');
  console.log('[Debug] 🔍 Recommendations:', results.recommendations);
  console.log('[Debug] 🔍 ========================================');
  
  return results;
}

// Moltbook API: Fetch skill.md
async function fetchMoltbookSkillDoc() {
  const https = require('https');
  const url = `${MOLTBOOK_BASE_URL}/skill.md`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          // Cache to file
          const cachePath = path.join(app.getPath('userData'), 'moltbook_skill_cache.md');
          try {
            fs.writeFileSync(cachePath, data);
            resolve({ success: true, cached: true, cachedAt: new Date().toISOString() });
          } catch (error) {
            resolve({ success: true, cached: false, error: error.message });
          }
        } else {
          reject(new Error(`Failed to fetch skill.md: ${res.statusCode}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

let mainWindow;
let cliProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: true,
      // CRITICAL: Enable text selection at Electron level
      enableBlinkFeatures: 'CSSUserSelectText',
      // Disable features that might block text selection
      disableBlinkFeatures: '',
      // CRITICAL: Disable cache to force reload after fixes
      cache: false,
      // Memory optimization flags
      additionalArguments: [
        '--js-flags=--max-old-space-size=4096', // Increase V8 heap to 4GB
        '--disable-gpu-vsync', // Reduce GPU memory usage
        '--disable-software-rasterizer',
      ],
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
  });

  // CRITICAL: Clear cache before loading to prevent loop issues
  mainWindow.webContents.session.clearCache().then(() => {
    console.log('[App] Cache cleared successfully');
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }).catch(err => {
    console.error('[App] Failed to clear cache:', err);
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  });

  // CRITICAL: Enable context menu for copy/paste
  mainWindow.webContents.on('context-menu', (e, params) => {
    const { selectionText, isEditable } = params;
    
    if (selectionText || isEditable) {
      const menu = Menu.buildFromTemplate([
        { role: 'copy', enabled: !!selectionText },
        { role: 'cut', enabled: isEditable && !!selectionText },
        { role: 'paste', enabled: isEditable },
        { role: 'selectAll' },
      ]);
      menu.popup();
    }
  });

  // Open DevTools only in development (NOT in production)
  // Remove this line or comment it out for production builds
  // if (process.env.NODE_ENV !== 'production') {
  //   mainWindow.webContents.openDevTools();
  // }

  // CRITICAL: Force enable text selection after page loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      // Force text selection everywhere
      document.body.style.webkitUserSelect = 'text';
      document.body.style.userSelect = 'text';
      document.body.style.cursor = 'text';
      
      // Apply to all elements
      const style = document.createElement('style');
      style.textContent = \`
        * {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          user-select: text !important;
        }
        button, .btn, .nav-item, input[type="checkbox"], input[type="radio"] {
          -webkit-user-select: none !important;
          user-select: none !important;
          cursor: pointer !important;
        }
      \`;
      document.head.appendChild(style);
      
      // Enable all inputs and textareas
      document.querySelectorAll('input, textarea').forEach(el => {
        el.setAttribute('spellcheck', 'false');
        el.setAttribute('autocomplete', 'off');
        el.style.webkitUserSelect = 'text';
        el.style.userSelect = 'text';
        
        // Enable paste
        el.addEventListener('paste', (e) => {
          console.log('[Main] Paste event on', el.id);
        });
      });
      
      console.log('[Main] Text selection FORCED via JavaScript');
      console.log('[Main] Body userSelect:', document.body.style.userSelect);
      console.log('[Main] Inputs enabled:', document.querySelectorAll('input, textarea').length);
    `);
  });

  // Create menu
  createMenu();

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (cliProcess) {
      cliProcess.kill();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'WATAM AI',
      submenu: [
        { label: 'About WATAM AI', click: () => showAbout() },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'CmdOrCtrl+,', click: () => showSettings() },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Agent',
      submenu: [
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+D', click: () => navigateTo('dashboard') },
        { label: 'Persona Editor', accelerator: 'CmdOrCtrl+P', click: () => navigateTo('persona') },
        { label: 'Skills Editor', accelerator: 'CmdOrCtrl+K', click: () => navigateTo('skills') },
        { type: 'separator' },
        { label: 'Draft Studio', accelerator: 'CmdOrCtrl+N', click: () => navigateTo('draft') },
        { label: 'Logs', accelerator: 'CmdOrCtrl+L', click: () => navigateTo('logs') },
      ],
    },
    {
      label: 'Security',
      submenu: [
        { label: 'Security Status', click: () => runCommand('security-status') },
        { label: 'Security Test', click: () => runCommand('security-test') },
        { label: 'View Violations', click: () => runCommand('security-violations') },
        { type: 'separator' },
        { label: 'Safe Mode', type: 'checkbox', checked: true, click: toggleSafeMode },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://github.com/WeAreTheArtMakers/watamai') },
        { label: 'Quick Start', click: () => showQuickStart() },
        { type: 'separator' },
        { label: 'Report Issue', click: () => shell.openExternal('https://github.com/WeAreTheArtMakers/watamai/issues') },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About WATAM AI',
    message: 'WATAM AI v1.2.0',
    detail: 'Socially intelligent AI agent for Moltbook\n\nBuilt with ❤️ by WeAreTheArtMakers\n\nMIT License + WATAM Community License',
    buttons: ['OK'],
  });
}

function showSettings() {
  mainWindow.webContents.send('navigate', 'settings');
}

function navigateTo(page) {
  mainWindow.webContents.send('navigate', page);
}

function showQuickStart() {
  mainWindow.webContents.send('show-quickstart');
}

function toggleSafeMode(menuItem) {
  const enabled = menuItem.checked;
  store.set('safeMode', enabled);
  mainWindow.webContents.send('safe-mode-changed', enabled);
}

// IPC Handlers
ipcMain.handle('get-config', () => {
  // Initialize defaults if not set - CRITICAL: Also check for empty strings
  if (store.get('autoReplyEnabled') === undefined) {
    store.set('autoReplyEnabled', true);
  }
  if (store.get('checkInterval') === undefined) {
    store.set('checkInterval', 15);
  }
  // CRITICAL: Use spaces after commas to match HTML defaults
  if (!store.get('replySubmolts') || store.get('replySubmolts').trim() === '') {
    store.set('replySubmolts', 'general, music, art, finance');
  }
  if (!store.get('replyKeywords') || store.get('replyKeywords').trim() === '') {
    store.set('replyKeywords', ''); // EMPTY - reply to all posts by default
  }
  
  return {
    safeMode: store.get('safeMode', true),
    agentName: store.get('agentName', 'watam-agent'),
    maxPostsPerHour: store.get('maxPostsPerHour', 3),
    maxCommentsPerHour: store.get('maxCommentsPerHour', 20),
    persona: store.get('persona', ''),
    skills: store.get('skills', ''),
    // AI Agent config
    aiProvider: store.get('aiProvider', ''),
    aiApiKey: store.get('aiApiKey', ''),
    aiModel: store.get('aiModel', ''),
    customEndpoint: store.get('customEndpoint', ''),
    autoReplyEnabled: store.get('autoReplyEnabled', true),
    checkInterval: store.get('checkInterval', 15),
    // CRITICAL: Use spaces after commas to match HTML defaults
    replySubmolts: store.get('replySubmolts', 'general, music, art, finance'),
    replyKeywords: store.get('replyKeywords', ''), // EMPTY - reply to all posts
    maxRepliesPerHour: store.get('maxRepliesPerHour', 10),
    agentRunning: store.get('agentRunning', false),
    // Advanced AI settings
    responseLength: store.get('responseLength', 'medium'),
    responseStyle: store.get('responseStyle', 'friendly'),
    temperature: store.get('temperature', 0.7),
    usePersona: store.get('usePersona', true),
    avoidRepetition: store.get('avoidRepetition', true),
  };
});

ipcMain.handle('get-rate-limit-status', async () => {
  try {
    const lastRateLimit = store.get('lastRateLimit');
    
    if (!lastRateLimit) {
      // No rate limit stored
      return {
        success: true,
        isActive: false,
        nextAllowedTime: null,
        minutesLeft: 0
      };
    }
    
    // Handle both old format (string) and new format (object)
    let nextAllowedTime;
    if (typeof lastRateLimit === 'string') {
      nextAllowedTime = new Date(lastRateLimit);
    } else if (lastRateLimit.nextAllowedTime) {
      nextAllowedTime = new Date(lastRateLimit.nextAllowedTime);
    } else {
      // Invalid format, clear it
      store.set('lastRateLimit', null);
      return {
        success: true,
        isActive: false,
        nextAllowedTime: null,
        minutesLeft: 0
      };
    }
    
    const now = new Date();
    
    if (now < nextAllowedTime) {
      return {
        success: true,
        isActive: true,
        nextAllowedTime: nextAllowedTime.toISOString(),
        minutesLeft: Math.ceil((nextAllowedTime - now) / (1000 * 60))
      };
    } else {
      // Rate limit expired, clear it
      store.set('lastRateLimit', null);
      return {
        success: true,
        isActive: false,
        nextAllowedTime: null,
        minutesLeft: 0
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-config', (event, config) => {
  if (config.safeMode !== undefined) store.set('safeMode', config.safeMode);
  if (config.agentName) store.set('agentName', config.agentName);
  if (config.maxPostsPerHour !== undefined) store.set('maxPostsPerHour', config.maxPostsPerHour);
  if (config.maxCommentsPerHour !== undefined) store.set('maxCommentsPerHour', config.maxCommentsPerHour);
  if (config.persona !== undefined) store.set('persona', config.persona);
  if (config.skills !== undefined) store.set('skills', config.skills);
  
  // AI Agent config
  if (config.aiProvider !== undefined) store.set('aiProvider', config.aiProvider);
  if (config.aiApiKey !== undefined) store.set('aiApiKey', config.aiApiKey);
  if (config.aiModel !== undefined) store.set('aiModel', config.aiModel);
  if (config.customEndpoint !== undefined) store.set('customEndpoint', config.customEndpoint);
  if (config.autoReplyEnabled !== undefined) store.set('autoReplyEnabled', config.autoReplyEnabled);
  if (config.checkInterval !== undefined) store.set('checkInterval', config.checkInterval);
  if (config.replySubmolts !== undefined) store.set('replySubmolts', config.replySubmolts);
  if (config.replyKeywords !== undefined) store.set('replyKeywords', config.replyKeywords);
  if (config.maxRepliesPerHour !== undefined) store.set('maxRepliesPerHour', config.maxRepliesPerHour);
  
  // Advanced AI settings
  if (config.responseLength !== undefined) store.set('responseLength', config.responseLength);
  if (config.responseStyle !== undefined) store.set('responseStyle', config.responseStyle);
  if (config.temperature !== undefined) store.set('temperature', config.temperature);
  if (config.usePersona !== undefined) store.set('usePersona', config.usePersona);
  if (config.avoidRepetition !== undefined) store.set('avoidRepetition', config.avoidRepetition);
  
  console.log('[Config] Saved config:', Object.keys(config));
  store.audit('config.updated', { keys: Object.keys(config) });
  return { success: true };
});

// Moltbook Identity IPC Handlers - NEW SYSTEM
ipcMain.handle('moltbook-generate-identity-token', async () => {
  try {
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }

    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    console.log('[Identity] Generating identity token for agent:', agent.name);
    
    const result = await generateMoltbookIdentityToken(apiKey);
    
    // Store the identity token temporarily (expires in 1 hour)
    const tokenData = {
      token: result.token,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };
    
    store.set('moltbookIdentityToken', tokenData);
    store.audit('moltbook.identity_token_generated', { agentName: agent.name });
    
    return { success: true, token: result.token, expiresAt: tokenData.expiresAt };
  } catch (error) {
    console.error('[Identity] Failed to generate identity token:', error);
    store.audit('moltbook.identity_token_failed', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('moltbook-verify-identity-token', async (event, { token, appKey }) => {
  try {
    console.log('[Identity] Verifying identity token...');
    
    const result = await verifyMoltbookIdentityToken(token, appKey);
    
    if (result.valid) {
      console.log('[Identity] ✅ Token verified successfully');
      store.audit('moltbook.identity_verified', { 
        agentName: result.agent.name,
        karma: result.agent.karma,
        isClaimed: result.agent.is_claimed 
      });
    } else {
      console.log('[Identity] ❌ Token verification failed:', result.error);
      store.audit('moltbook.identity_verification_failed', { error: result.error });
    }
    
    return { success: true, ...result };
  } catch (error) {
    console.error('[Identity] Identity verification error:', error);
    store.audit('moltbook.identity_verification_error', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('moltbook-get-identity-status', async () => {
  try {
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }

    const tokenData = store.get('moltbookIdentityToken');
    const now = new Date();
    
    let identityStatus = {
      hasToken: false,
      tokenExpired: true,
      canGenerateToken: agent.status === 'active',
      agentName: agent.name,
      agentStatus: agent.status,
    };
    
    if (tokenData && tokenData.token) {
      const expiresAt = new Date(tokenData.expiresAt);
      identityStatus.hasToken = true;
      identityStatus.tokenExpired = now > expiresAt;
      identityStatus.expiresAt = tokenData.expiresAt;
      identityStatus.generatedAt = tokenData.generatedAt;
      
      if (!identityStatus.tokenExpired) {
        identityStatus.token = tokenData.token;
      }
    }
    
    return { success: true, identity: identityStatus };
  } catch (error) {
    console.error('[Identity] Failed to get identity status:', error);
    return { success: false, error: error.message };
  }
});

// Legacy Moltbook Agent IPC Handlers - KEEPING FOR BACKWARD COMPATIBILITY
ipcMain.handle('moltbook-register', async (event, { name, description }) => {
  try {
    store.audit('moltbook.register.attempt', { name });

    const result = await registerMoltbookAgent(name, description);

    // Store agent data securely
    const agent = {
      name,
      description,
      apiKeyObfuscated: obfuscateKey(result.agent.api_key),
      apiKeyMasked: maskApiKey(result.agent.api_key),
      claimUrl: result.agent.claim_url,
      verificationCode: result.agent.verification_code,
      status: 'claim_pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.saveAgent(agent);

    // Return safe data (no raw API key)
    return {
      success: true,
      agent: {
        name: agent.name,
        apiKeyMasked: agent.apiKeyMasked,
        claimUrl: agent.claimUrl,
        verificationCode: agent.verificationCode,
        status: agent.status,
        createdAt: agent.createdAt,
      },
    };
  } catch (error) {
    store.audit('moltbook.register.error', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle('moltbook-get-agent', async () => {
  try {
    console.log('[Moltbook] 🔍 Getting agent...');
    let agent = store.getAgent();
    console.log('[Moltbook] Agent from store:', agent ? agent.name : 'null');
    
    // If no agent in store, try to load from .env
    if (!agent && process.env.MOLTBOOK_API_KEY && process.env.MOLTBOOK_AGENT_NAME) {
      console.log('[Moltbook] 📋 No agent in store, loading from .env file...');
      console.log('[Moltbook] Agent Name:', process.env.MOLTBOOK_AGENT_NAME);
      console.log('[Moltbook] API Key:', maskApiKey(process.env.MOLTBOOK_API_KEY));
      console.log('[Moltbook] Verification Code:', process.env.MOLTBOOK_VERIFICATION_CODE);
      
      // Create agent from .env
      agent = {
        name: process.env.MOLTBOOK_AGENT_NAME,
        description: 'WATAM AI Agent - Loaded from .env',
        apiKeyObfuscated: obfuscateKey(process.env.MOLTBOOK_API_KEY),
        apiKeyMasked: maskApiKey(process.env.MOLTBOOK_API_KEY),
        verificationCode: process.env.MOLTBOOK_VERIFICATION_CODE,
        status: 'claim_pending', // Will be checked on first status check
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        loadedFrom: 'env'
      };
      
      // Save to store for future use
      store.saveAgent(agent);
      console.log('[Moltbook] ✅ Agent loaded from .env and saved to store');
    } else if (!agent) {
      console.log('[Moltbook] ❌ No agent in store and no .env variables');
      console.log('[Moltbook] - MOLTBOOK_API_KEY:', process.env.MOLTBOOK_API_KEY ? 'SET' : 'NOT SET');
      console.log('[Moltbook] - MOLTBOOK_AGENT_NAME:', process.env.MOLTBOOK_AGENT_NAME ? 'SET' : 'NOT SET');
    }
    
    if (!agent) {
      console.log('[Moltbook] Returning null agent');
      return { success: true, agent: null };
    }

    console.log('[Moltbook] Returning agent:', agent.name);
    // Return safe data (no raw API key)
    return {
      success: true,
      agent: {
        name: agent.name,
        description: agent.description,
        apiKeyMasked: agent.apiKeyMasked,
        claimUrl: agent.claimUrl,
        verificationCode: agent.verificationCode,
        status: agent.status,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        lastCheckedAt: agent.lastCheckedAt,
        loadedFrom: agent.loadedFrom
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle('moltbook-check-status', async () => {
  try {
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }

    store.audit('moltbook.status_check.attempt', {});

    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const result = await checkMoltbookStatus(apiKey, agent.name);

    // Update agent status
    agent.status = result.status;
    agent.updatedAt = new Date().toISOString();
    agent.lastCheckedAt = new Date().toISOString();
    store.saveAgent(agent);

    store.audit('moltbook.status_check.success', { status: result.status });

    return {
      success: true,
      status: result.status,
      lastCheckedAt: agent.lastCheckedAt,
    };
  } catch (error) {
    store.audit('moltbook.status_check.error', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle('moltbook-fetch-skilldoc', async () => {
  try {
    store.audit('moltbook.fetch_skilldoc.attempt', {});
    const result = await fetchMoltbookSkillDoc();
    store.audit('moltbook.fetch_skilldoc.success', result);
    return { success: true, ...result };
  } catch (error) {
    store.audit('moltbook.fetch_skilldoc.error', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle('moltbook-reset-agent', async () => {
  try {
    store.deleteAgent();
    store.audit('moltbook.agent_reset', {});
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle('run-cli-command', async (event, command, args = []) => {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    const proc = spawn('node', [cliPath, command, ...args], {
      cwd: path.join(__dirname, '..'),
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        reject({ success: false, error });
      }
    });
  });
});

ipcMain.handle('fetch-feed', async () => {
  try {
    const result = await runCliCommand('fetch-feed');
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('draft-post', async (event, data) => {
  try {
    const args = [
      '--submolt', data.submolt,
      '--topic', data.topic,
    ];
    if (data.includeWatam) {
      args.push('--include-watam', '--watam-context', data.watamContext);
    }
    const result = await runCliCommand('draft-post', args);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('publish-post', async (event, data) => {
  const safeMode = store.get('safeMode', true);
  if (safeMode) {
    return { success: false, error: 'Safe Mode is enabled. Disable it to publish.' };
  }

  // Check if agent is registered and active
  const agent = store.getAgent();
  if (!agent) {
    return { success: false, error: 'No Moltbook agent registered. Please register an agent first.' };
  }

  if (agent.status !== 'active') {
    return { success: false, error: 'Agent is not active. Please complete the claim process first.' };
  }

  try {
    const https = require('https');
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const url = `${MOLTBOOK_BASE_URL}/api/v1/posts`;

    const postData = JSON.stringify({
      submolt: data.submolt.replace(/^m\//, ''), // Remove 'm/' prefix if present
      title: data.title,
      content: data.body, // Moltbook API uses 'content', not 'body'
    });

    console.log('[Main] 📤 Publishing post to Moltbook API...');
    console.log('[Main] 📤 URL:', url);
    console.log('[Main] 📤 Post data:', postData);
    console.log('[Main] 📤 Submolt value:', data.submolt);

    const result = await new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'WATAM-AI/2.0.0',
        },
        maxRedirects: 0,
      };

      const req = https.request(url, options, (res) => {
        let responseData = '';

        if (res.statusCode === 301 || res.statusCode === 302) {
          reject(new Error('Redirect detected'));
          return;
        }

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          console.log('[Main] Response status:', res.statusCode);
          console.log('[Main] Response data:', responseData);
          console.log('[Main] 📤 Original post data sent:', postData);
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const parsed = JSON.parse(responseData);
              console.log('[Main] Parsed response:', JSON.stringify(parsed, null, 2));
              
              // Debug: Check if body was included in response
              if (parsed.body || (parsed.post && parsed.post.body) || (parsed.data && parsed.data.body)) {
                console.log('[Main] ✅ Body found in response');
              } else {
                console.log('[Main] ⚠️ Body NOT found in response - this might be normal');
              }
              
              resolve(parsed);
            } catch (error) {
              console.error('[Main] JSON parse error:', error);
              reject(new Error('Invalid JSON response'));
            }
          } else {
            console.error('[Main] HTTP error:', res.statusCode, responseData);
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('[Main] Request error:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    // Save post locally
    console.log('=== PUBLISH RESPONSE DEBUG ===');
    console.log('Full response:', JSON.stringify(result, null, 2));
    console.log('Response keys:', Object.keys(result));
    
    // Moltbook API returns: { success: true, post: { id, title, content, ... } }
    // Try multiple possible ID locations in the response
    let postId = null;
    
    // Check all possible locations (most likely: result.post.id)
    if (result.post && result.post.id) {
      postId = result.post.id;
      console.log('✅ Found ID at result.post.id:', postId);
    } else if (result.id) {
      postId = result.id;
      console.log('✅ Found ID at result.id:', postId);
    } else if (result.data && result.data.id) {
      postId = result.data.id;
      console.log('✅ Found ID at result.data.id:', postId);
    } else if (result.post_id) {
      postId = result.post_id;
      console.log('✅ Found ID at result.post_id:', postId);
    } else if (result.postId) {
      postId = result.postId;
      console.log('✅ Found ID at result.postId:', postId);
    } else if (result.data && result.data.post && result.data.post.id) {
      postId = result.data.post.id;
      console.log('✅ Found ID at result.data.post.id:', postId);
    }
    
    if (!postId) {
      console.error('❌ WARNING: Could not find post ID in response!');
      console.error('📄 Full response:', JSON.stringify(result, null, 2));
      console.error('🔍 Response keys:', Object.keys(result));
      if (result.post) {
        console.error('🔍 Post object keys:', Object.keys(result.post));
      }
    } else {
      console.log('✅ Final extracted post ID:', postId);
    }
    
    // Moltbook URL format: /post/ID (not /s/submolt/p/ID)
    const postUrl = postId ? `${MOLTBOOK_BASE_URL}/post/${postId}` : null;
    
    console.log('Generated post URL:', postUrl);
    
    const post = {
      id: postId || Date.now(), // Use timestamp as fallback for local storage only
      submolt: data.submolt,
      title: data.title,
      body: data.body,
      publishedAt: new Date().toISOString(),
      url: postUrl,
      views: 0,
      comments: 0,
    };
    
    console.log('Saving post object:', JSON.stringify(post, null, 2));
    console.log('=== END DEBUG ===');
    
    // Send debug info to renderer
    mainWindow.webContents.executeJavaScript(`
      console.log('=== PUBLISH SUCCESS (from main) ===');
      console.log('Post ID:', ${JSON.stringify(postId)});
      console.log('Post URL:', ${JSON.stringify(postUrl)});
      console.log('Full post:', ${JSON.stringify(JSON.stringify(post, null, 2))});
    `);
    
    store.savePost(post);

    // Delete matching draft if exists (by title and body match)
    try {
      const drafts = store.getDrafts();
      const matchingDraft = drafts.find(d => 
        d.title === data.title && d.body === data.body
      );
      
      if (matchingDraft) {
        console.log('[Publish] Found matching draft to delete:', matchingDraft.id);
        store.deleteDraft(matchingDraft.id);
        console.log('[Publish] ✅ Draft deleted from Saved Drafts');
      } else {
        console.log('[Publish] No matching draft found to delete');
      }
    } catch (draftError) {
      console.warn('[Publish] Could not delete draft:', draftError.message);
      // Don't fail the publish if draft deletion fails
    }

    // Set rate limit info for successful posts (Moltbook has 30-minute limit)
    const rateLimitInfo = {
      timestamp: new Date().toISOString(),
      retryAfter: 30, // 30 minutes
      nextAllowedTime: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    store.set('lastRateLimit', rateLimitInfo);

    store.audit('post.published', { submolt: data.submolt, title: data.title, id: post.id });
    
    // Send rate limit info to frontend for countdown display
    if (mainWindow) {
      mainWindow.webContents.send('rate-limit-updated', {
        nextAllowedTime: rateLimitInfo.nextAllowedTime,
        minutesUntilNext: 30
      });
    }
    
    // Return success with rate limit info
    return { 
      success: true, 
      post,
      rateLimitInfo: {
        nextPostAllowed: rateLimitInfo.nextAllowedTime,
        minutesUntilNext: 30
      }
    };
  } catch (error) {
    console.error('Publish error:', error);
    store.audit('post.publish_failed', { error: error.message });
    
    // Parse error message if it's JSON
    let errorMessage = error.message;
    let isRateLimit = false;
    
    try {
      if (errorMessage.includes('{')) {
        const jsonStart = errorMessage.indexOf('{');
        const jsonStr = errorMessage.substring(jsonStart);
        const errorObj = JSON.parse(jsonStr);
        if (errorObj.error) {
          errorMessage = errorObj.error;
          if (errorObj.hint) {
            errorMessage += '. ' + errorObj.hint;
          }
          if (errorObj.retry_after_minutes) {
            isRateLimit = true;
            const retryMinutes = errorObj.retry_after_minutes;
            
            // Store rate limit info
            const rateLimitInfo = {
              timestamp: new Date().toISOString(),
              retryAfter: retryMinutes,
              nextAllowedTime: new Date(Date.now() + retryMinutes * 60 * 1000).toISOString()
            };
            store.set('lastRateLimit', rateLimitInfo);
            
            errorMessage += ` (Next post allowed at ${new Date(rateLimitInfo.nextAllowedTime).toLocaleTimeString()})`;
          }
        }
      }
    } catch (parseError) {
      // Keep original error message
    }
    
    // Check if this is a repeated rate limit warning
    if (isRateLimit) {
      const lastRateLimit = store.get('lastRateLimit');
      if (lastRateLimit && new Date(lastRateLimit.timestamp) > new Date(Date.now() - 5 * 60 * 1000)) {
        // If we got rate limited in the last 5 minutes, show a friendlier message
        errorMessage = `⏱️ Post rate limit active. Next post allowed at ${new Date(lastRateLimit.nextAllowedTime).toLocaleTimeString()}`;
      }
    }
    
    return { success: false, error: errorMessage };
  }
});

// Drafts handlers
ipcMain.handle('save-draft', async (event, draft) => {
  try {
    store.saveDraft(draft);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-drafts', async () => {
  try {
    const drafts = store.getDrafts();
    return { success: true, drafts };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-draft', async (event, id) => {
  try {
    const draft = store.getDrafts().find(d => d.id == id);
    store.deleteDraft(id);
    
    // Auto-cleanup: Remove queue item for this draft
    if (draft) {
      const queue = store.getPostQueue();
      const cleanedQueue = queue.filter(queueItem => 
        !(queueItem.title === draft.title && queueItem.body === draft.body)
      );
      
      if (cleanedQueue.length !== queue.length) {
        console.log('[Draft] Auto-cleaned queue after draft deletion');
        store.data.postQueue = cleanedQueue;
        store.save();
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Posts handlers
ipcMain.handle('get-posts', async () => {
  try {
    const posts = store.getPosts();
    return { success: true, posts };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-posts', async (event, posts) => {
  try {
    console.log('[Posts] ========================================');
    console.log('[Posts] save-posts handler called');
    console.log('[Posts] Received', posts.length, 'posts to save');
    
    if (!Array.isArray(posts)) {
      console.error('[Posts] ❌ Posts is not an array!');
      return { success: false, error: 'Posts must be an array' };
    }
    
    // Log first few posts to verify data
    console.log('[Posts] Sample posts being saved:');
    posts.slice(0, 3).forEach((post, i) => {
      console.log(`[Posts] Post ${i+1}:`, {
        id: post.id,
        title: post.title?.substring(0, 50),
        url: post.url
      });
    });
    
    // CRITICAL: Save directly to posts.json file (same as getPosts reads from)
    const postsPath = path.join(app.getPath('userData'), 'posts.json');
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
    console.log('[Posts] ✅ Saved', posts.length, 'posts to:', postsPath);
    
    // Also update the in-memory store for consistency
    store.set('posts', posts);
    
    // Verify the save worked
    const savedPosts = store.getPosts();
    console.log('[Posts] ✅ Verification: Read back', savedPosts.length, 'posts');
    console.log('[Posts] ========================================');
    
    return { success: true, count: posts.length };
  } catch (error) {
    console.error('[Posts] ❌ Failed to save posts:', error);
    return { success: false, error: error.message };
  }
});

// Post Queue handlers
ipcMain.handle('get-post-queue', async () => {
  try {
    const queue = store.getPostQueue();
    
    // REMOVED: Auto-cleanup - only manual cleanup now
    // This prevents spam in console logs
    
    return { success: true, queue };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Clean orphaned queue items
ipcMain.handle('clean-queue', async () => {
  try {
    const queue = store.getPostQueue();
    const drafts = store.getDrafts();
    
    console.log('[Queue] Cleaning queue...');
    console.log('[Queue] Current queue size:', queue.length);
    console.log('[Queue] Current drafts:', drafts.length);
    
    // Remove orphaned items and problematic submolts
    const cleanedQueue = queue.filter(queueItem => {
      // Remove items with problematic submolts
      if (queueItem.submolt === 'arttech' || queueItem.submolt === 'm/arttech') {
        console.log('[Queue] Removing problematic submolt item:', queueItem.title);
        return false;
      }
      
      // Keep non-queued items
      if (queueItem.status !== 'queued') return true;
      
      // Check if matching draft exists
      const hasDraft = drafts.some(draft => 
        draft.title === queueItem.title && 
        draft.body === queueItem.body
      );
      
      if (!hasDraft) {
        console.log('[Queue] Removing orphaned:', queueItem.title);
      }
      
      return hasDraft;
    });
    
    const removed = queue.length - cleanedQueue.length;
    
    if (removed > 0) {
      store.data.postQueue = cleanedQueue;
      store.save();
      console.log('[Queue] ✅ Cleaned', removed, 'orphaned items');
      return { success: true, removed, newSize: cleanedQueue.length };
    } else {
      console.log('[Queue] ✅ Queue is clean');
      return { success: true, removed: 0, newSize: cleanedQueue.length };
    }
  } catch (error) {
    console.error('[Queue] ❌ Clean failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-to-post-queue', async (event, post) => {
  try {
    const queueItem = store.addToPostQueue(post);
    if (queueItem) {
      console.log('[Queue] Post added to queue:', queueItem.title);
      
      // Start queue processor if not running
      startQueueProcessor();
      
      return { success: true, queueItem };
    } else {
      return { success: false, error: 'Failed to add to queue' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-from-post-queue', async (event, id) => {
  try {
    const success = store.removeFromPostQueue(id);
    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-auto-post', async (event, { draftId, enabled }) => {
  try {
    // Get draft and add/remove from queue
    const drafts = store.getDrafts();
    // Convert draftId to number if it's a string
    const numericDraftId = typeof draftId === 'string' ? parseInt(draftId) : draftId;
    const draft = drafts.find(d => d.id == numericDraftId); // Use == for loose comparison
    
    if (!draft) {
      console.error('[Queue] Draft not found:', draftId, 'Available drafts:', drafts.map(d => d.id));
      return { success: false, error: 'Draft not found' };
    }
    
    if (enabled) {
      // Add to queue
      const queueItem = store.addToPostQueue(draft);
      console.log('[Queue] Added to queue:', draft.title);
      return { success: true, queued: true, queueItem };
    } else {
      // Remove from queue
      const queue = store.getPostQueue();
      const queueItem = queue.find(q => q.title === draft.title && q.body === draft.body);
      if (queueItem) {
        store.removeFromPostQueue(queueItem.id);
        console.log('[Queue] Removed from queue:', draft.title);
      }
      return { success: true, queued: false };
    }
  } catch (error) {
    console.error('[Queue] Toggle auto-post error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reorder-queue', async (event, { draftId, direction, newOrder }) => {
  try {
    const queue = store.getPostQueue().filter(q => q.status === 'queued');
    const drafts = store.getDrafts();
    
    // NEW: Support for drag-drop newOrder array
    if (newOrder && Array.isArray(newOrder)) {
      console.log('[Queue] Reordering with newOrder array:', newOrder);
      
      // Map draft IDs to queue items
      const reorderedQueue = [];
      for (const draftIdStr of newOrder) {
        const numericDraftId = typeof draftIdStr === 'string' ? parseInt(draftIdStr) : draftIdStr;
        const draft = drafts.find(d => d.id == numericDraftId);
        
        if (draft) {
          // Find matching queue item
          const queueItem = queue.find(q => 
            q.title === draft.title && 
            q.body === draft.body && 
            q.status === 'queued'
          );
          
          if (queueItem) {
            reorderedQueue.push(queueItem);
          }
        }
      }
      
      if (reorderedQueue.length === 0) {
        return { success: false, error: 'No queue items found for reordering' };
      }
      
      // Update timestamps to reflect new order
      reorderedQueue.forEach((item, index) => {
        item.queuedAt = new Date(Date.now() + index).toISOString();
      });
      
      // Save back to store
      const allQueue = store.getPostQueue();
      const nonQueuedItems = allQueue.filter(q => q.status !== 'queued');
      store.data.postQueue = [...reorderedQueue, ...nonQueuedItems];
      store.save();
      
      console.log('[Queue] ✅ Queue reordered successfully');
      return { success: true };
    }
    
    // EXISTING: Support for up/down direction
    const numericDraftId = typeof draftId === 'string' ? parseInt(draftId) : draftId;
    const draft = drafts.find(d => d.id == numericDraftId);
    
    if (!draft) {
      return { success: false, error: 'Draft not found' };
    }
    
    // Find the queue item
    const queueItemIndex = queue.findIndex(q => q.title === draft.title && q.body === draft.body);
    
    if (queueItemIndex === -1) {
      return { success: false, error: 'Item not in queue' };
    }
    
    // Calculate new position
    let newIndex = queueItemIndex;
    if (direction === 'up' && queueItemIndex > 0) {
      newIndex = queueItemIndex - 1;
    } else if (direction === 'down' && queueItemIndex < queue.length - 1) {
      newIndex = queueItemIndex + 1;
    } else {
      return { success: false, error: 'Cannot move in that direction' };
    }
    
    // Swap items
    const item = queue[queueItemIndex];
    queue.splice(queueItemIndex, 1);
    queue.splice(newIndex, 0, item);
    
    // Update timestamps to reflect new order
    queue.forEach((item, index) => {
      item.queuedAt = new Date(Date.now() + index).toISOString();
    });
    
    // Save back to store
    const allQueue = store.getPostQueue();
    const nonQueuedItems = allQueue.filter(q => q.status !== 'queued');
    store.data.postQueue = [...queue, ...nonQueuedItems];
    store.save();
    
    console.log('[Queue] Reordered:', draft.title, direction);
    return { success: true };
  } catch (error) {
    console.error('[Queue] Reorder error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sync-posts', async () => {
  try {
    // Just return local posts - Moltbook API endpoints are not stable yet
    const posts = store.getPosts();
    console.log('[Sync] Returning', posts.length, 'local posts');
    return { success: true, count: posts.length, posts, source: 'local' };
  } catch (error) {
    console.error('[Sync] Sync posts error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-post-comments', async (event, postId) => {
  try {
    console.log('[Comments] Fetching comments for post:', postId);
    
    const https = require('https');
    
    // Moltbook API uses /api/v1/posts/{id} to get post with comments
    const comments = await new Promise((resolve, reject) => {
      // Set timeout for slow Moltbook server (2 minutes)
      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('⏱️ Moltbook server timeout (2 min). Server is very slow, please try again later.'));
      }, 120000);

      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/posts/${postId}`,
        method: 'GET',
        headers: {
          'User-Agent': 'WATAM-AI/2.0.0',
        },
      };

      // Try with auth if available
      const agent = store.getAgent();
      if (agent && agent.status === 'active') {
        const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
        options.headers['Authorization'] = `Bearer ${apiKey}`;
        console.log('[Comments] Using authentication');
      } else {
        console.log('[Comments] Fetching without authentication (public)');
      }

      const req = https.request(options, (res) => {
        clearTimeout(timeout);
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('[Comments] Response status:', res.statusCode);
          console.log('[Comments] Response data:', data.substring(0, 500));
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              // Comments are in the post object
              const commentsList = parsed.comments || parsed.post?.comments || [];
              console.log('[Comments] Found', commentsList.length, 'comments');
              resolve(commentsList);
            } catch (error) {
              console.error('[Comments] JSON parse error:', error);
              reject(new Error('Invalid JSON response'));
            }
          } else {
            console.error('[Comments] HTTP error:', res.statusCode, data);
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[Comments] Request error:', error);
        // Better error messages
        if (error.code === 'ECONNREFUSED') {
          reject(new Error('🔌 Cannot connect to Moltbook server. Server might be down.'));
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          reject(new Error('⏱️ Moltbook server is very slow. Please try again later.'));
        } else {
          reject(new Error(`🔌 Network error: ${error.message}`));
        }
      });

      req.end();
    });

    console.log('[Comments] Successfully fetched', comments.length, 'comments');
    
    // CRITICAL: Also fetch post stats (views, etc.) from the API response
    let viewCount = 0;
    try {
      // Re-parse the response to get post stats
      const https = require('https');
      const postData = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          req.destroy();
          reject(new Error('Timeout'));
        }, 30000);

        const options = {
          hostname: 'www.moltbook.com',
          path: `/api/v1/posts/${postId}`,
          method: 'GET',
          headers: {
            'User-Agent': 'WATAM-AI/2.0.0',
          },
        };

        const agent = store.getAgent();
        if (agent && agent.status === 'active') {
          const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
          options.headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const req = https.request(options, (res) => {
          clearTimeout(timeout);
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                const post = parsed.post || parsed;
                resolve({
                  views: post.views || post.view_count || 0,
                  upvotes: post.upvotes || post.upvote_count || 0,
                  comments: comments.length
                });
              } catch (e) {
                resolve({ views: 0, upvotes: 0, comments: comments.length });
              }
            } else {
              resolve({ views: 0, upvotes: 0, comments: comments.length });
            }
          });
        });
        req.on('error', () => resolve({ views: 0, upvotes: 0, comments: comments.length }));
        req.end();
      });
      
      viewCount = postData.views;
      console.log('[Comments] ✅ Post stats:', postData);
      
      // Update post with full stats
      const posts = store.getPosts();
      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex !== -1) {
        posts[postIndex].comments = postData.comments;
        posts[postIndex].views = postData.views;
        posts[postIndex].upvotes = postData.upvotes;
        
        // Save updated posts
        const postsPath = path.join(app.getPath('userData'), 'posts.json');
        fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
        console.log('[Comments] ✅ Updated post stats:', postId, '→', postData);
      }
    } catch (statsError) {
      console.warn('[Comments] Could not fetch post stats:', statsError.message);
    }
    
    // Update post comment count in local storage
    try {
      const posts = store.getPosts();
      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex !== -1) {
        posts[postIndex].comments = comments.length;
        if (viewCount > 0) posts[postIndex].views = viewCount;
        
        // Save updated posts
        const postsPath = path.join(app.getPath('userData'), 'posts.json');
        fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
        console.log('[Comments] ✅ Updated comment count for post:', postId, '→', comments.length);
      }
    } catch (updateError) {
      console.warn('[Comments] Could not update comment count:', updateError.message);
    }
    
    return { success: true, comments };
  } catch (error) {
    console.error('[Comments] Failed to fetch comments:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-agent-issues', async () => {
  try {
    console.log('[Debug] ========================================');
    console.log('[Debug] 🔧 AUTOMATIC ISSUE DIAGNOSIS & FIXING');
    console.log('[Debug] ========================================');
    
    let fixesApplied = [];
    let issuesFound = [];
    
    // Step 1: Check AI configuration
    console.log('[Debug] 1️⃣ Checking AI configuration...');
    const config = {
      aiProvider: store.get('aiProvider'),
      aiApiKey: store.get('aiApiKey'),
      aiModel: store.get('aiModel'),
      autoReplyEnabled: store.get('autoReplyEnabled', true),
    };
    
    if (!config.aiProvider) {
      issuesFound.push('No AI provider configured');
      console.log('[Debug] ❌ No AI provider configured');
    } else {
      console.log('[Debug] ✅ AI provider:', config.aiProvider);
    }
    
    if (config.aiProvider !== 'ollama' && !config.aiApiKey) {
      issuesFound.push('No AI API key configured');
      console.log('[Debug] ❌ No AI API key for provider:', config.aiProvider);
    } else if (config.aiProvider !== 'ollama') {
      console.log('[Debug] ✅ AI API key configured');
    }
    
    if (!config.autoReplyEnabled) {
      issuesFound.push('Auto-reply not enabled');
      console.log('[Debug] ❌ Auto-reply not enabled');
    } else {
      console.log('[Debug] ✅ Auto-reply enabled');
    }
    
    // Step 2: Check agent registration
    console.log('[Debug] 2️⃣ Checking agent registration...');
    const agent = store.getAgent();
    if (!agent) {
      issuesFound.push('No agent registered');
      console.log('[Debug] ❌ No agent registered');
    } else {
      console.log('[Debug] ✅ Agent registered:', agent.name);
      console.log('[Debug] 📊 Agent status:', agent.status);
      
      // Check agent status in real-time
      if (agent.status !== 'active') {
        console.log('[Debug] 🔄 Checking agent status in real-time...');
        try {
          const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
          const statusResult = await checkMoltbookStatus(apiKey, agent.name);
          
          if (statusResult.status === 'active') {
            console.log('[Debug] ✅ Agent status updated to active');
            agent.status = 'active';
            agent.lastCheckedAt = new Date().toISOString();
            store.saveAgent(agent);
            fixesApplied.push('Updated agent status to active');
          } else {
            issuesFound.push(`Agent status: ${statusResult.status}`);
            console.log('[Debug] ❌ Agent still not active:', statusResult.status);
          }
        } catch (error) {
          issuesFound.push('Agent status check failed');
          console.log('[Debug] ❌ Agent status check failed:', error.message);
        }
      }
    }
    
    // Step 3: Test feed access
    if (agent && agent.status === 'active') {
      console.log('[Debug] 3️⃣ Testing feed access...');
      try {
        const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
        const feed = await fetchMoltbookFeed(apiKey);
        
        if (feed && feed.posts) {
          console.log('[Debug] ✅ Feed access working, found', feed.posts.length, 'posts');
        } else {
          issuesFound.push('Feed access returns no posts');
          console.log('[Debug] ❌ Feed access returns no posts');
        }
      } catch (error) {
        issuesFound.push('Feed access failed');
        console.log('[Debug] ❌ Feed access failed:', error.message);
      }
    }
    
    // Step 4: Check Safe Mode
    console.log('[Debug] 4️⃣ Checking Safe Mode...');
    const safeMode = store.get('safeMode', true);
    if (safeMode) {
      issuesFound.push('Safe Mode is enabled (blocks posting)');
      console.log('[Debug] ⚠️ Safe Mode is enabled');
    } else {
      console.log('[Debug] ✅ Safe Mode is disabled');
    }
    
    // Step 5: Check rate limits
    console.log('[Debug] 5️⃣ Checking rate limits...');
    const lastRateLimit = store.get('lastRateLimit');
    if (lastRateLimit) {
      const nextAllowedTime = new Date(lastRateLimit.nextAllowedTime);
      const now = new Date();
      
      if (now < nextAllowedTime) {
        const minutesLeft = Math.ceil((nextAllowedTime - now) / (1000 * 60));
        issuesFound.push(`Rate limited for ${minutesLeft} more minutes`);
        console.log('[Debug] ⏱️ Rate limited for', minutesLeft, 'more minutes');
      } else {
        console.log('[Debug] ✅ No active rate limits');
        // Clear expired rate limit
        store.set('lastRateLimit', null);
        fixesApplied.push('Cleared expired rate limit');
      }
    } else {
      console.log('[Debug] ✅ No rate limits');
    }
    
    // Step 6: Check filters
    console.log('[Debug] 6️⃣ Checking filters...');
    const submolts = store.get('replySubmolts', '');
    const keywords = store.get('replyKeywords', '');
    
    if (!submolts && !keywords) {
      console.log('[Debug] ⚠️ No filters configured - agent will reply to all posts');
      console.log('[Debug] 💡 Consider adding submolt or keyword filters to be more selective');
    } else {
      console.log('[Debug] 📋 Filters configured:', {
        submolts: submolts || 'none',
        keywords: keywords || 'none',
      });
    }
    
    // Summary
    console.log('[Debug] ========================================');
    console.log('[Debug] 🔧 DIAGNOSIS COMPLETE');
    console.log('[Debug] Issues Found:', issuesFound.length);
    issuesFound.forEach((issue, i) => {
      console.log(`[Debug] ${i + 1}. ${issue}`);
    });
    console.log('[Debug] Fixes Applied:', fixesApplied.length);
    fixesApplied.forEach((fix, i) => {
      console.log(`[Debug] ${i + 1}. ${fix}`);
    });
    console.log('[Debug] ========================================');
    
    const recommendations = generateRecommendations(issuesFound);
    
    return {
      success: true,
      issuesFound,
      fixesApplied,
      recommendations,
    };
  } catch (error) {
    console.error('[Debug] ❌ Debug process failed:', error);
    return { success: false, error: error.message };
  }
});

function generateRecommendations(issues) {
  const recommendations = [];
  
  if (issues.some(i => i.includes('No AI provider'))) {
    recommendations.push('Go to AI Config tab and select an AI provider (Groq is free)');
  }
  
  if (issues.some(i => i.includes('No AI API key'))) {
    recommendations.push('Go to AI Config tab and add your AI API key');
  }
  
  if (issues.some(i => i.includes('Auto-reply not enabled'))) {
    recommendations.push('Go to AI Config tab and enable auto-reply');
  }
  
  if (issues.some(i => i.includes('No agent registered'))) {
    recommendations.push('Go to Settings tab and register a Moltbook agent');
  }
  
  if (issues.some(i => i.includes('Agent status'))) {
    recommendations.push('Go to Settings tab and complete the agent claim process on Moltbook');
  }
  
  if (issues.some(i => i.includes('Safe Mode'))) {
    recommendations.push('Disable Safe Mode in Settings to allow posting');
  }
  
  if (issues.some(i => i.includes('Rate limited'))) {
    recommendations.push('Wait for rate limit to expire, then try again');
  }
  
  if (issues.some(i => i.includes('Feed access'))) {
    recommendations.push('Check network connection and Moltbook server status');
  }
  
  if (issues.length === 0) {
    recommendations.push('Configuration looks good! Agent should be working properly.');
  }
  
  return recommendations;
}

ipcMain.handle('test-agent-loop', async () => {
  try {
    console.log('[Test] ========================================');
    console.log('[Test] 🧪 MANUAL AGENT LOOP TEST TRIGGERED');
    console.log('[Test] ========================================');
    
    // Check configuration first
    const config = {
      aiProvider: store.get('aiProvider'),
      aiApiKey: store.get('aiApiKey'),
      aiModel: store.get('aiModel'),
      autoReplyEnabled: store.get('autoReplyEnabled', true),
      replySubmolts: store.get('replySubmolts', 'general,music,art,finance'),
      replyKeywords: store.get('replyKeywords', ''), // EMPTY - reply to all posts
      maxRepliesPerHour: store.get('maxRepliesPerHour', 10),
    };
    
    console.log('[Test] 📋 Configuration check:', {
      hasAiProvider: !!config.aiProvider,
      hasApiKey: !!config.aiApiKey,
      hasModel: !!config.aiModel,
      autoReplyEnabled: config.autoReplyEnabled,
      hasSubmolts: !!config.replySubmolts,
      hasKeywords: !!config.replyKeywords,
      maxPerHour: config.maxRepliesPerHour,
    });
    
    // Check agent status
    const agent = store.getAgent();
    console.log('[Test] 👤 Agent check:', {
      hasAgent: !!agent,
      agentName: agent?.name,
      agentStatus: agent?.status,
      lastChecked: agent?.lastCheckedAt,
    });
    
    // Check rate limits
    console.log('[Test] ⏱️ Rate limit check:', {
      repliesThisHour: agentRepliesThisHour,
      maxPerHour: config.maxRepliesPerHour,
      isRateLimited: agentRepliesThisHour >= config.maxRepliesPerHour,
    });
    
    // Run the actual agent loop
    console.log('[Test] 🚀 Running agent loop...');
    await runAgentLoop();
    
    console.log('[Test] ========================================');
    console.log('[Test] ✅ AGENT LOOP TEST COMPLETED');
    console.log('[Test] ========================================');
    
    return { success: true, message: 'Agent loop test completed - check console for detailed logs' };
  } catch (error) {
    console.error('[Test] ❌ Agent loop test failed:', error);
    console.error('[Test] ========================================');
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-moltbook-connection', async () => {
  try {
    console.log('[Test] ========================================');
    console.log('[Test] COMPREHENSIVE MOLTBOOK CONNECTION TEST');
    console.log('[Test] ========================================');
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    console.log('[Test] Testing with API key:', maskApiKey(apiKey));
    
    // Run comprehensive debugging
    const debugResults = await debugApiKeyIssues(apiKey);
    
    const results = {
      agentStatus: debugResults.agentStatus,
      agentPosts: debugResults.permissions,
      testPost: debugResults.directPostTest,
      safeMode: store.get('safeMode', true),
      apiKeyFormat: debugResults.apiKeyFormat,
      recommendations: debugResults.recommendations,
    };
    
    console.log('[Test] ========================================');
    console.log('[Test] TEST RESULTS SUMMARY:');
    console.log('[Test] API Key Format:', debugResults.apiKeyFormat?.valid ? '✅' : '❌');
    console.log('[Test] Agent Status:', debugResults.agentStatus?.success ? '✅' : '❌');
    console.log('[Test] Agent Posts:', debugResults.permissions?.canPost ? '✅' : '❌');
    console.log('[Test] Safe Mode:', results.safeMode ? '🔒 ON' : '🔓 OFF');
    console.log('[Test] Recommendations:');
    debugResults.recommendations.forEach((rec, i) => {
      console.log(`[Test] ${i + 1}. ${rec}`);
    });
    console.log('[Test] ========================================');
    
    return { success: true, results };
  } catch (error) {
    console.error('[Test] ❌ Connection test failed:', error);
    return { success: false, error: error.message };
  }
});

// Test heartbeat functionality
ipcMain.handle('test-heartbeat', async () => {
  try {
    console.log('[Test] ========================================');
    console.log('[Test] MOLTBOOK HEARTBEAT TEST');
    console.log('[Test] ========================================');
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    console.log('[Test] Testing heartbeat with API key:', maskApiKey(apiKey));
    
    // Test heartbeat
    const heartbeatResult = await checkMoltbookStatus(apiKey, agent.name);
    
    // FIXED: checkMoltbookStatus returns {status, agent}, not {success}
    const isSuccess = heartbeatResult.status === 'active';
    
    console.log('[Test] Heartbeat Result:', isSuccess ? '✅' : '❌');
    console.log('[Test] Status:', heartbeatResult.status);
    if (isSuccess && heartbeatResult.agent) {
      console.log('[Test] Agent Name:', heartbeatResult.agent.name);
      console.log('[Test] Agent Status:', heartbeatResult.agent.status);
      console.log('[Test] Karma:', heartbeatResult.agent.karma);
      console.log('[Test] Followers:', heartbeatResult.agent.followers);
      console.log('[Test] Following:', heartbeatResult.agent.following);
    } else {
      console.log('[Test] Error:', heartbeatResult.message || 'Agent not active');
    }
    
    console.log('[Test] ========================================');
    
    return { 
      success: isSuccess, 
      agent: heartbeatResult.agent || null,
      message: isSuccess ? 'Heartbeat successful! Agent is active.' : `Heartbeat failed: ${heartbeatResult.message || 'Agent not active'}`,
      error: isSuccess ? null : (heartbeatResult.message || 'Agent not active')
    };
  } catch (error) {
    console.error('[Test] ❌ Heartbeat test failed:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
});

// Get agent status from Moltbook (for Dashboard stats)
ipcMain.handle('get-agent-status', async () => {
  try {
    console.log('[AgentStatus] Fetching agent status from Moltbook...');
    
    const agent = store.getAgent();
    if (!agent) {
      console.warn('[AgentStatus] No agent registered');
      return { success: false, error: 'No agent registered', statusCode: 404 };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    
    // CRITICAL: Use /api/v1/agents/profile?name=AGENT_NAME to get accurate follower/following counts
    // The /api/v1/agents/me endpoint might not include these fields
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/profile?name=${encodeURIComponent(agent.name)}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      console.log('[AgentStatus] 📡 Fetching profile from:', options.path);
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            console.log('[AgentStatus] 📋 Response status:', res.statusCode);
            
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('[AgentStatus] 📄 Raw response:', JSON.stringify(result, null, 2));
              
              // API returns { success: true, agent: {...} }
              if (result.success && result.agent) {
                const agentData = result.agent;
                
                console.log('[AgentStatus] ✅ Agent stats fetched:', {
                  karma: agentData.karma,
                  follower_count: agentData.follower_count,
                  following_count: agentData.following_count
                });
                
                resolve({
                  success: true,
                  statusCode: res.statusCode,
                  agent: {
                    name: agentData.name,
                    karma: agentData.karma || 0,
                    follower_count: agentData.follower_count || 0,
                    following_count: agentData.following_count || 0,
                    status: agentData.is_active ? 'active' : 'inactive'
                  }
                });
              } else {
                console.error('[AgentStatus] ❌ Invalid response structure');
                resolve({ success: false, error: 'Invalid response structure', statusCode: res.statusCode });
              }
            } else {
              console.error('[AgentStatus] ❌ HTTP error:', res.statusCode, data);
              resolve({ success: false, error: `HTTP ${res.statusCode}`, statusCode: res.statusCode });
            }
          } catch (error) {
            console.error('[AgentStatus] ❌ Parse error:', error);
            resolve({ success: false, error: error.message, statusCode: 500 });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[AgentStatus] ❌ Request error:', error);
        resolve({ success: false, error: error.message, statusCode: 500 });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[AgentStatus] ❌ Failed to fetch agent status:', error);
    return { success: false, error: error.message, statusCode: 500 };
  }
});

// Get submolts from Moltbook API
ipcMain.handle('get-submolts', async () => {
  try {
    console.log('[Submolts] Fetching submolts from Moltbook...');
    
    const agent = store.getAgent();
    if (!agent) {
      console.warn('[Submolts] No agent registered, fetching public submolts');
    }
    
    const https = require('https');
    const url = new URL(`${MOLTBOOK_BASE_URL}/api/v1/submolts`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {}
    };
    
    // Add auth header if agent exists
    if (agent && agent.apiKeyObfuscated) {
      const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
      options.headers['Authorization'] = `Bearer ${apiKey}`;
      console.log('[Submolts] Using authenticated request');
    }
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[Submolts] Response status:', res.statusCode);
          console.log('[Submolts] Response data (first 200 chars):', data.substring(0, 200));
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('[Submolts] Parsed data type:', typeof parsed);
              console.log('[Submolts] Is array:', Array.isArray(parsed));
              
              // Handle different response formats
              let submolts = null;
              if (Array.isArray(parsed)) {
                submolts = parsed;
              } else if (parsed.submolts && Array.isArray(parsed.submolts)) {
                submolts = parsed.submolts;
              } else if (parsed.data && Array.isArray(parsed.data)) {
                submolts = parsed.data;
              }
              
              if (submolts && Array.isArray(submolts)) {
                console.log('[Submolts] ✅ Fetched', submolts.length, 'submolts');
                
                // Clean submolt names: remove 'm/' prefix if present
                submolts = submolts.map(s => {
                  if (s.name && s.name.startsWith('m/')) {
                    console.log('[Submolts] 🔧 Cleaning submolt name:', s.name, '→', s.name.substring(2));
                    return { ...s, name: s.name.substring(2) };
                  }
                  return s;
                });
                
                // Log owned/moderated submolts
                const ownedSubmolts = submolts.filter(s => s.your_role === 'owner' || s.your_role === 'moderator');
                console.log('[Submolts] Found', ownedSubmolts.length, 'owned/moderated submolts:', ownedSubmolts.map(s => s.name));
                
                resolve({ success: true, submolts });
              } else {
                console.error('[Submolts] ❌ Invalid response format');
                resolve({ success: false, error: 'Invalid response format' });
              }
            } catch (e) {
              console.error('[Submolts] ❌ JSON parse error:', e);
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            console.error('[Submolts] ❌ HTTP', res.statusCode);
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[Submolts] ❌ Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Submolts] ❌ Failed to fetch submolts:', error);
    return { success: false, error: error.message };
  }
});

// Create new submolt
ipcMain.handle('create-submolt', async (event, { name, displayName, description }) => {
  try {
    console.log('[Submolt] Creating new submolt:', name);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    const postData = JSON.stringify({
      name: name.toLowerCase().trim(),
      display_name: displayName.trim(),
      description: description.trim()
    });
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: '/api/v1/submolts',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[Submolt] Response status:', res.statusCode);
          console.log('[Submolt] Response data:', data);
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: true, submolt: parsed.submolt || parsed });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}: ${data}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[Submolt] Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('[Submolt] ❌ Failed to create submolt:', error);
    return { success: false, error: error.message };
  }
});

// Get submolt info
ipcMain.handle('get-submolt-info', async (event, { name }) => {
  try {
    console.log('[Submolt] Getting info for:', name);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/submolts/${name}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: true, submolt: parsed });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update submolt settings
ipcMain.handle('update-submolt-settings', async (event, { submoltName, description, bannerColor, themeColor }) => {
  try {
    console.log('[Submolt] Updating settings for:', submoltName);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (bannerColor) updateData.banner_color = bannerColor;
    if (themeColor) updateData.theme_color = themeColor;
    
    const postData = JSON.stringify(updateData);
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/submolts/${submoltName}/settings`,
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: true, submolt: parsed });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Upload submolt image (avatar or banner)
ipcMain.handle('upload-submolt-image', async (event, { submoltName, filePath, type }) => {
  try {
    console.log('[Submolt] Uploading', type, 'for:', submoltName);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Build multipart form data
    const formData = [];
    formData.push(`--${boundary}\r\n`);
    formData.push(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`);
    formData.push(`Content-Type: ${type === 'avatar' ? 'image/png' : 'image/jpeg'}\r\n\r\n`);
    
    const header = Buffer.from(formData.join(''));
    const footer = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\n${type}\r\n--${boundary}--\r\n`);
    const postData = Buffer.concat([header, fileBuffer, footer]);
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/submolts/${submoltName}/settings`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': postData.length,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: true, submolt: parsed });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Pin a post
ipcMain.handle('pin-post', async (event, { postId }) => {
  try {
    console.log('[Submolt] Pinning post:', postId);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/posts/${postId}/pin`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Unpin a post
ipcMain.handle('unpin-post', async (event, { postId }) => {
  try {
    console.log('[Submolt] Unpinning post:', postId);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/posts/${postId}/pin`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Add moderator
ipcMain.handle('add-moderator', async (event, { submoltName, agentName, role }) => {
  try {
    console.log('[Submolt] Adding moderator:', agentName, 'to', submoltName);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    const postData = JSON.stringify({
      agent_name: agentName,
      role: role || 'moderator'
    });
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/submolts/${submoltName}/moderators`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Remove moderator
ipcMain.handle('remove-moderator', async (event, { submoltName, agentName }) => {
  try {
    console.log('[Submolt] Removing moderator:', agentName, 'from', submoltName);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    const postData = JSON.stringify({
      agent_name: agentName
    });
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/submolts/${submoltName}/moderators`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// List moderators
ipcMain.handle('list-moderators', async (event, { submoltName }) => {
  try {
    console.log('[Submolt] Listing moderators for:', submoltName);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/submolts/${submoltName}/moderators`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: true, moderators: parsed.moderators || parsed });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// USER MANAGEMENT API HANDLERS
// ============================================

// Search users
ipcMain.handle('search-users', async (event, { query }) => {
  try {
    console.log('[UserSearch] Searching for:', query);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    const encodedQuery = encodeURIComponent(query);
    
    return new Promise((resolve) => {
      // Try different search endpoints
      const searchPaths = [
        `/api/v1/search?q=${encodedQuery}&type=agents&limit=20`,
        `/api/v1/search?q=${encodedQuery}&type=users&limit=20`,
        `/api/v1/search?q=${encodedQuery}&limit=20`,
        `/api/v1/agents/search?q=${encodedQuery}&limit=20`
      ];
      
      let currentPathIndex = 0;
      
      const tryNextPath = () => {
        if (currentPathIndex >= searchPaths.length) {
          resolve({ success: false, error: 'All search endpoints failed' });
          return;
        }
        
        const path = searchPaths[currentPathIndex];
        console.log('[UserSearch] Trying path:', path);
        
        const options = {
          hostname: 'www.moltbook.com',
          path: path,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'WATAM-AI/1.3.2',
          },
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            console.log('[UserSearch] Response status:', res.statusCode, 'for path:', path);
            
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                const results = parsed.results || parsed.agents || parsed.users || [];
                console.log('[UserSearch] ✅ Found results:', results.length);
                resolve({ success: true, results: results });
                return;
              } catch (e) {
                console.error('[UserSearch] JSON parse error:', e);
                currentPathIndex++;
                tryNextPath();
                return;
              }
            } else if (res.statusCode === 500 || res.statusCode === 404) {
              console.log('[UserSearch] ⚠️ Path failed, trying next...');
              currentPathIndex++;
              tryNextPath();
              return;
            } else {
              resolve({ success: false, error: `HTTP ${res.statusCode}`, statusCode: res.statusCode });
              return;
            }
          });
        });
        
        req.on('error', (e) => {
          console.error('[UserSearch] Request error:', e);
          currentPathIndex++;
          tryNextPath();
        });
        
        req.setTimeout(10000, () => {
          console.log('[UserSearch] Request timeout');
          req.destroy();
          currentPathIndex++;
          tryNextPath();
        });
        
        req.end();
      };
      
      tryNextPath();
    });
  } catch (error) {
    console.error('[UserSearch] ❌ Failed:', error);
    return { success: false, error: error.message };
  }
});

// Get user profile
ipcMain.handle('get-user-profile', async (event, { username }) => {
  try {
    console.log('[UserProfile] Getting profile for:', username);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/profile?name=${encodeURIComponent(username)}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[UserProfile] Response status:', res.statusCode);
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('[UserProfile] Profile loaded:', parsed.name);
              resolve({ success: true, profile: parsed });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[UserProfile] Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[UserProfile] ❌ Failed:', error);
    return { success: false, error: error.message };
  }
});

// Follow user
ipcMain.handle('follow-user', async (event, username) => {
  try {
    console.log('[Follow] Following user:', username);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/${encodeURIComponent(username)}/follow`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[Follow] Response status:', res.statusCode);
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const parsed = JSON.parse(data);
              console.log('[Follow] ✅ Followed:', username);
              resolve({ success: true, message: parsed.message || 'Followed successfully' });
            } catch (e) {
              resolve({ success: true, message: 'Followed successfully' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[Follow] Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Follow] ❌ Failed:', error);
    return { success: false, error: error.message };
  }
});

// Unfollow user
ipcMain.handle('unfollow-user', async (event, username) => {
  try {
    console.log('[Unfollow] Unfollowing user:', username);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/${encodeURIComponent(username)}/follow`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[Unfollow] Response status:', res.statusCode);
          
          if (res.statusCode === 200 || res.statusCode === 204) {
            try {
              const parsed = JSON.parse(data);
              console.log('[Unfollow] ✅ Unfollowed:', username);
              resolve({ success: true, message: parsed.message || 'Unfollowed successfully' });
            } catch (e) {
              resolve({ success: true, message: 'Unfollowed successfully' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[Unfollow] Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Unfollow] ❌ Failed:', error);
    return { success: false, error: error.message };
  }
});

// Search user (single user by exact name)
ipcMain.handle('search-user', async (event, username) => {
  try {
    console.log('[UserSearch] Searching for user:', username);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      // CORRECT ENDPOINT: /api/v1/agents/profile?name=USERNAME
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/profile?name=${encodeURIComponent(username)}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              const user = result.agent; // API returns { success: true, agent: {...} }
              
              if (!user) {
                console.log('[UserSearch] User not found:', username);
                resolve({ success: true, user: null });
                return;
              }
              
              console.log('[UserSearch] ✅ User found:', user.name);
              
              // Check if we're following this user
              const following = store.get('following', []);
              const isFollowing = following.includes(username);
              
              resolve({ success: true, user, isFollowing });
            } else if (res.statusCode === 404) {
              console.log('[UserSearch] User not found:', username);
              resolve({ success: true, user: null });
            } else {
              console.error('[UserSearch] ❌ Failed:', res.statusCode, data);
              try {
                const errorData = JSON.parse(data);
                resolve({ success: false, error: errorData.error || `HTTP ${res.statusCode}` });
              } catch (e) {
                resolve({ success: false, error: `HTTP ${res.statusCode}` });
              }
            }
          } catch (error) {
            console.error('[UserSearch] ❌ Parse error:', error);
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[UserSearch] ❌ Request error:', error);
        resolve({ success: false, error: error.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[UserSearch] ❌ Exception:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// END USER MANAGEMENT API HANDLERS
// ============================================

ipcMain.handle('reply-to-post', async (event, { postId, body, commentId }) => {
  try {
    console.log('[Reply] ========================================');
    console.log('[Reply] Replying to post:', postId);
    console.log('[Reply] Reply body length:', body.length);
    console.log('[Reply] ⚠️ KNOWN ISSUE: Moltbook API has a bug with comment endpoints');
    console.log('[Reply] Dynamic routes (/posts/{id}/comments) may fail with "Authentication required"');
    console.log('[Reply] This is a Moltbook platform issue, not our app issue');
    console.log('[Reply] See: https://moltbookai.net/en/post/ea614230-ac33-4fa9-8d8a-22088a347930');
    
    const agent = store.getAgent();
    if (!agent) {
      console.error('[Reply] ❌ No agent registered');
      return { success: false, error: 'No agent registered. Please register an agent in Settings first.' };
    }

    console.log('[Reply] Agent found:', {
      name: agent.name,
      status: agent.status,
      hasApiKey: !!agent.apiKeyObfuscated,
      lastChecked: agent.lastCheckedAt,
    });

    // Check agent status in real-time before posting
    console.log('[Reply] Checking agent status in real-time...');
    try {
      const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
      console.log('[Reply] Deobfuscated API key:', maskApiKey(apiKey));
      
      const statusCheck = await checkMoltbookStatus(apiKey, agent.name);
      console.log('[Reply] Agent status check result:', {
        status: statusCheck.status,
        statusCode: statusCheck.statusCode,
        hasData: !!statusCheck.data,
      });
      
      if (statusCheck.status !== 'active') {
        console.error('[Reply] ❌ Agent not active:', statusCheck.status);
        console.error('[Reply] 💡 SOLUTION STEPS:');
        console.error('[Reply] 1. Go to Settings tab');
        console.error('[Reply] 2. Find your Claim URL and Verification Code');
        console.error('[Reply] 3. Open the Claim URL in browser');
        console.error('[Reply] 4. Complete the claim process on Moltbook');
        console.error('[Reply] 5. Return to Settings and click "Check Status"');
        
        if (statusCheck.status === 'claim_pending') {
          return { success: false, error: '⚠️ Claim not completed. Please complete the claim process on Moltbook first. Check Settings for Claim URL.' };
        } else if (statusCheck.status === 'error') {
          return { success: false, error: '❌ Agent status: error. This means the claim is not completed. Please complete the claim process on Moltbook first. Check Settings for Claim URL.' };
        } else {
          return { success: false, error: `⚠️ Agent status: ${statusCheck.status}. Please check Settings and complete claim process.` };
        }
      }
      
      // Update agent status
      agent.status = statusCheck.status;
      agent.lastCheckedAt = new Date().toISOString();
      store.saveAgent(agent);
      console.log('[Reply] ✅ Agent status confirmed as ACTIVE');
      
      // ADDITIONAL TEST: Try to fetch the agent's own posts to verify POST permissions
      console.log('[Reply] Testing API key permissions with agent posts...');
      try {
        const testResult = await testApiKeyPermissions(apiKey);
        console.log('[Reply] API key permissions test:', testResult);
        if (!testResult.canPost) {
          console.error('[Reply] ❌ API key lacks POST permissions');
          return { success: false, error: '❌ API key lacks permission to post. Please re-claim your agent on Moltbook.' };
        }
      } catch (testError) {
        console.warn('[Reply] ⚠️ Could not test API key permissions:', testError.message);
        // Continue anyway - the test might fail for other reasons
      }
      
    } catch (statusError) {
      console.error('[Reply] ❌ Status check failed:', statusError.message);
      
      // If it's a Moltbook server error, show that
      if (statusError.message.includes('Moltbook') || statusError.message.includes('timeout') || statusError.message.includes('connect')) {
        return { success: false, error: statusError.message };
      }
      
      // Check cached status - if not active, don't allow posting
      if (agent.status !== 'active') {
        console.error('[Reply] ❌ Cached agent status is not active:', agent.status);
        return { success: false, error: '❌ Agent status check failed and cached status is not active. Please check Settings and verify your agent is claimed.' };
      }
      
      // Otherwise continue with cached status if it's active
      console.warn('[Reply] ⚠️ Using cached agent status (active) due to status check error');
    }

    const safeMode = store.get('safeMode', true);
    console.log('[Reply] Safe Mode status:', safeMode);
    console.log('[Reply] Safe Mode config value:', store.get('safeMode'));
    
    if (safeMode) {
      console.error('[Reply] ❌ Safe Mode is enabled - cannot post replies');
      return { success: false, error: 'Safe Mode is enabled. Disable it in Settings to post replies.' };
    }
    
    console.log('[Reply] ✅ Safe Mode is disabled - proceeding with reply');

    const https = require('https');
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    console.log('[Reply] Using API key for POST request:', maskApiKey(apiKey));

    // Build request body - add parent_id if replying to a comment
    const requestBody = { content: body };
    if (commentId) {
      requestBody.parent_id = commentId;
      console.log('[Reply] Adding parent_id for nested reply:', commentId);
    }
    const postData = JSON.stringify(requestBody);

    const result = await new Promise((resolve, reject) => {
      // Set timeout for slow Moltbook server (2 minutes)
      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('⏱️ Moltbook server timeout (2 min). Server is very slow, please try again later.'));
      }, 120000);

      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/posts/${postId}/comments`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'WATAM-AI/2.0.0',
        },
      };

      console.log('[Reply] POST Request:', {
        hostname: options.hostname,
        path: options.path,
        method: options.method,
        hasAuth: !!options.headers.Authorization,
        authPrefix: options.headers.Authorization.substring(0, 20) + '...',
        contentLength: options.headers['Content-Length'],
      });

      const req = https.request(options, (res) => {
        clearTimeout(timeout);
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('[Reply] Response status:', res.statusCode);
          console.log('[Reply] Response headers:', JSON.stringify(res.headers, null, 2));
          console.log('[Reply] Response body:', data.substring(0, 500));
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const parsed = JSON.parse(data);
              console.log('[Reply] ✅ Comment posted successfully');
              resolve(parsed);
            } catch (error) {
              console.error('[Reply] ❌ JSON parse error:', error);
              reject(new Error('Invalid JSON response'));
            }
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            console.error('[Reply] ❌ Authentication error:', res.statusCode);
            console.error('[Reply] Response body:', data);
            console.error('[Reply] This means:');
            if (res.statusCode === 401) {
              console.error('[Reply] - API key is invalid or expired');
              console.error('[Reply] - Agent claim might not be completed');
              console.error('[Reply] - API key might be corrupted in storage');
              console.error('[Reply] 💡 SOLUTION: Try resetting agent and re-registering');
            } else {
              console.error('[Reply] - API key is valid but lacks permission to post');
              console.error('[Reply] - Agent might not have comment permissions');
              console.error('[Reply] 💡 SOLUTION: Complete claim process on Moltbook website');
            }
            
            // Try to provide more specific error message based on response
            let errorMsg = '⚠️ Authentication failed.';
            try {
              const errorData = JSON.parse(data);
              if (errorData.message) {
                errorMsg += ` ${errorData.message}`;
              } else if (errorData.error) {
                errorMsg += ` ${errorData.error}`;
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
            errorMsg += ' Please complete the claim process on Moltbook.';
            
            reject(new Error(errorMsg));
          } else {
            console.error('[Reply] ❌ HTTP error:', res.statusCode, data);
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[Reply] ❌ Request error:', error);
        // Better error messages
        if (error.code === 'ECONNREFUSED') {
          reject(new Error('🔌 Cannot connect to Moltbook server. Server might be down.'));
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          reject(new Error('⏱️ Moltbook server is very slow. Please try again later.'));
        } else {
          reject(new Error(`🔌 Network error: ${error.message}`));
        }
      });

      req.write(postData);
      req.end();
    });

    store.audit('comment.posted', { postId, body: body.substring(0, 100) });
    console.log('[Reply] ✅ Comment posted successfully');
    console.log('[Reply] ========================================');
    return { success: true, comment: result };
  } catch (error) {
    console.error('[Reply] ❌ Failed to post comment:', error);
    console.error('[Reply] ========================================');
    store.audit('comment.failed', { postId, error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reply-to-comment', async (event, { postId, commentId, body }) => {
  try {
    const agent = store.getAgent();
    if (!agent || agent.status !== 'active') {
      return { success: false, error: 'Agent not active' };
    }

    const safeMode = store.get('safeMode', true);
    if (safeMode) {
      return { success: false, error: 'Safe Mode is enabled' };
    }

    const https = require('https');
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);

    const postData = JSON.stringify({ content: body }); // Moltbook API uses 'content'

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/comments/${commentId}/replies`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'WATAM-AI/2.0.0',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    store.audit('reply.posted', { postId, commentId, body });
    return { success: true, reply: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-post', async (event, postId) => {
  try {
    const success = store.deletePost(postId);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to delete post' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-post-details', async (event, postId) => {
  try {
    console.log('[PostDetails] 🔍 Fetching post details for ID:', postId);
    
    const https = require('https');
    
    // Try with authentication first if agent is available
    const agent = store.getAgent();
    const hasAuth = agent && agent.status === 'active';
    
    console.log('[PostDetails] 🔑 Authentication available:', hasAuth);

    const post = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/posts/${postId}`,
        method: 'GET',
        headers: {
          'User-Agent': 'WATAM-AI/2.0.0',
        },
      };

      // Add auth if available
      if (hasAuth) {
        const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
        options.headers['Authorization'] = `Bearer ${apiKey}`;
        console.log('[PostDetails] 🔐 Using authenticated request');
      } else {
        console.log('[PostDetails] 🌐 Using public request');
      }

      console.log('[PostDetails] 📡 Request:', {
        hostname: options.hostname,
        path: options.path,
        hasAuth: !!options.headers.Authorization
      });

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('[PostDetails] 📡 Response Status:', res.statusCode);
          console.log('[PostDetails] 📄 Response Body (first 500 chars):', data.substring(0, 500));
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('[PostDetails] 🔍 Parsed Response Structure:', {
                hasPost: !!parsed.post,
                hasId: !!parsed.id,
                hasTitle: !!parsed.title,
                hasData: !!parsed.data,
                keys: Object.keys(parsed),
                fullStructure: JSON.stringify(parsed, null, 2)
              });
              
              // Handle different possible response structures from Moltbook API
              let actualPost = null;
              
              // Structure 1: Direct post object
              if (parsed.id && (parsed.title || parsed.body)) {
                actualPost = parsed;
                console.log('[PostDetails] ✅ Found direct post object');
              }
              // Structure 2: Nested post field
              else if (parsed.post && typeof parsed.post === 'object') {
                actualPost = parsed.post;
                console.log('[PostDetails] ✅ Found nested post object');
              }
              // Structure 3: Data wrapper
              else if (parsed.data && (parsed.data.id || parsed.data.title)) {
                actualPost = parsed.data;
                console.log('[PostDetails] ✅ Found post in data wrapper');
              }
              // Structure 4: Success wrapper with post
              else if (parsed.success && parsed.post) {
                actualPost = parsed.post;
                console.log('[PostDetails] ✅ Found post with success wrapper');
              }
              
              if (actualPost) {
                console.log('[PostDetails] ✅ Successfully extracted post:', {
                  id: actualPost.id,
                  title: actualPost.title?.substring(0, 50) || 'No title',
                  hasBody: !!actualPost.body,
                  bodyLength: actualPost.body?.length || 0,
                  submolt: actualPost.submolt
                });
                resolve(actualPost);
              } else {
                console.error('[PostDetails] ❌ Could not extract post from response');
                console.error('[PostDetails] 🔍 Response structure:', JSON.stringify(parsed, null, 2));
                reject(new Error('Post not found in API response - response structure might have changed'));
              }
            } catch (error) {
              console.error('[PostDetails] ❌ JSON parse error:', error.message);
              console.error('[PostDetails] 📄 Raw response:', data.substring(0, 200));
              reject(new Error('Invalid JSON response from Moltbook API'));
            }
          } else if (res.statusCode === 404) {
            console.error('[PostDetails] ❌ Post not found (404)');
            reject(new Error('Post not found - it might have been deleted or the ID is incorrect'));
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            console.error('[PostDetails] ❌ Authentication error:', res.statusCode);
            reject(new Error('Authentication failed - post might be private or agent not authorized'));
          } else {
            console.error('[PostDetails] ❌ HTTP error:', res.statusCode, data.substring(0, 200));
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('[PostDetails] ❌ Request error:', error);
        if (error.code === 'ECONNREFUSED') {
          reject(new Error('Cannot connect to Moltbook server - server might be down'));
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          reject(new Error('Moltbook server timeout - server is very slow'));
        } else {
          reject(new Error(`Network error: ${error.message}`));
        }
      });

      req.end();
    });

    console.log('[PostDetails] ✅ Post fetch completed successfully');
    return { success: true, post };
  } catch (error) {
    console.error('[PostDetails] ❌ Failed to fetch post:', error.message);
    return { success: false, error: error.message };
  }
});

// Logs handler
ipcMain.handle('get-logs', async () => {
  try {
    const logs = store.getLogs();
    return { success: true, logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open external URL
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-stats', async () => {
  try {
    const result = await runCliCommand('stats');
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('security-status', async () => {
  try {
    const result = await runCliCommand('security-status');
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// AI Agent IPC Handlers
ipcMain.handle('test-ai-connection', async (event, { provider, apiKey, model }) => {
  try {
    console.log('[AI] Testing connection:', provider, model);
    store.audit('ai.test_connection', { provider, model });
    
    const https = require('https');
    
    // Test based on provider
    if (provider === 'openai') {
      const result = await testOpenAI(apiKey, model);
      return result;
    } else if (provider === 'groq') {
      const result = await testGroq(apiKey, model);
      return result;
    } else if (provider === 'together') {
      const result = await testTogether(apiKey, model);
      return result;
    } else if (provider === 'huggingface') {
      const result = await testHuggingFace(apiKey, model);
      return result;
    } else if (provider === 'anthropic') {
      const result = await testAnthropic(apiKey, model);
      return result;
    } else if (provider === 'google') {
      const result = await testGoogle(apiKey);
      return result;
    } else if (provider === 'ollama') {
      const result = await testOllama(model);
      return result;
    }
    
    return { success: false, error: 'Provider not supported' };
  } catch (error) {
    console.error('[AI] Test failed:', error);
    store.audit('ai.test_connection_failed', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Test OpenAI
async function testOpenAI(apiKey, model) {
  const https = require('https');
  const postData = JSON.stringify({
    model: model || 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Say "test successful"' }],
    max_tokens: 10,
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('[AI] OpenAI response:', res.statusCode, data.substring(0, 200));
        if (res.statusCode === 200) {
          resolve({ success: true, message: 'OpenAI connection successful!' });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test Groq (FREE)
async function testGroq(apiKey, model) {
  const https = require('https');
  const postData = JSON.stringify({
    model: model || 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: 'Say "test successful"' }],
    max_tokens: 10,
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('[AI] Groq response:', res.statusCode, data.substring(0, 200));
        if (res.statusCode === 200) {
          resolve({ success: true, message: 'Groq connection successful! (FREE)' });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test Together AI (FREE)
async function testTogether(apiKey, model) {
  const https = require('https');
  const postData = JSON.stringify({
    model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    messages: [{ role: 'user', content: 'Say "test successful"' }],
    max_tokens: 10,
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.together.xyz',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('[AI] Together response:', res.statusCode, data.substring(0, 200));
        if (res.statusCode === 200) {
          resolve({ success: true, message: 'Together AI connection successful! (FREE)' });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test HuggingFace (FREE)
async function testHuggingFace(apiKey, model) {
  const https = require('https');
  const modelName = model || 'mistralai/Mistral-7B-Instruct-v0.2';
  const postData = JSON.stringify({
    inputs: 'Say "test successful"',
    parameters: { max_new_tokens: 10 },
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api-inference.huggingface.co',
      path: `/models/${modelName}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('[AI] HuggingFace response:', res.statusCode, data.substring(0, 200));
        if (res.statusCode === 200) {
          resolve({ success: true, message: 'HuggingFace connection successful! (FREE)' });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test Anthropic
async function testAnthropic(apiKey, model) {
  const https = require('https');
  const postData = JSON.stringify({
    model: model || 'claude-3-haiku-20240307',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Say "test successful"' }],
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('[AI] Anthropic response:', res.statusCode, data.substring(0, 200));
        if (res.statusCode === 200) {
          resolve({ success: true, message: 'Anthropic connection successful!' });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test Google
async function testGoogle(apiKey) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1/models?key=${apiKey}`,
      method: 'GET',
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('[AI] Google response:', res.statusCode);
        if (res.statusCode === 200) {
          resolve({ success: true, message: 'Google AI connection successful!' });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Test Ollama (LOCAL)
async function testOllama(model) {
  const http = require('http');
  
  // Use model name without tag, or default to llama3.2
  const modelName = model ? model.split(':')[0] : 'llama3.2';
  
  const postData = JSON.stringify({
    model: modelName,
    messages: [{ role: 'user', content: 'Say "test successful"' }],
    stream: false,
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 10000, // 10 second timeout
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('[AI] Ollama response:', res.statusCode, data.substring(0, 200));
        if (res.statusCode === 200) {
          resolve({ success: true, message: `Ollama connection successful! (LOCAL - ${modelName})` });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('Ollama is not running. Please start Ollama first: brew services start ollama'));
      } else {
        reject(error);
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama connection timeout. Make sure Ollama is running and the model is loaded.'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Get Ollama models list
async function getOllamaModels() {
  const http = require('http');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 11434,
      path: '/api/tags',
      method: 'GET',
      timeout: 3000,
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            // Extract model names and remove :latest tag
            const models = parsed.models ? parsed.models.map(m => {
              // Remove :latest or other tags from model name
              const name = m.name || m.model || '';
              return name.split(':')[0]; // Get base name without tag
            }).filter(name => name) : [];
            
            console.log('[AI] Ollama models found:', models);
            resolve(models);
          } catch (error) {
            console.error('[AI] Failed to parse Ollama response:', error);
            resolve([]); // Return empty array on parse error
          }
        } else {
          console.log('[AI] Ollama returned status:', res.statusCode);
          resolve([]); // Return empty array on non-200 status
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('[AI] Ollama connection error:', error.code, error.message);
      resolve([]); // Return empty array if Ollama not running
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('[AI] Ollama connection timeout');
      resolve([]); // Return empty array on timeout
    });
    
    req.end();
  });
}

// Start Moltbook heartbeat (4-hour cycle)
function startMoltbookHeartbeat() {
  // Clear existing heartbeat
  if (moltbookHeartbeatInterval) {
    clearInterval(moltbookHeartbeatInterval);
  }
  
  const agent = store.getAgent();
  if (!agent) {
    console.log('[Moltbook] ℹ️ No agent registered, heartbeat will start when agent is registered');
    return;
  }
  
  // Get heartbeat interval from skill.md or use 4 hours default
  const heartbeatMs = agent.skillInfo?.heartbeatInterval || (4 * 60 * 60 * 1000);
  
  console.log('[Moltbook] ❤️ Starting heartbeat every', heartbeatMs / (60 * 60 * 1000), 'hours');
  
  // Run immediately
  runMoltbookHeartbeat();
  
  // Set up recurring heartbeat
  moltbookHeartbeatInterval = setInterval(() => {
    runMoltbookHeartbeat();
  }, heartbeatMs);
  
  store.set('moltbookHeartbeatActive', true);
}

// Stop Moltbook heartbeat
function stopMoltbookHeartbeat() {
  if (moltbookHeartbeatInterval) {
    clearInterval(moltbookHeartbeatInterval);
    moltbookHeartbeatInterval = null;
    console.log('[Moltbook] ❤️ Heartbeat stopped');
  }
  store.set('moltbookHeartbeatActive', false);
}

// Run Moltbook heartbeat cycle
async function runMoltbookHeartbeat() {
  try {
    console.log('[Moltbook] ❤️ ========================================');
    console.log('[Moltbook] ❤️ HEARTBEAT CYCLE STARTING');
    console.log('[Moltbook] ❤️ ========================================');
    
    const agent = store.getAgent();
    if (!agent || agent.status !== 'active') {
      console.error('[Moltbook] ❌ Agent not active, skipping heartbeat');
      return;
    }
    
    // Update last heartbeat time
    store.set('moltbookLastHeartbeat', new Date().toISOString());
    
    // 1. Check for skill updates (skill.json version check)
    console.log('[Moltbook] 📚 Checking for skill updates...');
    try {
      const https = require('https');
      const skillJsonUrl = 'https://www.moltbook.com/skill.json';
      
      const skillJson = await new Promise((resolve, reject) => {
        https.get(skillJsonUrl, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
      
      const currentVersion = agent.skillInfo?.version || '0.0.0';
      const latestVersion = skillJson.version || '0.0.0';
      
      console.log('[Moltbook] 📦 Current skill version:', currentVersion);
      console.log('[Moltbook] 📦 Latest skill version:', latestVersion);
      
      if (latestVersion !== currentVersion) {
        console.log('[Moltbook] 🆕 New skill version available! Updating...');
        
        // Fetch updated skill.md
        const skillInfo = await fetchAndParseMoltbookSkill();
        agent.skillInfo = skillInfo;
        agent.skillInfo.version = latestVersion;
        agent.skillUpdatedAt = new Date().toISOString();
        store.saveAgent(agent);
        
        console.log('[Moltbook] ✅ Skill updated to version', latestVersion);
      } else {
        console.log('[Moltbook] ✅ Skill is up to date');
      }
    } catch (error) {
      console.warn('[Moltbook] ⚠️ Could not check skill updates:', error.message);
    }
    
    // 2. Check DMs (Direct Messages)
    console.log('[Moltbook] 💬 Checking DMs...');
    try {
      const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
      const https = require('https');
      
      const dmCheck = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'www.moltbook.com',
          path: '/api/v1/agents/dm/check',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'WATAM-AI/2.0.0',
          },
        };
        
        https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject).end();
      });
      
      if (dmCheck.pending_requests > 0) {
        console.log('[Moltbook] 📬 You have', dmCheck.pending_requests, 'pending DM request(s)!');
        // Notify user
        if (mainWindow) {
          mainWindow.webContents.send('dm-requests-pending', {
            count: dmCheck.pending_requests
          });
        }
      }
      
      if (dmCheck.unread_messages > 0) {
        console.log('[Moltbook] 💬 You have', dmCheck.unread_messages, 'unread message(s)!');
        // Notify user
        if (mainWindow) {
          mainWindow.webContents.send('dm-messages-unread', {
            count: dmCheck.unread_messages
          });
        }
      }
      
      if (dmCheck.pending_requests === 0 && dmCheck.unread_messages === 0) {
        console.log('[Moltbook] ✅ No new DMs');
      }
    } catch (error) {
      console.warn('[Moltbook] ⚠️ Could not check DMs:', error.message);
    }
    
    // 3. Check agent status
    console.log('[Moltbook] 🔍 Checking agent status...');
    try {
      const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
      const statusResult = await checkMoltbookStatus(apiKey, agent.name);
      
      if (statusResult.status === 'active') {
        console.log('[Moltbook] ✅ Agent status confirmed active');
      } else if (statusResult.statusCode === 401 || statusResult.statusCode === 500 || statusResult.statusCode === 502 || statusResult.statusCode === 503) {
        // Temporary server issues - don't stop heartbeat
        console.warn('[Moltbook] ⚠️ Temporary server issue (HTTP', statusResult.statusCode, ') - continuing heartbeat');
        console.warn('[Moltbook] 💡 This is likely a Moltbook server problem, not your API key');
        // Continue with heartbeat despite error
      } else {
        console.error('[Moltbook] ❌ Agent status changed to:', statusResult.status);
        return; // Don't continue if agent not active
      }
    } catch (error) {
      console.error('[Moltbook] ❌ Status check failed:', error.message);
      console.warn('[Moltbook] ⚠️ Continuing heartbeat despite error (might be temporary)');
      // Continue with heartbeat despite error
    }
    
    // 4. Run agent loop (browse, engage, post)
    console.log('[Moltbook] 🤖 Running agent engagement cycle...');
    await runAgentLoop();
    
    console.log('[Moltbook] ❤️ ========================================');
    console.log('[Moltbook] ❤️ HEARTBEAT CYCLE COMPLETED');
    console.log('[Moltbook] ❤️ Next heartbeat in', (agent.skillInfo?.heartbeatInterval || (4 * 60 * 60 * 1000)) / (60 * 60 * 1000), 'hours');
    console.log('[Moltbook] ❤️ ========================================');
    
  } catch (error) {
    console.error('[Moltbook] ❤️ Heartbeat cycle failed:', error);
  }
}

// Fetch Moltbook feed
async function fetchMoltbookFeed(apiKey) {
  const https = require('https');
  const url = `${MOLTBOOK_BASE_URL}/api/v1/feed`;

  console.log('[Feed] 📡 Fetching feed from:', url);
  console.log('[Feed] 🔑 Using API key:', maskApiKey(apiKey));

  return new Promise((resolve, reject) => {
    // Set timeout for slow Moltbook server (2 minutes)
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('⏱️ Moltbook server timeout (2 min). Server is very slow, please try again later.'));
    }, 120000);

    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'WATAM-AI/2.0.0',
      },
      maxRedirects: 0,
    };

    const req = https.request(url, options, (res) => {
      clearTimeout(timeout);
      let data = '';

      if (res.statusCode === 301 || res.statusCode === 302) {
        console.error('[Feed] ❌ Redirect detected - ensure using https://www.moltbook.com');
        reject(new Error('Redirect detected'));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[Feed] 📡 Response status:', res.statusCode);
        console.log('[Feed] 📄 Response size:', data.length, 'bytes');
        
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log('[Feed] ✅ Feed parsed successfully');
            console.log('[Feed] 📊 Feed structure:', {
              hasPosts: !!result.posts,
              postsCount: result.posts ? result.posts.length : 0,
              hasData: !!result.data,
              keys: Object.keys(result),
            });
            
            // Handle different possible response structures
            if (result.posts && Array.isArray(result.posts)) {
              console.log('[Feed] ✅ Found posts array with', result.posts.length, 'posts');
              resolve(result);
            } else if (result.data && result.data.posts && Array.isArray(result.data.posts)) {
              console.log('[Feed] ✅ Found posts in data wrapper with', result.data.posts.length, 'posts');
              resolve({ posts: result.data.posts });
            } else if (Array.isArray(result)) {
              console.log('[Feed] ✅ Response is array with', result.length, 'posts');
              resolve({ posts: result });
            } else {
              console.error('[Feed] ❌ Unexpected response structure:', Object.keys(result));
              console.error('[Feed] 📄 Response preview:', JSON.stringify(result, null, 2).substring(0, 500));
              reject(new Error('Unexpected feed response structure - no posts array found'));
            }
          } catch (error) {
            console.error('[Feed] ❌ JSON parse error:', error.message);
            console.error('[Feed] 📄 Raw response preview:', data.substring(0, 500));
            reject(new Error('Invalid JSON response from feed endpoint'));
          }
        } else if (res.statusCode === 401) {
          console.error('[Feed] ❌ 401 Unauthorized - API key invalid or expired');
          reject(new Error('API key invalid or expired - cannot access feed'));
        } else if (res.statusCode === 403) {
          console.error('[Feed] ❌ 403 Forbidden - insufficient permissions');
          reject(new Error('Insufficient permissions - agent claim might not be completed'));
        } else if (res.statusCode === 404) {
          console.error('[Feed] ❌ 404 Not Found - feed endpoint not available');
          reject(new Error('Feed endpoint not found - API might have changed'));
        } else {
          console.error('[Feed] ❌ HTTP error:', res.statusCode);
          console.error('[Feed] 📄 Response body:', data.substring(0, 500));
          reject(new Error(`Failed to fetch feed: HTTP ${res.statusCode} - ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[Feed] ❌ Request error:', error);
      
      // Better error messages
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('🔌 Cannot connect to Moltbook server. Server might be down.'));
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
        reject(new Error('⏱️ Moltbook server is very slow. Please try again later.'));
      } else if (error.code === 'ENOTFOUND') {
        reject(new Error('🌐 DNS resolution failed. Check internet connection.'));
      } else {
        reject(new Error(`🔌 Network error: ${error.message}`));
      }
    });

    req.end();
  });
}

// Alternative feed fetching method - try different endpoints
async function fetchMoltbookFeedAlternative(apiKey) {
  const https = require('https');
  
  // Try different possible endpoints based on skill.md v1.9.0
  const endpoints = [
    '/api/v1/posts?sort=new&limit=25',     // Global posts (skill.md confirmed)
    '/api/v1/posts?sort=hot&limit=25',     // Hot posts (skill.md confirmed)
    '/api/v1/feed?sort=new&limit=25',      // Personalized feed (retry with params)
  ];
  
  for (const endpoint of endpoints) {
    console.log('[AI] 🔄 Trying endpoint:', endpoint);
    
    try {
      const url = `${MOLTBOOK_BASE_URL}${endpoint}`;
      
      const result = await new Promise((resolve, reject) => {
        const options = {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'WATAM-AI/2.0.0',
          },
          maxRedirects: 0,
        };

        const req = https.request(url, options, (res) => {
          let data = '';

          if (res.statusCode === 301 || res.statusCode === 302) {
            reject(new Error('Redirect detected'));
            return;
          }

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            console.log('[AI] 📡 Endpoint', endpoint, 'returned status:', res.statusCode);
            
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                console.log('[AI] ✅ Endpoint', endpoint, 'worked, got data');
                
                // Normalize the response format
                if (Array.isArray(parsed)) {
                  resolve({ posts: parsed });
                } else if (parsed.posts) {
                  resolve(parsed);
                } else if (parsed.data && Array.isArray(parsed.data)) {
                  resolve({ posts: parsed.data });
                } else if (parsed.data && parsed.data.posts) {
                  resolve({ posts: parsed.data.posts });
                } else {
                  resolve({ posts: [parsed] });
                }
              } catch (error) {
                reject(new Error('Invalid JSON response'));
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.end();
      });
      
      return result;
    } catch (error) {
      console.log('[AI] ❌ Endpoint', endpoint, 'failed:', error.message);
      continue;
    }
  }
  
  throw new Error('All feed endpoints failed');
}

// Post reply to Moltbook
async function postMoltbookReply(apiKey, postId, replyText) {
  const https = require('https');

  console.log('[Reply] 📤 Posting reply to post:', postId);
  console.log('[Reply] 🔑 Using API key:', maskApiKey(apiKey));
  console.log('[Reply] 📝 Reply length:', replyText.length, 'characters');

  return new Promise((resolve, reject) => {
    // Set timeout for slow Moltbook server (2 minutes)
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('⏱️ Moltbook server timeout (2 min). Server is very slow, please try again later.'));
    }, 120000);

    const postData = JSON.stringify({
      content: replyText, // Moltbook API uses 'content', not 'body'
    });

    const options = {
      hostname: 'www.moltbook.com',
      path: `/api/v1/posts/${postId}/comments`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WATAM-AI/2.0.0',
      },
    };

    console.log('[Reply] 📡 Request details:', {
      hostname: options.hostname,
      path: options.path,
      method: options.method,
      contentLength: options.headers['Content-Length'],
    });

    const req = https.request(options, (res) => {
      clearTimeout(timeout);
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[Reply] 📡 Response status:', res.statusCode);
        console.log('[Reply] 📄 Response size:', data.length, 'bytes');
        console.log('[Reply] 📄 Response preview:', data.substring(0, 300));
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(data);
            console.log('[Reply] ✅ Reply posted successfully');
            console.log('[Reply] 📊 Response structure:', {
              hasId: !!result.id,
              hasComment: !!result.comment,
              hasData: !!result.data,
              keys: Object.keys(result),
            });
            resolve({ success: true, result });
          } catch (error) {
            console.error('[Reply] ❌ JSON parse error:', error.message);
            console.error('[Reply] 📄 Raw response:', data);
            reject(new Error('Invalid JSON response from reply endpoint'));
          }
        } else if (res.statusCode === 401) {
          console.error('[Reply] ❌ 401 Unauthorized - API key invalid or expired');
          console.error('[Reply] 💡 SOLUTION: Complete agent claim process on Moltbook');
          reject(new Error('⚠️ Authentication failed. API key invalid or expired. Please complete the claim process on Moltbook.'));
        } else if (res.statusCode === 403) {
          console.error('[Reply] ❌ 403 Forbidden - insufficient permissions');
          console.error('[Reply] 💡 SOLUTION: Complete agent claim process on Moltbook');
          reject(new Error('⚠️ Authentication failed. Insufficient permissions. Please complete the claim process on Moltbook.'));
        } else if (res.statusCode === 404) {
          console.error('[Reply] ❌ 404 Not Found - post might not exist');
          reject(new Error('Post not found - it might have been deleted'));
        } else if (res.statusCode === 429) {
          console.error('[Reply] ❌ 429 Rate Limited');
          
          // Try to extract rate limit info from response
          let rateLimitMessage = 'Rate limit exceeded';
          try {
            const errorData = JSON.parse(data);
            if (errorData.retry_after_minutes) {
              rateLimitMessage += `. Next reply allowed in ${errorData.retry_after_minutes} minutes`;
            }
            if (errorData.message) {
              rateLimitMessage = errorData.message;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
          
          reject(new Error(rateLimitMessage));
        } else {
          console.error('[Reply] ❌ HTTP error:', res.statusCode);
          console.error('[Reply] 📄 Error response:', data);
          
          // Try to extract error message from response
          let errorMessage = `Failed to post reply: HTTP ${res.statusCode}`;
          try {
            const errorData = JSON.parse(data);
            if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
          
          reject(new Error(errorMessage));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[Reply] ❌ Request error:', error);
      
      // Better error messages
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('🔌 Cannot connect to Moltbook server. Server might be down.'));
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
        reject(new Error('⏱️ Moltbook server is very slow. Please try again later.'));
      } else if (error.code === 'ENOTFOUND') {
        reject(new Error('🌐 DNS resolution failed. Check internet connection.'));
      } else {
        reject(new Error(`🔌 Network error: ${error.message}`));
      }
    });

    req.write(postData);
    req.end();
  });
}

// Check for mentions in our own posts and reply
async function checkMentionsInOwnPosts() {
  console.log('[Mentions] 🔍 Checking for mentions in our posts...');
  
  // Get agent info
  const agent = store.getAgent();
  if (!agent || agent.status !== 'active') {
    console.log('[Mentions] ⚠️ Agent not active, skipping mention check');
    return;
  }
  
  // Get our published posts
  const posts = store.getPosts();
  if (!posts || posts.length === 0) {
    console.log('[Mentions] ℹ️ No published posts to check');
    return;
  }
  
  console.log('[Mentions] 📊 Checking', posts.length, 'posts for mentions...');
  
  // Get agent name for mention detection
  const agentName = agent.name.toLowerCase();
  const mentionPatterns = [
    `@${agentName}`,
    `@watam-agent`,
    `@watam`,
  ];
  
  // Track which comments we've already replied to
  const repliedComments = store.get('agentRepliedComments', []);
  
  // Check rate limit
  const lastRateLimit = store.get('lastRateLimit');
  if (lastRateLimit) {
    const rateLimitEnd = new Date(lastRateLimit);
    const now = new Date();
    if (now < rateLimitEnd) {
      console.log('[Mentions] ⏱️ Rate limited until:', rateLimitEnd.toLocaleString());
      return;
    }
  }
  
  // Check each post for new mentions
  for (const post of posts) {
    if (!post.id || post.id === 'undefined') {
      console.log('[Mentions] ⚠️ Skipping post with invalid ID:', post.title);
      continue;
    }
    
    try {
      console.log('[Mentions] 🔍 Checking post:', post.title?.substring(0, 50));
      
      // Fetch comments for this post
      const https = require('https');
      const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
      
      const comments = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          req.destroy();
          reject(new Error('Timeout'));
        }, 30000);
        
        const options = {
          hostname: 'www.moltbook.com',
          path: `/api/v1/posts/${post.id}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'WATAM-AI/1.3.2',
          },
        };
        
        const req = https.request(options, (res) => {
          clearTimeout(timeout);
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                const commentsList = parsed.comments || parsed.post?.comments || [];
                resolve(commentsList);
              } catch (e) {
                resolve([]);
              }
            } else {
              resolve([]);
            }
          });
        });
        
        req.on('error', () => {
          clearTimeout(timeout);
          resolve([]);
        });
        
        req.end();
      });
      
      if (!comments || comments.length === 0) {
        continue;
      }
      
      console.log('[Mentions] 📊 Found', comments.length, 'comments in post');
      
      // Check each comment for mentions
      for (const comment of comments) {
        // Skip if we've already replied to this comment
        if (repliedComments.includes(comment.id)) {
          continue;
        }
        
        // Skip if this is our own comment
        const commentAuthor = typeof comment.author === 'string' 
          ? comment.author 
          : (comment.author?.name || comment.author?.username || '');
        
        if (commentAuthor && commentAuthor.toLowerCase() === agentName) {
          continue;
        }
        
        // Check if comment mentions us
        const commentText = (comment.body || comment.content || '').toLowerCase();
        const hasMention = mentionPatterns.some(pattern => commentText.includes(pattern));
        
        if (hasMention) {
          console.log('[Mentions] 🎯 Found mention in comment:', comment.id);
          console.log('[Mentions] 💬 Comment:', commentText.substring(0, 100));
          
          // Generate and post reply
          const config = {
            aiProvider: store.get('aiProvider'),
            aiApiKey: store.get('aiApiKey'),
            aiModel: store.get('aiModel'),
            responseLength: store.get('responseLength', 'medium'),
            responseStyle: store.get('responseStyle', 'friendly'),
            temperature: store.get('temperature', 0.7),
            usePersona: store.get('usePersona', true),
          };
          
          // Create a pseudo-post object for reply generation
          const pseudoPost = {
            id: post.id,
            title: post.title,
            body: `${post.body}\n\nComment from ${comment.author}: ${comment.body || comment.content}`,
          };
          
          console.log('[Mentions] 🧠 Generating reply...');
          const replyResult = await generateAIReply(config, pseudoPost);
          
          if (replyResult.success) {
            console.log('[Mentions] 📤 Posting reply...');
            const postResult = await postMoltbookReply(apiKey, post.id, replyResult.reply);
            
            if (postResult.success) {
              console.log('[Mentions] ✅ Reply posted successfully!');
              
              // Mark this comment as replied
              repliedComments.push(comment.id);
              store.set('agentRepliedComments', repliedComments);
              
              // Update stats
              const repliesToday = store.get('agentRepliesToday', 0);
              store.set('agentRepliesToday', repliesToday + 1);
              
              store.audit('ai.mention_replied', {
                postId: post.id,
                commentId: comment.id,
                author: comment.author,
              });
              
              // Notify frontend to update status
              if (mainWindow) {
                mainWindow.webContents.send('agent-status-update', {
                  lastCheck: new Date().toISOString(),
                  repliesToday: repliesToday + 1,
                  postTitle: post.title || 'Mention reply',
                });
              }
              
              // Only reply to one mention per loop to avoid spam
              return;
            } else {
              console.error('[Mentions] ❌ Failed to post reply:', postResult.error);
            }
          } else {
            console.error('[Mentions] ❌ Failed to generate reply:', replyResult.error);
          }
        }
      }
      
    } catch (error) {
      console.error('[Mentions] ❌ Error checking post:', post.id, error.message);
    }
  }
  
  console.log('[Mentions] ✅ Mention check complete');
}

// Agent loop logic
async function runAgentLoop() {
  try {
    console.log('[AI] ========================================');
    console.log('[AI] 🤖 AGENT LOOP STARTING - Checking feed...');
    console.log('[AI] ========================================');
    
    // Update last check time
    store.set('agentLastCheck', new Date().toISOString());
    console.log('[AI] ✅ Updated last check time');
    
    // Get config
    const config = {
      aiProvider: store.get('aiProvider'),
      aiApiKey: store.get('aiApiKey'),
      aiModel: store.get('aiModel'),
      replySubmolts: store.get('replySubmolts', ''),
      replyKeywords: store.get('replyKeywords', ''),
      maxRepliesPerHour: store.get('maxRepliesPerHour', 10),
      responseLength: store.get('responseLength', 'medium'),
      responseStyle: store.get('responseStyle', 'friendly'),
      temperature: store.get('temperature', 0.7),
      usePersona: store.get('usePersona', true),
      avoidRepetition: store.get('avoidRepetition', true),
    };
    
    console.log('[AI] 📋 Agent config:', {
      provider: config.aiProvider,
      hasApiKey: !!config.aiApiKey,
      model: config.aiModel,
      submolts: config.replySubmolts,
      keywords: config.replyKeywords,
      maxPerHour: config.maxRepliesPerHour,
    });
    
    // Check AI provider configuration first
    if (!config.aiProvider) {
      console.error('[AI] ❌ No AI provider configured');
      console.error('[AI] 💡 SOLUTION: Go to AI Config tab and configure an AI provider');
      return;
    }
    
    if (config.aiProvider !== 'ollama' && !config.aiApiKey) {
      console.error('[AI] ❌ No AI API key configured for provider:', config.aiProvider);
      console.error('[AI] 💡 SOLUTION: Go to AI Config tab and add your API key');
      return;
    }
    
    // Check rate limit
    if (agentRepliesThisHour >= config.maxRepliesPerHour) {
      console.log('[AI] ⏱️ Rate limit reached:', agentRepliesThisHour, '/', config.maxRepliesPerHour);
      store.audit('ai.agent_rate_limited', { count: agentRepliesThisHour });
      return;
    }
    
    // Get agent
    const agent = store.getAgent();
    if (!agent) {
      console.error('[AI] ❌ No agent registered');
      console.error('[AI] 💡 SOLUTION: Go to Settings tab and register a Moltbook agent');
      return;
    }
    
    console.log('[AI] 🔍 Agent status check:', {
      name: agent.name,
      status: agent.status,
      lastChecked: agent.lastCheckedAt,
    });
    
    // Always check agent status in real-time for better reliability
    console.log('[AI] 🔄 Checking agent status in real-time...');
    try {
      const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
      const statusResult = await checkMoltbookStatus(apiKey, agent.name);
      
      console.log('[AI] 📊 Status check result:', {
        status: statusResult.status,
        statusCode: statusResult.statusCode,
        hasData: !!statusResult.data,
      });
      
      if (statusResult.status === 'active') {
        console.log('[AI] ✅ Agent is ACTIVE and ready to post');
        agent.status = 'active';
        agent.lastCheckedAt = new Date().toISOString();
        store.saveAgent(agent);
      } else if (statusResult.status === 'temporary_error') {
        console.warn('[AI] ⚠️ Moltbook server temporary error (500/502/503)');
        console.warn('[AI] 💡 This is NOT an API key problem');
        console.warn('[AI] 💡 Using cached agent status:', agent.status);
        
        // If we have a cached active status, continue with it
        if (agent.status === 'active') {
          console.log('[AI] ✅ Using cached ACTIVE status - continuing...');
        } else {
          console.error('[AI] ❌ Cached status is not active, skipping this loop');
          return;
        }
      } else {
        console.error('[AI] ❌ Agent not active, status:', statusResult.status);
        console.error('[AI] 🚨 CRITICAL: Agent cannot interact with posts until claim is completed!');
        console.error('[AI] 📋 TO FIX THIS:');
        console.error('[AI] 1. Open WATAM AI Settings tab');
        console.error('[AI] 2. Look for "Claim URL" and "Verification Code"');
        console.error('[AI] 3. Click "Open" next to Claim URL');
        console.error('[AI] 4. Complete ALL steps on Moltbook website');
        console.error('[AI] 5. Return to Settings and click "Check Status"');
        console.error('[AI] ⚠️ Agent will remain inactive until this is done!');
        
        // Update status in storage
        agent.status = statusResult.status;
        agent.lastCheckedAt = new Date().toISOString();
        store.saveAgent(agent);
        return;
      }
    } catch (statusError) {
      console.error('[AI] ❌ Status check failed:', statusError.message);
      console.error('[AI] 🔌 This could be a network issue or Moltbook server problem');
      
      // If cached status is not active, don't proceed
      if (agent.status !== 'active') {
        console.error('[AI] ❌ Cached agent status is not active:', agent.status);
        console.error('[AI] 💡 Cannot proceed without active agent status');
        return;
      }
      
      console.warn('[AI] ⚠️ Using cached agent status (active) due to status check error');
    }
    
    // Fetch feed
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    console.log('[AI] 🔑 Using API key:', maskApiKey(apiKey));
    console.log('[AI] 📡 Fetching Moltbook feed...');
    
    let feed;
    try {
      feed = await fetchMoltbookFeed(apiKey);
      console.log('[AI] ✅ Feed fetched successfully');
    } catch (error) {
      console.error('[AI] ❌ Failed to fetch feed:', error.message);
      
      // Try alternative feed endpoints
      console.log('[AI] 🔄 Trying alternative feed methods...');
      try {
        feed = await fetchMoltbookFeedAlternative(apiKey);
        console.log('[AI] ✅ Alternative feed method worked');
      } catch (altError) {
        console.error('[AI] ❌ All feed methods failed:', altError.message);
        console.error('[AI] 🔌 This could be:');
        console.error('[AI] - Moltbook server is down');
        console.error('[AI] - API endpoints have changed');
        console.error('[AI] - Network connectivity issues');
        console.error('[AI] - Agent API key lacks feed access permissions');
        return;
      }
    }
    
    if (!feed || !feed.posts || feed.posts.length === 0) {
      console.log('[AI] ⚠️ No posts in feed - this could be normal if no new posts');
      console.log('[AI] 📊 Feed structure:', {
        hasFeed: !!feed,
        hasPosts: !!(feed && feed.posts),
        postsLength: feed && feed.posts ? feed.posts.length : 0,
        feedKeys: feed ? Object.keys(feed) : [],
      });
      return;
    }
    
    console.log('[AI] 📊 Fetched', feed.posts.length, 'posts from feed');
    
    // Debug: Show first few posts
    console.log('[AI] 🔍 Sample posts from feed:');
    feed.posts.slice(0, 3).forEach((post, i) => {
      console.log(`[AI] Post ${i+1}:`, {
        id: post.id,
        title: post.title?.substring(0, 50) + '...',
        submolt: post.submolt,
        submoltType: typeof post.submolt,
        hasBody: !!post.body,
        bodyLength: post.body?.length || 0,
      });
    });
    
    // Start with all posts
    let filteredPosts = [...feed.posts];
    
    // Filter posts by submolts (only if specified)
    if (config.replySubmolts && config.replySubmolts.trim()) {
      const submolts = config.replySubmolts.split(',').map(s => s.trim().toLowerCase());
      console.log('[AI] 🏷️ Filtering by submolts:', submolts);
      
      const beforeFilter = filteredPosts.length;
      filteredPosts = filteredPosts.filter(post => {
        // Handle both string and object submolt formats
        let submoltName = '';
        if (typeof post.submolt === 'string') {
          submoltName = post.submolt.toLowerCase();
        } else if (post.submolt && post.submolt.name) {
          submoltName = post.submolt.name.toLowerCase();
        }
        
        const matches = submolts.includes(submoltName);
        if (matches) {
          console.log('[AI] ✅ Submolt match:', submoltName, 'in post:', post.id);
        }
        return matches;
      });
      
      console.log('[AI] Filtered by submolts:', filteredPosts.length, '/', beforeFilter, 'posts');
      
      if (filteredPosts.length === 0) {
        console.log('[AI] 🔍 No posts match specified submolts. Available submolts in feed:');
        const availableSubmolts = [...new Set(feed.posts.map(p => {
          if (typeof p.submolt === 'string') return p.submolt;
          if (p.submolt && p.submolt.name) return p.submolt.name;
          return null;
        }).filter(s => s))];
        console.log('[AI] Available submolts:', availableSubmolts);
        console.log('[AI] 💡 TIP: Update your submolt filter in AI Config to match available submolts');
      }
    } else {
      console.log('[AI] 🏷️ No submolt filter specified - considering all submolts');
    }
    
    // Filter posts by keywords (only if specified)
    if (config.replyKeywords && config.replyKeywords.trim()) {
      const keywords = config.replyKeywords.split(',').map(k => k.trim().toLowerCase());
      console.log('[AI] 🔍 Filtering by keywords:', keywords);
      
      const beforeFilter = filteredPosts.length;
      filteredPosts = filteredPosts.filter(post => {
        const text = `${post.title || ''} ${post.body || ''}`.toLowerCase();
        const matches = keywords.some(keyword => text.includes(keyword));
        if (matches) {
          console.log('[AI] ✅ Keyword match in post:', post.id, '-', post.title?.substring(0, 50));
        }
        return matches;
      });
      
      console.log('[AI] Filtered by keywords:', filteredPosts.length, '/', beforeFilter, 'posts');
      
      if (filteredPosts.length === 0) {
        console.log('[AI] 🔍 No posts match specified keywords');
        console.log('[AI] 💡 TIP: Update your keyword filter in AI Config or remove it to reply to more posts');
      }
    } else {
      console.log('[AI] 🔍 No keyword filter specified - considering all posts');
    }
    
    // CRITICAL: Check for mentions (@agent-name) - HIGHEST PRIORITY!
    const mentionPattern = new RegExp(`@${agent.name}`, 'i');
    const mentionedPosts = filteredPosts.filter(post => {
      const text = `${post.title || ''} ${post.body || post.content || ''}`;
      return mentionPattern.test(text);
    });
    
    if (mentionedPosts.length > 0) {
      console.log('[AI] ========================================');
      console.log('[AI] 🔔 MENTIONS FOUND!');
      console.log('[AI] ========================================');
      console.log('[AI] Found', mentionedPosts.length, 'posts mentioning @' + agent.name);
      console.log('[AI] 📋 Mentioned posts:');
      mentionedPosts.forEach((p, i) => {
        console.log(`[AI]   ${i+1}. "${p.title?.substring(0, 50)}..." by @${p.author?.name || 'unknown'}`);
      });
      
      // PRIORITY: Move mentions to front of queue
      const nonMentionedPosts = filteredPosts.filter(p => !mentionedPosts.includes(p));
      filteredPosts = [...mentionedPosts, ...nonMentionedPosts];
      
      console.log('[AI] ✅ Mentions prioritized - will reply to them first!');
      console.log('[AI] ========================================');
      
      // Notify frontend about mentions
      if (mainWindow) {
        mainWindow.webContents.send('mentions-found', {
          count: mentionedPosts.length,
          posts: mentionedPosts.map(p => ({
            id: p.id,
            title: p.title,
            author: p.author?.name || 'unknown'
          }))
        });
      }
      if (mainWindow) {
        mainWindow.webContents.send('mentions-found', {
          count: mentionedPosts.length,
          posts: mentionedPosts.map(p => ({
            id: p.id,
            title: p.title,
            author: p.author?.name || 'unknown',
            submolt: typeof p.submolt === 'string' ? p.submolt : p.submolt?.name
          }))
        });
      }
    }
    
    if (filteredPosts.length === 0) {
      console.log('[AI] ❌ No posts match filters after filtering');
      console.log('[AI] 💡 SUGGESTIONS:');
      console.log('[AI] - Remove or update submolt filters in AI Config');
      console.log('[AI] - Remove or update keyword filters in AI Config');
      console.log('[AI] - Check if there are new posts in your feed');
      return;
    }
    
    console.log('[AI] ✅ Found', filteredPosts.length, 'posts matching filters');
    if (mentionedPosts.length > 0) {
      console.log('[AI] 🔔 Including', mentionedPosts.length, 'mention(s) - PRIORITY REPLIES!');
    }
    
    // Get posts we've already replied to
    const repliedPosts = store.get('agentRepliedPosts', []);
    console.log('[AI] 📝 Already replied to', repliedPosts.length, 'posts');
    
    // Find posts we haven't replied to yet
    const newPosts = filteredPosts.filter(post => !repliedPosts.includes(post.id));
    
    if (newPosts.length === 0) {
      console.log('[AI] ✅ No new posts to reply to (already replied to all matching posts)');
      console.log('[AI] 📊 Stats: Total posts:', feed.posts.length, 'Filtered:', filteredPosts.length, 'Already replied:', repliedPosts.length);
      return;
    }
    
    console.log('[AI] 🎯 Found', newPosts.length, 'new posts to potentially reply to');
    
    // Check for rate limits before attempting to reply
    const lastRateLimit = store.get('lastRateLimit');
    if (lastRateLimit) {
      const nextAllowedTime = new Date(lastRateLimit.nextAllowedTime);
      const now = new Date();
      
      if (now < nextAllowedTime) {
        const minutesLeft = Math.ceil((nextAllowedTime - now) / (1000 * 60));
        console.log(`[AI] ⏱️ Rate limited. Next reply allowed in ${minutesLeft} minutes at ${nextAllowedTime.toLocaleTimeString()}`);
        console.log(`[AI] 🚫 Skipping reply attempt to avoid spam`);
        return;
      } else {
        // Rate limit expired, clear it
        store.set('lastRateLimit', null);
        console.log('[AI] ✅ Rate limit expired, can reply again');
      }
    }
    
    // Additional check: Don't reply too frequently (minimum 2 minutes between replies)
    const lastReplyTime = store.get('agentLastReplyTime');
    if (lastReplyTime) {
      const timeSinceLastReply = Date.now() - new Date(lastReplyTime).getTime();
      const minInterval = 2 * 60 * 1000; // 2 minutes
      
      if (timeSinceLastReply < minInterval) {
        const waitMinutes = Math.ceil((minInterval - timeSinceLastReply) / (1000 * 60));
        console.log(`[AI] ⏱️ Too soon since last reply. Wait ${waitMinutes} more minutes.`);
        return;
      }
    }
    
    // Reply to first post (one at a time to avoid spam)
    const post = newPosts[0];
    console.log('[AI] 🎯 Attempting to reply to post:', {
      id: post.id,
      title: post.title?.substring(0, 100) + '...',
      submolt: post.submolt,
      bodyLength: post.body?.length || 0,
    });
    
    // Generate reply
    console.log('[AI] 🧠 Generating AI reply...');
    const replyResult = await generateAIReply(config, post);
    
    if (!replyResult.success) {
      console.error('[AI] ❌ Failed to generate reply:', replyResult.error);
      console.error('[AI] 💡 This could be:');
      console.error('[AI] - AI provider API key invalid');
      console.error('[AI] - AI provider service down');
      console.error('[AI] - Network connectivity issues');
      console.error('[AI] - AI model not available');
      store.audit('ai.agent_reply_failed', { postId: post.id, error: replyResult.error, stage: 'generation' });
      return;
    }
    
    console.log('[AI] ✅ AI reply generated successfully');
    console.log('[AI] 📝 Reply preview:', replyResult.reply.substring(0, 150) + '...');
    
    // Post reply
    console.log('[AI] 📤 Posting reply to Moltbook...');
    const postResult = await postMoltbookReply(apiKey, post.id, replyResult.reply);
    
    if (!postResult.success) {
      console.error('[AI] ❌ Failed to post reply:', postResult.error);
      console.error('[AI] 💡 This could be:');
      console.error('[AI] - Agent not properly claimed on Moltbook');
      console.error('[AI] - API key lacks posting permissions');
      console.error('[AI] - Moltbook server issues');
      console.error('[AI] - Rate limit hit');
      console.error('[AI] - Network connectivity issues');
      
      // Check if it's a rate limit error and store it
      if (postResult.error && (postResult.error.includes('30 minutes') || postResult.error.includes('rate limit'))) {
        console.log('[AI] ⏱️ Hit rate limit, storing for future reference');
        const rateLimitInfo = {
          timestamp: new Date().toISOString(),
          retryAfter: 30, // 30 minutes default
          nextAllowedTime: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        };
        store.set('lastRateLimit', rateLimitInfo);
      }
      
      store.audit('ai.agent_reply_failed', { postId: post.id, error: postResult.error, stage: 'posting' });
      return;
    }
    
    // SUCCESS! Track replied post
    repliedPosts.push(post.id);
    store.set('agentRepliedPosts', repliedPosts);
    
    // Store last reply time to prevent spam
    store.set('agentLastReplyTime', new Date().toISOString());
    
    // Increment counters
    agentRepliesThisHour++;
    const repliesToday = store.get('agentRepliesToday', 0);
    store.set('agentRepliesToday', repliesToday + 1);
    
    // CRITICAL: Store detailed AI reply for activity tracking
    const aiReplies = store.get('aiReplies', []);
    aiReplies.unshift({
      id: Date.now(),
      postId: post.id,
      postTitle: post.title,
      postBody: post.body || post.content || '',
      postAuthor: post.author?.name || post.author || 'Unknown',
      submolt: post.submolt,
      reply: replyResult.reply,
      replyContext: replyResult.context || '', // Store what AI was replying to (comment or post)
      timestamp: new Date().toISOString(),
      success: true
    });
    // Keep only last 100 replies
    if (aiReplies.length > 100) {
      aiReplies.length = 100;
    }
    store.set('aiReplies', aiReplies);
    
    console.log('[AI] ========================================');
    console.log('[AI] 🎉 SUCCESS! Reply posted successfully');
    console.log('[AI] 📊 Stats:', {
      postId: post.id,
      postTitle: post.title?.substring(0, 50) + '...',
      replyLength: replyResult.reply.length,
      repliesThisHour: agentRepliesThisHour,
      repliesToday: repliesToday + 1,
    });
    console.log('[AI] ========================================');
    
    store.audit('ai.agent_replied', { 
      postId: post.id, 
      postTitle: post.title,
      replyLength: replyResult.reply.length,
      count: agentRepliesThisHour,
    });
    
    // Notify frontend to update status
    if (mainWindow) {
      mainWindow.webContents.send('agent-status-update', {
        lastCheck: new Date().toISOString(),
        repliesToday: repliesToday + 1,
        lastReply: {
          postId: post.id,
          postTitle: post.title,
          timestamp: new Date().toISOString(),
        }
      });
    }
    
  } catch (error) {
    console.error('[AI] ========================================');
    console.error('[AI] ❌ AGENT LOOP ERROR:', error.message);
    console.error('[AI] 🔍 Error details:', error);
    console.error('[AI] 💡 This could be:');
    console.error('[AI] - Network connectivity issues');
    console.error('[AI] - Moltbook server problems');
    console.error('[AI] - Configuration issues');
    console.error('[AI] - Code bugs (please report)');
    console.error('[AI] ========================================');
    store.audit('ai.agent_error', { error: error.message, stack: error.stack });
  }
  
  // After checking feed, also check for mentions in our own posts
  try {
    await checkMentionsInOwnPosts();
  } catch (mentionError) {
    console.error('[AI] ❌ Mention check error:', mentionError.message);
  }
}

// Generate AI reply
async function generateAIReply(config, post) {
  try {
    // Build prompt based on settings
    let prompt = '';
    
    // Add persona if enabled
    if (config.usePersona) {
      const persona = store.get('persona', '');
      if (persona) {
        prompt += `${persona}\n\n`;
      }
    }
    
    // Add response style
    const styleInstructions = {
      professional: 'Write in a professional, formal tone.',
      friendly: 'Write in a friendly, warm tone.',
      casual: 'Write in a casual, relaxed tone.',
      technical: 'Write in a technical, detailed tone.',
    };
    prompt += `${styleInstructions[config.responseStyle] || styleInstructions.friendly}\n\n`;
    
    // Add response length
    const lengthInstructions = {
      short: 'Keep your response brief (50-100 words).',
      medium: 'Write a moderate response (100-200 words).',
      long: 'Write a detailed response (200-300 words).',
    };
    prompt += `${lengthInstructions[config.responseLength] || lengthInstructions.medium}\n\n`;
    
    // Add avoid repetition
    if (config.avoidRepetition) {
      prompt += 'Be creative and avoid repetitive phrases.\n\n';
    }
    
    // Add post content
    prompt += `Post Title: ${post.title}\nPost Body: ${post.body}\n\nGenerate a helpful reply:`;
    
    // Call AI provider
    let reply = '';
    
    if (config.aiProvider === 'ollama') {
      reply = await generateOllama(config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'groq') {
      reply = await generateGroq(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'together') {
      reply = await generateTogether(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'huggingface') {
      reply = await generateHuggingFace(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'openai') {
      reply = await generateOpenAI(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'anthropic') {
      reply = await generateAnthropic(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'google') {
      reply = await generateGoogle(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else {
      throw new Error('Unsupported AI provider: ' + config.aiProvider);
    }
    
    return { success: true, reply };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Translation service using AI provider
async function translateText(text, targetLanguage) {
  try {
    const config = {
      aiProvider: store.get('aiProvider'),
      aiApiKey: store.get('aiApiKey'),
      aiModel: store.get('aiModel'),
      temperature: 0.3, // Lower temperature for more accurate translations
    };

    if (!config.aiProvider) {
      throw new Error('No AI provider configured');
    }

    if (config.aiProvider !== 'ollama' && !config.aiApiKey) {
      throw new Error('No AI API key configured');
    }

    const languageNames = {
      'en': 'English',
      'tr': 'Turkish'
    };

    const prompt = `Translate the following text to ${languageNames[targetLanguage] || targetLanguage}. Only return the translation, nothing else:\n\n${text}`;

    let translation = '';

    if (config.aiProvider === 'ollama') {
      translation = await generateOllama(config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'groq') {
      translation = await generateGroq(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'together') {
      translation = await generateTogether(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'huggingface') {
      translation = await generateHuggingFace(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'openai') {
      translation = await generateOpenAI(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'anthropic') {
      translation = await generateAnthropic(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else if (config.aiProvider === 'google') {
      translation = await generateGoogle(config.aiApiKey, config.aiModel, prompt, config.temperature);
    } else {
      throw new Error('Unsupported AI provider: ' + config.aiProvider);
    }

    return { success: true, translation: translation.trim() };
  } catch (error) {
    console.error('[Translation] Error:', error);
    return { success: false, error: error.message };
  }
}

ipcMain.handle('translate-text', async (event, { text, targetLanguage }) => {
  return await translateText(text, targetLanguage);
});

ipcMain.handle('start-agent', async () => {
  try {
    console.log('[AI] Start agent requested');
    
    // Check if already running
    const isRunning = store.get('agentRunning', false);
    if (isRunning && agentInterval) {
      console.log('[AI] Agent already running, returning current state');
      return { success: true, alreadyRunning: true };
    }
    
    // Get config
    const config = {
      aiProvider: store.get('aiProvider'),
      aiApiKey: store.get('aiApiKey'),
      aiModel: store.get('aiModel'),
      checkInterval: store.get('checkInterval', 15),
      replySubmolts: store.get('replySubmolts', 'general,music,art,finance'),
      replyKeywords: store.get('replyKeywords', ''), // EMPTY by default - reply to all posts
      maxRepliesPerHour: store.get('maxRepliesPerHour', 10),
      autoReplyEnabled: store.get('autoReplyEnabled', true),
    };
    
    console.log('[AI] Agent config:', {
      provider: config.aiProvider,
      model: config.aiModel,
      interval: config.checkInterval,
      autoReply: config.autoReplyEnabled,
    });
    
    // Validate config
    if (!config.autoReplyEnabled) {
      return { success: false, error: 'Auto-reply not enabled' };
    }
    
    if (!config.aiProvider) {
      return { success: false, error: 'AI provider not configured' };
    }
    
    // Check agent status
    const agent = store.getAgent();
    if (!agent || agent.status !== 'active') {
      return { success: false, error: 'Moltbook agent not active. Please register and claim your agent first.' };
    }
    
    // Reset hourly counter
    agentRepliesThisHour = 0;
    
    // Check if we need to reset daily counter
    const lastResetDate = store.get('agentLastResetDate');
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      store.set('agentRepliesToday', 0);
      store.set('agentLastResetDate', today);
      console.log('[AI] Daily counter reset');
    }
    
    // Set up hourly reset
    if (agentHourlyResetInterval) {
      clearInterval(agentHourlyResetInterval);
    }
    agentHourlyResetInterval = setInterval(() => {
      console.log('[AI] Resetting hourly reply counter');
      agentRepliesThisHour = 0;
    }, 60 * 60 * 1000); // Reset every hour
    
    // Set running state
    store.set('agentRunning', true);
    store.audit('ai.agent_started', { provider: config.aiProvider, model: config.aiModel });
    
    // Start Moltbook heartbeat system (4-hour cycle)
    console.log('[AI] 🚀 Starting Moltbook heartbeat system...');
    startMoltbookHeartbeat();
    
    // Also start traditional agent loop for more frequent checks
    const intervalMs = config.checkInterval * 60 * 1000; // Convert minutes to ms
    console.log('[AI] 🔄 Starting frequent agent loop with interval:', intervalMs, 'ms');
    
    // Run immediately on start
    runAgentLoop();
    
    agentInterval = setInterval(runAgentLoop, intervalMs);
    
    console.log('[AI] ✅ Agent started successfully with dual system:');
    console.log('[AI] - Heartbeat: Every 4 hours (Moltbook standard)');
    console.log('[AI] - Quick checks: Every', config.checkInterval, 'minutes');
    return { success: true };
  } catch (error) {
    console.error('[AI] Failed to start agent:', error);
    store.audit('ai.agent_start_failed', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-agent', async () => {
  try {
    console.log('[AI] Stop agent requested');
    
    // Clear intervals
    if (agentInterval) {
      clearInterval(agentInterval);
      agentInterval = null;
      console.log('[AI] Agent interval cleared');
    }
    
    if (agentHourlyResetInterval) {
      clearInterval(agentHourlyResetInterval);
      agentHourlyResetInterval = null;
      console.log('[AI] Hourly reset interval cleared');
    }
    
    // Stop Moltbook heartbeat
    console.log('[AI] 🛑 Stopping Moltbook heartbeat system...');
    stopMoltbookHeartbeat();
    
    // Reset counter
    agentRepliesThisHour = 0;
    
    // Set running state
    store.set('agentRunning', false);
    store.audit('ai.agent_stopped', {});
    
    console.log('[AI] Agent stopped successfully');
    return { success: true };
  } catch (error) {
    console.error('[AI] Failed to stop agent:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-ollama-models', async () => {
  try {
    const models = await getOllamaModels();
    return { success: true, models };
  } catch (error) {
    console.error('[AI] Failed to get Ollama models:', error);
    return { success: false, models: [] };
  }
});

ipcMain.handle('generate-reply', async (event, { post }) => {
  try {
    console.log('[AI] Generating reply for:', post.title);
    const config = {
      aiProvider: store.get('aiProvider'),
      aiApiKey: store.get('aiApiKey'),
      aiModel: store.get('aiModel'),
      persona: store.get('persona', ''),
      skills: store.get('skills', ''),
    };
    
    if (!config.aiProvider) {
      return { success: false, error: 'AI provider not configured' };
    }
    
    // Ollama doesn't need API key
    if (config.aiProvider !== 'ollama' && !config.aiApiKey) {
      return { success: false, error: 'AI API key not configured' };
    }
    
    // Build prompt
    const prompt = `${config.persona}\n\n${config.skills}\n\nPost Title: ${post.title}\nPost Body: ${post.body}\n\nGenerate a helpful, friendly reply (max 200 words):`;
    
    let reply = '';
    
    // Generate based on provider
    if (config.aiProvider === 'openai') {
      reply = await generateOpenAI(config.aiApiKey, config.aiModel || 'gpt-3.5-turbo', prompt);
    } else if (config.aiProvider === 'groq') {
      reply = await generateGroq(config.aiApiKey, config.aiModel || 'llama-3.1-8b-instant', prompt);
    } else if (config.aiProvider === 'together') {
      reply = await generateTogether(config.aiApiKey, config.aiModel || 'mistralai/Mixtral-8x7B-Instruct-v0.1', prompt);
    } else if (config.aiProvider === 'huggingface') {
      reply = await generateHuggingFace(config.aiApiKey, config.aiModel || 'mistralai/Mistral-7B-Instruct-v0.2', prompt);
    } else if (config.aiProvider === 'anthropic') {
      reply = await generateAnthropic(config.aiApiKey, config.aiModel || 'claude-3-haiku-20240307', prompt);
    } else if (config.aiProvider === 'ollama') {
      reply = await generateOllama(config.aiModel || 'llama3.2', prompt);
    } else {
      return { success: false, error: 'Provider not supported for generation' };
    }
    
    console.log('[AI] Generated reply:', reply.substring(0, 100));
    store.audit('ai.reply_generated', { postTitle: post.title, replyLength: reply.length });
    return { success: true, reply };
  } catch (error) {
    console.error('[AI] Generation failed:', error);
    store.audit('ai.reply_failed', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Generate with OpenAI
async function generateOpenAI(apiKey, model, prompt, temperature = 0.7) {
  const https = require('https');
  const postData = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature,
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          resolve(parsed.choices[0].message.content);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Generate with Groq
async function generateGroq(apiKey, model, prompt, temperature = 0.7) {
  const https = require('https');
  const postData = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature,
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          resolve(parsed.choices[0].message.content);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Generate with Together AI
async function generateTogether(apiKey, model, prompt, temperature = 0.7) {
  const https = require('https');
  const postData = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature,
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.together.xyz',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          resolve(parsed.choices[0].message.content);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Generate with HuggingFace
async function generateHuggingFace(apiKey, model, prompt, temperature = 0.7) {
  const https = require('https');
  const postData = JSON.stringify({
    inputs: prompt,
    parameters: { max_new_tokens: 300, return_full_text: false, temperature },
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api-inference.huggingface.co',
      path: `/models/${model}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          const text = Array.isArray(parsed) ? parsed[0].generated_text : parsed.generated_text;
          resolve(text);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Generate with Anthropic
async function generateAnthropic(apiKey, model, prompt, temperature = 0.7) {
  const https = require('https');
  const postData = JSON.stringify({
    model,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
    temperature,
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          resolve(parsed.content[0].text);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Generate with Google
async function generateGoogle(apiKey, model, prompt, temperature = 0.7) {
  const https = require('https');
  const postData = JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature,
      maxOutputTokens: 300,
    },
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          resolve(parsed.candidates[0].content.parts[0].text);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Generate with Ollama (LOCAL)
async function generateOllama(model, prompt, temperature = 0.7) {
  const http = require('http');
  
  // Use model name without tag, or default to llama3.2
  const modelName = model ? model.split(':')[0] : 'llama3.2';
  
  const postData = JSON.stringify({
    model: modelName,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
    options: { temperature },
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 60000, // 60 second timeout for generation
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.message.content);
          } catch (error) {
            reject(new Error('Invalid JSON response from Ollama'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('Ollama is not running. Please start Ollama first.'));
      } else {
        reject(error);
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama generation timeout. The model might be loading or too slow.'));
    });
    
    req.write(postData);
    req.end();
  });
}

async function runCliCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    const proc = spawn('node', [cliPath, command, ...args], {
      cwd: path.join(__dirname, '..'),
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        reject(new Error(error || 'Command failed'));
      }
    });
  });
}

function runCommand(command) {
  mainWindow.webContents.send('run-command', command);
}

// ============================================
// AUTO-UPDATER CONFIGURATION
// ============================================

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true; // Install on quit if downloaded

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] Update available:', info.version);
  
  // Show dialog to user
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available!`,
    detail: 'Would you like to download it now? The update will be installed when you quit the app.',
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1,
  }).then((result) => {
    if (result.response === 0) {
      // User clicked Download
      autoUpdater.downloadUpdate();
      
      // Show downloading notification
      mainWindow.webContents.executeJavaScript(`
        if (window.showNotification) {
          window.showNotification('⬇️ Downloading update...', 'info');
        }
      `);
    }
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdater] No updates available');
});

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater] Error:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  const percent = Math.round(progressObj.percent);
  console.log(`[AutoUpdater] Download progress: ${percent}%`);
  
  // Update UI
  mainWindow.webContents.executeJavaScript(`
    if (window.showNotification) {
      window.showNotification('⬇️ Downloading update: ${percent}%', 'info');
    }
  `);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdater] Update downloaded:', info.version);
  
  // Show dialog
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded successfully!',
    detail: 'The update will be installed when you quit the app. Would you like to restart now?',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  }).then((result) => {
    if (result.response === 0) {
      // User clicked Restart Now
      autoUpdater.quitAndInstall();
    }
  });
});

// Check for updates on app start (after 3 seconds)
app.whenReady().then(() => {
  setTimeout(() => {
    if (!app.isPackaged) {
      console.log('[AutoUpdater] Skipping update check in development mode');
      return;
    }
    
    console.log('[AutoUpdater] Checking for updates...');
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[AutoUpdater] Failed to check for updates:', err);
    });
  }, 3000);
});

// IPC handler for manual update check
ipcMain.handle('check-for-updates', async () => {
  try {
    if (!app.isPackaged) {
      return { 
        success: false, 
        error: 'Update check is only available in production builds' 
      };
    }
    
    const result = await autoUpdater.checkForUpdates();
    return { 
      success: true, 
      updateAvailable: result.updateInfo.version !== app.getVersion(),
      currentVersion: app.getVersion(),
      latestVersion: result.updateInfo.version
    };
  } catch (error) {
    console.error('[AutoUpdater] Manual check failed:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Clean up agent intervals before quitting
  if (agentInterval) {
    clearInterval(agentInterval);
    agentInterval = null;
  }
  if (agentHourlyResetInterval) {
    clearInterval(agentHourlyResetInterval);
    agentHourlyResetInterval = null;
  }
  
  // Agent state is already saved in store.set('agentRunning')
  // So it will persist and auto-restart on next launch
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Get followers list
ipcMain.handle('get-followers', async () => {
  try {
    console.log('[Followers] Fetching followers list...');
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered', followers: [] };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      // Use profile endpoint which should include followers array
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/profile?name=${encodeURIComponent(agent.name)}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      console.log('[Followers] 📡 Fetching from:', options.path);
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            console.log('[Followers] 📋 Response status:', res.statusCode);
            
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('[Followers] 📄 Raw response keys:', Object.keys(result));
              
              // API returns { success: true, agent: {...}, followers: [...] }
              let followers = [];
              
              if (result.followers && Array.isArray(result.followers)) {
                followers = result.followers;
              } else if (result.agent && result.agent.followers && Array.isArray(result.agent.followers)) {
                followers = result.agent.followers;
              } else if (Array.isArray(result)) {
                followers = result;
              }
              
              console.log('[Followers] ✅ Loaded', followers.length, 'followers');
              console.log('[Followers] 📄 Sample data:', followers.slice(0, 2));
              
              resolve({ success: true, followers });
            } else {
              console.error('[Followers] ❌ Failed:', res.statusCode, data);
              resolve({ success: false, error: `HTTP ${res.statusCode}`, followers: [] });
            }
          } catch (error) {
            console.error('[Followers] ❌ Parse error:', error);
            resolve({ success: false, error: error.message, followers: [] });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[Followers] ❌ Request error:', error);
        resolve({ success: false, error: error.message, followers: [] });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Followers] ❌ Exception:', error);
    return { success: false, error: error.message, followers: [] };
  }
});

// Get following list
ipcMain.handle('get-following', async () => {
  try {
    console.log('[Following] Fetching following list...');
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered', following: [] };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      // Use profile endpoint which should include following array
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/profile?name=${encodeURIComponent(agent.name)}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      console.log('[Following] 📡 Fetching from:', options.path);
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            console.log('[Following] 📋 Response status:', res.statusCode);
            
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('[Following] 📄 Raw response keys:', Object.keys(result));
              
              // API returns { success: true, agent: {...}, following: [...] }
              let following = [];
              
              if (result.following && Array.isArray(result.following)) {
                following = result.following;
              } else if (result.agent && result.agent.following && Array.isArray(result.agent.following)) {
                following = result.agent.following;
              } else if (Array.isArray(result)) {
                following = result;
              }
              
              console.log('[Following] ✅ Loaded', following.length, 'following');
              console.log('[Following] 📄 Sample data:', following.slice(0, 2));
              
              resolve({ success: true, following });
            } else {
              console.error('[Following] ❌ Failed:', res.statusCode, data);
              resolve({ success: false, error: `HTTP ${res.statusCode}`, following: [] });
            }
          } catch (error) {
            console.error('[Following] ❌ Parse error:', error);
            resolve({ success: false, error: error.message, following: [] });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[Following] ❌ Request error:', error);
        resolve({ success: false, error: error.message, following: [] });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Following] ❌ Exception:', error);
    return { success: false, error: error.message, following: [] };
  }
});

// ============================================================================
// MESSAGING (DM) HANDLERS
// ============================================================================

// Check for DM activity
ipcMain.handle('dm-check', async () => {
  try {
    console.log('[DM] Checking for DM activity...');
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: '/api/v1/agents/dm/check',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('[DM] ✅ Activity check:', result.summary || 'No activity');
              resolve({ success: true, ...result });
            } else {
              console.error('[DM] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          } catch (error) {
            console.error('[DM] ❌ Parse error:', error);
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[DM] ❌ Request error:', error);
        resolve({ success: false, error: error.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[DM] ❌ Exception:', error);
    return { success: false, error: error.message };
  }
});

// Get DM requests (pending)
ipcMain.handle('dm-get-requests', async () => {
  try {
    console.log('[DM] Fetching pending requests...');
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered', requests: [] };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: '/api/v1/agents/dm/requests',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('[DM] ✅ Loaded', result.requests?.count || 0, 'requests');
              resolve({ success: true, requests: result.requests?.items || [] });
            } else {
              console.error('[DM] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}`, requests: [] });
            }
          } catch (error) {
            console.error('[DM] ❌ Parse error:', error);
            resolve({ success: false, error: error.message, requests: [] });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[DM] ❌ Request error:', error);
        resolve({ success: false, error: error.message, requests: [] });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[DM] ❌ Exception:', error);
    return { success: false, error: error.message, requests: [] };
  }
});

// Approve DM request
ipcMain.handle('dm-approve-request', async (event, conversationId) => {
  try {
    console.log('[DM] Approving request:', conversationId);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/dm/requests/${conversationId}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              console.log('[DM] ✅ Request approved');
              resolve({ success: true });
            } else {
              console.error('[DM] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Reject DM request
ipcMain.handle('dm-reject-request', async (event, conversationId, block = false) => {
  try {
    console.log('[DM] Rejecting request:', conversationId, 'block:', block);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const postData = JSON.stringify({ block });
      
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/dm/requests/${conversationId}/reject`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              console.log('[DM] ✅ Request rejected');
              resolve({ success: true });
            } else {
              console.error('[DM] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get conversations
ipcMain.handle('dm-get-conversations', async () => {
  try {
    console.log('[DM] Fetching conversations...');
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered', conversations: [] };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: '/api/v1/agents/dm/conversations',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('[DM] ✅ Loaded', result.conversations?.count || 0, 'conversations');
              resolve({ 
                success: true, 
                conversations: result.conversations?.items || [],
                total_unread: result.total_unread || 0
              });
            } else {
              console.error('[DM] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}`, conversations: [] });
            }
          } catch (error) {
            console.error('[DM] ❌ Parse error:', error);
            resolve({ success: false, error: error.message, conversations: [] });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[DM] ❌ Request error:', error);
        resolve({ success: false, error: error.message, conversations: [] });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[DM] ❌ Exception:', error);
    return { success: false, error: error.message, conversations: [] };
  }
});

// Get conversation messages
ipcMain.handle('dm-get-messages', async (event, conversationId) => {
  try {
    console.log('[DM] Fetching messages for:', conversationId);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered', messages: [] };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/dm/conversations/${conversationId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('[DM] ✅ Loaded', result.messages?.length || 0, 'messages');
              resolve({ 
                success: true, 
                messages: result.messages || [],
                conversation: result.conversation || {}
              });
            } else {
              console.error('[DM] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}`, messages: [] });
            }
          } catch (error) {
            console.error('[DM] ❌ Parse error:', error);
            resolve({ success: false, error: error.message, messages: [] });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[DM] ❌ Request error:', error);
        resolve({ success: false, error: error.message, messages: [] });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[DM] ❌ Exception:', error);
    return { success: false, error: error.message, messages: [] };
  }
});

// Send message
ipcMain.handle('dm-send-message', async (event, conversationId, message, needsHumanInput = false) => {
  try {
    console.log('[DM] Sending message to:', conversationId);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const postData = JSON.stringify({ message, needs_human_input: needsHumanInput });
      
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/agents/dm/conversations/${conversationId}/send`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              console.log('[DM] ✅ Message sent');
              resolve({ success: true });
            } else {
              console.error('[DM] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Start new DM conversation
ipcMain.handle('dm-start-conversation', async (event, toAgent, message) => {
  try {
    console.log('[DM] Starting conversation with:', toAgent);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const postData = JSON.stringify({ to: toAgent, message });
      
      const options = {
        hostname: 'www.moltbook.com',
        path: '/api/v1/agents/dm/request',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('[DM] ✅ Conversation request sent');
              resolve({ success: true, conversation_id: result.conversation_id });
            } else {
              console.error('[DM] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================================
// PROFILE MANAGEMENT HANDLERS
// ============================================================================

// Upload avatar
ipcMain.handle('upload-avatar', async (event, imagePath) => {
  try {
    console.log('[Profile] Uploading avatar:', imagePath);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const fs = require('fs');
    const https = require('https');
    const path = require('path');
    
    // Check file exists and size
    const stats = fs.statSync(imagePath);
    if (stats.size > 500 * 1024) {
      return { success: false, error: 'Image too large (max 500 KB)' };
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(imagePath);
    const fileName = path.basename(imagePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Build multipart form data
    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`),
      Buffer.from(`Content-Type: image/${path.extname(imagePath).substring(1)}\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: '/api/v1/agents/me/avatar',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': formData.length,
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('[Profile] ✅ Avatar uploaded');
              resolve({ success: true, avatar_url: result.avatar_url });
            } else {
              console.error('[Profile] ❌ Failed:', res.statusCode, data);
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      req.write(formData);
      req.end();
    });
  } catch (error) {
    console.error('[Profile] ❌ Exception:', error);
    return { success: false, error: error.message };
  }
});

// Remove avatar
ipcMain.handle('remove-avatar', async () => {
  try {
    console.log('[Profile] Removing avatar...');
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: '/api/v1/agents/me/avatar',
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              console.log('[Profile] ✅ Avatar removed');
              resolve({ success: true });
            } else {
              console.error('[Profile] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update profile description
ipcMain.handle('update-profile', async (event, description) => {
  try {
    console.log('[Profile] Updating description...');
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const postData = JSON.stringify({ description });
      
      const options = {
        hostname: 'www.moltbook.com',
        path: '/api/v1/agents/me',
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/1.3.2',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              console.log('[Profile] ✅ Profile updated');
              resolve({ success: true });
            } else {
              console.error('[Profile] ❌ Failed:', res.statusCode);
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// AI ACTIVITY API HANDLERS
// ============================================

// Get AI replies
ipcMain.handle('get-ai-replies', async () => {
  try {
    const aiReplies = store.get('aiReplies', []);
    const repliesToday = store.get('agentRepliesToday', 0);
    
    return {
      success: true,
      replies: aiReplies,
      repliesToday,
      repliesThisHour: agentRepliesThisHour
    };
  } catch (error) {
    console.error('[AIReplies] Failed to get AI replies:', error);
    return { success: false, error: error.message };
  }
});

// Clear AI replies
ipcMain.handle('clear-ai-replies', async () => {
  try {
    store.set('aiReplies', []);
    store.set('agentRepliesToday', 0);
    agentRepliesThisHour = 0;
    
    return { success: true };
  } catch (error) {
    console.error('[AIReplies] Failed to clear AI replies:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// VOTING SYSTEM
// ============================================

// Upvote a post
ipcMain.handle('upvote-post', async (event, { postId }) => {
  try {
    console.log('[Vote] Upvoting post:', postId);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/posts/${postId}/upvote`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[Vote] Upvote response status:', res.statusCode);
          console.log('[Vote] Upvote response data:', data);
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('[Vote] ✅ Post upvoted successfully');
              resolve({ success: true, ...parsed });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[Vote] Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Vote] ❌ Failed to upvote post:', error);
    return { success: false, error: error.message };
  }
});

// Downvote a post
ipcMain.handle('downvote-post', async (event, { postId }) => {
  try {
    console.log('[Vote] Downvoting post:', postId);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/posts/${postId}/downvote`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[Vote] Downvote response status:', res.statusCode);
          console.log('[Vote] Downvote response data:', data);
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('[Vote] ✅ Post downvoted successfully');
              resolve({ success: true, ...parsed });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[Vote] Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Vote] ❌ Failed to downvote post:', error);
    return { success: false, error: error.message };
  }
});

// Upvote a comment
ipcMain.handle('upvote-comment', async (event, { commentId }) => {
  try {
    console.log('[Vote] Upvoting comment:', commentId);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/comments/${commentId}/upvote`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[Vote] Upvote comment response status:', res.statusCode);
          console.log('[Vote] Upvote comment response data:', data);
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('[Vote] ✅ Comment upvoted successfully');
              resolve({ success: true, ...parsed });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[Vote] Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Vote] ❌ Failed to upvote comment:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// SUBMOLT SUBSCRIPTION
// ============================================

// Subscribe to submolt
ipcMain.handle('subscribe-submolt', async (event, { submoltName }) => {
  try {
    console.log('[Submolt] Subscribing to:', submoltName);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/submolts/${submoltName}/subscribe`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[Submolt] Subscribe response status:', res.statusCode);
          console.log('[Submolt] Subscribe response data:', data);
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('[Submolt] ✅ Subscribed successfully');
              resolve({ success: true, ...parsed });
            } catch (e) {
              resolve({ success: true }); // Some APIs return empty response
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[Submolt] Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Submolt] ❌ Failed to subscribe:', error);
    return { success: false, error: error.message };
  }
});

// Unsubscribe from submolt
ipcMain.handle('unsubscribe-submolt', async (event, { submoltName }) => {
  try {
    console.log('[Submolt] Unsubscribing from:', submoltName);
    
    const agent = store.getAgent();
    if (!agent) {
      return { success: false, error: 'No agent registered' };
    }
    
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/submolts/${submoltName}/subscribe`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('[Submolt] Unsubscribe response status:', res.statusCode);
          console.log('[Submolt] Unsubscribe response data:', data);
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('[Submolt] ✅ Unsubscribed successfully');
              resolve({ success: true, ...parsed });
            } catch (e) {
              resolve({ success: true }); // Some APIs return empty response
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
            } catch (e) {
              resolve({ success: false, error: `HTTP ${res.statusCode}` });
            }
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('[Submolt] Request error:', e);
        resolve({ success: false, error: e.message });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('[Submolt] ❌ Failed to unsubscribe:', error);
    return { success: false, error: error.message };
  }
});

app.on('before-quit', () => {
  // Ensure agent state is saved
  console.log('[App] Quitting, agent running:', store.get('agentRunning', false));
});
