// Settings Page Logic

let currentAgent = null;

// Initialize settings page
async function initSettings() {
  console.log('[Settings] Initializing settings page...');
  await loadAgent();
  await loadConfig();
  setupEventListeners();
  console.log('[Settings] Settings page initialized successfully');
}

// Load agent data
async function loadAgent() {
  try {
    const result = await window.electronAPI.moltbookGetAgent();
    if (result.success && result.agent) {
      currentAgent = result.agent;
      showAgentRegistered();
      updateAgentDisplay();
      updateAgentStatus();
    } else {
      showAgentNotRegistered();
    }
  } catch (error) {
    console.error('Failed to load agent:', error);
    showError('Failed to load agent data');
  }
}

// Load config
async function loadConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    console.log('[Settings] Loaded config:', config);
    
    document.getElementById('agentName').value = config.agentName || 'watam-agent';
    document.getElementById('safeModeCheckbox').checked = config.safeMode !== false;
    document.getElementById('maxPostsPerHour').value = config.maxPostsPerHour !== undefined ? config.maxPostsPerHour : 3;
    document.getElementById('maxCommentsPerHour').value = config.maxCommentsPerHour !== undefined ? config.maxCommentsPerHour : 20;
    
    console.log('[Settings] Rate limits loaded:', {
      posts: document.getElementById('maxPostsPerHour').value,
      comments: document.getElementById('maxCommentsPerHour').value
    });
    
    updateSafeModeWarning(config.safeMode !== false);
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  console.log('[Settings] Setting up event listeners...');
  
  // Register agent
  const registerBtn = document.getElementById('registerAgentBtn');
  if (registerBtn) {
    registerBtn.onclick = registerAgent;
    console.log('[Settings] ✓ registerAgentBtn attached');
  } else {
    console.error('[Settings] ✗ registerAgentBtn not found');
  }
  
  // Check status
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  if (checkStatusBtn) {
    checkStatusBtn.onclick = checkStatus;
    console.log('[Settings] ✓ checkStatusBtn attached');
  } else {
    console.error('[Settings] ✗ checkStatusBtn not found');
  }
  
  const completedClaimBtn = document.getElementById('completedClaimBtn');
  if (completedClaimBtn) {
    completedClaimBtn.onclick = checkStatus;
    console.log('[Settings] ✓ completedClaimBtn attached');
  } else {
    console.error('[Settings] ✗ completedClaimBtn not found');
  }
  
  // Claim actions
  const openClaimBtn = document.getElementById('openClaimBtn');
  if (openClaimBtn) {
    openClaimBtn.onclick = openClaimUrl;
    console.log('[Settings] ✓ openClaimBtn attached');
  } else {
    console.error('[Settings] ✗ openClaimBtn not found');
  }
  
  const copyClaimBtn = document.getElementById('copyClaimBtn');
  if (copyClaimBtn) {
    copyClaimBtn.onclick = () => copyToClipboard('claimUrl');
    console.log('[Settings] ✓ copyClaimBtn attached');
  } else {
    console.error('[Settings] ✗ copyClaimBtn not found');
  }
  
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  if (copyCodeBtn) {
    copyCodeBtn.onclick = () => copyToClipboard('verificationCode');
    console.log('[Settings] ✓ copyCodeBtn attached');
  } else {
    console.error('[Settings] ✗ copyCodeBtn not found');
  }
  
  // Agent actions
  const fetchSkillDocBtn = document.getElementById('fetchSkillDocBtn');
  if (fetchSkillDocBtn) {
    fetchSkillDocBtn.onclick = fetchSkillDoc;
    console.log('[Settings] ✓ fetchSkillDocBtn attached');
  } else {
    console.error('[Settings] ✗ fetchSkillDocBtn not found');
  }
  
  const resetAgentBtn = document.getElementById('resetAgentBtn');
  if (resetAgentBtn) {
    resetAgentBtn.onclick = resetAgent;
    console.log('[Settings] ✓ resetAgentBtn attached');
  } else {
    console.error('[Settings] ✗ resetAgentBtn not found');
  }
  
  // Safe mode
  const safeModeCheckbox = document.getElementById('safeModeCheckbox');
  if (safeModeCheckbox) {
    safeModeCheckbox.onchange = async (e) => {
      if (window.isSafeModeUpdating) {
        console.log('[Settings] Safe Mode update in progress, skipping...');
        return; // Prevent duplicate events
      }
      
      const enabled = e.target.checked;
      console.log('[Settings] Safe Mode checkbox changed to:', enabled);
      
      window.isSafeModeUpdating = true;
      
      try {
        const config = await window.electronAPI.getConfig();
        config.safeMode = enabled;
        await window.electronAPI.saveConfig(config);
        
        // Update sidebar toggle
        const safeModeToggle = document.getElementById('safeModeToggle');
        if (safeModeToggle && safeModeToggle.checked !== enabled) {
          console.log('[Settings] Updating sidebar toggle to:', enabled);
          safeModeToggle.checked = enabled;
        }
        
        updateSafeModeWarning(enabled);
        showSuccess(`Safe Mode ${enabled ? 'enabled' : 'disabled'}`);
      } finally {
        // Reset flag after a short delay
        setTimeout(() => {
          window.isSafeModeUpdating = false;
        }, 500);
      }
    };
    console.log('[Settings] ✓ safeModeCheckbox attached');
  } else {
    console.error('[Settings] ✗ safeModeCheckbox not found');
  }
  
  // Save rate limits
  const saveRateLimitsBtn = document.getElementById('saveRateLimitsBtn');
  if (saveRateLimitsBtn) {
    saveRateLimitsBtn.onclick = saveRateLimits;
    console.log('[Settings] ✓ saveRateLimitsBtn attached');
  } else {
    console.error('[Settings] ✗ saveRateLimitsBtn not found');
  }
  
  // Check for updates
  const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
  if (checkUpdatesBtn) {
    checkUpdatesBtn.onclick = checkForUpdates;
    console.log('[Settings] ✓ checkUpdatesBtn attached');
  } else {
    console.error('[Settings] ✗ checkUpdatesBtn not found');
  }
  
  console.log('[Settings] Event listeners setup complete');
}

// Register agent
async function registerAgent() {
  const name = document.getElementById('agentName').value.trim();
  const description = document.getElementById('agentDescription').value.trim();
  
  if (!name) {
    showError('Agent name is required');
    return;
  }
  
  const btn = document.getElementById('registerAgentBtn');
  btn.disabled = true;
  btn.textContent = 'Registering...';
  
  try {
    const result = await window.electronAPI.moltbookRegister({ name, description });
    
    if (result.success) {
      currentAgent = result.agent;
      showAgentRegistered();
      updateAgentDisplay();
      showClaimSection();
      showSuccess('Agent registered successfully! Complete the claim process to activate.');
    } else {
      showError(result.error || 'Registration failed');
    }
  } catch (error) {
    showError('Registration failed: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Register Agent';
  }
}

// Check agent status
async function checkStatus() {
  console.log('[Settings] checkStatus called');
  const btn = event?.target || document.getElementById('checkStatusBtn');
  if (!btn) {
    console.error('[Settings] Button not found');
    return;
  }
  
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Checking...';
  
  try {
    console.log('[Settings] Calling moltbookCheckStatus...');
    const result = await window.electronAPI.moltbookCheckStatus();
    console.log('[Settings] Status result:', result);
    
    if (result.success) {
      currentAgent.status = result.status;
      currentAgent.lastCheckedAt = result.lastCheckedAt;
      updateAgentStatus();
      
      if (result.status === 'active') {
        showSuccess('Agent is active and ready to use!');
        hideClaimSection();
        showActiveSection();
      } else if (result.status === 'claim_pending') {
        showError('Claim not completed yet. Please complete the claim process first.');
      } else {
        showError('Agent status: ' + result.status);
      }
    } else {
      showError(result.error || 'Status check failed');
    }
  } catch (error) {
    console.error('[Settings] Status check error:', error);
    showError('Status check failed: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// Fetch skill.md
async function fetchSkillDoc() {
  console.log('[Settings] fetchSkillDoc called');
  const btn = document.getElementById('fetchSkillDocBtn');
  if (!btn) {
    console.error('[Settings] fetchSkillDocBtn not found');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Fetching...';
  
  try {
    console.log('[Settings] Calling moltbookFetchSkillDoc...');
    const result = await window.electronAPI.moltbookFetchSkillDoc();
    console.log('[Settings] Fetch result:', result);
    
    if (result.success) {
      showSuccess('skill.md fetched and cached successfully!');
    } else {
      showError(result.error || 'Failed to fetch skill.md');
    }
  } catch (error) {
    console.error('[Settings] Fetch error:', error);
    showError('Failed to fetch skill.md: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Re-fetch skill.md';
  }
}

// Reset agent
async function resetAgent() {
  if (!confirm('Are you sure you want to reset the agent? This will delete all agent data including the API key.')) {
    return;
  }
  
  try {
    const result = await window.electronAPI.moltbookResetAgent();
    
    if (result.success) {
      currentAgent = null;
      showAgentNotRegistered();
      showSuccess('Agent reset successfully');
    } else {
      showError(result.error || 'Reset failed');
    }
  } catch (error) {
    showError('Reset failed: ' + error.message);
  }
}

// Save rate limits
async function saveRateLimits() {
  const maxPostsPerHour = parseInt(document.getElementById('maxPostsPerHour').value);
  const maxCommentsPerHour = parseInt(document.getElementById('maxCommentsPerHour').value);
  
  console.log('[Settings] Saving rate limits:', { maxPostsPerHour, maxCommentsPerHour });
  
  try {
    const result = await window.electronAPI.saveConfig({
      maxPostsPerHour,
      maxCommentsPerHour,
    });
    
    if (result.success) {
      showSuccess('✅ Rate limits saved successfully');
      
      // Reload config to verify
      setTimeout(async () => {
        const config = await window.electronAPI.getConfig();
        console.log('[Settings] Verified saved config:', {
          posts: config.maxPostsPerHour,
          comments: config.maxCommentsPerHour
        });
        
        // Update UI with saved values
        document.getElementById('maxPostsPerHour').value = config.maxPostsPerHour !== undefined ? config.maxPostsPerHour : 3;
        document.getElementById('maxCommentsPerHour').value = config.maxCommentsPerHour !== undefined ? config.maxCommentsPerHour : 20;
      }, 500);
    } else {
      showError('❌ Failed to save rate limits');
    }
  } catch (error) {
    showError('❌ Failed to save rate limits: ' + error.message);
  }
}

// UI Helper Functions

function showAgentNotRegistered() {
  document.getElementById('agentNotRegistered').classList.remove('hidden');
  document.getElementById('agentRegistered').classList.add('hidden');
}

function showAgentRegistered() {
  document.getElementById('agentNotRegistered').classList.add('hidden');
  document.getElementById('agentRegistered').classList.remove('hidden');
}

function updateAgentDisplay() {
  if (!currentAgent) return;
  
  document.getElementById('agentNameDisplay').textContent = currentAgent.name;
  document.getElementById('agentApiKeyMasked').textContent = currentAgent.apiKeyMasked;
  document.getElementById('agentCreatedAt').textContent = new Date(currentAgent.createdAt).toLocaleString();
  
  if (currentAgent.claimUrl) {
    document.getElementById('claimUrl').value = currentAgent.claimUrl;
  }
  if (currentAgent.verificationCode) {
    document.getElementById('verificationCode').value = currentAgent.verificationCode;
  }
}

function updateAgentStatus() {
  if (!currentAgent) return;
  
  const badge = document.getElementById('agentStatusBadge');
  const text = document.getElementById('agentStatusText');
  
  badge.className = 'status-badge';
  
  switch (currentAgent.status) {
    case 'active':
      badge.classList.add('active');
      text.textContent = 'Active';
      hideClaimSection();
      showActiveSection();
      break;
    case 'claim_pending':
      badge.classList.add('pending');
      text.textContent = 'Claim Pending';
      showClaimSection();
      hideActiveSection();
      break;
    case 'error':
      badge.classList.add('error');
      text.textContent = 'Error';
      hideClaimSection();
      hideActiveSection();
      break;
    default:
      text.textContent = currentAgent.status;
  }
}

function showClaimSection() {
  document.getElementById('claimSection')?.classList.remove('hidden');
}

function hideClaimSection() {
  document.getElementById('claimSection')?.classList.add('hidden');
}

function showActiveSection() {
  document.getElementById('agentActiveSection')?.classList.remove('hidden');
}

function hideActiveSection() {
  document.getElementById('agentActiveSection')?.classList.add('hidden');
}

function openClaimUrl() {
  const url = document.getElementById('claimUrl').value;
  if (url) {
    window.open(url, '_blank');
  }
}

function copyToClipboard(elementId) {
  const input = document.getElementById(elementId);
  input.select();
  document.execCommand('copy');
  showSuccess('Copied to clipboard!');
}

function updateSafeModeWarning(enabled) {
  const warning = document.getElementById('safeModeWarning');
  if (enabled) {
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }
}

// Check for updates
async function checkForUpdates() {
  const btn = document.getElementById('checkUpdatesBtn');
  const statusDiv = document.getElementById('updateStatus');
  
  btn.disabled = true;
  btn.textContent = 'Checking...';
  statusDiv.classList.add('hidden');
  
  try {
    const result = await window.electronAPI.checkForUpdates();
    
    if (result.success) {
      if (result.updateAvailable) {
        statusDiv.textContent = `🎉 Update available! Version ${result.latestVersion} is ready to download.`;
        statusDiv.className = 'status-message success';
      } else {
        statusDiv.textContent = `✅ You're up to date! (v${result.currentVersion})`;
        statusDiv.className = 'status-message info';
      }
    } else {
      statusDiv.textContent = `ℹ️ ${result.error}`;
      statusDiv.className = 'status-message info';
    }
    
    statusDiv.classList.remove('hidden');
  } catch (error) {
    statusDiv.textContent = `❌ Error: ${error.message}`;
    statusDiv.className = 'status-message error';
    statusDiv.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Check for Updates';
  }
}

function showSuccess(message) {
  const errorDiv = document.getElementById('agentError');
  errorDiv.textContent = message;
  errorDiv.className = 'alert alert-success';
  errorDiv.classList.remove('hidden');
  setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

function showError(message) {
  const errorDiv = document.getElementById('agentError');
  errorDiv.textContent = message;
  errorDiv.className = 'alert alert-danger';
  errorDiv.classList.remove('hidden');
}

// Export for use in app.js and HTML onclick
window.settingsModule = {
  initSettings,
  loadAgent,
  setupEventListeners,
  checkStatus,
  fetchSkillDoc,
  registerAgent,
  resetAgent,
  checkForUpdates,
};

// Auto-initialize if settings page exists on load
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Settings] DOMContentLoaded fired');
  if (document.getElementById('settings')) {
    console.log('[Settings] Settings page found on DOMContentLoaded, initializing...');
    initSettings();
  }
  console.log('[Settings] settingsModule exported:', Object.keys(window.settingsModule));
});
