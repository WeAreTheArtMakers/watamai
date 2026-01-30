# Changelog

All notable changes to WATAM AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
