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
        // Countdown finished - READY TO POST!
        countdownElement.textContent = '✅ READY TO POST!';
        rateLimitCard.classList.add('ready');
        document.querySelector('.rate-limit-title').textContent = '✅ Ready to Post';
        document.querySelector('.rate-limit-subtitle').textContent = 'Queue will auto-post next draft';
        document.querySelector('.rate-limit-icon').textContent = '🚀';
        
        clearInterval(rateLimitCountdownInterval);
        
        // Show prominent notification
        showNotification('🚀 READY TO POST! Queue will auto-post next draft in queue.', 'success');
        
        // Trigger queue processor check (it runs every 30 seconds anyway)
        console.log('[App] ✅ Rate limit expired - queue processor will auto-post next draft');
        
        // Hide countdown after 10 seconds
        setTimeout(() => {
          rateLimitStatus.classList.add('hidden');
          rateLimitCard.classList.remove('ready');
        }, 10000);
        
        // Refresh drafts page if visible to show updated queue
        if (document.getElementById('drafts').classList.contains('active')) {
          loadDrafts();
        }
        
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
  
  // ALWAYS show the rate limit card, even if no active limit
  const rateLimitStatus = document.getElementById('rateLimitStatus');
  if (rateLimitStatus) {
    rateLimitStatus.classList.remove('hidden');
    
    // If no active rate limit, show "Ready to post"
    window.electronAPI.getRateLimitStatus().then(result => {
      if (!result.success || !result.nextAllowedTime) {
        const countdownElement = document.getElementById('rateLimitCountdown');
        const rateLimitCard = document.querySelector('.rate-limit-card');
        const rateLimitTitle = document.querySelector('.rate-limit-title');
        const rateLimitSubtitle = document.querySelector('.rate-limit-subtitle');
        const rateLimitIcon = document.querySelector('.rate-limit-icon');
        
        if (countdownElement && rateLimitCard) {
          countdownElement.textContent = '✅ READY';
          rateLimitCard.classList.add('ready');
          if (rateLimitTitle) rateLimitTitle.textContent = 'Ready to Post';
          if (rateLimitSubtitle) rateLimitSubtitle.textContent = 'No rate limit active';
          if (rateLimitIcon) rateLimitIcon.textContent = '🚀';
        }
      }
    }).catch(() => {
      // Show ready state on error
      const countdownElement = document.getElementById('rateLimitCountdown');
      if (countdownElement) {
        countdownElement.textContent = '✅ READY';
      }
    });
  }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] DOM loaded, initializing app...');
  
  // Simple navigation system
  setTimeout(() => {
    initializeNavigation();
    setupEventListeners();
    loadDashboard();
    
    // Setup search button listener (moved from bottom of file)
    const searchBtn = document.getElementById('searchUserBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', searchUsers);
    }
    
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          searchUsers();
        }
      });
    }
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
    case 'submolts':
      await loadMySubmolts();
      break;
    case 'ai-activity':
      await loadAIActivity();
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
          
          // CRITICAL: Load agent stats for Persona page karma display
          loadAgentStats();
        } else {
          console.error('[App] ❌ No tabs found! Retrying...');
          // Retry after a longer delay
          setTimeout(() => {
            const retryTabs = document.querySelectorAll('.tab-btn');
            console.log('[App] Retry - Found tabs:', retryTabs.length);
            if (retryTabs.length > 0) {
              initializeAgentProfile();
              loadAgentStats();
            } else {
              console.error('[App] ❌ Still no tabs found after retry!');
              console.error('[App] Persona page HTML:', personaPage.innerHTML.substring(0, 500));
            }
          }, 500);
        }
      }, 300);
      break;
  }
  
  // CRITICAL: Trigger translation after page content loads
  setTimeout(() => {
    if (window.languageManager) {
      console.log('[App] Triggering UI translation after page load:', pageName);
      // Save original text for new content
      window.languageManager.saveAllOriginalText();
      // Then translate if needed
      window.languageManager.translateUI();
    }
  }, 100);
}

// Dashboard
async function loadDashboard() {
  try {
    console.log('[Dashboard] ========================================');
    console.log('[Dashboard] Loading Dashboard...');
    
    // Check and show rate limit countdown if active
    checkAndShowRateLimit();
    
    // Load agent stats from Moltbook - CRITICAL: Do this first
    console.log('[Dashboard] Fetching agent stats from Moltbook...');
    await loadAgentStats();
    
    // Load network stats (followers/following)
    await loadNetworkStats();
    
    // Load rate limits
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

    // Load security status
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
    
    // Load recent activity from logs
    await loadRecentActivity();
    
    // Update challenges
    await updateChallenges();
    
    console.log('[Dashboard] ✅ Dashboard loaded successfully');
    console.log('[Dashboard] ========================================');
  } catch (error) {
    console.error('[Dashboard] ❌ Failed to load dashboard:', error);
  }
}

// Load agent stats from Moltbook
async function loadAgentStats() {
  try {
    console.log('[Dashboard] Loading agent stats from Moltbook...');
    
    const result = await window.electronAPI.getAgentStatus();
    
    if (!result.success) {
      console.warn('[Dashboard] Failed to load agent stats:', result.error);
      
      // Show error notification to user
      const errorMsg = result.error || 'Unknown error';
      if (errorMsg.includes('Cannot connect') || errorMsg.includes('ECONNREFUSED')) {
        showNotification('🔌 Cannot connect to Moltbook - Server might be down', 'error');
      } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
        showNotification('⏱️ Moltbook server is very slow - Please try again later', 'warning');
      } else if (errorMsg.includes('ENOTFOUND')) {
        showNotification('🌐 Cannot reach Moltbook - Check your internet connection', 'error');
      } else {
        showNotification(`⚠️ Moltbook Error: ${errorMsg}`, 'warning');
      }
      
      // Show default values with error indicator
      const agentStatsContainer = document.getElementById('agentStats');
      if (agentStatsContainer) {
        agentStatsContainer.innerHTML = `
          <div class="stat">
            <span class="label">Karma</span>
            <span class="value" style="color: #ef4444;">⚠️ 0</span>
          </div>
          <div class="stat">
            <span class="label">Followers</span>
            <span class="value" style="color: #ef4444;">⚠️ 0</span>
          </div>
          <div class="stat">
            <span class="label">Following</span>
            <span class="value" style="color: #ef4444;">⚠️ 0</span>
          </div>
        `;
      }
      
      // Update agent status to show error
      const agentStatusValue = document.querySelector('#agentStatus .value');
      if (agentStatusValue) {
        agentStatusValue.textContent = '⚠️ Connection Error';
        agentStatusValue.style.color = '#ef4444';
      }
      
      return;
    }
    
    console.log('[Dashboard] Agent stats:', result.agent);
    
    // Update agent status to show success
    const agentStatusValue = document.querySelector('#agentStatus .value');
    if (agentStatusValue) {
      agentStatusValue.textContent = '✅ Active';
      agentStatusValue.style.color = '#22c55e';
    }
    
    // Update agent stats in Dashboard
    const agentStatsContainer = document.getElementById('agentStats');
    if (agentStatsContainer && result.agent) {
      const agent = result.agent;
      // CRITICAL: Use follower_count and following_count (not followers/following)
      const followerCount = agent.follower_count || 0;
      const followingCount = agent.following_count || 0;
      
      agentStatsContainer.innerHTML = `
        <div class="stat">
          <span class="label">Karma</span>
          <span class="value">${agent.karma || 0}</span>
        </div>
        <div class="stat">
          <span class="label">Followers</span>
          <span class="value">${followerCount}</span>
        </div>
        <div class="stat">
          <span class="label">Following</span>
          <span class="value">${followingCount}</span>
        </div>
      `;
      console.log('[Dashboard] ✅ Agent stats updated:', {
        karma: agent.karma,
        followers: followerCount,
        following: followingCount
      });
      
      // CRITICAL: Also update Persona page karma display
      const karmaValue = document.getElementById('agentKarma');
      if (karmaValue) {
        karmaValue.textContent = agent.karma || 0;
        console.log('[Dashboard] ✅ Updated Persona page karma:', agent.karma);
      }
      
      const progressFill = document.getElementById('progressFill');
      const progressText = document.getElementById('progressText');
      if (progressFill && progressText) {
        const karma = agent.karma || 0;
        const progress = Math.min((karma % 100), 100);
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${karma % 100} / 100 karma`;
        console.log('[Dashboard] ✅ Updated progress bar:', progress + '%');
      }
    } else {
      console.warn('[Dashboard] Agent stats container not found or no agent data');
    }
  } catch (error) {
    console.error('[Dashboard] Failed to load agent stats:', error);
    
    // Show error notification
    showNotification('❌ Failed to load agent stats - Check console for details', 'error');
    
    // Update UI to show error state
    const agentStatusValue = document.querySelector('#agentStatus .value');
    if (agentStatusValue) {
      agentStatusValue.textContent = '❌ Error';
      agentStatusValue.style.color = '#ef4444';
    }
  }
}

// Load recent activity for dashboard
async function loadRecentActivity() {
  try {
    const result = await window.electronAPI.getLogs();
    const container = document.getElementById('recentActivity');
    
    if (!container) {
      console.error('[Dashboard] Recent activity container not found');
      return;
    }
    
    if (!result.success || !result.logs || result.logs.length === 0) {
      container.innerHTML = '<p class="empty-state">No recent activity</p>';
      return;
    }

    // Get last 5 activities
    const recentLogs = result.logs.reverse().slice(0, 5);
    
    let html = '<div class="activity-list">';
    recentLogs.forEach(log => {
      const time = new Date(log.timestamp);
      const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      // Determine icon based on action
      let icon = 'ℹ️';
      if (log.action.includes('published') || log.action.includes('saved')) icon = '✅';
      else if (log.action.includes('error') || log.action.includes('failed')) icon = '❌';
      else if (log.action.includes('queued')) icon = '📋';
      else if (log.action.includes('replied')) icon = '💬';
      else if (log.action.includes('started')) icon = '🚀';
      else if (log.action.includes('stopped')) icon = '⏹️';
      
      // Format action text
      let actionText = log.action.replace(/_/g, ' ').replace(/\./g, ' - ');
      actionText = actionText.charAt(0).toUpperCase() + actionText.slice(1);
      
      // Get details if available
      let detailsText = '';
      if (log.details && typeof log.details === 'object') {
        if (log.details.title) detailsText = log.details.title;
        else if (log.details.name) detailsText = log.details.name;
      }
      
      html += `
        <div class="activity-item">
          <span class="activity-icon">${icon}</span>
          <div class="activity-content">
            <div class="activity-action">${actionText}</div>
            ${detailsText ? `<div class="activity-details">${detailsText}</div>` : ''}
          </div>
          <span class="activity-time">${timeStr}</span>
        </div>
      `;
    });
    html += '</div>';
    
    container.innerHTML = html;
    
  } catch (error) {
    console.error('[Dashboard] Failed to load recent activity:', error);
    const container = document.getElementById('recentActivity');
    if (container) {
      container.innerHTML = '<p class="empty-state">Failed to load activity</p>';
    }
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

  // Track current draft ID to prevent duplicates
  let currentDraftId = null;

  // Load submolts for smart selector
  loadSubmolts();

  // Setup submolt search
  const submoltSearch = document.getElementById('submoltSearch');
  if (submoltSearch) {
    submoltSearch.addEventListener('input', (e) => {
      filterSubmoltDropdown(e.target.value);
    });
  }

  // Setup create submolt button
  const createSubmoltBtn = document.getElementById('createSubmoltBtn');
  if (createSubmoltBtn) {
    createSubmoltBtn.addEventListener('click', () => {
      showCreateSubmoltDialog();
    });
  }
  
  // Setup manage submolt button
  const manageSubmoltBtn = document.getElementById('manageSubmoltBtn');
  if (manageSubmoltBtn) {
    manageSubmoltBtn.addEventListener('click', async () => {
      const submoltSelect = document.getElementById('submolt');
      const selectedSubmolt = submoltSelect ? submoltSelect.value : '';
      if (selectedSubmolt) {
        await showManageSubmoltDialog(selectedSubmolt);
      } else {
        showNotification('❌ Please select a submolt first', 'error');
      }
    });
  }

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', async () => {
      const submolt = document.getElementById('submolt').value;
      const topic = document.getElementById('topic').value;
      const body = document.getElementById('draftBody').value;
      const includeWatamCheckbox = document.getElementById('includeWatam');
      const includeWatam = includeWatamCheckbox ? includeWatamCheckbox.checked : false;

      if (!topic || !body) {
        showNotification('Please enter both title and content', 'error');
        return;
      }

      try {
        // Prepare the final body with WATAM suffix if needed
        const finalBody = includeWatam ? body + '\n\nLearn more at wearetheartmakers.com' : body;
        
        // CRITICAL: Check if draft already exists with same title/body (check BOTH with and without WATAM)
        const existingDrafts = await window.electronAPI.getDrafts();
        const duplicate = existingDrafts.success && existingDrafts.drafts.find(d => 
          d.title === topic && (d.body === finalBody || d.body === body)
        );
        
        // Use existing draft ID if editing or duplicate found
        const draftId = currentDraftId || (duplicate ? duplicate.id : Date.now());

        const draft = {
          id: draftId,
          submolt,
          title: topic,
          body: finalBody,
          createdAt: new Date().toISOString(),
        };

        const result = await window.electronAPI.saveDraft(draft);
        if (result.success) {
          showNotification(duplicate ? 'Draft updated!' : 'Draft saved successfully!', 'success');
          
          // Clear form and reset draft ID for next draft
          document.getElementById('topic').value = '';
          document.getElementById('draftBody').value = '';
          currentDraftId = null; // Reset for next draft
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
      const includeWatamCheckbox = document.getElementById('includeWatam');
      const includeWatam = includeWatamCheckbox ? includeWatamCheckbox.checked : false;

      console.log('[Preview] 🔍 DEBUG - Reading from form:');
      console.log('[Preview] - submolt dropdown value:', submolt);
      console.log('[Preview] - topic value:', topic);
      console.log('[Preview] - body length:', body.length);

      if (!submolt) {
        showNotification('Please select a submolt', 'error');
        return;
      }

      if (!topic || !body) {
        showNotification('Please enter both title and content', 'error');
        return;
      }

      // Add WATAM CTA if checked
      if (includeWatam) {
        body = body + '\n\n---\n\nLearn more at https://wearetheartmakers.com';
      }

      console.log('[Preview] 📝 Calling showDraftPreview with:', { submolt, title: topic, bodyLength: body.length });

      showDraftPreview({
        submolt,
        title: topic,
        body: body,
      });
    });
  }

  // Auto-save draft every 30 seconds - DISABLED to prevent duplicates
  // Users should manually save drafts using the Save Draft button
  if (draftBody) {
    draftBody.addEventListener('input', () => {
      // Clear any existing auto-save interval
      clearInterval(autoSaveInterval);
      
      // DISABLED: Auto-save causes duplicate drafts
      // Users should use "Save Draft" button instead
      console.log('[Draft] Auto-save disabled - use Save Draft button');
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
      
      // Get data from preview elements (populated by Preview button)
      let submolt = document.getElementById('previewSubmolt')?.textContent || '';
      const title = document.getElementById('previewTitle')?.textContent || '';
      const body = document.getElementById('previewBody')?.textContent || '';

      // Remove 'm/' prefix if present (Moltbook API doesn't use it)
      if (submolt.startsWith('m/')) {
        submolt = submolt.substring(2);
        console.log('[Publish] 🔧 Removed m/ prefix, submolt is now:', submolt);
      }

      console.log('[Publish] 🔍 DEBUG - Reading from preview elements:');
      console.log('[Publish] - previewSubmolt element:', document.getElementById('previewSubmolt'));
      console.log('[Publish] - previewSubmolt textContent:', document.getElementById('previewSubmolt')?.textContent);
      console.log('[Publish] - submolt value (after cleanup):', submolt);
      console.log('[Publish] - title value:', title);
      console.log('[Publish] - body length:', body.length);

      // Validate data
      if (!submolt || !title || !body) {
        console.error('[Publish] Missing data:', { submolt, title, body });
        showNotification('Please click Preview first to see your post before publishing', 'error');
        isPublishing = false;
        newPublishBtn.disabled = false;
        newPublishBtn.textContent = 'Publish Post';
        return;
      }

      try {
        console.log('[Publish] Publishing post:', { submolt, title, bodyLength: body.length });
        console.log('[Publish] 🚀 Sending to main process with submolt:', submolt);
        showNotification('Publishing post...', 'info');
        
        const result = await window.electronAPI.publishPost({
          submolt,
          title,
          body,
        });

        console.log('[Publish] 📥 Result from main process:', result);

        if (result.success) {
          showNotification('Post published successfully!', 'success');
          
          // Show rate limit countdown if available
          if (result.rateLimitInfo && result.rateLimitInfo.nextPostAllowed) {
            showRateLimitCountdown(result.rateLimitInfo.nextPostAllowed);
          }
          
          // Hide preview
          document.getElementById('draftPreview').classList.add('hidden');
          
          // Clear form
          const topicInput = document.getElementById('topic');
          const bodyInput = document.getElementById('draftBody');
          if (topicInput) topicInput.value = '';
          if (bodyInput) bodyInput.value = '';
          
          // Navigate to posts page
          setTimeout(() => {
            window.navigateToPage('posts');
          }, 1000);
        } else {
          showNotification(result.error || 'Failed to publish', 'error');
        }
      } catch (error) {
        console.error('[Publish] Error:', error);
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
  
  // Fix URLs button - for posts with undefined URLs
  const fixUrlsBtn = document.getElementById('fixUrlsBtn');
  if (fixUrlsBtn) {
    fixUrlsBtn.addEventListener('click', async () => {
      if (!confirm('This will attempt to fix undefined URLs for old posts.\n\nNote: This only works if the post ID is valid.\n\nContinue?')) {
        return;
      }
      
      try {
        showNotification('🔧 Fixing URLs...', 'info');
        console.log('[App] Fix URLs button clicked');
        
        const result = await window.electronAPI.getPosts();
        if (!result.success || !result.posts) {
          showNotification('❌ Failed to load posts', 'error');
          return;
        }
        
        let fixed = 0;
        const posts = result.posts;
        
        for (const post of posts) {
          // Fix posts with undefined or null URLs but valid IDs
          if ((!post.url || post.url.includes('undefined')) && post.id && post.id !== 'undefined') {
            post.url = `https://www.moltbook.com/post/${post.id}`;
            fixed++;
            console.log('[App] Fixed URL for post:', post.id, '→', post.url);
          }
        }
        
        if (fixed > 0) {
          // Save updated posts directly to store
          const saveResult = await window.electronAPI.savePosts(posts);
          if (saveResult.success) {
            showNotification(`✅ Fixed ${fixed} post URL(s)!`, 'success');
            
            // CRITICAL: Force reload posts to show updated URLs
            console.log('[App] Reloading posts to show updated URLs...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for save to complete
            await loadPosts();
            console.log('[App] ✅ Posts reloaded with updated URLs');
          } else {
            showNotification(`⚠️ Fixed ${fixed} URLs but failed to save: ${saveResult.error}`, 'warning');
          }
        } else {
          showNotification('ℹ️ No URLs needed fixing', 'info');
        }
      } catch (error) {
        console.error('[App] Error fixing URLs:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
      }
    });
  }

  // Clean Queue button - removes orphaned queue items
  const cleanQueueBtn = document.getElementById('cleanQueueBtn');
  if (cleanQueueBtn) {
    cleanQueueBtn.addEventListener('click', async () => {
      try {
        showNotification('🧹 Cleaning queue...', 'info');
        console.log('[App] Clean Queue button clicked');
        
        const result = await window.electronAPI.cleanQueue();
        
        if (result.success) {
          const removed = result.removed || 0;
          if (removed > 0) {
            showNotification(`✅ Removed ${removed} orphaned queue item(s)!`, 'success');
            
            // Reload drafts and update queue status
            await loadDrafts();
            await updatePostQueueStatus();
          } else {
            showNotification('✅ Queue is clean - no orphaned items found', 'success');
          }
        } else {
          showNotification(`❌ Failed to clean queue: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('[App] Error cleaning queue:', error);
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
    
    // Refresh drafts if on drafts page (to show draft was deleted)
    if (document.getElementById('drafts').classList.contains('active')) {
      loadDrafts();
    }
    
    // Refresh dashboard to show recent activity
    if (document.getElementById('dashboard').classList.contains('active')) {
      loadDashboard();
    }
  });
  
  // Listen for duplicate post detection
  window.electronAPI.onQueueDuplicateDetected((data) => {
    console.log('[App] ⚠️ Duplicate post detected:', data.title);
    showNotification(
      `⚠️ Duplicate Detected: "${data.title}" was already published. Removed from queue.`,
      'warning'
    );
    
    // Refresh drafts and posts
    if (document.getElementById('drafts').classList.contains('active')) {
      loadDrafts();
    }
    if (document.getElementById('posts').classList.contains('active')) {
      loadPosts();
    }
  });
  
  // Listen for rate limit updates (after manual post)
  window.electronAPI.onRateLimitUpdated((data) => {
    console.log('[App] Rate limit updated:', data);
    if (data.nextAllowedTime) {
      showRateLimitCountdown(data.nextAllowedTime);
    }
  });

  // Listen for mentions found
  window.electronAPI.onMentionsFound((data) => {
    console.log('[App] 🔔 Mentions found:', data);
    showNotification(
      `🔔 ${data.count} new mention${data.count > 1 ? 's' : ''}! Agent will reply with priority.`,
      'info'
    );
    
    // Update dashboard if visible
    if (document.getElementById('dashboard').classList.contains('active')) {
      loadDashboard();
    }
  });

  // Listen for DM activity
  window.electronAPI.onDMActivity((data) => {
    console.log('[App] 💬 DM activity:', data);
    if (data.has_activity) {
      showNotification(
        `💬 ${data.summary}`,
        'info'
      );
      
      // Update dashboard if visible
      if (document.getElementById('dashboard').classList.contains('active')) {
        loadDashboard();
      }
    }
  });
  
  // Listen for agent status updates (AI replies)
  window.electronAPI.onAgentStatusUpdate((data) => {
    console.log('[App] 🤖 Agent status update:', data);
    
    // Update "REPLIES TODAY" counter in Agent Status section
    const repliesTodayStatus = document.getElementById('repliesTodayStatus');
    if (repliesTodayStatus && data.repliesToday !== undefined) {
      repliesTodayStatus.textContent = data.repliesToday;
    }
    
    // Update last check time
    const lastCheckStatus = document.getElementById('lastCheckStatus');
    if (lastCheckStatus && data.lastCheck) {
      const checkTime = new Date(data.lastCheck);
      lastCheckStatus.textContent = checkTime.toLocaleTimeString();
    }
    
    // Show notification for new reply
    if (data.lastReply) {
      showNotification(
        `🤖 AI replied to: ${data.lastReply.postTitle.substring(0, 50)}...`,
        'success'
      );
    }
    
    // Refresh AI Activity page if visible
    if (document.getElementById('ai-activity')?.classList.contains('active')) {
      loadAIActivity();
    }
  });
  
  // Skills Page - Advanced Configuration Buttons
  const saveAdvancedConfigBtn = document.getElementById('saveAdvancedConfigBtn');
  if (saveAdvancedConfigBtn) {
    saveAdvancedConfigBtn.addEventListener('click', async () => {
      try {
        const apiTimeout = parseInt(document.getElementById('apiTimeout')?.value) || 30;
        const retryAttempts = parseInt(document.getElementById('retryAttempts')?.value) || 3;
        const logLevel = document.getElementById('logLevel')?.value || 'info';
        const enableMetrics = document.getElementById('enableMetrics')?.checked || false;
        
        const result = await window.electronAPI.saveConfig({
          apiTimeout,
          retryAttempts,
          logLevel,
          enableMetrics
        });
        
        if (result.success) {
          showNotification('✅ Configuration saved successfully!', 'success');
        } else {
          showNotification('❌ Failed to save configuration', 'error');
        }
      } catch (error) {
        console.error('[Skills] Save config error:', error);
        showNotification('❌ Error: ' + error.message, 'error');
      }
    });
  }
  
  const exportConfigBtn = document.getElementById('exportConfigBtn');
  if (exportConfigBtn) {
    exportConfigBtn.addEventListener('click', async () => {
      try {
        const config = await window.electronAPI.getConfig();
        const configJson = JSON.stringify(config, null, 2);
        
        // Create download link
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watam-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('✅ Configuration exported!', 'success');
      } catch (error) {
        console.error('[Skills] Export config error:', error);
        showNotification('❌ Error: ' + error.message, 'error');
      }
    });
  }
  
  const importConfigBtn = document.getElementById('importConfigBtn');
  if (importConfigBtn) {
    importConfigBtn.addEventListener('click', () => {
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        try {
          const file = e.target.files[0];
          if (!file) return;
          
          const text = await file.text();
          const config = JSON.parse(text);
          
          // Save imported config
          const result = await window.electronAPI.saveConfig(config);
          
          if (result.success) {
            showNotification('✅ Configuration imported! Please reload the page.', 'success');
          } else {
            showNotification('❌ Failed to import configuration', 'error');
          }
        } catch (error) {
          console.error('[Skills] Import config error:', error);
          showNotification('❌ Error: ' + error.message, 'error');
        }
      };
      
      input.click();
    });
  }
  
  // My Submolts page buttons
  const refreshSubmoltsBtn = document.getElementById('refreshSubmoltsBtn');
  if (refreshSubmoltsBtn) {
    refreshSubmoltsBtn.addEventListener('click', async () => {
      await loadMySubmolts();
    });
  }
  
  const createNewSubmoltBtn = document.getElementById('createNewSubmoltBtn');
  if (createNewSubmoltBtn) {
    createNewSubmoltBtn.addEventListener('click', () => {
      showCreateSubmoltDialog();
    });
  }
  
  // Submolt search functionality
  const submoltSearchInput = document.getElementById('submoltSearchInput');
  const clearSubmoltSearchBtn = document.getElementById('clearSubmoltSearchBtn');
  
  if (submoltSearchInput) {
    submoltSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      filterSubmolts(query);
      
      // Show/hide clear button
      if (clearSubmoltSearchBtn) {
        clearSubmoltSearchBtn.style.display = query ? 'block' : 'none';
      }
    });
  }
  
  if (clearSubmoltSearchBtn) {
    clearSubmoltSearchBtn.addEventListener('click', () => {
      if (submoltSearchInput) {
        submoltSearchInput.value = '';
        filterSubmolts('');
        clearSubmoltSearchBtn.style.display = 'none';
      }
    });
  }
  
  // AI Activity page buttons
  const refreshAIActivityBtn = document.getElementById('refreshAIActivityBtn');
  if (refreshAIActivityBtn) {
    refreshAIActivityBtn.addEventListener('click', async () => {
      await loadAIActivity();
    });
  }
  
  const clearAIHistoryBtn = document.getElementById('clearAIHistoryBtn');
  if (clearAIHistoryBtn) {
    clearAIHistoryBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all AI activity history? This cannot be undone.')) {
        const result = await window.electronAPI.clearAIReplies();
        if (result.success) {
          showNotification('✅ AI activity history cleared', 'success');
          await loadAIActivity();
        } else {
          showNotification('❌ Failed to clear history', 'error');
        }
      }
    });
  }
}

// My Submolts Management
async function loadMySubmolts() {
  try {
    console.log('[MySubmolts] Loading all submolts...');
    
    const container = document.getElementById('mySubmoltsContainer');
    if (!container) {
      console.error('[MySubmolts] Container not found');
      return;
    }
    
    container.innerHTML = '<p class="loading">Loading submolts...</p>';
    
    // Get all submolts
    const result = await window.electronAPI.getSubmolts();
    
    if (!result.success || !result.submolts) {
      container.innerHTML = '<p class="empty-state error">❌ Failed to load submolts</p>';
      return;
    }
    
    const allSubmolts = result.submolts;
    console.log('[MySubmolts] Loaded', allSubmolts.length, 'submolts');
    
    // Get subscription states from localStorage (overrides API data)
    const subscriptionStates = JSON.parse(localStorage.getItem('submoltSubscriptions') || '{}');
    console.log('[MySubmolts] Subscription states from localStorage:', subscriptionStates);
    
    // Get monitored submolts from AI config
    const config = await window.electronAPI.getConfig();
    const monitoredSubmolts = config.aiAgent?.monitorSubmolts 
      ? config.aiAgent.monitorSubmolts.split(',').map(s => s.trim()).filter(s => s)
      : [];
    
    console.log('[MySubmolts] Monitored submolts from config:', monitoredSubmolts);
    
    if (allSubmolts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 48px; margin-bottom: 16px;">🦞</div>
          <h3>No Submolts Available</h3>
          <p>No submolts found on Moltbook.</p>
          <button class="btn btn-primary" onclick="showCreateSubmoltDialog()" style="margin-top: 16px;">
            ➕ Create Your First Submolt
          </button>
        </div>
      `;
      return;
    }
    
    // Override API subscription data with localStorage data
    allSubmolts.forEach(submolt => {
      if (subscriptionStates.hasOwnProperty(submolt.name)) {
        submolt.is_subscribed = subscriptionStates[submolt.name];
        console.log('[MySubmolts] Override subscription for', submolt.name, ':', submolt.is_subscribed);
      }
    });
    
    // Sort: subscribed first, then by subscriber count
    allSubmolts.sort((a, b) => {
      if (a.is_subscribed && !b.is_subscribed) return -1;
      if (!a.is_subscribed && b.is_subscribed) return 1;
      return (b.subscriber_count || 0) - (a.subscriber_count || 0);
    });
    
    // Render submolt cards
    container.innerHTML = allSubmolts.map(submolt => {
      const isMonitored = monitoredSubmolts.includes(submolt.name);
      
      return `
      <div class="post-card" style="margin-bottom: 16px;">
        <div class="post-header">
          <h4 style="margin: 0;">m/${submolt.name}</h4>
          <div style="display: flex; gap: 8px;">
            ${submolt.your_role === 'owner' ? '<span class="post-badge owner">👑 Owner</span>' : ''}
            ${submolt.your_role === 'moderator' ? '<span class="post-badge moderator">🛡️ Moderator</span>' : ''}
            ${submolt.is_subscribed ? '<span class="post-badge success">✓ Subscribed</span>' : ''}
            ${isMonitored ? '<span class="post-badge info">🤖 Monitored</span>' : ''}
          </div>
        </div>
        
        <div class="post-body" style="margin: 12px 0;">
          <div style="font-weight: 600; margin-bottom: 8px;">${submolt.display_name || submolt.name}</div>
          <div style="color: var(--text-secondary); font-size: 14px;">
            ${submolt.description || 'No description'}
          </div>
        </div>
        
        <div class="post-stats">
          <span>👥 ${submolt.subscriber_count || 0} subscribers</span>
          <span>📝 ${submolt.post_count || 0} posts</span>
        </div>
        
        <div class="post-actions">
          <button class="btn btn-sm ${submolt.is_subscribed ? 'btn-secondary' : 'btn-success'} subscribe-submolt-btn" 
                  data-submolt="${submolt.name}" 
                  data-subscribed="${submolt.is_subscribed || false}">
            ${submolt.is_subscribed ? '✓ Subscribed' : '+ Subscribe'}
          </button>
          ${submolt.your_role === 'owner' || submolt.your_role === 'moderator' ? `
          <button class="btn btn-sm btn-primary" onclick="manageSubmoltFromList('${submolt.name}')">
            ⚙️ Manage
          </button>
          ` : ''}
          <button class="btn btn-sm btn-secondary" onclick="viewSubmoltOnMoltbook('${submolt.name}')">
            🔗 View
          </button>
        </div>
      </div>
    `}).join('');
    
    // Setup subscribe buttons
    setupSubmoltSubscribeButtons();
    
  } catch (error) {
    console.error('[MySubmolts] Failed to load:', error);
    const container = document.getElementById('mySubmoltsContainer');
    if (container) {
      container.innerHTML = '<p class="empty-state error">❌ Error loading submolts</p>';
    }
  }
}

// Manage submolt from list
window.manageSubmoltFromList = async function(submoltName) {
  await showManageSubmoltDialog(submoltName);
};

// View submolt on Moltbook
window.viewSubmoltOnMoltbook = function(submoltName) {
  const url = `https://www.moltbook.com/m/${submoltName}`;
  window.electronAPI.openExternal(url);
};

// Filter submolts in Browse Submolts page
function filterSubmolts(query) {
  const container = document.getElementById('mySubmoltsContainer');
  const statsDiv = document.getElementById('submoltSearchStats');
  
  if (!container) return;
  
  const cards = container.querySelectorAll('.post-card');
  let visibleCount = 0;
  let totalCount = cards.length;
  
  if (!query) {
    // Show all cards
    cards.forEach(card => {
      card.style.display = '';
    });
    if (statsDiv) statsDiv.style.display = 'none';
    return;
  }
  
  const searchTerm = query.toLowerCase();
  
  cards.forEach(card => {
    // Get submolt name from header
    const nameElement = card.querySelector('.post-header h4');
    const name = nameElement ? nameElement.textContent.toLowerCase() : '';
    
    // Get description from body
    const descElement = card.querySelector('.post-body > div:last-child');
    const description = descElement ? descElement.textContent.toLowerCase() : '';
    
    // Check if matches
    const matches = name.includes(searchTerm) || description.includes(searchTerm);
    
    if (matches) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });
  
  // Show search stats
  if (statsDiv) {
    if (visibleCount === 0) {
      statsDiv.innerHTML = `❌ No submolts found matching "${query}"`;
      statsDiv.style.color = 'var(--error)';
    } else if (visibleCount === totalCount) {
      statsDiv.style.display = 'none';
    } else {
      statsDiv.innerHTML = `🔍 Found ${visibleCount} of ${totalCount} submolts`;
      statsDiv.style.color = 'var(--text-secondary)';
    }
    statsDiv.style.display = 'block';
  }
  
  console.log('[Search] Query:', query, '| Visible:', visibleCount, '/', totalCount);
}

// Setup subscribe buttons for submolts
function setupSubmoltSubscribeButtons() {
  document.querySelectorAll('.subscribe-submolt-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const submoltName = this.dataset.submolt;
      const isSubscribed = this.dataset.subscribed === 'true';
      
      this.disabled = true;
      this.textContent = isSubscribed ? '⏳ Unsubscribing...' : '⏳ Subscribing...';
      
      try {
        const result = isSubscribed
          ? await window.electronAPI.unsubscribeSubmolt({ submoltName })
          : await window.electronAPI.subscribeSubmolt({ submoltName });
        
        if (result.success) {
          const newState = !isSubscribed;
          
          // Save subscription state to localStorage
          const subscriptionStates = JSON.parse(localStorage.getItem('submoltSubscriptions') || '{}');
          subscriptionStates[submoltName] = newState;
          localStorage.setItem('submoltSubscriptions', JSON.stringify(subscriptionStates));
          console.log('[Subscribe] Saved state to localStorage:', submoltName, '=', newState);
          
          // Update button
          this.dataset.subscribed = newState;
          this.textContent = newState ? '✓ Subscribed' : '+ Subscribe';
          this.classList.toggle('btn-success', !newState);
          this.classList.toggle('btn-secondary', newState);
          
          // Update badge in card header
          const card = this.closest('.post-card');
          const header = card.querySelector('.post-header > div');
          const subscribedBadge = header.querySelector('.post-badge.success');
          
          if (newState && !subscribedBadge) {
            // Add subscribed badge
            const badge = document.createElement('span');
            badge.className = 'post-badge success';
            badge.textContent = '✓ Subscribed';
            header.appendChild(badge);
          } else if (!newState && subscribedBadge) {
            // Remove subscribed badge
            subscribedBadge.remove();
          }
          
          // Sync with AI Agent monitored submolts
          await syncMonitoredSubmolts(submoltName, newState);
          
          showNotification(newState ? '✅ Subscribed!' : '✅ Unsubscribed', 'success');
        } else {
          showNotification(`❌ ${result.error}`, 'error');
          this.textContent = isSubscribed ? '✓ Subscribed' : '+ Subscribe';
        }
      } catch (error) {
        console.error('[Subscribe] Error:', error);
        showNotification('❌ Operation failed', 'error');
        this.textContent = isSubscribed ? '✓ Subscribed' : '+ Subscribe';
      } finally {
        this.disabled = false;
      }
    });
  });
}

// Sync monitored submolts with subscriptions
async function syncMonitoredSubmolts(submoltName, isSubscribed) {
  try {
    const config = await window.electronAPI.getConfig();
    const currentMonitored = config.aiAgent?.monitorSubmolts 
      ? config.aiAgent.monitorSubmolts.split(',').map(s => s.trim()).filter(s => s)
      : [];
    
    let updatedMonitored = [...currentMonitored];
    
    if (isSubscribed && !currentMonitored.includes(submoltName)) {
      // Add to monitored list
      updatedMonitored.push(submoltName);
      console.log('[Sync] Added', submoltName, 'to monitored submolts');
    } else if (!isSubscribed && currentMonitored.includes(submoltName)) {
      // Remove from monitored list
      updatedMonitored = updatedMonitored.filter(s => s !== submoltName);
      console.log('[Sync] Removed', submoltName, 'from monitored submolts');
    }
    
    // Save updated config
    const newConfig = {
      ...config,
      aiAgent: {
        ...config.aiAgent,
        monitorSubmolts: updatedMonitored.join(', ')
      }
    };
    
    await window.electronAPI.saveConfig(newConfig);
    console.log('[Sync] ✅ Monitored submolts synced:', updatedMonitored.join(', '));
    
    // Update monitored badge in UI
    const card = document.querySelector(`[data-submolt="${submoltName}"]`).closest('.post-card');
    const header = card.querySelector('.post-header > div');
    const monitoredBadge = header.querySelector('.post-badge.info');
    
    if (isSubscribed && !monitoredBadge) {
      const badge = document.createElement('span');
      badge.className = 'post-badge info';
      badge.textContent = '🤖 Monitored';
      header.appendChild(badge);
    } else if (!isSubscribed && monitoredBadge) {
      monitoredBadge.remove();
    }
  } catch (error) {
    console.error('[Sync] Failed to sync monitored submolts:', error);
  }
}

// AI Activity Management
async function loadAIActivity() {
  try {
    console.log('[AIActivity] Loading AI activity...');
    
    const container = document.getElementById('aiActivityContainer');
    if (!container) {
      console.error('[AIActivity] Container not found');
      return;
    }
    
    container.innerHTML = '<p class="loading">Loading AI activity...</p>';
    
    // Get AI replies from backend
    const result = await window.electronAPI.getAIReplies();
    
    if (!result.success) {
      container.innerHTML = '<p class="empty-state error">❌ Failed to load AI activity</p>';
      return;
    }
    
    const { replies, repliesToday, repliesThisHour } = result;
    
    // Update stats
    document.getElementById('aiRepliesToday').textContent = repliesToday || 0;
    document.getElementById('aiRepliesThisHour').textContent = repliesThisHour || 0;
    document.getElementById('aiTotalReplies').textContent = replies.length || 0;
    
    console.log('[AIActivity] Loaded', replies.length, 'AI replies');
    
    if (!replies || replies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 48px; margin-bottom: 16px;">🤖💬</div>
          <h3>No AI Activity Yet</h3>
          <p>Your AI agent hasn't posted any automatic replies yet.</p>
          <p style="color: var(--text-secondary); font-size: 14px; margin-top: 8px;">
            Make sure your AI agent is running and configured properly.
          </p>
        </div>
      `;
      return;
    }
    
    // Get vote states from localStorage
    const voteStates = JSON.parse(localStorage.getItem('postVoteStates') || '{}');
    
    // Render AI reply cards
    container.innerHTML = replies.map(reply => {
      const timestamp = new Date(reply.timestamp);
      const timeAgo = getTimeAgo(timestamp);
      
      // Prepare post body preview (first 150 chars)
      const postBody = reply.postBody || '';
      const postPreview = postBody.length > 150 ? postBody.substring(0, 150) + '...' : postBody;
      
      // Prepare reply preview (first 200 chars)
      const replyPreview = reply.reply.length > 200 ? reply.reply.substring(0, 200) + '...' : reply.reply;
      
      // Check vote state
      const voteState = voteStates[reply.postId] || null; // 'upvote', 'downvote', or null
      
      return `
        <div class="post-card ai-reply-card" data-reply-id="${reply.id}" data-post-id="${reply.postId}">
          <div class="post-header">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 4px 0;" data-original="${escapeHtml(reply.postTitle)}">
                <a href="#" onclick="window.electronAPI.openExternal('https://www.moltbook.com/post/${reply.postId}'); return false;" 
                   style="color: var(--accent); text-decoration: none;">
                  ${escapeHtml(reply.postTitle)}
                </a>
              </h4>
              <div style="font-size: 12px; color: var(--text-secondary);">
                Replied to @${reply.postAuthor} in m/${reply.submolt || 'general'}
              </div>
            </div>
            <span class="post-badge success">✅ Posted</span>
          </div>
          
          ${postBody ? `
          <div class="ai-context-section">
            <div class="ai-context-label">📄 Original Post:</div>
            <div class="ai-context-text" data-original="${escapeHtml(postBody)}" data-full="${escapeHtml(postBody).replace(/\n/g, '\\n')}">
              ${escapeHtml(postPreview)}
            </div>
            ${postBody.length > 150 ? `
            <button class="btn btn-xs btn-link expand-context-btn" data-reply-id="${reply.id}">
              📖 Read More
            </button>
            ` : ''}
          </div>
          ` : ''}
          
          <div class="ai-reply-section">
            <div class="ai-reply-label">🤖 AI Reply:</div>
            <div class="ai-reply-text" data-original="${escapeHtml(reply.reply)}" data-full="${escapeHtml(reply.reply).replace(/\n/g, '\\n')}">
              ${escapeHtml(replyPreview)}
            </div>
            ${reply.reply.length > 200 ? `
            <button class="btn btn-xs btn-link expand-reply-btn" data-reply-id="${reply.id}">
              📖 Read More
            </button>
            ` : ''}
          </div>
          
          <div class="post-stats">
            <span>🕐 ${timeAgo}</span>
            <span>📏 ${reply.reply.length} chars</span>
            ${postBody ? `<span>📄 Post: ${postBody.length} chars</span>` : ''}
          </div>
          
          <div class="post-actions">
            <button class="btn btn-sm ${voteState === 'upvote' ? 'btn-primary voted' : 'btn-success'} upvote-ai-post-btn" 
                    data-post-id="${reply.postId}"
                    ${voteState === 'upvote' ? 'disabled' : ''}>
              ${voteState === 'upvote' ? '✓ Upvoted' : '👍 Upvote'}
            </button>
            <button class="btn btn-sm ${voteState === 'downvote' ? 'btn-danger voted' : 'btn-secondary'} downvote-ai-post-btn" 
                    data-post-id="${reply.postId}"
                    ${voteState === 'downvote' ? 'disabled' : ''}>
              ${voteState === 'downvote' ? '✓ Downvoted' : '👎 Downvote'}
            </button>
            <button class="btn btn-sm btn-secondary translate-ai-reply-btn" data-reply-id="${reply.id}">
              🌐 Çevir
            </button>
            <button class="btn btn-sm btn-primary" onclick="window.electronAPI.openExternal('https://www.moltbook.com/post/${reply.postId}'); return false;">
              🔗 View Post
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Setup translate buttons
    setupAIReplyTranslateButtons();
    
    // Setup expand/collapse buttons
    setupAIReplyExpandButtons();
    
    // Setup voting buttons
    setupAIReplyVotingButtons();
    
  } catch (error) {
    console.error('[AIActivity] Failed to load:', error);
    const container = document.getElementById('aiActivityContainer');
    if (container) {
      container.innerHTML = '<p class="empty-state error">❌ Error loading AI activity</p>';
    }
  }
}

// Setup translate buttons for AI replies
function setupAIReplyTranslateButtons() {
  const translateButtons = document.querySelectorAll('.translate-ai-reply-btn');
  
  translateButtons.forEach(btn => {
    btn.addEventListener('click', async function() {
      const replyId = this.dataset.replyId;
      
      // Use LanguageManager for translation (same as Posts page)
      if (window.languageManager) {
        await window.languageManager.translateAIReply(replyId);
      } else {
        showNotification('❌ Translation system not available', 'error');
      }
    });
  });
}

// Setup expand/collapse buttons for AI replies
function setupAIReplyExpandButtons() {
  // Expand context (original post)
  document.querySelectorAll('.expand-context-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const replyId = this.dataset.replyId;
      const card = document.querySelector(`[data-reply-id="${replyId}"]`);
      const contextText = card.querySelector('.ai-context-text');
      
      if (contextText.classList.contains('expanded')) {
        // Collapse
        const preview = contextText.getAttribute('data-original').substring(0, 150) + '...';
        contextText.textContent = preview;
        contextText.classList.remove('expanded');
        this.textContent = '📖 Read More';
      } else {
        // Expand
        const fullText = contextText.getAttribute('data-full').replace(/\\n/g, '\n');
        contextText.textContent = fullText;
        contextText.classList.add('expanded');
        this.textContent = '📕 Close';
      }
    });
  });
  
  // Expand reply
  document.querySelectorAll('.expand-reply-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const replyId = this.dataset.replyId;
      const card = document.querySelector(`[data-reply-id="${replyId}"]`);
      const replyText = card.querySelector('.ai-reply-text');
      
      if (replyText.classList.contains('expanded')) {
        // Collapse
        const preview = replyText.getAttribute('data-original').substring(0, 200) + '...';
        replyText.textContent = preview;
        replyText.classList.remove('expanded');
        this.textContent = '📖 Read More';
      } else {
        // Expand
        const fullText = replyText.getAttribute('data-full').replace(/\\n/g, '\n');
        replyText.textContent = fullText;
        replyText.classList.add('expanded');
        this.textContent = '📕 Close';
      }
    });
  });
}

// Setup voting buttons for AI replies
function setupAIReplyVotingButtons() {
  // Upvote post
  document.querySelectorAll('.upvote-ai-post-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const postId = this.dataset.postId;
      this.disabled = true;
      this.textContent = '⏳ Upvoting...';
      
      try {
        const result = await window.electronAPI.upvotePost({ postId });
        
        if (result.success) {
          // Save vote state to localStorage
          const voteStates = JSON.parse(localStorage.getItem('postVoteStates') || '{}');
          voteStates[postId] = 'upvote';
          localStorage.setItem('postVoteStates', JSON.stringify(voteStates));
          
          showNotification('✅ Upvoted!', 'success');
          this.textContent = '✓ Upvoted';
          this.classList.add('voted');
          this.classList.remove('btn-success');
          this.classList.add('btn-primary');
          
          // Disable downvote button if exists
          const card = this.closest('.post-card');
          const downvoteBtn = card.querySelector('.downvote-ai-post-btn');
          if (downvoteBtn) {
            downvoteBtn.disabled = false;
            downvoteBtn.textContent = '👎 Downvote';
            downvoteBtn.classList.remove('voted', 'btn-danger');
            downvoteBtn.classList.add('btn-secondary');
          }
        } else {
          showNotification(`❌ ${result.error}`, 'error');
          this.textContent = '👍 Upvote';
          this.disabled = false;
        }
      } catch (error) {
        console.error('[Vote] Error:', error);
        showNotification('❌ Upvote failed', 'error');
        this.textContent = '👍 Upvote';
        this.disabled = false;
      }
    });
  });
  
  // Downvote post
  document.querySelectorAll('.downvote-ai-post-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const postId = this.dataset.postId;
      this.disabled = true;
      this.textContent = '⏳ Downvoting...';
      
      try {
        const result = await window.electronAPI.downvotePost({ postId });
        
        if (result.success) {
          // Save vote state to localStorage
          const voteStates = JSON.parse(localStorage.getItem('postVoteStates') || '{}');
          voteStates[postId] = 'downvote';
          localStorage.setItem('postVoteStates', JSON.stringify(voteStates));
          
          showNotification('✅ Downvoted', 'success');
          this.textContent = '✓ Downvoted';
          this.classList.add('voted');
          this.classList.remove('btn-secondary');
          this.classList.add('btn-danger');
          
          // Disable upvote button if exists
          const card = this.closest('.post-card');
          const upvoteBtn = card.querySelector('.upvote-ai-post-btn');
          if (upvoteBtn) {
            upvoteBtn.disabled = false;
            upvoteBtn.textContent = '👍 Upvote';
            upvoteBtn.classList.remove('voted', 'btn-primary');
            upvoteBtn.classList.add('btn-success');
          }
        } else {
          showNotification(`❌ ${result.error}`, 'error');
          this.textContent = '👎 Downvote';
          this.disabled = false;
        }
      } catch (error) {
        console.error('[Vote] Error:', error);
        showNotification('❌ Downvote failed', 'error');
        this.textContent = '👎 Downvote';
        this.disabled = false;
      }
    });
  });
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to get time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Helper functions
function showDraftPreview(draft) {
  console.log('[showDraftPreview] 🔍 DEBUG - Received draft:', draft);
  console.log('[showDraftPreview] - submolt:', draft.submolt);
  console.log('[showDraftPreview] - title:', draft.title);
  console.log('[showDraftPreview] - body length:', draft.body?.length);
  
  document.getElementById('previewSubmolt').textContent = draft.submolt;
  document.getElementById('previewTitle').textContent = draft.title;
  document.getElementById('previewBody').textContent = draft.body;
  
  console.log('[showDraftPreview] ✅ Preview elements updated');
  console.log('[showDraftPreview] - previewSubmolt now contains:', document.getElementById('previewSubmolt').textContent);
  
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
let submoltsCache = null;
let submoltsLastFetch = 0;
const SUBMOLTS_CACHE_DURATION = 300000; // 5 minutes cache

async function loadSubmolts() {
  try {
    // Use cache if available and fresh
    const now = Date.now();
    if (submoltsCache && (now - submoltsLastFetch) < SUBMOLTS_CACHE_DURATION) {
      console.log('[Submolts] Using cached submolts');
      return;
    }
    
    console.log('[Submolts] Loading submolts...');
    const result = await window.electronAPI.getSubmolts();
    
    console.log('[Submolts] API result:', result);
    
    if (result.success && result.submolts) {
      // Check if submolts is an array
      if (Array.isArray(result.submolts)) {
        // Get current agent info to check owned submolts
        const agentResult = await window.electronAPI.getAgent();
        const currentAgentName = agentResult?.agent?.name;
        
        // FILTER: Show submolts with 5+ subscribers OR owned by current agent
        const activeSubmolts = result.submolts.filter(s => {
          // Always show if user is owner or moderator
          if (s.your_role === 'owner' || s.your_role === 'moderator') {
            console.log('[Submolts] Including owned/moderated submolt:', s.name);
            return true;
          }
          // Otherwise require 5+ subscribers
          return s.subscriber_count >= 5;
        });
        
        // Add essential submolts if missing
        const essentialSubmolts = [
          { name: 'general', display_name: 'General', count: 150 },
          { name: 'ai', display_name: 'AI', count: 120 },
          { name: 'crypto', display_name: 'Crypto', count: 100 },
          { name: 'technology', display_name: 'Technology', count: 110 },
          { name: 'art', display_name: 'Art', count: 80 },
          { name: 'music', display_name: 'Music', count: 75 },
          { name: 'finance', display_name: 'Finance', count: 60 },
          { name: 'gaming', display_name: 'Gaming', count: 55 }
        ];
        
        essentialSubmolts.forEach(essential => {
          if (!activeSubmolts.find(s => s.name === essential.name)) {
            console.log('[Submolts] Adding missing essential submolt:', essential.name);
            activeSubmolts.push({
              name: essential.name,
              display_name: essential.display_name,
              subscriber_count: essential.count
            });
          }
        });
        
        submoltsCache = activeSubmolts;
        submoltsLastFetch = Date.now(); // Update cache timestamp
        console.log('[Submolts] ✅ Loaded', submoltsCache.length, 'active submolts (5+ subscribers or owned)');
        populateSubmoltDropdown();
      } else {
        console.error('[Submolts] ❌ submolts is not an array:', typeof result.submolts);
        console.log('[Submolts] Using default submolts');
        useDefaultSubmolts();
      }
    } else {
      console.warn('[Submolts] Failed to load submolts, using defaults');
      useDefaultSubmolts();
    }
  } catch (error) {
    console.error('[Submolts] Error loading submolts:', error);
    useDefaultSubmolts();
  }
}

function useDefaultSubmolts() {
  // Use REAL popular submolts from Moltbook (based on actual usage)
  submoltsCache = [
    // Most Popular (100+ subscribers)
    { name: 'general', display_name: 'General', subscriber_count: 150 },
    { name: 'ai', display_name: 'AI', subscriber_count: 120 },
    { name: 'technology', display_name: 'Technology', subscriber_count: 110 },
    { name: 'crypto', display_name: 'Crypto', subscriber_count: 100 },
    
    // Very Popular (70-100 subscribers)
    { name: 'art', display_name: 'Art', subscriber_count: 85 },
    { name: 'music', display_name: 'Music', subscriber_count: 80 },
    { name: 'programming', display_name: 'Programming', subscriber_count: 75 },
    { name: 'finance', display_name: 'Finance', subscriber_count: 70 },
    
    // Popular (40-70 subscribers)
    { name: 'gaming', display_name: 'Gaming', subscriber_count: 65 },
    { name: 'science', display_name: 'Science', subscriber_count: 60 },
    { name: 'philosophy', display_name: 'Philosophy', subscriber_count: 55 },
    { name: 'business', display_name: 'Business', subscriber_count: 50 },
    { name: 'design', display_name: 'Design', subscriber_count: 45 },
    { name: 'photography', display_name: 'Photography', subscriber_count: 40 },
    
    // Growing (20-40 subscribers)
    { name: 'food', display_name: 'Food', subscriber_count: 35 },
    { name: 'travel', display_name: 'Travel', subscriber_count: 32 },
    { name: 'books', display_name: 'Books', subscriber_count: 30 },
    { name: 'movies', display_name: 'Movies', subscriber_count: 28 },
    { name: 'fitness', display_name: 'Fitness', subscriber_count: 25 },
    { name: 'health', display_name: 'Health', subscriber_count: 22 },
    { name: 'education', display_name: 'Education', subscriber_count: 20 }
  ];
  console.log('[Submolts] ✅ Using', submoltsCache.length, 'curated popular submolts');
  populateSubmoltDropdown();
}

function populateSubmoltDropdown() {
  const select = document.getElementById('submolt');
  if (!select || !submoltsCache || !Array.isArray(submoltsCache)) {
    console.warn('[Submolts] Cannot populate dropdown - invalid data');
    return;
  }
  
  // Clear existing options
  select.innerHTML = '';
  
  // Sort submolts by subscriber count
  const veryPopular = submoltsCache
    .filter(s => s.subscriber_count >= 100)
    .sort((a, b) => b.subscriber_count - a.subscriber_count);
  
  const popular = submoltsCache
    .filter(s => s.subscriber_count >= 40 && s.subscriber_count < 100)
    .sort((a, b) => b.subscriber_count - a.subscriber_count);
  
  const growing = submoltsCache
    .filter(s => s.subscriber_count < 40)
    .sort((a, b) => b.subscriber_count - a.subscriber_count);
  
  // Add very popular group (100+)
  if (veryPopular.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = '🔥 Most Popular';
    veryPopular.forEach(s => {
      const option = document.createElement('option');
      option.value = s.name;
      option.textContent = `${s.display_name} (${s.subscriber_count}+ members)`;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  }
  
  // Add popular group (40-99)
  if (popular.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = '⭐ Popular';
    popular.forEach(s => {
      const option = document.createElement('option');
      option.value = s.name;
      option.textContent = `${s.display_name} (${s.subscriber_count} members)`;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  }
  
  // Add growing group (<40)
  if (growing.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = '📚 More Submolts';
    growing.forEach(s => {
      const option = document.createElement('option');
      option.value = s.name;
      option.textContent = `${s.display_name} (${s.subscriber_count})`;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  }
  
  console.log('[Submolts] ✅ Populated dropdown with', select.options.length, 'options');
  console.log('[Submolts] Categories: 🔥', veryPopular.length, '⭐', popular.length, '📚', growing.length);
  
  // Set default selection to first option (usually "general")
  if (select.options.length > 0) {
    select.selectedIndex = 0;
    console.log('[Submolts] ✅ Default submolt selected:', select.value);
  }
}

function filterSubmoltDropdown(searchTerm) {
  const select = document.getElementById('submolt');
  if (!select) return;
  
  const options = select.querySelectorAll('option');
  const optgroups = select.querySelectorAll('optgroup');
  
  if (!searchTerm) {
    // Show all
    options.forEach(opt => opt.style.display = '');
    optgroups.forEach(grp => grp.style.display = '');
    return;
  }
  
  const term = searchTerm.toLowerCase();
  
  options.forEach(opt => {
    const text = opt.textContent.toLowerCase();
    const matches = text.includes(term);
    opt.style.display = matches ? '' : 'none';
  });
  
  // Hide empty optgroups
  optgroups.forEach(grp => {
    const visibleOptions = Array.from(grp.querySelectorAll('option'))
      .filter(opt => opt.style.display !== 'none');
    grp.style.display = visibleOptions.length > 0 ? '' : 'none';
  });
}

// Create Submolt Dialog
function showCreateSubmoltDialog() {
  // Create modal dialog
  const dialog = document.createElement('div');
  dialog.className = 'modal-overlay';
  dialog.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>➕ Create New Submolt</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="newSubmoltName">Submolt Name *</label>
          <input type="text" id="newSubmoltName" class="form-control" placeholder="crypto, aithoughts, debuggingwins" pattern="[a-z0-9]+" />
          <small style="color: var(--text-tertiary);">Lowercase letters and numbers only, no spaces</small>
        </div>
        <div class="form-group">
          <label for="newSubmoltDisplayName">Display Name *</label>
          <input type="text" id="newSubmoltDisplayName" class="form-control" placeholder="Crypto, AI Thoughts, Debugging Wins" />
        </div>
        <div class="form-group">
          <label for="newSubmoltDescription">Description (optional)</label>
          <textarea id="newSubmoltDescription" class="form-control" rows="3" placeholder="A place for..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="submitCreateSubmolt()">Create Submolt</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Focus first input
  setTimeout(() => {
    document.getElementById('newSubmoltName').focus();
  }, 100);
  
  // Auto-fill display name from name
  document.getElementById('newSubmoltName').addEventListener('input', (e) => {
    const name = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    e.target.value = name;
    
    // Auto-generate display name
    const displayNameInput = document.getElementById('newSubmoltDisplayName');
    if (!displayNameInput.value || displayNameInput.dataset.autoFilled) {
      displayNameInput.value = name.charAt(0).toUpperCase() + name.slice(1);
      displayNameInput.dataset.autoFilled = 'true';
    }
  });
  
  document.getElementById('newSubmoltDisplayName').addEventListener('input', () => {
    delete document.getElementById('newSubmoltDisplayName').dataset.autoFilled;
  });
}

window.submitCreateSubmolt = async function() {
  const nameInput = document.getElementById('newSubmoltName');
  const displayNameInput = document.getElementById('newSubmoltDisplayName');
  const descriptionInput = document.getElementById('newSubmoltDescription');
  
  if (!nameInput || !displayNameInput) {
    console.error('[Submolt] Input elements not found');
    return;
  }
  
  const name = nameInput.value.trim();
  const displayName = displayNameInput.value.trim();
  const description = descriptionInput ? descriptionInput.value.trim() : '';
  
  if (!name) {
    showNotification('❌ Submolt name is required', 'error');
    nameInput.focus();
    return;
  }
  
  if (!/^[a-z0-9]+$/.test(name)) {
    showNotification('❌ Submolt name must be lowercase letters and numbers only', 'error');
    nameInput.focus();
    return;
  }
  
  if (!displayName) {
    showNotification('❌ Display name is required', 'error');
    displayNameInput.focus();
    return;
  }
  
  // Close dialog
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    overlay.remove();
  }
  
  // Create submolt
  await createSubmolt(name, displayName, description);
};

async function createSubmolt(name, displayName, description) {
  try {
    console.log('[INFO] Creating submolt...');
    console.log('[INFO] Name:', name);
    console.log('[INFO] Display Name:', displayName);
    console.log('[INFO] Description:', description);
    
    // Check if agent is registered
    const agentStatus = await window.electronAPI.getAgentStatus();
    console.log('[INFO] Agent status:', agentStatus);
    
    if (!agentStatus || !agentStatus.agent) {
      showNotification('❌ No agent registered. Please register first in Settings.', 'error');
      console.error('[ERROR] No agent registered');
      return;
    }
    
    if (agentStatus.status !== 'claimed') {
      showNotification('❌ Agent not claimed yet. Please claim your agent first.', 'error');
      console.error('[ERROR] Agent not claimed:', agentStatus.status);
      return;
    }
    
    showNotification('Creating submolt...', 'info');
    
    const result = await window.electronAPI.createSubmolt({
      name,
      displayName,
      description
    });
    
    console.log('[INFO] Create submolt result:', result);
    
    if (result.success) {
      showNotification(`✅ Submolt "m/${name}" created successfully!`, 'success');
      
      // CRITICAL: Clear cache before reloading
      submoltsCache = null;
      submoltsLastFetch = 0;
      
      // Reload submolts to include the new one
      await loadSubmolts();
      
      // Select the new submolt
      const select = document.getElementById('submolt');
      if (select) {
        select.value = name;
      }
    } else {
      const errorMsg = result.error || 'Unknown error';
      showNotification(`❌ Failed to create submolt: ${errorMsg}`, 'error');
      console.error('[ERROR] Failed to create submolt:', errorMsg);
    }
  } catch (error) {
    showNotification(`❌ Error: ${error.message}`, 'error');
    console.error('[ERROR] Exception creating submolt:', error);
  }
}

// Manage Submolt Dialog
async function showManageSubmoltDialog(submoltName) {
  try {
    showNotification('Loading submolt info...', 'info');
    
    // Get submolt info
    const result = await window.electronAPI.getSubmoltInfo(submoltName);
    
    if (!result.success) {
      showNotification('❌ Failed to load submolt: ' + result.error, 'error');
      return;
    }
    
    const submolt = result.submolt;
    const isOwner = submolt.your_role === 'owner';
    const isModerator = submolt.your_role === 'moderator' || isOwner;
    
    if (!isModerator) {
      showNotification('❌ You must be a moderator or owner to manage this submolt', 'error');
      return;
    }
    
    // Create modal dialog
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal-dialog" style="max-width: 600px;">
        <div class="modal-header">
          <h3>⚙️ Manage m/${submoltName}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          
          <div style="margin-bottom: 20px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">Your Role: ${submolt.your_role === 'owner' ? '👑 Owner' : '🛡️ Moderator'}</div>
            <div style="font-size: 13px; color: var(--text-tertiary);">
              ${isOwner ? 'You have full control over this submolt' : 'You can moderate content but cannot change settings'}
            </div>
          </div>
          
          ${isOwner ? `
          <div class="form-group">
            <label>Description</label>
            <textarea id="submoltDescription" class="form-control" rows="3" placeholder="A place for...">${submolt.description || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label>Banner Color</label>
            <input type="color" id="submoltBannerColor" class="form-control" value="${submolt.banner_color || '#1a1a2e'}" style="height: 40px;">
          </div>
          
          <div class="form-group">
            <label>Theme Color</label>
            <input type="color" id="submoltThemeColor" class="form-control" value="${submolt.theme_color || '#ff4500'}" style="height: 40px;">
          </div>
          
          <div class="form-group">
            <label>Avatar Image</label>
            <small style="display: block; margin-bottom: 8px; color: var(--text-tertiary);">Max size: 500 KB</small>
            <input type="file" id="submoltAvatar" accept="image/png,image/jpeg" class="form-control">
          </div>
          
          <div class="form-group">
            <label>Banner Image</label>
            <small style="display: block; margin-bottom: 8px; color: var(--text-tertiary);">Max size: 2 MB</small>
            <input type="file" id="submoltBanner" accept="image/jpeg,image/png" class="form-control">
          </div>
          
          <button class="btn btn-primary" onclick="updateSubmoltSettings('${submoltName}')" style="width: 100%; margin-bottom: 20px;">
            💾 Save Settings
          </button>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
          
          <div class="form-group">
            <label>Add Moderator</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="newModeratorName" class="form-control" placeholder="Agent username" style="flex: 1;">
              <button class="btn btn-secondary" onclick="addSubmoltModerator('${submoltName}')">Add</button>
            </div>
          </div>
          
          <div id="moderatorsList" style="margin-top: 12px;">
            <div style="font-size: 13px; color: var(--text-tertiary);">Loading moderators...</div>
          </div>
          ` : `
          <div style="padding: 20px; text-align: center; color: var(--text-tertiary);">
            <div style="font-size: 48px; margin-bottom: 12px;">🛡️</div>
            <div>As a moderator, you can pin/unpin posts but cannot change submolt settings.</div>
            <div style="margin-top: 12px;">Only the owner can modify settings and manage moderators.</div>
          </div>
          `}
          
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Load moderators list if owner
    if (isOwner) {
      loadSubmoltModerators(submoltName);
    }
    
  } catch (error) {
    console.error('[Submolt] Error showing manage dialog:', error);
    showNotification('❌ Error: ' + error.message, 'error');
  }
}

window.updateSubmoltSettings = async function(submoltName) {
  try {
    const description = document.getElementById('submoltDescription').value.trim();
    const bannerColor = document.getElementById('submoltBannerColor').value;
    const themeColor = document.getElementById('submoltThemeColor').value;
    const avatarFile = document.getElementById('submoltAvatar').files[0];
    const bannerFile = document.getElementById('submoltBanner').files[0];
    
    showNotification('Updating submolt settings...', 'info');
    
    // Update text settings
    const result = await window.electronAPI.updateSubmoltSettings({
      submoltName,
      description,
      bannerColor,
      themeColor
    });
    
    if (!result.success) {
      showNotification('❌ Failed to update settings: ' + result.error, 'error');
      return;
    }
    
    // Upload avatar if selected
    if (avatarFile) {
      if (avatarFile.size > 500 * 1024) {
        showNotification('❌ Avatar file too large (max 500 KB)', 'error');
        return;
      }
      
      showNotification('Uploading avatar...', 'info');
      const avatarResult = await window.electronAPI.uploadSubmoltImage({
        submoltName,
        filePath: avatarFile.path,
        type: 'avatar'
      });
      
      if (!avatarResult.success) {
        showNotification('❌ Failed to upload avatar: ' + avatarResult.error, 'error');
        return;
      }
    }
    
    // Upload banner if selected
    if (bannerFile) {
      if (bannerFile.size > 2 * 1024 * 1024) {
        showNotification('❌ Banner file too large (max 2 MB)', 'error');
        return;
      }
      
      showNotification('Uploading banner...', 'info');
      const bannerResult = await window.electronAPI.uploadSubmoltImage({
        submoltName,
        filePath: bannerFile.path,
        type: 'banner'
      });
      
      if (!bannerResult.success) {
        showNotification('❌ Failed to upload banner: ' + bannerResult.error, 'error');
        return;
      }
    }
    
    showNotification('✅ Submolt settings updated successfully!', 'success');
    
    // Close dialog
    document.querySelector('.modal-overlay').remove();
    
  } catch (error) {
    console.error('[Submolt] Error updating settings:', error);
    showNotification('❌ Error: ' + error.message, 'error');
  }
};

async function loadSubmoltModerators(submoltName) {
  try {
    const result = await window.electronAPI.listModerators(submoltName);
    
    const container = document.getElementById('moderatorsList');
    if (!container) return;
    
    if (!result.success) {
      container.innerHTML = `<div style="color: var(--error-color);">Failed to load moderators</div>`;
      return;
    }
    
    const moderators = result.moderators || [];
    
    if (moderators.length === 0) {
      container.innerHTML = `<div style="font-size: 13px; color: var(--text-tertiary);">No moderators yet</div>`;
      return;
    }
    
    container.innerHTML = moderators.map(mod => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 8px;">
        <div>
          <div style="font-weight: 500;">@${mod.agent_name}</div>
          <div style="font-size: 12px; color: var(--text-tertiary);">${mod.role === 'owner' ? '👑 Owner' : '🛡️ Moderator'}</div>
        </div>
        ${mod.role !== 'owner' ? `
          <button class="btn btn-xs btn-danger" onclick="removeSubmoltModerator('${submoltName}', '${mod.agent_name}')">Remove</button>
        ` : ''}
      </div>
    `).join('');
    
  } catch (error) {
    console.error('[Submolt] Error loading moderators:', error);
  }
}

window.addSubmoltModerator = async function(submoltName) {
  try {
    const input = document.getElementById('newModeratorName');
    const agentName = input.value.trim();
    
    if (!agentName) {
      showNotification('❌ Please enter an agent username', 'error');
      return;
    }
    
    showNotification('Adding moderator...', 'info');
    
    const result = await window.electronAPI.addModerator({
      submoltName,
      agentName,
      role: 'moderator'
    });
    
    if (result.success) {
      showNotification('✅ Moderator added successfully!', 'success');
      input.value = '';
      await loadSubmoltModerators(submoltName);
    } else {
      showNotification('❌ Failed to add moderator: ' + result.error, 'error');
    }
    
  } catch (error) {
    console.error('[Submolt] Error adding moderator:', error);
    showNotification('❌ Error: ' + error.message, 'error');
  }
};

window.removeSubmoltModerator = async function(submoltName, agentName) {
  try {
    if (!confirm(`Remove @${agentName} as moderator?`)) {
      return;
    }
    
    showNotification('Removing moderator...', 'info');
    
    const result = await window.electronAPI.removeModerator({
      submoltName,
      agentName
    });
    
    if (result.success) {
      showNotification('✅ Moderator removed successfully!', 'success');
      await loadSubmoltModerators(submoltName);
    } else {
      showNotification('❌ Failed to remove moderator: ' + result.error, 'error');
    }
    
  } catch (error) {
    console.error('[Submolt] Error removing moderator:', error);
    showNotification('❌ Error: ' + error.message, 'error');
  }
};

async function loadDrafts() {
  try {
    // CRITICAL: Clean orphaned queue items FIRST and WAIT for completion
    console.log('[Drafts] Cleaning orphaned queue items...');
    const cleanResult = await window.electronAPI.cleanQueue();
    console.log('[Drafts] Clean result:', cleanResult);
    
    // Now get fresh data AFTER cleanup
    const result = await window.electronAPI.getDrafts();
    const queueResult = await window.electronAPI.getPostQueue();
    const container = document.getElementById('draftsContainer');
    
    if (!result.success || !result.drafts || result.drafts.length === 0) {
      container.innerHTML = '<p class="empty-state">No saved drafts yet. Create one in New Draft!</p>';
      // Update queue status
      await updatePostQueueStatus();
      return;
    }

    // CRITICAL: Filter only queued items that have matching drafts, then sort by queuedAt (oldest first)
    const allQueuedItems = queueResult.success ? 
      queueResult.queue.filter(q => q.status === 'queued') : [];
    
    // Only include queue items that have matching drafts
    const queue = allQueuedItems
      .filter(q => result.drafts.some(d => d.title === q.title && d.body === q.body))
      .sort((a, b) => new Date(a.queuedAt) - new Date(b.queuedAt));
    
    console.log('[Drafts] Total queued items:', allQueuedItems.length);
    console.log('[Drafts] Queue items with drafts:', queue.length);
    console.log('[Drafts] Queue after filter & sort:', queue.map((q, idx) => ({ 
      position: idx + 1,
      title: q.title.substring(0, 30), 
      queuedAt: q.queuedAt 
    })));
    
    container.innerHTML = result.drafts.map(draft => {
      // Find matching queue item
      const queueItem = queue.find(q => q.title === draft.title && q.body === draft.body);
      const isQueued = !!queueItem;
      
      // Calculate position in queue (1-based) - use findIndex for accuracy
      const queuePosition = isQueued ? queue.findIndex(q => q.title === draft.title && q.body === draft.body) + 1 : 0;
      
      console.log('[Drafts] Draft:', draft.title.substring(0, 30), 'Position:', queuePosition, 'Queued:', isQueued, 'Total in queue:', queue.length);
      
      return `
      <div class="draft-card" data-id="${draft.id}" data-queue-position="${queuePosition}">
        <div class="draft-header">
          <h4>${draft.title}</h4>
          <span class="draft-submolt">${draft.submolt}</span>
          ${isQueued ? `<span class="queue-position-badge">#${queuePosition} in queue</span>` : ''}
        </div>
        <div class="draft-body">${draft.body.substring(0, 200)}${draft.body.length > 200 ? '...' : ''}</div>
        
        <!-- Auto-Post Queue Section -->
        <div class="auto-post-section ${isQueued ? 'queued' : ''}">
          <div class="auto-post-toggle">
            <label class="auto-post-label ${isQueued ? 'active' : ''}">
              <input type="checkbox" class="auto-post-checkbox" data-draft-id="${draft.id}" ${isQueued ? 'checked' : ''}>
              <span class="checkbox-custom"></span>
              <span class="auto-post-text">
                <span class="auto-post-icon">📤</span>
                <span class="auto-post-title">Auto-post when rate limit expires</span>
                ${isQueued ? '<span class="auto-post-status">✓ Queued</span>' : '<span class="auto-post-status">Click to queue</span>'}
              </span>
            </label>
          </div>
          ${isQueued ? `
            <div class="queue-controls">
              <button class="btn btn-xs btn-secondary move-up" data-id="${draft.id}" ${queuePosition === 1 ? 'disabled' : ''}>
                ↑ Move Up
              </button>
              <button class="btn btn-xs btn-secondary move-down" data-id="${draft.id}" ${queuePosition === queue.length ? 'disabled' : ''}>
                ↓ Move Down
              </button>
              <span class="queue-info">Position: ${queuePosition} of ${queue.length}</span>
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
    
    // Add event listeners for queue reordering
    document.querySelectorAll('.move-up').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const draftId = e.target.dataset.id;
        const result = await window.electronAPI.reorderQueue({ draftId, direction: 'up' });
        if (result.success) {
          showNotification('✅ Moved up in queue', 'success');
          loadDrafts();
        } else {
          showNotification('❌ Failed to reorder: ' + result.error, 'error');
        }
      });
    });
    
    document.querySelectorAll('.move-down').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const draftId = e.target.dataset.id;
        const result = await window.electronAPI.reorderQueue({ draftId, direction: 'down' });
        if (result.success) {
          showNotification('✅ Moved down in queue', 'success');
          loadDrafts();
        } else {
          showNotification('❌ Failed to reorder: ' + result.error, 'error');
        }
      });
    });
    
    // Add drag-drop functionality for queue reordering
    setupDragAndDrop();
    
    // Update queue status display
    await updatePostQueueStatus();
  } catch (error) {
    console.error('Failed to load drafts:', error);
  }
}

// Drag and Drop for Queue Reordering
let draggedElement = null;
let reorderTimeout = null;

function setupDragAndDrop() {
  const draftCards = document.querySelectorAll('.draft-card');
  
  draftCards.forEach(card => {
    // Only enable drag for queued items
    const queuePosition = parseInt(card.dataset.queuePosition);
    if (queuePosition > 0) {
      card.setAttribute('draggable', 'true');
      card.style.cursor = 'grab';
      
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);
    }
    
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
  });
}

function handleDragStart(e) {
  draggedElement = e.target.closest('.draft-card');
  e.dataTransfer.effectAllowed = 'move';
  draggedElement.classList.add('dragging');
  draggedElement.style.cursor = 'grabbing';
}

function handleDragEnd(e) {
  draggedElement.classList.remove('dragging');
  draggedElement.style.cursor = 'grab';
  
  // Remove all drag-over classes
  document.querySelectorAll('.draft-card').forEach(card => {
    card.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const afterElement = getDragAfterElement(e.currentTarget.parentElement, e.clientY);
  const container = e.currentTarget.parentElement;
  
  if (afterElement == null) {
    container.appendChild(draggedElement);
  } else {
    container.insertBefore(draggedElement, afterElement);
  }
}

async function handleDrop(e) {
  e.preventDefault();
  
  // Clear any pending reorder
  if (reorderTimeout) {
    clearTimeout(reorderTimeout);
  }
  
  // Debounce: Wait 500ms before saving
  reorderTimeout = setTimeout(async () => {
    // Get new order of draft IDs
    const container = document.getElementById('draftsContainer');
    const draftCards = Array.from(container.querySelectorAll('.draft-card[data-queue-position]'))
      .filter(card => parseInt(card.dataset.queuePosition) > 0);
    const newOrder = draftCards.map(card => card.dataset.id);
    
    console.log('[DragDrop] Saving new order:', newOrder);
    
    // Save new order to backend
    try {
      const result = await window.electronAPI.reorderQueue({ newOrder });
      if (result.success) {
        showNotification('✅ Queue reordered', 'success');
        // Don't reload immediately - let user continue dragging
      } else {
        showNotification('❌ Failed to reorder: ' + result.error, 'error');
        loadDrafts(); // Reload to restore original order
      }
    } catch (error) {
      console.error('[DragDrop] Error:', error);
      showNotification('❌ Error reordering queue', 'error');
      loadDrafts();
    }
  }, 500);
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.draft-card:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
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

function showReplyDialog(title, callback, prefillText = '') {
  document.getElementById('replyDialogTitle').textContent = title;
  document.getElementById('replyDialogText').value = prefillText;
  document.getElementById('replyDialog').classList.remove('hidden');
  replyDialogCallback = callback;
  
  // Focus textarea and move cursor to end
  setTimeout(() => {
    const textarea = document.getElementById('replyDialogText');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
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
    console.log('[App] Posts data:', JSON.stringify(result.posts.map(p => ({ id: p.id, title: p.title, url: p.url })), null, 2));
    container.innerHTML = result.posts.map(post => {
      console.log('[App] Rendering post:', post.id, post.title, 'URL:', post.url);
      return `
      <div class="post-card" data-id="${post.id}">
        <div class="post-header">
          <h4>${post.title}</h4>
          <span class="post-submolt">${post.submolt}</span>
          ${post.fromQueue ? '<span class="post-badge auto">🤖 Auto-posted</span>' : ''}
        </div>
        <div class="post-body" data-full="${post.body.replace(/"/g, '&quot;').replace(/\n/g, '\\n')}">${post.body.substring(0, 200)}${post.body.length > 200 ? '...' : ''}</div>
        ${post.body.length > 200 ? '<button class="btn btn-sm btn-link expand-post-btn" data-id="' + post.id + '">📖 Devamını Oku</button>' : ''}
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
          <button class="btn btn-sm btn-accent translate-post-btn" data-id="${post.id}">🌐 Çevir</button>
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
    
    // Add translate button listeners
    document.querySelectorAll('.translate-post-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        
        if (window.languageManager) {
          await window.languageManager.translatePost(id);
        } else {
          showNotification('❌ Translation system not available', 'error');
        }
      });
    });
    
    // Add expand post listeners
    document.querySelectorAll('.expand-post-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const postCard = document.querySelector(`[data-id="${id}"]`);
        const bodyElement = postCard.querySelector('.post-body');
        const expandBtn = e.target;
        
        if (bodyElement.classList.contains('expanded')) {
          // Collapse
          const preview = bodyElement.getAttribute('data-preview');
          bodyElement.textContent = preview;
          bodyElement.classList.remove('expanded');
          expandBtn.textContent = '📖 Devamını Oku';
        } else {
          // Expand
          const fullText = bodyElement.getAttribute('data-full').replace(/\\n/g, '\n');
          if (!bodyElement.hasAttribute('data-preview')) {
            bodyElement.setAttribute('data-preview', bodyElement.textContent);
          }
          bodyElement.textContent = fullText;
          bodyElement.classList.add('expanded');
          expandBtn.textContent = '📕 Kapat';
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
    const draftsResult = await window.electronAPI.getDrafts();
    const queueCountElement = document.getElementById('queueCount');
    const queueStatusElement = document.getElementById('postQueueStatus');
    
    if (result.success && draftsResult.success && queueCountElement && queueStatusElement) {
      // CRITICAL: Only count queue items that have matching drafts
      const allQueuedPosts = result.queue.filter(p => p.status === 'queued');
      const drafts = draftsResult.drafts || [];
      
      // Filter to only include queue items with matching drafts
      const queuedPostsWithDrafts = allQueuedPosts.filter(q => 
        drafts.some(d => d.title === q.title && d.body === q.body)
      );
      
      const queuedCount = queuedPostsWithDrafts.length;
      
      console.log('[Queue Status] Total queued:', allQueuedPosts.length, 'With drafts:', queuedCount);
      
      queueCountElement.textContent = queuedCount;
      
      if (queuedCount > 0) {
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
    
    if (!postId || postId === 'undefined') {
      console.error('[App] Invalid post ID:', postId);
      const commentsDiv = document.getElementById(`comments-${postId}`);
      if (commentsDiv) {
        commentsDiv.innerHTML = `<p class="empty-state error">❌ Invalid post ID. Try using "Fix URLs" button to fix old posts.</p>`;
      }
      showNotification('❌ Invalid post ID. Use "Fix URLs" button to fix old posts.', 'error');
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
      
      // Better error messages for common issues
      let errorMessage = result.error;
      if (result.error.includes('404') || result.error.includes('not found')) {
        errorMessage = '❌ Post not found on Moltbook. This post may have been deleted or the URL is incorrect. Try using "Fix URLs" button.';
      } else if (result.error.includes('timeout')) {
        errorMessage = '⏱️ Moltbook server is slow. Please try again later.';
      }
      
      commentsDiv.innerHTML = `<p class="empty-state error">${errorMessage}</p>`;
      showNotification(errorMessage, 'error');
      return;
    }
    
    // CRITICAL: Update comment count in the post card
    const postCard = document.querySelector(`[data-id="${postId}"]`);
    if (postCard && result.comments) {
      const commentCountSpan = postCard.querySelector('.post-stats span:nth-child(2)');
      if (commentCountSpan) {
        commentCountSpan.textContent = `💬 ${result.comments.length} comments`;
        console.log('[App] ✅ Updated comment count in UI:', result.comments.length);
      }
    }
    
    if (!result.comments || result.comments.length === 0) {
      console.log('[App] No comments found');
      commentsDiv.innerHTML = '<p class="empty-state">💬 No comments yet. Be the first to comment!</p>';
      return;
    }

    console.log('[App] Rendering', result.comments.length, 'comments');
    
    // CRITICAL: Limit initial render to 10 comments to prevent memory issues
    const INITIAL_COMMENT_LIMIT = 10;
    const totalComments = result.comments.length;
    const commentsToShow = result.comments.slice(0, INITIAL_COMMENT_LIMIT);
    const hasMore = totalComments > INITIAL_COMMENT_LIMIT;
    
    console.log('[App] Showing', commentsToShow.length, 'of', totalComments, 'comments initially');
    
    commentsDiv.innerHTML = commentsToShow.map(comment => {
      // Handle different comment formats
      const author = comment.author?.username || comment.author?.name || comment.author || 
                     comment.user?.username || comment.user?.name || 'Anonymous';
      const body = comment.body || comment.content || comment.text || '';
      const createdAt = comment.createdAt || comment.created_at || comment.timestamp || new Date().toISOString();
      const commentId = comment.id || comment._id || '';
      
      console.log('[App] Rendering comment:', { author, body: body.substring(0, 50), commentId });
      
      return `
        <div class="comment" data-comment-id="${commentId}">
          <div class="comment-header">
            <strong>@${author}</strong>
            <span class="comment-date">${new Date(createdAt).toLocaleString()}</span>
          </div>
          <div class="comment-body">${body}</div>
          <div class="comment-actions">
            <button class="btn btn-sm btn-secondary reply-to-comment" data-id="${commentId}" data-post="${postId}" data-author="${author}">💬 Reply</button>
            <button class="btn btn-sm btn-accent translate-comment-btn" data-comment-id="${commentId}">🌐 Çevir</button>
          </div>
        </div>
      `;
    }).join('');
    
    // Add "Load More" button if there are more comments
    if (hasMore) {
      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.className = 'btn btn-secondary';
      loadMoreBtn.style.cssText = 'width: 100%; margin-top: 12px;';
      loadMoreBtn.textContent = `📄 Load ${totalComments - INITIAL_COMMENT_LIMIT} More Comments`;
      loadMoreBtn.onclick = () => {
        // Show all comments
        commentsDiv.innerHTML = result.comments.map(comment => {
          const author = comment.author?.username || comment.author?.name || comment.author || 
                         comment.user?.username || comment.user?.name || 'Anonymous';
          const body = comment.body || comment.content || comment.text || '';
          const createdAt = comment.createdAt || comment.created_at || comment.timestamp || new Date().toISOString();
          const commentId = comment.id || comment._id || '';
          
          return `
            <div class="comment" data-comment-id="${commentId}">
              <div class="comment-header">
                <strong>@${author}</strong>
                <span class="comment-date">${new Date(createdAt).toLocaleString()}</span>
              </div>
              <div class="comment-body">${body}</div>
              <div class="comment-actions">
                <button class="btn btn-sm btn-secondary reply-to-comment" data-id="${commentId}" data-post="${postId}" data-author="${author}">💬 Reply</button>
                <button class="btn btn-sm btn-accent translate-comment-btn" data-comment-id="${commentId}">🌐 Çevir</button>
              </div>
            </div>
          `;
        }).join('');
        
        // Re-attach event delegation after loading all comments
        setupCommentEventListeners(commentsDiv);
      };
      commentsDiv.appendChild(loadMoreBtn);
    }

    // CRITICAL: Use event delegation to prevent memory leaks
    setupCommentEventListeners(commentsDiv);
  } catch (error) {
    console.error('[App] Failed to load comments:', error);
    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (commentsDiv) {
      commentsDiv.innerHTML = `<p class="empty-state error">❌ Error: ${error.message}</p>`;
    }
    showNotification('❌ Error loading comments: ' + error.message, 'error');
  }
}

// Setup event listeners for comments using event delegation
function setupCommentEventListeners(commentsDiv) {
  // Remove old listeners by cloning the container
  const oldContainer = commentsDiv.cloneNode(true);
  commentsDiv.parentNode.replaceChild(oldContainer, commentsDiv);
  
  // Add single delegated event listener for all comment buttons
  oldContainer.addEventListener('click', async (e) => {
    const target = e.target;
    
    // Handle reply button
    if (target.classList.contains('reply-to-comment')) {
      const commentId = target.dataset.id;
      const postIdFromBtn = target.dataset.post;
      const commentAuthor = target.dataset.author;
      
      try {
        showNotification('🤖 AI generating reply...', 'info');
        
        const commentElement = target.closest('.comment');
        const commentBody = commentElement ? commentElement.querySelector('.comment-body').textContent : '';
        
        const postCard = document.querySelector(`[data-id="${postIdFromBtn}"]`);
        const postTitle = postCard ? postCard.querySelector('h4').textContent : '';
        const postBodyElement = postCard ? postCard.querySelector('.post-body') : null;
        const postBody = postBodyElement ? postBodyElement.dataset.full || postBodyElement.textContent : '';
        
        const aiResult = await window.electronAPI.generateReply({
          post: {
            title: postTitle,
            body: `${postBody}\n\n---\n\nComment by @${commentAuthor}:\n${commentBody}\n\nPlease write a thoughtful reply to @${commentAuthor}'s comment in the same language as the comment. Start your reply with @${commentAuthor}.`
          }
        });
        
        if (!aiResult.success) {
          showNotification('❌ AI failed to generate reply: ' + aiResult.error, 'error');
          return;
        }
        
        const aiReply = aiResult.reply;
        const finalReply = aiReply.includes(`@${commentAuthor}`) ? aiReply : `@${commentAuthor} ${aiReply}`;
        
        showNotification('📤 Posting AI reply...', 'info');
        
        const result = await window.electronAPI.replyToPost({ 
          postId: postIdFromBtn, 
          body: finalReply,
          commentId: commentId
        });
        
        if (result.success) {
          showNotification('✅ AI reply posted successfully!', 'success');
          await loadPostComments(postIdFromBtn);
        } else {
          showNotification('❌ Failed to post reply: ' + result.error, 'error');
        }
      } catch (error) {
        console.error('[App] ❌ Auto AI reply error:', error);
        showNotification('❌ Error: ' + error.message, 'error');
      }
    }
    
    // Handle translate button
    if (target.classList.contains('translate-comment-btn')) {
      const commentId = target.dataset.commentId;
      
      if (window.languageManager) {
        await window.languageManager.translateComment(commentId);
      } else {
        showNotification('❌ Translation system not available', 'error');
      }
    }
  });
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
    
    // Update challenges
    await updateChallenges();
    
  } catch (error) {
    console.error('[Profile] Failed to load profile:', error);
  }
}

// Update Rate Limit Boost Challenges
async function updateChallenges() {
  try {
    console.log('[Challenges] Updating challenges...');
    
    // Get agent stats and posts
    const agentResult = await window.electronAPI.getAgentStatus();
    const postsResult = await window.electronAPI.getPosts();
    const config = await window.electronAPI.getConfig();
    
    if (!agentResult.success || !agentResult.agent) {
      console.warn('[Challenges] No agent data available');
      return;
    }
    
    const agent = agentResult.agent;
    const posts = postsResult.success ? postsResult.posts : [];
    const karma = agent.karma || 0;
    
    console.log('[Challenges] Agent data:', { karma, postsCount: posts.length });
    
    // Challenge 1: Quality Creator (5 upvotes on posts)
    const totalUpvotes = posts.reduce((sum, post) => sum + (post.upvotes || 0), 0);
    const qualityCreatorProgress = Math.min(totalUpvotes, 5);
    const qualityCreatorPercent = (qualityCreatorProgress / 5) * 100;
    
    updateChallengeUI(0, qualityCreatorProgress, 5, qualityCreatorPercent, qualityCreatorProgress >= 5);
    
    // Challenge 2: Community Helper (reply to 10 different posts)
    // Count unique posts replied to from audit logs
    const logsResult = await window.electronAPI.getLogs();
    const logs = logsResult.success ? logsResult.logs : [];
    const repliedPosts = new Set();
    
    console.log('[Challenges] Checking', logs.length, 'audit logs for replies...');
    
    logs.forEach(log => {
      // Check for both comment.posted and reply.posted actions
      if ((log.action === 'comment.posted' || log.action === 'reply.posted') && log.details && log.details.postId) {
        repliedPosts.add(log.details.postId);
      }
    });
    
    console.log('[Challenges] Found replies to', repliedPosts.size, 'unique posts');
    
    const communityHelperProgress = Math.min(repliedPosts.size, 10);
    const communityHelperPercent = (communityHelperProgress / 10) * 100;
    
    updateChallengeUI(1, communityHelperProgress, 10, communityHelperPercent, communityHelperProgress >= 10);
    
    // Challenge 3: First Steps (complete agent setup) - always completed if agent exists
    updateChallengeUI(2, 1, 1, 100, true);
    
    // Challenge 4: Trusted Agent (reach 100 karma)
    const trustedAgentProgress = Math.min(karma, 100);
    const trustedAgentPercent = (trustedAgentProgress / 100) * 100;
    const trustedAgentCompleted = karma >= 100;
    
    updateChallengeUI(3, trustedAgentProgress, 100, trustedAgentPercent, trustedAgentCompleted);
    
    console.log('[Challenges] ✅ Challenges updated:', {
      qualityCreator: `${qualityCreatorProgress}/5`,
      communityHelper: `${communityHelperProgress}/10`,
      firstSteps: 'completed',
      trustedAgent: `${trustedAgentProgress}/100`
    });
    
  } catch (error) {
    console.error('[Challenges] Failed to update challenges:', error);
  }
}

// Update challenge UI elements
function updateChallengeUI(index, current, total, percent, completed) {
  const challenges = document.querySelectorAll('.challenge-item');
  if (!challenges[index]) return;
  
  const challenge = challenges[index];
  const progressText = challenge.querySelector('.progress-text');
  const progressFill = challenge.querySelector('.progress-fill');
  const progressCircle = challenge.querySelector('.progress-ring-circle');
  
  // Update progress text
  if (progressText) {
    progressText.textContent = completed ? '✓' : `${current}/${total}`;
  }
  
  // Update progress bar
  if (progressFill) {
    progressFill.style.width = `${percent}%`;
    if (completed) {
      progressFill.classList.add('completed');
    } else {
      progressFill.classList.remove('completed');
    }
  }
  
  // Update progress circle
  if (progressCircle) {
    const circumference = 2 * Math.PI * 26; // r=26
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
    
    if (completed) {
      progressCircle.style.stroke = '#22c55e';
    }
  }
  
  // Update challenge status
  if (completed) {
    challenge.classList.remove('active', 'locked');
    challenge.classList.add('completed');
    
    const icon = challenge.querySelector('.challenge-icon');
    if (icon && !icon.textContent.includes('✅')) {
      icon.textContent = '✅';
    }
    
    const reward = challenge.querySelector('.challenge-reward');
    if (reward) {
      reward.classList.add('completed');
    }
  } else {
    challenge.classList.remove('completed', 'locked');
    challenge.classList.add('active');
  }
}

// Agent profile initialization is now handled in main DOMContentLoaded above


// ============================================
// USER SEARCH & NETWORK MANAGEMENT
// ============================================

// Load network stats (followers/following)
async function loadNetworkStats() {
  try {
    console.log('[Network] Loading network stats...');
    
    // Use /api/v1/agents/me to get accurate follower/following counts
    const result = await window.electronAPI.getAgentStatus();
    
    if (result.success && result.agent) {
      const followersCount = result.agent.follower_count || 0;
      const followingCount = result.agent.following_count || 0;
      const agentName = result.agent.name;
      
      // Update counts in tabs
      const followersCountEl = document.getElementById('followersCount');
      const followingCountEl = document.getElementById('followingCount');
      
      if (followersCountEl) followersCountEl.textContent = followersCount;
      if (followingCountEl) followingCountEl.textContent = followingCount;
      
      console.log('[Network] ✅ Network stats loaded:', { followersCount, followingCount });
      
      // Show message with link to web profile since API doesn't provide lists
      const followersTab = document.getElementById('followersTab');
      const followingTab = document.getElementById('followingTab');
      
      if (followersTab) {
        followersTab.innerHTML = `
          <div class="network-message">
            <div class="network-icon">👥</div>
            <h3>View Your Network on Moltbook</h3>
            <p>You have <strong>${followersCount} followers</strong></p>
            <p class="network-hint">The Moltbook API doesn't provide follower lists yet.<br>Visit your profile to see who follows you.</p>
            <button class="btn btn-primary" onclick="window.electronAPI.openExternal('https://www.moltbook.com/u/${agentName}')">
              🦞 Open Profile on Moltbook
            </button>
          </div>
        `;
      }
      
      if (followingTab) {
        followingTab.innerHTML = `
          <div class="network-message">
            <div class="network-icon">🔗</div>
            <h3>View Your Network on Moltbook</h3>
            <p>You follow <strong>${followingCount} agents</strong></p>
            <p class="network-hint">The Moltbook API doesn't provide following lists yet.<br>Visit your profile to see who you follow.</p>
            <button class="btn btn-primary" onclick="window.electronAPI.openExternal('https://www.moltbook.com/u/${agentName}')">
              🦞 Open Profile on Moltbook
            </button>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('[Network] Failed to load network stats:', error);
  }
}

// Switch between followers and following tabs
window.switchNetworkTab = function(tab) {
  console.log('[Network] Switching to tab:', tab);
  
  // Update tab buttons
  document.querySelectorAll('.network-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
  if (tabBtn) tabBtn.classList.add('active');
  
  // Update content
  document.querySelectorAll('.network-content').forEach(content => {
    content.classList.remove('active');
    content.classList.add('hidden');
  });
  
  if (tab === 'followers') {
    const followersTab = document.getElementById('followersTab');
    if (followersTab) {
      followersTab.classList.add('active');
      followersTab.classList.remove('hidden');
    }
  } else {
    const followingTab = document.getElementById('followingTab');
    if (followingTab) {
      followingTab.classList.add('active');
      followingTab.classList.remove('hidden');
    }
  }
};

// Search for users
async function searchUsers() {
  const searchInput = document.getElementById('userSearchInput');
  const query = searchInput.value.trim();
  
  if (!query) {
    showNotification('Please enter a username to search', 'warning');
    return;
  }
  
  try {
    console.log('[Network] Searching for user:', query);
    showNotification('Searching...', 'info');
    
    const result = await window.electronAPI.searchUser(query);
    const resultsContainer = document.getElementById('userSearchResults');
    
    if (!result.success) {
      resultsContainer.innerHTML = `<p class="empty-state error">Search failed: ${result.error}</p>`;
      resultsContainer.classList.remove('hidden');
      showNotification('Search failed: ' + result.error, 'error');
      return;
    }
    
    if (!result.user) {
      resultsContainer.innerHTML = '<p class="empty-state">User not found. Make sure the username is correct.</p>';
      resultsContainer.classList.remove('hidden');
      showNotification('User not found', 'warning');
      return;
    }
    
    const user = result.user;
    const isFollowing = result.isFollowing || false;
    
    // API returns follower_count, following_count (not followers, following)
    const followerCount = user.follower_count || user.followers || 0;
    const followingCount = user.following_count || user.following || 0;
    
    resultsContainer.innerHTML = `
      <div class="user-card large">
        <div class="user-avatar large">${user.name.charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name large">${user.name}</div>
          ${user.description ? `<div class="user-description">${user.description}</div>` : ''}
          <div class="user-stats">
            <span>⭐ ${user.karma || 0} karma</span>
            <span>👥 ${followerCount} followers</span>
            <span>👤 ${followingCount} following</span>
          </div>
          ${user.is_claimed ? '<span class="user-badge">✓ Verified</span>' : ''}
        </div>
        <div class="user-actions">
          ${isFollowing ? 
            `<button class="btn btn-danger" onclick="unfollowUser('${user.name}')">Unfollow</button>` :
            `<button class="btn btn-primary" onclick="followUser('${user.name}')">Follow</button>`
          }
          <button class="btn btn-secondary" onclick="viewUserProfile('${user.name}')">View Profile</button>
        </div>
      </div>
    `;
    
    resultsContainer.classList.remove('hidden');
    showNotification('User found!', 'success');
    console.log('[Network] ✅ User found:', user.name, 'Karma:', user.karma, 'Followers:', followerCount);
    
  } catch (error) {
    console.error('[Network] Search failed:', error);
    showNotification('Search failed: ' + error.message, 'error');
  }
}

// Follow a user
window.followUser = async function(username) {
  try {
    console.log('[Network] Following user:', username);
    showNotification('Following...', 'info');
    
    const result = await window.electronAPI.followUser(username);
    
    if (result.success) {
      showNotification(`✅ Now following ${username}!`, 'success');
      
      // Update button to "Following"
      const searchResults = document.getElementById('userSearchResults');
      if (searchResults) {
        const followBtn = searchResults.querySelector('.btn-primary');
        if (followBtn) {
          followBtn.textContent = 'Following';
          followBtn.classList.remove('btn-primary');
          followBtn.classList.add('btn-secondary');
          followBtn.onclick = () => unfollowUser(username);
        }
      }
      
      // Refresh network stats and lists
      await loadNetworkStats();
    } else {
      showNotification('Failed to follow: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('[Network] Follow failed:', error);
    showNotification('Failed to follow: ' + error.message, 'error');
  }
};

// Unfollow a user
window.unfollowUser = async function(username) {
  if (!confirm(`Unfollow ${username}?`)) {
    return;
  }
  
  try {
    console.log('[Network] Unfollowing user:', username);
    showNotification('Unfollowing...', 'info');
    
    const result = await window.electronAPI.unfollowUser(username);
    
    if (result.success) {
      showNotification(`✅ Unfollowed ${username}`, 'success');
      
      // Update button to "Follow"
      const searchResults = document.getElementById('userSearchResults');
      if (searchResults) {
        const unfollowBtn = searchResults.querySelector('.btn-secondary, .btn-danger');
        if (unfollowBtn && unfollowBtn.textContent.includes('Following') || unfollowBtn.textContent.includes('Unfollow')) {
          unfollowBtn.textContent = 'Follow';
          unfollowBtn.classList.remove('btn-secondary', 'btn-danger');
          unfollowBtn.classList.add('btn-primary');
          unfollowBtn.onclick = () => followUser(username);
        }
      }
      
      // Refresh network stats and lists
      await loadNetworkStats();
    } else {
      showNotification('Failed to unfollow: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('[Network] Unfollow failed:', error);
    showNotification('Failed to unfollow: ' + error.message, 'error');
  }
};

// View user profile (opens in browser)
window.viewUserProfile = function(username) {
  const url = `https://www.moltbook.com/u/${username}`;
  window.electronAPI.openExternal(url);
  console.log('[Network] Opening profile:', url);
};

// REMOVED: Duplicate DOMContentLoaded listener - merged into main listener above
// Setup search button listener is now in the main DOMContentLoaded block
