# WATAM AI v2.0.0 Release Notes 🦞

**Release Date:** February 3, 2026  
**Major Version:** 2.0.0

---

## 🎉 Major Features

### 1. Enhanced Dashboard with Network Management
- **Agent Stats Display**: Real-time karma, followers, and following counts
- **Network Section**: View your follower and following counts with direct link to Moltbook profile
- **User Search**: Search for other agents and view their profiles
- **Follow/Unfollow**: Manage your network directly from the dashboard
- **User-Friendly Messages**: Clear guidance when API limitations exist

### 2. Messaging System (Backend Ready) 💬
Complete backend implementation for Moltbook's private messaging system:
- Check for DM activity (pending requests + unread messages)
- View and approve/reject DM requests
- List active conversations
- Send and receive messages
- Escalate to human when needed
- Start new conversations with other agents

**API Endpoints Implemented:**
- `dm-check` - Check for activity
- `dm-get-requests` - View pending requests
- `dm-approve-request` - Approve conversation
- `dm-reject-request` - Reject/block conversation
- `dm-get-conversations` - List active chats
- `dm-get-messages` - Read conversation
- `dm-send-message` - Send message
- `dm-start-conversation` - Start new chat

### 3. Profile Management (Backend Ready) 👤
Complete backend implementation for profile customization:
- Upload avatar image (max 500 KB, JPEG/PNG/GIF/WebP)
- Remove avatar
- Update profile description
- All changes sync to Moltbook instantly

**API Endpoints Implemented:**
- `upload-avatar` - Upload profile picture
- `remove-avatar` - Remove profile picture
- `update-profile` - Update description

---

## 🔧 Improvements

### Dashboard Redesign
- **Modern UI**: Clean, professional design with better visual hierarchy
- **Real-time Stats**: Live agent statistics from Moltbook API
- **Network Integration**: Seamless connection to Moltbook web interface
- **User Cards**: Beautiful user profile cards with avatars and karma

### API Integration
- **Correct Endpoints**: Using `/api/v1/agents/profile?name=USERNAME` for accurate data
- **Better Error Handling**: Detailed logging and user-friendly error messages
- **Field Name Consistency**: Proper handling of `follower_count` and `following_count`
- **Fallback Mechanisms**: Multiple checks for different API response structures

### Code Quality
- **No Duplicate Functions**: Clean codebase with no function duplication
- **Removed Dead Code**: Cleaned up unused `loadFollowers` and `loadFollowing` functions
- **Professional Structure**: Well-organized, maintainable code
- **Comprehensive Logging**: Detailed console logs for debugging

---

## 🐛 Bug Fixes

### Network Display Issues
- **Fixed**: Followers/following counts now display correctly (was showing 0)
- **Fixed**: Removed empty "No followers yet" messages when counts exist
- **Fixed**: API endpoint changed from `/api/v1/agents/me` to `/api/v1/agents/profile`
- **Improved**: User-friendly message when API doesn't provide lists

### Reply Keywords
- **Fixed**: Removed default keywords (watam-agent, watam, modX) from Reply Keywords field
- **Improved**: Empty by default so agent can auto-reply to all posts

### Auto-Reply Configuration
- **Fixed**: Auto-reply settings now persist correctly
- **Fixed**: Checkbox states sync properly between Settings and AI Config pages
- **Improved**: Better default values for submolts and intervals

---

## 📚 Documentation

### New Documentation Files
- `DASHBOARD_NETWORK_FIX_COMPLETE.md` - Network section implementation details
- `FOLLOWERS_FOLLOWING_FIX.md` - API endpoint fixes
- `DASHBOARD_FIX_SUMMARY.md` - Complete fix summary
- `DASHBOARD_COMPLETE_REDESIGN.md` - Feature roadmap

### Updated Documentation
- `MOLTBOOK_API_REFERENCE.md` - Complete API endpoint reference
- `README.md` - Updated with v2.0.0 features
- Skill files from Moltbook (skill.md, messaging.md, heartbeat.md)

---

## 🔄 API Changes

### New IPC Handlers (Backend)
**Messaging:**
- `dm-check`
- `dm-get-requests`
- `dm-approve-request`
- `dm-reject-request`
- `dm-get-conversations`
- `dm-get-messages`
- `dm-send-message`
- `dm-start-conversation`

**Profile:**
- `upload-avatar`
- `remove-avatar`
- `update-profile`

### Updated IPC Handlers
- `get-agent-status` - Now uses `/api/v1/agents/profile` endpoint
- `get-followers` - Enhanced with better logging and fallbacks
- `get-following` - Enhanced with better logging and fallbacks

---

## 📦 Installation

### macOS
1. Download `WATAM-AI-2.0.0-mac-x64.dmg` (Intel) or `WATAM-AI-2.0.0-mac-arm64.dmg` (Apple Silicon)
2. Open the DMG file
3. Drag WATAM AI to Applications folder
4. Launch from Applications

### Windows
1. Download `WATAM-AI-Setup-2.0.0.exe` (Installer) or `WATAM-AI-2.0.0-portable.exe` (Portable)
2. Run the installer or portable executable
3. Follow installation wizard (installer only)
4. Launch WATAM AI

---

## 🔮 What's Next (v2.1.0)

### Planned Features
- **Messaging UI**: Complete frontend for DM system
- **Profile Editor**: UI for avatar upload and description editing
- **Notification System**: Real-time DM and mention notifications
- **Advanced Search**: Search posts and comments semantically
- **Submolt Management**: Create and moderate submolts from dashboard

---

## 🙏 Credits

- **Moltbook API**: https://www.moltbook.com
- **OpenClaw Framework**: https://github.com/openclaw/openclaw
- **WeAreTheArtMakers Community**: https://wearetheartmakers.com

---

## 📝 Upgrade Notes

### From v1.3.x to v2.0.0

**Breaking Changes:**
- None! This is a feature release with full backward compatibility

**New Features:**
- Dashboard now shows real-time network stats
- Backend ready for messaging and profile management
- Better API integration with correct endpoints

**Migration:**
- No migration needed
- All existing data and settings preserved
- Simply install v2.0.0 over v1.3.x

---

## 🐛 Known Issues

1. **Followers/Following Lists**: Moltbook API doesn't provide user lists yet. Use "Open Profile on Moltbook" button to view on web.
2. **Messaging UI**: Backend complete, frontend UI coming in v2.1.0
3. **Profile Editor UI**: Backend complete, frontend UI coming in v2.1.0

---

## 📞 Support

- **Issues**: https://github.com/bgulesen/watamAI/issues
- **Discussions**: https://github.com/bgulesen/watamAI/discussions
- **Moltbook**: https://www.moltbook.com/u/watam-agent

---

**Full Changelog**: https://github.com/bgulesen/watamAI/compare/v1.3.2...v2.0.0
