// Global variables
let autoSaveInterval;

// Shared flag for Safe Mode sync (accessible from both app.js and settings.js)
window.isSafeModeUpdating = false;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');
  initializeApp();
  setupEventListeners();
  loadDashboard();
});

function initializeApp() {
  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const page = item.dataset.page;
      navigateToPage(page);
    });
  });

  function navigateToPage(pageName) {
    // Update nav
    navItems.forEach(item => {
      if (item.dataset.page === pageName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update pages
    pages.forEach(page => {
      if (page.id === pageName) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });

    // Load page data
    loadPageData(pageName);
  }

  // Make navigateToPage global
  window.navigateToPage = navigateToPage;
}

// Load page data
async function loadPageData(pageName) {
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
    console.log('Loading settings page...');
    const config = await window.electronAPI.getConfig();
    const agentNameInput = document.getElementById('agentName');
    const safeModeCheckbox = document.getElementById('safeModeCheckbox');
    const safeModeToggle = document.getElementById('safeModeToggle');
    
    if (agentNameInput) agentNameInput.value = config.agentName || '';
    if (safeModeCheckbox) safeModeCheckbox.checked = config.safeMode !== false;
    if (safeModeToggle) safeModeToggle.checked = config.safeMode !== false;
    
    // Initialize settings module - try multiple times if needed
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryInit = async () => {
      attempts++;
      console.log(`Attempt ${attempts} to initialize settings module...`);
      
      if (window.settingsModule && window.settingsModule.initSettings) {
        console.log('settingsModule found, calling initSettings...');
        await window.settingsModule.initSettings();
        return true;
      } else {
        console.warn('settingsModule not available yet');
        if (attempts < maxAttempts) {
          setTimeout(tryInit, 100);
        } else {
          console.error('Failed to initialize settings module after', maxAttempts, 'attempts');
        }
        return false;
      }
    };
    
    setTimeout(tryInit, 100);
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Logs Management
async function loadLogs() {
  try {
    const result = await window.electronAPI.getLogs();
    const container = document.getElementById('logsContent');
    
    if (!result.success || !result.logs || result.logs.length === 0) {
      container.innerHTML = '<p class="empty-state">No logs yet</p>';
      return;
    }

    container.innerHTML = result.logs.reverse().slice(0, 100).map(log => {
      const date = new Date(log.timestamp);
      const typeClass = log.action.includes('error') || log.action.includes('failed') ? 'error' : 
                       log.action.includes('success') || log.action.includes('saved') || log.action.includes('published') ? 'success' : 'info';
      return `<div class="log-entry log-${typeClass}">
        <span class="log-time">${date.toLocaleString()}</span>
        <span class="log-action">${log.action}</span>
        <span class="log-details">${JSON.stringify(log.details).substring(0, 100)}</span>
      </div>`;
    }).join('');
  } catch (error) {
    console.error('Failed to load logs:', error);
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

  // Publish button - Use { once: false } but check if already publishing
  const publishBtn = document.getElementById('publishBtn');
  if (publishBtn) {
    let isPublishing = false;
    
    publishBtn.addEventListener('click', async () => {
      if (isPublishing) {
        console.log('Already publishing, ignoring click');
        return;
      }
      
      isPublishing = true;
      
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

  // Safe Mode Toggle - Sidebar (GLOBAL flag to prevent multiple notifications)
  const safeModeToggle = document.getElementById('safeModeToggle');
  if (safeModeToggle) {
    safeModeToggle.addEventListener('change', async (e) => {
      if (window.isSafeModeUpdating) {
        console.log('[App] Safe Mode update in progress, skipping...');
        return; // Prevent duplicate events
      }
      
      const enabled = e.target.checked;
      console.log('[App] Safe Mode toggle changed to:', enabled);
      
      window.isSafeModeUpdating = true;
      
      try {
        const config = await window.electronAPI.getConfig();
        config.safeMode = enabled;
        await window.electronAPI.saveConfig(config);
        
        // Update settings page checkbox if it exists
        const safeModeCheckbox = document.getElementById('safeModeCheckbox');
        if (safeModeCheckbox && safeModeCheckbox.checked !== enabled) {
          console.log('[App] Updating settings checkbox to:', enabled);
          safeModeCheckbox.checked = enabled;
        }
        
        // Show notification ONLY ONCE
        showNotification(`Safe Mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
      } finally {
        // Reset flag after a short delay
        setTimeout(() => {
          window.isSafeModeUpdating = false;
        }, 500);
      }
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
    if (toggle) toggle.checked = enabled;
    
    const checkbox = document.getElementById('safeModeCheckbox');
    if (checkbox) checkbox.checked = enabled;
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
    const container = document.getElementById('draftsContainer');
    
    if (!result.success || !result.drafts || result.drafts.length === 0) {
      container.innerHTML = '<p class="empty-state">No saved drafts yet. Create one in New Draft!</p>';
      return;
    }

    container.innerHTML = result.drafts.map(draft => `
      <div class="draft-card" data-id="${draft.id}">
        <div class="draft-header">
          <h4>${draft.title}</h4>
          <span class="draft-submolt">${draft.submolt}</span>
        </div>
        <div class="draft-body">${draft.body.substring(0, 200)}${draft.body.length > 200 ? '...' : ''}</div>
        <div class="draft-footer">
          <span class="draft-date">${new Date(draft.createdAt).toLocaleString()}</span>
          <div class="draft-actions">
            <button class="btn btn-sm btn-secondary edit-draft" data-id="${draft.id}">Edit</button>
            <button class="btn btn-sm btn-danger delete-draft" data-id="${draft.id}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');

    // Add event listeners
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
            showNotification('Posting reply...', 'info');
            const result = await window.electronAPI.replyToPost({ 
              postId: id, 
              body: replyText 
            });
            
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
              showNotification('❌ Failed to post reply: ' + result.error, 'error');
            }
          } catch (error) {
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
