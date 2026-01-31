# Build Instructions for WATAM AI v1.2.0

## Prerequisites

### Required Software
- **Node.js** 22.x or higher
- **npm** 10.x or higher
- **Git**

### Platform-Specific Requirements

#### macOS
- **Xcode Command Line Tools**
  ```bash
  xcode-select --install
  ```
- For code signing (optional):
  - Apple Developer account
  - Valid Developer ID certificate

#### Windows
- **Windows 10/11**
- **Visual Studio Build Tools** (for native modules)
  ```bash
  npm install --global windows-build-tools
  ```

## Quick Build

### 1. Clone Repository
```bash
git clone https://github.com/WeAreTheArtMakers/watamai.git
cd watamai
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install Electron dependencies
cd electron
npm install
cd ..
```

### 3. Build TypeScript
```bash
npm run build
```

### 4. Run Tests
```bash
npm test
```

### 5. Build Desktop App

#### Option A: Build for Current Platform Only
```bash
cd electron
npm run build
```

#### Option B: Build for All Platforms (macOS only)
```bash
cd electron
npm run build:all
```

This creates:
- **macOS**: `electron/dist/WATAM-AI-1.2.0-arm64.dmg` (Apple Silicon)
- **macOS**: `electron/dist/WATAM-AI-1.2.0-x64.dmg` (Intel)
- **Windows**: `electron/dist/WATAM-AI-Setup-1.2.0.exe`
- **Windows**: `electron/dist/WATAM-AI-1.2.0-win.zip` (Portable)

#### Option C: Use Build Script
```bash
./scripts/build-desktop.sh
```

## Build Outputs

### macOS
- **DMG Installer**: `electron/dist/WATAM-AI-1.2.0-arm64.dmg`
- **DMG Installer**: `electron/dist/WATAM-AI-1.2.0-x64.dmg`
- **ZIP Archive**: `electron/dist/WATAM-AI-1.2.0-arm64-mac.zip`
- **ZIP Archive**: `electron/dist/WATAM-AI-1.2.0-x64-mac.zip`

### Windows
- **NSIS Installer**: `electron/dist/WATAM-AI-Setup-1.2.0.exe`
- **Portable**: `electron/dist/WATAM-AI-1.2.0-win.zip`

## Icon Generation

The project includes placeholder icons. For production builds:

### Option 1: Use electron-icon-builder
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=electron/build/icon.svg --output=electron/build
```

### Option 2: Manual Creation

#### macOS (.icns)
1. Create PNG icons at these sizes:
   - 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
2. Use iconutil:
   ```bash
   mkdir icon.iconset
   # Copy PNGs to icon.iconset/
   iconutil -c icns icon.iconset
   mv icon.icns electron/build/
   ```

#### Windows (.ico)
1. Create PNG icon at 256x256
2. Use ImageMagick:
   ```bash
   convert icon.png -define icon:auto-resize=256,128,64,48,32,16 electron/build/icon.ico
   ```

## Code Signing (Optional)

### macOS
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
cd electron
npm run build:mac
```

### Windows
```bash
set CSC_LINK=C:\path\to\certificate.pfx
set CSC_KEY_PASSWORD=your_password
cd electron
npm run build:win
```

## Troubleshooting

### Build Fails on macOS
- Ensure Xcode Command Line Tools are installed
- Check that you have enough disk space (>5GB)
- Try cleaning: `rm -rf electron/dist electron/node_modules`

### Build Fails on Windows
- Install Visual Studio Build Tools
- Run as Administrator
- Check antivirus isn't blocking electron-builder

### Icon Issues
- Ensure icon files exist in `electron/build/`
- Use proper formats (.icns for macOS, .ico for Windows)
- Check file permissions

### Memory Issues
- Increase Node.js memory: `export NODE_OPTIONS=--max-old-space-size=4096`
- Close other applications
- Build platforms separately instead of all at once

## CI/CD

### GitHub Actions (Recommended)
Create `.github/workflows/build.yml`:

```yaml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: |
          npm install
          cd electron && npm install
      
      - name: Build TypeScript
        run: npm run build
      
      - name: Build Electron app
        run: cd electron && npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: electron/dist/*
```

## Distribution

### Upload to GitHub Releases
```bash
gh release upload v1.2.0 electron/dist/*.dmg electron/dist/*.exe electron/dist/*.zip
```

### Manual Upload
1. Go to https://github.com/WeAreTheArtMakers/watamai/releases
2. Click "Edit" on v1.2.0 release
3. Drag and drop installer files
4. Click "Update release"

## Testing Builds

### macOS
```bash
# Install DMG
open electron/dist/WATAM-AI-1.2.0-arm64.dmg

# Or run from ZIP
unzip electron/dist/WATAM-AI-1.2.0-arm64-mac.zip
open "WATAM AI.app"
```

### Windows
```bash
# Run installer
electron\dist\WATAM-AI-Setup-1.2.0.exe

# Or run portable
electron\dist\WATAM-AI-1.2.0-win.zip
# Extract and run WATAM-AI.exe
```

## Build Time Estimates

- **TypeScript build**: ~10 seconds
- **Tests**: ~5 seconds
- **Electron build (single platform)**: 2-5 minutes
- **Electron build (all platforms)**: 5-10 minutes

## File Sizes

- **macOS DMG**: ~100-150 MB
- **Windows Installer**: ~80-120 MB
- **Windows Portable**: ~100-150 MB

## Support

- **Issues**: https://github.com/WeAreTheArtMakers/watamai/issues
- **Discussions**: https://github.com/WeAreTheArtMakers/watamai/discussions
- **Community**: https://moltbook.com/m/watam

## License

MIT License - See [LICENSE](LICENSE) file
