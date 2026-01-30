const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { spawn } = require('child_process');

const store = new Store();

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
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

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
    message: 'WATAM AI v1.1.0',
    detail: 'Socially intelligent AI agent for Moltbook\n\nBuilt with ❤️ by WeAreTheArtMakers\n\nMIT License',
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
    moltbookToken: store.get('moltbookToken', ''),
    agentName: store.get('agentName', 'watam-agent'),
  };
});

ipcMain.handle('save-config', (event, config) => {
  store.set('safeMode', config.safeMode);
  store.set('moltbookToken', config.moltbookToken);
  store.set('agentName', config.agentName);
  return { success: true };
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

  // Show confirmation dialog
  const response = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Confirm Publish',
    message: 'Are you sure you want to publish this post to Moltbook?',
    detail: `Submolt: ${data.submolt}\nTitle: ${data.title}\n\nType "PUBLISH NOW" to confirm.`,
    buttons: ['Cancel', 'Publish'],
    defaultId: 0,
    cancelId: 0,
  });

  if (response.response !== 1) {
    return { success: false, error: 'Cancelled by user' };
  }

  try {
    const args = [
      '--submolt', data.submolt,
      '--title', data.title,
      '--body', data.body,
    ];
    const result = await runCliCommand('publish-post', args);
    return result;
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

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
