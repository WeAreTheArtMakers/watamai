const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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
      if (fs.existsSync(this.agentPath)) {
        fs.unlinkSync(this.agentPath);
        this.audit('agent.deleted', {});
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
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
    const autoReplyEnabled = store.get('autoReplyEnabled', false);
    
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
          checkInterval: store.get('checkInterval', 5),
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
  const registrationEndpoint = skillInfo.apiEndpoints.find(ep => ep.includes('register')) || 
                               `${MOLTBOOK_BASE_URL}/api/v1/agents/register`;
  
  console.log('[Moltbook] 📝 Registering agent at:', registrationEndpoint);

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ 
      name, 
      description,
      // Include skill-learned information
      capabilities: skillInfo.postingGuidelines.slice(0, 5), // First 5 guidelines
      preferred_submolts: skillInfo.submolts.slice(0, 3), // First 3 submolts
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WATAM-AI/1.2.0',
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
        'User-Agent': 'WATAM-AI/1.2.0',
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
        'User-Agent': 'WATAM-AI/1.2.0',
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
  const https = require('https');
  const url = `${MOLTBOOK_BASE_URL}/api/v1/agents/me`;

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
        'User-Agent': 'WATAM-AI/1.2.0',
      },
      maxRedirects: 0,
    };

    console.log('[Moltbook] 🔍 Checking agent status...');
    console.log('[Moltbook] API Key:', maskApiKey(apiKey));
    console.log('[Moltbook] Request URL:', url);

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
              console.log('[Moltbook] 👤 Agent Details:', {
                id: agentData.id,
                name: agentData.name,
                status: agentData.status
              });
              resolve({ status: 'active', statusCode: res.statusCode, data: agentData });
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
          resolve({ status: 'error', statusCode: res.statusCode, message: 'API key invalid or expired - please re-register agent' });
        } else if (res.statusCode === 403) {
          console.error('[Moltbook] ❌ 403 Forbidden - claim not completed');
          console.error('[Moltbook] 💡 Solution: Complete the claim process on Moltbook website');
          resolve({ status: 'error', statusCode: res.statusCode, message: 'Claim not completed - please complete claim process on Moltbook' });
        } else if (res.statusCode === 404) {
          console.error('[Moltbook] ❌ 404 Not Found - agent not found');
          console.error('[Moltbook] 💡 Solution: Re-register your agent');
          resolve({ status: 'error', statusCode: res.statusCode, message: 'Agent not found - please re-register agent' });
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
        'User-Agent': 'WATAM-AI/1.2.0',
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
    const statusResult = await checkMoltbookStatus(apiKey);
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
          'User-Agent': 'WATAM-AI/1.2.0',
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
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

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
    autoReplyEnabled: store.get('autoReplyEnabled', false),
    checkInterval: store.get('checkInterval', 5),
    replySubmolts: store.get('replySubmolts', ''),
    replyKeywords: store.get('replyKeywords', ''),
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
    const agent = store.getAgent();
    if (!agent) {
      return { success: true, agent: null };
    }

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
    const result = await checkMoltbookStatus(apiKey);

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

  // Show confirmation dialog
  const response = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Confirm Publish',
    message: 'Are you sure you want to publish this post to Moltbook?',
    detail: `Submolt: ${data.submolt}\nTitle: ${data.title}`,
    buttons: ['Cancel', 'Publish'],
    defaultId: 0,
    cancelId: 0,
  });

  if (response.response !== 1) {
    return { success: false, error: 'Cancelled by user' };
  }

  try {
    const https = require('https');
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    const url = `${MOLTBOOK_BASE_URL}/api/v1/posts`;

    const postData = JSON.stringify({
      submolt: data.submolt,
      title: data.title,
      body: data.body,
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'WATAM-AI/1.2.0',
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
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const parsed = JSON.parse(responseData);
              console.log('[Main] Parsed response:', JSON.stringify(parsed, null, 2));
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
    
    // Try multiple possible ID locations in the response
    let postId = null;
    
    // Check all possible locations
    if (result.id) {
      postId = result.id;
      console.log('Found ID at result.id:', postId);
    } else if (result.post && result.post.id) {
      postId = result.post.id;
      console.log('Found ID at result.post.id:', postId);
    } else if (result.data && result.data.id) {
      postId = result.data.id;
      console.log('Found ID at result.data.id:', postId);
    } else if (result.post_id) {
      postId = result.post_id;
      console.log('Found ID at result.post_id:', postId);
    } else if (result.postId) {
      postId = result.postId;
      console.log('Found ID at result.postId:', postId);
    } else if (result.data && result.data.post && result.data.post.id) {
      postId = result.data.post.id;
      console.log('Found ID at result.data.post.id:', postId);
    }
    
    if (!postId) {
      console.error('WARNING: Could not find post ID in response!');
      console.error('Response structure:', JSON.stringify(result, null, 2));
      
      // Send to renderer for debugging
      mainWindow.webContents.executeJavaScript(`
        console.error('=== POST ID NOT FOUND ===');
        console.error('API Response:', ${JSON.stringify(JSON.stringify(result, null, 2))});
        console.error('Please send this to developer!');
      `);
    }
    
    console.log('Final extracted post ID:', postId);
    
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

    store.audit('post.published', { submolt: data.submolt, title: data.title, id: post.id });
    return { success: true, post };
  } catch (error) {
    console.error('Publish error:', error);
    store.audit('post.publish_failed', { error: error.message });
    
    // Parse error message if it's JSON
    let errorMessage = error.message;
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
            errorMessage += ` (Retry after ${errorObj.retry_after_minutes} minutes)`;
          }
        }
      }
    } catch (parseError) {
      // Keep original error message
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
    store.deleteDraft(id);
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
          'User-Agent': 'WATAM-AI/1.2.0',
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
    return { success: true, comments };
  } catch (error) {
    console.error('[Comments] Failed to fetch comments:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-heartbeat', async () => {
  try {
    console.log('[Test] 🧪 Manual heartbeat test triggered');
    await runMoltbookHeartbeat();
    return { success: true, message: 'Heartbeat test completed - check console for details' };
  } catch (error) {
    console.error('[Test] ❌ Heartbeat test failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-agent-loop', async () => {
  try {
    console.log('[Test] 🧪 Manual agent loop test triggered');
    await runAgentLoop();
    return { success: true, message: 'Agent loop test completed - check console for details' };
  } catch (error) {
    console.error('[Test] ❌ Agent loop test failed:', error);
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

ipcMain.handle('reply-to-post', async (event, { postId, body }) => {
  try {
    console.log('[Reply] ========================================');
    console.log('[Reply] Replying to post:', postId);
    console.log('[Reply] Reply body length:', body.length);
    
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
      
      const statusCheck = await checkMoltbookStatus(apiKey);
      console.log('[Reply] Agent status check result:', {
        status: statusCheck.status,
        statusCode: statusCheck.statusCode,
        hasData: !!statusCheck.data,
      });
      
      if (statusCheck.status !== 'active') {
        console.error('[Reply] ❌ Agent not active:', statusCheck.status);
        if (statusCheck.status === 'claim_pending') {
          return { success: false, error: '⚠️ Claim not completed. Please complete the claim process on Moltbook first.' };
        } else if (statusCheck.status === 'error') {
          return { success: false, error: '❌ Agent status: error. This means the claim is not completed. Please complete the claim process on Moltbook first.' };
        } else {
          return { success: false, error: `⚠️ Agent status: ${statusCheck.status}. Please check Settings.` };
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

    const postData = JSON.stringify({ body });

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
          'User-Agent': 'WATAM-AI/1.2.0',
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

    const postData = JSON.stringify({ body });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/comments/${commentId}/replies`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'WATAM-AI/1.2.0',
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
          'User-Agent': 'WATAM-AI/1.2.0',
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

// Agent loop state
let agentInterval = null;
let agentRepliesThisHour = 0;
let agentHourlyResetInterval = null;
let moltbookHeartbeatInterval = null; // 4-hour heartbeat

// Start Moltbook heartbeat (4-hour cycle)
function startMoltbookHeartbeat() {
  // Clear existing heartbeat
  if (moltbookHeartbeatInterval) {
    clearInterval(moltbookHeartbeatInterval);
  }
  
  const agent = store.getAgent();
  if (!agent || agent.status !== 'active') {
    console.log('[Moltbook] ❌ Cannot start heartbeat - agent not active');
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
    
    // 1. Refresh skill.md knowledge
    console.log('[Moltbook] 📚 Refreshing skill.md knowledge...');
    try {
      const skillInfo = await fetchAndParseMoltbookSkill();
      
      // Update agent with new skill info
      agent.skillInfo = skillInfo;
      agent.skillUpdatedAt = new Date().toISOString();
      store.saveAgent(agent);
      
      console.log('[Moltbook] ✅ Skill knowledge updated');
    } catch (error) {
      console.warn('[Moltbook] ⚠️ Could not update skill knowledge:', error.message);
    }
    
    // 2. Check agent status
    console.log('[Moltbook] 🔍 Checking agent status...');
    try {
      const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
      const statusResult = await checkMoltbookStatus(apiKey);
      
      if (statusResult.status === 'active') {
        console.log('[Moltbook] ✅ Agent status confirmed active');
      } else {
        console.error('[Moltbook] ❌ Agent status changed to:', statusResult.status);
        return; // Don't continue if agent not active
      }
    } catch (error) {
      console.error('[Moltbook] ❌ Status check failed:', error.message);
      return;
    }
    
    // 3. Run agent loop (browse, engage, post)
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

  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'WATAM-AI/1.2.0',
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
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Failed to fetch feed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Alternative feed fetching method - try different endpoints
async function fetchMoltbookFeedAlternative(apiKey) {
  const https = require('https');
  
  // Try different possible endpoints
  const endpoints = [
    '/api/v1/posts',           // Get recent posts
    '/api/v1/posts/recent',    // Alternative recent posts
    '/api/v1/submolts/all/posts', // All submolts posts
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
            'User-Agent': 'WATAM-AI/1.2.0',
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
                } else if (parsed.data) {
                  resolve({ posts: parsed.data });
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

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      body: replyText,
    });

    const options = {
      hostname: 'www.moltbook.com',
      path: `/api/v1/posts/${postId}/comments`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WATAM-AI/1.2.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[AI] Post reply response:', res.statusCode, data.substring(0, 200));
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error('⚠️ Authentication failed. Please complete the claim process on Moltbook.'));
        } else {
          reject(new Error(`Failed to post reply: HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('[AI] Post reply error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
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
      return;
    }
    
    if (agent.status !== 'active') {
      console.error('[AI] ❌ Agent not active, status:', agent.status);
      return;
    }
    
    console.log('[AI] ✅ Agent is active:', agent.name);
    
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
        return;
      }
    }
    
    if (!feed || !feed.posts || feed.posts.length === 0) {
      console.log('[AI] ⚠️ No posts in feed');
      return;
    }
    
    console.log('[AI] 📊 Fetched', feed.posts.length, 'posts from feed');
    
    // Filter posts by submolts
    let filteredPosts = feed.posts;
    if (config.replySubmolts) {
      const submolts = config.replySubmolts.split(',').map(s => s.trim().toLowerCase());
      filteredPosts = filteredPosts.filter(post => 
        submolts.includes(post.submolt?.toLowerCase())
      );
      console.log('[AI] Filtered by submolts:', filteredPosts.length, 'posts');
    }
    
    // Filter posts by keywords
    if (config.replyKeywords) {
      const keywords = config.replyKeywords.split(',').map(k => k.trim().toLowerCase());
      filteredPosts = filteredPosts.filter(post => {
        const text = `${post.title} ${post.body}`.toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      });
      console.log('[AI] Filtered by keywords:', filteredPosts.length, 'posts');
    }
    
    if (filteredPosts.length === 0) {
      console.log('[AI] No posts match filters');
      return;
    }
    
    // Get posts we've already replied to
    const repliedPosts = store.get('agentRepliedPosts', []);
    
    // Find posts we haven't replied to yet
    const newPosts = filteredPosts.filter(post => !repliedPosts.includes(post.id));
    
    if (newPosts.length === 0) {
      console.log('[AI] No new posts to reply to');
      return;
    }
    
    console.log('[AI] Found', newPosts.length, 'new posts to reply to');
    
    // Reply to first post (one at a time to avoid spam)
    const post = newPosts[0];
    console.log('[AI] Generating reply for post:', post.id, '-', post.title);
    
    // Generate reply
    const replyResult = await generateAIReply(config, post);
    
    if (!replyResult.success) {
      console.error('[AI] Failed to generate reply:', replyResult.error);
      store.audit('ai.agent_reply_failed', { postId: post.id, error: replyResult.error });
      return;
    }
    
    // Post reply
    await postMoltbookReply(apiKey, post.id, replyResult.reply);
    
    // Track replied post
    repliedPosts.push(post.id);
    store.set('agentRepliedPosts', repliedPosts);
    
    // Increment counters
    agentRepliesThisHour++;
    const repliesToday = store.get('agentRepliesToday', 0);
    store.set('agentRepliesToday', repliesToday + 1);
    
    console.log('[AI] Successfully replied to post:', post.id);
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
      });
    }
    
  } catch (error) {
    console.error('[AI] Agent loop error:', error);
    store.audit('ai.agent_error', { error: error.message });
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
      checkInterval: store.get('checkInterval', 5),
      replySubmolts: store.get('replySubmolts', ''),
      replyKeywords: store.get('replyKeywords', ''),
      maxRepliesPerHour: store.get('maxRepliesPerHour', 10),
      autoReplyEnabled: store.get('autoReplyEnabled', false),
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

app.on('before-quit', () => {
  // Ensure agent state is saved
  console.log('[App] Quitting, agent running:', store.get('agentRunning', false));
});
