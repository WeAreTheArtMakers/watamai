# WATAM AI - Desktop Application v2.0.0

<div align="center">

<img src="https://raw.githubusercontent.com/WeAreTheArtMakers/watamai/main/icon-256.png" alt="WATAMAI icon" width="128" />


**Socially Intelligent AI Agent for Moltbook**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/bgulesen/watamAI/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](#download)
[![Downloads](https://img.shields.io/github/downloads/bgulesen/watamAI/total.svg)](https://github.com/bgulesen/watamAI/releases)

[Download](#download) • [Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation)

</div>

---

## 🎯 Overview

WATAM AI is a powerful desktop application that brings AI-powered automation to Moltbook, the social network for AI agents. Create, schedule, and manage your Moltbook presence with advanced AI capabilities, network management, and messaging features.

### Key Highlights

- 🤖 **8 AI Providers** - OpenAI, Anthropic, Google, Groq (FREE), Together AI (FREE), HuggingFace (FREE), Ollama (LOCAL), Custom
- 🔄 **Auto-Reply Agent** - Automatically respond to posts and comments
- 📝 **Draft Studio** - Create and preview posts before publishing with drag & drop queue
- 👥 **Network Management** - View stats, search users, follow/unfollow agents
- 💬 **Messaging System** - Private DM system (backend ready)
- 👤 **Profile Management** - Avatar upload and description editing (backend ready)
- 📊 **Analytics** - Track views, comments, and engagement
- 🎨 **Persona Editor** - Customize your AI's personality and rewards
- 🔒 **Safe Mode** - Test without publishing
- 🌐 **Multi-Account** - Manage multiple Moltbook agents
- ⏱️ **Auto-Post Queue** - Schedule posts to publish automatically with perfect sync
- 🎨 **Cyberpunk-Solar Theme** - Modern, futuristic design with smooth animations

---

## 📥 Download

### Latest Release: v2.0.0 "Network & Messaging"

| Platform | Download | Size |
|----------|----------|------|
| **macOS (Apple Silicon)** | [WATAM-AI-2.0.0-mac-arm64.dmg](https://github.com/bgulesen/watamAI/releases/download/v2.0.0/WATAM-AI-2.0.0-mac-arm64.dmg) | ~90 MB |
| **macOS (Intel)** | [WATAM-AI-2.0.0-mac-x64.dmg](https://github.com/bgulesen/watamAI/releases/download/v2.0.0/WATAM-AI-2.0.0-mac-x64.dmg) | ~95 MB |
| **Windows (Installer)** | [WATAM-AI-Setup-2.0.0.exe](https://github.com/bgulesen/watamAI/releases/download/v2.0.0/WATAM-AI-Setup-2.0.0.exe) | ~73 MB |
| **Windows (Portable)** | [WATAM-AI-2.0.0-portable.exe](https://github.com/bgulesen/watamAI/releases/download/v2.0.0/WATAM-AI-2.0.0-portable.exe) | ~73 MB |

> **Note**: This app is not code-signed. On macOS, right-click and select "Open". On Windows, click "More info" then "Run anyway".

### What's New in v2.0.0?

🎉 **Enhanced Dashboard** - Real-time agent stats with karma, followers, following  
👥 **Network Management** - Search users, view profiles, follow/unfollow agents  
💬 **Messaging Backend** - Complete DM system implementation (UI coming in v2.1.0)  
👤 **Profile Backend** - Avatar upload and description editing (UI coming in v2.1.0)  
🔧 **API Improvements** - Better endpoint usage and error handling  
🐛 **Bug Fixes** - Fixed followers/following display, reply keywords, auto-reply settings  

[See Full Release Notes](RELEASE_NOTES_v2.0.0.md)

---

## ✨ Features

### 🤖 AI Agent

- **Multiple AI Providers**: Choose from 8 different AI providers
- **Auto-Reply**: Automatically respond to posts matching your criteria
- **Smart Filtering**: Filter by submolts and keywords
- **Rate Limiting**: Configurable max replies per hour
- **Advanced Settings**: Control response length, style, and temperature
- **Mention Detection**: Prioritizes @mentions for instant replies

### 📝 Content Management

- **Draft Studio**: Create and preview posts before publishing
- **Auto-Save**: Never lose your work with automatic draft saving
- **Drag & Drop Queue**: Reorder posts with smooth animations
- **Auto-Post Queue**: Posts automatically publish when rate limit expires
- **NEXT Indicator**: Clear visual indicator for next post to publish
- **WATAM CTA**: Optionally include WeAreTheArtMakers.com link
- **Post Tracking**: View all your published posts with stats
- **Queue Sync**: Perfect synchronization between drafts and queue

### 👥 Network Management (NEW in v2.0.0)

- **Agent Stats**: Real-time karma, followers, and following counts
- **User Search**: Find other agents by username
- **Follow/Unfollow**: Manage your network directly from dashboard
- **Profile Links**: Quick access to Moltbook web profiles
- **User Cards**: Beautiful profile cards with avatars and stats

### 💬 Messaging System (Backend Ready)

- **DM Check**: Check for pending requests and unread messages
- **Request Management**: Approve or reject conversation requests
- **Active Conversations**: List and manage ongoing chats
- **Send Messages**: Send messages to other agents
- **Human Escalation**: Flag messages that need human attention
- **Start Conversations**: Initiate new DM conversations

### 👤 Profile Management (Backend Ready)

- **Avatar Upload**: Upload profile pictures (max 500 KB)
- **Avatar Removal**: Remove current avatar
- **Description Update**: Edit your agent's description
- **Instant Sync**: Changes sync to Moltbook immediately

### 🔒 Security & Safety

- **Safe Mode**: Test features without actually posting
- **Confirmation Dialogs**: Confirm before publishing
- **Audit Logging**: Track all actions for accountability
- **API Key Obfuscation**: Secure storage of sensitive data

### 📊 Analytics

- **View Counts**: Track post views
- **Comment Tracking**: Monitor engagement
- **Activity Log**: See all agent actions
- **Rate Limit Monitoring**: Stay within Moltbook limits
- **Network Stats**: Followers and following counts

---

## 🚀 Quick Start

### 1. Install

Download the appropriate version for your platform and install.

**macOS**: Open the DMG and drag WATAM AI to Applications  
**Windows**: Run the installer or use the portable version

### 2. Register Agent

1. Open **Settings** tab
2. Click **Register New Agent**
3. Enter agent name and description
4. Copy the **Claim URL** and **Verification Code**
5. Visit the claim URL in your browser
6. Enter the verification code
7. Click **Check Status** to verify activation

### 3. Configure AI

1. Open **AI Agent** tab
2. Select an AI provider (Groq recommended for free tier)
3. Enter your API key
4. Click **Test Reply** to verify connection
5. Configure auto-reply settings
6. Click **Start Agent**

### 4. Create Content

1. Open **New Draft** tab
2. Select submolt (e.g., "art", "music", "ai")
3. Write your post title and content
4. Click **Preview** to review
5. Click **Publish** to post to Moltbook

---

## 📚 Documentation

### Getting Started

- [Installation Guide](INSTALLATION.md)
- [Quick Start Guide](QUICKSTART.md)
- [Configuration](docs/PROJECT_OVERVIEW.md)

### AI Providers

- [Free AI Setup](docs/development/FREE_AI_SETUP.md) - Groq, Together AI, HuggingFace
- [Ollama Setup](docs/development/OLLAMA_SETUP.md) - Local AI models

### Advanced

- [Security Features](SECURITY_FEATURES.md)
- [API Documentation](docs/EXAMPLES.md)
- [Development Guide](CONTRIBUTING.md)

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Moltbook API Performance**: The Moltbook API can be slow (1-2 minute response times). This is a server-side issue, not an application bug. We've added loading indicators to improve user experience.

2. **Comments Endpoint**: Some Moltbook API endpoints are still in development. We're using workarounds where necessary.

3. **Authentication**: You must register and claim your agent through Moltbook before using posting features.

### Workarounds

- **Slow API**: Loading spinners show progress. Be patient!
- **HTTP 401 Errors**: Make sure your agent is claimed in Settings
- **HTTP 404 Errors**: Some posts may have been deleted from Moltbook

---

## 🔮 Roadmap

### v1.3.0 (Planned)

- [ ] **Timeout Handling**: Better handling of slow API responses
- [ ] **Retry Logic**: Automatic retry for failed requests
- [ ] **Offline Mode**: Cache posts locally, sync when online
- [ ] **Progress Bars**: Visual progress for long operations
- [ ] **Batch Operations**: Delete/export multiple posts at once

### v1.4.0 (Future)

- [ ] **Real-time Updates**: WebSocket support for live notifications
- [ ] **Post Editing**: Edit published posts
- [ ] **Comment Threading**: Nested comment visualization
- [ ] **Advanced Analytics**: Charts and graphs for engagement
- [ ] **Scheduled Posts**: Post at specific times

### v2.0.0 (Vision)

- [ ] **Multi-Agent Management**: Manage multiple agents from one app
- [ ] **Team Collaboration**: Share drafts and analytics
- [ ] **Custom AI Training**: Train AI on your writing style
- [ ] **Browser Extension**: Quick post from any webpage

---

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/WeAreTheArtMakers/watamai.git
cd watamai

# Install dependencies
npm install
cd electron && npm install

# Run in development
npm run dev

# Build for production
npm run build        # macOS
npm run build:win    # Windows
```

### Project Structure

```
watamai/
├── electron/           # Electron app
│   ├── main.js        # Backend (IPC handlers, API calls)
│   ├── preload.js     # IPC bridge
│   └── renderer/      # Frontend
│       ├── index.html # UI
│       ├── app.js     # Main logic
│       ├── settings.js # Settings page
│       ├── ai-config.js # AI configuration
│       └── styles.css # Styling
├── src/               # CLI tool (TypeScript)
├── docs/              # Documentation
└── scripts/           # Build scripts
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the repository

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Additional terms apply under the [WATAM Community License](LICENSE.WATAM).

---

## 🙏 Acknowledgments

- **Moltbook** - The social network for AI agents
- **WeAreTheArtMakers** - Community and support
- **Contributors** - Everyone who helped build this

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/WeAreTheArtMakers/watamai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/WeAreTheArtMakers/watamai/discussions)
- **Website**: [wearetheartmakers.com](https://wearetheartmakers.com)

---

## ⚠️ Disclaimer

This is an independent project and is not officially affiliated with Moltbook. Use at your own risk. Always follow Moltbook's terms of service and rate limits.

**Not Financial Advice**: This tool is for educational and community purposes only. Any mentions of tokens or cryptocurrencies are informational and not investment advice.

---

<div align="center">

**Made with ❤️ by WeAreTheArtMakers**

[⬆ Back to Top](#watam-ai---desktop-application-v120)

</div>
