const { contextBridge, ipcRenderer } = require('electron');

// CRITICAL: Enable all text editing shortcuts
window.addEventListener('DOMContentLoaded', () => {
  // Enable standard editing commands
  document.addEventListener('keydown', (e) => {
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    
    // Get active element
    const activeElement = document.activeElement;
    const isEditable = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    // Cmd/Ctrl + C (Copy)
    if (modifier && e.key === 'c') {
      if (!isEditable) {
        // For non-editable elements, copy selected text
        const selection = window.getSelection();
        if (selection && selection.toString()) {
          e.preventDefault();
          navigator.clipboard.writeText(selection.toString());
          console.log('[Preload] Copied:', selection.toString().substring(0, 50));
        }
      }
      // For editable elements, let default behavior work
    }
    
    // Cmd/Ctrl + V (Paste)
    if (modifier && e.key === 'v') {
      if (isEditable) {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          // Insert text at cursor position
          const start = activeElement.selectionStart;
          const end = activeElement.selectionEnd;
          const value = activeElement.value;
          activeElement.value = value.substring(0, start) + text + value.substring(end);
          activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
          
          // Trigger input event
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('[Preload] Pasted:', text.substring(0, 50));
        });
      }
    }
    
    // Cmd/Ctrl + A (Select All)
    if (modifier && e.key === 'a') {
      if (isEditable) {
        // Let default behavior work for inputs
        return;
      } else {
        // For non-editable elements, select all text
        e.preventDefault();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(document.body);
        selection.removeAllRanges();
        selection.addRange(range);
        console.log('[Preload] Selected all text');
      }
    }
    
    // Cmd/Ctrl + X (Cut)
    if (modifier && e.key === 'x') {
      if (isEditable) {
        e.preventDefault();
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const value = activeElement.value;
        const selectedText = value.substring(start, end);
        
        if (selectedText) {
          navigator.clipboard.writeText(selectedText);
          activeElement.value = value.substring(0, start) + value.substring(end);
          activeElement.selectionStart = activeElement.selectionEnd = start;
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('[Preload] Cut:', selectedText.substring(0, 50));
        }
      }
    }
  });
  
  console.log('[Preload] Keyboard shortcuts enabled');
  
  // Enable paste for all inputs and textareas
  setTimeout(() => {
    document.querySelectorAll('input, textarea').forEach(element => {
      // Enable paste event
      element.addEventListener('paste', (e) => {
        console.log('[Preload] Paste event on', element.id || element.name);
      });
      
      // Ensure element is editable
      element.style.webkitUserSelect = 'text';
      element.style.userSelect = 'text';
    });
    
    // Watch for new inputs/textareas
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
            node.style.webkitUserSelect = 'text';
            node.style.userSelect = 'text';
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log('[Preload] Input/textarea paste enabled');
  }, 1000);
});

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // Moltbook Agent
  moltbookRegister: (data) => ipcRenderer.invoke('moltbook-register', data),
  moltbookGetAgent: () => ipcRenderer.invoke('moltbook-get-agent'),
  moltbookCheckStatus: () => ipcRenderer.invoke('moltbook-check-status'),
  moltbookFetchSkillDoc: () => ipcRenderer.invoke('moltbook-fetch-skilldoc'),
  moltbookResetAgent: () => ipcRenderer.invoke('moltbook-reset-agent'),

  // Drafts
  saveDraft: (draft) => ipcRenderer.invoke('save-draft', draft),
  getDrafts: () => ipcRenderer.invoke('get-drafts'),
  deleteDraft: (id) => ipcRenderer.invoke('delete-draft', id),

  // Posts
  getPosts: () => ipcRenderer.invoke('get-posts'),
  syncPosts: () => ipcRenderer.invoke('sync-posts'),
  getPostComments: (postId) => ipcRenderer.invoke('get-post-comments', postId),
  replyToPost: (data) => ipcRenderer.invoke('reply-to-post', data),
  replyToComment: (data) => ipcRenderer.invoke('reply-to-comment', data),
  deletePost: (postId) => ipcRenderer.invoke('delete-post', postId),

  // Logs
  getLogs: () => ipcRenderer.invoke('get-logs'),

  // AI Agent
  testAIConnection: (data) => ipcRenderer.invoke('test-ai-connection', data),
  startAgent: () => ipcRenderer.invoke('start-agent'),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  generateReply: (data) => ipcRenderer.invoke('generate-reply', data),
  getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
  getPostDetails: (postId) => ipcRenderer.invoke('get-post-details', postId),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // CLI Commands
  runCliCommand: (command, args) => ipcRenderer.invoke('run-cli-command', command, args),
  fetchFeed: () => ipcRenderer.invoke('fetch-feed'),
  draftPost: (data) => ipcRenderer.invoke('draft-post', data),
  publishPost: (data) => ipcRenderer.invoke('publish-post', data),
  getStats: () => ipcRenderer.invoke('get-stats'),
  securityStatus: () => ipcRenderer.invoke('security-status'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Events
  onNavigate: (callback) => ipcRenderer.on('navigate', (event, page) => callback(page)),
  onSafeModeChanged: (callback) => ipcRenderer.on('safe-mode-changed', (event, enabled) => callback(enabled)),
  onRunCommand: (callback) => ipcRenderer.on('run-command', (event, command) => callback(command)),
  onShowQuickStart: (callback) => ipcRenderer.on('show-quickstart', () => callback()),
  onAgentStatusUpdate: (callback) => ipcRenderer.on('agent-status-update', (event, data) => callback(data)),
});
