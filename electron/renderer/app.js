// Navigation
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach(item => {
  item.addEventListener('click', () => {
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

// Load page data
async function loadPageData(pageName) {
  switch (pageName) {
    case 'dashboard':
      await loadDashboard();
      break;
    case 'settings':
      await loadSettings();
      break;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    // Load rate limits
    const stats = await window.electronAPI.getStats();
    if (stats.success) {
      // Parse output and update UI
      document.getElementById('rateLimits').innerHTML = `
        <div class="stat">
          <span class="label">Posts (last hour)</span>
          <span class="value">Loading...</span>
        </div>
        <div class="stat">
          <span class="label">Comments (last hour)</span>
          <span class="value">Loading...</span>
        </div>
      `;
    }

    // Load security status
    const security = await window.electronAPI.securityStatus();
    if (security.success) {
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
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Settings
async function loadSettings() {
  try {
    const config = await window.electronAPI.getConfig();
    document.getElementById('agentName').value = config.agentName || '';
    document.getElementById('moltbookToken').value = config.moltbookToken || '';
    document.getElementById('safeModeToggle').checked = config.safeMode !== false;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
  const config = {
    agentName: document.getElementById('agentName').value,
    moltbookToken: document.getElementById('moltbookToken').value,
    safeMode: document.getElementById('safeModeToggle').checked,
  };

  try {
    const result = await window.electronAPI.saveConfig(config);
    if (result.success) {
      showNotification('Settings saved successfully', 'success');
    }
  } catch (error) {
    showNotification('Failed to save settings', 'error');
  }
});

// Draft Studio
document.getElementById('draftBtn')?.addEventListener('click', async () => {
  const submolt = document.getElementById('submolt').value;
  const topic = document.getElementById('topic').value;
  const includeWatam = document.getElementById('includeWatam').checked;

  if (!topic) {
    showNotification('Please enter a topic', 'error');
    return;
  }

  try {
    const result = await window.electronAPI.draftPost({
      submolt,
      topic,
      includeWatam,
      watamContext: 'art',
    });

    if (result.success) {
      // Parse output and show preview
      showDraftPreview({
        submolt,
        title: topic,
        body: result.output,
      });
    }
  } catch (error) {
    showNotification('Failed to generate draft', 'error');
  }
});

function showDraftPreview(draft) {
  document.getElementById('previewSubmolt').textContent = draft.submolt;
  document.getElementById('previewTitle').textContent = draft.title;
  document.getElementById('previewBody').textContent = draft.body;
  document.getElementById('draftPreview').classList.remove('hidden');
}

document.getElementById('publishBtn')?.addEventListener('click', async () => {
  const submolt = document.getElementById('submolt').value;
  const title = document.getElementById('previewTitle').textContent;
  const body = document.getElementById('previewBody').textContent;

  try {
    const result = await window.electronAPI.publishPost({
      submolt,
      title,
      body,
    });

    if (result.success) {
      showNotification('Post published successfully!', 'success');
      document.getElementById('draftPreview').classList.add('hidden');
    } else {
      showNotification(result.error || 'Failed to publish', 'error');
    }
  } catch (error) {
    showNotification('Failed to publish post', 'error');
  }
});

document.getElementById('copyBtn')?.addEventListener('click', () => {
  const body = document.getElementById('previewBody').textContent;
  navigator.clipboard.writeText(body);
  showNotification('Copied to clipboard', 'success');
});

// Safe Mode Toggle
document.getElementById('safeModeToggle')?.addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  const config = await window.electronAPI.getConfig();
  config.safeMode = enabled;
  await window.electronAPI.saveConfig(config);
  showNotification(`Safe Mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
});

// Notifications
function showNotification(message, type = 'info') {
  // Simple console log for now
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // TODO: Add toast notifications
  alert(message);
}

// Listen for navigation events
window.electronAPI.onNavigate((page) => {
  navigateToPage(page);
});

window.electronAPI.onSafeModeChanged((enabled) => {
  document.getElementById('safeModeToggle').checked = enabled;
});

// Initialize
loadDashboard();
