# Changelog

All notable changes to WATAM AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-03

### Added
- **Enhanced Dashboard with Network Management**
  - Real-time agent stats display (karma, followers, following)
  - Network section with follower/following counts
  - User search functionality to find other agents
  - Follow/Unfollow buttons for network management
  - Direct link to Moltbook profile when API limitations exist
  - User-friendly messages for better UX
- **Messaging System (Backend Complete) 💬**
  - Complete backend implementation for Moltbook's private messaging
  - Check for DM activity (pending requests + unread messages)
  - View and approve/reject DM requests
  - List active conversations
  - Send and receive messages
  - Escalate to human when needed
  - Start new conversations with other agents
  - 8 new IPC handlers: `dm-check`, `dm-get-requests`, `dm-approve-request`, `dm-reject-request`, `dm-get-conversations`, `dm-get-messages`, `dm-send-message`, `dm-start-conversation`
- **Profile Management (Backend Complete) 👤**
  - Upload avatar image (max 500 KB, JPEG/PNG/GIF/WebP)
  - Remove avatar
  - Update profile description
  - All changes sync to Moltbook instantly
  - 3 new IPC handlers: `upload-avatar`, `remove-avatar`, `update-profile`
- **Documentation**
  - `DASHBOARD_NETWORK_FIX_COMPLETE.md` - Network implementation details
  - `FOLLOWERS_FOLLOWING_FIX.md` - API endpoint fixes
  - `DASHBOARD_FIX_SUMMARY.md` - Complete fix summary
  - `DASHBOARD_COMPLETE_REDESIGN.md` - Feature roadmap
  - Updated `MOLTBOOK_API_REFERENCE.md` with complete API reference
  - Integrated Moltbook skill files (skill.md, messaging.md, heartbeat.md)

### Fixed
- **Network Display Issues**
  - Fixed followers/following counts showing 0 (now displays correct values)
  - Fixed API endpoint from `/api/v1/agents/me` to `/api/v1/agents/profile?name=USERNAME`
  - Removed empty "No followers yet" messages when counts exist
  - Added user-friendly message when API doesn't provide user lists
- **Reply Keywords Configuration**
  - Removed default keywords (watam-agent, watam, modX) from Reply Keywords field
  - Now empty by default so agent can auto-reply to all posts
  - Fixed in both `index.html` and `ai-config.js`
- **Auto-Reply Settings**
  - Fixed auto-reply settings persistence
  - Fixed checkbox states syncing between Settings and AI Config pages
  - Improved default values for submolts and intervals
- **Code Quality**
  - Removed duplicate functions (no function duplication)
  - Cleaned up unused `loadFollowers` and `loadFollowing` functions
  - Removed dead code for better maintainability

### Changed
- **API Integration**
  - Using correct endpoint `/api/v1/agents/profile?name=USERNAME` for accurate data
  - Better error handling with detailed logging
  - Proper handling of `follower_count` and `following_count` field names
  - Multiple fallback checks for different API response structures
- **Dashboard UI**
  - Modern, clean design with better visual hierarchy
  - Beautiful user profile cards with avatars and karma
  - Network section with tabs for followers/following
  - Seamless integration with Moltbook web interface
- **Code Structure**
  - Professional, well-organized codebase
  - Comprehensive logging for debugging
  - Better separation of concerns
  - Enhanced error messages

### Technical
- `electron/main.js`: Added 11 new IPC handlers (8 messaging + 3 profile)
- `electron/preload.js`: Exposed new messaging and profile methods
- `electron/renderer/app.js`: Updated network stats loading, removed dead code
- `electron/renderer/styles.css`: Added `.network-message` styles
- `electron/package.json`: Version bump to 2.0.0

## [1.3.2] - 2026-02-02

### Added
- **Queue Synchronization System**
  - Automatic cleanup of orphaned queue items on page load
  - Smart queue filtering - only shows items with matching drafts
  - Enhanced position calculation using findIndex for accuracy
  - Queue count now perfectly matches draft count
- **Enhanced NEXT Badge**
  - Redesigned "🚀 NEXT TO POST" badge in top-right corner
  - Larger, more prominent design with glow effect
  - Smooth pulse animation for attention
  - Better positioning outside card border
- **Auto-Reply Debugging**
  - Enhanced followers/following detection (checks profile and user objects)
  - More detailed logging for troubleshooting
  - Better error messages with actionable guidance
  - New debug guide document

### Fixed
- **Draft Management**
  - Fixed duplicate draft creation when saving same draft twice
  - Fixed WATAM suffix check in duplicate detection
  - Queue items now removed when draft is deleted
  - Position numbering shows correctly (#1, #2, #3, #4 instead of #6, #7, etc.)
- **Queue Display**
  - Fixed queue count mismatch (showed 8 but only 4 drafts existed)
  - Fixed green border not showing on position #1
  - Fixed NEXT badge visibility and readability
  - Drag & drop now has 500ms debounce to prevent reload spam
- **Visual Issues**
  - NEXT badge now highly visible with proper contrast
  - Badge positioned to avoid overlap with content
  - Improved cyberpunk-solar theme consistency

### Changed
- Queue now sorted by queuedAt timestamp (oldest first)
- Position calculation more reliable with explicit comparison
- updatePostQueueStatus now counts only queue items with drafts
- Improved console logging for debugging

### Technical
- `electron/renderer/app.js`: Queue sync, duplicate prevention, position calculation
- `electron/renderer/styles.css`: NEXT badge styling and positioning  
- `electron/main.js`: Followers/following detection enhancement
- `electron/package.json`: Version bump to 1.3.2

## [1.2.0] - 2026-02-01

### Added
- **Auto-Update System**
  - Automatic update checking on app startup
  - Manual "Check for Updates" button in Settings
  - Download progress tracking with percentage
  - Install on quit with option to restart immediately
  - GitHub releases integration
- **Comments System**
  - View comments on published posts
  - Reply to posts and comments
  - Comment rendering with proper author/body parsing
  - Loading states for slow API responses
  - Error handling with user-friendly messages
- **Enhanced Logging**
  - Detailed console logs for debugging
  - Post loading and rendering logs
  - Comment fetching and display logs
  - Button click and event tracking

### Fixed
- **Navigation Issues**
  - Fixed tab and menu navigation not working
  - Fixed HTML template string syntax errors
  - Improved event listener attachment
- **Comments Display**
  - Fixed comments not showing when clicking "View Comments"
  - Added proper error messages for failed comment loads
  - Added loading spinner for comment fetching
  - Fixed comment author and body parsing for different API formats
- **Safe Mode Toggle**
  - Fixed multiple notifications on toggle (5-7 reduced to 1)
  - Added global flag to prevent duplicate events
  - Synchronized sidebar and settings page toggles
- **Copy/Paste**
  - Fixed keyboard shortcuts (Cmd+C/V/X/A)
  - Added Edit menu with standard commands
  - Enabled context menu for text selection

### Changed
- Improved error handling throughout the app
- Better loading states with spinner animations
- Enhanced user notifications with emojis
- Updated Settings page with App Updates section
- Improved comment display with @ mentions

### Technical
- Added `electron-updater` dependency
- Configured GitHub releases for auto-update
- Added IPC handlers for update checking
- Enhanced preload.js with update bridge
- Improved app.js with better logging
- Updated package.json with publish configuration

## [1.1.0] - 2026-01-31

### Added
- **Desktop App** (Electron)
  - Modern, minimal UI with dark theme
  - Dashboard with real-time stats
  - Draft Studio for creating posts
  - Settings panel
  - Logs viewer
  - Safe Mode toggle in sidebar
- **Native Builds**
  - macOS .dmg installer (Apple Silicon + Intel)
  - Windows .exe installer
  - Auto-update support (coming soon)
- **UI Features**
  - Real-time rate limit display
  - Security status monitoring
  - Draft preview before publishing
  - Copy as Markdown
  - Confirmation dialogs for publishing

### Changed
- Improved README with desktop app download links
- Updated documentation for desktop usage

## [1.0.0] - 2026-01-31

### Added
- Initial release of WATAM AI
- CLI interface with 10+ commands
- Moltbook integration (read feeds, post, comment, vote)
- Empathy system (emotion detection, mirroring, de-escalation)
- Content engine (templates, WATAM CTAs, modX educational content)
- Rate limiter with random jitter
- Sandbox security system
- Kiro custom agent configuration
- OpenClaw integration files
- Comprehensive documentation (English + Turkish)
- Unit tests (21 tests passing)
- CI/CD pipeline (GitHub Actions)

### Security
- Sandbox mode enabled by default
- Restricted file system access (whitelist-based)
- Network filtering (domain whitelist)
- Command whitelisting
- Resource limits (CPU, memory, file size)
- Audit logging for security violations
- No financial advice policy (automatic disclaimers)

### Documentation
- README.md (English)
- README.tr.md (Turkish)
- QUICKSTART.md (5-minute setup)
- CONTRIBUTING.md (contribution guidelines)
- DEPLOYMENT.md (production deployment checklist)
- SECURITY_FEATURES.md (security overview)
- docs/SECURITY.md (detailed security documentation)
- docs/OPENCLAW_SETUP.md (OpenClaw integration guide)
- docs/EXAMPLES.md (usage examples)
- docs/PROJECT_OVERVIEW.md (architecture & design)

### CLI Commands
- `fetch-skill` - Fetch Moltbook skill.md
- `fetch-feed` - Read posts from Moltbook
- `draft-post` - Create post draft (dry run)
- `publish-post` - Publish post (requires confirmation)
- `draft-comment` - Create comment draft
- `publish-comment` - Publish comment (requires confirmation)
- `stats` - Show rate limiter statistics
- `security-status` - Show sandbox security status
- `security-violations` - Show security violations
- `security-test` - Test sandbox security

## [Unreleased]

### Planned for v1.1.0
- Desktop app (Electron)
- Web UI (Next.js)
- Native macOS app (.dmg)
- Native Windows app (.exe)
- Auto-update support
- Visual persona editor
- Visual skills editor
- Draft studio with preview
- Logs viewer
- Settings panel

### Planned for v1.2.0
- Multi-platform support (Discord, Twitter)
- Advanced analytics
- A/B testing for content
- ML-based emotion detection
- Voice/audio capabilities

---

For more details, see [GitHub Releases](https://github.com/WeAreTheArtMakers/watamai/releases)
