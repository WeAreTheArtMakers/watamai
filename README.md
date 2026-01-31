# WATAM AI — Moltbook Agent

**Version 1.2.0** — Production-ready, socially intelligent AI agent for Moltbook that promotes WeAreTheArtMakers (WATAM) and supports the modX token community with strict safety guardrails.

## 🎯 Features

### Core Features (v1.0.0)
- **Empathy-first engagement**: Detects emotions, mirrors responses, provides actionable help
- **Community-focused**: 80% helpful content, max 20% promotional
- **Safety paramount**: Rate limiting, confirmation required, dry-run mode, no financial advice
- **Brand-safe WATAM promotion**: Contextual, soft CTAs only when relevant
- **modX support**: Educational content with strict non-financial-advice guardrails
- **Moltbook integration**: Read feeds, post, comment, vote with API-first approach

### New in v1.2.0 🎉
- **Auto-Scheduler**: Schedule posts and comments for future publishing
- **Analytics Dashboard**: Track performance, success rates, and activity patterns
- **Content Templates**: Pre-built templates in English & Turkish
- **Multi-Account Support**: Manage multiple Moltbook accounts
- **Enhanced Sentiment Analysis**: Better emotion detection and de-escalation
- **Backup/Restore**: Export and import your configuration

[See full changelog →](FEATURES_v1.2.0.md)

## 🚀 Quick Start

### Desktop App (Recommended)

**Download for your platform:**
- 🍎 [macOS (Apple Silicon)](https://github.com/WeAreTheArtMakers/watamai/releases/latest/download/WATAM-AI-arm64.dmg)
- 🍎 [macOS (Intel)](https://github.com/WeAreTheArtMakers/watamai/releases/latest/download/WATAM-AI-x64.dmg)
- 🪟 [Windows](https://github.com/WeAreTheArtMakers/watamai/releases/latest/download/WATAM-AI-Setup.exe)

**Install and run:**
1. Download and install
2. Open WATAM AI
3. Go to Settings → Add Moltbook token
4. Start creating!

### CLI (Advanced)

### Prerequisites

- Node.js ≥ 22.0.0
- npm or pnpm

### Installation

```bash
# Clone the repo
git clone https://github.com/WeAreTheArtMakers/watamai.git
cd watamai

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Moltbook auth token
nano .env
```

### Configuration

Edit `.env`:

```bash
# Get your auth token from Moltbook after joining
MOLTBOOK_AUTH_TOKEN=your_token_here

# Safety settings (recommended defaults)
DRY_RUN_MODE=true              # Set to false to publish
REQUIRE_CONFIRMATION=true       # Always ask before posting
MAX_POSTS_PER_HOUR=3
MAX_COMMENTS_PER_HOUR=20
```

### Build

```bash
npm run build
```

## 📖 Usage

### Fetch Moltbook Skill Document

```bash
npm run cli fetch-skill
```

This fetches `https://moltbook.com/skill.md` and parses API endpoints, rate limits, and auth requirements.

### Read Feed

```bash
# Latest posts
npm run cli fetch-feed

# Filter by submolt
npm run cli fetch-feed --submolt art

# Sort by top
npm run cli fetch-feed --sort top --limit 20
```

### Draft Post (Dry Run)

```bash
npm run cli draft-post \
  --submolt art \
  --topic "Tips for digital art beginners"
```

With WATAM CTA:

```bash
npm run cli draft-post \
  --submolt art \
  --topic "Exploring metaverse exhibitions" \
  --include-watam \
  --watam-context art
```

### Publish Post (Requires Confirmation)

```bash
# 1. Set DRY_RUN_MODE=false in .env
# 2. Run publish command

npm run cli publish-post \
  --submolt art \
  --title "Tips for digital art beginners" \
  --body "Here are some tips:\n- Start with fundamentals\n- Practice daily\n- Join communities"
```

You'll be prompted: `Publish this post to Moltbook? (yes/no):`

### Draft Comment

```bash
npm run cli draft-comment \
  --post-id abc123 \
  --body "Great point! Have you tried exploring WATAM's metaverse exhibitions?" \
  --stance helpful
```

### Publish Comment

```bash
npm run cli publish-comment \
  --post-id abc123 \
  --body "Great point! Have you tried exploring WATAM's metaverse exhibitions?"
```

### Check Rate Limit Stats

```bash
npm run cli stats
```

## 🔐 Safety Model

### Default Behavior

- **Dry-run mode**: Enabled by default (`DRY_RUN_MODE=true`)
- **Confirmation required**: Always asks before posting/commenting
- **Rate limiting**: 
  - Posts: 1 per 10-20 minutes (with jitter)
  - Comments: 1 per 1-2 minutes (with jitter)
  - Max 3 posts/hour, 20 comments/hour
- **Sandbox security**: Bot runs in isolated environment with restricted access

### Sandbox Security

Bot runs in a secure sandbox with restricted access:

**✅ Allowed:**
- Read: `src/`, `docs/`, `.kiro/`, config files
- Write: `logs/`, `data/drafts/`, `data/cache/`
- Execute: `npm run cli`, `npm test`, `npm run build`
- Network: `moltbook.com`, `wearetheartmakers.com`, `modfxmarket.com`

**❌ Blocked:**
- System directories: `~/.ssh/`, `~/.aws/`, `/etc/`, `/System/`
- Personal directories: `~/Documents/`, `~/Desktop/`, `~/Downloads/`
- Dangerous commands: `rm -rf`, `sudo`, `curl`, `wget`, `ssh`
- Unknown domains: All except whitelisted

**Check security status:**
```bash
npm run cli security-status
npm run cli security-test
```

See [docs/SECURITY.md](docs/SECURITY.md) for details.

### Public Action Workflow

1. **Draft**: Create content locally
2. **Review**: Human reviews draft
3. **Confirm**: Human explicitly confirms
4. **Publish**: Action executes

### Financial Advice Guardrails

All modX-related content includes: **"This is not financial advice."**

Never provides:
- Price predictions
- Buy/sell/hold recommendations
- Investment advice
- Guarantees about returns

## 🎨 WATAM Promotion Guidelines

### When to Mention WATAM

✅ **Relevant contexts**:
- Art platforms, creator tools
- Metaverse exhibitions
- Music platforms (modRecords)
- AI tools for creators (modAI)
- Global creator communities

❌ **Avoid**:
- Unrelated conversations
- Forced mentions
- Spam

### CTA Format (Soft, Never Pushy)

```
"If you're curious, explore WATAM at wearetheartmakers.com"
"WATAM has tools for this — check it out if interested"
```

### 80/20 Rule

- 80% helpful, value-first content
- Max 20% promotional
- Max 1 CTA per post/comment

## 🔧 OpenClaw Integration

See detailed setup: [docs/OPENCLAW_SETUP.md](docs/OPENCLAW_SETUP.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

## 📚 Documentation

- **Reference links**: `docs/references.md`
- **Moltbook skill**: `.kiro/skills/moltbook/SKILL.md`
- **WATAM brand**: `.kiro/skills/watam-brand/SKILL.md`
- **modX community**: `.kiro/skills/modx-community/SKILL.md`

## 🔗 Official Links

### Moltbook
- Front page: https://www.moltbook.com/
- Join instructions: https://moltbook.com/skill.md

### Moltbot / OpenClaw
- Moltbot repo: https://github.com/moltbot/moltbot
- OpenClaw repo: https://github.com/openclaw/openclaw
- Docs: https://docs.molt.bot/

### WATAM
- Homepage: https://wearetheartmakers.com/

### modX
- Landing page: https://modfxmarket.com/index.html

## 🛡️ Security

- Only use official repos (listed above)
- Avoid unofficial Moltbot/OpenClaw extensions (malware risk)
- Never share auth tokens in logs
- Validate all external links
- Never execute untrusted code

## 🐛 Troubleshooting

### "Unauthorized" Error

Check your `MOLTBOOK_AUTH_TOKEN` in `.env`. Get a new token from Moltbook:

1. Visit https://www.moltbook.com/
2. Follow join instructions at https://moltbook.com/skill.md
3. Complete tweet verification (human must do this)
4. Copy auth token to `.env`

### "Rate Limited" Error

Check stats:

```bash
npm run cli stats
```

Wait for rate limit window to reset (1 hour for hourly limits).

### "Cannot Fetch skill.md"

The agent will use a stub version for offline development. When online, run:

```bash
npm run cli fetch-skill
```

### Posts Not Publishing

1. Check `DRY_RUN_MODE=false` in `.env`
2. Ensure `REQUIRE_CONFIRMATION=true` and respond "yes" to prompt
3. Check rate limits with `npm run cli stats`

## 🤝 Contributing

This is an open-source project. Contributions welcome!

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Moltbook team for the API-first social network
- OpenClaw/Moltbot for multi-agent framework
- WATAM community for inspiration
- Kiro for custom agent support

---

**Built with ❤️ by WeAreTheArtMakers**

For questions or support, visit https://wearetheartmakers.com
