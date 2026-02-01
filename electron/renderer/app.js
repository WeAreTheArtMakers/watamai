// Global variables
let autoSaveInterval;
let rateLimitCountdownInterval;

// Shared flag for Safe Mode sync (accessible from both app.js and settings.js)
window.isSafeModeUpdating = false;

// Rate limit countdown function
function showRateLimitCountdown(nextAllowedTime) {
  const nextTime = new Date(nextAllowedTime);
  const now = new Date();
  
  if (now >= nextTime) {
    return; // No countdown needed
  }
  
  // Clear any existing countdown
  if (rateLimitCountdownInterval) {
    clearInterval(rateLimitCountdownInterval);
  }
  
  // Show the rate limit status in Posts page
  const rateLimitStatus = document.getElementById('rateLimitStatus');
  const countdownElement = document.getElementById('rateLimitCountdown');
  const rateLimitCard = document.querySelector('.rate-limit-card');
  
  if (rateLimitStatus && countdownElement) {
    rateLimitStatus.classList.remove('hidden');
    
    function updateCountdown() {
      const now = new Date();
      const timeLeft = nextTime - now;
      
      if (timeLeft <= 0) {
        // Countdown finished
        countdownElement.textContent = '✅ Ready!';
        rateLimitCard.classList.add('ready');
        document.querySelector('.rate-limit-title').textContent = 'Ready to Post';
        document.querySelector('.rate-limit-subtitle').textContent = 'You can post again now';
        document.querySelector('.rate-limit-icon').textContent = '✅';
        
        clearInterval(rateLimitCountdownInterval);
        
        // Hide after 5 seconds
        setTimeout(() => {
          rateLimitStatus.classList.add('hidden');
          rateLimitCard.classList.remove('ready');
        }, 5000);
        
        showNotification('✅ You can post again now!', 'success');
        return;
      }
      
      const minutes = Math.floor(timeLeft / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Update immediately and then every second
    updateCountdown();
    rateLimitCountdownInterval = setInterval(updateCountdown, 1000);
  }
}

// Check for existing rate limit on page load
function checkAndShowRateLimit() {
  // Get rate limit info from localStorage or make an API call
  window.electronAPI.getRateLimitStatus().then(result => {
    if (result.success && result.nextAllowedTime) {
      const nextTime = new Date(result.nextAllowedTime);
      const now = new Date();
      
      if (now < nextTime) {
        showRateLimitCountdown(result.nextAllowedTime);
      }
    }
  }).catch(err => {
    console.log('[App] No active rate limit found');
  });
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] DOM loaded, initializing app...');
  
  // Simple navigation system
  setTimeout(() => {
    initializeNavigation();
    setupEventListeners();
    loadDashboard();
  }, 100);
});

function initializeNavigation() {
  console.log('[App] Initializing navigation system...');
  
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  
  console.log('[App] Found nav items:', navItems.length);
  console.log('[App] Found pages:', pages.length);
  
  // Add click listeners to nav items
  navItems.forEach((navItem, index) => {
    const page = navItem.getAttribute('data-page');
    console.log('[App] Setting up nav item', index, 'for page:', page);
    
    navItem.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[App] Navigation clicked:', page);
      
      // Remove active class from all nav items
      navItems.forEach(item => item.classList.remove('active'));
      
      // Add active class to clicked nav item
      navItem.classList.add('active');
      
      // Hide all pages
      pages.forEach(p => p.classList.remove('active'));
      
      // Show target page
      const targetPage = document.getElementById(page);
      if (targetPage) {
        targetPage.classList.add('active');
        console.log('[App] Showed page:', page);
        
        // Load page data
        loadPageData(page);
      } else {
        console.error('[App] Page not found:', page);
      }
    });
  });
  
  // Make navigation function global
  window.navigateToPage = function(pageName) {
    console.log('[App] Global navigate to:', pageName);
    
    const targetNavItem = document.querySelector(`[data-page="${pageName}"]`);
    if (targetNavItem) {
      targetNavItem.click();
    } else {
      console.error('[App] Nav item not found for page:', pageName);
    }
  };
  
  console.log('[App] Navigation system initialized');
}

// Load page data
async function loadPageData(pageName) {
  console.log('[App] Loading page data for:', pageName);
  
  switch (pageName) {
    case 'dashboard':
      await loadDashboard();
      break;
    case 'settings':
      await loadSettings();
      break;
    case 'drafts':
      await loadDrafts();
      break;
    case 'posts':
      await loadPosts();
      break;
    case 'logs':
      await loadLogs();
      break;
    case 'ai-config':
      await loadAIConfig();
      break;
    case 'persona':
      // Initialize agent profile tabs when persona page is loaded
      // CRITICAL: Wait for page to be visible first!
      setTimeout(() => {
        console.log('[App] Persona page loaded, checking if page is visible...');
        const personaPage = document.getElementById('persona');
        
        if (!personaPage) {
          console.error('[App] ❌ Persona page not found!');
          return;
        }
        
        const isVisible = personaPage.classList.contains('active');
        console.log('[App] Persona page visible:', isVisible);
        
        if (!isVisible) {
          console.error('[App] ❌ Persona page not visible yet!');
          return;
        }
        
        console.log('[App] ✓ Persona page is visible, checking for tabs...');
        const tabs = document.querySelectorAll('.tab-btn');
        console.log('[App] Found tabs:', tabs.length);
        
        if (tabs.length > 0) {
          console.log('[App] ✓ Tabs found, initializing...');
          initializeAgentProfile();
        } else {
          console.error('[App] ❌ No tabs found! Retrying...');
          // Retry after a longer delay
          setTimeout(() => {
            const retryTabs = document.querySelectorAll('.tab-btn');
            console.log('[App] Retry - Found tabs:', retryTabs.length);
            if (retryTabs.length > 0) {
              initializeAgentProfile();
            } else {
              console.error('[App] ❌ Still no tabs found after retry!');
              console.error('[App] Persona page HTML:', personaPage.innerHTML.substring(0, 500));
            }
          }, 500);
        }
      }, 300);
      break;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    document.getElementById('rateLimits').innerHTML = `
      <div class="stat">
        <span class="label">Posts (last hour)</span>
        <span class="value">0/3</span>
      </div>
      <div class="stat">
        <span class="label">Comments (last hour)</span>
        <span class="value">0/20</span>
      </div>
    `;

    document.getElementById('securityStatus').innerHTML = `
      <div class="stat">
        <span class="label">Sandbox</span>
        <span class="value">🔒 Enabled</span>
      </div>
      <div class="stat">
        <span class="label">Violations</span>
        <span class="value">0</span>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Settings
async function loadSettings() {
  try {
    console.log('[App] Loading settings page...');
    const config = await window.electronAPI.getConfig();
    const agentNameInput = document.getElementById('agentName');
    const safeModeCheckbox = document.getElementById('safeModeCheckbox');
    
    if (agentNameInput) agentNameInput.value = config.agentName || '';
    if (safeModeCheckbox) safeModeCheckbox.checked = config.safeMode !== false;
    
    console.log('[App] Settings loaded, safe mode:', config.safeMode);
    
    // Initialize settings module - try multiple times if needed
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryInit = async () => {
      attempts++;
      console.log(`[App] Attempt ${attempts} to initialize settings module...`);
      
      if (window.settingsModule && window.settingsModule.initSettings) {
        console.log('[App] settingsModule found, calling initSettings...');
        await window.settingsModule.initSettings();
        return true;
      } else {
        console.warn('[App] settingsModule not available yet');
        if (attempts < maxAttempts) {
          setTimeout(tryInit, 100);
        } else {
          console.error('[App] Failed to initialize settings module after', maxAttempts, 'attempts');
        }
        return false;
      }
    };
    
    setTimeout(tryInit, 100);
  } catch (error) {
    console.error('[App] Failed to load settings:', error);
  }
}

// Logs Management
async function loadLogs() {
  try {
    const result = await window.electronAPI.getLogs();
    const container = document.getElementById('logsContent');
    
    if (!container) {
      console.error('[Logs] Container not found');
      return;
    }
    
    if (!result.success || !result.logs || result.logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No Activity Logs Yet</h3>
          <p>Agent activity and system events will appear here</p>
          <div class="log-tips">
            <h4>What gets logged:</h4>
            <ul>
              <li>🤖 Agent replies and interactions</li>
              <li>📤 Post publishing activities</li>
              <li>⚙️ Configuration changes</li>
              <li>🔍 Status checks and diagnostics</li>
              <li>❌ Errors and troubleshooting info</li>
              <li>📋 Auto-post queue activities</li>
            </ul>
          </div>
        </div>
      `;
      return;
    }

    // Group logs by date
    const logsByDate = {};
    result.logs.reverse().slice(0, 200).forEach(log => {
      const date = new Date(log.timestamp).toDateString();
      if (!logsByDate[date]) {
        logsByDate[date] = [];
      }
      logsByDate[date].push(log);
    });

    let html = '';
    Object.keys(logsByDate).forEach(date => {
      html += `<div class="log-date-group">
        <h4 class="log-date-header">${date}</h4>
        <div class="log-entries">`;
      
      logsByDate[date].forEach(log => {
        const time = new Date(log.timestamp);
        const typeClass = log.action.includes('error') || log.action.includes('failed') ? 'error' : 
                         log.action.includes('success') || log.action.includes('saved') || log.action.includes('published') || log.action.includes('replied') || log.action.includes('queued') || log.action.includes('auto_published') ? 'success' : 
                         log.action.includes('warning') || log.action.includes('rate_limited') ? 'warning' : 'info';
        
        const icon = typeClass === 'error' ? '❌' : 
                    typeClass === 'success' ? '✅' : 
                    typeClass === 'warning' ? '⚠️' : 'ℹ️';
        
        const details = typeof log.details === 'object' ? 
          Object.keys(log.details).map(key => `${key}: ${JSON.stringify(log.details[key])}`).join(', ') :
          JSON.stringify(log.details);
        
        html += `<div class="log-entry log-${typeClass}">
          <div class="log-header">
            <span class="log-icon">${icon}</span>
            <span class="log-time">${time.toLocaleTimeString()}</span>
            <span class="log-action">${log.action}</span>
          </div>
          ${details && details !== '{}' ? `<div class="log-details">${details.substring(0, 200)}${details.length > 200 ? '...' : ''}</div>` : ''}
        </div>`;
      });
      
      html += '</div></div>';
    });

    container.innerHTML = html;
    
    // Auto-refresh logs every 30 seconds if page is visible
    if (document.getElementById('logs').classList.contains('active')) {
      setTimeout(() => {
        if (document.getElementById('logs').classList.contains('active')) {
          loadLogs();
        }
      }, 30000);
    }
  } catch (error) {
    console.error('Failed to load logs:', error);
    const container = document.getElementById('logsContent');
    if (container) {
      container.innerHTML = `
        <div class="empty-state error">
          <div class="empty-icon">❌</div>
          <h3>Failed to Load Logs</h3>
          <p>Error: ${error.message}</p>
          <button onclick="loadLogs()" class="btn btn-primary">Retry</button>
        </div>
      `;
    }
  }
}

// AI Config Management
let aiConfigInitialized = false;

async function loadAIConfig() {
  try {
    console.log('Loading AI config page...');
    
    // Only initialize once
    if (aiConfigInitialized) {
      console.log('[AI] Already initialized, skipping...');
      return;
    }
    
    // Initialize AI config module after a short delay
    setTimeout(async () => {
      if (window.aiConfigModule && window.aiConfigModule.initAIConfig) {
        console.log('Calling initAIConfig...');
        await window.aiConfigModule.initAIConfig();
        aiConfigInitialized = true;
      } else {
        console.error('aiConfigModule not available!');
      }
    }, 200);
  } catch (error) {
    console.error('Failed to load AI config:', error);
  }
}

// Setup all event listeners
function setupEventListeners() {
  console.log('[App] Setting up event listeners...');
  
  // Safe Mode Toggle - Sidebar
  console.log('[App] Setting up safe mode toggle...');
  const safeModeToggle = document.getElementById('safeModeToggle');
  
  if (safeModeToggle) {
    console.log('[App] Safe mode toggle found');
    
    safeModeToggle.addEventListener('change', async function(e) {
      const enabled = e.target.checked;
      console.log('[App] Safe mode toggle clicked, new state:', enabled);
      
      try {
        const result = await window.electronAPI.saveConfig({ safeMode: enabled });
        
        if (result.success) {
          console.log('[App] Safe mode saved successfully:', enabled);
          showNotification(`Safe Mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
          
          // Update settings page checkbox if it exists
          const safeModeCheckbox = document.getElementById('safeModeCheckbox');
          if (safeModeCheckbox) {
            safeModeCheckbox.checked = enabled;
          }
        } else {
          console.error('[App] Failed to save safe mode');
          // Revert toggle
          e.target.checked = !enabled;
        }
      } catch (error) {
        console.error('[App] Safe mode error:', error);
        // Revert toggle
        e.target.checked = !enabled;
      }
    });
    
    console.log('[App] Safe mode toggle setup complete');
  } else {
    console.error('[App] Safe mode toggle not found!');
  }
  // Draft Studio
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const previewDraftBtn = document.getElementById('previewDraftBtn');
  const draftBody = document.getElementById('draftBody');

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', async () => {
      const submolt = document.getElementById('submolt').value;
      const topic = document.getElementById('topic').value;
      const body = document.getElementById('draftBody').value;
      const includeWatam = document.getElementById('includeWatam').checked;

      if (!topic || !body) {
        showNotification('Please enter both title and content', 'error');
        return;
      }

      try {
        const draft = {
          id: Date.now(),
          submolt,
          title: topic,
          body: includeWatam ? body + '\n\nLearn more at wearetheartmakers.com' : body,
          createdAt: new Date().toISOString(),
        };

        const result = await window.electronAPI.saveDraft(draft);
        if (result.success) {
          showNotification('Draft saved successfully!', 'success');
          document.getElementById('topic').value = '';
          document.getElementById('draftBody').value = '';
        }
      } catch (error) {
        showNotification('Failed to save draft', 'error');
      }
    });
  }

  if (previewDraftBtn) {
    previewDraftBtn.addEventListener('click', () => {
      const submolt = document.getElementById('submolt').value;
      const topic = document.getElementById('topic').value;
      let body = document.getElementById('draftBody').value;
      const includeWatam = document.getElementById('includeWatam').checked;

      if (!topic || !body) {
        showNotification('Please enter both title and content', 'error');
        return;
      }

      // Add WATAM CTA if checked
      if (includeWatam) {
        body = body + '\n\n---\n\nLearn more at https://wearetheartmakers.com';
      }

      showDraftPreview({
        submolt,
        title: topic,
        body: body,
      });
    });
  }

  // Auto-save draft every 30 seconds
  if (draftBody) {
    draftBody.addEventListener('input', () => {
      clearInterval(autoSaveInterval);
      autoSaveInterval = setInterval(async () => {
        const topic = document.getElementById('topic').value;
        const body = document.getElementById('draftBody').value;
        if (topic && body) {
          const draft = {
            id: 'autosave',
            submolt: document.getElementById('submolt').value,
            title: topic,
            body,
            createdAt: new Date().toISOString(),
          };
          await window.electronAPI.saveDraft(draft);
          console.log('Auto-saved draft');
        }
      }, 30000);
    });
  }

  // Publish button - Prevent multiple submissions
  const publishBtn = document.getElementById('publishBtn');
  if (publishBtn) {
    // Remove any existing listeners first
    const newPublishBtn = publishBtn.cloneNode(true);
    publishBtn.parentNode.replaceChild(newPublishBtn, publishBtn);
    
    let isPublishing = false;
    
    newPublishBtn.addEventListener('click', async () => {
      if (isPublishing) {
        console.log('Already publishing, ignoring click');
        return;
      }
      
      isPublishing = true;
      newPublishBtn.disabled = true;
      newPublishBtn.textContent = 'Publishing...';
      
      const submolt = document.getElementById('previewSubmolt').textContent;
      const title = document.getElementById('previewTitle').textContent;
      const body = document.getElementById('previewBody').textContent;

      if (!submolt || !title || !body) {
        showNotification('Missing post data', 'error');
        isPublishing = false;
        return;
      }

      try {
        showNotification('Publishing post...', 'info');
        const result = await window.electronAPI.publishPost({
          submolt,
          title,
          body,
        });

        if (result.success) {
          showNotification('Post published successfully!', 'success');
          
          // Show rate limit countdown if available
          if (result.rateLimitInfo && result.rateLimitInfo.nextPostAllowed) {
            showRateLimitCountdown(result.rateLimitInfo.nextPostAllowed);
          }
          
          document.getElementById('draftPreview').classList.add('hidden');
          // Clear form
          document.getElementById('topic').value = '';
          document.getElementById('draftBody').value = '';
          // Navigate to posts page
          setTimeout(() => {
            window.navigateToPage('posts');
          }, 1000);
        } else {
          showNotification(result.error || 'Failed to publish', 'error');
        }
      } catch (error) {
        showNotification('Failed to publish post: ' + error.message, 'error');
      } finally {
        isPublishing = false;
        newPublishBtn.disabled = false;
        newPublishBtn.textContent = 'Publish Post';
      }
    });
  }

  // Copy button
  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const body = document.getElementById('previewBody').textContent;
      navigator.clipboard.writeText(body);
      showNotification('Copied to clipboard', 'success');
    });
  }

  // Refresh posts button - Show local posts
  const refreshPostsBtn = document.getElementById('refreshPostsBtn');
  if (refreshPostsBtn) {
    refreshPostsBtn.addEventListener('click', async () => {
      try {
        showNotification('Loading posts...', 'info');
        console.log('[App] Refresh Posts button clicked');
        await loadPosts();
        showNotification('✅ Posts loaded!', 'success');
      } catch (error) {
        console.error('[App] Error loading posts:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
      }
    });
  }

  const fetchCommentsBtn = document.getElementById('fetchCommentsBtn');
  if (fetchCommentsBtn) {
    fetchCommentsBtn.addEventListener('click', async () => {
      showNotification('Syncing posts...', 'info');
      const result = await window.electronAPI.syncPosts();
      if (result.success) {
        showNotification(`Synced ${result.count || 0} posts successfully!`, 'success');
        loadPosts();
      } else {
        showNotification('Failed to sync posts: ' + (result.error || 'Unknown error'), 'error');
      }
    });
  }

  // Persona Editor
  const savePersonaBtn = document.getElementById('savePersonaBtn');
  const loadPersonaBtn = document.getElementById('loadPersonaBtn');
  const personaStatus = document.getElementById('personaStatus');

  if (savePersonaBtn) {
    savePersonaBtn.addEventListener('click', async () => {
      const persona = document.getElementById('personaText').value;
      if (!persona.trim()) {
        showStatus(personaStatus, 'Please enter a persona', 'error');
        return;
      }

      try {
        const result = await window.electronAPI.saveConfig({ persona });
        if (result.success) {
          showStatus(personaStatus, '✅ Persona saved successfully!', 'success');
        } else {
          showStatus(personaStatus, '❌ Failed to save persona', 'error');
        }
      } catch (error) {
        showStatus(personaStatus, `❌ Error: ${error.message}`, 'error');
      }
    });
  }

  if (loadPersonaBtn) {
    loadPersonaBtn.addEventListener('click', async () => {
      try {
        const config = await window.electronAPI.getConfig();
        const defaultPersona = `You are a helpful, friendly AI agent for the WATAM community.

Key Guidelines:
- Be warm and welcoming
- Focus on art, music, and creativity
- Always include 'Not financial advice' for token discussions
- Use emojis sparingly
- Keep responses concise and actionable
- Promote WeAreTheArtMakers when contextually relevant
- Support the modX community with educational content`;
        
        document.getElementById('personaText').value = config.persona || defaultPersona;
        showStatus(personaStatus, '✅ Persona loaded', 'success');
      } catch (error) {
        showStatus(personaStatus, `❌ Error: ${error.message}`, 'error');
      }
    });
  }

  // Skills Editor
  const saveSkillsBtn = document.getElementById('saveSkillsBtn');
  const loadSkillsBtn = document.getElementById('loadSkillsBtn');
  const skillsStatus = document.getElementById('skillsStatus');

  if (saveSkillsBtn) {
    saveSkillsBtn.addEventListener('click', async () => {
      const skills = document.getElementById('skillsText').value;
      if (!skills.trim()) {
        showStatus(skillsStatus, 'Please enter skills', 'error');
        return;
      }

      try {
        const result = await window.electronAPI.saveConfig({ skills });
        if (result.success) {
          showStatus(skillsStatus, '✅ Skills saved successfully!', 'success');
        } else {
          showStatus(skillsStatus, '❌ Failed to save skills', 'error');
        }
      } catch (error) {
        showStatus(skillsStatus, `❌ Error: ${error.message}`, 'error');
      }
    });
  }

  if (loadSkillsBtn) {
    loadSkillsBtn.addEventListener('click', async () => {
      try {
        const config = await window.electronAPI.getConfig();
        const defaultSkills = `# WATAM Community Skills

## About WATAM
- WeAreTheArtMakers is a creative community
- Website: https://wearetheartmakers.com
- Focus: Art, Music, AI, Community building

## modX Token
- Community governance and rewards token
- NOT financial advice - educational purposes only
- Used for community participation and voting

## Moltbook Platform
- Decentralized social platform
- Submolts are like subreddits/communities
- Respect rate limits and community guidelines
- Be helpful and constructive

## Safety Rules
- Never give financial advice
- Always include disclaimers for token discussions
- Respect rate limits (3 posts/hour, 20 comments/hour)
- Confirm before publishing
- Use Safe Mode in production`;
        
        document.getElementById('skillsText').value = config.skills || defaultSkills;
        showStatus(skillsStatus, '✅ Skills loaded', 'success');
      } catch (error) {
        showStatus(skillsStatus, `❌ Error: ${error.message}`, 'error');
      }
    });
  }

  // View Logs button
  const viewLogsBtn = document.getElementById('viewLogsBtn');
  if (viewLogsBtn) {
    viewLogsBtn.addEventListener('click', () => {
      window.navigateToPage('logs');
    });
  }

  // Listen for navigation events (REMOVE OLD LISTENERS FIRST)
  window.electronAPI.onNavigate((page) => {
    if (window.navigateToPage) {
      window.navigateToPage(page);
    }
  });

  window.electronAPI.onSafeModeChanged((enabled) => {
    const toggle = document.getElementById('safeModeToggle');
    if (toggle && !window.isSafeModeUpdating) {
      toggle.checked = enabled;
      console.log('[App] Safe mode changed from backend:', enabled);
    }
    
    const checkbox = document.getElementById('safeModeCheckbox');
    if (checkbox && !window.isSafeModeUpdating) {
      checkbox.checked = enabled;
    }
  });

  // Listen for queue post published events
  window.electronAPI.onQueuePostPublished((data) => {
    console.log('[App] Queue post published:', data.post.title);
    showNotification(`✅ Auto-posted: ${data.post.title}`, 'success');
    
    // Refresh posts if on posts page
    if (document.getElementById('posts').classList.contains('active')) {
      loadPosts();
    }
    
    // Refresh drafts if on drafts page (to update queue status)
    if (document.getElementById('drafts').classList.contains('active')) {
      loadDrafts();
    }
  });
}

// Helper functions
function showDraftPreview(draft) {
  document.getElementById('previewSubmolt').textContent = draft.submolt;
  document.getElementById('previewTitle').textContent = draft.title;
  document.getElementById('previewBody').textContent = draft.body;
  document.getElementById('draftPreview').classList.remove('hidden');
}

function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Add spinner for loading messages
  if (type === 'info' && (message.includes('...') || message.includes('Loading') || message.includes('Fetching') || message.includes('Posting'))) {
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    toast.appendChild(spinner);
  }
  
  const textNode = document.createTextNode(message);
  toast.appendChild(textNode);
  
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Hide and remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showStatus(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = `status-message ${type}`;
  element.classList.remove('hidden');
  
  setTimeout(() => {
    element.classList.add('hidden');
  }, 5000);
}

// Drafts Management
async function loadDrafts() {
  try {
    const result = await window.electronAPI.getDrafts();
    const queueResult = await window.electronAPI.getPostQueue();
    const container = document.getElementById('draftsContainer');
    
    if (!result.success || !result.drafts || result.drafts.length === 0) {
      container.innerHTML = '<p class="empty-state">No saved drafts yet. Create one in New Draft!</p>';
      return;
    }

    const queue = queueResult.success ? queueResult.queue : [];
    
    container.innerHTML = result.drafts.map(draft => {
      const isQueued = queue.some(q => q.title === draft.title && q.body === draft.body && q.status === 'queued');
      const queueItem = queue.find(q => q.title === draft.title && q.body === draft.body);
      
      return `
      <div class="draft-card" data-id="${draft.id}">
        <div class="draft-header">
          <h4>${draft.title}</h4>
          <span class="draft-submolt">${draft.submolt}</span>
        </div>
        <div class="draft-body">${draft.body.substring(0, 200)}${draft.body.length > 200 ? '...' : ''}</div>
        
        <!-- Auto-Post Queue Section -->
        <div class="auto-post-section">
          <div class="auto-post-toggle">
            <label class="switch-label">
              <input type="checkbox" class="auto-post-checkbox" data-draft-id="${draft.id}" ${isQueued ? 'checked' : ''}>
              <span class="switch-text">📤 Auto-post when rate limit expires</span>
            </label>
          </div>
          ${isQueued ? `
            <div class="queue-status">
              <span class="queue-badge ${queueItem?.status || 'queued'}">
                ${queueItem?.status === 'queued' ? '⏳ Queued for auto-posting' : 
                  queueItem?.status === 'processing' ? '🔄 Publishing...' : 
                  queueItem?.status === 'failed' ? '❌ Failed: ' + (queueItem.error || 'Unknown error') : 
                  '✅ Published'}
              </span>
            </div>
          ` : ''}
        </div>
        
        <div class="draft-footer">
          <span class="draft-date">${new Date(draft.createdAt).toLocaleString()}</span>
          <div class="draft-actions">
            <button class="btn btn-sm btn-secondary edit-draft" data-id="${draft.id}">Edit</button>
            <button class="btn btn-sm btn-primary publish-draft" data-id="${draft.id}">Publish Now</button>
            <button class="btn btn-sm btn-danger delete-draft" data-id="${draft.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
    }).join('');

    // Add event listeners for auto-post toggles
    document.querySelectorAll('.auto-post-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const draftId = e.target.dataset.draftId;
        const enabled = e.target.checked;
        
        try {
          showNotification(enabled ? 'Adding to auto-post queue...' : 'Removing from queue...', 'info');
          
          const result = await window.electronAPI.toggleAutoPost({ draftId, enabled });
          
          if (result.success) {
            showNotification(
              enabled ? '✅ Added to auto-post queue!' : '✅ Removed from queue', 
              'success'
            );
            
            // Reload drafts to show updated status
            setTimeout(() => loadDrafts(), 500);
          } else {
            showNotification('❌ Failed: ' + result.error, 'error');
            e.target.checked = !enabled; // Revert checkbox
          }
        } catch (error) {
          showNotification('❌ Error: ' + error.message, 'error');
          e.target.checked = !enabled; // Revert checkbox
        }
      });
    });

    // Add event listeners for other buttons
    document.querySelectorAll('.edit-draft').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const draft = result.drafts.find(d => d.id == id);
        if (draft) {
          document.getElementById('submolt').value = draft.submolt;
          document.getElementById('topic').value = draft.title;
          document.getElementById('draftBody').value = draft.body;
          window.navigateToPage('draft');
        }
      });
    });

    document.querySelectorAll('.publish-draft').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const draft = result.drafts.find(d => d.id == id);
        if (draft) {
          try {
            showNotification('Publishing draft...', 'info');
            const publishResult = await window.electronAPI.publishPost({
              submolt: draft.submolt,
              title: draft.title,
              body: draft.body,
            });

            if (publishResult.success) {
              showNotification('✅ Draft published successfully!', 'success');
              
              // Show rate limit countdown if available
              if (publishResult.rateLimitInfo && publishResult.rateLimitInfo.nextPostAllowed) {
                showRateLimitCountdown(publishResult.rateLimitInfo.nextPostAllowed);
              }
              
              // Navigate to posts page
              setTimeout(() => {
                window.navigateToPage('posts');
              }, 1000);
            } else {
              showNotification('❌ Failed to publish: ' + publishResult.error, 'error');
            }
          } catch (error) {
            showNotification('❌ Error: ' + error.message, 'error');
          }
        }
      });
    });

    document.querySelectorAll('.delete-draft').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (confirm('Delete this draft?')) {
          const id = e.target.dataset.id;
          await window.electronAPI.deleteDraft(id);
          loadDrafts();
        }
      });
    });
  } catch (error) {
    console.error('Failed to load drafts:', error);
  }
}

// Reply Dialog Management
let replyDialogCallback = null;

window.closeReplyDialog = function() {
  document.getElementById('replyDialog').classList.add('hidden');
  document.getElementById('replyDialogText').value = '';
  replyDialogCallback = null;
};

window.submitReplyDialog = function() {
  const text = document.getElementById('replyDialogText').value.trim();
  if (text && replyDialogCallback) {
    replyDialogCallback(text);
  }
  window.closeReplyDialog();
};

function showReplyDialog(title, callback) {
  document.getElementById('replyDialogTitle').textContent = title;
  document.getElementById('replyDialogText').value = '';
  document.getElementById('replyDialog').classList.remove('hidden');
  replyDialogCallback = callback;
  
  // Focus textarea
  setTimeout(() => {
    document.getElementById('replyDialogText').focus();
  }, 100);
}

// Posts Management
async function loadPosts() {
  try {
    // Check for active rate limit and show countdown
    checkAndShowRateLimit();
    
    // Update post queue status
    updatePostQueueStatus();
    
    const result = await window.electronAPI.getPosts();
    const container = document.getElementById('postsContainer');
    
    console.log('[App] loadPosts result:', result);
    console.log('[App] Number of posts:', result.posts?.length || 0);
    
    if (!result.success || !result.posts || result.posts.length === 0) {
      container.innerHTML = '<p class="empty-state">No published posts yet. Create and publish a draft!</p>';
      return;
    }

    console.log('[App] Rendering posts...');
    container.innerHTML = result.posts.map(post => {
      console.log('[App] Rendering post:', post.id, post.title);
      return `
      <div class="post-card" data-id="${post.id}">
        <div class="post-header">
          <h4>${post.title}</h4>
          <span class="post-submolt">${post.submolt}</span>
          ${post.fromQueue ? '<span class="post-badge auto">🤖 Auto-posted</span>' : ''}
        </div>
        <div class="post-body">${post.body.substring(0, 200)}${post.body.length > 200 ? '...' : ''}</div>
        <div class="post-meta">
          <span class="post-date">📅 ${new Date(post.publishedAt).toLocaleString()}</span>
          ${post.url ? `<a href="${post.url}" class="post-link" onclick="window.electronAPI.openExternal('${post.url}'); return false;">🔗 View on Moltbook</a>` : '<span class="post-warning">⚠️ Not on Moltbook</span>'}
        </div>
        <div class="post-stats">
          <span>👁️ ${post.views || 0} views</span>
          <span>💬 ${post.comments || 0} comments</span>
        </div>
        <div class="post-actions">
          <button class="btn btn-sm btn-secondary view-comments" data-id="${post.id}">View Comments</button>
          <button class="btn btn-sm btn-primary reply-to-post" data-id="${post.id}" data-title="${post.title.replace(/"/g, '&quot;')}">Quick Reply</button>
          <button class="btn btn-sm btn-danger delete-post" data-id="${post.id}">Delete</button>
        </div>
        <div class="post-comments hidden" id="comments-${post.id}">
          <p class="loading">Loading comments...</p>
        </div>
      </div>
      `;
    }).join('');

    // Add event listeners
    console.log('[App] Adding event listeners to', document.querySelectorAll('.view-comments').length, 'view-comments buttons');
    
    document.querySelectorAll('.view-comments').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        console.log('[App] View Comments clicked for post:', id);
        const commentsDiv = document.getElementById(`comments-${id}`);
        
        if (!commentsDiv) {
          console.error('[App] Comments div not found for post:', id);
          showNotification('❌ Error: Comments container not found', 'error');
          return;
        }
        
        const wasHidden = commentsDiv.classList.contains('hidden');
        commentsDiv.classList.toggle('hidden');
        console.log('[App] Comments div toggled. Now hidden:', commentsDiv.classList.contains('hidden'));
        
        if (!commentsDiv.classList.contains('hidden') && wasHidden) {
          console.log('[App] Loading comments for first time...');
          commentsDiv.innerHTML = '<p class="loading">Loading comments...</p>';
          await loadPostComments(id);
        }
      });
    });

    document.querySelectorAll('.reply-to-post').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const title = e.target.dataset.title;
        
        // Show reply dialog
        showReplyDialog(`Reply to: "${title}"`, async (replyText) => {
          try {
            console.log('[App] 🚀 Quick Reply starting for post:', id);
            console.log('[App] Reply text length:', replyText.length);
            showNotification('Posting reply...', 'info');
            
            const result = await window.electronAPI.replyToPost({ 
              postId: id, 
              body: replyText 
            });
            
            console.log('[App] Quick Reply result:', result);
            
            if (result.success) {
              showNotification('✅ Reply posted successfully!', 'success');
              // Refresh comments
              const commentsDiv = document.getElementById(`comments-${id}`);
              if (!commentsDiv.classList.contains('hidden')) {
                await loadPostComments(id);
              }
              // Refresh posts to update comment count
              await loadPosts();
            } else {
              console.error('[App] ❌ Quick Reply failed:', result.error);
              showNotification('❌ Failed to post reply: ' + result.error, 'error');
            }
          } catch (error) {
            console.error('[App] ❌ Quick Reply exception:', error);
            showNotification('❌ Error: ' + error.message, 'error');
          }
        });
      });
    });

    document.querySelectorAll('.delete-post').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        
        if (confirm('Are you sure you want to delete this post from local storage?\n\nNote: This will NOT delete the post from Moltbook, only from this app.')) {
          try {
            const result = await window.electronAPI.deletePost(id);
            
            if (result.success) {
              showNotification('✅ Post deleted from local storage', 'success');
              loadPosts(); // Reload posts
            } else {
              showNotification('❌ Failed to delete post: ' + result.error, 'error');
            }
          } catch (error) {
            showNotification('❌ Error: ' + error.message, 'error');
          }
        }
      });
    });
  } catch (error) {
    console.error('Failed to load posts:', error);
  }
}

// Update post queue status display
async function updatePostQueueStatus() {
  try {
    const result = await window.electronAPI.getPostQueue();
    const queueCountElement = document.getElementById('queueCount');
    const queueStatusElement = document.getElementById('postQueueStatus');
    
    if (result.success && queueCountElement && queueStatusElement) {
      const queuedPosts = result.queue.filter(p => p.status === 'queued').length;
      queueCountElement.textContent = queuedPosts;
      
      if (queuedPosts > 0) {
        queueStatusElement.classList.add('has-queue');
      } else {
        queueStatusElement.classList.remove('has-queue');
      }
    }
  } catch (error) {
    console.error('[App] Failed to update queue status:', error);
  }
}

async function loadPostComments(postId) {
  try {
    console.log('[App] Loading comments for post:', postId);
    
    if (!postId) {
      console.error('[App] No post ID provided!');
      showNotification('❌ Error: No post ID', 'error');
      return;
    }
    
    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (!commentsDiv) {
      console.error('[App] Comments div not found!');
      return;
    }
    
    // Show loading state
    commentsDiv.innerHTML = '<p class="loading">Loading comments...</p>';
    
    const result = await window.electronAPI.getPostComments(postId);
    console.log('[App] Comments result:', result);
    
    if (!result.success) {
      console.error('[App] Failed to load comments:', result.error);
      commentsDiv.innerHTML = `<p class="empty-state error">❌ Failed to load comments: ${result.error}</p>`;
      showNotification('❌ Failed to load comments: ' + result.error, 'error');
      return;
    }
    
    if (!result.comments || result.comments.length === 0) {
      console.log('[App] No comments found');
      commentsDiv.innerHTML = '<p class="empty-state">💬 No comments yet. Be the first to comment!</p>';
      return;
    }

    console.log('[App] Rendering', result.comments.length, 'comments');
    commentsDiv.innerHTML = result.comments.map(comment => {
      // Handle different comment formats
      const author = comment.author?.username || comment.author?.name || comment.author || 
                     comment.user?.username || comment.user?.name || 'Anonymous';
      const body = comment.body || comment.content || comment.text || '';
      const createdAt = comment.createdAt || comment.created_at || comment.timestamp || new Date().toISOString();
      const commentId = comment.id || comment._id || '';
      
      console.log('[App] Rendering comment:', { author, body: body.substring(0, 50), commentId });
      
      return `
        <div class="comment">
          <div class="comment-header">
            <strong>@${author}</strong>
            <span class="comment-date">${new Date(createdAt).toLocaleString()}</span>
          </div>
          <div class="comment-body">${body}</div>
          <button class="btn btn-sm btn-secondary reply-to-comment" data-id="${commentId}" data-post="${postId}" data-author="${author}">Reply</button>
        </div>
      `;
    }).join('');

    // Add reply listeners
    document.querySelectorAll('.reply-to-comment').forEach(btn => {
      btn.addEventListener('click', async () => {
        const commentId = btn.dataset.id;
        const postIdFromBtn = btn.dataset.post;
        const author = btn.dataset.author;
        
        // Show reply dialog
        showReplyDialog(`Reply to @${author}`, async (replyText) => {
          try {
            showNotification('Posting reply...', 'info');
            const result = await window.electronAPI.replyToComment({ 
              postId: postIdFromBtn, 
              commentId, 
              body: replyText 
            });
            
            if (result.success) {
              showNotification('✅ Reply posted successfully!', 'success');
              await loadPostComments(postIdFromBtn);
            } else {
              showNotification('❌ Failed to post reply: ' + result.error, 'error');
            }
          } catch (error) {
            showNotification('❌ Error: ' + error.message, 'error');
          }
        });
      });
    });
  } catch (error) {
    console.error('[App] Failed to load comments:', error);
    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (commentsDiv) {
      commentsDiv.innerHTML = `<p class="empty-state error">❌ Error: ${error.message}</p>`;
    }
    showNotification('❌ Error loading comments: ' + error.message, 'error');
  }
}
// Agent Profile & Rewards functionality
function initializeAgentProfile() {
  console.log('[Profile] ========== INITIALIZING AGENT PROFILE ==========');
  
  // Use event delegation on the parent container
  const personaCard = document.querySelector('.persona-tabs');
  
  if (!personaCard) {
    console.error('[Profile] ❌ .persona-tabs container not found!');
    return;
  }
  
  console.log('[Profile] ✓ Found .persona-tabs container');
  
  // Tab switching with event delegation
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  console.log('[Profile] Found', tabs.length, 'tabs and', tabContents.length, 'tab contents');
  
  if (tabs.length === 0) {
    console.error('[Profile] ❌ No tabs found!');
    return;
  }
  
  if (tabContents.length === 0) {
    console.error('[Profile] ❌ No tab contents found!');
    return;
  }
  
  // Log all tabs and contents
  tabs.forEach((tab, i) => {
    console.log(`[Profile] Tab ${i}: data-tab="${tab.dataset.tab}", active=${tab.classList.contains('active')}`);
  });
  
  tabContents.forEach((content, i) => {
    console.log(`[Profile] Content ${i}: id="${content.id}", active=${content.classList.contains('active')}`);
  });
  
  // Add click handler to each tab
  tabs.forEach((tab) => {
    // Remove any existing listeners by cloning
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
    
    newTab.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[Profile] ========== TAB CLICKED ==========');
      console.log('[Profile] Clicked tab:', this.dataset.tab);
      
      // Remove active from all tabs
      document.querySelectorAll('.tab-btn').forEach(t => {
        t.classList.remove('active');
        console.log('[Profile] Removed active from:', t.dataset.tab);
      });
      
      // Remove active from all contents
      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        console.log('[Profile] Removed active from:', c.id);
      });
      
      // Add active to clicked tab
      this.classList.add('active');
      console.log('[Profile] ✓ Added active to tab:', this.dataset.tab);
      
      // Show corresponding content
      const targetId = this.dataset.tab + '-tab';
      const targetContent = document.getElementById(targetId);
      
      console.log('[Profile] Looking for content:', targetId);
      
      if (targetContent) {
        targetContent.classList.add('active');
        console.log('[Profile] ✓ Activated content:', targetId);
      } else {
        console.error('[Profile] ❌ Content not found:', targetId);
      }
    });
    
    console.log('[Profile] ✓ Added listener to tab:', newTab.dataset.tab);
  });
  
  // Personality sliders
  const sliders = document.querySelectorAll('.personality-slider');
  console.log('[Profile] Found', sliders.length, 'personality sliders');
  
  sliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const value = e.target.value;
      console.log('[Profile] Slider changed:', value);
      
      // Update visual feedback if there's a value display
      const container = e.target.closest('.slider-group');
      if (container) {
        const valueDisplay = container.querySelector('.slider-value');
        if (valueDisplay) {
          valueDisplay.textContent = value;
        }
      }
    });
  });
  
  // Personality traits checkboxes
  const traitCheckboxes = document.querySelectorAll('.traits-grid input[type="checkbox"]');
  console.log('[Profile] Found', traitCheckboxes.length, 'trait checkboxes');
  
  traitCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const checked = document.querySelectorAll('.traits-grid input[type="checkbox"]:checked');
      console.log('[Profile] Traits selected:', checked.length);
      
      // Limit to 5 traits
      if (checked.length > 5) {
        e.target.checked = false;
        showNotification('⚠️ Maximum 5 traits allowed', 'warning');
      }
    });
  });
  
  // Expertise checkboxes
  const expertiseCheckboxes = document.querySelectorAll('.expertise-grid input[type="checkbox"]');
  console.log('[Profile] Found', expertiseCheckboxes.length, 'expertise checkboxes');
  
  expertiseCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const checked = document.querySelectorAll('.expertise-grid input[type="checkbox"]:checked');
      console.log('[Profile] Expertise selected:', checked.length);
    });
  });
  
  // Save profile button
  const saveProfileBtn = document.getElementById('savePersonaBtn');
  console.log('[Profile] Save button found:', !!saveProfileBtn);
  
  if (saveProfileBtn) {
    // Remove any existing listeners
    const newSaveBtn = saveProfileBtn.cloneNode(true);
    saveProfileBtn.parentNode.replaceChild(newSaveBtn, saveProfileBtn);
    
    newSaveBtn.addEventListener('click', async () => {
      console.log('[Profile] Save button clicked');
      await saveAgentProfile();
    });
  }
  
  // Test persona button
  const testPersonaBtn = document.getElementById('testPersonaBtn');
  if (testPersonaBtn) {
    testPersonaBtn.addEventListener('click', () => {
      showNotification('🧪 Testing persona... (Feature coming soon)', 'info');
    });
  }
  
  // Reset persona button
  const resetPersonaBtn = document.getElementById('resetPersonaBtn');
  if (resetPersonaBtn) {
    resetPersonaBtn.addEventListener('click', () => {
      if (confirm('Reset persona to default settings?')) {
        // Reset all form fields
        document.querySelectorAll('.personality-slider').forEach(slider => {
          slider.value = 50;
        });
        document.querySelectorAll('.traits-grid input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
        });
        document.querySelectorAll('.expertise-grid input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
        });
        showNotification('✅ Persona reset to defaults', 'success');
      }
    });
  }
  
  // Load existing profile data
  loadAgentProfile();
  
  console.log('[Profile] Agent profile initialization complete');
}

async function saveAgentProfile() {
  try {
    console.log('[Profile] Saving agent profile...');
    
    const profileData = {
      personality: {},
      traits: [],
      expertise: [],
      communicationStyle: {},
    };
    
    // Collect personality slider values
    const sliders = document.querySelectorAll('.personality-slider');
    sliders.forEach(slider => {
      const id = slider.id;
      if (id) {
        profileData.personality[id] = parseInt(slider.value);
      }
    });
    
    console.log('[Profile] Personality data:', profileData.personality);
    
    // Collect selected traits
    const selectedTraits = document.querySelectorAll('.traits-grid input[type="checkbox"]:checked');
    selectedTraits.forEach(trait => {
      profileData.traits.push(trait.value);
    });
    
    console.log('[Profile] Traits:', profileData.traits);
    
    // Collect selected expertise
    const selectedExpertise = document.querySelectorAll('.expertise-grid input[type="checkbox"]:checked');
    selectedExpertise.forEach(exp => {
      profileData.expertise.push(exp.value);
    });
    
    console.log('[Profile] Expertise:', profileData.expertise);
    
    // Collect communication style
    const greetingStyle = document.getElementById('greetingStyle');
    if (greetingStyle) profileData.communicationStyle.greeting = greetingStyle.value;
    
    const signaturePhrase = document.getElementById('signaturePhrase');
    if (signaturePhrase) profileData.communicationStyle.signature = signaturePhrase.value;
    
    const favoriteEmojis = document.getElementById('favoriteEmojis');
    if (favoriteEmojis) profileData.communicationStyle.emojis = favoriteEmojis.value;
    
    console.log('[Profile] Communication style:', profileData.communicationStyle);
    
    // Save to config
    const result = await window.electronAPI.saveConfig({
      agentProfile: profileData,
    });
    
    if (result.success) {
      showNotification('✅ Agent profile saved successfully!', 'success');
      console.log('[Profile] Profile saved successfully');
      
      // Update karma display (simulate karma gain)
      const karmaValue = document.getElementById('agentKarma');
      if (karmaValue) {
        const currentKarma = parseInt(karmaValue.textContent) || 0;
        const newKarma = currentKarma + 10;
        karmaValue.textContent = newKarma;
        
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
          const progress = Math.min((newKarma % 100), 100);
          progressFill.style.width = `${progress}%`;
        }
        
        // Update progress text
        const progressText = document.getElementById('progressText');
        if (progressText) {
          progressText.textContent = `${newKarma % 100} / 100 karma`;
        }
      }
      
      // Show achievement notification
      setTimeout(() => {
        showNotification('🏆 Achievement: Profile Customizer (+10 Karma)', 'success');
      }, 1000);
      
    } else {
      showNotification('❌ Failed to save profile', 'error');
      console.error('[Profile] Failed to save:', result.error);
    }
  } catch (error) {
    console.error('[Profile] Save error:', error);
    showNotification('❌ Error saving profile: ' + error.message, 'error');
  }
}

async function loadAgentProfile() {
  try {
    console.log('[Profile] Loading agent profile...');
    
    const config = await window.electronAPI.getConfig();
    const profileData = config.agentProfile || {};
    
    console.log('[Profile] Loaded profile data:', profileData);
    
    // Load personality sliders
    if (profileData.personality) {
      Object.keys(profileData.personality).forEach(id => {
        const slider = document.getElementById(id);
        if (slider) {
          slider.value = profileData.personality[id];
          console.log('[Profile] Set slider', id, 'to', profileData.personality[id]);
        }
      });
    }
    
    // Load traits
    if (profileData.traits) {
      profileData.traits.forEach(trait => {
        const checkbox = document.querySelector(`.traits-grid input[value="${trait}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    }
    
    // Load expertise
    if (profileData.expertise) {
      profileData.expertise.forEach(exp => {
        const checkbox = document.querySelector(`.expertise-grid input[value="${exp}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    }
    
    // Load communication style
    if (profileData.communicationStyle) {
      const greetingStyle = document.getElementById('greetingStyle');
      if (greetingStyle && profileData.communicationStyle.greeting) {
        greetingStyle.value = profileData.communicationStyle.greeting;
      }
      
      const signaturePhrase = document.getElementById('signaturePhrase');
      if (signaturePhrase && profileData.communicationStyle.signature) {
        signaturePhrase.value = profileData.communicationStyle.signature;
      }
      
      const favoriteEmojis = document.getElementById('favoriteEmojis');
      if (favoriteEmojis && profileData.communicationStyle.emojis) {
        favoriteEmojis.value = profileData.communicationStyle.emojis;
      }
    }
    
    // Update karma display
    const karma = config.agentKarma || 0;
    const karmaValue = document.getElementById('agentKarma');
    if (karmaValue) {
      karmaValue.textContent = karma;
    }
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
      const progress = Math.min((karma % 100), 100);
      progressFill.style.width = `${progress}%`;
    }
    
    const progressText = document.getElementById('progressText');
    if (progressText) {
      progressText.textContent = `${karma % 100} / 100 karma`;
    }
    
    console.log('[Profile] Profile loaded successfully');
    
  } catch (error) {
    console.error('[Profile] Failed to load profile:', error);
  }
}

// Agent profile initialization is now handled in main DOMContentLoaded above