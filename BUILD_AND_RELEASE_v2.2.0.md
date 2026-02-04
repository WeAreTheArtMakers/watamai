# Build and Release Instructions - v2.2.0

## Pre-Release Checklist

- [x] Version updated to 2.2.0 in `electron/package.json`
- [x] README.md updated with new features
- [x] RELEASE_NOTES_v2.2.0.md created
- [x] .env.example created
- [x] .env excluded from git
- [x] All code tested and working
- [x] No syntax errors
- [x] No function duplication
- [x] Agent registration system tested
- [x] Language switching tested
- [x] AI translation tested

## Build Commands

### 1. Install Dependencies (if needed)
```bash
cd electron
npm install
```

### 2. Build for macOS
```bash
# Apple Silicon (M1/M2/M3)
npm run build:mac -- --arm64

# Intel
npm run build:mac -- --x64

# Both architectures
npm run build:mac
```

### 3. Build for Windows
```bash
npm run build:win
```

### 4. Build for All Platforms
```bash
npm run build:all
```

## Build Output

Builds will be created in `electron/dist/`:

- **macOS (Apple Silicon)**: `WATAM.AI-2.2.0-arm64.dmg`
- **macOS (Intel)**: `WATAM.AI-2.2.0.dmg`
- **Windows (Installer)**: `WATAM.AI.Setup.2.2.0.exe`
- **Windows (Portable)**: `WATAM.AI.2.2.0.exe`

## Git Commands

### 1. Check Status
```bash
git status
```

### 2. Add All Changes (EXCEPT .env)
```bash
# Add all files
git add .

# Verify .env is NOT staged
git status

# If .env appears, remove it
git reset HEAD .env
```

### 3. Commit Changes
```bash
git commit -m "Release v2.2.0: Bilingual Interface & AI Translation

Major Features:
- Complete Turkish and English language support
- AI-powered translation for posts and comments
- Auto AI reply for comment responses
- Skills page reorganization with working buttons
- IP limit warning for agent registration

Improvements:
- Enhanced Draft Studio with visible WATAM CTA checkbox
- Better Ollama model loading with translations
- Export/Import configuration functionality
- Professional registration warnings

Bug Fixes:
- Fixed Ollama model dropdown translations
- Fixed API key hiding for Ollama
- Fixed Include WATAM CTA checkbox visibility
- Fixed Skills page button functionality
- Added defensive null checks

Technical:
- Added .env.example for new users
- Updated README.md with new features
- Created comprehensive release notes
- No breaking changes - fully backward compatible"
```

### 4. Create Git Tag
```bash
git tag -a v2.2.0 -m "Release v2.2.0: Bilingual Interface & AI Translation"
```

### 5. Push to GitHub
```bash
# Push commits
git push origin main

# Push tags
git push origin v2.2.0
```

## GitHub Release

### 1. Go to GitHub Releases
https://github.com/bgulesen/watamAI/releases/new

### 2. Fill in Release Information

**Tag**: `v2.2.0`

**Release Title**: `v2.2.0 - Bilingual Interface & AI Translation`

**Description**:
```markdown
# 🌐 WATAM AI v2.2.0 - Bilingual Interface & AI Translation

## 🎉 Major Features

### Complete Bilingual Support
- 🇬🇧 Full English interface
- 🇹🇷 Full Turkish interface (Tam Türkçe arayüz)
- Instant language switching without page reload
- 200+ translated UI elements

### AI-Powered Translation
- Translate posts and comments with one click
- Context-aware translations
- Preserves formatting and mentions

### Auto AI Reply
- Comment replies now automatically generate AI responses
- No manual input needed
- Smart mention handling

## ✨ Improvements

- ⚙️ Skills page reorganized with working configuration buttons
- ⚠️ Clear IP limit warnings for agent registration
- 📝 Enhanced Draft Studio with improved WATAM CTA checkbox
- 🔧 Better Ollama model loading with translations

## 🔧 Bug Fixes

- Fixed Ollama model dropdown translations
- Fixed API key hiding for Ollama
- Fixed Include WATAM CTA checkbox visibility
- Fixed Skills page button functionality
- Added defensive null checks

## 📦 For Existing Users

- Your existing agent will continue to work
- Use "Load from .env" to load your credentials
- No need to re-register
- Fully backward compatible

## 📥 Downloads

Choose the appropriate version for your system:

- **macOS (Apple Silicon)**: WATAM.AI-2.2.0-arm64.dmg
- **macOS (Intel)**: WATAM.AI-2.2.0.dmg
- **Windows (Installer)**: WATAM.AI.Setup.2.2.0.exe
- **Windows (Portable)**: WATAM.AI.2.2.0.exe

## 📝 Installation

### macOS
1. Download the appropriate .dmg file
2. Open the .dmg file
3. Drag WATAM AI to Applications folder
4. Right-click and select "Open" (first time only)

### Windows
1. Download the .exe file
2. Run the installer
3. Click "More info" then "Run anyway" if prompted
4. Follow installation wizard

## 🆕 New Users

1. Download and install the app
2. Copy `.env.example` to `.env`
3. Fill in your Moltbook agent credentials
4. Use "Load from .env" in Settings
5. Start using the app!

## 📚 Documentation

- [Full Release Notes](RELEASE_NOTES_v2.2.0.md)
- [README](README.md)
- [Installation Guide](INSTALLATION.md)

## 🙏 Credits

Thanks to the WATAM community for feedback and testing!

---

**Full Changelog**: [v2.0.0...v2.2.0](https://github.com/bgulesen/watamAI/compare/v2.0.0...v2.2.0)
```

### 3. Upload Build Files

Drag and drop the following files from `electron/dist/`:
- `WATAM.AI-2.2.0-arm64.dmg`
- `WATAM.AI-2.2.0.dmg`
- `WATAM.AI.Setup.2.2.0.exe`
- `WATAM.AI.2.2.0.exe`

### 4. Publish Release

Click "Publish release"

## Post-Release

### 1. Verify Downloads
- Test download links
- Verify file sizes
- Check installation on both platforms

### 2. Update Documentation
- Ensure README.md is up to date
- Verify all links work
- Check screenshots if any

### 3. Announce Release
- Post on Moltbook
- Share with community
- Update any external documentation

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf electron/dist electron/node_modules
cd electron
npm install
npm run build
```

### .env Accidentally Committed
```bash
# Remove from git but keep local file
git rm --cached .env
git commit -m "Remove .env from repository"
git push
```

### Tag Already Exists
```bash
# Delete local tag
git tag -d v2.2.0

# Delete remote tag
git push origin :refs/tags/v2.2.0

# Create new tag
git tag -a v2.2.0 -m "Release v2.2.0"
git push origin v2.2.0
```

## Notes

- Always test builds before releasing
- Verify .env is not in git
- Check all download links after release
- Monitor for issues in first 24 hours
- Be ready to hotfix if needed

---

**Ready to build and release v2.2.0!** 🚀
