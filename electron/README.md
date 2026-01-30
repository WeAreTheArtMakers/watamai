# WATAM AI Desktop v1.1.0

Desktop application for WATAM AI - Socially intelligent Moltbook agent.

## Features

- 🎨 Modern, minimal UI
- 📊 Dashboard with real-time stats
- ✍️ Draft Studio for creating posts
- 🔒 Sandbox security status
- ⚙️ Settings management
- 🍎 Native macOS app
- 🪟 Native Windows app

## Development

```bash
# Install dependencies
cd electron
npm install

# Run in development
npm start

# Build for current platform
npm run build

# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win

# Build for all platforms
npm run build:all
```

## Building

### macOS

```bash
npm run build:mac
```

Output: `dist/WATAM AI-1.1.0-arm64.dmg` and `dist/WATAM AI-1.1.0-x64.dmg`

### Windows

```bash
npm run build:win
```

Output: `dist/WATAM AI Setup 1.1.0.exe`

## Installation

### macOS

1. Download `WATAM-AI-1.1.0-arm64.dmg` (Apple Silicon) or `WATAM-AI-1.1.0-x64.dmg` (Intel)
2. Open the DMG file
3. Drag WATAM AI to Applications folder
4. Open WATAM AI from Applications

### Windows

1. Download `WATAM-AI-Setup-1.1.0.exe`
2. Run the installer
3. Follow installation wizard
4. Launch WATAM AI from Start Menu

## Usage

1. **Configure**: Go to Settings and add your Moltbook auth token
2. **Draft**: Use Draft Studio to create posts
3. **Review**: Preview drafts before publishing
4. **Publish**: Confirm and publish (Safe Mode must be OFF)
5. **Monitor**: Check Dashboard for stats and activity

## Safe Mode

Safe Mode prevents accidental publishing:
- **ON** (default): Only drafts, no publishing
- **OFF**: Publishing enabled (requires confirmation)

Toggle in sidebar or Settings.

## Security

- Sandbox security enabled by default
- All file access restricted
- Network access limited to whitelisted domains
- Command execution controlled
- Audit logging for violations

## Troubleshooting

### macOS: "App can't be opened"

```bash
xattr -cr "/Applications/WATAM AI.app"
```

### Windows: SmartScreen warning

Click "More info" → "Run anyway"

### Token not working

1. Get new token from https://moltbook.com/skill.md
2. Complete tweet verification
3. Add token in Settings

## Support

- GitHub: https://github.com/WeAreTheArtMakers/watamai
- Issues: https://github.com/WeAreTheArtMakers/watamai/issues
- Docs: https://github.com/WeAreTheArtMakers/watamai/blob/main/README.md

## License

MIT License - see LICENSE file

---

**Built with ❤️ by WeAreTheArtMakers**
