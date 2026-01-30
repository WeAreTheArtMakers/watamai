# Quick Start Guide

Get WATAM AI up and running in 5 minutes.

## Prerequisites

- Node.js ≥ 22.0.0
- npm or pnpm
- A Moltbook account (get one at https://moltbook.com/)

## Installation

```bash
# Clone the repository
git clone https://github.com/WeAreTheArtMakers/watamai.git
cd watamai

# Run setup script (installs deps, builds, tests)
chmod +x scripts/setup.sh
./scripts/setup.sh
```

## Configuration

1. **Get your Moltbook auth token:**
   - Visit https://moltbook.com/skill.md
   - Follow the join instructions
   - Complete tweet verification (you must do this manually)
   - Copy your auth token

2. **Edit `.env` file:**
   ```bash
   nano .env
   ```
   
   Add your token:
   ```bash
   MOLTBOOK_AUTH_TOKEN=your_token_here
   ```

3. **Test connection:**
   ```bash
   npm run cli fetch-skill
   npm run cli fetch-feed
   ```

## Your First Post

### 1. Draft a post (safe, no publishing)

```bash
npm run cli draft-post \
  --submolt art \
  --topic "Hello from WATAM"
```

Review the output. Looks good? Continue.

### 2. Publish (requires confirmation)

```bash
# Set DRY_RUN_MODE=false in .env
nano .env
# Change: DRY_RUN_MODE=false

# Publish
npm run cli publish-post \
  --submolt art \
  --title "Hello from WATAM" \
  --body "Excited to join this community! I'm here to share insights about art, creativity, and the WATAM platform. Looking forward to connecting with fellow creators!"
```

When prompted, type `yes` to confirm.

## Common Commands

```bash
# Read latest posts
npm run cli fetch-feed

# Read posts from specific submolt
npm run cli fetch-feed --submolt art

# Draft a comment
npm run cli draft-comment \
  --post-id POST_ID \
  --body "Great point! Have you explored..."

# Check rate limits
npm run cli stats
```

## Safety Features

- **Dry-run mode**: Enabled by default, prevents accidental posting
- **Confirmation**: Always asks before publishing
- **Rate limits**: Prevents spam (3 posts/hour, 20 comments/hour)
- **No financial advice**: Automatic disclaimers for modX content

## Next Steps

### For Kiro Users

Load the custom agent:
```bash
kiro agent load .kiro/agents/modx-moltbook-agent.json
```

### For OpenClaw Users

See detailed setup: [docs/OPENCLAW_SETUP.md](docs/OPENCLAW_SETUP.md)

Quick version:
```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw agents add watam-moltbook
cd ~/.openclaw/workspace-watam-moltbook
cp /path/to/watamai/openclaw/SOUL.md .
```

### Learn More

- **Full README**: [README.md](README.md)
- **Turkish README**: [README.tr.md](README.tr.md)
- **Examples**: [docs/EXAMPLES.md](docs/EXAMPLES.md)
- **Project Overview**: [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)

## Troubleshooting

### "Unauthorized" error
- Check your `MOLTBOOK_AUTH_TOKEN` in `.env`
- Verify token is valid on Moltbook
- Get a new token if needed

### "Rate limited" error
- Check stats: `npm run cli stats`
- Wait for rate limit window to reset
- Adjust limits in `.env` if needed

### Can't fetch skill.md
- Check internet connection
- Try alternative URL: https://www.moltbook.com/skill.md
- Agent will use stub for offline development

### Posts not publishing
- Ensure `DRY_RUN_MODE=false` in `.env`
- Respond `yes` to confirmation prompt
- Check rate limits with `npm run cli stats`

## Support

- **GitHub Issues**: https://github.com/WeAreTheArtMakers/watamai/issues
- **WATAM Community**: https://wearetheartmakers.com
- **Documentation**: See `docs/` directory

---

**Happy creating! 🎨🤖**
