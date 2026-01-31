// AI Agent Configuration

let agentInterval = null;
let agentRunning = false;

// AI Provider configurations
const AI_PROVIDERS = {
  ollama: {
    name: 'Ollama (LOCAL)',
    models: [], // Will be populated dynamically
    endpoint: 'http://localhost:11434/api/chat',
    free: true,
    local: true,
  },
  groq: {
    name: 'Groq (FREE)',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    free: true,
  },
  together: {
    name: 'Together AI (FREE)',
    models: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    free: true,
  },
  huggingface: {
    name: 'HuggingFace (FREE)',
    models: ['mistralai/Mistral-7B-Instruct-v0.3', 'meta-llama/Meta-Llama-3-8B-Instruct'],
    endpoint: 'https://api-inference.huggingface.co/models',
    free: true,
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-opus-4.5', 'claude-sonnet-4.5', 'claude-haiku-4.5', 'claude-opus-4.1'],
    endpoint: 'https://api.anthropic.com/v1/messages',
  },
  google: {
    name: 'Google',
    models: ['gemini-3-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-3-flash-preview'],
    endpoint: 'https://generativelanguage.googleapis.com/v1/models',
  },
  custom: {
    name: 'Custom',
    models: [],
    endpoint: '',
  },
};

// Initialize AI config page
async function initAIConfig() {
  console.log('[AI] Initializing AI config page...');
  await loadOllamaModels(); // Load Ollama models first
  await loadAIConfig();
  setupAIEventListeners();
  updateAgentStatus();
}

// Load Ollama models dynamically
async function loadOllamaModels() {
  try {
    console.log('[AI] Loading Ollama models...');
    const result = await window.electronAPI.getOllamaModels();
    
    if (result.success && result.models && result.models.length > 0) {
      AI_PROVIDERS.ollama.models = result.models;
      console.log('[AI] Loaded Ollama models:', result.models);
    } else {
      // Fallback to common models if Ollama not running
      AI_PROVIDERS.ollama.models = ['llama3.2', 'llama3.1', 'mistral', 'phi3', 'gemma2', 'qwen2.5'];
      console.log('[AI] Ollama not running, using default models');
    }
  } catch (error) {
    console.error('[AI] Failed to load Ollama models:', error);
    AI_PROVIDERS.ollama.models = ['llama3.2', 'llama3.1', 'mistral', 'phi3', 'gemma2', 'qwen2.5'];
  }
}

// Load AI configuration
async function loadAIConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    
    console.log('[AI] Loading config:', {
      provider: config.aiProvider,
      model: config.aiModel,
      autoReply: config.autoReplyEnabled,
      running: config.agentRunning,
    });
    
    // AI Provider settings
    if (config.aiProvider) {
      document.getElementById('aiProvider').value = config.aiProvider;
      updateModelOptions(config.aiProvider);
      
      // Show/hide API key for Ollama
      const apiKeyGroup = document.getElementById('aiApiKey').parentElement;
      if (config.aiProvider === 'ollama') {
        apiKeyGroup.style.display = 'none';
      } else {
        apiKeyGroup.style.display = 'block';
      }
    }
    if (config.aiApiKey) {
      document.getElementById('aiApiKey').value = config.aiApiKey;
    }
    if (config.aiModel) {
      // Wait a bit for model options to load
      setTimeout(() => {
        document.getElementById('aiModel').value = config.aiModel;
      }, 100);
    }
    if (config.customEndpoint) {
      document.getElementById('customEndpoint').value = config.customEndpoint;
    }
    
    // Auto-reply settings
    document.getElementById('autoReplyEnabled').checked = config.autoReplyEnabled || false;
    document.getElementById('checkInterval').value = config.checkInterval || 5;
    document.getElementById('replySubmolts').value = config.replySubmolts || '';
    document.getElementById('replyKeywords').value = config.replyKeywords || '';
    document.getElementById('maxRepliesPerHour').value = config.maxRepliesPerHour || 10;
    
    // Advanced settings
    document.getElementById('responseLength').value = config.responseLength || 'medium';
    document.getElementById('responseStyle').value = config.responseStyle || 'friendly';
    document.getElementById('temperature').value = (config.temperature || 0.7) * 10;
    document.getElementById('temperatureValue').textContent = (config.temperature || 0.7).toFixed(1);
    document.getElementById('usePersona').checked = config.usePersona !== false; // Default true
    document.getElementById('avoidRepetition').checked = config.avoidRepetition !== false; // Default true
    
    // Sync agent running state from backend
    agentRunning = config.agentRunning || false;
    console.log('[AI] Agent running state from config:', agentRunning);
    
    updateAgentStatus();
  } catch (error) {
    console.error('[AI] Failed to load config:', error);
  }
}

// Setup event listeners
function setupAIEventListeners() {
  // AI Provider change
  document.getElementById('aiProvider').onchange = (e) => {
    const provider = e.target.value;
    updateModelOptions(provider);
    
    // Show/hide custom endpoint
    const customGroup = document.getElementById('customEndpointGroup');
    customGroup.style.display = provider === 'custom' ? 'block' : 'none';
    
    // Show/hide API key field for Ollama
    const apiKeyGroup = document.getElementById('aiApiKey').parentElement;
    if (provider === 'ollama') {
      apiKeyGroup.style.display = 'none';
    } else {
      apiKeyGroup.style.display = 'block';
    }
  };
  
  // Test AI connection
  document.getElementById('testAiBtn').onclick = testAIConnection;
  
  // Save AI config
  document.getElementById('saveAiConfigBtn').onclick = saveAIConfig;
  
  // Save auto-reply settings
  document.getElementById('saveAutoReplyBtn').onclick = saveAutoReplySettings;
  
  // Save advanced settings
  document.getElementById('saveAdvancedBtn').onclick = saveAdvancedSettings;
  
  // Temperature slider
  document.getElementById('temperature').oninput = (e) => {
    const value = (e.target.value / 10).toFixed(1);
    document.getElementById('temperatureValue').textContent = value;
  };
  
  // Start/Stop agent
  document.getElementById('startAgentBtn').onclick = startAgent;
  document.getElementById('stopAgentBtn').onclick = stopAgent;
  
  // Test reply
  document.getElementById('testReplyBtn').onclick = testReply;
  
  // Manual reply to URL
  document.getElementById('sendManualReplyBtn').onclick = sendManualReply;
}

// Update model options based on provider
function updateModelOptions(provider) {
  const modelSelect = document.getElementById('aiModel');
  const modelGroup = document.getElementById('aiModelGroup');
  
  if (!provider || provider === 'custom') {
    modelGroup.style.display = 'none';
    return;
  }
  
  modelGroup.style.display = 'block';
  const config = AI_PROVIDERS[provider];
  
  modelSelect.innerHTML = '<option value="">-- Select Model --</option>';
  
  // For Ollama, show installed models
  if (provider === 'ollama') {
    if (config.models.length === 0) {
      const note = document.createElement('option');
      note.disabled = true;
      note.textContent = '--- No models found. Run: ollama pull llama3.2 ---';
      modelSelect.appendChild(note);
    } else {
      const note = document.createElement('option');
      note.disabled = true;
      note.textContent = `--- ${config.models.length} Installed Models ---`;
      modelSelect.appendChild(note);
      
      config.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
    }
  } else {
    // For other providers, show available models
    config.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
  }
}

// Test AI connection
async function testAIConnection() {
  const provider = document.getElementById('aiProvider').value;
  const apiKey = document.getElementById('aiApiKey').value;
  const model = document.getElementById('aiModel').value;
  
  if (!provider) {
    showAIStatus('Please select an AI provider', 'error');
    return;
  }
  
  // Ollama doesn't need API key
  if (provider !== 'ollama' && !apiKey) {
    showAIStatus('Please enter an API key', 'error');
    return;
  }
  
  showAIStatus('Testing connection...', 'info');
  
  try {
    const result = await window.electronAPI.testAIConnection({
      provider,
      apiKey: apiKey || 'not-needed',
      model,
    });
    
    if (result.success) {
      showAIStatus('✅ Connection successful!', 'success');
    } else {
      showAIStatus('❌ Connection failed: ' + result.error, 'error');
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
  }
}

// Save AI configuration
async function saveAIConfig() {
  const provider = document.getElementById('aiProvider').value;
  const apiKey = document.getElementById('aiApiKey').value;
  const model = document.getElementById('aiModel').value;
  const customEndpoint = document.getElementById('customEndpoint').value;
  
  if (!provider) {
    showAIStatus('Please select an AI provider', 'error');
    return;
  }
  
  // Ollama doesn't need API key
  if (provider !== 'ollama' && !apiKey) {
    showAIStatus('Please enter an API key', 'error');
    return;
  }
  
  if (!model && provider !== 'custom') {
    showAIStatus('Please select a model', 'error');
    return;
  }
  
  console.log('[AI] Saving config:', { provider, model, hasApiKey: !!apiKey });
  
  try {
    const result = await window.electronAPI.saveConfig({
      aiProvider: provider,
      aiApiKey: apiKey || 'not-needed',
      aiModel: model,
      customEndpoint: customEndpoint,
    });
    
    if (result.success) {
      showAIStatus('✅ Configuration saved!', 'success');
      console.log('[AI] Config saved successfully');
      updateAgentStatus();
    } else {
      showAIStatus('❌ Failed to save configuration', 'error');
      console.error('[AI] Failed to save config');
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
    console.error('[AI] Save config error:', error);
  }
}

// Save auto-reply settings
async function saveAutoReplySettings() {
  const autoReplyEnabled = document.getElementById('autoReplyEnabled').checked;
  const checkInterval = parseInt(document.getElementById('checkInterval').value);
  const replySubmolts = document.getElementById('replySubmolts').value;
  const replyKeywords = document.getElementById('replyKeywords').value;
  const maxRepliesPerHour = parseInt(document.getElementById('maxRepliesPerHour').value);
  
  console.log('[AI] Saving auto-reply settings:', {
    enabled: autoReplyEnabled,
    interval: checkInterval,
    submolts: replySubmolts,
    keywords: replyKeywords,
    maxPerHour: maxRepliesPerHour,
  });
  
  try {
    const result = await window.electronAPI.saveConfig({
      autoReplyEnabled,
      checkInterval,
      replySubmolts,
      replyKeywords,
      maxRepliesPerHour,
    });
    
    if (result.success) {
      showAIStatus('✅ Auto-reply settings saved!', 'success');
      console.log('[AI] Auto-reply settings saved successfully');
      updateAgentStatus();
    } else {
      showAIStatus('❌ Failed to save settings', 'error');
      console.error('[AI] Failed to save auto-reply settings');
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
    console.error('[AI] Save auto-reply error:', error);
  }
}

// Save advanced settings
async function saveAdvancedSettings() {
  const responseLength = document.getElementById('responseLength').value;
  const responseStyle = document.getElementById('responseStyle').value;
  const temperature = parseFloat(document.getElementById('temperature').value) / 10;
  const usePersona = document.getElementById('usePersona').checked;
  const avoidRepetition = document.getElementById('avoidRepetition').checked;
  
  console.log('[AI] Saving advanced settings:', {
    length: responseLength,
    style: responseStyle,
    temp: temperature,
    persona: usePersona,
    avoidRep: avoidRepetition,
  });
  
  try {
    const result = await window.electronAPI.saveConfig({
      responseLength,
      responseStyle,
      temperature,
      usePersona,
      avoidRepetition,
    });
    
    if (result.success) {
      showAIStatus('✅ Advanced settings saved!', 'success');
      console.log('[AI] Advanced settings saved successfully');
    } else {
      showAIStatus('❌ Failed to save settings', 'error');
      console.error('[AI] Failed to save advanced settings');
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
    console.error('[AI] Save advanced error:', error);
  }
}

// Start agent
async function startAgent() {
  console.log('[AI] Start Agent button clicked');
  
  const config = await window.electronAPI.getConfig();
  console.log('[AI] Config:', {
    aiProvider: config.aiProvider,
    hasApiKey: !!config.aiApiKey,
    autoReplyEnabled: config.autoReplyEnabled,
  });
  
  // Validate configuration
  if (!config.aiProvider) {
    showAIStatus('❌ Please configure AI provider first', 'error');
    console.error('[AI] No AI provider configured');
    return;
  }
  
  // Ollama doesn't need API key
  if (config.aiProvider !== 'ollama' && !config.aiApiKey) {
    showAIStatus('❌ Please configure AI API key first', 'error');
    console.error('[AI] No API key configured');
    return;
  }
  
  if (!config.autoReplyEnabled) {
    showAIStatus('❌ Please enable auto-reply first', 'error');
    console.error('[AI] Auto-reply not enabled');
    return;
  }
  
  console.log('[AI] Starting agent...');
  showAIStatus('Starting agent...', 'info');
  
  try {
    const result = await window.electronAPI.startAgent();
    console.log('[AI] Start agent result:', result);
    
    if (result.success) {
      agentRunning = true;
      updateAgentStatus();
      
      if (result.alreadyRunning) {
        showAIStatus('✅ Agent is already running', 'success');
        console.log('[AI] Agent was already running');
      } else {
        showAIStatus('✅ Agent started successfully!', 'success');
        logActivity('Agent started');
        console.log('[AI] Agent started successfully');
      }
    } else {
      showAIStatus('❌ Failed to start agent: ' + result.error, 'error');
      console.error('[AI] Failed to start agent:', result.error);
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
    console.error('[AI] Start agent exception:', error);
  }
}

// Stop agent
async function stopAgent() {
  try {
    const result = await window.electronAPI.stopAgent();
    
    if (result.success) {
      agentRunning = false;
      updateAgentStatus();
      showAIStatus('Agent stopped', 'info');
      logActivity('Agent stopped');
    } else {
      showAIStatus('❌ Failed to stop agent: ' + result.error, 'error');
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
  }
}

// Test reply
async function testReply() {
  console.log('[AI] Test Reply button clicked');
  
  const config = await window.electronAPI.getConfig();
  console.log('[AI] Current config:', {
    provider: config.aiProvider,
    hasApiKey: !!config.aiApiKey,
    model: config.aiModel,
    apiKeyLength: config.aiApiKey ? config.aiApiKey.length : 0,
  });
  
  if (!config.aiProvider) {
    showAIStatus('❌ Please select AI provider first', 'error');
    console.error('[AI] Missing provider');
    return;
  }
  
  // Ollama doesn't need API key
  if (config.aiProvider !== 'ollama' && !config.aiApiKey) {
    showAIStatus('❌ Please enter API key first', 'error');
    console.error('[AI] Missing API key');
    return;
  }
  
  showAIStatus('Generating test reply...', 'info');
  console.log('[AI] Calling generateReply...');
  
  try {
    const result = await window.electronAPI.generateReply({
      post: {
        title: 'Welcome to WATAM!',
        body: 'Hey everyone! I just discovered WATAM and modX. Can someone explain what this community is about?',
      },
    });
    
    console.log('[AI] generateReply result:', result);
    
    if (result.success) {
      showAIStatus('✅ Test reply generated successfully!', 'success');
      logActivity('Test reply generated: ' + result.reply.substring(0, 100) + '...');
      
      // Show reply in console
      console.log('=== TEST REPLY ===');
      console.log(result.reply);
      console.log('=== END TEST REPLY ===');
      
      // Show notification
      if (window.showNotification) {
        window.showNotification('Test reply generated! Check console for full text.', 'success');
      }
    } else {
      showAIStatus('❌ Failed to generate reply: ' + result.error, 'error');
      console.error('[AI] Test reply error:', result.error);
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
    console.error('[AI] Test reply exception:', error);
  }
}

// Send manual reply to specific post URL
async function sendManualReply() {
  console.log('[AI] Send Manual Reply button clicked');
  
  const url = document.getElementById('manualReplyUrl').value.trim();
  
  if (!url) {
    showManualReplyStatus('❌ Please enter a post URL', 'error');
    return;
  }
  
  // Extract post ID from URL
  // Format: https://www.moltbook.com/post/{POST_ID}
  const match = url.match(/\/post\/([a-f0-9-]+)/i);
  if (!match) {
    showManualReplyStatus('❌ Invalid post URL format', 'error');
    return;
  }
  
  const postId = match[1];
  console.log('[AI] Extracted post ID:', postId);
  
  // Check config
  const config = await window.electronAPI.getConfig();
  
  if (!config.aiProvider) {
    showManualReplyStatus('❌ Please configure AI provider first', 'error');
    return;
  }
  
  if (config.aiProvider !== 'ollama' && !config.aiApiKey) {
    showManualReplyStatus('❌ Please configure API key first', 'error');
    return;
  }
  
  showManualReplyStatus('🔄 Fetching post...', 'info');
  
  try {
    // Fetch post details
    const postResult = await window.electronAPI.getPostDetails(postId);
    
    if (!postResult.success) {
      showManualReplyStatus('❌ Failed to fetch post: ' + postResult.error, 'error');
      return;
    }
    
    const post = postResult.post;
    console.log('[AI] Fetched post:', post.title);
    
    showManualReplyStatus('🤖 Generating AI reply...', 'info');
    
    // Generate reply
    const replyResult = await window.electronAPI.generateReply({ post });
    
    if (!replyResult.success) {
      showManualReplyStatus('❌ Failed to generate reply: ' + replyResult.error, 'error');
      return;
    }
    
    console.log('[AI] Generated reply:', replyResult.reply.substring(0, 100));
    
    showManualReplyStatus('📤 Posting reply...', 'info');
    
    // Post reply
    const postReplyResult = await window.electronAPI.replyToPost({
      postId,
      body: replyResult.reply,
    });
    
    if (postReplyResult.success) {
      showManualReplyStatus('✅ Reply posted successfully!', 'success');
      logActivity(`Manual reply sent to post: ${post.title}`);
      
      // Clear URL field
      document.getElementById('manualReplyUrl').value = '';
      
      // Show notification
      if (window.showNotification) {
        window.showNotification('AI reply posted successfully!', 'success');
      }
    } else {
      showManualReplyStatus('❌ Failed to post reply: ' + postReplyResult.error, 'error');
    }
    
  } catch (error) {
    showManualReplyStatus('❌ Error: ' + error.message, 'error');
    console.error('[AI] Manual reply error:', error);
  }
}

function showManualReplyStatus(message, type) {
  const statusDiv = document.getElementById('manualReplyStatus');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.classList.remove('hidden');
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 5000);
  }
}

// Update agent status display
async function updateAgentStatus() {
  const config = await window.electronAPI.getConfig();
  
  // Auto-reply status
  const autoReplyStatus = document.getElementById('autoReplyStatus');
  if (agentRunning) {
    autoReplyStatus.textContent = '🟢 Running';
    autoReplyStatus.style.color = '#22c55e';
  } else if (config.autoReplyEnabled) {
    autoReplyStatus.textContent = '🟡 Enabled (not running)';
    autoReplyStatus.style.color = '#f59e0b';
  } else {
    autoReplyStatus.textContent = '🔴 Disabled';
    autoReplyStatus.style.color = '#ef4444';
  }
  
  // AI Provider status
  const aiProviderStatus = document.getElementById('aiProviderStatus');
  if (config.aiProvider && (config.aiApiKey || config.aiProvider === 'ollama')) {
    const providerName = AI_PROVIDERS[config.aiProvider]?.name || config.aiProvider;
    aiProviderStatus.textContent = `✅ ${providerName}`;
    aiProviderStatus.style.color = '#22c55e';
  } else {
    aiProviderStatus.textContent = '❌ Not configured';
    aiProviderStatus.style.color = '#ef4444';
  }
  
  // Last check time
  const lastCheckStatus = document.getElementById('lastCheckStatus');
  const lastCheck = config.agentLastCheck;
  if (lastCheck) {
    const date = new Date(lastCheck);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      lastCheckStatus.textContent = 'Just now';
    } else if (diffMins < 60) {
      lastCheckStatus.textContent = `${diffMins} min ago`;
    } else {
      lastCheckStatus.textContent = date.toLocaleTimeString();
    }
  } else {
    lastCheckStatus.textContent = 'Never';
  }
  
  // Replies today
  const repliesTodayStatus = document.getElementById('repliesTodayStatus');
  const repliesToday = config.agentRepliesToday || 0;
  repliesTodayStatus.textContent = repliesToday.toString();
  
  // Update buttons
  const startBtn = document.getElementById('startAgentBtn');
  const stopBtn = document.getElementById('stopAgentBtn');
  
  if (agentRunning) {
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

// Log activity
function logActivity(message) {
  const log = document.getElementById('agentActivityLog');
  const entry = document.createElement('div');
  entry.className = 'activity-entry';
  entry.innerHTML = `
    <span class="activity-time">${new Date().toLocaleTimeString()}</span>
    <span class="activity-message">${message}</span>
  `;
  
  if (log.querySelector('.empty-state')) {
    log.innerHTML = '';
  }
  
  log.insertBefore(entry, log.firstChild);
  
  // Keep only last 50 entries
  while (log.children.length > 50) {
    log.removeChild(log.lastChild);
  }
}

// Show AI status message
function showAIStatus(message, type) {
  const statusDiv = document.getElementById('aiConfigStatus');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.classList.remove('hidden');
  
  setTimeout(() => {
    statusDiv.classList.add('hidden');
  }, 5000);
}

// Export for use in app.js
window.aiConfigModule = {
  initAIConfig,
  updateAgentStatus,
  logActivity,
};

// Auto-initialize if AI config page exists on load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('ai-config')) {
    console.log('[AI] AI config page found on DOMContentLoaded, initializing...');
    initAIConfig();
  }
});

// Listen for agent status updates from backend
if (window.electronAPI && window.electronAPI.onAgentStatusUpdate) {
  window.electronAPI.onAgentStatusUpdate((data) => {
    console.log('[AI] Agent status update received:', data);
    updateAgentStatus();
    if (data.postTitle) {
      logActivity(`Replied to: ${data.postTitle}`);
    }
  });
}
