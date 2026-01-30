const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // CLI Commands
  runCliCommand: (command, args) => ipcRenderer.invoke('run-cli-command', command, args),
  fetchFeed: () => ipcRenderer.invoke('fetch-feed'),
  draftPost: (data) => ipcRenderer.invoke('draft-post', data),
  publishPost: (data) => ipcRenderer.invoke('publish-post', data),
  getStats: () => ipcRenderer.invoke('get-stats'),
  securityStatus: () => ipcRenderer.invoke('security-status'),

  // Events
  onNavigate: (callback) => ipcRenderer.on('navigate', (event, page) => callback(page)),
  onSafeModeChanged: (callback) => ipcRenderer.on('safe-mode-changed', (event, enabled) => callback(enabled)),
  onRunCommand: (callback) => ipcRenderer.on('run-command', (event, command) => callback(command)),
  onShowQuickStart: (callback) => ipcRenderer.on('show-quickstart', () => callback()),
});
