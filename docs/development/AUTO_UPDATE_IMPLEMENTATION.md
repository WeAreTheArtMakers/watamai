# Auto-Update Implementation - v1.2.0

## Overview
Implemented automatic update checking and installation using `electron-updater`. Users will be notified when new versions are available and can download/install updates directly from the app.

## Features

### 1. Automatic Update Check on Startup
- Checks for updates 3 seconds after app launch
- Only runs in production builds (not in development)
- Silent check - only notifies if update is available

### 2. Manual Update Check
- Added "Check for Updates" button in Settings page
- Shows current version (v1.2.0)
- Displays update status with user-friendly messages

### 3. Update Download
- User is prompted when update is available
- Can choose to download now or later
- Shows download progress with percentage
- Non-blocking - app continues to work during download

### 4. Update Installation
- Update is installed when user quits the app
- User can choose to restart immediately or later
- Seamless installation process

## Implementation Details

### Files Modified

#### 1. `electron/main.js`
- Added `electron-updater` import
- Configured auto-updater settings:
  - `autoDownload: false` - Ask user before downloading
  - `autoInstallOnAppQuit: true` - Install on quit
- Added event handlers:
  - `checking-for-update` - Log check start
  - `update-available` - Show dialog to user
  - `update-not-available` - Log no updates
  - `error` - Log errors
  - `download-progress` - Show progress to user
  - `update-downloaded` - Prompt to restart
- Added IPC handler `check-for-updates` for manual checks
- Auto-check on startup (3 second delay)

#### 2. `electron/preload.js`
- Added `checkForUpdates` to electronAPI bridge
- Exposes update check to renderer process

#### 3. `electron/renderer/settings.js`
- Added `checkForUpdates()` function
- Shows update status in UI
- Handles success/error states
- Exported in `window.settingsModule`

#### 4. `electron/renderer/index.html`
- Added "App Updates" card in Settings page
- Shows current version (v1.2.0)
- "Check for Updates" button
- Status message area for results

#### 5. `electron/package.json`
- Added `electron-updater` dependency
- Added `publish` configuration:
  ```json
  "publish": {
    "provider": "github",
    "owner": "bgulesen",
    "repo": "watamAI"
  }
  ```

## User Experience

### When Update is Available
1. User opens app → Auto-check runs after 3 seconds
2. Dialog appears: "A new version (X.X.X) is available!"
3. User clicks "Download" → Download starts with progress
4. When complete: "Update downloaded successfully!"
5. User can restart now or later
6. On quit: Update installs automatically

### Manual Check
1. User goes to Settings page
2. Clicks "Check for Updates" button
3. Button shows "Checking..."
4. Result appears:
   - "🎉 Update available! Version X.X.X is ready to download."
   - "✅ You're up to date! (vX.X.X)"
   - "ℹ️ Update check is only available in production builds" (dev mode)

## GitHub Release Requirements

For auto-update to work, GitHub releases must include:

### Required Files
- `WATAM AI-1.2.0.dmg` (macOS Intel)
- `WATAM AI-1.2.0-arm64.dmg` (macOS Apple Silicon)
- `WATAM AI Setup 1.2.0.exe` (Windows Installer)
- `WATAM AI 1.2.0.exe` (Windows Portable)

### Required Metadata Files (auto-generated)
- `WATAM AI-1.2.0.dmg.blockmap`
- `WATAM AI-1.2.0-arm64.dmg.blockmap`
- `WATAM AI Setup 1.2.0.exe.blockmap`
- `latest-mac.yml` (macOS update info)
- `latest.yml` (Windows update info)

These files are automatically generated during build and must be included in the GitHub release.

## Testing

### Development Mode
- Auto-update is disabled in development
- Manual check shows: "Update check is only available in production builds"

### Production Mode
1. Build app: `npm run build:all`
2. Install built app
3. Go to Settings → Check for Updates
4. Should check against GitHub releases

### Simulating Update
1. Change version in `package.json` to lower version (e.g., 1.1.0)
2. Build and install
3. Create GitHub release with v1.2.0
4. Open app → Should detect update available

## Known Limitations

### 1. Code Signing
- macOS builds are not code-signed (no valid certificate)
- Users may see "unidentified developer" warning
- Auto-update will still work, but may require manual approval

### 2. Windows SmartScreen
- Windows builds are not signed
- Users may see SmartScreen warning on first run
- Auto-update will work after initial approval

### 3. Update Server
- Requires GitHub releases to be public
- Requires proper release tagging (v1.2.0, v1.3.0, etc.)
- Requires all build artifacts to be uploaded

## Future Improvements

1. **Code Signing**
   - Get Apple Developer certificate for macOS
   - Get Windows code signing certificate
   - Eliminates security warnings

2. **Delta Updates**
   - Only download changed files
   - Faster updates for users
   - Requires additional configuration

3. **Update Channels**
   - Stable channel (default)
   - Beta channel (early access)
   - Allow users to opt-in to beta

4. **Rollback**
   - Keep previous version
   - Allow rollback if update fails
   - Automatic rollback on crash

## Troubleshooting

### Update Check Fails
- Check internet connection
- Verify GitHub repository is public
- Check GitHub API rate limits
- Verify release exists with proper version tag

### Update Download Fails
- Check available disk space
- Verify GitHub release has all required files
- Check firewall/antivirus settings

### Update Install Fails
- Check app permissions
- Verify app is not running from read-only location
- Check available disk space
- Try manual installation

## Version History

- **v1.2.0** - Initial auto-update implementation
  - Automatic update checking
  - Manual update check in Settings
  - Download progress tracking
  - Install on quit
