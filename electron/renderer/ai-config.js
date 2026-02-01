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
    
    // Auto-reply settings - CRITICAL: Use strict boolean check
    const autoReplyCheckbox = document.getElementById('autoReplyEnabled');
    if (autoReplyCheckbox) {
      autoReplyCheckbox.checked = config.autoReplyEnabled === true;
      console.log('[AI] Auto-reply checkbox set to:', autoReplyCheckbox.checked);
    }
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
  
  // Test Moltbook connection
  document.getElementById('testConnectionBtn').onclick = testMoltbookConnection;
  
  // Test agent loop
  document.getElementById('testAgentLoopBtn').onclick = testAgentLoop;
  
  // Test heartbeat
  document.getElementById('testHeartbeatBtn').onclick = testHeartbeat;
  
  // Debug and fix issues
  document.getElementById('debugAndFixBtn').onclick = debugAndFixIssues;
  
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
      autoReplyEnabled: autoReplyEnabled, // Explicit boolean
      checkInterval,
      replySubmolts,
      replyKeywords,
      maxRepliesPerHour,
    });
    
    if (result.success) {
      showAIStatus('✅ Auto-reply settings saved!', 'success');
      console.log('[AI] Auto-reply settings saved successfully');
      
      // Force reload config to verify
      setTimeout(async () => {
        const config = await window.electronAPI.getConfig();
        console.log('[AI] Verified auto-reply enabled:', config.autoReplyEnabled);
        
        // Update checkbox to match saved value
        const checkbox = document.getElementById('autoReplyEnabled');
        if (checkbox.checked !== config.autoReplyEnabled) {
          console.warn('[AI] WARNING: Checkbox state mismatch! Fixing...');
          checkbox.checked = config.autoReplyEnabled === true;
        }
        
        updateAgentStatus();
      }, 500);
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
    showAIStatus('❌ Please enable auto-reply first. Check the "Enable Auto-Reply" checkbox and click "Save Auto-Reply Settings".', 'error');
    console.error('[AI] Auto-reply not enabled. Current value:', config.autoReplyEnabled);
    
    // Highlight the checkbox
    const checkbox = document.getElementById('autoReplyEnabled');
    if (checkbox && !checkbox.checked) {
      checkbox.parentElement.style.border = '2px solid #ef4444';
      setTimeout(() => {
        checkbox.parentElement.style.border = '';
      }, 3000);
    }
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

// Test Moltbook connection comprehensively
async function testMoltbookConnection() {
  console.log('[AI] 🧪 Test Moltbook Connection button clicked');
  
  showAIStatus('🔍 Running comprehensive connection test...', 'info');
  
  try {
    const result = await window.electronAPI.testMoltbookConnection();
    
    if (result.success) {
      const { results } = result;
      
      console.log('=== COMPREHENSIVE MOLTBOOK CONNECTION TEST RESULTS ===');
      console.log('API Key Format:', results.apiKeyFormat);
      console.log('Agent Status:', results.agentStatus);
      console.log('Agent Permissions:', results.agentPosts);
      console.log('Direct API Test:', results.testPost);
      console.log('Safe Mode:', results.safeMode);
      console.log('Recommendations:', results.recommendations);
      console.log('=== END TEST RESULTS ===');
      
      // Show detailed summary
      let message = '🔍 Comprehensive Connection Test Results:\n\n';
      
      // API Key Format
      if (results.apiKeyFormat) {
        message += `🔑 API Key Format: ${results.apiKeyFormat.valid ? '✅ Valid' : '❌ Invalid'}\n`;
        if (!results.apiKeyFormat.valid) {
          message += `   Error: ${results.apiKeyFormat.error}\n`;
        }
      }
      
      // Agent Status
      message += `👤 Agent Status: ${results.agentStatus?.success ? '✅ Connected' : '❌ Failed'}\n`;
      if (results.agentStatus?.success) {
        message += `   Status: ${results.agentStatus.status}\n`;
        message += `   HTTP Code: ${results.agentStatus.statusCode}\n`;
      } else if (results.agentStatus?.error) {
        message += `   Error: ${results.agentStatus.error}\n`;
      }
      
      // Permissions
      message += `🔐 API Permissions: ${results.agentPosts?.canPost ? '✅ Can Post' : '❌ Cannot Post'}\n`;
      if (results.agentPosts?.error) {
        message += `   Error: ${results.agentPosts.error}\n`;
      }
      
      // Safe Mode
      message += `🔒 Safe Mode: ${results.safeMode ? '🔒 ENABLED (blocks posting)' : '🔓 DISABLED'}\n`;
      
      // Recommendations
      if (results.recommendations && results.recommendations.length > 0) {
        message += '\n💡 Recommendations:\n';
        results.recommendations.forEach((rec, i) => {
          message += `   ${i + 1}. ${rec}\n`;
        });
      }
      
      // Determine overall status
      const isWorking = results.apiKeyFormat?.valid && 
                       results.agentStatus?.success && 
                       results.agentStatus?.status === 'active' &&
                       results.agentPosts?.canPost;
      
      if (isWorking && !results.safeMode) {
        message += '\n✅ DIAGNOSIS: Everything looks good! Agent should work properly.';
        showAIStatus(message, 'success');
      } else if (isWorking && results.safeMode) {
        message += '\n⚠️ DIAGNOSIS: API is working but Safe Mode is blocking posts. Disable Safe Mode in Settings.';
        showAIStatus(message, 'warning');
      } else {
        message += '\n❌ DIAGNOSIS: Issues found that prevent the agent from working properly.';
        showAIStatus(message, 'error');
      }
      
      // Show notification
      if (window.showNotification) {
        window.showNotification('Comprehensive connection test completed! Check console and status for details.', 'info');
      }
    } else {
      showAIStatus('❌ Connection test failed: ' + result.error, 'error');
      console.error('[AI] Connection test error:', result.error);
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
    console.error('[AI] Connection test exception:', error);
  }
}

// Test agent loop manually
async function testAgentLoop() {
  console.log('[AI] Test Agent Loop button clicked');
  
  showAIStatus('🤖 Testing agent loop...', 'info');
  
  try {
    const result = await window.electronAPI.testAgentLoop();
    
    if (result.success) {
      showAIStatus('✅ Agent loop test completed! Check console for details.', 'success');
      console.log('[AI] ✅ Agent loop test result:', result.message);
      
      // Show notification
      if (window.showNotification) {
        window.showNotification('Agent loop test completed! Check console for details.', 'info');
      }
    } else {
      showAIStatus('❌ Agent loop test failed: ' + result.error, 'error');
      console.error('[AI] ❌ Agent loop test error:', result.error);
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
    console.error('[AI] ❌ Agent loop test exception:', error);
  }
}

// Test heartbeat manually
async function testHeartbeat() {
  console.log('[AI] Test Heartbeat button clicked');
  
  showAIStatus('❤️ Testing Moltbook heartbeat...', 'info');
  
  try {
    const result = await window.electronAPI.testHeartbeat();
    
    if (result.success) {
      showAIStatus('✅ Heartbeat test completed! Check console for details.', 'success');
      console.log('[AI] ✅ Heartbeat test result:', result.message);
      
      // Show notification
      if (window.showNotification) {
        window.showNotification('Heartbeat test completed! Check console for details.', 'info');
      }
    } else {
      showAIStatus('❌ Heartbeat test failed: ' + result.error, 'error');
      console.error('[AI] ❌ Heartbeat test error:', result.error);
    }
  } catch (error) {
    showAIStatus('❌ Error: ' + error.message, 'error');
    console.error('[AI] ❌ Heartbeat test exception:', error);
  }
}

// Debug and fix common issues automatically
async function debugAndFixIssues() {
  console.log('[AI] 🔧 Debug & Fix Issues button clicked');
  
  showAIStatus('🔧 Running diagnostic and attempting automatic fixes...', 'info');
  
  try {
    console.log('[Debug] ========================================');
    console.log('[Debug] 🔧 AUTOMATIC ISSUE DIAGNOSIS & FIXING');
    console.log('[Debug] ========================================');
    
    let fixesApplied = [];
    let issuesFound = [];
    
    // Step 1: Test current connection
    console.log('[Debug] 1️⃣ Testing current connection...');
    const testResult = await window.electronAPI.testMoltbookConnection();
    
    if (!testResult.success) {
      issuesFound.push('Connection test failed');
      showAIStatus('❌ Connection test failed: ' + testResult.error, 'error');
      return;
    }
    
    const { results } = testResult;
    
    // Step 2: Check API key format
    if (!results.apiKeyFormat?.valid) {
      issuesFound.push('Invalid API key format');
      console.log('[Debug] ❌ API key format invalid - need to re-register');
      
      // Offer to reset and re-register
      if (confirm('API key appears to be corrupted. Reset agent and re-register?')) {
        console.log('[Debug] 🔄 Resetting agent...');
        const resetResult = await window.electronAPI.moltbookResetAgent();
        if (resetResult.success) {
          fixesApplied.push('Reset corrupted agent');
          showAIStatus('✅ Agent reset. Please go to Settings to re-register.', 'success');
          return;
        }
      }
    }
    
    // Step 3: Check agent status
    if (!results.agentStatus?.success || results.agentStatus?.status !== 'active') {
      issuesFound.push('Agent not active');
      console.log('[Debug] ❌ Agent not active - status:', results.agentStatus?.status);
      
      if (results.agentStatus?.status === 'error') {
        if (confirm('Agent claim not completed. Open Moltbook website to complete claim?')) {
          // Get claim URL from agent data
          const agentResult = await window.electronAPI.moltbookGetAgent();
          if (agentResult.success && agentResult.agent?.claimUrl) {
            window.electronAPI.openExternal(agentResult.agent.claimUrl);
            fixesApplied.push('Opened claim URL');
          } else {
            window.electronAPI.openExternal('https://www.moltbook.com/agents');
            fixesApplied.push('Opened Moltbook agents page');
          }
        }
      }
    }
    
    // Step 4: Check permissions
    if (!results.agentPosts?.canPost) {
      issuesFound.push('API key lacks posting permissions');
      console.log('[Debug] ❌ API key lacks posting permissions');
      
      if (confirm('API key lacks permissions. This usually means claim not completed. Open Moltbook website?')) {
        window.electronAPI.openExternal('https://www.moltbook.com/agents');
        fixesApplied.push('Opened Moltbook agents page for claim completion');
      }
    }
    
    // Step 5: Check Safe Mode
    if (results.safeMode) {
      issuesFound.push('Safe Mode is blocking posts');
      console.log('[Debug] ⚠️ Safe Mode is enabled');
      
      if (confirm('Safe Mode is enabled and blocking posts. Disable Safe Mode?')) {
        const configResult = await window.electronAPI.saveConfig({ safeMode: false });
        if (configResult.success) {
          fixesApplied.push('Disabled Safe Mode');
          console.log('[Debug] ✅ Safe Mode disabled');
        }
      }
    }
    
    // Step 6: Check auto-reply settings
    const config = await window.electronAPI.getConfig();
    if (!config.autoReplyEnabled) {
      issuesFound.push('Auto-reply not enabled');
      console.log('[Debug] ⚠️ Auto-reply not enabled');
      
      if (confirm('Auto-reply is not enabled. Enable it now?')) {
        const autoReplyResult = await window.electronAPI.saveConfig({ autoReplyEnabled: true });
        if (autoReplyResult.success) {
          fixesApplied.push('Enabled auto-reply');
          console.log('[Debug] ✅ Auto-reply enabled');
          
          // Update the checkbox
          const checkbox = document.getElementById('autoReplyEnabled');
          if (checkbox) {
            checkbox.checked = true;
          }
        }
      }
    }
    
    // Step 7: Try to refresh skill.md knowledge
    console.log('[Debug] 7️⃣ Refreshing skill.md knowledge...');
    try {
      const skillResult = await window.electronAPI.moltbookFetchSkillDoc();
      if (skillResult.success) {
        fixesApplied.push('Refreshed skill.md knowledge');
        console.log('[Debug] ✅ skill.md refreshed');
      }
    } catch (error) {
      console.log('[Debug] ⚠️ Could not refresh skill.md:', error.message);
    }
    
    // Summary
    console.log('[Debug] ========================================');
    console.log('[Debug] 🔧 DIAGNOSIS COMPLETE');
    console.log('[Debug] Issues Found:', issuesFound);
    console.log('[Debug] Fixes Applied:', fixesApplied);
    console.log('[Debug] ========================================');
    
    let summaryMessage = '🔧 Diagnostic Complete!\n\n';
    
    if (issuesFound.length === 0) {
      summaryMessage += '✅ No issues found! Your agent should be working properly.\n\n';
      summaryMessage += 'If you\'re still having problems:\n';
      summaryMessage += '1. Try the "Test Connection" button\n';
      summaryMessage += '2. Check the console logs for errors\n';
      summaryMessage += '3. Restart the application';
    } else {
      summaryMessage += `❌ Found ${issuesFound.length} issue(s):\n`;
      issuesFound.forEach((issue, i) => {
        summaryMessage += `${i + 1}. ${issue}\n`;
      });
      
      if (fixesApplied.length > 0) {
        summaryMessage += `\n✅ Applied ${fixesApplied.length} fix(es):\n`;
        fixesApplied.forEach((fix, i) => {
          summaryMessage += `${i + 1}. ${fix}\n`;
        });
        summaryMessage += '\nPlease test your agent again!';
      } else {
        summaryMessage += '\n⚠️ No automatic fixes could be applied.';
        summaryMessage += '\nPlease follow the recommendations above.';
      }
    }
    
    showAIStatus(summaryMessage, fixesApplied.length > 0 ? 'success' : 'warning');
    
    // Show notification
    if (window.showNotification) {
      window.showNotification(`Diagnostic complete! Found ${issuesFound.length} issues, applied ${fixesApplied.length} fixes.`, 'info');
    }
    
  } catch (error) {
    showAIStatus('❌ Diagnostic failed: ' + error.message, 'error');
    console.error('[Debug] ❌ Diagnostic error:', error);
  }
}

// Send manual reply to specific post URL
async function sendManualReply() {
  console.log('[AI] 🚀 Send Manual Reply button clicked');
  
  const url = document.getElementById('manualReplyUrl').value.trim();
  
  if (!url) {
    showManualReplyStatus('❌ Please enter a post URL', 'error');
    return;
  }
  
  // Extract post ID from URL
  // Format: https://www.moltbook.com/post/{POST_ID}
  const match = url.match(/\/post\/([a-f0-9-]+)/i);
  if (!match) {
    showManualReplyStatus('❌ Invalid post URL format. Expected: https://www.moltbook.com/post/{POST_ID}', 'error');
    return;
  }
  
  const postId = match[1];
  console.log('[AI] 📝 Extracted post ID:', postId);
  
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
  
  console.log('[AI] ✅ Configuration validated');
  showManualReplyStatus('🔄 Fetching post details...', 'info');
  
  try {
    // Fetch post details with enhanced logging
    console.log('[AI] 📡 Calling getPostDetails for ID:', postId);
    const postResult = await window.electronAPI.getPostDetails(postId);
    
    console.log('[AI] 📋 Post fetch result:', {
      success: postResult.success,
      hasPost: !!postResult.post,
      error: postResult.error,
      postKeys: postResult.post ? Object.keys(postResult.post) : 'no post'
    });
    
    // CRITICAL: Check both success flag AND post existence
    if (!postResult.success) {
      console.error('[AI] ❌ Post fetch failed - success=false');
      console.error('[AI] 📄 Error details:', postResult.error);
      showManualReplyStatus('❌ Failed to fetch post: ' + (postResult.error || 'Unknown error'), 'error');
      return;
    }
    
    if (!postResult.post) {
      console.error('[AI] ❌ Post fetch failed - post is null/undefined');
      console.error('[AI] 📄 Full result:', JSON.stringify(postResult, null, 2));
      showManualReplyStatus('❌ Post not found or empty response from server', 'error');
      return;
    }
    
    const actualPost = postResult.post;
    
    console.log('[AI] 🔍 Post validation:', {
      hasId: !!actualPost.id,
      hasTitle: !!actualPost.title,
      hasBody: !!actualPost.body,
      titleLength: actualPost.title?.length || 0,
      bodyLength: actualPost.body?.length || 0,
      submolt: actualPost.submolt
    });
    
    // Validate post has content
    if (!actualPost.id) {
      console.error('[AI] ❌ Post has no ID');
      showManualReplyStatus('❌ Invalid post - missing ID', 'error');
      return;
    }
    
    if (!actualPost.title && !actualPost.body) {
      console.error('[AI] ❌ Post has no title or body');
      console.error('[AI] 📄 Post data:', JSON.stringify(actualPost, null, 2));
      showManualReplyStatus('❌ Post has no content to reply to', 'error');
      return;
    }
    
    const postTitle = actualPost.title || actualPost.body?.substring(0, 50) || 'Untitled';
    console.log('[AI] ✅ Post validated successfully:', postTitle);
    
    showManualReplyStatus('🤖 Generating AI reply...', 'info');
    
    // Generate reply with enhanced logging
    console.log('[AI] 🧠 Calling generateReply...');
    const replyResult = await window.electronAPI.generateReply({ post: actualPost });
    
    console.log('[AI] 📝 Reply generation result:', {
      success: replyResult.success,
      hasReply: !!replyResult.reply,
      replyLength: replyResult.reply?.length || 0,
      error: replyResult.error
    });
    
    if (!replyResult.success) {
      console.error('[AI] ❌ Reply generation failed - success=false');
      console.error('[AI] 📄 Error details:', replyResult.error);
      showManualReplyStatus('❌ Failed to generate reply: ' + (replyResult.error || 'Unknown error'), 'error');
      return;
    }
    
    if (!replyResult.reply) {
      console.error('[AI] ❌ Reply generation failed - reply is null/undefined');
      console.error('[AI] 📄 Full result:', JSON.stringify(replyResult, null, 2));
      showManualReplyStatus('❌ No reply generated - AI response was empty', 'error');
      return;
    }
    
    console.log('[AI] ✅ Reply generated successfully:', replyResult.reply.substring(0, 100) + '...');
    
    showManualReplyStatus('📤 Posting reply to Moltbook...', 'info');
    
    // Post reply with enhanced logging
    console.log('[AI] 📤 Calling replyToPost...');
    const postReplyResult = await window.electronAPI.replyToPost({
      postId,
      body: replyResult.reply,
    });
    
    console.log('[AI] 📋 Reply posting result:', {
      success: postReplyResult.success,
      error: postReplyResult.error,
      hasComment: !!postReplyResult.comment
    });
    
    if (postReplyResult.success) {
      console.log('[AI] ✅ Reply posted successfully!');
      showManualReplyStatus('✅ Reply posted successfully!', 'success');
      logActivity(`Manual reply sent to post: ${postTitle}`);
      
      // Clear URL field
      document.getElementById('manualReplyUrl').value = '';
      
      // Show notification
      if (window.showNotification) {
        window.showNotification('AI reply posted successfully!', 'success');
      }
    } else {
      console.error('[AI] ❌ Reply posting failed');
      console.error('[AI] 📄 Error details:', postReplyResult.error);
      showManualReplyStatus('❌ Failed to post reply: ' + postReplyResult.error, 'error');
    }
    
  } catch (error) {
    console.error('[AI] ❌ Manual reply process failed with exception:', error);
    showManualReplyStatus('❌ Error: ' + error.message, 'error');
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
  
  // Last check time - show both quick check and heartbeat
  const lastCheckStatus = document.getElementById('lastCheckStatus');
  const lastCheck = config.agentLastCheck;
  const lastHeartbeat = config.moltbookLastHeartbeat;
  
  if (lastCheck || lastHeartbeat) {
    const checkDate = lastCheck ? new Date(lastCheck) : null;
    const heartbeatDate = lastHeartbeat ? new Date(lastHeartbeat) : null;
    const now = new Date();
    
    let displayText = '';
    
    if (checkDate) {
      const diffMs = now - checkDate;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        displayText = 'Just now';
      } else if (diffMins < 60) {
        displayText = `${diffMins} min ago`;
      } else {
        displayText = checkDate.toLocaleTimeString();
      }
    }
    
    // Add heartbeat info if available
    if (heartbeatDate) {
      const heartbeatDiffHours = Math.floor((now - heartbeatDate) / (60 * 60 * 1000));
      if (heartbeatDiffHours < 1) {
        displayText += ' (❤️ <1h)';
      } else {
        displayText += ` (❤️ ${heartbeatDiffHours}h)`;
      }
    }
    
    lastCheckStatus.textContent = displayText;
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
